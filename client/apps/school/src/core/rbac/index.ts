// ============================================================================
// RBAC Module Exports - Scalable Multi-Tenant
// ============================================================================

// Provider and hooks
export {
    PermissionProvider,
    usePermission,
    useRoleLevel,
    useIsAdmin,
    useIsManager,
    useIsStaff,
    PermissionContext,
} from './PermissionProvider';

// Protected components
export { ProtectedRoute, PermissionGate, ROLE_LEVELS } from './ProtectedRoute';

// Role hierarchy (for direct access to levels and mappings)
export {
    ROLE_LEVELS as RoleLevels,
    TENANT_ROLE_MAPPINGS,
    getRoleLevel,
    getHighestRoleLevel,
    hasMinimumRoleLevel,
    isAdminRole,
    isManagerRole,
    isStaffRole,
    getRoleLevelName,
} from './roleHierarchy';

// Permission constants
export { PERMISSIONS, ROLES } from './permissions';
export type { PermissionKey, PermissionValue, RoleKey, RoleValue } from './permissions';

