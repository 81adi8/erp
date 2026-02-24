import { Request, Response, NextFunction } from 'express';
import { PermissionService } from '../services/permission.service';
import { HttpStatus } from '../../../core/http/HttpStatus';

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
 * Permission Controller - Centralized and Delegated Permissions
 */
export class PermissionController {

    /**
     * GET /permissions/abilities - List all global modules, features, and permissions
     * Primarily for Root Admin or Super Admin
     */
    static async listGlobalAbilities(req: Request, res: Response, next: NextFunction) {
        try {
            const abilities = await PermissionService.getGlobalAbilities();
            return sendSuccess(res, abilities, 'Global abilities fetched successfully');
        } catch (error) {
            return sendError(res, getErrorMessage(error), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * GET /permissions/admin-range - Get current admin's permitted permissions
     * Uses runtime RBAC context from DB, NOT JWT claims
     */
    static async getAdminRange(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            const adminUserId = req.user?.userId;
            const userPermissions = req.rbac?.permissions || [];
            const userRoles = req.rbac?.roles || [];
            const isAdmin = Boolean(req.user?.is_main || userRoles.some((role) => role.toLowerCase() === 'admin'));

            if (!schemaName || !adminUserId) {
                return sendError(res, 'Context missing', HttpStatus.BAD_REQUEST);
            }

            const range = await PermissionService.getAdminRange(schemaName, adminUserId, userPermissions, isAdmin);
            return sendSuccess(res, range, 'Admin permission range fetched successfully');
        } catch (error) {
            return sendError(res, getErrorMessage(error), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * POST /permissions/delegate - Admin delegates permissions to a user
     */
    static async delegate(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            const adminUserId = req.user?.userId;
            const { userId, permissionIds } = req.body;

            if (!userId || !Array.isArray(permissionIds)) {
                return sendError(res, 'userId and permissionIds array required', HttpStatus.BAD_REQUEST);
            }

            const result = await PermissionService.delegatePermissions(
                schemaName,
                adminUserId,
                userId,
                permissionIds
            );

            return sendSuccess(res, result, 'Permissions delegated successfully');
        } catch (error) {
            return sendError(res, getErrorMessage(error), HttpStatus.BAD_REQUEST);
        }
    }

    /**
     * GET /permissions/user/:userId - Get all permissions for a specific user
     */
    static async getUserPermissions(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            const { userId } = req.params;

            if (!schemaName || !userId) {
                return sendError(res, 'schemaName and userId are required', HttpStatus.BAD_REQUEST);
            }

            const permissions = await PermissionService.getUserPermissionsForUser(
                schemaName,
                userId
            );

            return sendSuccess(res, permissions, 'User permissions fetched successfully');
        } catch (error) {
            return sendError(res, getErrorMessage(error), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * POST /permissions/sync-plan - Manually sync plan permissions for admin
     * Utility for Root Admin if plan changes
     */
    static async syncPlanPermissions(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            const planId = req.tenant?.plan_id;
            const adminUserId = req.user?.userId;

            if (!planId) {
                return sendError(res, 'No plan associated with this tenant', HttpStatus.BAD_REQUEST);
            }

            const result = await PermissionService.injectPlanPermissions(schemaName, adminUserId, planId);

            return sendSuccess(res, result, 'Plan permissions synchronized');
        } catch (error) {
            return sendError(res, getErrorMessage(error), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}

export default PermissionController;
