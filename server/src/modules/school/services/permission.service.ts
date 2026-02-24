import { Permission as PublicPermission } from '../../../database/models/public/Permission.model';
import { Feature } from '../../../database/models/public/Feature.model';
import { Module } from '../../../database/models/public/Module.model';
import { AdminPermission } from '../../../database/models/shared/core/AdminPermission.model';
import { UserPermission } from '../../../database/models/shared/core/UserPermission.model';
import { Role } from '../../../database/models/shared/core/Role.model';
import { RolePermission } from '../../../database/models/shared/core/RolePermission.model';
import { User } from '../../../database/models/shared/core/User.model';
import { Op } from 'sequelize';
import { Roles, RoleType } from '../../../core/constants/roles';
import { logger } from '../../../core/utils/logger';

/**
 * Permission Service - Centralized, Nested, and Plan-Based
 */
export class PermissionService {

    /**
     * Get all available modules, features and permissions (from Public Schema)
     */
    static async getGlobalAbilities() {
        return Module.findAll({
            include: [{
                model: Feature,
                include: [PublicPermission]
            }],
            order: [
                ['sort_order', 'ASC'],
                [{ model: Feature, as: 'features' }, 'sort_order', 'ASC']
            ]
        });
    }

    /**
     * Get permissions for a specific plan
     */
    static async getPlanPermissions(planId: string) {
        const { Plan } = require('../../../database/models/public/Plan.model');
        const plan = await Plan.findByPk(planId, {
            include: [PublicPermission]
        });
        return plan?.permissions || [];
    }

    /**
     * Inject plan permissions into AdminPermission table for a tenant admin
     */
    static async injectPlanPermissions(schemaName: string, adminUserId: string, planId: string) {
        const permissions = await this.getPlanPermissions(planId);

        const adminPerms = permissions.map((p: any) => ({
            user_id: adminUserId,
            permission_id: p.id,
            permission_key: p.key,
        }));

        if (adminPerms.length > 0) {
            // Clear existing to avoid duplicates on retry
            await AdminPermission.schema(schemaName).destroy({
                where: { user_id: adminUserId }
            });
            await AdminPermission.schema(schemaName).bulkCreate(adminPerms);
        }

        return adminPerms;
    }

    /**
     * Get admin's permission range
     * Returns nested structure: Module -> Feature -> Permission
     * Filters based on admin's actual permission keys from JWT
     */
    static async getAdminRange(
        schemaName: string,
        adminUserId: string,
        permissionKeys: string[] = [],
        isMainAdmin: boolean = false
    ) {
        // 1. Fetch the full hierarchy from public schema
        const modules = await Module.findAll({
            include: [{
                model: Feature,
                as: 'features',
                include: [{
                    model: PublicPermission,
                    as: 'permissions'
                }]
            }],
            order: [
                ['sort_order', 'ASC'],
                [{ model: Feature, as: 'features' }, 'sort_order', 'ASC']
            ]
        });

        // Debug logging
        logger.info('[PermissionService] getAdminRange - Modules count:', modules.length);
        logger.info('[PermissionService] Permission keys from JWT:', permissionKeys.length, 'isMainAdmin:', isMainAdmin);

        modules.forEach((mod) => {
            const modData = mod.toJSON() as {
                name?: string;
                features?: Array<{ name?: string; permissions?: unknown[] }>;
            };
            logger.info(`[PermissionService] Module: ${modData.name}, Features: ${modData.features?.length || 0}`);
            modData.features?.forEach((feat) => {
                logger.info(`  Feature: ${feat.name}, Permissions: ${feat.permissions?.length || 0}`);
            });
        });

        // If main admin or no permission keys (fallback to full access), return all abilities
        if (isMainAdmin || permissionKeys.length === 0) {
            logger.info('[PermissionService] Returning all global abilities (main admin or no specific permissions)');
            return modules;
        }

        // 2. Filter hierarchy based on admin's permission keys
        const keySet = new Set(permissionKeys);

        return modules.map((mod) => {
            const modJson = mod.toJSON() as {
                features: Array<{ permissions: Array<{ key: string }> }>;
                [key: string]: unknown;
            };
            modJson.features = modJson.features.map((feat) => {
                feat.permissions = feat.permissions.filter((p) => keySet.has(p.key));
                return feat;
            }).filter((feat) => feat.permissions && feat.permissions.length > 0);
            return modJson;
        }).filter(mod => mod.features && mod.features.length > 0);
    }

    /**
     * Delegate permissions from admin to another user (Teacher/Student/Staff)
     * Admin can only delegate what they have in their "range"
     */
    static async delegatePermissions(
        schemaName: string,
        adminUserId: string,
        targetUserId: string,
        permissionIds: string[]
    ) {
        // 1. Verify admin has these permissions
        const adminRange = await this.getAdminRange(schemaName, adminUserId);
        const adminPermIds = new Set<string>();
        (adminRange as Array<{
            features?: Array<{
                permissions?: Array<{ id?: string }>;
            }>;
        }>).forEach((moduleEntry) => {
            moduleEntry.features?.forEach((featureEntry) => {
                featureEntry.permissions?.forEach((permissionEntry) => {
                    if (typeof permissionEntry.id === 'string') {
                        adminPermIds.add(permissionEntry.id);
                    }
                });
            });
        });

        const validIds = permissionIds.filter(id => adminPermIds.has(id));

        if (validIds.length === 0 && permissionIds.length > 0) {
            throw new Error('Admin does not have authority to grant these permissions');
        }

        // 2. Fetch permission keys for denormalization
        const permissions = await PublicPermission.findAll({
            where: { id: { [Op.in]: validIds } }
        });

        // 3. Clear existing and set new
        await UserPermission.schema(schemaName).destroy({
            where: { user_id: targetUserId }
        });

        const userPerms = permissions.map((p) => ({
            user_id: targetUserId,
            permission_id: p.id,
            permission_key: p.key,
            granted_by: adminUserId
        }));

        if (userPerms.length > 0) {
            await UserPermission.schema(schemaName).bulkCreate(userPerms);
        }

        return userPerms;
    }

    /**
     * Check if a user's permission matches the required permission key
     * Supports:
     * - Exact match: `settings.rbac.view` matches `settings.rbac.view`
     * - Wildcard: `settings.*` matches `settings.rbac.view`
     * - Nested parent: `settings.manage` matches `settings.rbac.manage` (parent action)
     * - Full wildcard: `*` matches everything
     */
    static matchPermissionKey(userPermission: string, requiredPermission: string): boolean {
        // Exact match
        if (userPermission === requiredPermission) return true;

        // Full wildcard
        if (userPermission === '*') return true;

        // Wildcard suffix: `settings.*` matches `settings.rbac.view`
        if (userPermission.endsWith('.*')) {
            const prefix = userPermission.slice(0, -1); // Remove the '*', keep the '.'
            if (requiredPermission.startsWith(prefix)) return true;
        }

        // Parent action matching: `settings.manage` should match `settings.rbac.manage`
        // Split both keys by '.' and check if user has a shorter parent permission
        const userParts = userPermission.split('.');
        const reqParts = requiredPermission.split('.');

        // If user has `module.action` and req is `module.feature.action`, check if actions match
        if (userParts.length === 2 && reqParts.length >= 2) {
            const userModule = userParts[0];
            const userAction = userParts[1];
            const reqModule = reqParts[0];
            const reqAction = reqParts[reqParts.length - 1]; // Last part is action

            // Parent permission: `settings.view` grants access to `settings.rbac.view`
            if (userModule === reqModule && userAction === reqAction) return true;

            // Manage implies view: `settings.manage` grants `settings.view` or `settings.rbac.view`
            if (userModule === reqModule && userAction === 'manage' && (reqAction === 'view' || reqAction === 'manage')) return true;
        }

        // Feature-level wildcard: `settings.rbac.*` matches `settings.rbac.view`
        if (userParts.length >= 2) {
            const lastPart = userParts[userParts.length - 1];
            if (lastPart === '*') {
                const userPrefix = userParts.slice(0, -1).join('.');
                const reqPrefix = reqParts.slice(0, userParts.length - 1).join('.');
                if (userPrefix === reqPrefix) return true;
            }
        }

        return false;
    }

    /**
     * Check if user has a specific permission
     * Checks both RolePermission (legacy/defaults) and UserPermission (delegated)
     * Supports wildcard and nested permission matching
     */
    static async checkUserPermission(schemaName: string, userId: string, permissionKey: string): Promise<boolean> {
        // 1. Check direct delegated permissions (UserPermission)
        const directPerms = await UserPermission.schema(schemaName).findAll({
            where: { user_id: userId },
            attributes: ['permission_key']
        });
        for (const dp of directPerms) {
            const directKey = dp.get('permission_key') as string | undefined;
            if (directKey && this.matchPermissionKey(directKey, permissionKey)) return true;
        }

        // 2. Check AdminPermission if the user is an admin
        const adminPerms = await AdminPermission.schema(schemaName).findAll({
            where: { user_id: userId },
            attributes: ['permission_key']
        });
        for (const ap of adminPerms) {
            const adminKey = ap.get('permission_key') as string | undefined;
            if (adminKey && this.matchPermissionKey(adminKey, permissionKey)) return true;
        }

        // 3. Check Role-based permissions
        const { UserRole } = require('../../../database/models/shared/core/UserRole.model');
        const userRoles = await UserRole.schema(schemaName).findAll({
            where: { user_id: userId },
            include: [{
                model: Role.schema(schemaName),
                as: 'role'
            }]
        });

        if (!userRoles || userRoles.length === 0) return false;

        // Check if user has Admin role (superuser for institution)
        const hasAdminRole = userRoles.some((ur: any) => {
            const role = ur.get('role') as Role | undefined;
            return role?.name === Roles.ADMIN || role?.role_type === RoleType.ADMIN;
        });
        if (hasAdminRole) return true;

        // Check role-based permissions via RolePermission table
        const roleIds = userRoles.map((ur: any) => ur.get('role_id') as string);
        const rolePerms = await RolePermission.schema(schemaName).findAll({
            where: { role_id: roleIds },
            include: [{
                model: PublicPermission,
                as: 'permission',
                attributes: ['key']
            }]
        });

        for (const rp of rolePerms) {
            const permission = rp.get('permission') as PublicPermission | undefined;
            const rpKey = permission?.key;
            if (rpKey && this.matchPermissionKey(rpKey, permissionKey)) return true;
        }

        return false;
    }

    /**
     * Seed default permissions for roles (based on requirements)
     * e.g., Teacher gets view/mark attendance by default
     */
    static async seedDefaultRolePermissions(schemaName: string, planId: string) {
        // This would involve finding common permissions from public schema
        // and mapping them to basic roles (Teacher, Student)
        // Only within the plan's range

        const planPerms = await this.getPlanPermissions(planId);
        const keyToId: Record<string, string> = {};
        planPerms.forEach((p: any) => { keyToId[p.key] = p.id; });

        const defaults: Record<string, string[]> = {
            [Roles.TEACHER]: ['academics.students.view', 'attendance.student_attendance.mark', 'exams.marks_entry.create'],
            [Roles.STUDENT]: ['academics.classes.view', 'attendance.student_attendance.view', 'exams.results.view'],
            [Roles.PARENT]: ['academics.students.view', 'exams.results.view'],
            [Roles.STAFF]: ['communication.announcements.view']
        };

        const roles = await Role.schema(schemaName).findAll();

        for (const role of roles) {
            const roleName = role.name;
            const permKeys = defaults[roleName];

            if (permKeys) {
                const rolePerms = permKeys
                    .filter(key => keyToId[key])
                    .map(key => ({
                        role_id: role.id,
                        permission_id: keyToId[key]
                    }));

                if (rolePerms.length > 0) {
                    // Clear existing role permissions to avoid duplicates
                    await RolePermission.schema(schemaName).destroy({
                        where: { role_id: role.id }
                    });
                    await RolePermission.schema(schemaName).bulkCreate(rolePerms);
                }
            }
        }
    }

    /**
     * Get direct delegated permissions for a user from tenant schema.
     */
    static async getUserPermissionsForUser(schemaName: string, userId: string) {
        return UserPermission.schema(schemaName).findAll({
            where: { user_id: userId },
        });
    }
}

export default PermissionService;
