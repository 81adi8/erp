import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../../core/utils/logger';
// LEGACY: Keep other methods using v1 until migrated
import { UserManagementService as LegacyUserManagementService, UserType } from '../services/user-management.service';
// NEW: v3 service with repository pattern
import { createUserManagementService } from '../services/user-management.repository.service';
import { HttpStatus } from '../../../../core/http/HttpStatus';
import {
    CreateTeacherSchema,
    CreateStudentSchema,
    CreateStaffSchema,
    CreateParentSchema,
    BulkCreateUsersSchema,
    UpdateUserSchema,
    AssignPermissionsSchema,
} from '../validators/user-management.dto';
import { PermissionService } from '../../services/permission.service';
import { RoleType } from '../../../../core/constants/roles';

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }
    return 'An unexpected error occurred';
};

const getErrorStatusCode = (
    error: unknown,
    fallback = HttpStatus.INTERNAL_SERVER_ERROR
): number => {
    if (
        typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        typeof (error as { statusCode?: unknown }).statusCode === 'number'
    ) {
        return (error as { statusCode: number }).statusCode;
    }

    return fallback;
};

const sendSuccess = (
    res: Response,
    data: unknown,
    message = 'Success',
    statusCode = HttpStatus.OK,
    meta?: Record<string, unknown>,
    extra?: Record<string, unknown>
) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        errors: [],
        ...(meta ? { meta } : {}),
        ...(extra || {}),
    });
};

const sendError = (
    res: Response,
    message: string,
    statusCode = HttpStatus.BAD_REQUEST,
    errors: string[] = [message],
    extra?: Record<string, unknown>
) => {
    return res.status(statusCode).json({
        success: false,
        message,
        data: null,
        errors,
        ...(extra || {}),
    });
};

/**
 * User Management Controller
 * Handles user creation with Keycloak integration and plan-scoped permissions
 */
export class UserManagementController {

    /**
     * POST /users/teachers - Create a teacher
     * 
     * MIGRATED: Using UserManagementService v3 (Repository-Based)
     * - Extracts TenantContext from request
     - Creates service instance with tenant context
     * - No longer passes schemaName string
     */
    static async createTeacher(req: Request, res: Response, next: NextFunction) {
        try {
            const tenant = req.tenant;
            const adminUserId = req.user?.userId;

            if (!tenant?.db_schema || !adminUserId) {
                return sendError(res, 'Missing tenant or user context', HttpStatus.BAD_REQUEST);
            }

            // Validate request body
            const validation = CreateTeacherSchema.safeParse(req.body);
            if (!validation.success) {
                return sendError(
                    res,
                    'Validation failed',
                    HttpStatus.BAD_REQUEST,
                    validation.error.issues.map((issue) => issue.message),
                    { details: validation.error.issues }
                );
            }

            // MIGRATED: Create service instance with tenant context
            const userManagementService = createUserManagementService(tenant);
            
            // MIGRATED: Call instance method (no schemaName param)
            const result = await userManagementService.createTeacher(
                adminUserId,
                validation.data
            );

            return sendSuccess(res, result, 'Teacher created successfully', HttpStatus.CREATED);
        } catch (error) {
            logger.error('[UserManagementController] createTeacher error:', error);
            const status = getErrorStatusCode(error, HttpStatus.INTERNAL_SERVER_ERROR);
            return sendError(res, getErrorMessage(error), status);
        }
    }

    /**
     * POST /users/students - Create a student
     */
    static async createStudent(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            const adminUserId = req.user?.userId;

            if (!schemaName || !adminUserId) {
                return sendError(res, 'Missing tenant or user context', HttpStatus.BAD_REQUEST);
            }

            const validation = CreateStudentSchema.safeParse(req.body);
            if (!validation.success) {
                return sendError(
                    res,
                    'Validation failed',
                    HttpStatus.BAD_REQUEST,
                    validation.error.issues.map((issue) => issue.message),
                    { details: validation.error.issues }
                );
            }

            const result = await LegacyUserManagementService.createStudent(
                schemaName,
                adminUserId,
                validation.data
            );

            return sendSuccess(res, result, 'Student created successfully', HttpStatus.CREATED);
        } catch (error) {
            logger.error('[UserManagementController] createStudent error:', error);
            const status = getErrorStatusCode(error, HttpStatus.INTERNAL_SERVER_ERROR);
            return sendError(res, getErrorMessage(error), status);
        }
    }

    /**
     * POST /users/staff - Create a staff member
     */
    static async createStaff(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            const adminUserId = req.user?.userId;

            if (!schemaName || !adminUserId) {
                return sendError(res, 'Missing tenant or user context', HttpStatus.BAD_REQUEST);
            }

            const validation = CreateStaffSchema.safeParse(req.body);
            if (!validation.success) {
                return sendError(
                    res,
                    'Validation failed',
                    HttpStatus.BAD_REQUEST,
                    validation.error.issues.map((issue) => issue.message),
                    { details: validation.error.issues }
                );
            }

            const result = await LegacyUserManagementService.createStaff(
                schemaName,
                adminUserId,
                validation.data
            );

            return sendSuccess(res, result, 'Staff created successfully', HttpStatus.CREATED);
        } catch (error) {
            logger.error('[UserManagementController] createStaff error:', error);
            const status = getErrorStatusCode(error, HttpStatus.INTERNAL_SERVER_ERROR);
            return sendError(res, getErrorMessage(error), status);
        }
    }

    /**
     * POST /users/parents - Create a parent
     */
    static async createParent(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            const adminUserId = req.user?.userId;

            if (!schemaName || !adminUserId) {
                return sendError(res, 'Missing tenant or user context', HttpStatus.BAD_REQUEST);
            }

            const validation = CreateParentSchema.safeParse(req.body);
            if (!validation.success) {
                return sendError(
                    res,
                    'Validation failed',
                    HttpStatus.BAD_REQUEST,
                    validation.error.issues.map((issue) => issue.message),
                    { details: validation.error.issues }
                );
            }

            const result = await LegacyUserManagementService.createParent(
                schemaName,
                adminUserId,
                validation.data
            );

            return sendSuccess(res, result, 'Parent created successfully', HttpStatus.CREATED);
        } catch (error) {
            logger.error('[UserManagementController] createParent error:', error);
            const status = getErrorStatusCode(error, HttpStatus.INTERNAL_SERVER_ERROR);
            return sendError(res, getErrorMessage(error), status);
        }
    }

    /**
     * POST /users/bulk - Bulk create users
     */
    static async bulkCreate(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            const adminUserId = req.user?.userId;

            if (!schemaName || !adminUserId) {
                return sendError(res, 'Missing tenant or user context', HttpStatus.BAD_REQUEST);
            }

            const validation = BulkCreateUsersSchema.safeParse(req.body);
            if (!validation.success) {
                return sendError(
                    res,
                    'Validation failed',
                    HttpStatus.BAD_REQUEST,
                    validation.error.issues.map((issue) => issue.message),
                    { details: validation.error.issues }
                );
            }

            const result = await LegacyUserManagementService.bulkCreateUsers(
                schemaName,
                adminUserId,
                validation.data
            );

            return sendSuccess(
                res,
                result,
                'Bulk user creation completed',
                HttpStatus.CREATED,
                {
                    created: result.success.length,
                    failed: result.failed.length,
                },
                {
                    summary: {
                        created: result.success.length,
                        failed: result.failed.length,
                    },
                }
            );
        } catch (error) {
            logger.error('[UserManagementController] bulkCreate error:', error);
            const status = getErrorStatusCode(error, HttpStatus.INTERNAL_SERVER_ERROR);
            return sendError(res, getErrorMessage(error), status);
        }
    }

    /**
     * GET /users - List users with optional filters
     */
    static async listUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;

            if (!schemaName) {
                return sendError(res, 'Missing tenant context', HttpStatus.BAD_REQUEST);
            }

            const { userType, role, role_type, status, isActive, page, limit, search } = req.query;

            // Map role or role_type to userType if userType is missing
            let type = userType as UserType | undefined;
            if (!type && (role || role_type)) {
                const r = (role || role_type) as string;
                const lowerR = r.toLowerCase();
                if (lowerR === RoleType.TEACHER) type = RoleType.TEACHER;
                else if (lowerR === RoleType.STAFF) type = RoleType.STAFF;
                else if (lowerR === RoleType.ADMIN || lowerR === 'school_admin') type = RoleType.ADMIN;
                else if (lowerR === RoleType.STUDENT) type = RoleType.STUDENT;
                else if (lowerR === RoleType.PARENT) type = RoleType.PARENT;
            }

            const statusValue = typeof status === 'string' ? status.toLowerCase() : undefined;
            let activeFilter: boolean | undefined;
            if (statusValue === 'active') activeFilter = true;
            else if (statusValue === 'inactive') activeFilter = false;
            else if (statusValue === 'all') activeFilter = undefined;
            else if (isActive === 'true') activeFilter = true;
            else if (isActive === 'false') activeFilter = false;
            else activeFilter = true;

            const parsedPage = page ? Math.max(1, parseInt(page as string, 10)) : 1;
            const parsedLimit = limit ? Math.min(200, Math.max(1, parseInt(limit as string, 10))) : 50;
            const searchTerm = typeof search === 'string' ? search.trim() : undefined;
            const roleFilter = typeof role === 'string'
                ? role
                : typeof role_type === 'string'
                    ? role_type
                    : undefined;

            const result = await LegacyUserManagementService.listUsers(schemaName, {
                userType: type,
                role: roleFilter,
                search: searchTerm || undefined,
                isActive: activeFilter,
                page: parsedPage,
                limit: parsedLimit,
            });

            return sendSuccess(
                res,
                result.users,
                'Users fetched successfully',
                HttpStatus.OK,
                result.pagination as Record<string, unknown>,
                { pagination: result.pagination }
            );
        } catch (error) {
            logger.error('[UserManagementController] listUsers error:', error);
            return sendError(
                res,
                getErrorMessage(error),
                getErrorStatusCode(error, HttpStatus.INTERNAL_SERVER_ERROR)
            );
        }
    }

    /**
     * GET /users/stats - Get aggregated user stats
     */
    static async getUserStats(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;

            if (!schemaName) {
                return sendError(res, 'Missing tenant context', HttpStatus.BAD_REQUEST);
            }

            const { userType, role, role_type, search } = req.query;

            // Map role or role_type to userType if userType is missing
            let type = userType as UserType | undefined;
            if (!type && (role || role_type)) {
                const r = (role || role_type) as string;
                const lowerR = r.toLowerCase();
                if (lowerR === RoleType.TEACHER) type = RoleType.TEACHER;
                else if (lowerR === RoleType.STAFF) type = RoleType.STAFF;
                else if (lowerR === RoleType.ADMIN || lowerR === 'school_admin') type = RoleType.ADMIN;
                else if (lowerR === RoleType.STUDENT) type = RoleType.STUDENT;
                else if (lowerR === RoleType.PARENT) type = RoleType.PARENT;
            }

            const roleFilter = typeof role === 'string'
                ? role
                : typeof role_type === 'string'
                    ? role_type
                    : undefined;

            const stats = await LegacyUserManagementService.getUserStats(schemaName, {
                userType: type,
                role: roleFilter,
                search: typeof search === 'string' ? search.trim() : undefined,
            });

            return sendSuccess(res, stats, 'User statistics fetched successfully');
        } catch (error) {
            logger.error('[UserManagementController] getUserStats error:', error);
            const status = getErrorStatusCode(error, HttpStatus.INTERNAL_SERVER_ERROR);
            return sendError(res, getErrorMessage(error), status);
        }
    }

    /**
     * GET /users/:id - Get user by ID
     */
    static async getUser(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            const { id } = req.params;

            if (!schemaName) {
                return sendError(res, 'Missing tenant context', HttpStatus.BAD_REQUEST);
            }

            const user = await LegacyUserManagementService.getUserById(schemaName, id as string);

            return sendSuccess(res, user, 'User fetched successfully');
        } catch (error) {
            logger.error('[UserManagementController] getUser error:', error);
            const status = getErrorStatusCode(error, HttpStatus.INTERNAL_SERVER_ERROR);
            return sendError(res, getErrorMessage(error), status);
        }
    }

    /**
     * DELETE /users/:id - Deactivate user
     */
    static async deactivateUser(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            const adminUserId = req.user?.userId;
            const { id } = req.params;

            if (!schemaName || !adminUserId) {
                return sendError(res, 'Missing tenant or user context', HttpStatus.BAD_REQUEST);
            }

            await LegacyUserManagementService.deactivateUser(schemaName, id as string, adminUserId);

            return sendSuccess(res, null, 'User deactivated successfully');
        } catch (error) {
            logger.error('[UserManagementController] deactivateUser error:', error);
            const status = getErrorStatusCode(error, HttpStatus.INTERNAL_SERVER_ERROR);
            return sendError(res, getErrorMessage(error), status);
        }
    }

    /**
     * PUT /teachers/:id - Update teacher by ID
     * TASK-04: Restored endpoint
     */
    static async updateTeacher(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            const { id } = req.params;

            if (!schemaName) {
                return sendError(res, 'Missing tenant context', HttpStatus.BAD_REQUEST);
            }

            const result = await LegacyUserManagementService.updateUserBasic(
                schemaName,
                id as string,
                req.body as Record<string, unknown>
            );

            return sendSuccess(res, result, 'Teacher updated successfully', HttpStatus.OK);
        } catch (error) {
            logger.error('[UserManagementController] updateTeacher error:', error);
            const status = getErrorStatusCode(error, HttpStatus.INTERNAL_SERVER_ERROR);
            return sendError(res, getErrorMessage(error), status);
        }
    }

    /**
     * DELETE /teachers/:id - Deactivate teacher (soft delete)
     * TASK-04: Restored endpoint
     */
    static async deleteTeacher(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            const adminUserId = req.user?.userId;
            const { id } = req.params;

            if (!schemaName || !adminUserId) {
                return sendError(res, 'Missing tenant or user context', HttpStatus.BAD_REQUEST);
            }

            await LegacyUserManagementService.deactivateUser(schemaName, id as string, adminUserId);

            return sendSuccess(res, null, 'Teacher deactivated successfully');
        } catch (error) {
            logger.error('[UserManagementController] deleteTeacher error:', error);
            const status = getErrorStatusCode(error, HttpStatus.INTERNAL_SERVER_ERROR);
            return sendError(res, getErrorMessage(error), status);
        }
    }

    /**
     * POST /users/:id/permissions - Assign additional permissions to user (within Plan scope)
     */
    static async assignPermissions(req: Request, res: Response, next: NextFunction) {
        try {
            const schemaName = req.tenant?.db_schema;
            const adminUserId = req.user?.userId;
            const { id: userId } = req.params;

            if (!schemaName || !adminUserId) {
                return sendError(res, 'Missing tenant or user context', HttpStatus.BAD_REQUEST);
            }

            const { permissionKeys } = req.body;
            if (!Array.isArray(permissionKeys) || permissionKeys.length === 0) {
                return sendError(res, 'permissionKeys array is required', HttpStatus.BAD_REQUEST);
            }

            // Delegate permissions within admin's scope
            const result = await PermissionService.delegatePermissions(
                schemaName,
                adminUserId,
                userId as string,
                permissionKeys // Note: The service expects permission IDs, may need adjustment
            );

            return sendSuccess(res, result, 'Permissions assigned successfully');
        } catch (error) {
            logger.error('[UserManagementController] assignPermissions error:', error);
            const status = getErrorStatusCode(error, HttpStatus.BAD_REQUEST);
            return sendError(res, getErrorMessage(error), status);
        }
    }
}

export default UserManagementController;



