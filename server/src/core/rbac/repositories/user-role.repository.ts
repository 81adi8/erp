/**
 * User Role Repository
 * 
 * Manages role assignments for users.
 * Links users to their roles within tenant/institution scope.
 */

import { UserRole } from '../../../database/models/shared/core/UserRole.model';
import { BaseRBACRepository } from './base.repository';
import { UserRoleDTO, UserId, InstitutionId } from '../rbac.types';
import { Op } from 'sequelize';

export class UserRoleRepository extends BaseRBACRepository {
  
  /**
   * Get all role assignments for a user
   * Filters by institution scope (global + specific)
   */
  async getRolesForUser(
    userId: UserId, 
    institutionId?: InstitutionId
  ): Promise<UserRoleDTO[]> {
    const where: Record<string, unknown> = { user_id: userId };
    
    // Include global assignments and institution-specific
    if (institutionId) {
      where.institution_id = {
        [Op.or]: [
            { [Op.eq]: null },
            { [Op.eq]: institutionId }
        ]
      };
    }
    
    const assignments = await UserRole.schema(this.getSchema()).findAll({
      where,
      order: [['assigned_at', 'DESC']]
    });
    
    return assignments.map(a => this.mapToDTO(a));
  }

  /**
   * Get active role IDs for a user (simplified)
   */
  async getRoleIdsForUser(userId: UserId): Promise<string[]> {
    const assignments = await UserRole.schema(this.getSchema()).findAll({
      where: { user_id: userId }
    });
    
    return assignments.map(a => a.role_id);
  }

  /**
   * Check if user has a specific role
   */
  async hasRole(userId: UserId, roleId: string): Promise<boolean> {
    const count = await UserRole.schema(this.getSchema()).count({
      where: { 
        user_id: userId,
        role_id: roleId
      }
    });
    
    return count > 0;
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: UserId, 
    roleId: string, 
    assignedBy: UserId,
    institutionId?: InstitutionId
  ): Promise<void> {
    await UserRole.schema(this.getSchema()).create({
      user_id: userId,
      role_id: roleId,
      assigned_by: assignedBy,
      institution_id: institutionId,
      assignment_type: 'explicit'
    });
  }

  /**
   * Remove role from user
   */
  async removeRole(
    userId: UserId, 
    roleId: string,
    institutionId?: InstitutionId
  ): Promise<void> {
    const where: Record<string, unknown> = { 
      user_id: userId,
      role_id: roleId
    };
    
    if (institutionId) {
      where.institution_id = institutionId;
    }
    
    await UserRole.schema(this.getSchema()).destroy({ where });
  }

  /**
   * Map ORM to DTO
   */
  private mapToDTO(assignment: UserRole): UserRoleDTO {
    return {
      roleId: assignment.role_id,
      assignmentType: assignment.assignment_type ?? 'explicit',
      institutionId: assignment.institution_id ?? undefined,
      assignedAt: assignment.assigned_at ?? new Date()
    };
  }
}
