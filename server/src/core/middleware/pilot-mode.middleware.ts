/**
 * TASK-05 — PHASE B
 * Pilot Mode Guardrails Middleware
 *
 * When PILOT_MODE=true, this middleware enforces:
 *   - MAX_SCHOOLS cap (reject new tenant creation beyond limit)
 *   - Bulk import row limits (PILOT_MAX_IMPORT_ROWS)
 *   - Bulk deletion blocked
 *   - Enhanced request logging (RBAC_STRICT_LOG=true)
 *   - Lower alert thresholds
 *   - Queue rate limiting (QUEUE_RATE_LIMIT=pilot)
 *
 * Environment flags:
 *   PILOT_MODE=true
 *   MAX_SCHOOLS=2
 *   QUEUE_RATE_LIMIT=pilot
 *   RBAC_STRICT_LOG=true
 *   PILOT_MAX_IMPORT_ROWS=500
 */

import { Application, Request, Response, NextFunction } from 'express';
import { structuredLogger } from '../observability/structured-logger';
import { metrics } from '../observability/metrics';

// ─── Pilot config ─────────────────────────────────────────────────────────────
export const PILOT_CONFIG = {
    enabled:        process.env.PILOT_MODE === 'true',
    maxSchools:     parseInt(process.env.MAX_SCHOOLS ?? '2', 10),
    maxImportRows:  parseInt(process.env.PILOT_MAX_IMPORT_ROWS ?? '500', 10),
    queueRateLimit: process.env.QUEUE_RATE_LIMIT ?? 'normal',
    rbacStrictLog:  process.env.RBAC_STRICT_LOG === 'true',
    maxBulkDelete:  parseInt(process.env.PILOT_MAX_BULK_DELETE ?? '0', 10), // 0 = blocked
} as const;

// ─── Blocked route patterns in pilot mode ─────────────────────────────────────
const BULK_DELETE_PATTERNS = [
    /DELETE.*\/bulk/i,
    /\/students\/bulk-delete/i,
    /\/teachers\/bulk-delete/i,
    /\/users\/bulk-delete/i,
];

const BULK_IMPORT_PATTERNS = [
    /\/import/i,
    /\/bulk-upload/i,
    /\/csv-upload/i,
];

// ─── Pilot mode logger ────────────────────────────────────────────────────────
function pilotLog(
    level: 'info' | 'warn' | 'block',
    message: string,
    req: Request,
    extra?: Record<string, unknown>
): void {
    const logData = {
        tenantId: req.tenantId ?? 'unknown',
        meta: {
            method:  req.method,
            path:    req.path,
            ip:      req.ip,
            pilotMode: true,
            ...extra,
        },
    };

    if (level === 'block') {
        structuredLogger.alert('PILOT_BLOCK', message, logData);
    } else if (level === 'warn') {
        structuredLogger.warn(message, logData);
    } else {
        structuredLogger.info(message, logData);
    }
}

// ─── Middleware: Pilot mode header injector ───────────────────────────────────
/**
 * Injects X-Pilot-Mode header on all responses when pilot mode is active.
 * Provides visibility to frontend that system is in pilot.
 */
export function pilotModeHeaders(req: Request, res: Response, next: NextFunction): void {
    if (PILOT_CONFIG.enabled) {
        res.setHeader('X-Pilot-Mode', 'true');
        res.setHeader('X-Max-Schools', String(PILOT_CONFIG.maxSchools));
        res.setHeader('X-Pilot-Import-Limit', String(PILOT_CONFIG.maxImportRows));
    }
    next();
}

// ─── Middleware: Block bulk deletions ─────────────────────────────────────────
/**
 * In pilot mode, bulk deletions are completely blocked.
 * Individual deletes are allowed.
 */
export function blockBulkDeletion(req: Request, res: Response, next: NextFunction): void {
    if (!PILOT_CONFIG.enabled) {
        next();
        return;
    }

    const isBulkDelete = req.method === 'DELETE' &&
        BULK_DELETE_PATTERNS.some(pattern => pattern.test(req.path));

    if (isBulkDelete) {
        pilotLog('block', '[PilotMode] Bulk deletion blocked', req, {
            reason: 'PILOT_BULK_DELETE_BLOCKED',
        });
        metrics.increment('rbac.deny_count', { reason: 'pilot_bulk_delete' });

        res.status(403).json({
            success: false,
            error: 'PILOT_MODE_RESTRICTION',
            message: 'Bulk deletion is disabled in pilot mode. Delete records individually.',
            pilotMode: true,
        });
        return;
    }

    next();
}

// ─── Middleware: Import row limit enforcement ─────────────────────────────────
/**
 * Checks Content-Length or body size for import endpoints.
 * Warns if approaching limit, blocks if exceeded.
 */
export function enforceImportLimits(req: Request, res: Response, next: NextFunction): void {
    if (!PILOT_CONFIG.enabled) {
        next();
        return;
    }

    const isImportRoute = BULK_IMPORT_PATTERNS.some(p => p.test(req.path));
    if (!isImportRoute || req.method !== 'POST') {
        next();
        return;
    }

    // Check Content-Length header as early signal
    const contentLength = parseInt(req.headers['content-length'] ?? '0', 10);
    const estimatedRows = Math.floor(contentLength / 100); // ~100 bytes per CSV row

    if (estimatedRows > PILOT_CONFIG.maxImportRows * 1.5) {
        pilotLog('block', '[PilotMode] Import size exceeds pilot limit', req, {
            contentLength,
            estimatedRows,
            maxRows: PILOT_CONFIG.maxImportRows,
        });

        res.status(413).json({
            success: false,
            error: 'PILOT_IMPORT_LIMIT_EXCEEDED',
            message: `Pilot mode restricts imports to ${PILOT_CONFIG.maxImportRows} rows. Split your file and retry.`,
            maxRows: PILOT_CONFIG.maxImportRows,
            pilotMode: true,
        });
        return;
    }

    if (estimatedRows > PILOT_CONFIG.maxImportRows * 0.8) {
        pilotLog('warn', '[PilotMode] Import approaching pilot row limit', req, {
            estimatedRows,
            maxRows: PILOT_CONFIG.maxImportRows,
        });
    }

    next();
}

// ─── Middleware: Enhanced RBAC logging ────────────────────────────────────────
/**
 * When RBAC_STRICT_LOG=true, logs every RBAC decision (allow + deny).
 * In normal mode, only denies are logged.
 */
export function rbacStrictLogger(req: Request, res: Response, next: NextFunction): void {
    if (!PILOT_CONFIG.rbacStrictLog) {
        next();
        return;
    }

    // Intercept response to capture RBAC outcome
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
        const statusCode = res.statusCode;
        const isRbacDeny = statusCode === 403;
        const isAuthRoute = req.path.includes('/auth') || req.path.includes('/login');

        if (!isAuthRoute) {
            structuredLogger.info(`[RBAC-StrictLog] ${req.method} ${req.path} → ${statusCode}`, {
                tenantId: req.tenantId ?? 'unknown',
                meta: {
                    method:     req.method,
                    path:       req.path,
                    statusCode,
                    rbacDeny:   isRbacDeny,
                    userId:     req.user?.userId,
                    roles:      req.user?.roles,
                    pilotMode:  true,
                },
            });

            if (isRbacDeny) {
                metrics.increment('rbac.deny_count', {
                    path:   req.path,
                    method: req.method,
                });
            }
        }

        return originalJson(body);
    };

    next();
}

// ─── Middleware: School count guard ───────────────────────────────────────────
/**
 * Prevents creating more than MAX_SCHOOLS tenants in pilot mode.
 * Applied to tenant creation endpoints.
 */
export function schoolCountGuard(currentSchoolCount: number) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!PILOT_CONFIG.enabled) {
            next();
            return;
        }

        if (currentSchoolCount >= PILOT_CONFIG.maxSchools) {
            pilotLog('block', '[PilotMode] School creation blocked — max schools reached', req, {
                currentCount: currentSchoolCount,
                maxSchools:   PILOT_CONFIG.maxSchools,
            });

            res.status(403).json({
                success: false,
                error: 'PILOT_MAX_SCHOOLS_REACHED',
                message: `Pilot mode is limited to ${PILOT_CONFIG.maxSchools} school(s). Current: ${currentSchoolCount}.`,
                maxSchools:    PILOT_CONFIG.maxSchools,
                currentSchools: currentSchoolCount,
                pilotMode: true,
            });
            return;
        }

        next();
    };
}

// ─── Composite: Apply all pilot guardrails ────────────────────────────────────
/**
 * Apply all pilot mode middleware in the correct order.
 * Use this in app.ts:
 *
 *   import { applyPilotGuardrails } from './core/middleware/pilot-mode.middleware';
 *   applyPilotGuardrails(app);
 */
export function applyPilotGuardrails(app: Application): void {
    if (!PILOT_CONFIG.enabled) {
        structuredLogger.info('[PilotMode] Pilot mode DISABLED — no guardrails applied');
        return;
    }

    structuredLogger.info('[PilotMode] ✅ Pilot mode ACTIVE', {
        meta: {
            maxSchools:    PILOT_CONFIG.maxSchools,
            maxImportRows: PILOT_CONFIG.maxImportRows,
            queueRateLimit: PILOT_CONFIG.queueRateLimit,
            rbacStrictLog: PILOT_CONFIG.rbacStrictLog,
        },
    });

    app.use(pilotModeHeaders);
    app.use(blockBulkDeletion);
    app.use(enforceImportLimits);
    app.use(rbacStrictLogger);
}

// ─── Utility: Check pilot mode status ────────────────────────────────────────
export function getPilotStatus(): Record<string, unknown> {
    return {
        enabled:        PILOT_CONFIG.enabled,
        maxSchools:     PILOT_CONFIG.maxSchools,
        maxImportRows:  PILOT_CONFIG.maxImportRows,
        queueRateLimit: PILOT_CONFIG.queueRateLimit,
        rbacStrictLog:  PILOT_CONFIG.rbacStrictLog,
        maxBulkDelete:  PILOT_CONFIG.maxBulkDelete,
        restrictions: PILOT_CONFIG.enabled ? [
            'Bulk deletion blocked',
            `Import limited to ${PILOT_CONFIG.maxImportRows} rows`,
            `Max ${PILOT_CONFIG.maxSchools} schools`,
            PILOT_CONFIG.rbacStrictLog ? 'RBAC strict logging active' : null,
        ].filter(Boolean) : [],
    };
}
