import { Role } from '../../../database/models/shared/core/Role.model';
import { Permission } from '../../../database/models/public/Permission.model';
import { RolePermission } from '../../../database/models/shared/core/RolePermission.model';
import { UserRole } from '../../../database/models/shared/core/UserRole.model';
import { User } from '../../../database/models/shared/core/User.model';
import { RoleTemplate } from '../../../database/models/public/RoleTemplate.model';
import { RolePermissionCache } from '../../../core/cache/role-permission.cache';
import { getRedis } from '../../../config/redis';
import { Op } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../../core/utils/logger';

/**
 * Role Service - Handles role management for school tenants
 * 
 * Two-Tier Caching Architecture:
 * - Public/Readonly roles: Cached globally per-plan
 * - Custom roles: Cached per-tenant
 * 
 * Asset Types:
 * - 'public': Initial template roles (modify â†’ clone to custom)
 * - 'readonly': System roles (cannot modify)
 * - 'custom': Tenant-specific roles (modifiable)
 */
export class RoleService {

    /**
     * Validate that a role can be modified
     * Throws error if role is readonly
     */
    static async validateModifiable(roleId: string, schemaName: string): Promise<Role> {
        const role = await Role.schema(schemaName).findByPk(roleId);

        if (!role) {
            throw new Error('Role not found');
        }

        if (role.asset_type === 'readonly') {
            throw new Error('Cannot modify a readonly system role');
        }

        return role;
    }

    /**
     * Clone a public role to a custom role
     * 
     * IMPORTANT: This method NO LONGER auto-migrates users!
     * The original role remains active, and existing users keep their current role.
     * Admin must explicitly choose to migrate users using RoleAssignmentService.migrateUsersToNewDefault()
     * 
     * @param roleId - Original role ID to clone
     * @param schemaName - Tenant schema
     * @param options - Optional settings
     * @returns The new custom role
     */
    static async cloneToCustom(
        roleId: string,
        schemaName: string,
        options?: {
            migrateUsers?: boolean;  // Default: false (preserve existing assignments)
            newName?: string;        // Optional new name for cloned role
        }
    ): Promise<Role> {
        const originalRole = await Role.schema(schemaName).findByPk(roleId, {
            include: [{
                model: Permission,
                as: 'permissions',
                through: { attributes: [] }
            }],
        });

        if (!originalRole) {
            throw new Error('Role not found');
        }

        if (originalRole.asset_type === 'custom') {
            // Already custom, no need to clone
            return originalRole;
        }

        if (originalRole.asset_type === 'readonly') {
            throw new Error('Cannot clone a readonly system role');
        }

        // Generate unique slug for custom role
        const baseSlug = originalRole.slug || originalRole.name.toLowerCase().replace(/\s+/g, '-');
        const customSlug = `${baseSlug}-custom-${Date.now()}`;
        const customName = options?.newName || `${originalRole.name} (Custom)`;

        // Create custom copy
        const customRole = await Role.schema(schemaName).create({
            name: customName,
            slug: customSlug,
            description: originalRole.description
                ? `${originalRole.description} (Customized for this institution)`
                : `Customized version of ${originalRole.name}`,
            is_system: false,
            is_active: true,
            asset_type: 'custom',
            source_role_id: originalRole.id,
            plan_id: originalRole.plan_id,
        });

        // Copy permissions
        const originalPermissions = originalRole.get('permissions') as Permission[] | undefined;
        if (originalPermissions?.length) {
            const permissions = originalPermissions;
            const rolePermissions = permissions.map((p: Permission) => ({
                role_id: customRole.id,
                permission_id: p.id,
            }));
            await RolePermission.schema(schemaName).bulkCreate(rolePermissions);
        }

        // =========================================================================
        // CRITICAL CHANGE: DO NOT AUTO-MIGRATE USERS!
        // =========================================================================
        // Previously this code would update all users from original role to custom role:
        // await UserRole.schema(schemaName).update(
        //     { role_id: customRole.id },
        //     { where: { role_id: originalRole.id } }
        // );
        // 
        // This breaks tenant isolation when admin switches defaults!
        // Now users keep their original role until explicitly migrated.
        // =========================================================================

        // KEEP original role active (don't hide it)
        // The original role remains available for users who were assigned to it
        // Previously we were marking it inactive which would break existing assignments

        logger.info(`[RoleService] Cloned public role '${originalRole.name}' to custom '${customName}' in ${schemaName}`);
        logger.info(`[RoleService] Original role '${originalRole.name}' remains active with existing user assignments`);

        // Invalidate cache for the new custom role
        await RolePermissionCache.invalidateTenantRole(schemaName, customRole.slug || customRole.name.toLowerCase());

        return customRole;
    }

    /**
     * Refresh public roles from role templates
     * - Creates new roles from templates that don't exist in tenant
     * - Updates existing public/initial roles with latest permissions
     * - Preserves custom roles - only updates public/initial roles
     */
    static async refreshFromTemplates(schemaName: string, planId?: string, tenantType: string = 'all'): Promise<{ refreshed: number; created: number; skipped: number; errors: string[] }> {
        const result = { refreshed: 0, created: 0, skipped: 0, errors: [] as string[] };

        logger.info(`[RoleService] refreshFromTemplates called:`, { schemaName, planId, tenantType });

        // Build where clause - be lenient to include as many templates as possible
        const whereClause: Record<PropertyKey, unknown> = { is_active: true };

        // Include templates for this tenant type OR 'all'
        // If tenantType is null/undefined, get all templates
        if (tenantType && tenantType !== 'all') {
            whereClause.tenant_type = { [Op.in]: [tenantType, 'all'] };
        }
        // Note: We don't filter by tenant_type if it's 'all' - get all templates

        // For plan_id, include templates for this plan OR null (global templates)
        // If planId is not provided, only get global templates (plan_id is null)
        if (planId) {
            whereClause[Op.or] = [
                { plan_id: planId },
                { plan_id: null }
            ];
        }
        // Note: If no planId, we don't add any plan filter - get all templates regardless of plan

        logger.info(`[RoleService] Template query whereClause:`, JSON.stringify(whereClause, null, 2));

        const templates = await RoleTemplate.findAll({ where: whereClause });
        logger.info(`[RoleService] Found ${templates.length} templates to process for ${schemaName}`);
        templates.forEach((t) => {
            logger.info(`  - Template: ${t.name} (slug: ${t.slug}, tenant_type: ${t.tenant_type}, plan_id: ${t.plan_id})`);
        });

        for (const template of templates) {
            try {
                // Find existing role by slug or name
                let role = await Role.schema(schemaName).findOne({
                    where: {
                        [Op.or]: [
                            { slug: template.slug },
                            { name: template.name }
                        ]
                    }
                });

                if (!role) {
                    // Template has no corresponding role in tenant - CREATE IT
                    logger.info(`[RoleService] Creating new role '${template.name}' from template in ${schemaName}`);

                    role = await Role.schema(schemaName).create({
                        name: template.name,
                        slug: template.slug,
                        description: template.description,
                        is_system: template.is_system,
                        is_active: true,
                        asset_type: template.asset_type || 'public',
                        plan_id: template.plan_id || planId,
                    });

                    // Add permissions from template
                    if (template.permission_ids?.length > 0) {
                        const rolePermissions = template.permission_ids.map((permissionId: string) => ({
                            role_id: role!.id,
                            permission_id: permissionId,
                        }));
                        await RolePermission.schema(schemaName).bulkCreate(rolePermissions);
                    }

                    result.created++;
                    logger.info(`[RoleService] Created role '${template.name}' with ${template.permission_ids?.length || 0} permissions in ${schemaName}`);
                    continue;
                }

                // Only refresh public/initial roles, not custom
                if (role.asset_type === 'custom') {
                    logger.info(`[RoleService] Skipping custom role '${role.name}' in ${schemaName}`);
                    result.skipped++;
                    continue;
                }

                // Update role permissions from template
                await RolePermission.schema(schemaName).destroy({ where: { role_id: role.id } });

                if (template.permission_ids?.length > 0) {
                    const rolePermissions = template.permission_ids.map((permissionId: string) => ({
                        role_id: role.id,
                        permission_id: permissionId,
                    }));
                    await RolePermission.schema(schemaName).bulkCreate(rolePermissions);
                }

                // Update role metadata
                await Role.schema(schemaName).update({
                    description: template.description,
                    asset_type: template.asset_type || 'public',
                    plan_id: template.plan_id || planId,
                }, { where: { id: role.id } });

                // Invalidate cache
                if (role.asset_type === 'public' && role.plan_id) {
                    await RolePermissionCache.invalidatePlanRole(role.plan_id, role.slug || role.name.toLowerCase());
                } else {
                    await RolePermissionCache.invalidateTenantRole(schemaName, role.slug || role.name.toLowerCase());
                }

                result.refreshed++;
                logger.info(`[RoleService] Refreshed role '${role.name}' from template in ${schemaName}`);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                result.errors.push(`${template.name}: ${errorMessage}`);
                logger.error(`[RoleService] Error processing template '${template.name}':`, errorMessage);
            }
        }

        return result;
    }

    /**
     * Get all roles for the tenant
     */
    static async findAll(schemaName: string, options?: { includePermissions?: boolean; includeInactive?: boolean }) {
        const include = options?.includePermissions
            ? [{ model: Permission, as: 'permissions', through: { attributes: [] } }]
            : [];

        const where: Record<string, unknown> = {};
        if (!options?.includeInactive) {
            where.is_active = true;
        }

        return Role.schema(schemaName).findAll({
            where,
            include,
            order: [['name', 'ASC']],
        });
    }

    /**
     * Get role by ID
     */
    static async findById(id: string, schemaName: string, options?: { includePermissions?: boolean }) {
        const include = options?.includePermissions
            ? [{ model: Permission, as: 'permissions', through: { attributes: [] } }]
            : [];

        return Role.schema(schemaName).findByPk(id, { include });
    }

    /**
     * Get role by name
     */
    static async findByName(name: string, schemaName: string) {
        return Role.schema(schemaName).findOne({ where: { name } });
    }

    /**
     * Create a new role (always created as custom)
     */
    static async create(data: { name: string; description?: string; asset_type?: string }, schemaName: string) {
        // Check for duplicate name
        const existing = await this.findByName(data.name, schemaName);
        if (existing) {
            throw new Error(`Role with name "${data.name}" already exists`);
        }

        // New roles are always custom (tenant-created)
        return Role.schema(schemaName).create({
            ...data,
            asset_type: data.asset_type || 'custom',
            slug: data.name.toLowerCase().replace(/\s+/g, '-'),
        });
    }

    /**
     * Update a role
     * If role is public â†’ clone to custom first
     * If role is readonly â†’ throw error
     */
    static async update(id: string, data: { name?: string; description?: string }, schemaName: string) {
        let role = await this.validateModifiable(id, schemaName);

        // If public, clone to custom first
        if (role.asset_type === 'public') {
            role = await this.cloneToCustom(id, schemaName);
            id = role.id; // Use cloned role ID
        }

        // Check for duplicate name if name is being changed
        if (data.name && data.name !== role.name) {
            const existing = await this.findByName(data.name, schemaName);
            if (existing) {
                throw new Error(`Role with name "${data.name}" already exists`);
            }
        }

        await Role.schema(schemaName).update(data, { where: { id } });

        // Invalidate cache
        await RolePermissionCache.invalidateTenantRole(schemaName, role.slug || role.name.toLowerCase());

        return this.findById(id, schemaName);
    }

    /**
     * Delete a role (soft validation - check if users are assigned)
     */
    static async delete(id: string, schemaName: string) {
        const role = await this.validateModifiable(id, schemaName);

        if (role.is_system) {
            throw new Error('Cannot delete system role');
        }

        // Check if users are assigned to this role
        const userCount = await UserRole.schema(schemaName).count({ where: { role_id: id } });
        if (userCount > 0) {
            throw new Error(`Cannot delete role. ${userCount} user(s) are assigned to this role.`);
        }

        // Remove role permissions first
        await RolePermission.schema(schemaName).destroy({ where: { role_id: id } });

        // Delete the role
        await Role.schema(schemaName).destroy({ where: { id } });

        // Invalidate cache
        await RolePermissionCache.invalidateTenantRole(schemaName, role.slug || role.name.toLowerCase());

        return { deleted: true };
    }

    /**
     * Assign permissions to a role
     * If role is public â†’ clone to custom first
     * If role is readonly â†’ throw error
     */
    static async assignPermissions(roleId: string, permissionIds: string[], schemaName: string) {
        let role = await this.validateModifiable(roleId, schemaName);

        // If public, clone to custom first
        if (role.asset_type === 'public') {
            role = await this.cloneToCustom(roleId, schemaName);
            roleId = role.id; // Use cloned role ID
        }

        // Validate all permission IDs exist
        const permissions = await Permission.findAll({
            where: { id: { [Op.in]: permissionIds } },
        });

        if (permissions.length !== permissionIds.length) {
            throw new Error('One or more permission IDs are invalid');
        }

        // Remove existing permissions
        await RolePermission.schema(schemaName).destroy({ where: { role_id: roleId } });

        // Add new permissions 
        const rolePermissions = permissionIds.map(permissionId => ({
            role_id: roleId,
            permission_id: permissionId,
        }));

        await RolePermission.schema(schemaName).bulkCreate(rolePermissions);

        // Invalidate cache
        await RolePermissionCache.invalidateTenantRole(schemaName, role.slug || role.name.toLowerCase());

        return this.findById(roleId, schemaName, { includePermissions: true });
    }

    /**
     * Get users with a specific role
     */
    static async getUsersWithRole(roleId: string, schemaName: string) {
        const userRoles = await UserRole.schema(schemaName).findAll({
            where: { role_id: roleId },
            include: [{ model: User.schema(schemaName), as: 'user' }],
        });

        return userRoles.map((ur) => ur.get('user') as User);
    }

    /**
     * Invalidate RBAC cache for a user
     * CRITICAL: Must be called whenever user's roles change
     */
    private static async invalidateUserRBACCache(userId: string, tenantId: string): Promise<void> {
        try {
            const redis = getRedis();
            // Invalidate all RBAC cache entries for this user in this tenant
            // Pattern: rbac:v1:{tenantId}:{userId}
            const pattern = `rbac:v1:${tenantId}:${userId}*`;
            let cursor = '0';
            do {
                const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                cursor = nextCursor;
                if (keys.length > 0) {
                    await redis.del(...keys);
                }
            } while (cursor !== '0');
            
            logger.info(`[RoleService] Invalidated RBAC cache for user ${userId} in tenant ${tenantId}`);
        } catch (err) {
            // Log but don't throw - cache invalidation failure shouldn't break the operation
            logger.error('[RoleService] Failed to invalidate RBAC cache:', err);
        }
    }

    /**
     * Assign role to user
     * PRODUCTION HARDENED: Invalidates RBAC cache after assignment
     */
    static async assignRoleToUser(
        userId: string,
        roleId: string,
        schemaName: string,
        institutionId?: string,
        assignedBy?: string,
        tenantId?: string  // Required for cache invalidation
    ) {
        // Check if already assigned
        const existing = await UserRole.schema(schemaName).findOne({
            where: { user_id: userId, role_id: roleId },
        });

        if (existing) {
            throw new Error('User already has this role');
        }

        const assignment = await UserRole.schema(schemaName).create({
            user_id: userId,
            role_id: roleId,
            institution_id: institutionId,
            assigned_by: assignedBy,
        });

        // CRITICAL: Invalidate RBAC cache so new permissions take effect immediately
        if (tenantId) {
            await this.invalidateUserRBACCache(userId, tenantId);
        }

        return assignment;
    }

    /**
     * Remove role from user
     * PRODUCTION HARDENED: Invalidates RBAC cache after removal
     */
    static async removeRoleFromUser(userId: string, roleId: string, schemaName: string, tenantId?: string) {
        const deleted = await UserRole.schema(schemaName).destroy({
            where: { user_id: userId, role_id: roleId },
        });

        if (deleted === 0) {
            throw new Error('User does not have this role');
        }

        // CRITICAL: Invalidate RBAC cache so removed permissions take effect immediately
        if (tenantId) {
            await this.invalidateUserRBACCache(userId, tenantId);
        }

        return { removed: true };
    }

    /**
     * Get all roles for a user
     */
    static async getUserRoles(userId: string, schemaName: string) {
        const userRoles = await UserRole.schema(schemaName).findAll({
            where: { user_id: userId },
        });

        const roleIds = userRoles.map((ur) => ur.get('role_id') as string);

        return Role.schema(schemaName).findAll({
            where: { id: { [Op.in]: roleIds } },
            include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }],
        });
    }
}

export default RoleService;
