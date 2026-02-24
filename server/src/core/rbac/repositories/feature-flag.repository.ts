/**
 * Feature Flag Repository
 * 
 * Manages dynamic feature enablement.
 * Supports tenant targeting, plan targeting, percentage rollouts, and time windows.
 */

import { FeatureFlag } from '../../../database/models/public/FeatureFlag.model';
import { Op } from 'sequelize';

export interface FeatureFlagCheckResult {
  enabled: boolean;
  reason: 'disabled' | 'tenant_type' | 'plan' | 'institution' | 'percentage' | 'time' | 'not_found';
}

export class FeatureFlagRepository {
  
  /**
   * Check if feature is enabled for tenant
   * Applies all targeting rules
   */
  async isEnabledForTenant(
    flagKey: string,
    tenantContext: {
      tenantId: string;
      tenantType: string;
      planId: string;
      institutionId?: string;
    }
  ): Promise<FeatureFlagCheckResult> {
    const now = new Date();
    
    const flag = await FeatureFlag.findOne({
      where: { key: flagKey }
    });
    
    if (!flag) {
      return { enabled: false, reason: 'not_found' };
    }
    
    // Check if globally disabled
    if (!flag.enabled) {
      return { enabled: false, reason: 'disabled' };
    }
    
    // Check time window
    if (flag.starts_at && now < flag.starts_at) {
      return { enabled: false, reason: 'time' };
    }
    
    if (flag.ends_at && now > flag.ends_at) {
      return { enabled: false, reason: 'time' };
    }
    
    // Check tenant type targeting
    if (flag.tenant_types?.length > 0) {
      if (!flag.tenant_types.includes(tenantContext.tenantType)) {
        return { enabled: false, reason: 'tenant_type' };
      }
    }
    
    // Check plan targeting
    if (flag.plan_ids?.length > 0) {
      if (!flag.plan_ids.includes(tenantContext.planId)) {
        return { enabled: false, reason: 'plan' };
      }
    }
    
    // Check institution targeting (explicit allowlist)
    if (flag.institution_ids?.length > 0) {
      if (!tenantContext.institutionId || 
          !flag.institution_ids.includes(tenantContext.institutionId)) {
        return { enabled: false, reason: 'institution' };
      }
    }
    
    // Check percentage rollout
    if (flag.rollout_percentage < 100) {
      const hash = this.hashString(`${flagKey}:${tenantContext.tenantId}`);
      const normalizedHash = (hash % 100 + 100) % 100; // Ensure positive 0-99
      
      if (normalizedHash >= flag.rollout_percentage) {
        return { enabled: false, reason: 'percentage' };
      }
    }
    
    return { enabled: true, reason: 'tenant_type' };
  }

  /**
   * Get all enabled flags for a tenant
   */
  async getEnabledFlagsForTenant(
    tenantContext: {
      tenantId: string;
      tenantType: string;
      planId: string;
      institutionId?: string;
    }
  ): Promise<string[]> {
    const now = new Date();
    
    const flags = await FeatureFlag.findAll({
      where: {
        enabled: true,
        [Op.and]: [
          {
            [Op.or]: [
              { starts_at: null },
              { starts_at: { [Op.lte]: now } }
            ]
          },
          {
            [Op.or]: [
              { ends_at: null },
              { ends_at: { [Op.gte]: now } }
            ]
          }
        ]
      }
    });
    
    const enabledFlags: string[] = [];
    
    for (const flag of flags) {
      const result = await this.isEnabledForTenant(flag.key, tenantContext);
      if (result.enabled) {
        enabledFlags.push(flag.key);
      }
    }
    
    return enabledFlags;
  }

  /**
   * Get feature flag by key
   */
  async getFlag(key: string): Promise<FeatureFlag | null> {
    return FeatureFlag.findOne({ where: { key } });
  }

  /**
   * Get all flags (for admin)
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    return FeatureFlag.findAll({
      order: [['key', 'ASC']]
    });
  }

  /**
   * Create/update feature flag
   */
  async upsertFlag(
    key: string,
    data: {
      name: string;
      enabled: boolean;
      tenantTypes?: string[];
      planIds?: string[];
      institutionIds?: string[];
      rolloutPercentage?: number;
      startsAt?: Date;
      endsAt?: Date;
      config?: Record<string, any>;
    }
  ): Promise<void> {
    const [flag] = await FeatureFlag.findOrCreate({
      where: { key },
      defaults: {
        key,
        name: data.name,
        enabled: data.enabled,
        tenant_types: data.tenantTypes ?? [],
        plan_ids: data.planIds ?? [],
        institution_ids: data.institutionIds ?? [],
        rollout_percentage: data.rolloutPercentage ?? 0,
        starts_at: data.startsAt,
        ends_at: data.endsAt,
        config: data.config ?? {}
      }
    });
    
    if (flag) {
      await flag.update({
        name: data.name,
        enabled: data.enabled,
        tenant_types: data.tenantTypes ?? flag.tenant_types,
        plan_ids: data.planIds ?? flag.plan_ids,
        institution_ids: data.institutionIds ?? flag.institution_ids,
        rollout_percentage: data.rolloutPercentage ?? flag.rollout_percentage,
        starts_at: data.startsAt ?? flag.starts_at,
        ends_at: data.endsAt ?? flag.ends_at,
        config: data.config ?? flag.config
      });
    }
  }

  /**
   * Delete feature flag
   */
  async deleteFlag(key: string): Promise<void> {
    await FeatureFlag.destroy({ where: { key } });
  }

  /**
   * Simple hash function for percentage rollout
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
}
