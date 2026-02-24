import { Request, Response, NextFunction } from 'express';
import { RoleAssignmentService } from '../services/role-assignment.service';
import { RoleService } from '../services/role.service';
import { HttpStatus } from '../../../core/http/HttpStatus';
import { logger } from '../../../core/utils/logger';

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }
    return 'An unexpected error occurred';
};

const sendSuccess = (
    res: Response,
    data: unknown,
    message = 'Success',
    statusCode = HttpStatus.OK,
    meta?: Record<string, unknown>
) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        errors: [],
        ...(meta ? { meta } : {}),
    });
};

const sendError = (
    res: Response,
    message: string,
    statusCode = HttpStatus.BAD_REQUEST,
    errors: string[] = [message]
) => {
    return res.status(statusCode).json({
        success: false,
        message,
        data: null,
        errors,
    });
};

/**
 * Role Configuration Controller
 * 
 * Handles endpoints for managing default role configurations per user type.
 * This is where school admins can:
 * - View current default roles for each user type
 * - Change default roles without affecting existing users
 * - Optionally migrate existing users to new defaults
 */
export class RoleConfigController {

    /**
     * GET /roles/config - Get all default role configurations
     */
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            if (!schemaName) {
                return sendError(res, 'Tenant context not found', HttpStatus.BAD_REQUEST);
            }

            const configs = await RoleAssignmentService.getAllDefaultRoleConfigs(schemaName);

            return sendSuccess(res, configs, 'Role configurations fetched successfully');
        } catch (error) {
            logger.error('[RoleConfigController] getAll error:', error);
            return sendError(res, getErrorMessage(error), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * GET /roles/types - Get available role types based on institution context
     */
    static async getAvailableRoleTypes(req: Request, res: Response, next: NextFunction) {
        try {
            const institutionType = req.tenant?.type || 'school';
            const { INSTITUTION_ROLES } = require('../../../core/constants/roles');

            const rolesByInstitution = INSTITUTION_ROLES as Record<string, unknown[]>;
            const roles = rolesByInstitution[institutionType] || INSTITUTION_ROLES.school;

            return sendSuccess(res, roles, 'Role types fetched successfully');
        } catch (error) {
            logger.error('[RoleConfigController] getAvailableRoleTypes error:', error);
            return sendError(res, getErrorMessage(error), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * GET /roles/config/:userType - Get default role config for a specific user type
     */
    static async getByUserType(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            if (!schemaName) {
                return sendError(res, 'Tenant context not found', HttpStatus.BAD_REQUEST);
            }

            const { userType } = req.params;
            const config = await RoleAssignmentService.getDefaultRoleConfig(schemaName, userType as string);

            if (!config) {
                return sendError(
                    res,
                    `No default role configured for user type: ${userType}`,
                    HttpStatus.NOT_FOUND
                );
            }

            return sendSuccess(res, config, 'Role configuration fetched successfully');
        } catch (error) {
            logger.error('[RoleConfigController] getByUserType error:', error);
            return sendError(res, getErrorMessage(error), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * PUT /roles/config/:userType - Set/update default role for a user type
     * 
     * Request body:
     * {
     *   roleId: string,      // New default role ID
     *   migrateUsers?: boolean // If true, migrate existing users to new role
     * }
     * 
     * IMPORTANT: By default (migrateUsers=false), existing users keep their current role!
     */
    static async setDefault(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            const planId = req.tenant?.plan_id;
            const changedBy = req.user?.userId;

            if (!schemaName) {
                return sendError(res, 'Tenant context not found', HttpStatus.BAD_REQUEST);
            }

            const { userType } = req.params;
            const { roleId, migrateUsers = false } = req.body;

            if (!roleId) {
                return sendError(res, 'roleId is required', HttpStatus.BAD_REQUEST);
            }

            // Set the new default role
            const result = await RoleAssignmentService.setDefaultRole(
                schemaName,
                userType as string,
                roleId,
                changedBy,
                planId
            );

            // Optionally migrate existing users
            let migrationResult = null;
            if (migrateUsers && result.previousRoleId) {
                migrationResult = await RoleAssignmentService.migrateUsersToNewDefault(
                    schemaName,
                    userType as string,
                    result.previousRoleId,
                    roleId,
                    changedBy
                );
            }

            return sendSuccess(
                res,
                {
                    config: result.config,
                    previousRoleId: result.previousRoleId,
                    usersWithPreviousRole: result.affectedUsers,
                    migration: migrationResult,
                },
                migrateUsers
                    ? `Default role updated and ${migrationResult?.migratedCount || 0} users migrated`
                    : `Default role updated. ${result.affectedUsers} existing users retain their previous role.`
            );
        } catch (error) {
            logger.error('[RoleConfigController] setDefault error:', error);
            return sendError(res, getErrorMessage(error), HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * POST /roles/config/:userType/migrate - Migrate users from old role to current default
     * 
     * This is a separate action that admin must explicitly trigger.
     * It will migrate all users who were auto-assigned the old role to the new default.
     */
    static async migrateUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            const migratedBy = req.user?.userId;

            if (!schemaName) {
                return sendError(res, 'Tenant context not found', HttpStatus.BAD_REQUEST);
            }

            const { userType } = req.params;
            const { oldRoleId, newRoleId } = req.body;

            if (!oldRoleId || !newRoleId) {
                return sendError(res, 'oldRoleId and newRoleId are required', HttpStatus.BAD_REQUEST);
            }

            const result = await RoleAssignmentService.migrateUsersToNewDefault(
                schemaName,
                userType as string,
                oldRoleId,
                newRoleId,
                migratedBy
            );

            return sendSuccess(
                res,
                result,
                `Successfully migrated ${result.migratedCount} users from old role to new role`
            );
        } catch (error) {
            logger.error('[RoleConfigController] migrateUsers error:', error);
            return sendError(res, getErrorMessage(error), HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * POST /roles/config/initialize - Initialize default role configs for tenant
     * 
     * This should be called once during tenant setup or when resetting role configs.
     */
    static async initialize(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            const planId = req.tenant?.plan_id;

            if (!schemaName) {
                return sendError(res, 'Tenant context not found', HttpStatus.BAD_REQUEST);
            }

            await RoleAssignmentService.initializeDefaultRoleConfigs(schemaName, planId);

            const configs = await RoleAssignmentService.getAllDefaultRoleConfigs(schemaName);

            return sendSuccess(res, configs, 'Default role configurations initialized successfully');
        } catch (error) {
            logger.error('[RoleConfigController] initialize error:', error);
            return sendError(res, getErrorMessage(error), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * GET /roles/available-for-type/:userType - Get roles available for a user type
     * 
     * Returns both system and custom roles that can be set as default for the user type.
     */
    static async getAvailableRolesForType(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            if (!schemaName) {
                return sendError(res, 'Tenant context not found', HttpStatus.BAD_REQUEST);
            }

            const roles = await RoleService.findAll(schemaName, { includePermissions: false });

            // Add cache information for each role
            const rolesWithCacheInfo = roles.map((role) => {
                const roleData = role.toJSON ? role.toJSON() : role;
                return {
                    ...roleData,
                    cacheStrategy: roleData.asset_type === 'custom'
                        ? 'tenant-scoped'
                        : 'plan-scoped',
                    cacheDescription: roleData.asset_type === 'custom'
                        ? 'This role\'s permissions are cached per-tenant (isolated)'
                        : 'This role\'s permissions are cached globally per-plan (shared)',
                };
            });

            return sendSuccess(res, rolesWithCacheInfo, 'Available roles fetched successfully');
        } catch (error) {
            logger.error('[RoleConfigController] getAvailableRolesForType error:', error);
            return sendError(res, getErrorMessage(error), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}

export default RoleConfigController;
