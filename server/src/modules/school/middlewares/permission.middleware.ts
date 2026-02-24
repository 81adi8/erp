import { Response, NextFunction } from 'express';
import { CustomRequest } from '../../../core/types/CustomRequest';
import { PermissionService } from '../services/permission.service';
import { RoleService } from '../services/role.service';
import { HttpStatus } from '../../../core/http/HttpStatus';
import { logger } from '../../../core/utils/logger';

const sendAuthzError = (
    res: Response,
    statusCode: number,
    message: string,
    errors: string[],
    extra: Record<string, unknown> = {}
) => {
    return res.status(statusCode).json({
        success: false,
        message,
        data: null,
        errors,
        error: message,
        ...extra,
    });
};

// Legacy auth invocation counter (for telemetry)
let legacyAuthInvocations = 0;
let lastLogTime = Date.now();

/**
 * @deprecated Use RBAC middleware: rbacRequirePermission() from core/rbac/rbac.middleware
 * This middleware is maintained for backward compatibility only.
 * All new routes should use RBAC enforcement.
 */
export const requirePermission = (...requiredPermissions: string[]) => {
    // Telemetry: log every 10 minutes
    legacyAuthInvocations++;
    if (Date.now() - lastLogTime > 600000) {
        logger.warn(`[LegacyAuth] Invocations in last 10min: ${legacyAuthInvocations}`);
        legacyAuthInvocations = 0;
        lastLogTime = Date.now();
    }
    
    // Deprecation warning in non-production
    if (process.env.NODE_ENV !== 'production') {
        logger.warn(
            `[DEPRECATED] Legacy permission middleware invoked. ` +
            `Use RBAC middleware instead: requirePermission from core/rbac/rbac.middleware`
        );
    }
    return async (req: CustomRequest, res: Response, next: NextFunction) => {
        try {
            const schemaName = req.tenant?.db_schema;
            const userId = req.user?.userId;

            if (!schemaName || !userId) {
                logger.info('[PermissionGuard] Missing schemaName or userId:', { schemaName, userId });
                return sendAuthzError(
                    res,
                    HttpStatus.UNAUTHORIZED,
                    'Authentication required',
                    ['AUTHENTICATION_REQUIRED']
                );
            }

            // Check each required permission
            // For now, if multiple are required, user must have AT LEAST ONE (OR logic)
            // or we could enforce ALL (AND logic). Let's go with AT LEAST ONE for flexibility.
            let hasAtLeastOne = false;
            for (const permKey of requiredPermissions) {
                const hasPerm = await PermissionService.checkUserPermission(schemaName, userId, permKey);
                if (hasPerm) {
                    hasAtLeastOne = true;
                    break;
                }
            }

            if (!hasAtLeastOne) {
                return sendAuthzError(
                    res,
                    HttpStatus.FORBIDDEN,
                    'Insufficient permissions',
                    ['INSUFFICIENT_PERMISSIONS'],
                    { required: requiredPermissions }
                );
            }

            next();
        } catch (error) {
            logger.error('[PermissionGuard] Error:', error);
            return sendAuthzError(
                res,
                HttpStatus.INTERNAL_SERVER_ERROR,
                'Permission check failed',
                ['PERMISSION_CHECK_FAILED']
            );
        }
    };
};

/**
 * Role Guard Middleware
 * Checks if user has required role(s) to access an endpoint
 */
export const requireRole = (...requiredRoles: string[]) => {
    return async (req: CustomRequest, res: Response, next: NextFunction) => {
        try {
            const schemaName = req.tenant?.db_schema;
            const userId = req.user?.userId;

            logger.info('[RoleGuard] Checking:', { schemaName, userId, requiredRoles });

            if (!schemaName || !userId) {
                logger.info('[RoleGuard] Missing schemaName or userId');
                return sendAuthzError(
                    res,
                    HttpStatus.UNAUTHORIZED,
                    'Authentication required',
                    ['AUTHENTICATION_REQUIRED']
                );
            }

            // Get user's roles
            const userRoles = await RoleService.getUserRoles(userId, schemaName);
            const userRoleNames = userRoles.map((r) => r.name.toLowerCase());

            // Check if user has at least one required role
            const hasRole = requiredRoles.some(r =>
                userRoleNames.includes(r.toLowerCase())
            );

            // FIXED: Removed implicit admin superuser bypass.
            // Previously: if (!hasRole && userRoleNames.includes('admin')) return next()
            // This granted all Admin users access to any role-guarded route regardless
            // of what roles were actually required â€” a privilege escalation risk.
            // Admin access is now enforced explicitly by including 'Admin' in requiredRoles.

            if (!hasRole) {
                return sendAuthzError(
                    res,
                    HttpStatus.FORBIDDEN,
                    'Insufficient role privileges',
                    ['INSUFFICIENT_ROLE_PRIVILEGES'],
                    { required: requiredRoles }
                );
            }

            next();
        } catch (error) {
            logger.error('[RoleGuard] Error:', error);
            return sendAuthzError(
                res,
                HttpStatus.INTERNAL_SERVER_ERROR,
                'Role check failed',
                ['ROLE_CHECK_FAILED']
            );
        }
    };
};

/**
 * Combined Permission/Role Guard
 * User must have required permission OR required role
 * @deprecated Use RBAC middleware: rbacRequirePermission() from core/rbac/rbac.middleware
 */
export const requirePermissionOrRole = (permissions: string[], roles: string[]) => {
    // Telemetry
    legacyAuthInvocations++;
    if (Date.now() - lastLogTime > 600000) {
        logger.warn(`[LegacyAuth] Invocations in last 10min: ${legacyAuthInvocations}`);
        legacyAuthInvocations = 0;
        lastLogTime = Date.now();
    }
    
    if (process.env.NODE_ENV !== 'production') {
        logger.warn(
            `[DEPRECATED] Legacy requirePermissionOrRole invoked. ` +
            `Use RBAC middleware instead.`
        );
    }
    
    return async (req: CustomRequest, res: Response, next: NextFunction) => {
        try {
            const schemaName = req.tenant?.db_schema;
            const userId = req.user?.userId;

            if (!schemaName || !userId) {
                return sendAuthzError(
                    res,
                    HttpStatus.UNAUTHORIZED,
                    'Authentication required',
                    ['AUTHENTICATION_REQUIRED']
                );
            }

            // Check roles first (faster)
            const userRoles = await RoleService.getUserRoles(userId, schemaName);
            const userRoleNames = userRoles.map((r) => r.name.toLowerCase());
            const hasRole = roles.some(r => userRoleNames.includes(r.toLowerCase()));

            if (hasRole) return next();

            // Check permissions
            let hasPermission = false;
            for (const permKey of permissions) {
                const hasPerm = await PermissionService.checkUserPermission(schemaName, userId, permKey);
                if (hasPerm) {
                    hasPermission = true;
                    break;
                }
            }

            if (!hasPermission) {
                return sendAuthzError(
                    res,
                    HttpStatus.FORBIDDEN,
                    'Insufficient privileges',
                    ['INSUFFICIENT_PRIVILEGES'],
                    {
                        requiredPermissions: permissions,
                        requiredRoles: roles,
                    }
                );
            }

            next();
        } catch (error) {
            logger.error('[PermissionOrRoleGuard] Error:', error);
            return sendAuthzError(
                res,
                HttpStatus.INTERNAL_SERVER_ERROR,
                'Authorization check failed',
                ['AUTHORIZATION_CHECK_FAILED']
            );
        }
    };
};
