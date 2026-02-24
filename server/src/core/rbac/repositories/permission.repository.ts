/**
 * Permission Repository
 * 
 * Manages permission definitions in public schema.
 * Global catalog of available permissions.
 */

import { Permission } from '../../../database/models/public/Permission.model';
import { PermissionKey } from '../rbac.types';

export interface PermissionDefinitionDTO {
  id: string;
  key: PermissionKey;
  action: string;
  featureId: string;
  description?: string;
}

export class PermissionRepository {
  
  /**
   * Find permission by ID
   */
  async findById(permissionId: string): Promise<PermissionDefinitionDTO | null> {
    const permission = await Permission.findByPk(permissionId);
    
    if (!permission) return null;
    
    return this.mapToDTO(permission);
  }

  /**
   * Find permission by key
   */
  async findByKey(key: PermissionKey): Promise<PermissionDefinitionDTO | null> {
    const permission = await Permission.findOne({
      where: { key }
    });
    
    if (!permission) return null;
    
    return this.mapToDTO(permission);
  }

  /**
   * Get all permissions
   */
  async findAll(): Promise<PermissionDefinitionDTO[]> {
    const permissions = await Permission.findAll({
      order: [['key', 'ASC']]
    });
    
    return permissions.map(p => this.mapToDTO(p));
  }

  /**
   * Get permissions by feature
   */
  async findByFeature(featureId: string): Promise<PermissionDefinitionDTO[]> {
    const permissions = await Permission.findAll({
      where: { feature_id: featureId },
      order: [['key', 'ASC']]
    });
    
    return permissions.map(p => this.mapToDTO(p));
  }

  /**
   * Get permissions by keys
   */
  async findByKeys(keys: PermissionKey[]): Promise<PermissionDefinitionDTO[]> {
    if (keys.length === 0) return [];
    
    const permissions = await Permission.findAll({
      where: { key: keys }
    });
    
    return permissions.map(p => this.mapToDTO(p));
  }

  /**
   * Check if permission exists
   */
  async exists(key: PermissionKey): Promise<boolean> {
    const count = await Permission.count({
      where: { key }
    });
    
    return count > 0;
  }

  /**
   * Resolve permission IDs to keys
   */
  async resolveIdsToKeys(permissionIds: string[]): Promise<Map<string, PermissionKey>> {
    if (permissionIds.length === 0) return new Map();
    
    const permissions = await Permission.findAll({
      where: { id: permissionIds }
    });
    
    return new Map(
      permissions.map(p => [p.id, p.key])
    );
  }

  /**
   * Map ORM to DTO
   */
  private mapToDTO(permission: Permission): PermissionDefinitionDTO {
    return {
      id: permission.id,
      key: permission.key,
      action: permission.action,
      featureId: permission.feature_id,
      description: permission.description
    };
  }
}
