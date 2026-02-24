/**
 * Authorization Middleware
 * 
 * @deprecated This middleware is maintained for backward compatibility.
 * All new routes should use RBAC enforcement from core/rbac/rbac.middleware
 * 
 * Uses tenant-scoped role→permission resolution for fast permission checks.
 * NO database queries per request - uses RolePermissionCache.
 * 
 * FLOW:
 * 1. Get tenant ID from request context
 * 2. Get roles from JWT token
 * 3. Resolve permissions from cache (role→permissions per tenant)
 * 4. Check if required permission is in resolved permissions
 * 
 * RULES:
 * - Token must be verified BEFORE this middleware
 * - Tenant context must be set BEFORE this middleware
 * - Admin bypass for SUPER_ADMIN, is_main, or admin:full scope
 */

import { Response, NextFunction } from 'express';
import { CustomRequest } from '../types/CustomRequest';
import { ApiError } from '../http/ApiError';
import { HttpStatus } from '../http/HttpStatus';
import { RolePermissionCache } from '../cache/role-permission.cache';
import { PermissionConfigCache } from '../cache/permission-config.cache';
import { logger } from '../utils/logger';

/**
 * Check if user has specific permission
 * Uses tenant-scoped role→permission resolution (NO DB query)
 */
export const authorize = (permissionKey: string) => {
    return async (req: CustomRequest, res: Response, next: NextFunction) => {
        try {
            const user = req.user;
            const tenant = req.tenant;

            if (!user) {
                return next(new ApiError(HttpStatus.UNAUTHORIZED, 'User not authenticated'));
            }

            // Admin bypass: SUPER_ADMIN role or is_main flag only
            // MT-06 FIX: Removed admin:full scope bypass - scope-based access should be explicit
            if (user.roles?.includes('SUPER_ADMIN') || user.is_main) {
                return next();
            }

            // Primary: Tenant-scoped role→permission resolution
            if (tenant && user.roles && user.roles.length > 0) {
                const tenantId = tenant.db_schema;
                if (tenantId) {
                    const hasPermission = await RolePermissionCache.hasPermission(
                        tenantId,
                        user.roles,
                        permissionKey
                    );
                    if (hasPermission) {
                        return next();
                    }
                }
            }

            // Fallback: Scope-based expansion (for tokens with scopes)
            if (user.scopes && user.scopes.length > 0) {
                const hasPermission = PermissionConfigCache.hasPermission(user.scopes, permissionKey);
                if (hasPermission) {
                    return next();
                }
            }

            // Legacy fallback: check old permissions object (deprecated)
            const permObj = user.permissions as Record<string, boolean> | undefined;
            if (permObj && permObj[permissionKey]) {
                return next();
            }

            return next(new ApiError(HttpStatus.FORBIDDEN, `Missing permission: ${permissionKey}`));
        } catch (error) {
            logger.error('[Authorize] Error checking permission:', error);
            return next(new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, 'Authorization check failed'));
        }
    };
};

/**
 * Check if user has ANY of the specified permissions
 */
export const authorizeAny = (...permissionKeys: string[]) => {
    return async (req: CustomRequest, res: Response, next: NextFunction) => {
        try {
            const user = req.user;
            const tenant = req.tenant;

            if (!user) {
                return next(new ApiError(HttpStatus.UNAUTHORIZED, 'User not authenticated'));
            }

            // Admin bypass: SUPER_ADMIN role or is_main flag only
            // MT-06 FIX: Removed admin:full scope bypass
            if (user.roles?.includes('SUPER_ADMIN') || user.is_main) {
                return next();
            }

            const tenantId = tenant?.db_schema;

            for (const permissionKey of permissionKeys) {
                // Primary: Tenant-scoped role resolution
                if (tenantId && user.roles && user.roles.length > 0) {
                    const hasPermission = await RolePermissionCache.hasPermission(
                        tenantId,
                        user.roles,
                        permissionKey
                    );
                    if (hasPermission) {
                        return next();
                    }
                }

                // Fallback: Scope-based
                if (user.scopes && PermissionConfigCache.hasPermission(user.scopes, permissionKey)) {
                    return next();
                }

                // Legacy fallback
                const permObj = user.permissions as Record<string, boolean> | undefined;
                if (permObj && permObj[permissionKey]) {
                    return next();
                }
            }

            return next(new ApiError(HttpStatus.FORBIDDEN, `Missing permissions: ${permissionKeys.join(' or ')}`));
        } catch (error) {
            logger.error('[Authorize] Error checking permissions:', error);
            return next(new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, 'Authorization check failed'));
        }
    };
};

/**
 * Check if user has ALL of the specified permissions
 */
export const authorizeAll = (...permissionKeys: string[]) => {
    return async (req: CustomRequest, res: Response, next: NextFunction) => {
        try {
            const user = req.user;
            const tenant = req.tenant;

            if (!user) {
                return next(new ApiError(HttpStatus.UNAUTHORIZED, 'User not authenticated'));
            }

            // Admin bypass: SUPER_ADMIN role or is_main flag only
            // MT-06 FIX: Removed admin:full scope bypass
            if (user.roles?.includes('SUPER_ADMIN') || user.is_main) {
                return next();
            }

            const tenantId = tenant?.db_schema;
            const planId = tenant?.plan_id;

            // Get user's resolved permissions
            let userPermissions: string[] = [];

            // Primary: Tenant-scoped role resolution (with plan-scoped caching for initial roles)
            if (tenantId && user.roles && user.roles.length > 0) {
                userPermissions = await RolePermissionCache.getPermissionsForRoles(tenantId, user.roles, planId);
            }

            // Add scope-based permissions
            if (user.scopes && user.scopes.length > 0) {
                const scopePermissions = PermissionConfigCache.expandScopes(user.scopes);
                userPermissions = [...new Set([...userPermissions, ...scopePermissions])];
            }

            // Check all required permissions
            for (const permissionKey of permissionKeys) {
                const permObj = user.permissions as Record<string, boolean> | undefined;
                const hasPermission = userPermissions.includes(permissionKey) ||
                    (permObj && permObj[permissionKey]);

                if (!hasPermission) {
                    return next(new ApiError(HttpStatus.FORBIDDEN, `Missing permission: ${permissionKey}`));
                }
            }

            next();
        } catch (error) {
            logger.error('[Authorize] Error checking permissions:', error);
            return next(new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, 'Authorization check failed'));
        }
    };
};
