/**
 * TASK-E1.1 — Auth Audit Logging Service
 *
 * Immutable audit trail for all auth events.
 * Stored in AuthAuditLog table (append-only — no updates, no deletes).
 *
 * Events logged:
 *   LOGIN_SUCCESS, LOGIN_FAILURE, LOCKOUT_TRIGGERED,
 *   MFA_ENABLED, MFA_DISABLED, MFA_SUCCESS, MFA_FAILURE,
 *   SESSION_REVOKED, PASSWORD_CHANGED, NEW_DEVICE_LOGIN,
 *   TOKEN_REFRESH, LOGOUT, LOGOUT_ALL, SSO_LOGIN
 */

import { AuditLog } from '../../database/models/shared/core/AuditLog.model';
import { getRedis } from '../../config/redis';
import { validateSchemaName } from '../database/schema-name.util';
import { logger } from '../utils/logger';

// ─── Event types ──────────────────────────────────────────────────────────────

export type AuthAuditEvent =
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILURE'
    | 'LOCKOUT_TRIGGERED'
    | 'MFA_ENABLED'
    | 'MFA_DISABLED'
    | 'MFA_SUCCESS'
    | 'MFA_FAILURE'
    | 'MFA_BACKUP_CODE_USED'
    | 'SESSION_REVOKED'
    | 'SESSION_REVOKED_ALL'
    | 'PASSWORD_CHANGED'
    | 'NEW_DEVICE_LOGIN'
    | 'TOKEN_REFRESH'
    | 'LOGOUT'
    | 'LOGOUT_ALL'
    | 'SSO_LOGIN'
    | 'ACCOUNT_LOCKED'
    | 'ACCOUNT_UNLOCKED'
    | 'ROOT_REAUTH_REQUIRED'
    | 'ROOT_REAUTH_SUCCESS'
    | 'IP_BLOCKED';

export interface AuditContext {
    userId?: string;
    institutionId?: string;
    email?: string;
    ip?: string;
    userAgent?: string;
    sessionId?: string;
    deviceId?: string;
    schemaName?: string;
    meta?: Record<string, unknown>;
}

// ─── Auth Audit Service ───────────────────────────────────────────────────────

export class AuthAuditService {

    /**
     * Log an auth event.
     * Uses the shared AuditLog model (already exists in schema).
     * Falls back to Redis stream if DB write fails (non-fatal).
     */
    static async log(
        event: AuthAuditEvent,
        context: AuditContext
    ): Promise<void> {
        const meta = {
            event,
            sessionId: context.sessionId,
            deviceId: context.deviceId,
            email: context.email,
            schemaName: context.schemaName,
            ...context.meta,
        };

        // Require explicit tenant schema for DB write.
        // Never fallback to 'public' for auth events.
        const requestedSchema = context.schemaName?.trim();
        if (!requestedSchema) {
            await this.writeToRedisStream(event, context, {
                ...meta,
                droppedDbWriteReason: 'missing_schema_name',
            });
            return;
        }

        let safeSchemaName: string;
        try {
            safeSchemaName = validateSchemaName(requestedSchema);
        } catch {
            await this.writeToRedisStream(event, context, {
                ...meta,
                droppedDbWriteReason: 'invalid_schema_name',
            });
            return;
        }

        // Primary: write to DB audit log
        try {
            await AuditLog.schema(safeSchemaName).create({
                user_id: context.userId,
                institution_id: context.institutionId,
                action: `AUTH:${event}`,
                meta,
                ip: context.ip,
                user_agent: context.userAgent,
            });
        } catch (dbErr) {
            // Fallback: write to Redis stream for later replay
            logger.error(`[AuthAudit] DB write failed for ${event}:`, dbErr);
            await this.writeToRedisStream(event, context, meta);
        }
    }

    /**
     * Log a login success event.
     */
    static async loginSuccess(context: AuditContext): Promise<void> {
        await this.log('LOGIN_SUCCESS', context);
    }

    /**
     * Log a login failure event.
     */
    static async loginFailure(
        context: AuditContext,
        reason: string,
        attemptCount?: number
    ): Promise<void> {
        await this.log('LOGIN_FAILURE', {
            ...context,
            meta: { ...context.meta, reason, attemptCount },
        });
    }

    /**
     * Log a lockout event.
     */
    static async lockoutTriggered(
        context: AuditContext,
        lockDurationSeconds: number,
        attemptCount: number
    ): Promise<void> {
        await this.log('LOCKOUT_TRIGGERED', {
            ...context,
            meta: { ...context.meta, lockDurationSeconds, attemptCount },
        });
    }

    /**
     * Log MFA events.
     */
    static async mfaEvent(
        event: 'MFA_ENABLED' | 'MFA_DISABLED' | 'MFA_SUCCESS' | 'MFA_FAILURE' | 'MFA_BACKUP_CODE_USED',
        context: AuditContext,
        detail?: string
    ): Promise<void> {
        await this.log(event, {
            ...context,
            meta: { ...context.meta, detail },
        });
    }

    /**
     * Log session revocation.
     */
    static async sessionRevoked(
        context: AuditContext,
        reason: string,
        revokedSessionId?: string
    ): Promise<void> {
        await this.log('SESSION_REVOKED', {
            ...context,
            meta: { ...context.meta, reason, revokedSessionId },
        });
    }

    /**
     * Log password change.
     */
    static async passwordChanged(context: AuditContext): Promise<void> {
        await this.log('PASSWORD_CHANGED', context);
    }

    /**
     * Log new device login (security alert).
     */
    static async newDeviceLogin(
        context: AuditContext,
        deviceInfo: Record<string, unknown>
    ): Promise<void> {
        await this.log('NEW_DEVICE_LOGIN', {
            ...context,
            meta: { ...context.meta, deviceInfo },
        });
    }

    /**
     * Query recent auth events for a user (for security dashboard).
     */
    static async getRecentEvents(
        userId: string,
        schemaName: string,
        limit = 50
    ): Promise<any[]> {
        try {
            return await AuditLog.schema(schemaName).findAll({
                where: { user_id: userId },
                order: [['created_at', 'DESC']],
                limit,
            });
        } catch {
            return [];
        }
    }

    /**
     * Query recent auth events for an institution (admin view).
     */
    static async getInstitutionEvents(
        institutionId: string,
        schemaName: string,
        limit = 200
    ): Promise<any[]> {
        try {
            return await AuditLog.schema(schemaName).findAll({
                where: { institution_id: institutionId },
                order: [['created_at', 'DESC']],
                limit,
            });
        } catch {
            return [];
        }
    }

    // ── Redis fallback ────────────────────────────────────────────────────────

    private static async writeToRedisStream(
        event: AuthAuditEvent,
        context: AuditContext,
        meta: Record<string, unknown>
    ): Promise<void> {
        try {
            const redis = getRedis();
            const entry = JSON.stringify({
                event,
                userId: context.userId,
                institutionId: context.institutionId,
                ip: context.ip,
                meta,
                timestamp: new Date().toISOString(),
            });
            // Use a Redis list as a simple fallback queue (max 10k entries)
            await redis.lpush('auth:audit:fallback', entry);
            await redis.ltrim('auth:audit:fallback', 0, 9999);
        } catch {
            // Truly non-fatal — log to console as last resort
            logger.error(`[AuthAudit] FALLBACK FAILED — event lost: AUTH:${event}`, {
                userId: context.userId,
                ip: context.ip,
            });
        }
    }
}
