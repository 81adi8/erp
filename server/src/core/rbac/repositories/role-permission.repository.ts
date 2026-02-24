/**
 * Role Permission Repository
 * 
 * Manages permissions assigned to roles.
 * Cross-schema: tenant schema for assignments, public for definitions.
 */

import { RolePermission } from '../../../database/models/shared/core/RolePermission.model';
import { Permission } from '../../../database/models/public/Permission.model';
import { BaseRBACRepository } from './base.repository';
import { RolePermissionDTO, PermissionKey } from '../rbac.types';

export class RolePermissionRepository extends BaseRBACRepository {
  
  /**
   * Get all permissions for a list of role IDs
   * Batch operation for performance
   */
  async getPermissionsForRoles(roleIds: string[]): Promise<PermissionKey[]> {
    if (roleIds.length === 0) return [];
    
    // Get permission IDs from tenant schema
    const assignments = await RolePermission.schema(this.getSchema()).findAll({
      where: { role_id: roleIds }
    });
    
    if (assignments.length === 0) return [];
    
    const permissionIds = assignments.map(a => a.permission_id);
    
    // Resolve to keys from public schema
    const permissions = await Permission.findAll({
      where: { id: permissionIds }
    });
    
    // Build ID -> Key map
    const keyMap = new Map(
      permissions.map(p => [p.id, p.key])
    );
    
    // Return keys in order
    return assignments
      .map(a => keyMap.get(a.permission_id))
      .filter((key): key is string => !!key);
  }

  /**
   * Get detailed permission assignments for roles
   */
  async getRolePermissionDetails(roleIds: string[]): Promise<RolePermissionDTO[]> {
    if (roleIds.length === 0) return [];
    
    const assignments = await RolePermission.schema(this.getSchema()).findAll({
      where: { role_id: roleIds }
    });
    
    const permissionIds = assignments.map(a => a.permission_id);
    
    const permissions = await Permission.findAll({
      where: { id: permissionIds }
    });
    
    const keyMap = new Map(
      permissions.map(p => [p.id, p.key])
    );
    
    return assignments.map(a => ({
      roleId: a.role_id,
      permissionId: a.permission_id,
      permissionKey: keyMap.get(a.permission_id) ?? 'unknown'
    }));
  }

  /**
   * Get permission IDs for a role
   */
  async getPermissionIdsForRole(roleId: string): Promise<string[]> {
    const assignments = await RolePermission.schema(this.getSchema()).findAll({
      where: { role_id: roleId }
    });
    
    return assignments.map(a => a.permission_id);
  }

  /**
   * Check if role has a specific permission
   */
  async roleHasPermission(roleId: string, permissionId: string): Promise<boolean> {
    const count = await RolePermission.schema(this.getSchema()).count({
      where: { 
        role_id: roleId,
        permission_id: permissionId
      }
    });
    
    return count > 0;
  }

  /**
   * Assign permission to role
   */
  async assignPermission(roleId: string, permissionId: string): Promise<void> {
    await RolePermission.schema(this.getSchema()).create({
      role_id: roleId,
      permission_id: permissionId
    });
  }

  /**
   * Remove permission from role
   */
  async removePermission(roleId: string, permissionId: string): Promise<void> {
    await RolePermission.schema(this.getSchema()).destroy({
      where: {
        role_id: roleId,
        permission_id: permissionId
      }
    });
  }
}
