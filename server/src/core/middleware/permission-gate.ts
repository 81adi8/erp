import { Response, NextFunction } from 'express';
import { CustomRequest } from '../types/CustomRequest';
import { ApiError } from '../http/ApiError';
import { HttpStatus } from '../http/HttpStatus';
import { PermissionService } from '../../modules/school/services/permission.service';
import { RoleService } from '../../modules/school/services/role.service';
import { logger } from '../utils/logger';

export interface PermissionGateOptions {
    permissions?: string[];
    roles?: string[];
    requireAllPermissions?: boolean;
    requireAllRoles?: boolean;
}

export interface PermissionGateResult {
    hasPermission: boolean;
    hasRole: boolean;
    missingPermissions?: string[];
    missingRoles?: string[];
}

let roleService: typeof RoleService | null = null;
let permissionService: typeof PermissionService | null = null;

function getServices() {
    if (!roleService) {
        roleService = require('../../modules/school/user-management/services/role.service').RoleService;
    }
    if (!permissionService) {
        permissionService = require('../../modules/school/user-management/services/permission.service').PermissionService;
    }
    return { roleService, permissionService };
}

export function createPermissionGate(options: PermissionGateOptions) {
    const { permissions = [], roles = [], requireAllPermissions = false, requireAllRoles = false } = options;

    return async (req: CustomRequest, res: Response, next: NextFunction) => {
        try {
            const schemaName = req.tenant?.db_schema;
            const userId = req.user?.userId;

            if (!schemaName || !userId) {
                return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Authentication required'));
            }

            const { roleService: RoleSvc, permissionService: PermSvc } = getServices();
            if (!RoleSvc || !PermSvc) {
                return next(new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, 'Permission services not available'));
            }

            let hasRole = false;
            let missingRoles: string[] = [];

            if (roles.length > 0) {
                const userRoles = await RoleSvc.getUserRoles(userId, schemaName);
                const userRoleNames = userRoles.map((r: { name: string }) => r.name.toLowerCase());
                
                if (requireAllRoles) {
                    hasRole = roles.every(r => userRoleNames.includes(r.toLowerCase()));
                    missingRoles = roles.filter(r => !userRoleNames.includes(r.toLowerCase()));
                } else {
                    hasRole = roles.some(r => userRoleNames.includes(r.toLowerCase()));
                    missingRoles = hasRole ? [] : roles;
                }
            }

            let hasPermission = false;
            let missingPermissions: string[] = [];

            if (permissions.length > 0) {
                if (requireAllPermissions) {
                    hasPermission = true;
                    for (const permKey of permissions) {
                        const has = await PermSvc.checkUserPermission(schemaName, userId, permKey);
                        if (!has) {
                            hasPermission = false;
                            missingPermissions.push(permKey);
                        }
                    }
                } else {
                    for (const permKey of permissions) {
                        const has = await PermSvc.checkUserPermission(schemaName, userId, permKey);
                        if (has) {
                            hasPermission = true;
                            break;
                        }
                    }
                    if (!hasPermission) {
                        missingPermissions = permissions;
                    }
                }
            }

            const passed = (hasRole || permissions.length === 0) && (hasPermission || roles.length === 0);

            if (!passed) {
                logger.warn('[PermissionGate] Access denied', {
                    userId,
                    schemaName,
                    route: req.originalUrl,
                    hasRole,
                    hasPermission,
                    missingRoles,
                    missingPermissions,
                });

                return next(new ApiError(
                    HttpStatus.FORBIDDEN,
                    'Insufficient privileges',
                    [{
                        requiredPermissions: permissions,
                        requiredRoles: roles,
                        missingPermissions,
                        missingRoles,
                    }]
                ));
            }

            next();
        } catch (error) {
            logger.error('[PermissionGate] Error checking permissions:', error);
            return next(new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, 'Authorization check failed'));
        }
    };
}

export function requirePermission(permission: string) {
    return createPermissionGate({ permissions: [permission] });
}

export function requireRole(role: string) {
    return createPermissionGate({ roles: [role] });
}

export function requirePermissions(permissions: string[]) {
    return createPermissionGate({ permissions, requireAllPermissions: true });
}

export function requireRoles(roles: string[]) {
    return createPermissionGate({ roles, requireAllRoles: true });
}
