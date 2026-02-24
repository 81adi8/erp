/**
 * RBAC Repositories Index
 * 
 * Export all RBAC repository classes for easy importing.
 * Note: DTO types are exported from rbac.types, not here.
 */

export { BaseRBACRepository } from './base.repository';

// Tenant schema repositories
export { RoleRepository } from './role.repository';
export { UserRoleRepository } from './user-role.repository';
export { RolePermissionRepository } from './role-permission.repository';
export { UserPermissionRepository } from './user-permission.repository';
export { AdminPermissionRepository } from './admin-permission.repository';

// Public schema repositories
export { PermissionRepository } from './permission.repository';
export { PlanPermissionRepository } from './plan-permission.repository';
export { FeatureRepository } from './feature.repository';
export { FeatureFlagRepository } from './feature-flag.repository';
export { InstitutionRepository } from './institution.repository';
