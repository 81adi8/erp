/**
 * TASK-E2 — Tenant Isolation Under Load
 *
 * Ensures that even under degraded conditions:
 *   - No cross-tenant data fallback occurs
 *   - No default schema is used when tenant context is missing
 *   - No writes to public schema
 *   - Tenant context is always explicitly resolved, never inferred
 *
 * This guard is called by middleware before any DB operation.
 * Under load, the temptation is to "default" to a schema — this blocks that.
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// ─── Isolation violation types ────────────────────────────────────────────────

export type IsolationViolationType =
    | 'MISSING_TENANT_CONTEXT'
    | 'DEFAULT_SCHEMA_ATTEMPTED'
    | 'PUBLIC_SCHEMA_WRITE'
    | 'CROSS_TENANT_ACCESS'
    | 'SCHEMA_MISMATCH';

export interface IsolationViolation {
    type: IsolationViolationType;
    requestId?: string;
    userId?: string;
    attemptedSchema?: string;
    resolvedSchema?: string;
    path?: string;
    timestamp: Date;
}

// ─── Blocked schemas (never allowed as tenant schemas) ────────────────────────

const BLOCKED_SCHEMAS = new Set([
    'public',
    'information_schema',
    'pg_catalog',
    'pg_toast',
    'root',       // root schema is for platform admin only, not tenant data
]);

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// ─── Tenant Isolation Guard ───────────────────────────────────────────────────

export class TenantIsolationGuard {
    private static violations: IsolationViolation[] = [];
    private static readonly MAX_VIOLATION_LOG = 1000;

    /**
     * Express middleware: enforce tenant context on every request.
     *
     * Rejects requests that:
     *   1. Have no tenant schema in context (for tenant-scoped routes)
     *   2. Attempt to use a blocked schema (public, root, etc.)
     *   3. Attempt writes to public schema
     */
    static middleware(options: { requireTenant?: boolean } = {}) {
        return (req: Request, res: Response, next: NextFunction): void => {
            const { requireTenant = true } = options;

            // Skip for root admin routes (they use root schema explicitly)
            if (req.path.startsWith('/v1/root/') || req.path.startsWith('/v1/admin/root/')) {
                return next();
            }

            // Skip for public routes (health, auth login)
            if (
                req.path === '/health' ||
                req.path === '/v1/auth/login' ||
                req.path === '/v1/auth/refresh' ||
                req.path.startsWith('/v1/auth/mfa')
            ) {
                return next();
            }

            const tenantSchema =
                (req as any).tenant?.db_schema ||
                (req as any).tenantIdentity?.db_schema ||
                (req as any).tenantSchema ||
                (req as any).schemaName;

            if (requireTenant && !tenantSchema) {
                TenantIsolationGuard.recordViolation({
                    type: 'MISSING_TENANT_CONTEXT',
                    requestId: (req as any).requestId,
                    userId: (req as any).user?.userId,
                    path: req.path,
                    timestamp: new Date(),
                });

                res.status(400).json({
                    error: 'TENANT_CONTEXT_REQUIRED',
                    message: 'Tenant context is required for this operation',
                });
                return;
            }

            if (tenantSchema && BLOCKED_SCHEMAS.has(String(tenantSchema).toLowerCase())) {
                TenantIsolationGuard.recordViolation({
                    type: 'DEFAULT_SCHEMA_ATTEMPTED',
                    requestId: (req as any).requestId,
                    userId: (req as any).user?.userId,
                    attemptedSchema: tenantSchema,
                    path: req.path,
                    timestamp: new Date(),
                });

                res.status(403).json({
                    error: 'SCHEMA_NOT_ALLOWED',
                    message: 'Access to this schema is not permitted',
                });
                return;
            }

            // Block writes to public schema
            if (tenantSchema === 'public' && WRITE_METHODS.has(req.method)) {
                TenantIsolationGuard.recordViolation({
                    type: 'PUBLIC_SCHEMA_WRITE',
                    requestId: (req as any).requestId,
                    userId: (req as any).user?.userId,
                    attemptedSchema: 'public',
                    path: req.path,
                    timestamp: new Date(),
                });

                res.status(403).json({
                    error: 'PUBLIC_SCHEMA_WRITE_BLOCKED',
                    message: 'Writes to public schema are not permitted',
                });
                return;
            }

            next();
        };
    }

    /**
     * Validate that a schema name is safe to use for a DB query.
     * Call this before any dynamic schema interpolation in SQL.
     *
     * Throws if schema is blocked or invalid.
     */
    static validateSchema(schema: string, context?: { userId?: string; path?: string }): void {
        if (!schema || schema.trim() === '') {
            TenantIsolationGuard.recordViolation({
                type: 'MISSING_TENANT_CONTEXT',
                userId: context?.userId,
                path: context?.path,
                timestamp: new Date(),
            });
            throw Object.assign(
                new Error('Schema name is required. Tenant context must be explicitly set.'),
                { code: 'MISSING_TENANT_CONTEXT' }
            );
        }

        if (BLOCKED_SCHEMAS.has(schema.toLowerCase())) {
            TenantIsolationGuard.recordViolation({
                type: 'DEFAULT_SCHEMA_ATTEMPTED',
                userId: context?.userId,
                attemptedSchema: schema,
                path: context?.path,
                timestamp: new Date(),
            });
            throw Object.assign(
                new Error(`Schema '${schema}' is not allowed for tenant operations.`),
                { code: 'SCHEMA_NOT_ALLOWED', schema }
            );
        }

        // Schema name must be alphanumeric + underscore only (SQL injection prevention)
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
            throw Object.assign(
                new Error(`Invalid schema name '${schema}'. Only alphanumeric and underscore allowed.`),
                { code: 'INVALID_SCHEMA_NAME', schema }
            );
        }
    }

    /**
     * Validate that a request's tenant context matches the token's tenant.
     * Prevents cross-tenant access when token tid != request schema.
     */
    static validateCrossTenantAccess(
        tokenTenantId: string,
        requestTenantId: string,
        context?: { userId?: string; path?: string }
    ): void {
        if (tokenTenantId !== requestTenantId) {
            TenantIsolationGuard.recordViolation({
                type: 'CROSS_TENANT_ACCESS',
                userId: context?.userId,
                attemptedSchema: requestTenantId,
                resolvedSchema: tokenTenantId,
                path: context?.path,
                timestamp: new Date(),
            });
            throw Object.assign(
                new Error('Cross-tenant access denied. Token tenant does not match request tenant.'),
                { code: 'CROSS_TENANT_ACCESS' }
            );
        }
    }

    private static recordViolation(violation: IsolationViolation): void {
        if (TenantIsolationGuard.violations.length >= TenantIsolationGuard.MAX_VIOLATION_LOG) {
            TenantIsolationGuard.violations.shift(); // Rolling window
        }
        TenantIsolationGuard.violations.push(violation);

        logger.error(`[TenantIsolation] VIOLATION: ${violation.type}`, {
            userId: violation.userId,
            schema: violation.attemptedSchema,
            path: violation.path,
        });
    }

    static getViolations(): IsolationViolation[] {
        return [...TenantIsolationGuard.violations];
    }

    static getViolationCount(): number {
        return TenantIsolationGuard.violations.length;
    }

    static clearViolations(): void {
        TenantIsolationGuard.violations = [];
    }
}
