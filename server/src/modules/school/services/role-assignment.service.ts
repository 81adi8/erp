import { Role } from '../../../database/models/shared/core/Role.model';
import { UserRole, RoleAssignmentType } from '../../../database/models/shared/core/UserRole.model';
import { TenantRoleConfig } from '../../../database/models/shared/core/TenantRoleConfig.model';
import { User } from '../../../database/models/shared/core/User.model';
import { RolePermissionCache } from '../../../core/cache/role-permission.cache';
import { CacheService } from '../../../core/cache/cache.service';
import { CacheKeys, CacheTTL, CachePatterns } from '../../../core/cache/cache.keys';
import { Op, Transaction } from 'sequelize';
import { sequelize } from '../../../database/sequelize';
import { logger } from '../../../core/utils/logger';

/**
 * Role Assignment Service
 * 
 * Handles role assignments with proper tenant isolation and caching strategy.
 * 
 * KEY PRINCIPLES:
 * 1. System roles use plan-scoped caching (shared across tenants)
 * 2. Custom roles use tenant-scoped caching (isolated per tenant)
 * 3. When admin switches defaults, existing users keep their roles
 * 4. Assignment type tracks how role was assigned for proper isolation
 * 
 * CACHING STRATEGY:
 * - System/Public roles: plan:{planId}:role:{slug}:permissions
 * - Custom roles: tenant:{tenantId}:role:{slug}:permissions
 * - Role configs: tenant:{tenantId}:role-config:{userType}
 */
export class RoleAssignmentService {

    // =========================================================================
    // DEFAULT ROLE CONFIGURATION
    // =========================================================================

    /**
     * Get the default role configuration for a user type
     * Returns cached config if available, otherwise queries DB
     */
    static async getDefaultRoleConfig(
        schemaName: string,
        userType: string
    ): Promise<TenantRoleConfig | null> {
        const cacheKey = CacheKeys.TENANT_ROLE_CONFIG(schemaName, userType);

        // Check cache first
        const cached = await CacheService.get<TenantRoleConfig>(cacheKey);
        if (cached) {
            return cached;
        }

        // Query database
        const config = await TenantRoleConfig.schema(schemaName).findOne({
            where: { user_type: userType },
            include: [{ model: Role.schema(schemaName), as: 'defaultRole' }]
        });

        if (config) {
            // Cache the config
            await CacheService.set(cacheKey, config.toJSON(), CacheTTL.TENANT_ROLE_CONFIG);
        }

        return config;
    }

    /**
     * Get all default role configurations for a tenant
     */
    static async getAllDefaultRoleConfigs(schemaName: string): Promise<TenantRoleConfig[]> {
        const cacheKey = CacheKeys.TENANT_ALL_ROLE_CONFIGS(schemaName);

        const cached = await CacheService.get<TenantRoleConfig[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const configs = await TenantRoleConfig.schema(schemaName).findAll({
            include: [{ model: Role.schema(schemaName), as: 'defaultRole' }],
            order: [['user_type', 'ASC']]
        });

        const configsJson = configs.map(c => c.toJSON());
        await CacheService.set(cacheKey, configsJson, CacheTTL.TENANT_ROLE_CONFIG);

        return configs;
    }

    /**
     * Set or update the default role for a user type
     * 
     * IMPORTANT: This does NOT migrate existing users!
     * Only new users will get the new default role.
     * Existing users retain their current role assignment.
     * 
     * @param schemaName - Tenant schema
     * @param userType - User type (student, teacher, etc.)
     * @param roleId - New default role ID
     * @param changedBy - User ID who made the change
     * @param planId - Plan ID (for cache key if system role)
     */
    static async setDefaultRole(
        schemaName: string,
        userType: string,
        roleId: string,
        changedBy?: string,
        planId?: string
    ): Promise<{ config: TenantRoleConfig; previousRoleId?: string; affectedUsers: number }> {
        const transaction = await sequelize.transaction();

        try {
            // 1. Get the new role and validate it exists
            const newRole = await Role.schema(schemaName).findByPk(roleId, { transaction });
            if (!newRole) {
                throw new Error(`Role with ID ${roleId} not found`);
            }

            const isSystemRole = newRole.asset_type === 'public' || newRole.asset_type === 'readonly';
            const roleSlug = newRole.slug || newRole.name.toLowerCase().replace(/\s+/g, '-');
            const rolePlanId = newRole.plan_id || planId;

            // 2. Find existing config or create new one
            let config = await TenantRoleConfig.schema(schemaName).findOne({
                where: { user_type: userType },
                transaction
            });

            const previousRoleId = config?.default_role_id;

            if (config) {
                // Update existing config
                await config.update({
                    previous_role_id: previousRoleId,
                    default_role_id: roleId,
                    is_system_role: isSystemRole,
                    role_slug: roleSlug,
                    plan_id: rolePlanId,
                    last_changed_at: new Date(),
                    changed_by: changedBy,
                }, { transaction });
            } else {
                // Create new config
                config = await TenantRoleConfig.schema(schemaName).create({
                    user_type: userType,
                    default_role_id: roleId,
                    is_system_role: isSystemRole,
                    role_slug: roleSlug,
                    plan_id: rolePlanId,
                    last_changed_at: new Date(),
                    changed_by: changedBy,
                }, { transaction });
            }

            // 3. IMPORTANT: DO NOT migrate existing users!
            // This is the key difference from the old cloneToCustom behavior
            // Only count how many users would be affected for informational purposes
            const affectedUsers = await UserRole.schema(schemaName).count({
                where: {
                    role_id: previousRoleId,
                    assignment_type: { [Op.in]: ['system_default', 'custom_default'] }
                },
                transaction
            });

            await transaction.commit();

            // 4. Invalidate caches
            await this.invalidateRoleConfigCache(schemaName, userType);

            logger.info(`[RoleAssignmentService] Default role for '${userType}' changed from ${previousRoleId} to ${roleId} in ${schemaName}. ${affectedUsers} users retain their previous role.`);

            return {
                config,
                previousRoleId,
                affectedUsers
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Migrate users from old default to new default (optional, explicit action)
     * 
     * This should only be called when admin explicitly chooses to migrate users.
     * It will update all users with the old role (assigned as default) to the new role.
     */
    static async migrateUsersToNewDefault(
        schemaName: string,
        userType: string,
        oldRoleId: string,
        newRoleId: string,
        migratedBy?: string
    ): Promise<{ migratedCount: number }> {
        const transaction = await sequelize.transaction();

        try {
            // Get the new role to determine assignment type
            const newRole = await Role.schema(schemaName).findByPk(newRoleId, { transaction });
            if (!newRole) {
                throw new Error(`New role with ID ${newRoleId} not found`);
            }

            const newAssignmentType: RoleAssignmentType =
                newRole.asset_type === 'custom' ? 'custom_default' : 'system_default';

            // Update user role assignments (only those that were auto-assigned)
            const [migratedCount] = await UserRole.schema(schemaName).update(
                {
                    role_id: newRoleId,
                    assignment_type: newAssignmentType,
                    source_role_id: oldRoleId,
                    assigned_by: migratedBy,
                    assigned_at: new Date()
                },
                {
                    where: {
                        role_id: oldRoleId,
                        assignment_type: { [Op.in]: ['system_default', 'custom_default'] }
                    },
                    transaction
                }
            );

            await transaction.commit();

            // Invalidate user role caches
            await CacheService.delPattern(CachePatterns.TENANT_USER_ROLES(schemaName));

            logger.info(`[RoleAssignmentService] Migrated ${migratedCount} users from role ${oldRoleId} to ${newRoleId} in ${schemaName}`);

            return { migratedCount };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    // =========================================================================
    // ROLE ASSIGNMENT (Individual User)
    // =========================================================================

    /**
     * Assign a role to a user with proper tracking
     * 
     * @param schemaName - Tenant schema
     * @param userId - User to assign role to
     * @param roleId - Role to assign
     * @param assignmentType - How the role is being assigned
     * @param assignedBy - Who is assigning the role
     * @param institutionId - Optional institution ID
     */
    static async assignRoleToUser(
        schemaName: string,
        userId: string,
        roleId: string,
        assignmentType: RoleAssignmentType = 'explicit',
        assignedBy?: string,
        institutionId?: string
    ): Promise<UserRole> {
        // Check if user already has this role
        const existing = await UserRole.schema(schemaName).findOne({
            where: { user_id: userId, role_id: roleId }
        });

        if (existing) {
            throw new Error('User already has this role');
        }

        // Get role to determine cache strategy
        const role = await Role.schema(schemaName).findByPk(roleId);
        if (!role) {
            throw new Error('Role not found');
        }

        // Create the assignment
        const userRole = await UserRole.schema(schemaName).create({
            user_id: userId,
            role_id: roleId,
            assignment_type: assignmentType,
            assigned_by: assignedBy,
            institution_id: institutionId,
            assigned_at: new Date()
        });

        // Invalidate user's role cache
        await this.invalidateUserRoleCache(schemaName, userId);

        return userRole;
    }

    /**
     * Assign default role to a new user based on their user type
     * 
     * This should be called when creating a new user.
     * It looks up the default role config and assigns accordingly.
     */
    static async assignDefaultRoleToUser(
        schemaName: string,
        userId: string,
        userType: string,
        institutionId?: string,
        planId?: string
    ): Promise<UserRole | null> {
        // Get the default role config for this user type
        const config = await this.getDefaultRoleConfig(schemaName, userType);

        if (!config) {
            // No default configured, try to find role by name
            const role = await Role.schema(schemaName).findOne({
                where: {
                    name: { [Op.iLike]: userType },
                    is_active: true
                }
            });

            if (role) {
                const assignmentType: RoleAssignmentType =
                    role.asset_type === 'custom' ? 'custom_default' : 'system_default';

                return this.assignRoleToUser(
                    schemaName,
                    userId,
                    role.id,
                    assignmentType,
                    undefined,
                    institutionId
                );
            }

            logger.warn(`[RoleAssignmentService] No default role found for user type '${userType}' in ${schemaName}`);
            return null;
        }

        const assignmentType: RoleAssignmentType =
            config.is_system_role ? 'system_default' : 'custom_default';

        return this.assignRoleToUser(
            schemaName,
            userId,
            config.default_role_id,
            assignmentType,
            undefined,
            institutionId
        );
    }

    /**
     * Remove a role from a user
     */
    static async removeRoleFromUser(
        schemaName: string,
        userId: string,
        roleId: string
    ): Promise<{ removed: boolean }> {
        const deleted = await UserRole.schema(schemaName).destroy({
            where: { user_id: userId, role_id: roleId }
        });

        if (deleted === 0) {
            throw new Error('User does not have this role');
        }

        // Invalidate user's role cache
        await this.invalidateUserRoleCache(schemaName, userId);

        return { removed: true };
    }

    /**
     * Get all roles for a user with assignment type information
     */
    static async getUserRolesWithAssignmentInfo(
        schemaName: string,
        userId: string
    ): Promise<Array<{ role: Role; assignmentType: RoleAssignmentType; assignedAt?: Date }>> {
        const userRoles = await UserRole.schema(schemaName).findAll({
            where: { user_id: userId },
            include: [{ model: Role.schema(schemaName), as: 'role' }]
        });

        return userRoles.map((ur) => ({
            role: ur.get('role') as Role,
            assignmentType: (ur.get('assignment_type') as RoleAssignmentType) || 'explicit',
            assignedAt: ur.get('assigned_at') as Date | undefined
        }));
    }

    // =========================================================================
    // CACHE MANAGEMENT
    // =========================================================================

    /**
     * Invalidate role config cache for a specific user type
     */
    static async invalidateRoleConfigCache(schemaName: string, userType: string): Promise<void> {
        await CacheService.del(CacheKeys.TENANT_ROLE_CONFIG(schemaName, userType));
        await CacheService.del(CacheKeys.TENANT_ALL_ROLE_CONFIGS(schemaName));
    }

    /**
     * Invalidate all role config caches for a tenant
     */
    static async invalidateAllRoleConfigCaches(schemaName: string): Promise<void> {
        await CacheService.delPattern(CachePatterns.TENANT_ROLE_CONFIGS(schemaName));
        await CacheService.del(CacheKeys.TENANT_ALL_ROLE_CONFIGS(schemaName));
    }

    /**
     * Invalidate user's role cache
     */
    static async invalidateUserRoleCache(schemaName: string, userId: string): Promise<void> {
        await CacheService.del(CacheKeys.USER_EFFECTIVE_ROLES(schemaName, userId));
    }

    /**
     * Invalidate role permission cache based on role type
     * 
     * @param schemaName - Tenant schema
     * @param role - The role object
     */
    static async invalidateRolePermissionCache(schemaName: string, role: Role): Promise<void> {
        const roleSlug = role.slug || role.name.toLowerCase().replace(/\s+/g, '-');

        if (role.asset_type === 'custom') {
            // Custom role - invalidate tenant-scoped cache
            await RolePermissionCache.invalidateTenantRole(schemaName, roleSlug);
        } else if (role.plan_id) {
            // System/public role - invalidate plan-scoped cache
            await RolePermissionCache.invalidatePlanRole(role.plan_id, roleSlug);
        } else {
            // Fallback to tenant cache if no plan ID
            await RolePermissionCache.invalidateTenantRole(schemaName, roleSlug);
        }
    }

    // =========================================================================
    // INITIALIZATION (Called during tenant creation)
    // =========================================================================

    /**
     * Initialize default role configurations for a new tenant
     * Called during tenant creation after roles are seeded
     */
    static async initializeDefaultRoleConfigs(
        schemaName: string,
        planId?: string
    ): Promise<void> {
        const userTypes = ['student', 'teacher', 'staff', 'parent', 'admin'];

        for (const userType of userTypes) {
            // Find the matching role
            const role = await Role.schema(schemaName).findOne({
                where: {
                    name: { [Op.iLike]: userType },
                    is_active: true
                }
            });

            if (role) {
                const isSystemRole = role.asset_type === 'public' || role.asset_type === 'readonly';
                const roleSlug = role.slug || role.name.toLowerCase().replace(/\s+/g, '-');

                await TenantRoleConfig.schema(schemaName).create({
                    user_type: userType,
                    default_role_id: role.id,
                    is_system_role: isSystemRole,
                    role_slug: roleSlug,
                    plan_id: role.plan_id || planId,
                    last_changed_at: new Date()
                });

                logger.info(`[RoleAssignmentService] Initialized default role config: ${userType} → ${role.name}`);
            }
        }
    }
}

export default RoleAssignmentService;
