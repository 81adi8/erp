/**
 * Role Permission Cache
 * 
 * Two-Tier Caching Strategy:
 * 
 * 1. PLAN-SCOPED CACHE (Global):
 *    - For roles with asset_type: 'public' or 'readonly'
 *    - These are initial/system roles created by super_admin
 *    - Cached at: plan:{planId}:role:{roleSlug}:permissions
 *    - Shared across all tenants with the same plan
 * 
 * 2. TENANT-SCOPED CACHE (Isolated):
 *    - For roles with asset_type: 'custom'
 *    - These are tenant-specific roles or modified copies
 *    - Cached at: tenant:{tenantId}:role:{roleSlug}:permissions
 *    - Isolated per tenant
 * 
 * Flow:
 *   1. Middleware requests permissions for user's roles
 *   2. Cache checks role's asset_type to determine cache tier
 *   3. Returns permissions from appropriate cache (or loads from DB)
 *   4. On permission change, invalidates correct cache tier
 */

import { CacheService } from './cache.service';
import { CacheKeys, CacheTTL } from './cache.keys';
import { Role } from '../../database/models/shared/core/Role.model';
import { RolePermission } from '../../database/models/shared/core/RolePermission.model';
import { Permission as PublicPermission } from '../../database/models/public/Permission.model';
import { logger } from '../utils/logger';

interface RoleWithAssetType {
    id: string;
    name: string;
    slug?: string;
    asset_type?: string;
    plan_id?: string;
    is_active?: boolean;
}

export class RolePermissionCache {
    /**
     * Get permissions for a list of role names in a tenant
     * This is the main method used by authorization middleware
     * 
     * @param tenantId - Tenant identifier (schema name)
     * @param roleNames - Array of role names from JWT (e.g., ['Student', 'Parent'])
     * @param planId - Optional plan ID for plan-scoped caching
     * @returns Array of permission keys (e.g., ['academic.students.view', 'finance.fees.view'])
     */
    static async getPermissionsForRoles(
        tenantId: string,
        roleNames: string[],
        planId?: string
    ): Promise<string[]> {
        if (!roleNames || roleNames.length === 0) {
            return [];
        }

        const allPermissions: Set<string> = new Set();

        for (const roleName of roleNames) {
            const permissions = await this.getPermissionsForRole(tenantId, roleName, planId);
            permissions.forEach(p => allPermissions.add(p));
        }

        return [...allPermissions];
    }

    /**
     * Get permissions for a single role in a tenant
     * Uses two-tier caching based on role's asset_type
     */
    static async getPermissionsForRole(
        tenantId: string,
        roleName: string,
        planId?: string
    ): Promise<string[]> {
        // First, get the role to determine its asset_type
        const role = await this.findRoleByName(tenantId, roleName);

        if (!role) {
            logger.warn(`[RolePermissionCache] Role '${roleName}' not found in ${tenantId}`);
            return [];
        }

        // Determine cache tier based on asset_type
        const assetType = role.asset_type || 'public';
        const roleSlug = role.slug || role.name.toLowerCase().replace(/\s+/g, '-');
        const rolePlanId = role.plan_id || planId;

        if (assetType === 'custom') {
            // TENANT-SCOPED CACHE: Custom roles are isolated per tenant
            return this.getFromTenantCache(tenantId, roleSlug, role.id);
        } else {
            // PLAN-SCOPED CACHE: Public/readonly roles are cached globally per plan
            if (!rolePlanId) {
                logger.warn(`[RolePermissionCache] No plan_id for public role '${roleName}' in ${tenantId}, falling back to tenant cache`);
                return this.getFromTenantCache(tenantId, roleSlug, role.id);
            }
            return this.getFromPlanCache(rolePlanId, roleSlug, role.id, tenantId);
        }
    }

    /**
     * Get permissions from tenant-scoped cache (for custom roles)
     */
    private static async getFromTenantCache(
        tenantId: string,
        roleSlug: string,
        roleId: string
    ): Promise<string[]> {
        const cacheKey = CacheKeys.TENANT_ROLE_PERMISSIONS(tenantId, roleSlug);

        // Check cache first
        const cached = await CacheService.get<string[]>(cacheKey);
        if (cached) {
            return cached;
        }

        // Load from database
        const permissions = await this.loadRolePermissionsFromDB(tenantId, roleId);

        // Cache for future use
        await CacheService.set(cacheKey, permissions, CacheTTL.PERMISSION_CONFIG);

        logger.info(`[RolePermissionCache] Cached ${permissions.length} permissions for tenant role ${tenantId}:${roleSlug}`);
        return permissions;
    }

    /**
     * Get permissions from plan-scoped cache (for public/readonly roles)
     */
    private static async getFromPlanCache(
        planId: string,
        roleSlug: string,
        roleId: string,
        tenantId: string
    ): Promise<string[]> {
        const cacheKey = CacheKeys.PLAN_ROLE_PERMISSIONS(planId, roleSlug);

        // Check cache first
        const cached = await CacheService.get<string[]>(cacheKey);
        if (cached) {
            return cached;
        }

        // Load from database (using tenant schema for role_permissions)
        const permissions = await this.loadRolePermissionsFromDB(tenantId, roleId);

        // Cache globally for plan
        await CacheService.set(cacheKey, permissions, CacheTTL.PERMISSION_CONFIG);

        logger.info(`[RolePermissionCache] Cached ${permissions.length} permissions for plan role ${planId}:${roleSlug}`);
        return permissions;
    }

    /**
     * Find role by name in tenant schema
     */
    private static async findRoleByName(
        schemaName: string,
        roleName: string
    ): Promise<RoleWithAssetType | null> {
        try {
            const { Sequelize } = require('sequelize');

            const role = await Role.schema(schemaName).findOne({
                where: Sequelize.where(
                    Sequelize.fn('lower', Sequelize.col('name')),
                    roleName.toLowerCase().trim()
                ),
                attributes: ['id', 'name', 'slug', 'asset_type', 'plan_id', 'is_active'],
            });

            return role as RoleWithAssetType | null;
        } catch (error) {
            logger.error(`[RolePermissionCache] Error finding role '${roleName}':`, error);
            return null;
        }
    }

    /**
     * Load role permissions from tenant database
     * Joins role_permissions → permissions to get permission keys
     */
    private static async loadRolePermissionsFromDB(
        schemaName: string,
        roleId: string
    ): Promise<string[]> {
        try {
            // Get all permission IDs for this role from junction table
            const rolePermissions = await RolePermission.schema(schemaName).findAll({
                where: { role_id: roleId },
                attributes: ['permission_id'],
            });

            if (!rolePermissions || rolePermissions.length === 0) {
                logger.info(`[RolePermissionCache] No permissions for role ID '${roleId}' in ${schemaName}`);
                return [];
            }

            // Get permission keys from public schema
            const permissionIds = rolePermissions.map(rp => rp.permission_id);
            const permissions = await PublicPermission.findAll({
                where: { id: permissionIds, is_active: true },
                attributes: ['key'],
            });

            const permissionKeys = permissions.map(p => p.key);
            return permissionKeys;
        } catch (error) {
            logger.error(`[RolePermissionCache] Error loading permissions for role ID '${roleId}':`, error);
            return [];
        }
    }

    /**
     * Load all role permissions for a tenant (bulk load)
     * Used on first request or after cache invalidation
     */
    static async loadForTenant(tenantId: string, schemaName: string, planId?: string): Promise<void> {
        try {
            logger.info(`[RolePermissionCache] Loading all roles for tenant ${tenantId}`);

            // Get all roles in this tenant
            const roles = await Role.schema(schemaName).findAll({
                attributes: ['id', 'name', 'slug', 'asset_type', 'plan_id'],
            });

            // Pre-load permissions for each role
            for (const role of roles) {
                await this.getPermissionsForRole(tenantId, role.name, planId);
            }

            logger.info(`[RolePermissionCache] Loaded ${roles.length} roles for tenant ${tenantId}`);
        } catch (error) {
            logger.error(`[RolePermissionCache] Error loading tenant ${tenantId}:`, error);
        }
    }

    /**
     * Invalidate cache for a specific role in a tenant (custom roles)
     * Call this when role permissions are updated
     */
    static async invalidateTenantRole(tenantId: string, roleSlug: string): Promise<void> {
        const cacheKey = CacheKeys.TENANT_ROLE_PERMISSIONS(tenantId, roleSlug);
        await CacheService.del(cacheKey);
        logger.info(`[RolePermissionCache] Invalidated tenant cache for ${tenantId}:${roleSlug}`);
    }

    /**
     * Invalidate cache for a plan-scoped role (public/readonly roles)
     * Call this when super_admin modifies initial role permissions
     */
    static async invalidatePlanRole(planId: string, roleSlug: string): Promise<void> {
        const cacheKey = CacheKeys.PLAN_ROLE_PERMISSIONS(planId, roleSlug);
        await CacheService.del(cacheKey);
        logger.info(`[RolePermissionCache] Invalidated plan cache for ${planId}:${roleSlug}`);
    }

    /**
     * Invalidate all role caches for a tenant (custom roles only)
     * Call this when bulk permission changes occur
     */
    static async invalidateTenant(tenantId: string): Promise<void> {
        const pattern = `tenant:${tenantId}:role:*:permissions`;
        await CacheService.delPattern(pattern);
        logger.info(`[RolePermissionCache] Invalidated all tenant role caches for ${tenantId}`);
    }

    /**
     * Invalidate all role caches for a plan (public/readonly roles)
     * Call this when super_admin updates plan's role configurations
     */
    static async invalidatePlan(planId: string): Promise<void> {
        const pattern = `plan:${planId}:role:*:permissions`;
        await CacheService.delPattern(pattern);
        logger.info(`[RolePermissionCache] Invalidated all plan role caches for ${planId}`);
    }

    /**
     * Check if a specific permission is granted by the roles
     */
    static async hasPermission(
        tenantId: string,
        roleNames: string[],
        permissionKey: string,
        planId?: string
    ): Promise<boolean> {
        const permissions = await this.getPermissionsForRoles(tenantId, roleNames, planId);
        return permissions.includes(permissionKey);
    }

    /**
     * Legacy method - kept for backwards compatibility
     * @deprecated Use invalidateTenantRole instead
     */
    static async invalidateRole(tenantId: string, roleName: string): Promise<void> {
        const roleSlug = roleName.toLowerCase().replace(/\s+/g, '-');
        await this.invalidateTenantRole(tenantId, roleSlug);
    }
}

export default RolePermissionCache;

