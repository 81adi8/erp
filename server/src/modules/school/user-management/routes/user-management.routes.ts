import { Router } from 'express';
import { UserManagementController } from '../controllers/user-management.controller';
import { requirePermissionOrRole as legacyRequirePermissionOrRole } from '../../middlewares/permission.middleware';
import { requirePermission as rbacRequirePermission } from '../../../../core/rbac/rbac.middleware';
import { validate, validateParams, validateQuery } from '../../../../core/middleware/validate.middleware';
import rateLimit from 'express-rate-limit';
import {
    CreateTeacherSchema,
    CreateStudentSchema,
    CreateStaffSchema,
    CreateParentSchema,
    BulkCreateUsersSchema,
    UpdateUserSchema,
    AssignPermissionsSchema,
    UserIdParamSchema,
    UserListQuerySchema,
    UserStatsQuerySchema,
} from '../validators/user-management.dto';

/**
 * User Management Routes
 * All routes require Admin role or specific permissions
 * 
 * RBAC Pilot: Dual-mode wrapper
 * - RBAC_ENFORCE_USER_MGMT=true: Use RBAC requirePermission
 * - RBAC_ENFORCE_USER_MGMT=false: Use legacy requirePermissionOrRole (Admin fallback)
 */
const router = Router();

/**
 * Dual-mode permission wrapper for user management
 * Switches between RBAC and legacy based on env toggle
 */
function userMgmtRequirePermission(...permissions: string[]) {
    const useRBAC = process.env.RBAC_ENFORCE_USER_MGMT === 'true';
    
    if (useRBAC) {
        return rbacRequirePermission(...permissions);
    }
    return legacyRequirePermissionOrRole(permissions, ['Admin']);
}

// Rate limiter for bulk operations
const bulkRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Too many bulk operations. Please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ============================================================================
// User Creation (Admin or specific manage permissions)
// ============================================================================

/**
 * @route   POST /users/teachers
 * @desc    Create a new teacher
 * @access  users.teachers.manage or Admin
 */
router.post('/users/teachers',
    userMgmtRequirePermission('users.teachers.manage'),
    validate(CreateTeacherSchema),
    UserManagementController.createTeacher);

/**
 * @route   POST /users/students
 * @desc    Create a new student
 * @access  users.students.manage or Admin
 */
router.post('/users/students',
    userMgmtRequirePermission('users.students.manage'),
    validate(CreateStudentSchema),
    UserManagementController.createStudent);

/**
 * @route   POST /users/staff
 * @desc    Create a new staff member
 * @access  users.staff.manage or Admin
 */
router.post('/users/staff',
    userMgmtRequirePermission('users.staff.manage'),
    validate(CreateStaffSchema),
    UserManagementController.createStaff);

/**
 * @route   POST /users/parents
 * @desc    Create a new parent
 * @access  users.parents.manage or Admin
 */
router.post('/users/parents',
    userMgmtRequirePermission('users.parents.manage'),
    validate(CreateParentSchema),
    UserManagementController.createParent);

/**
 * @route   POST /users/bulk
 * @desc    Bulk create users (rate limited)
 * @access  users.view or Admin
 */
router.post('/users/bulk',
    userMgmtRequirePermission('users.view'),
    bulkRateLimiter,
    validate(BulkCreateUsersSchema),
    UserManagementController.bulkCreate);

// ============================================================================
// User Listing & Details
// ============================================================================

/**
 * @route   GET /users
 * @desc    List users with optional filters (?userType=teacher&isActive=true&page=1&limit=50)
 * @access  users.view (and variants) or Admin
 */
router.get('/users',
    userMgmtRequirePermission('users.view'),
    validateQuery(UserListQuerySchema),
    UserManagementController.listUsers);

/**
 * @route   GET /users/stats
 * @desc    Aggregated user stats for dashboard cards
 * @access  users.view (and variants) or Admin
 */
router.get('/users/stats',
    userMgmtRequirePermission('users.view'),
    validateQuery(UserStatsQuerySchema),
    UserManagementController.getUserStats);

/**
 * @route   GET /employees
 * @desc    Alias for listing teachers and staff
 */
router.get('/employees',
    userMgmtRequirePermission('users.teachers.view', 'users.staff.view'),
    validateQuery(UserListQuerySchema),
    UserManagementController.listUsers);

/**
 * @route   GET /teachers
 * @desc    Alias for listing teachers
 */
router.get('/teachers',
    userMgmtRequirePermission('users.teachers.view'),
    validateQuery(UserListQuerySchema),
    UserManagementController.listUsers);

// ── TASK-04: Restored teacher CRUD endpoints ─────────────────────────────────

/**
 * @route   PUT /teachers/:id
 * @desc    Update teacher by ID
 * @access  users.teachers.manage or Admin
 */
router.put('/teachers/:id',
    userMgmtRequirePermission('users.teachers.manage'),
    validateParams(UserIdParamSchema),
    validate(UpdateUserSchema),
    UserManagementController.updateTeacher);

/**
 * @route   PATCH /teachers/:id
 * @desc    Partial update teacher by ID (frontend contract alias for PUT)
 * FIXED: Frontend teachersApi.ts calls PATCH /school/teachers/:id.
 * Backend only had PUT. Added PATCH alias pointing to same controller.
 * @access  users.teachers.manage or Admin
 */
router.patch('/teachers/:id',
    userMgmtRequirePermission('users.teachers.manage'),
    validateParams(UserIdParamSchema),
    validate(UpdateUserSchema),
    UserManagementController.updateTeacher);

/**
 * @route   DELETE /teachers/:id
 * @desc    Deactivate teacher (soft delete)
 * @access  users.teachers.manage or Admin
 */
router.delete('/teachers/:id',
    userMgmtRequirePermission('users.teachers.manage'),
    validateParams(UserIdParamSchema),
    UserManagementController.deleteTeacher);

// ── Frontend contract aliases ─────────────────────────────────────────────────
// FIXED: Frontend teachersApi.ts calls POST /school/teachers to create a teacher,
// but backend only had POST /school/users/teachers. Add alias route.

/**
 * @route   POST /teachers
 * @desc    Create a new teacher (alias for /users/teachers — frontend contract)
 * @access  users.teachers.manage or Admin
 */
router.post('/teachers',
    userMgmtRequirePermission('users.teachers.manage'),
    validate(CreateTeacherSchema),
    UserManagementController.createTeacher);

/**
 * @route   GET /students
 * @desc    List students (alias — frontend studentsApi.ts calls /school/students
 *          which is handled by student.routes.ts, but /school/users/students
 *          is the canonical path here for user-management context)
 */
// Note: /school/students is handled by student.routes.ts (mounted separately).
// No alias needed here — student list/CRUD is fully in student.routes.ts.

/**
 * @route   GET /users/:id
 * @desc    Get user by ID with roles and permissions
 * @access  users.view or Admin
 */
router.get('/users/:id',
    userMgmtRequirePermission('users.view'),
    validateParams(UserIdParamSchema),
    UserManagementController.getUser);

// ============================================================================
// User Management
// ============================================================================

/**
 * @route   DELETE /users/:id
 * @desc    Deactivate user (soft delete in both local DB and Keycloak)
 * @access  users.manage or Admin
 */
router.delete('/users/:id',
    userMgmtRequirePermission('users.manage'),
    validateParams(UserIdParamSchema),
    UserManagementController.deactivateUser);

/**
 * @route   POST /users/:id/permissions
 * @desc    Assign additional permissions to user (within admin's Plan scope)
 * @access  users.manage or Admin
 */
router.post('/users/:id/permissions',
    userMgmtRequirePermission('users.manage'),
    validateParams(UserIdParamSchema),
    validate(AssignPermissionsSchema),
    UserManagementController.assignPermissions);

export default router;

