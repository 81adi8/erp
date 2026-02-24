/**
 * Admin Permission Repository
 * 
 * Manages admin delegation permissions.
 * These define what admins CAN delegate, not their runtime access.
 * Used by delegation services, not runtime RBAC resolver.
 */

import { AdminPermission } from '../../../database/models/shared/core/AdminPermission.model';
import { BaseRBACRepository } from './base.repository';
import { UserId, PermissionKey, InstitutionId } from '../rbac.types';

export interface AdminPermissionDTO {
  permissionId: string;
  permissionKey: PermissionKey;
  institutionId?: InstitutionId;
  grantedAt: Date;
}

export class AdminPermissionRepository extends BaseRBACRepository {
  
  /**
   * Get permissions an admin can delegate
   * Scoped by institution if provided
   */
  async getDelegablePermissions(
    adminUserId: UserId,
    institutionId?: InstitutionId
  ): Promise<PermissionKey[]> {
    const where: Record<string, unknown> = { user_id: adminUserId };
    
    // Scope by institution if provided
    if (institutionId) {
      where.institution_id = [null, institutionId];
    }
    
    const permissions = await AdminPermission.schema(this.getSchema()).findAll({
      where
    });
    
    // Return unique keys (denormalized)
    const keys = permissions.map(p => p.permission_key);
    return [...new Set(keys)];
  }

  /**
   * Get detailed delegation permissions
   */
  async getPermissionDetails(
    adminUserId: UserId
  ): Promise<AdminPermissionDTO[]> {
    const permissions = await AdminPermission.schema(this.getSchema()).findAll({
      where: { user_id: adminUserId }
    });
    
    return permissions.map(p => ({
      permissionId: p.permission_id,
      permissionKey: p.permission_key,
      institutionId: p.institution_id ?? undefined,
      grantedAt: p.granted_at ?? new Date()
    }));
  }

  /**
   * Check if admin can delegate a specific permission
   */
  async canDelegate(
    adminUserId: UserId,
    permissionKey: PermissionKey,
    institutionId?: InstitutionId
  ): Promise<boolean> {
    const where: Record<string, unknown> = {
      user_id: adminUserId,
      permission_key: permissionKey
    };
    
    if (institutionId) {
      where.institution_id = [null, institutionId];
    }
    
    const count = await AdminPermission.schema(this.getSchema()).count({ where });
    return count > 0;
  }

  /**
   * Grant delegation permission to admin
   */
  async grantDelegationPermission(
    adminUserId: UserId,
    permissionId: string,
    permissionKey: PermissionKey,
    institutionId?: InstitutionId
  ): Promise<void> {
    await AdminPermission.schema(this.getSchema()).create({
      user_id: adminUserId,
      permission_id: permissionId,
      permission_key: permissionKey,
      institution_id: institutionId
    });
  }

  /**
   * Revoke delegation permission
   */
  async revokeDelegationPermission(
    adminUserId: UserId,
    permissionKey: PermissionKey,
    institutionId?: InstitutionId
  ): Promise<void> {
    const where: Record<string, unknown> = {
      user_id: adminUserId,
      permission_key: permissionKey
    };
    
    if (institutionId) {
      where.institution_id = institutionId;
    }
    
    await AdminPermission.schema(this.getSchema()).destroy({ where });
  }

  /**
   * Sync admin permissions from plan
   * Used during institution creation
   */
  async syncFromPlan(
    adminUserId: UserId,
    planPermissions: Array<{ permissionId: string; permissionKey: PermissionKey }>,
    institutionId?: InstitutionId
  ): Promise<void> {
    // Clear existing
    await AdminPermission.schema(this.getSchema()).destroy({
      where: { user_id: adminUserId }
    });
    
    // Insert new
    if (planPermissions.length > 0) {
      await AdminPermission.schema(this.getSchema()).bulkCreate(
        planPermissions.map(p => ({
          user_id: adminUserId,
          permission_id: p.permissionId,
          permission_key: p.permissionKey,
          institution_id: institutionId
        }))
      );
    }
  }
}
