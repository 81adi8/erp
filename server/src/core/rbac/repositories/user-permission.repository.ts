/**
 * User Permission Repository
 * 
 * Manages direct permission grants to users.
 * Includes user overrides with expiry support.
 */

import { UserPermission } from '../../../database/models/shared/core/UserPermission.model';
import { BaseRBACRepository } from './base.repository';
import { UserPermissionDTO, UserId, PermissionKey } from '../rbac.types';
import { Op } from 'sequelize';

export class UserPermissionRepository extends BaseRBACRepository {
  
  /**
   * Get active permissions for a user
   * Filters out expired permissions
   */
  async getPermissionsForUser(userId: UserId): Promise<PermissionKey[]> {
    const now = new Date();
    
    const permissions = await UserPermission.schema(this.getSchema()).findAll({
      where: {
        user_id: userId,
        [Op.or]: [
          { expires_at: null },
          { expires_at: { [Op.gt]: now } }
        ]
      }
    });
    
    // Return unique keys (denormalized already)
    const keys = permissions.map(p => p.permission_key);
    return [...new Set(keys)];
  }

  /**
   * Get detailed permission grants for a user
   */
  async getPermissionDetails(userId: UserId): Promise<UserPermissionDTO[]> {
    const now = new Date();
    
    const permissions = await UserPermission.schema(this.getSchema()).findAll({
      where: {
        user_id: userId,
        [Op.or]: [
          { expires_at: null },
          { expires_at: { [Op.gt]: now } }
        ]
      },
      order: [['granted_at', 'DESC']]
    });
    
    return permissions.map(p => this.mapToDTO(p));
  }

  /**
   * Check if user has a specific permission (active)
   */
  async hasPermission(userId: UserId, permissionKey: PermissionKey): Promise<boolean> {
    const now = new Date();
    
    const count = await UserPermission.schema(this.getSchema()).count({
      where: {
        user_id: userId,
        permission_key: permissionKey,
        [Op.or]: [
          { expires_at: null },
          { expires_at: { [Op.gt]: now } }
        ]
      }
    });
    
    return count > 0;
  }

  /**
   * Grant permission to user
   */
  async grantPermission(
    userId: UserId,
    permissionId: string,
    permissionKey: PermissionKey,
    grantedBy: UserId,
    expiresAt?: Date
  ): Promise<void> {
    await UserPermission.schema(this.getSchema()).create({
      user_id: userId,
      permission_id: permissionId,
      permission_key: permissionKey,
      granted_by: grantedBy,
      expires_at: expiresAt
    });
  }

  /**
   * Revoke permission from user
   */
  async revokePermission(userId: UserId, permissionKey: PermissionKey): Promise<void> {
    await UserPermission.schema(this.getSchema()).destroy({
      where: {
        user_id: userId,
        permission_key: permissionKey
      }
    });
  }

  /**
   * Revoke all permissions for a user
   */
  async revokeAllPermissions(userId: UserId): Promise<void> {
    await UserPermission.schema(this.getSchema()).destroy({
      where: { user_id: userId }
    });
  }

  /**
   * Check whether the user has at least one active permission.
   */
  async hasAnyPermissions(userId: UserId): Promise<boolean> {
    const now = new Date();
    
    const count = await UserPermission.schema(this.getSchema()).count({
      where: {
        user_id: userId,
        [Op.or]: [
          { expires_at: null },
          { expires_at: { [Op.gt]: now } }
        ]
      }
    });
    
    return count > 0;
  }

  /**
   * Map ORM to DTO
   */
  private mapToDTO(permission: UserPermission): UserPermissionDTO {
    return {
      permissionId: permission.permission_id,
      permissionKey: permission.permission_key,
      grantedAt: permission.granted_at ?? new Date(),
      expiresAt: permission.expires_at ?? undefined,
      grantedBy: permission.granted_by
    };
  }
}
