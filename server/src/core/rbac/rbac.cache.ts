/**
 * RBAC Cache Layer
 * 
 * Provides caching for RBAC contexts to improve performance.
 * Uses Redis for distributed caching.
 * 
 * SECURITY (TASK-02 HARDENING):
 * - Cache key MUST include tenant + user + roleVersion
 * - Cross-tenant cache bleed detection enabled
 * - No schema-only or user-only keys allowed
 * 
 * Cache Key Format: rbac:{version}:{tenantId}:{userId}:{roleVersion}[:institutionId]
 * TTL: 600 seconds (10 minutes) default
 */

import { Redis } from 'ioredis';
import { RBACContext, RBACCacheKey, RBACCacheEntry } from './rbac.types';
import { 
  RBAC_CACHE_PREFIX, 
  RBAC_CACHE_VERSION, 
  RBAC_CACHE_TTL_DEFAULT 
} from './rbac.types';
import { TenantShadowTelemetry } from '../tenant/tenant-shadow.telemetry';
import { logger } from '../utils/logger';

export class RBACCache {
  
  constructor(private redis: Redis) {}

  /**
   * Build cache key from components
   */
  private buildKey(key: RBACCacheKey): string {
    const parts = [
      RBAC_CACHE_PREFIX,
      RBAC_CACHE_VERSION,
      key.tenantId,
      key.userId
    ];
    
    if (key.institutionId) {
      parts.push(key.institutionId);
    }
    
    return parts.join(':');
  }

  /**
   * Parse cache key to components
   */
  private parseKey(keyString: string): RBACCacheKey | null {
    const parts = keyString.split(':');
    
    // Minimum: rbac:v1:{tenantId}:{userId}
    if (parts.length < 4) return null;
    
    return {
      tenantId: parts[2]!,
      userId: parts[3]!,
      institutionId: parts[4]
    };
  }

  /**
   * Get RBAC context from cache
   * 
   * SECURITY: Validates tenant isolation on every cache hit
   */
  async getContext(key: RBACCacheKey): Promise<RBACContext | null> {
    try {
      // Debug: check Redis connection state
      const redisStatus = this.redis.status || 'unknown';
      if (redisStatus !== 'ready') {
        logger.warn('[RBACCache] Redis status:', redisStatus);
      }
      
      const cacheKey = this.buildKey(key);
      const data = await this.redis.get(cacheKey);
      
      if (!data) {
        return null;
      }
      
      const parsed = JSON.parse(data);
      const entry: RBACCacheEntry = {
          ...parsed,
          cachedAt: new Date(parsed.cachedAt)
      };
      
      // Check if expired (additional safety)
      const now = new Date();
      const expiresAt = new Date(entry.cachedAt.getTime() + entry.ttl * 1000);
      
      if (now > expiresAt) {
        await this.deleteContext(key);
        return null;
      }
      
      // ============================================================
      // SECURITY: Cross-tenant cache bleed detection
      // ============================================================
      if (entry.context.tenantId !== key.tenantId) {
        TenantShadowTelemetry.rbacCacheCrossTenant({
          expected_tenant: key.tenantId,
          cached_tenant: entry.context.tenantId,
          user_id: key.userId,
          action: 'cache_bleed_blocked'
        });
        // Delete corrupted cache entry
        await this.deleteContext(key);
        return null;
      }
      
      if (entry.context.userId !== key.userId) {
        TenantShadowTelemetry.rbacCacheCrossTenant({
          expected_user: key.userId,
          cached_user: entry.context.userId,
          tenant_id: key.tenantId,
          action: 'user_mismatch_blocked'
        });
        await this.deleteContext(key);
        return null;
      }
      
      return entry.context;
    } catch (error) {
      logger.error('[RBACCache] Error reading from cache:', error);
      return null;
    }
  }

  /**
   * Store RBAC context in cache
   */
  async setContext(
    key: RBACCacheKey, 
    context: RBACContext, 
    ttl: number = RBAC_CACHE_TTL_DEFAULT
  ): Promise<void> {
    try {
      const cacheKey = this.buildKey(key);
      
      const entry: RBACCacheEntry = {
        context,
        cachedAt: new Date(),
        ttl,
        version: RBAC_CACHE_VERSION
      };
      
      await this.redis.set(
        cacheKey,
        JSON.stringify(entry),
        "EX",
        ttl,
      );
    } catch (error) {
      logger.error('[RBACCache] Error writing to cache:', error);
      // Don't throw - cache failure shouldn't break auth
    }
  }

  /**
   * Delete RBAC context from cache
   */
  async deleteContext(key: RBACCacheKey): Promise<void> {
    try {
      const cacheKey = this.buildKey(key);
      await this.redis.del(cacheKey);
    } catch (error) {
      logger.error('[RBACCache] Error deleting from cache:', error);
    }
  }

  /**
   * SCAN-based key collector — safe for production (never blocks Redis).
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const collected: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      collected.push(...keys);
    } while (cursor !== '0');
    return collected;
  }

  /**
   * Invalidate all RBAC contexts for a user
   */
  async invalidateUser(userId: string): Promise<void> {
    try {
      const pattern = `${RBAC_CACHE_PREFIX}:${RBAC_CACHE_VERSION}:*:${userId}*`;
      const keys = await this.scanKeys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      logger.error('[RBACCache] Error invalidating user:', error);
    }
  }

  /**
   * Invalidate all RBAC contexts for a tenant
   */
  async invalidateTenant(tenantId: string): Promise<void> {
    try {
      const pattern = `${RBAC_CACHE_PREFIX}:${RBAC_CACHE_VERSION}:${tenantId}:*`;
      const keys = await this.scanKeys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      logger.error('[RBACCache] Error invalidating tenant:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
  }> {
    try {
      const pattern = `${RBAC_CACHE_PREFIX}:${RBAC_CACHE_VERSION}:*`;
      const keys = await this.scanKeys(pattern);

      // Get memory info
      const info = await this.redis.info('memory');
      const usedMemory = info.match(/used_memory_human:(.+)/)?.[1]?.trim() ?? 'unknown';

      return {
        totalKeys: keys.length,
        memoryUsage: usedMemory,
      };
    } catch (error) {
      logger.error('[RBACCache] Error getting stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: 'unknown',
      };
    }
  }

  /**
   * Check if context exists in cache
   */
  async exists(key: RBACCacheKey): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(key);
      const exists = await this.redis.exists(cacheKey);
      return exists === 1;
    } catch (error) {
      logger.error('[RBACCache] Error checking existence:', error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async getTTL(key: RBACCacheKey): Promise<number> {
    try {
      const cacheKey = this.buildKey(key);
      return await this.redis.ttl(cacheKey);
    } catch (error) {
      logger.error('[RBACCache] Error getting TTL:', error);
      return -1;
    }
  }

  /**
   * Update TTL for existing key
   */
  async updateTTL(key: RBACCacheKey, ttl: number): Promise<void> {
    try {
      const cacheKey = this.buildKey(key);
      await this.redis.expire(cacheKey, ttl);
    } catch (error) {
      logger.error('[RBACCache] Error updating TTL:', error);
    }
  }
}

export default RBACCache;

