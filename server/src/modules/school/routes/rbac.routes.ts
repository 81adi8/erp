import { NextFunction, Request, Response, Router } from 'express';
import { RoleController } from '../controllers/role.controller';
import { PermissionController } from '../controllers/permission.controller';
import { RoleConfigController } from '../controllers/role-config.controller';
import { requirePermissionOrRole as legacyRequirePermissionOrRole } from '../middlewares/permission.middleware';
import { requirePermission as rbacRequirePermission } from '../../../core/rbac/rbac.middleware';
import { validate, validateParams } from '../../../core/middleware/validate.middleware';
import { z } from 'zod';

/**
 * Role & Permission Routes (RBAC)
 * Integrated with Centralized Permission System
 * 
 * CACHING STRATEGY:
 * - System/Public roles: Cached at plan level (shared across tenants)
 * - Custom roles: Cached at tenant level (isolated per tenant)
 * - Role configs: Cached at tenant level (default role per user type)
 * 
 * RBAC Pilot: Dual-mode wrapper
 * - RBAC_ENFORCE_RBAC=true: Use RBAC requirePermission
 * - RBAC_ENFORCE_RBAC=false: Use legacy requirePermissionOrRole (Admin fallback)
 */
const router = Router();
const uuidSchema = z.string().uuid('Invalid UUID');
const nonEmptyTrimmedString = z.string().trim().min(1);
const emptyBodySchema = z.union([z.object({}).strict(), z.undefined()]).transform(() => ({}));
const userTypeParamSchema = z.object({ userType: nonEmptyTrimmedString.max(50) }).strict();
const roleIdParamSchema = z.object({ id: uuidSchema }).strict();
const userIdParamSchema = z.object({ userId: uuidSchema }).strict();
const delegatePermissionsSchema = z.object({
    userId: uuidSchema,
    permissionIds: z.array(uuidSchema).min(1, 'permissionIds must have at least one permission id')
}).strict();
const setDefaultRoleSchema = z.object({
    roleId: uuidSchema,
    migrateUsers: z.coerce.boolean().optional()
}).strict();
const migrateUsersSchema = z.object({
    oldRoleId: uuidSchema,
    newRoleId: uuidSchema
}).strict();
const createRoleSchema = z.object({
    name: nonEmptyTrimmedString.max(100),
    description: z.string().trim().max(1000).optional()
}).strict();
const updateRoleSchema = z.object({
    name: nonEmptyTrimmedString.max(100).optional(),
    description: z.string().trim().max(1000).optional()
}).strict().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required'
});
const assignPermissionsSchema = z.object({
    permissionIds: z.array(uuidSchema)
}).strict();
const assignRoleToUserSchema = z.object({
    userId: uuidSchema,
    roleId: uuidSchema
}).strict();

/**
 * Dual-mode permission wrapper for RBAC management
 * Includes emergency admin bypass for safety
 * 
 * @param permissions - RBAC permissions to check
 */
function rbacRequirePermissionGate(...permissions: string[]) {
    const useRBAC = process.env.RBAC_ENFORCE_RBAC === 'true';
    
    if (useRBAC) {
        // Emergency admin bypass - prevents lockout if RBAC misfires
        // This will be removed after full certification
        return (req: Request, res: Response, next: NextFunction) => {
            const userRoles = req.rbac?.roles || [];
            const isAdmin = userRoles.some((role) => role.toLowerCase() === 'admin');
            
            if (isAdmin) {
                return next(); // Admin always passes
            }
            
            return rbacRequirePermission(...permissions)(req, res, next);
        };
    }
    
    return legacyRequirePermissionOrRole(permissions, ['Admin']);
}

// ============================================================================
// Permission Range & Delegation
// ============================================================================

// List all global modules, features, and permissions (For Root/Super Admin)
router.get('/permissions/abilities', rbacRequirePermissionGate('settings.rbac.view'), PermissionController.listGlobalAbilities);

// Get the school admin's permitted range (from Plan)
router.get('/permissions/admin-range', rbacRequirePermissionGate('settings.rbac.view'), PermissionController.getAdminRange);

// Admin delegates permissions to teacher/student/staff
router.post('/permissions/delegate', rbacRequirePermissionGate('settings.rbac.manage'), validate(delegatePermissionsSchema), PermissionController.delegate);

// Get permissions for a specific user
router.get('/permissions/user/:userId', rbacRequirePermissionGate('settings.rbac.view'), validateParams(userIdParamSchema), PermissionController.getUserPermissions);

// Sync plan permissions manually
router.post('/permissions/sync-plan', rbacRequirePermissionGate('settings.manage'), validate(emptyBodySchema), PermissionController.syncPlanPermissions);

// ============================================================================
// Role Configuration (Default Roles per User Type)
// ============================================================================

// Get available role types for current institution context
router.get('/roles/types', rbacRequirePermissionGate('settings.roles.view'), RoleConfigController.getAvailableRoleTypes);

// Get all default role configurations
router.get('/roles/config', rbacRequirePermissionGate('settings.roles.view'), RoleConfigController.getAll);

// Get default role for a specific user type
router.get('/roles/config/:userType', rbacRequirePermissionGate('settings.roles.view'), RoleConfigController.getByUserType);

// Set/update default role for a user type (DOES NOT migrate existing users by default)
router.put('/roles/config/:userType', rbacRequirePermissionGate('settings.roles.manage'), validateParams(userTypeParamSchema), validate(setDefaultRoleSchema), RoleConfigController.setDefault);

// Explicitly migrate users from old role to new role
router.post('/roles/config/:userType/migrate', rbacRequirePermissionGate('settings.roles.manage'), validateParams(userTypeParamSchema), validate(migrateUsersSchema), RoleConfigController.migrateUsers);

// Initialize default role configurations (one-time setup)
router.post('/roles/config/initialize', rbacRequirePermissionGate('settings.roles.manage'), validate(emptyBodySchema), RoleConfigController.initialize);

// Get available roles for a user type (with cache strategy info)
router.get('/roles/available-for-type/:userType', rbacRequirePermissionGate('settings.roles.view'), RoleConfigController.getAvailableRolesForType);

// ============================================================================
// Role Management
// ============================================================================

// List all roles (settings.rbac.view or settings.roles.view or Admin role)
router.get('/roles', rbacRequirePermissionGate('settings.roles.view'), RoleController.list);

// Get a single role
router.get('/roles/:id', rbacRequirePermissionGate('settings.roles.view'), RoleController.getById);

// Create a new role
router.post('/roles', rbacRequirePermissionGate('settings.roles.manage'), validate(createRoleSchema), RoleController.create);

// Update a role
router.put('/roles/:id', rbacRequirePermissionGate('settings.roles.manage'), validateParams(roleIdParamSchema), validate(updateRoleSchema), RoleController.update);

// Delete a role
router.delete('/roles/:id', rbacRequirePermissionGate('settings.roles.manage'), RoleController.delete);

// Assign permissions to a role
router.post('/roles/:id/permissions', rbacRequirePermissionGate('settings.roles.manage'), validateParams(roleIdParamSchema), validate(assignPermissionsSchema), RoleController.assignPermissions);

// Get users with a specific role
router.get('/roles/:id/users', rbacRequirePermissionGate('settings.roles.view'), RoleController.getUsers);

// Assign role to user
router.post('/roles/assign', rbacRequirePermissionGate('settings.rbac.assign'), validate(assignRoleToUserSchema), RoleController.assignToUser);

// Remove role from user
router.delete('/roles/assign', rbacRequirePermissionGate('settings.rbac.assign'), RoleController.removeFromUser);

// Refresh roles from templates (sync from super admin)
router.post('/roles/refresh-from-templates', rbacRequirePermissionGate('settings.roles.manage'), validate(emptyBodySchema), RoleController.refreshFromTemplates);

// Clone a public role to custom (explicit customization)
router.post('/roles/:id/clone-to-custom', rbacRequirePermissionGate('settings.roles.manage'), validateParams(roleIdParamSchema), validate(emptyBodySchema), RoleController.cloneToCustom);

export default router;

