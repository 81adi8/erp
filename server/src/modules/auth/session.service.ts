import { Session } from '../../database/models/shared/core/Session.model';
import { RefreshToken } from '../../database/models/shared/core/RefreshToken.model';
import { Op } from 'sequelize';
import type { DeviceInfo, SessionData, SessionInfo } from './auth.types';
import { getRedis } from '../../config/redis';
import { logger } from '../../core/utils/logger';

// TTL for Redis revocation marker — must outlive the longest possible JWT access token
// Access tokens expire in 15m; we keep the marker for 24h to be safe.
const SESSION_REVOCATION_TTL_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Write a Redis revocation marker for a session.
 * authGuard checks this key on every request — instant revocation without DB hit.
 */
async function markSessionRevokedInRedis(sessionId: string): Promise<void> {
    try {
        const client = getRedis();
        await client.setex(`session:revoked:${sessionId}`, SESSION_REVOCATION_TTL_SECONDS, '1');
    } catch (err) {
        // Non-fatal — DB revocation is the source of truth; Redis is a fast-path cache
        logger.warn(`[SessionService] Failed to write Redis revocation marker for ${sessionId}:`, err);
    }
}

// ============================================================================
// Session Configuration
// ============================================================================

const SESSION_INACTIVITY_LIMIT_DAYS = 30;
const MAX_ACTIVE_SESSIONS = 5;

// ============================================================================
// Session Service
// ============================================================================

export class SessionService {

    /**
     * Create a new session for a user
     */
    static async createSession(
        userId: string,
        deviceInfo: DeviceInfo,
        schemaName: string,
        institutionId?: string
    ): Promise<SessionData> {
        // Enforce session limit - remove oldest if at max
        await this.enforceSessionLimit(userId, schemaName);

        const session = await Session.schema(schemaName).create({
            user_id: userId,
            institution_id: institutionId,
            device_id: deviceInfo.deviceId,
            device_info: deviceInfo,
            ip: deviceInfo.ip,
            user_agent: deviceInfo.userAgent,
            last_active_at: new Date(),
        });

        return this.toSessionData(session);
    }

    /**
     * Update the last active timestamp for a session
     */
    static async updateLastActive(sessionId: string, schemaName: string): Promise<void> {
        await Session.schema(schemaName).update(
            { last_active_at: new Date() },
            { where: { id: sessionId } }
        );
    }

    /**
     * Get a session by ID
     */
    static async getSession(sessionId: string, schemaName: string): Promise<SessionData | null> {
        const session = await Session.schema(schemaName).findByPk(sessionId);
        return session ? this.toSessionData(session) : null;
    }

    /**
     * Validate that a session is active (not revoked, not expired due to inactivity)
     */
    static async validateSession(sessionId: string, schemaName: string): Promise<{ valid: boolean; session?: SessionData; error?: string }> {
        const session = await Session.schema(schemaName).findByPk(sessionId);

        if (!session) {
            return { valid: false, error: 'Session not found' };
        }

        if (session.revoked_at) {
            return { valid: false, error: 'Session has been revoked' };
        }

        // Check inactivity timeout
        const inactivityLimit = new Date();
        inactivityLimit.setDate(inactivityLimit.getDate() - SESSION_INACTIVITY_LIMIT_DAYS);

        if (session.last_active_at < inactivityLimit) {
            // Auto-revoke inactive session
            await this.revokeSession(sessionId, schemaName, 'Session expired due to inactivity');
            return { valid: false, error: 'Session expired due to inactivity' };
        }

        return { valid: true, session: this.toSessionData(session) };
    }

    /**
     * Revoke a specific session
     */
    static async revokeSession(
        sessionId: string,
        schemaName: string,
        reason: string = 'User logged out'
    ): Promise<void> {
        // Revoke the session in DB
        await Session.schema(schemaName).update(
            { revoked_at: new Date(), revoke_reason: reason },
            { where: { id: sessionId } }
        );

        // Revoke all refresh tokens for this session
        await RefreshToken.schema(schemaName).update(
            { revoked_at: new Date(), revoked_reason: reason },
            { where: { session_id: sessionId, revoked_at: null } }
        );

        // Write Redis revocation marker — authGuard checks this for instant revocation
        await markSessionRevokedInRedis(sessionId);
    }

    /**
     * Revoke all sessions for a user (logout everywhere)
     */
    static async revokeAllUserSessions(
        userId: string,
        schemaName: string,
        reason: string = 'User logged out from all devices',
        exceptSessionId?: string
    ): Promise<number> {
        const whereClause: {
            user_id: string;
            revoked_at: null;
            id?: { [Op.ne]: string };
        } = {
            user_id: userId,
            revoked_at: null,
        };

        if (exceptSessionId) {
            whereClause.id = { [Op.ne]: exceptSessionId };
        }

        // Get session IDs first
        const sessions = await Session.schema(schemaName).findAll({
            where: whereClause,
            attributes: ['id'],
        });

        const sessionIds = sessions.map(s => s.id);

        if (sessionIds.length === 0) {
            return 0;
        }

        // Revoke sessions
        await Session.schema(schemaName).update(
            { revoked_at: new Date(), revoke_reason: reason },
            { where: { id: { [Op.in]: sessionIds } } }
        );

        // Revoke all refresh tokens for these sessions
        await RefreshToken.schema(schemaName).update(
            { revoked_at: new Date(), revoked_reason: reason },
            { where: { session_id: { [Op.in]: sessionIds }, revoked_at: null } }
        );

        // Write Redis revocation markers for all revoked sessions
        await Promise.all(sessionIds.map(id => markSessionRevokedInRedis(id)));

        return sessionIds.length;
    }

    /**
     * Get all active sessions for a user
     */
    static async getActiveSessions(
        userId: string,
        schemaName: string,
        currentSessionId?: string
    ): Promise<SessionInfo[]> {
        const sessions = await Session.schema(schemaName).findAll({
            where: {
                user_id: userId,
                revoked_at: null,
            },
            order: [['last_active_at', 'DESC']],
        });

        return sessions.map(session => this.toSessionInfo(session, currentSessionId));
    }

    /**
     * Enforce maximum active sessions limit
     * Removes oldest sessions if limit exceeded
     */
    private static async enforceSessionLimit(userId: string, schemaName: string): Promise<void> {
        const activeSessions = await Session.schema(schemaName).findAll({
            where: {
                user_id: userId,
                revoked_at: null,
            },
            order: [['last_active_at', 'ASC']], // Oldest first
        });

        // If at or above limit, revoke oldest sessions
        if (activeSessions.length >= MAX_ACTIVE_SESSIONS) {
            const sessionsToRevoke = activeSessions.slice(0, activeSessions.length - MAX_ACTIVE_SESSIONS + 1);

            for (const session of sessionsToRevoke) {
                await this.revokeSession(session.id, schemaName, 'Session limit exceeded - oldest session removed');
            }
        }
    }

    /**
     * Clean up expired/inactive sessions (meant to be run as a cron job)
     */
    static async cleanupInactiveSessions(schemaName: string): Promise<number> {
        const inactivityLimit = new Date();
        inactivityLimit.setDate(inactivityLimit.getDate() - SESSION_INACTIVITY_LIMIT_DAYS);

        const [affectedCount] = await Session.schema(schemaName).update(
            { revoked_at: new Date(), revoke_reason: 'Session expired due to inactivity' },
            {
                where: {
                    revoked_at: null,
                    last_active_at: { [Op.lt]: inactivityLimit },
                },
            }
        );

        return affectedCount;
    }

    // ========================================================================
    // Helper Methods
    // ========================================================================

    private static toSessionData(session: Session): SessionData {
        return {
            id: session.id,
            userId: session.user_id,
            institutionId: session.institution_id,
            deviceId: session.device_id,
            deviceInfo: session.device_info || {},
            ip: session.ip ?? '',
            userAgent: session.user_agent ?? '',
            lastActiveAt: session.last_active_at,
            createdAt: session.createdAt,
            revokedAt: session.revoked_at,
            revokeReason: session.revoke_reason,
        };
    }

    private static toSessionInfo(session: Session, currentSessionId?: string): SessionInfo {
        return {
            id: session.id,
            deviceInfo: session.device_info || {},
            ip: session.ip ?? '',
            lastActiveAt: session.last_active_at,
            createdAt: session.createdAt,
            isCurrent: session.id === currentSessionId,
        };
    }
}
