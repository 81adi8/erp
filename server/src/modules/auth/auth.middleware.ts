import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { getTenant } from '../../core/context/requestContext';
import type { AuthenticatedRequest, AccessTokenPayload, SessionData } from './auth.types';
import { logger } from '../../core/utils/logger';

// ============================================================================
// Auth Middleware
// ============================================================================

/**
 * Main authentication middleware
 * - Validates JWT access token
 * - Verifies session is active
 * - Updates session last_active_at
 * - Attaches user and session to request
 */
export const authMiddleware = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Extract token from Authorization header or cookie
        const token = extractToken(req);

        if (!token) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'NO_TOKEN',
            });
            return;
        }

        // Verify JWT token
        let payload: AccessTokenPayload;
        try {
            payload = TokenService.verifyAccessToken(token);
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            const isExpired = err.name === 'TokenExpiredError';
            res.status(401).json({
                success: false,
                error: isExpired ? 'Token expired' : 'Invalid token',
                code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
            });
            return;
        }

        // Get tenant schema
        const tenant = getTenant();
        const schemaName = tenant?.db_schema;

        if (!schemaName) {
            res.status(400).json({
                success: false,
                error: 'Tenant context required',
                code: 'NO_TENANT',
            });
            return;
        }

        // Validate session is still active
        const sessionValidation = await SessionService.validateSession(payload.sessionId, schemaName);

        if (!sessionValidation.valid) {
            res.status(401).json({
                success: false,
                error: sessionValidation.error || 'Session invalid',
                code: 'SESSION_INVALID',
            });
            return;
        }

        // Update session activity (non-blocking)
        SessionService.updateLastActive(payload.sessionId, schemaName).catch(err => {
            logger.error('Failed to update session activity:', err);
        });

        // Attach user and session to request
        req.user = payload;
        req.session = sessionValidation.session;

        next();
    } catch (error) {
        logger.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed',
            code: 'AUTH_ERROR',
        });
    }
};

/**
 * Alias for authMiddleware - more explicit name
 */
export const requireAuth = authMiddleware;

/**
 * Optional auth middleware - doesn't fail if no token, just doesn't attach user
 */
export const optionalAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = extractToken(req);

        if (!token) {
            return next();
        }

        // Try to verify, but don't fail on error
        try {
            const payload = TokenService.verifyAccessToken(token);
            const tenant = getTenant();

            if (tenant?.db_schema) {
                const sessionValidation = await SessionService.validateSession(
                    payload.sessionId,
                    tenant.db_schema
                );

                if (sessionValidation.valid) {
                    req.user = payload;
                    req.session = sessionValidation.session;
                }
            }
        } catch {
            // Token invalid - continue without user
        }

        next();
    } catch (error) {
        next();
    }
};

/**
 * Role-based authorization middleware factory
 */
export const requireRoles = (...allowedRoles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'NO_AUTH',
            });
            return;
        }

        const userRoles = req.user.roles || [];
        const hasRole = allowedRoles.some(role => userRoles.includes(role));

        if (!hasRole) {
            res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                code: 'FORBIDDEN',
                required: allowedRoles,
            });
            return;
        }

        next();
    };
};

/**
 * Permission-based authorization middleware factory
 */
export const requirePermissions = (...requiredPermissions: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'NO_AUTH',
            });
            return;
        }

        const userPermissions = req.user.permissions || [];
        const hasAllPermissions = requiredPermissions.every(
            perm => userPermissions.includes(perm)
        );

        if (!hasAllPermissions) {
            res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                code: 'FORBIDDEN',
                required: requiredPermissions,
            });
            return;
        }

        next();
    };
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Timing-safe CSRF token validation
 * Prevents timing attacks by using constant-time comparison
 */
function validateCSRFToken(req: AuthenticatedRequest): boolean {
    const cookieToken = req.cookies?.csrf_token;
    const headerToken = req.headers['x-csrf-token'] as string;

    if (!cookieToken || !headerToken) {
        return false;
    }

    try {
        // Ensure both tokens are the same length for timing-safe comparison
        if (cookieToken.length !== headerToken.length) {
            return false;
        }

        // Timing-safe comparison to prevent timing attacks
        return crypto.timingSafeEqual(
            Buffer.from(cookieToken, 'utf8'),
            Buffer.from(headerToken, 'utf8')
        );
    } catch {
        return false;
    }
}

/**
 * Extract token from request
 * Priority: Authorization header > httpOnly access_token cookie
 */
function extractToken(req: AuthenticatedRequest): string | null {
    // Priority 1: Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        return token ?? null;
    }

    // Priority 2: httpOnly access_token cookie (more secure)
    if (req.cookies?.access_token) {
        // CSRF validation required for cookie-based auth
        if (!validateCSRFToken(req)) {
            logger.warn('CSRF validation failed for cookie-based auth request');
            return null;
        }
        return req.cookies.access_token;
    }

    return null;
}
