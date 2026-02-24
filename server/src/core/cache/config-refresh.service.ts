/**
 * Config Refresh Service
 * 
 * Handles cache invalidation and refresh operations.
 * Called on:
 * - Admin permission config update
 * - Manual refresh via admin endpoint
 * - Server restart (automatic via PermissionConfigCache.initialize)
 */

import { PermissionConfigCache } from './permission-config.cache';
import { CacheService } from './cache.service';
import { CachePatterns } from './cache.keys';
import { logger } from '../utils/logger';

export class ConfigRefreshService {
    /**
     * Refresh all permission-related caches
     * Call this when admin updates permissions, scopes, or role configs
     */
    static async refreshPermissionConfig(): Promise<void> {
        logger.info('[ConfigRefresh] Refreshing permission config...');
        await PermissionConfigCache.refresh();
        logger.info('[ConfigRefresh] Permission config refreshed');
    }

    /**
     * Invalidate tenant caches (for specific tenant or all)
     * Call this when tenant settings are updated
     */
    static async invalidateTenantCache(tenantId?: string): Promise<void> {
        if (tenantId) {
            // Invalidate specific tenant
            await CacheService.del(`tenant:id:${tenantId}`);
            await CacheService.delPattern(`tenant:*:${tenantId}`);
        } else {
            // Invalidate all tenant caches
            await CacheService.delPattern(CachePatterns.ALL_TENANT);
        }
        logger.info(`[ConfigRefresh] Tenant cache invalidated: ${tenantId || 'all'}`);
    }

    /**
     * Clear all config caches (nuclear option)
     * Use with caution - forces reload of everything
     */
    static async clearAllConfigs(): Promise<void> {
        logger.info('[ConfigRefresh] Clearing all config caches...');
        await CacheService.delPattern(CachePatterns.ALL_CONFIG);
        await PermissionConfigCache.refresh();
        logger.info('[ConfigRefresh] All configs cleared and reloaded');
    }

    /**
     * Get cache health status
     */
    static async getStatus(): Promise<{
        permissionCacheSize: number;
        availableScopes: string[];
    }> {
        return {
            permissionCacheSize: PermissionConfigCache.getAllPermissionKeys().length,
            availableScopes: PermissionConfigCache.getAvailableScopes(),
        };
    }
}

export default ConfigRefreshService;
