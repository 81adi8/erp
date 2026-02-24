import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env';
import { RefreshToken } from '../../database/models/shared/core/RefreshToken.model';
import { Session } from '../../database/models/shared/core/Session.model';
import { jwtUtil } from '../../core/auth/jwt';
import type { AccessTokenPayload, TokenPair, RefreshTokenData } from './auth.types';

// ============================================================================
// Token Configuration
// ============================================================================

const ACCESS_TOKEN_EXPIRY = env.jwt.accessExpiry || '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// ============================================================================
// Token Service
// ============================================================================

export class TokenService {

    // ========================================================================
    // Access Token Methods
    // ========================================================================

    /**
     * Generate a new JWT access token
     */
    static generateAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): string {
        // Canonical signing path (enforces tokenType='access')
        const normalized = this.toCoreAccessPayload(payload);
        return jwtUtil.signAccess(normalized);
    }

    /**
     * Verify and decode an access token
     * @throws Error if token is invalid or expired
     */
    static verifyAccessToken(token: string): AccessTokenPayload {
        // Canonical verification path (enforces tokenType='access')
        const decoded = jwtUtil.verifyAccess(token);
        return {
            userId: decoded.userId,
            sessionId: decoded.sessionId || '',
            tid: decoded.tid,
            tenantId: decoded.tenantId,
            institutionId: decoded.institutionId ?? undefined,
            roles: decoded.roles,
            permissions: decoded.permissions ? Object.keys(decoded.permissions) : undefined,
            scopes: decoded.scopes,
            type: decoded.type === 'admin' ? 'admin' : 'tenant',
            email: decoded.email,
            mfa: decoded.mfa,
        };
    }

    /**
     * Decode token without verification (for debugging/logging)
     */
    static decodeToken(token: string): AccessTokenPayload | null {
        return jwt.decode(token) as AccessTokenPayload | null;
    }

    private static toCoreAccessPayload(
        payload: Omit<AccessTokenPayload, 'iat' | 'exp'>
    ): {
        userId: string;
        tid?: string;
        sessionId?: string;
        mfa?: boolean;
        email?: string;
        tenantId?: string;
        institutionId?: string | null;
        scopes?: string[];
        roles?: string[];
        role?: string;
        sessionVersion?: number;
        type?: 'admin' | 'user' | 'tenant';
        permissions?: Record<string, boolean>;
    } {
        const permissionsRecord = Array.isArray(payload.permissions)
            ? payload.permissions.reduce<Record<string, boolean>>((acc, permission) => {
                acc[permission] = true;
                return acc;
            }, {})
            : undefined;

        return {
            userId: payload.userId,
            tid: payload.tid || payload.institutionId || payload.tenantId,
            sessionId: payload.sessionId,
            mfa: payload.mfa,
            email: payload.email,
            tenantId: payload.tenantId,
            institutionId: payload.institutionId,
            scopes: payload.scopes,
            roles: payload.roles,
            sessionVersion: payload.sessionVersion,
            type: payload.type,
            permissions: permissionsRecord,
        };
    }

    /**
     * Get expiry time in seconds for access token
     */
    static getAccessTokenExpirySeconds(): number {
        const expiry = ACCESS_TOKEN_EXPIRY;
        if (expiry.endsWith('m')) return parseInt(expiry) * 60;
        if (expiry.endsWith('h')) return parseInt(expiry) * 3600;
        if (expiry.endsWith('d')) return parseInt(expiry) * 86400;
        return 900; // Default 15 minutes
    }

    // ========================================================================
    // Refresh Token Methods
    // ========================================================================

    /**
     * Generate a new refresh token
     * Returns both the raw token (to send to client) and the hash (to store)
     */
    static generateRefreshToken(): { rawToken: string; tokenHash: string } {
        const rawToken = crypto.randomBytes(64).toString('hex');
        const tokenHash = this.hashToken(rawToken);
        return { rawToken, tokenHash };
    }

    /**
     * Hash a token using SHA-256
     */
    static hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Create a new refresh token in the database
     */
    static async createRefreshToken(
        sessionId: string,
        schemaName: string,
        rotatedFromId?: string
    ): Promise<{ rawToken: string; record: RefreshTokenData }> {
        const { rawToken, tokenHash } = this.generateRefreshToken();
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

        const record = await RefreshToken.schema(schemaName).create({
            session_id: sessionId,
            token_hash: tokenHash,
            expires_at: expiresAt,
            rotated_from: rotatedFromId,
        });

        return {
            rawToken,
            record: {
                id: record.id,
                sessionId: record.session_id,
                tokenHash: record.token_hash,
                expiresAt: record.expires_at,
                rotatedFrom: record.rotated_from,
            },
        };
    }

    /**
     * Validate a refresh token and return session if valid
     * Implements reuse detection - if a revoked token is used, revokes entire session
     */
    static async validateRefreshToken(
        rawToken: string,
        schemaName: string
    ): Promise<{ valid: boolean; session?: Session; tokenRecord?: RefreshToken; error?: string }> {
        const tokenHash = this.hashToken(rawToken);

        // Find the token
        const tokenRecord = await RefreshToken.schema(schemaName).findOne({
            where: { token_hash: tokenHash },
        });

        if (!tokenRecord) {
            return { valid: false, error: 'Invalid refresh token' };
        }

        // CRITICAL: Reuse detection
        // If this token was already revoked, someone is trying to reuse it
        // This indicates a potential token theft - revoke the entire session
        if (tokenRecord.revoked_at) {
            await this.revokeSessionTokens(tokenRecord.session_id, schemaName, 'Token reuse detected - security breach');
            return { valid: false, error: 'Security alert: Token reuse detected. All sessions revoked.' };
        }

        // Check expiry
        if (new Date() > tokenRecord.expires_at) {
            return { valid: false, error: 'Refresh token expired' };
        }

        // Check session is active
        const session = await Session.schema(schemaName).findByPk(tokenRecord.session_id);
        if (!session || session.revoked_at) {
            return { valid: false, error: 'Session has been revoked' };
        }

        return { valid: true, session, tokenRecord };
    }

    /**
     * Rotate refresh token (revoke old, create new)
     */
    static async rotateRefreshToken(
        oldTokenRecord: RefreshToken,
        schemaName: string
    ): Promise<{ rawToken: string; record: RefreshTokenData }> {
        // Revoke old token
        await RefreshToken.schema(schemaName).update(
            { revoked_at: new Date(), revoked_reason: 'Rotated' },
            { where: { id: oldTokenRecord.id } }
        );

        // Create new token
        return this.createRefreshToken(oldTokenRecord.session_id, schemaName, oldTokenRecord.id);
    }

    /**
     * Revoke a specific refresh token
     */
    static async revokeRefreshToken(
        tokenId: string,
        schemaName: string,
        reason: string = 'Manually revoked'
    ): Promise<void> {
        await RefreshToken.schema(schemaName).update(
            { revoked_at: new Date(), revoked_reason: reason },
            { where: { id: tokenId } }
        );
    }

    /**
     * Revoke all refresh tokens for a session (security measure)
     */
    static async revokeSessionTokens(
        sessionId: string,
        schemaName: string,
        reason: string = 'Session terminated'
    ): Promise<void> {
        await RefreshToken.schema(schemaName).update(
            { revoked_at: new Date(), revoked_reason: reason },
            { where: { session_id: sessionId, revoked_at: null } }
        );

        // Also revoke the session itself
        await Session.schema(schemaName).update(
            { revoked_at: new Date(), revoke_reason: reason },
            { where: { id: sessionId } }
        );
    }

    // ========================================================================
    // Token Pair Generation
    // ========================================================================

    /**
     * Generate both access and refresh tokens
     */
    static async generateTokenPair(
        payload: Omit<AccessTokenPayload, 'iat' | 'exp'>,
        schemaName: string
    ): Promise<TokenPair> {
        const accessToken = this.generateAccessToken(payload);
        const { rawToken } = await this.createRefreshToken(payload.sessionId, schemaName);

        return {
            accessToken,
            refreshToken: rawToken,
            expiresIn: this.getAccessTokenExpirySeconds(),
        };
    }
}
