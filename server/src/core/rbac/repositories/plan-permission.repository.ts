/**
 * Plan Permission Repository
 * 
 * Manages plan-scoped permission availability.
 * Defines what permissions are available under each subscription plan.
 */

import { PlanPermission } from '../../../database/models/public/PlanPermission.model';
import { Permission } from '../../../database/models/public/Permission.model';
import { PermissionKey } from '../rbac.types';

export interface PlanPermissionDTO {
  permissionId: string;
  permissionKey: PermissionKey;
  planId: string;
}

export class PlanPermissionRepository {
  
  /**
   * Get all permissions available under a plan
   */
  async getPermissionsForPlan(planId: string): Promise<PermissionKey[]> {
    const planPermissions = await PlanPermission.findAll({
      where: { plan_id: planId }
    });
    
    if (planPermissions.length === 0) return [];
    
    const permissionIds = planPermissions.map(pp => pp.permission_id);
    
    // Resolve to keys
    const permissions = await Permission.findAll({
      where: { id: permissionIds }
    });
    
    const keyMap = new Map(
      permissions.map(p => [p.id, p.key])
    );
    
    return planPermissions
      .map(pp => keyMap.get(pp.permission_id))
      .filter((key): key is PermissionKey => !!key);
  }

  /**
   * Get detailed plan permissions
   */
  async getPlanPermissionDetails(planId: string): Promise<PlanPermissionDTO[]> {
    const planPermissions = await PlanPermission.findAll({
      where: { plan_id: planId }
    });
    
    if (planPermissions.length === 0) return [];
    
    const permissionIds = planPermissions.map(pp => pp.permission_id);
    
    const permissions = await Permission.findAll({
      where: { id: permissionIds }
    });
    
    const keyMap = new Map(
      permissions.map(p => [p.id, p.key])
    );
    
    return planPermissions.map(pp => ({
      permissionId: pp.permission_id,
      permissionKey: keyMap.get(pp.permission_id) ?? 'unknown',
      planId: pp.plan_id
    }));
  }

  /**
   * Check if permission is available in plan
   */
  async isPermissionInPlan(permissionId: string, planId: string): Promise<boolean> {
    const count = await PlanPermission.count({
      where: {
        plan_id: planId,
        permission_id: permissionId
      }
    });
    
    return count > 0;
  }

  /**
   * Check if permission key is available in plan
   */
  async isPermissionKeyInPlan(permissionKey: PermissionKey, planId: string): Promise<boolean> {
    // Find permission by key first
    const permission = await Permission.findOne({
      where: { key: permissionKey }
    });
    
    if (!permission) return false;
    
    return this.isPermissionInPlan(permission.id, planId);
  }

  /**
   * Get all plans that include a permission
   */
  async getPlansForPermission(permissionId: string): Promise<string[]> {
    const planPermissions = await PlanPermission.findAll({
      where: { permission_id: permissionId }
    });
    
    return planPermissions.map(pp => pp.plan_id);
  }

  /**
   * Add permission to plan
   */
  async addPermissionToPlan(permissionId: string, planId: string): Promise<void> {
    await PlanPermission.create({
      plan_id: planId,
      permission_id: permissionId
    });
  }

  /**
   * Remove permission from plan
   */
  async removePermissionFromPlan(permissionId: string, planId: string): Promise<void> {
    await PlanPermission.destroy({
      where: {
        plan_id: planId,
        permission_id: permissionId
      }
    });
  }

  /**
   * Sync plan permissions (replace all)
   */
  async syncPlanPermissions(planId: string, permissionIds: string[]): Promise<void> {
    // Remove existing
    await PlanPermission.destroy({
      where: { plan_id: planId }
    });
    
    // Add new
    if (permissionIds.length > 0) {
      await PlanPermission.bulkCreate(
        permissionIds.map(pid => ({
          plan_id: planId,
          permission_id: pid
        }))
      );
    }
  }
}
