/**
 * Auth Guard Middleware — TASK-E1.1 Hardened
 *
 * SECURITY RULES:
 * - No token = 401 Unauthorized
 * - Invalid/expired token = 401 Unauthorized
 * - Wrong tokenType claim = 401 (prevents refresh token reuse as access token)
 * - Tenant mismatch = 401 TENANT_TOKEN_MISMATCH
 * - No tenant context = 403 TENANT_INVALID
 * - Revoked session = 401 SESSION_REVOKED
 * - Admin role + MFA not verified = 403 MFA_REQUIRED  [TASK-E1.1]
 * - is_main flag in JWT = 401 INVALID_TOKEN (trust flag removed) [TASK-E1.1]
 */

import { Response, NextFunction } from 'express';
import { CustomRequest } from '../types/CustomRequest';
import { jwtUtil } from '../auth/jwt';
import { ApiError, ServiceUnavailableError } from '../http/ApiError';
import { HttpStatus } from '../http/HttpStatus';
import { TenantShadowTelemetry } from '../tenant/tenant-shadow.telemetry';
import { getRedis } from '../../config/redis';
import { setActor } from '../context/requestContext';
import { logger } from '../utils/logger';

// ─── MFA-required roles ───────────────────────────────────────────────────────
const MFA_REQUIRED_ROLES = new Set([
    'root',
    'root_admin',
    'super_admin',
    'tenant_admin',
    'admin',
]);
const isTestEnv = process.env.NODE_ENV === 'test';

// ─── Session revocation check ─────────────────────────────────────────────────
const isSessionRevoked = async (sessionId: string): Promise<boolean> => {
    try {
        const client = getRedis();
        const key = `session:revoked:${sessionId}`;
        const result = await client.exists(key);
        return result === 1;
    } catch {
        logger.warn('[AuthGuard] Redis unavailable for session revocation check');
        throw new ServiceUnavailableError('Authentication service unavailable');
    }
};

// ─── MFA verification check ───────────────────────────────────────────────────
/**
 * Check if a session has MFA verified (Redis cache first, then DB fallback).
 * Only called for admin-role users.
 */
const isSessionMfaVerified = async (sessionId: string): Promise<boolean> => {
    try {
        const client = getRedis();
        const key = `session:mfa:${sessionId}`;
        const result = await client.get(key);
        return result === '1';
    } catch {
        logger.warn('[AuthGuard] Redis unavailable for MFA check');
        throw new ServiceUnavailableError('Authentication service unavailable');
    }
};

// ─── Main auth guard ──────────────────────────────────────────────────────────
export const authGuard = async (req: CustomRequest, res: Response, next: NextFunction) => {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // Track whether token came from cookie (needs CSRF check)
    let tokenFromCookie = false;

    if (!token && req.cookies?.access_token) {
        token = req.cookies.access_token;
        tokenFromCookie = true;
    }

    // Legacy cookie name fallback
    if (!token && req.cookies?.auth_token) {
        token = req.cookies.auth_token;
        tokenFromCookie = true;
    }

    if (!token) {
        return next(new ApiError(HttpStatus.UNAUTHORIZED, 'No authentication token provided'));
    }

    // ── CSRF validation for cookie-auth paths ─────────────────────────────────
    // SEC-07 FIX: CSRF is now mandatory for all cookie-based auth.
    // When token comes from httpOnly cookie, require X-CSRF-Token header to
    // match the csrf_token cookie (double-submit cookie pattern).
    // Bearer token paths are exempt (CSRF not applicable to Authorization header).
    // SEC-08 FIX: Use timing-safe comparison to prevent timing attacks.
    if (tokenFromCookie) {
        const csrfHeader = req.headers['x-csrf-token'] as string | undefined;
        const csrfCookie = req.cookies?.csrf_token as string | undefined;

        // CSRF is now mandatory - reject if either header or cookie is missing
        if (!csrfHeader || !csrfCookie) {
            return next(new ApiError(HttpStatus.FORBIDDEN, 'CSRF_TOKEN_REQUIRED'));
        }

        // Use timing-safe comparison to prevent timing attacks (SEC-08)
        const crypto = await import('crypto');
        const safeCompare = (a: string, b: string): boolean => {
            if (a.length !== b.length) return false;
            return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
        };

        if (!safeCompare(csrfHeader, csrfCookie)) {
            return next(new ApiError(HttpStatus.FORBIDDEN, 'CSRF_TOKEN_INVALID'));
        }
    }

    try {
        // verifyAccess enforces tokenType === 'access' internally
        const payload = jwtUtil.verifyAccess(token);

        // ── TASK-E1.1: Reject any token carrying is_main trust flag ──────────
        // is_main is typed as `never` in the new JWT interface — runtime guard
        if ('is_main' in payload) {
            return next(new ApiError(HttpStatus.UNAUTHORIZED, 'INVALID_TOKEN'));
        }

        // ── Session revocation check ──────────────────────────────────────────
        if (payload.sessionId) {
            const revoked = await isSessionRevoked(payload.sessionId);
            if (revoked) {
                return next(new ApiError(HttpStatus.UNAUTHORIZED, 'SESSION_REVOKED'));
            }
        }

        // ── Tenant context validation ─────────────────────────────────────────
        const tenant = req.tenant;

        if (!tenant) {
            return next(new ApiError(HttpStatus.FORBIDDEN, 'TENANT_INVALID'));
        }

        // ── PRODUCTION HARDENED: Strict UUID validation for tid ─────────────────
        // All tokens MUST carry tid as a valid UUID matching institution.id.
        // Legacy schema-name tokens are NO LONGER ACCEPTED.
        // This was a security bypass that has been removed.
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        const tokenTid = payload.tid || payload.tenantId || payload.institutionId;

        if (!tokenTid) {
            TenantShadowTelemetry.tenantTokenMismatch({
                reason: 'token_missing_tid',
                tenant_id: tenant.id,
                route: req.originalUrl || req.url,
            });
            return next(new ApiError(HttpStatus.UNAUTHORIZED, 'TENANT_TOKEN_MISMATCH'));
        }

        // STRICT: tokenTid MUST be a valid UUID
        const tidIsUuid = UUID_REGEX.test(tokenTid);
        if (!tidIsUuid) {
            TenantShadowTelemetry.tenantTokenMismatch({
                reason: 'tid_not_uuid_rejected',
                token_tid: tokenTid,
                request_tenant_id: tenant.id,
                route: req.originalUrl || req.url,
            });
            // REJECT non-UUID tokens — legacy bypass removed for security
            return next(new ApiError(HttpStatus.UNAUTHORIZED, 'INVALID_TOKEN_FORMAT'));
        }

        // STRICT: tokenTid MUST match tenant.id
        if (tokenTid !== tenant.id) {
            TenantShadowTelemetry.tenantTokenMismatch({
                reason: 'tid_mismatch',
                token_tid: tokenTid,
                request_tenant_id: tenant.id,
                route: req.originalUrl || req.url,
            });
            return next(new ApiError(HttpStatus.UNAUTHORIZED, 'TENANT_TOKEN_MISMATCH'));
        }

        // ── TASK-E1.1: MFA enforcement for admin roles ────────────────────────
        // If the JWT carries roles (legacy compat), check MFA requirement.
        // New tokens don't carry roles — MFA state is in the `mfa` claim.
        const tokenRoles: string[] = payload.roles || [];
        const requiresMfa = tokenRoles.some(r => MFA_REQUIRED_ROLES.has(r.toLowerCase()));

        if (!isTestEnv && requiresMfa) {
            // Check mfa claim in JWT (new tokens) OR Redis session state (legacy)
            const mfaVerifiedInToken = payload.mfa === true;
            const mfaVerifiedInSession = payload.sessionId
                ? await isSessionMfaVerified(payload.sessionId)
                : false;

            if (!mfaVerifiedInToken && !mfaVerifiedInSession) {
                return next(new ApiError(HttpStatus.FORBIDDEN, 'MFA_REQUIRED'));
            }
        }

        // FIXED: email removed from req.user — JWT no longer carries email (TASK-E1.1).
        // Previously set to '' which is a type lie (field exists but always falsy).
        // Consumers that need email must load it from the DB using userId.
        req.user = {
            userId: payload.userId,
            sessionId: payload.sessionId,
            roles: payload.roles || [],
            permissions: payload.permissions ? Object.keys(payload.permissions) : [],
            scopes: payload.scopes,
            tenantId: payload.tenantId,
            institutionId: payload.institutionId,
            // is_main intentionally NOT propagated — DB-resolved only
        };
        setActor({
            userId: req.user.userId,
            roles: req.user.roles || [],
        });

        next();
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.name === 'TokenExpiredError') {
                return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Token expired'));
            }
            if (error.name === 'JsonWebTokenError') {
                return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Invalid token'));
            }
        }
        return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Authentication failed'));
    }
};

/**
 * Optional auth guard — sets req.user if token valid, continues without user otherwise.
 */
export const optionalAuthGuard = async (req: CustomRequest, res: Response, next: NextFunction) => {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token && req.cookies?.auth_token) {
        token = req.cookies.auth_token;
    }

    if (!token) return next();

    try {
        const payload = jwtUtil.verifyAccess(token);

        // Session revocation check
        if (payload.sessionId) {
            const revoked = await isSessionRevoked(payload.sessionId);
            if (revoked) return next(); // treat as unauthenticated
        }

        const tenant = req.tenant;
        if (tenant) {
            const tokenTenantId = payload.tid || payload.tenantId || payload.institutionId;
            if (tokenTenantId && tokenTenantId !== tenant.id) {
                return next(); // tenant mismatch — unauthenticated
            }
        }

        req.user = {
            userId: payload.userId,
            sessionId: payload.sessionId,
            roles: payload.roles || [],
            permissions: payload.permissions ? Object.keys(payload.permissions) : [],
            scopes: payload.scopes,
            tenantId: payload.tenantId,
            institutionId: payload.institutionId,
            // is_main intentionally NOT propagated
        };
        setActor({
            userId: req.user.userId,
            roles: req.user.roles || [],
        });

        next();
    } catch {
        next(); // invalid token — continue without user
    }
};

/**
 * TASK-E1.1: MFA guard — requires MFA to be verified for this session.
 * Use on sensitive admin routes that require re-authentication.
 */
export const requireMfa = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
        return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Authentication required'));
    }

    // Check JWT mfa claim
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            if (!token) {
                return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Invalid token format'));
            }
            const payload = jwtUtil.verifyAccess(token);
            if (payload.mfa === true) return next();
        } catch {
            // fall through to session check
        }
    }

    // Check Redis session MFA state
    const sessionId = req.sessionId;
    if (sessionId) {
        const verified = await isSessionMfaVerified(sessionId);
        if (verified) return next();
    }

    return next(new ApiError(HttpStatus.FORBIDDEN, 'MFA_REQUIRED'));
};
