/**
 * Role Repository
 * 
 * Manages role definitions and metadata in tenant schema.
 * No permission logic here - only role identity and metadata.
 */

import { Role } from '../../../database/models/shared/core/Role.model';
import { BaseRBACRepository } from './base.repository';
import { RoleDTO } from '../rbac.types';

export class RoleRepository extends BaseRBACRepository {
  
  /**
   * Find role by ID
   */
  async findById(roleId: string): Promise<RoleDTO | null> {
    const role = await Role.schema(this.getSchema()).findByPk(roleId);
    
    if (!role) return null;
    
    return this.mapToDTO(role);
  }

  /**
   * Find role by slug
   */
  async findBySlug(slug: string): Promise<RoleDTO | null> {
    const role = await Role.schema(this.getSchema()).findOne({
      where: { slug }
    });
    
    if (!role) return null;
    
    return this.mapToDTO(role);
  }

  /**
   * Find role by type
   */
  async findByType(roleType: string): Promise<RoleDTO[]> {
    const roles = await Role.schema(this.getSchema()).findAll({
      where: { 
        role_type: roleType,
        is_active: true 
      }
    });
    
    return roles.map(r => this.mapToDTO(r));
  }

  /**
   * Find all active roles
   */
  async findAllActive(): Promise<RoleDTO[]> {
    const roles = await Role.schema(this.getSchema()).findAll({
      where: { is_active: true }
    });
    
    return roles.map(r => this.mapToDTO(r));
  }

  /**
   * Find roles by plan ID
   */
  async findByPlan(planId: string): Promise<RoleDTO[]> {
    const roles = await Role.schema(this.getSchema()).findAll({
      where: { 
        plan_id: planId,
        is_active: true 
      }
    });
    
    return roles.map(r => this.mapToDTO(r));
  }

  /**
   * Check if role exists
   */
  async exists(roleId: string): Promise<boolean> {
    const count = await Role.schema(this.getSchema()).count({
      where: { id: roleId }
    });
    
    return count > 0;
  }

  /**
   * Map ORM model to DTO
   */
  private mapToDTO(role: Role): RoleDTO {
    return {
      id: role.id,
      slug: role.slug,
      name: role.name,
      roleType: role.role_type,
      assetType: role.asset_type,
      planId: role.plan_id,
      isSystem: role.is_system,
      isActive: role.is_active ?? true
    };
  }
}
