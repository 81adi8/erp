/**
 * RBAC Core Module
 * 
 * Authorization and permission management for the ERP.
 * 
 * Usage:
 * ```typescript
 * import { RBACResolver, RBACEngine, createRBACMiddleware } from './core/rbac';
 * 
 * // In app setup:
 * const rbacResolver = new RBACResolver(cache);
 * app.use(createRBACMiddleware({ resolver: rbacResolver }));
 * 
 * // In routes:
 * router.get('/students', requirePermission('students.view'), controller);
 * 
 * // In controllers:
 * const engine = getRBACEngine(req);
 * if (engine.hasPermission('students.manage')) { ... }
 * ```
 */

// Types
export * from './rbac.types';

// Core classes
export { RBACResolver } from './rbac.resolver';
export { RBACEngine } from './rbac.engine';
export { RBACCache } from './rbac.cache';

// Middleware
export {
  createRBACMiddleware,
  requirePermission,
  requireAllPermissions,
  requireRole,
  requirePermissionOrRole,
  requireRBAC,
  getRBACEngine,
  hasPermission
} from './rbac.middleware';

// Repositories (without re-exporting types already in rbac.types)
export {
  BaseRBACRepository,
  RoleRepository,
  UserRoleRepository,
  RolePermissionRepository,
  UserPermissionRepository,
  AdminPermissionRepository,
  PermissionRepository,
  PlanPermissionRepository,
  FeatureRepository,
  FeatureFlagRepository,
  InstitutionRepository
} from './repositories';

// Constants
export {
  RBAC_CACHE_TTL_DEFAULT,
  RBAC_CACHE_PREFIX,
  RBAC_CACHE_VERSION,
  RBAC_MAX_PERMISSIONS,
  RBAC_MAX_ROLES
} from './rbac.types';
