/**
 * RBAC Engine
 * 
 * Pure in-memory authorization evaluation.
 * No database calls. No side effects.
 * 
 * All methods are O(1) set membership checks.
 * RBACContext must be pre-built by RBACResolver.
 */

import { RBACContext, PermissionKey, RoleId } from './rbac.types';

export class RBACEngine {
  
  // Internal cache of Sets for fast lookups
  private permissionSet: Set<PermissionKey>;
  private roleSet: Set<RoleId>;

  constructor(private context: RBACContext) {
    // Pre-convert arrays to Sets for O(1) lookups
    this.permissionSet = new Set(context.permissions);
    this.roleSet = new Set(context.roles);
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(permissionKey: PermissionKey): boolean {
    return this.permissionSet.has(permissionKey);
  }

  /**
   * Check if user has ANY of the specified permissions
   * Returns true if at least one permission exists
   */
  hasAnyPermission(permissionKeys: PermissionKey[]): boolean {
    if (permissionKeys.length === 0) return true; // Nothing required = allowed
    
    return permissionKeys.some(key => this.permissionSet.has(key));
  }

  /**
   * Check if user has ALL of the specified permissions
   * Returns true only if every permission exists
   */
  hasAllPermissions(permissionKeys: PermissionKey[]): boolean {
    if (permissionKeys.length === 0) return true; // Nothing required = allowed
    
    return permissionKeys.every(key => this.permissionSet.has(key));
  }

  /**
   * Check if user has a specific role
   */
  hasRole(roleId: RoleId): boolean {
    return this.roleSet.has(roleId);
  }

  /**
   * Check if user has ANY of the specified roles
   */
  hasAnyRole(roleIds: RoleId[]): boolean {
    if (roleIds.length === 0) return true;
    
    return roleIds.some(id => this.roleSet.has(id));
  }

  /**
   * Check if user has ALL of the specified roles
   */
  hasAllRoles(roleIds: RoleId[]): boolean {
    if (roleIds.length === 0) return true;
    
    return roleIds.every(id => this.roleSet.has(id));
  }

  /**
   * Check permission with flexible options
   */
  check(options: {
    permissions?: PermissionKey[];
    roles?: RoleId[];
    requireAll?: boolean;
  }): boolean {
    const { permissions = [], roles = [], requireAll = false } = options;

    // Check permissions
    let permissionCheck: boolean;
    if (permissions.length === 0) {
      permissionCheck = true;
    } else if (requireAll) {
      permissionCheck = this.hasAllPermissions(permissions);
    } else {
      permissionCheck = this.hasAnyPermission(permissions);
    }

    // Check roles
    let roleCheck: boolean;
    if (roles.length === 0) {
      roleCheck = true;
    } else if (requireAll) {
      roleCheck = this.hasAllRoles(roles);
    } else {
      roleCheck = this.hasAnyRole(roles);
    }

    // Both must pass
    return permissionCheck && roleCheck;
  }

  /**
   * Get list of permissions user has
   */
  getPermissions(): PermissionKey[] {
    return [...this.context.permissions];
  }

  /**
   * Get list of roles user has
   */
  getRoles(): RoleId[] {
    return [...this.context.roles];
  }

  /**
   * Get count of permissions
   */
  getPermissionCount(): number {
    return this.permissionSet.size;
  }

  /**
   * Get count of roles
   */
  getRoleCount(): number {
    return this.roleSet.size;
  }

  /**
   * Check if user can delegate a permission
   * Based on admin delegation pool
   */
  canDelegate(permissionKey: PermissionKey): boolean {
    return this.context.sourceMap.adminDelegations.includes(permissionKey);
  }

  /**
   * Get missing permissions from a required list
   */
  getMissingPermissions(required: PermissionKey[]): PermissionKey[] {
    return required.filter(key => !this.permissionSet.has(key));
  }

  /**
   * Get missing roles from a required list
   */
  getMissingRoles(required: RoleId[]): RoleId[] {
    return required.filter(id => !this.roleSet.has(id));
  }

  /**
   * Get the raw context (for debugging)
   */
  getContext(): RBACContext {
    return this.context;
  }

  /**
   * Static factory method for convenience
   */
  static fromContext(context: RBACContext): RBACEngine {
    return new RBACEngine(context);
  }
}

export default RBACEngine;
