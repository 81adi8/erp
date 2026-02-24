import type { AdminUser } from '../features/auth/authSlice';

/**
 * Permission keys used throughout the application
 */
export type PermissionKey =
    | 'manage_admins'
    | 'manage_institutions'
    | 'view_institutions'
    | 'manage_plans'
    | 'manage_permissions'
    | 'view_analytics'
    | 'manage_settings';

/**
 * Check if user has a specific permission.
 * Root admins (is_main = true) have all permissions.
 * Sub-root admins check against their permissions object.
 */
export const hasPermission = (user: AdminUser | null, permission: PermissionKey): boolean => {
    if (!user) return false;

    // Root admin has all permissions
    if (user.is_main) return true;

    // Check specific permission
    return user.permissions?.[permission] === true;
};

/**
 * Check if user has at least one of the specified permissions.
 */
export const hasAnyPermission = (user: AdminUser | null, permissions: PermissionKey[]): boolean => {
    if (!user) return false;
    if (user.is_main) return true;
    return permissions.some(p => user.permissions?.[p] === true);
};

/**
 * Check if user has all of the specified permissions.
 */
export const hasAllPermissions = (user: AdminUser | null, permissions: PermissionKey[]): boolean => {
    if (!user) return false;
    if (user.is_main) return true;
    return permissions.every(p => user.permissions?.[p] === true);
};

/**
 * Get list of permissions the user has.
 */
export const getUserPermissions = (user: AdminUser | null): PermissionKey[] => {
    if (!user) return [];
    if (user.is_main) {
        // Return all permissions for root admin
        return ['manage_admins', 'manage_institutions', 'view_institutions', 'manage_plans', 'manage_permissions', 'view_analytics', 'manage_settings'];
    }
    return Object.entries(user.permissions || {})
        .filter(([_, value]) => value === true)
        .map(([key]) => key as PermissionKey);
};
