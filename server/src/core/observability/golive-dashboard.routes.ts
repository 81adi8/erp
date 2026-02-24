/**
 * TASK-05 — PHASE C
 * Go-Live Dashboard & Red-Flag Alert System
 *
 * Endpoints:
 *   GET /health/golive          → real-time go-live dashboard
 *   GET /health/golive/alerts   → active red-flag alerts
 *   GET /health/golive/tenant/:schema → per-tenant health snapshot
 *
 * Tracks in real-time:
 *   - Login success rate
 *   - RBAC deny rate
 *   - DB latency (p50/p95)
 *   - Redis health
 *   - Queue lag + DLQ count
 *   - API error rate
 *
 * Red-flag triggers (immediate alert):
 *   - Login failure spike (>20/min)
 *   - Tenant mismatch detected
 *   - DB latency >1000ms
 *   - Redis disconnect
 *   - Queue DLQ spike (>10 items)
 */

import { Router, Request, Response } from 'express';
import { metrics, AlertThresholds } from './metrics';
import { redisHealthCheck } from '../../config/redis';
import { sequelize } from '../../database/sequelize';
import { queueManager } from '../queue/QueueManager';
import { structuredLogger } from './structured-logger';
import { getPilotStatus } from '../middleware/pilot-mode.middleware';
import { validateSchemaName } from '../database/schema-name.util';

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────
interface RedFlag {
    id: string;
    type: string;
    severity: 'P0' | 'P1' | 'P2';
    message: string;
    detectedAt: string;
    value?: number;
    threshold?: number;
    tenantId?: string;
}

interface DashboardSnapshot {
    timestamp: string;
    uptime: number;
    pilotMode: boolean;
    overallHealth: 'GREEN' | 'YELLOW' | 'RED';
    redFlags: RedFlag[];
    metrics: {
        auth: {
            loginSuccessRate: string;
            loginFailuresLastMin: number;
            totalLoginFailures: number;
        };
        rbac: {
            deniesLastMin: number;
            totalDenies: number;
            denyRate: string;
        };
        database: {
            status: 'ok' | 'degraded' | 'down';
            latencyMs: number;
            p95LatencyMs: number;
            slowQueries: number;
        };
        redis: {
            status: 'ok' | 'degraded' | 'down';
            latencyMs: number;
            disconnects: number;
        };
        queues: {
            status: 'ok' | 'degraded' | 'unavailable';
            totalQueues: number;
            dlqCount: number;
            lagMs: number;
        };
        api: {
            errorCount: number;
            errorRate: string;
            p95LatencyMs: number;
        };
    };
}

// ─── Red flag registry (in-memory, rolling 5 min) ────────────────────────────
const activeRedFlags = new Map<string, RedFlag>();
const RED_FLAG_TTL_MS = 5 * 60 * 1000; // 5 minutes

function raiseRedFlag(flag: Omit<RedFlag, 'id' | 'detectedAt'>): void {
    const id = `${flag.type}:${flag.tenantId ?? 'global'}`;
    const existing = activeRedFlags.get(id);

    // Don't re-raise if already active (within TTL)
    if (existing) {
        const age = Date.now() - new Date(existing.detectedAt).getTime();
        if (age < RED_FLAG_TTL_MS) return;
    }

    const redFlag: RedFlag = {
        ...flag,
        id,
        detectedAt: new Date().toISOString(),
    };

    activeRedFlags.set(id, redFlag);

    structuredLogger.alert(flag.type, flag.message, {
        tenantId: flag.tenantId,
        meta: {
            severity:  flag.severity,
            value:     flag.value,
            threshold: flag.threshold,
            redFlag:   true,
        },
    });
}

function clearExpiredFlags(): void {
    const now = Date.now();
    for (const [key, flag] of activeRedFlags.entries()) {
        const age = now - new Date(flag.detectedAt).getTime();
        if (age > RED_FLAG_TTL_MS) {
            activeRedFlags.delete(key);
        }
    }
}

// ─── Dashboard builder ────────────────────────────────────────────────────────
async function buildDashboard(): Promise<DashboardSnapshot> {
    clearExpiredFlags();
    const snapshot = metrics.getSnapshot();
    const redFlags: RedFlag[] = [];

    // ── Auth metrics ──────────────────────────────────────────────────────────
    const loginFailures = snapshot.counters['auth.login_failures'] ?? { total: 0, lastMinute: 0 };
    const loginFailuresLastMin = loginFailures.lastMinute ?? 0;
    const totalLoginFailures   = loginFailures.total ?? 0;

    // Estimate success rate (we track failures; assume total requests from http metrics)
    const httpRequests = snapshot.counters['http.request_latency']?.total ?? 1;
    const loginSuccessRate = Math.max(0, Math.round((1 - totalLoginFailures / Math.max(httpRequests, 1)) * 100));

    if (loginFailuresLastMin >= AlertThresholds.LOGIN_FAILURES_PER_MIN) {
        raiseRedFlag({
            type: 'LOGIN_FAILURE_SPIKE',
            severity: 'P0',
            message: `Login failures spiked: ${loginFailuresLastMin}/min (threshold: ${AlertThresholds.LOGIN_FAILURES_PER_MIN})`,
            value: loginFailuresLastMin,
            threshold: AlertThresholds.LOGIN_FAILURES_PER_MIN,
        });
    }

    // ── RBAC metrics ──────────────────────────────────────────────────────────
    const rbacDenies = snapshot.counters['rbac.deny_count'] ?? { total: 0, lastMinute: 0 };
    const deniesLastMin  = rbacDenies.lastMinute ?? 0;
    const totalDenies    = rbacDenies.total ?? 0;
    const denyRate       = httpRequests > 0
        ? `${((totalDenies / httpRequests) * 100).toFixed(1)}%`
        : '0%';

    if (deniesLastMin >= AlertThresholds.RBAC_DENIES_PER_MIN) {
        raiseRedFlag({
            type: 'RBAC_DENY_SPIKE',
            severity: 'P1',
            message: `RBAC deny spike: ${deniesLastMin}/min (threshold: ${AlertThresholds.RBAC_DENIES_PER_MIN})`,
            value: deniesLastMin,
            threshold: AlertThresholds.RBAC_DENIES_PER_MIN,
        });
    }

    // ── Database metrics ──────────────────────────────────────────────────────
    let dbStatus: 'ok' | 'degraded' | 'down' = 'ok';
    let dbLatencyMs = 0;

    try {
        const dbStart = Date.now();
        await sequelize.authenticate();
        dbLatencyMs = Date.now() - dbStart;

        if (dbLatencyMs > AlertThresholds.DB_LATENCY_MS) {
            dbStatus = 'degraded';
            raiseRedFlag({
                type: 'DB_HIGH_LATENCY',
                severity: 'P0',
                message: `DB latency critical: ${dbLatencyMs}ms (threshold: ${AlertThresholds.DB_LATENCY_MS}ms)`,
                value: dbLatencyMs,
                threshold: AlertThresholds.DB_LATENCY_MS,
            });
        }
    } catch (err: any) {
        dbStatus = 'down';
        raiseRedFlag({
            type: 'DB_DOWN',
            severity: 'P0',
            message: `Database connection failed: ${err.message}`,
        });
    }

    const dbHistogram = snapshot.histograms['db.query_latency'] ?? { p95: 0, count: 0 };
    const slowQueries = snapshot.counters['db.slow_queries']?.total ?? 0;

    // ── Redis metrics ─────────────────────────────────────────────────────────
    let redisStatus: 'ok' | 'degraded' | 'down' = 'ok';
    let redisLatencyMs = 0;
    const redisDisconnects = snapshot.counters['redis.disconnects']?.total ?? 0;

    try {
        const redisResult = await redisHealthCheck();
        redisStatus    = redisResult.status as any;
        redisLatencyMs = redisResult.latencyMs ?? 0;

        if (redisResult.status === 'down') {
            raiseRedFlag({
                type: 'REDIS_DISCONNECT',
                severity: 'P0',
                message: 'Redis is unreachable — queue and cache systems degraded',
            });
        } else if (redisLatencyMs > AlertThresholds.REDIS_LATENCY_MS) {
            raiseRedFlag({
                type: 'REDIS_HIGH_LATENCY',
                severity: 'P1',
                message: `Redis latency high: ${redisLatencyMs}ms (threshold: ${AlertThresholds.REDIS_LATENCY_MS}ms)`,
                value: redisLatencyMs,
                threshold: AlertThresholds.REDIS_LATENCY_MS,
            });
        }
    } catch {
        redisStatus = 'down';
    }

    // ── Queue metrics ─────────────────────────────────────────────────────────
    let queueStatus: 'ok' | 'degraded' | 'unavailable' = 'ok';
    let dlqCount = 0;
    let queueLagMs = 0;

    if (!queueManager.isQueueAvailable()) {
        queueStatus = 'unavailable';
    } else {
        try {
            const queueStats = await queueManager.getAllQueueStats();
            for (const [, stat] of Object.entries(queueStats)) {
                const s = stat as any;
                dlqCount   += s.failed ?? 0;
                queueLagMs  = Math.max(queueLagMs, s.lagMs ?? 0);
            }

            if (dlqCount >= AlertThresholds.DLQ_COUNT_THRESHOLD) {
                raiseRedFlag({
                    type: 'DLQ_SPIKE',
                    severity: 'P1',
                    message: `DLQ spike: ${dlqCount} failed jobs (threshold: ${AlertThresholds.DLQ_COUNT_THRESHOLD})`,
                    value: dlqCount,
                    threshold: AlertThresholds.DLQ_COUNT_THRESHOLD,
                });
                queueStatus = 'degraded';
            }

            if (queueLagMs > AlertThresholds.QUEUE_LAG_MS) {
                raiseRedFlag({
                    type: 'QUEUE_LAG',
                    severity: 'P1',
                    message: `Queue lag critical: ${queueLagMs}ms (threshold: ${AlertThresholds.QUEUE_LAG_MS}ms)`,
                    value: queueLagMs,
                    threshold: AlertThresholds.QUEUE_LAG_MS,
                });
                queueStatus = 'degraded';
            }
        } catch {
            queueStatus = 'degraded';
        }
    }

    // ── API metrics ───────────────────────────────────────────────────────────
    const apiErrors    = snapshot.counters['http.error_count']?.total ?? 0;
    const apiErrorRate = httpRequests > 0
        ? `${((apiErrors / httpRequests) * 100).toFixed(1)}%`
        : '0%';
    const apiHistogram = snapshot.histograms['http.request_latency'] ?? { p95: 0 };

    // ── Overall health ────────────────────────────────────────────────────────
    const allFlags = [...activeRedFlags.values()];
    const p0Flags  = allFlags.filter(f => f.severity === 'P0');
    const p1Flags  = allFlags.filter(f => f.severity === 'P1');

    let overallHealth: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
    if (p0Flags.length > 0 || dbStatus === 'down') {
        overallHealth = 'RED';
    } else if (p1Flags.length > 0 || dbStatus === 'degraded' || redisStatus === 'degraded') {
        overallHealth = 'YELLOW';
    }

    return {
        timestamp:     new Date().toISOString(),
        uptime:        Math.floor(process.uptime()),
        pilotMode:     process.env.PILOT_MODE === 'true',
        overallHealth,
        redFlags:      allFlags,
        metrics: {
            auth: {
                loginSuccessRate: `${loginSuccessRate}%`,
                loginFailuresLastMin,
                totalLoginFailures,
            },
            rbac: {
                deniesLastMin,
                totalDenies,
                denyRate,
            },
            database: {
                status:       dbStatus,
                latencyMs:    dbLatencyMs,
                p95LatencyMs: dbHistogram.p95 ?? 0,
                slowQueries,
            },
            redis: {
                status:      redisStatus,
                latencyMs:   redisLatencyMs,
                disconnects: redisDisconnects,
            },
            queues: {
                status:      queueStatus,
                totalQueues: queueManager.isQueueAvailable() ? 1 : 0,
                dlqCount,
                lagMs:       queueLagMs,
            },
            api: {
                errorCount:   apiErrors,
                errorRate:    apiErrorRate,
                p95LatencyMs: apiHistogram.p95 ?? 0,
            },
        },
    };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /health/golive
 * Full go-live dashboard snapshot
 */
router.get('/', async (_req: Request, res: Response) => {
    try {
        const dashboard = await buildDashboard();

        const httpStatus = dashboard.overallHealth === 'RED' ? 503
                         : dashboard.overallHealth === 'YELLOW' ? 200
                         : 200;

        res.status(httpStatus).json({
            status: dashboard.overallHealth,
            ...dashboard,
        });
    } catch (err: any) {
        res.status(500).json({
            status: 'ERROR',
            message: process.env.NODE_ENV === 'production' 
                ? 'An error occurred while building the dashboard' 
                : err.message,
            timestamp: new Date().toISOString(),
        });
    }
});

/**
 * GET /health/golive/alerts
 * Active red-flag alerts only
 */
router.get('/alerts', (_req: Request, res: Response) => {
    clearExpiredFlags();
    const flags = [...activeRedFlags.values()];
    const p0 = flags.filter(f => f.severity === 'P0');
    const p1 = flags.filter(f => f.severity === 'P1');
    const p2 = flags.filter(f => f.severity === 'P2');

    res.json({
        timestamp:    new Date().toISOString(),
        totalAlerts:  flags.length,
        critical:     p0.length,
        warning:      p1.length,
        info:         p2.length,
        requiresAction: p0.length > 0,
        alerts: {
            P0: p0,
            P1: p1,
            P2: p2,
        },
    });
});

/**
 * GET /health/golive/pilot
 * Pilot mode status and restrictions
 */
router.get('/pilot', (_req: Request, res: Response) => {
    res.json({
        timestamp: new Date().toISOString(),
        pilot: getPilotStatus(),
    });
});

/**
 * GET /health/golive/tenant/:schema
 * Per-tenant health snapshot
 */
router.get('/tenant/:schema', async (req: Request, res: Response) => {
    const { schema } = req.params;
    if (!schema) {
        return res.status(400).json({
            error: 'Schema parameter is required'
        });
    }
    let safeSchema: string = schema;

    try {
        safeSchema = validateSchemaName(schema);

        // Check tenant schema exists and has tables
        const [tableCount] = await sequelize.query(
            `SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = :schema`,
            { replacements: { schema: safeSchema }, type: 'SELECT' }
        ) as any[];

        const count = parseInt(tableCount?.cnt ?? '0', 10);

        // Check active users
        let activeUsers = 0;
        let adminCount  = 0;
        try {
            const [userRow] = await sequelize.query(
                `SELECT COUNT(*) AS cnt FROM "${safeSchema}".users WHERE is_active = true`,
                { type: 'SELECT' }
            ) as any[];
            activeUsers = parseInt(userRow?.cnt ?? '0', 10);

            const [adminRow] = await sequelize.query(
                `SELECT COUNT(*) AS cnt
                 FROM "${safeSchema}".users u
                 JOIN "${safeSchema}".user_roles ur ON ur.user_id = u.id
                 JOIN "${safeSchema}".roles r ON r.id = ur.role_id
                 WHERE r.slug = 'admin' AND u.is_active = true`,
                { type: 'SELECT' }
            ) as any[];
            adminCount = parseInt(adminRow?.cnt ?? '0', 10);
        } catch {
            // Schema may not have users yet
        }

        const tenantHealth = count >= 30 ? 'ok' : count > 0 ? 'degraded' : 'not_provisioned';

        res.json({
            schema: safeSchema,
            timestamp:    new Date().toISOString(),
            health:       tenantHealth,
            tableCount:   count,
            activeUsers,
            adminCount,
            provisioned:  count >= 30,
            readyForLive: count >= 30 && adminCount >= 1,
        });

    } catch (err: any) {
        res.status(500).json({
            schema: safeSchema || schema || 'unknown',
            health: 'error',
            message: process.env.NODE_ENV === 'production' 
                ? 'An error occurred while fetching tenant health' 
                : err.message,
        });
    }
});

export default router;

// ─── Export red flag raiser for use in other modules ─────────────────────────
export { raiseRedFlag };
