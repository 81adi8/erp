/**
 * Middleware Chain
 * 
 * Enforces strict ordering of middleware execution:
 * 1. detectTenant - Extract from subdomain
 * 2. allowPublicRoutes - Branding/login only (no auth needed)
 * 3. extractToken - From header/cookie
 * 4. verifyToken - Signature validation
 * 5. validateTenantMatch - subdomain === token.tenant_id
 * 6. checkPermission - Expand scopes → check permission
 * 7. Controller
 * 
 * This ensures security principles are NEVER bypassed.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { CustomRequest } from '../types/CustomRequest';
import { jwtUtil, AccessTokenPayload } from '../auth/jwt';
import { ApiError } from '../http/ApiError';
import { HttpStatus } from '../http/HttpStatus';
import { PermissionConfigCache } from '../cache/permission-config.cache';
import { logger } from '../utils/logger';

/**
 * Extract and verify JWT token
 * Sets req.user if valid
 */
export const extractAndVerifyToken: RequestHandler = (req: CustomRequest, res: Response, next: NextFunction) => {
    let token: string | undefined;

    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // Fallback to HTTP-only cookie
    if (!token && req.cookies?.auth_token) {
        token = req.cookies.auth_token;
    }

    if (!token) {
        return next(new ApiError(HttpStatus.UNAUTHORIZED, 'No authentication token provided'));
    }

    try {
        const payload = jwtUtil.verifyAccess(token);
        
        // Map JWT payload to AuthUser format
        req.user = {
            userId: payload.userId,
            email: payload.email || '',
            roles: payload.roles || [],
            permissions: payload.permissions ? Object.keys(payload.permissions) : [],
            scopes: payload.scopes,
            tenantId: payload.tenantId,
            institutionId: payload.institutionId,
            is_main: payload.is_main,
        };
        
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
 * Validate that token's tenant_id matches the subdomain
 * MUST be used after extractAndVerifyToken
 */
export const validateTenantMatch: RequestHandler = (req: CustomRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    const tenant = req.tenant;

    if (!user) {
        return next(new ApiError(HttpStatus.UNAUTHORIZED, 'User not authenticated'));
    }

    // If no tenant context, skip validation (public routes)
    if (!tenant) {
        return next();
    }

    // Validate tenant match
    const tokenTenantId = user.tenantId || user.institutionId;

    if (tokenTenantId && tokenTenantId !== tenant.id) {
        logger.error(`[TenantMatch] Mismatch: token tenant ${tokenTenantId} !== subdomain tenant ${tenant.id}`);
        return next(new ApiError(HttpStatus.FORBIDDEN, 'Tenant access denied'));
    }

    // Set tenantId on user for downstream use
    if (!user.tenantId) {
        user.tenantId = tenant.id;
    }

    next();
};

/**
 * Check if user has specific permission via scope expansion
 * Uses cached scope→permission mapping (NO DB query)
 */
export const requirePermission = (permissionKey: string): RequestHandler => {
    return (req: CustomRequest, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            return next(new ApiError(HttpStatus.UNAUTHORIZED, 'User not authenticated'));
        }

        // Admin bypass (if is_main or has admin:full scope)
        if (user.is_main || user.scopes?.includes('admin:full')) {
            return next();
        }

        // Legacy: if user has old permissions object, check it
        const permObj = user.permissions as Record<string, boolean> | undefined;
        if (permObj && permObj[permissionKey]) {
            return next();
        }

        // New: expand scopes and check permission
        if (user.scopes && user.scopes.length > 0) {
            const hasPermission = PermissionConfigCache.hasPermission(user.scopes, permissionKey);
            if (hasPermission) {
                return next();
            }
        }

        return next(new ApiError(HttpStatus.FORBIDDEN, `Insufficient permissions: ${permissionKey}`));
    };
};

/**
 * Check if user has specific role
 */
export const requireRole = (role: string): RequestHandler => {
    return (req: CustomRequest, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            return next(new ApiError(HttpStatus.UNAUTHORIZED, 'User not authenticated'));
        }

        // Check role in roles array
        const hasRole = user.roles?.includes(role);

        if (!hasRole) {
            return next(new ApiError(HttpStatus.FORBIDDEN, `Required role: ${role}`));
        }

        next();
    };
};

/**
 * Combined auth middleware chain for protected routes
 * Applies: extractToken → verifyToken → validateTenantMatch
 */
export const authChain: RequestHandler[] = [
    extractAndVerifyToken,
    validateTenantMatch,
];

export default {
    extractAndVerifyToken,
    validateTenantMatch,
    requirePermission,
    requireRole,
    authChain,
};
