import { Request, Response, NextFunction } from 'express';
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
 * Role Controller - Handles HTTP requests for role management
 */
export class RoleController {

    /**
     * GET /roles - List all roles
     */
    static async list(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            if (!schemaName) {
                return sendError(res, 'Tenant context not found', HttpStatus.BAD_REQUEST);
            }

            const includePermissions = req.query.includePermissions === 'true';
            const roles = await RoleService.findAll(schemaName, { includePermissions });

            return sendSuccess(res, roles, 'Roles fetched successfully');
        } catch (error) {
            return sendError(res, getErrorMessage(error), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * GET /roles/:id - Get role by ID
     */
    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            if (!schemaName) {
                return sendError(res, 'Tenant context not found', HttpStatus.BAD_REQUEST);
            }

            const { id } = req.params;
            const role = await RoleService.findById(id as string, schemaName, { includePermissions: true });

            if (!role) {
                return sendError(res, 'Role not found', HttpStatus.NOT_FOUND);
            }

            return sendSuccess(res, role, 'Role fetched successfully');
        } catch (error) {
            return sendError(res, getErrorMessage(error), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * POST /roles - Create a new role
     */
    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            if (!schemaName) {
                return sendError(res, 'Tenant context not found', HttpStatus.BAD_REQUEST);
            }

            const { name, description } = req.body;

            if (!name || typeof name !== 'string' || name.trim().length === 0) {
                return sendError(res, 'Role name is required', HttpStatus.BAD_REQUEST);
            }

            const role = await RoleService.create({ name: name.trim(), description }, schemaName);

            return sendSuccess(res, role, 'Role created successfully', HttpStatus.CREATED);
        } catch (error) {
            return sendError(res, getErrorMessage(error), HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * PUT /roles/:id - Update a role
     */
    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            if (!schemaName) {
                return sendError(res, 'Tenant context not found', HttpStatus.BAD_REQUEST);
            }

            const { id } = req.params;
            const { name, description } = req.body;

            const role = await RoleService.update(id as string, { name, description }, schemaName);

            return sendSuccess(res, role, 'Role updated successfully');
        } catch (error) {
            return sendError(res, getErrorMessage(error), HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * DELETE /roles/:id - Delete a role
     */
    static async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            if (!schemaName) {
                return sendError(res, 'Tenant context not found', HttpStatus.BAD_REQUEST);
            }

            const { id } = req.params;
            await RoleService.delete(id as string, schemaName);

            return sendSuccess(res, null, 'Role deleted successfully');
        } catch (error) {
            return sendError(res, getErrorMessage(error), HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * POST /roles/:id/permissions - Assign permissions to a role
     */
    static async assignPermissions(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            if (!schemaName) {
                return sendError(res, 'Tenant context not found', HttpStatus.BAD_REQUEST);
            }

            const { id } = req.params;
            const { permissionIds } = req.body;

            if (!Array.isArray(permissionIds)) {
                return sendError(res, 'permissionIds must be an array', HttpStatus.BAD_REQUEST);
            }

            const role = await RoleService.assignPermissions(id as string, permissionIds, schemaName);

            return sendSuccess(res, role, 'Permissions assigned successfully');
        } catch (error) {
            return sendError(res, getErrorMessage(error), HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * GET /roles/:id/users - Get users with a specific role
     */
    static async getUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            if (!schemaName) {
                return sendError(res, 'Tenant context not found', HttpStatus.BAD_REQUEST);
            }

            const { id } = req.params;
            const users = await RoleService.getUsersWithRole(id as string, schemaName);

            return sendSuccess(res, users, 'Role users fetched successfully');
        } catch (error) {
            return sendError(res, getErrorMessage(error), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * POST /roles/assign - Assign role to user
     */
    static async assignToUser(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            const institutionId = req.tenant?.id;
            const assignedBy = req.user?.userId;

            if (!schemaName) {
                return sendError(res, 'Tenant context not found', HttpStatus.BAD_REQUEST);
            }

            const { userId, roleId } = req.body;

            if (!userId || !roleId) {
                return sendError(res, 'userId and roleId are required', HttpStatus.BAD_REQUEST);
            }

            await RoleService.assignRoleToUser(userId, roleId, schemaName, institutionId, assignedBy);

            return sendSuccess(res, null, 'Role assigned to user successfully');
        } catch (error) {
            return sendError(res, getErrorMessage(error), HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * DELETE /roles/assign - Remove role from user
     */
    static async removeFromUser(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            if (!schemaName) {
                return sendError(res, 'Tenant context not found', HttpStatus.BAD_REQUEST);
            }

            const { userId, roleId } = req.body;

            if (!userId || !roleId) {
                return sendError(res, 'userId and roleId are required', HttpStatus.BAD_REQUEST);
            }

            await RoleService.removeRoleFromUser(userId, roleId, schemaName);

            return sendSuccess(res, null, 'Role removed from user successfully');
        } catch (error) {
            return sendError(res, getErrorMessage(error), HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * POST /roles/refresh-from-templates - Refresh public roles from templates
     * Syncs permission updates from super admin, preserves custom roles
     */
    static async refreshFromTemplates(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            const planId = req.tenant?.plan_id;
            const tenantType = req.tenant?.type || 'all';

            logger.info('[RoleController] refreshFromTemplates called with:', {
                schemaName,
                planId,
                tenantType,
                tenant: req.tenant
            });

            if (!schemaName) {
                return sendError(res, 'Tenant context not found', HttpStatus.BAD_REQUEST);
            }

            const result = await RoleService.refreshFromTemplates(schemaName, planId, tenantType);

            return sendSuccess(
                res,
                result,
                `Created ${result.created} new roles, refreshed ${result.refreshed} existing, skipped ${result.skipped} custom roles`
            );
        } catch (error) {
            logger.error('[RoleController] refreshFromTemplates error:', error);
            return sendError(res, getErrorMessage(error), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * POST /roles/:id/clone-to-custom - Clone a public role to a custom role
     * Used when tenant wants to explicitly customize a role
     */
    static async cloneToCustom(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            if (!schemaName) {
                return sendError(res, 'Tenant context not found', HttpStatus.BAD_REQUEST);
            }

            const { id } = req.params;
            const customRole = await RoleService.cloneToCustom(id as string, schemaName);

            return sendSuccess(res, customRole, 'Role cloned to custom successfully');
        } catch (error) {
            return sendError(res, getErrorMessage(error), HttpStatus.BAD_REQUEST);
        }
    }
}

export default RoleController;
