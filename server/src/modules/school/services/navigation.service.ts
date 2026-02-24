import { Op } from 'sequelize';
import { RoleService } from './role.service';
import { Permission } from '../../../database/models/public/Permission.model';
import { Module } from '../../../database/models/public/Module.model';
import { Feature } from '../../../database/models/public/Feature.model';
import { Plan } from '../../../database/models/public/Plan.model';
import { Institution } from '../../../database/models/public/Institution.model';
import User from '../../../database/models/shared/core/User.model';
import Role from '../../../database/models/shared/core/Role.model';
import { AdminPermission } from '../../../database/models/shared/core/AdminPermission.model';
import { UserPermission } from '../../../database/models/shared/core/UserPermission.model';
import { logger } from '../../../core/utils/logger';

interface NavItem {
    key: string;
    title: string;
    icon?: string;
    path?: string;
    children?: NavItem[];
    route_active?: boolean;
}

interface RoleData {
    id: string;
    name: string;
    slug?: string;
}

interface PermissionData {
    id: string;
    key: string;
    action?: string;
    description?: string;
    route_name?: string;
    route_active?: boolean;
    route_title?: string;
}

interface FeatureData {
    id: string;
    slug: string;
    name: string;
    icon?: string;
    route_name?: string;
    route_title?: string;
    route_active?: boolean;
    sort_order?: number;
    permissions?: PermissionData[];
}

interface ModuleData {
    id: string;
    slug: string;
    name: string;
    icon?: string;
    route_name?: string;
    route_title?: string;
    route_active?: boolean;
    sort_order?: number;
    institution_type?: string;
    parent_id?: string;
    features?: FeatureData[];
}

interface PlanData {
    id: string;
    name: string;
    modules?: ModuleData[];
    permissions?: PermissionData[];
}

interface UserWithRoles {
    roles?: Array<{
        id: string;
        name: string;
        permissions?: PermissionData[];
    }>;
}

interface NavItemInternal extends NavItem {
    sort_order?: number;
    isModule?: boolean;
}

export class NavigationService {
    static async getPermissionsAndNavigation(
        schemaName: string,
        userId: string,
        institutionId?: string
    ): Promise<{
        permissions: string[];
        navigation: NavItem[];
        roles: Array<{ id: string; name: string }>;
        isAdmin: boolean;
    }> {
        logger.info(`[Navigation] Loading for user ${userId} in schema ${schemaName}`);

        const { planModuleIds, planPermissionKeys, institution } = await this.getInstitutionPlanAccess(institutionId);
        logger.info(`[Navigation] Plan has ${planModuleIds.size} modules and ${planPermissionKeys.size} permissions`);

        const userRoles = await RoleService.getUserRoles(userId, schemaName);
        const isAdmin = userRoles.some((r: RoleData) => r.name?.toLowerCase() === 'admin' || r.slug?.toLowerCase() === 'admin');

        logger.info('[Navigation] User roles:', userRoles.map((r: RoleData) => r.name), `isAdmin: ${isAdmin}`);

        const userPermissionKeys = await this.getUserAccessiblePermissions(
            schemaName,
            userId,
            isAdmin,
            planPermissionKeys
        );

        logger.info(`[Navigation] User has ${userPermissionKeys.size} permissions`);
        if (userPermissionKeys.size === 0 && !isAdmin) {
            logger.warn(`[Navigation] User ${userId} has NO permissions. This will result in empty navigation.`);
        }

        const navigation = await this.buildNavigationFromPlan(
            planModuleIds,
            planPermissionKeys,
            userPermissionKeys,
            isAdmin,
            institution?.type
        );

        logger.info(`[Navigation] Built ${navigation.length} navigation items:`, navigation.map(n => n.title));

        return {
            permissions: Array.from(userPermissionKeys),
            navigation,
            roles: userRoles.map((r: RoleData) => ({ id: r.id, name: r.name })),
            isAdmin,
        };
    }

    static async getUserPermissionsPayload(
        schemaName: string,
        userId: string,
        institutionId?: string
    ): Promise<{
        permissions: string[];
        roles: Array<{ id: string; name: string }>;
        isAdmin: boolean;
    }> {
        const { planPermissionKeys } = await this.getInstitutionPlanAccess(institutionId);
        const userRoles = await RoleService.getUserRoles(userId, schemaName);
        const isAdmin = userRoles.some((r: RoleData) => r.name === 'Admin' || r.name === 'admin');

        const userPermissionKeys = await this.getUserAccessiblePermissions(
            schemaName,
            userId,
            isAdmin,
            planPermissionKeys
        );

        return {
            permissions: Array.from(userPermissionKeys),
            roles: userRoles.map((r: RoleData) => ({ id: r.id, name: r.name })),
            isAdmin,
        };
    }

    static async getNavItemsPayload(
        schemaName: string,
        userId: string,
        institutionId?: string
    ): Promise<{ navigation: NavItem[] }> {
        const { planModuleIds, planPermissionKeys, institution } = await this.getInstitutionPlanAccess(institutionId);
        const userRoles = await RoleService.getUserRoles(userId, schemaName);
        const isAdmin = userRoles.some((r: RoleData) => r.name === 'Admin' || r.name === 'admin');

        const userPermissionKeys = await this.getUserAccessiblePermissions(
            schemaName,
            userId,
            isAdmin,
            planPermissionKeys
        );

        const navigation = await this.buildNavigationFromPlan(
            planModuleIds,
            planPermissionKeys,
            userPermissionKeys,
            isAdmin,
            institution?.type
        );

        return { navigation };
    }

    private static async getInstitutionPlanAccess(institutionId?: string): Promise<{
        planModuleIds: Set<string>;
        planPermissionKeys: Set<string>;
        institution?: Institution;
    }> {
        const planModuleIds = new Set<string>();
        const planPermissionKeys = new Set<string>();

        if (!institutionId) {
            return { planModuleIds, planPermissionKeys };
        }

        const institution = await Institution.findByPk(institutionId, {
            include: [{
                model: Plan,
                as: 'plan',
                include: [
                    { model: Module, as: 'modules', where: { is_active: true }, through: { attributes: [] }, required: false },
                    { model: Permission, as: 'permissions', where: { is_active: true }, through: { attributes: [] }, required: false },
                ],
            }],
        });

        if (!institution?.plan) return { planModuleIds, planPermissionKeys };

        const plan = institution.plan as PlanData;
        logger.info(`[Navigation] Institution uses plan: ${plan.name} (${plan.id})`);

        const explicitModuleIds = (plan.modules || []).map((m: ModuleData) => m.id);
        if (explicitModuleIds.length > 0) {
            const collectParents = async (moduleIds: string[]) => {
                const modules = await Module.findAll({
                    where: { id: { [Op.in]: moduleIds } },
                    attributes: ['id', 'parent_id']
                });

                const parentIds: string[] = [];
                for (const m of modules) {
                    planModuleIds.add(m.id);
                    if (m.parent_id && !planModuleIds.has(m.parent_id)) {
                        parentIds.push(m.parent_id);
                    }
                }

                if (parentIds.length > 0) {
                    await collectParents(parentIds);
                }
            };

            const collectChildren = async (moduleIds: string[]) => {
                const modules = await Module.findAll({
                    where: { parent_id: { [Op.in]: moduleIds } },
                    attributes: ['id']
                });

                const childIds: string[] = [];
                for (const m of modules) {
                    if (!planModuleIds.has(m.id)) {
                        planModuleIds.add(m.id);
                        childIds.push(m.id);
                    }
                }

                if (childIds.length > 0) {
                    await collectChildren(childIds);
                }
            };

            await collectParents(explicitModuleIds);
            await collectChildren(explicitModuleIds);
        }

        if (plan.permissions) {
            plan.permissions.forEach((p: PermissionData) => {
                if (p.key) planPermissionKeys.add(p.key);
            });
        }

        if (planModuleIds.size > 0) {
            const modulePermissions = await Permission.findAll({
                where: { is_active: true },
                include: [{
                    model: Feature,
                    as: 'feature',
                    where: {
                        module_id: { [Op.in]: Array.from(planModuleIds) },
                        is_active: true
                    },
                    required: true
                }],
            });
            modulePermissions.forEach((p) => {
                if (p.key) planPermissionKeys.add(p.key);
            });
        }

        return { planModuleIds, planPermissionKeys, institution };
    }

    private static async getUserAccessiblePermissions(
        schemaName: string,
        userId: string,
        isAdmin: boolean,
        planPermissionKeys: Set<string>
    ): Promise<Set<string>> {
        const permissions = new Set<string>();

        try {
            const user = await User.schema(schemaName).findByPk(userId, {
                include: [
                    {
                        model: Role.schema(schemaName),
                        as: 'roles',
                        through: { attributes: [] } as Record<string, unknown>,
                        include: [{
                            model: Permission,
                            as: 'permissions',
                            where: { is_active: true },
                            through: { attributes: [] } as Record<string, unknown>,
                            required: false
                        }]
                    }
                ]
            }) as UserWithRoles | null;

            if (!user) {
                logger.warn(`[Navigation] User ${userId} not found in schema ${schemaName}`);
                return permissions;
            }

            const roles = user.roles || [];
            logger.info(`[Navigation] Found ${roles.length} roles via direct query`);

            roles.forEach((role) => {
                const rolePerms = role.permissions || [];
                rolePerms.forEach((p: PermissionData) => {
                    if (p.key && planPermissionKeys.has(p.key)) {
                        permissions.add(p.key);
                    }
                });
            });

            const directPermissions = await UserPermission.schema(schemaName).findAll({
                where: { user_id: userId }
            });
            if (directPermissions.length > 0) {
                logger.info(`[Navigation] Found ${directPermissions.length} direct permissions`);
            }
            directPermissions.forEach((p) => {
                if (p.permission_key && planPermissionKeys.has(p.permission_key)) {
                    permissions.add(p.permission_key);
                }
            });

            const adminPermissions = await AdminPermission.schema(schemaName).findAll({
                where: { user_id: userId }
            });
            adminPermissions.forEach((p) => {
                if (p.permission_key && planPermissionKeys.has(p.permission_key)) {
                    permissions.add(p.permission_key);
                }
            });
        } catch (error) {
            logger.error('[Navigation] Error fetching user permissions:', error);
        }

        // Explicitly use isAdmin to keep function signature semantically complete.
        if (isAdmin && permissions.size === 0) {
            // Admin without explicit permissions still receives plan-constrained routes
            // via caller checks during navigation build.
        }

        return permissions;
    }

    private static async buildNavigationFromPlan(
        planModuleIds: Set<string>,
        planPermissionKeys: Set<string>,
        userPermissionKeys: Set<string>,
        isAdmin: boolean,
        institutionType?: string
    ): Promise<NavItem[]> {
        try {
            if (planModuleIds.size === 0) {
                logger.warn('[Navigation] No modules in plan, returning empty navigation');
                return [];
            }

            const allModules = await Module.findAll({
                where: {
                    id: { [Op.in]: Array.from(planModuleIds) },
                    is_active: true
                },
                include: [{
                    model: Feature,
                    as: 'features',
                    where: { is_active: true },
                    required: false,
                    include: [{
                        model: Permission,
                        as: 'permissions',
                        where: { is_active: true },
                        required: false,
                        attributes: ['id', 'key', 'action', 'description', 'route_name', 'route_active', 'route_title'],
                    }]
                }],
                order: [
                    ['sort_order', 'ASC'],
                    ['name', 'ASC'],
                ],
            });

            logger.info(`[Navigation] Found ${allModules.length} modules from plan`);

            const navItems: NavItemInternal[] = [];
            const moduleToNavItem = new Map<string, NavItemInternal>();

            for (const module of allModules) {
                const moduleData = module.toJSON() as ModuleData;
                const accessibleFeatures: NavItemInternal[] = [];

                if (institutionType && moduleData.institution_type &&
                    moduleData.institution_type.toLowerCase() !== institutionType.toLowerCase() &&
                    moduleData.institution_type !== 'all') {
                    continue;
                }

                if (moduleData.features && moduleData.features.length > 0) {
                    for (const feature of moduleData.features) {
                        const featurePermKeys = (feature.permissions || []).map((p: PermissionData) => p.key);
                        const userHasAccess = isAdmin || featurePermKeys.some((k: string) => userPermissionKeys.has(k));

                        // Read planPermissionKeys to enforce plan-aware feature visibility.
                        const featureInPlanScope = featurePermKeys.length === 0
                            || featurePermKeys.some((k: string) => planPermissionKeys.has(k));

                        if (userHasAccess && featureInPlanScope && feature.route_active !== false) {
                            let specificRoute: string | undefined;
                            let routeTitleOverride: string | undefined;

                            if (feature.permissions) {
                                for (const p of feature.permissions) {
                                    const hasPerm = isAdmin || userPermissionKeys.has(p.key);
                                    if (hasPerm) {
                                        if (p.route_name) specificRoute = p.route_name;
                                        if (p.route_title) routeTitleOverride = p.route_title;
                                        if (specificRoute && routeTitleOverride) break;
                                    }
                                }
                            }

                            const path = specificRoute || feature.route_name || `/${moduleData.slug}/${feature.slug}`;

                            accessibleFeatures.push({
                                key: feature.slug,
                                title: routeTitleOverride || feature.route_title || feature.name,
                                icon: feature.icon || undefined,
                                path,
                                isModule: false,
                                sort_order: feature.sort_order || 0
                            });
                        }
                    }
                }

                const navItem: NavItemInternal = {
                    key: moduleData.slug,
                    title: moduleData.route_title || moduleData.name,
                    icon: moduleData.icon || undefined,
                    children: accessibleFeatures.length > 0 ? accessibleFeatures : undefined,
                    isModule: true,
                    sort_order: moduleData.sort_order || 0,
                    route_active: moduleData.route_active
                };

                if (!navItem.children && (moduleData.route_name || !moduleData.features?.length)) {
                    navItem.path = moduleData.route_name || `/${moduleData.slug}`;
                }

                moduleToNavItem.set(module.id, navItem);
            }

            for (const module of allModules) {
                const navItem = moduleToNavItem.get(module.id)!;
                if (module.parent_id && moduleToNavItem.has(module.parent_id)) {
                    if (navItem.route_active !== false) {
                        const parentNavItem = moduleToNavItem.get(module.parent_id)!;
                        parentNavItem.children = parentNavItem.children || [];
                        parentNavItem.children.push(navItem);
                    }
                } else if (!module.parent_id) {
                    if (navItem.route_active !== false) {
                        navItems.push(navItem);
                    }
                } else {
                    if (navItem.route_active !== false) {
                        navItems.push(navItem);
                    }
                }
            }

            const finalizeNavigation = (items: NavItemInternal[]): NavItemInternal[] => {
                const result: NavItemInternal[] = [];

                for (const item of items) {
                    if (item.children && item.children.length > 0) {
                        item.children = finalizeNavigation(item.children as NavItemInternal[]);
                    }

                    const childrenCount = item.children?.length || 0;

                    if (childrenCount === 0) {
                        if (item.path) {
                            delete item.children;
                            result.push(item);
                        }
                    } else if (childrenCount === 1) {
                        const child = item.children![0] as NavItemInternal;
                        const isChildModule = child.isModule;
                        const isGenericTitle = ['portal', 'portals', 'module', 'modules', 'group', 'menu'].includes(item.title.toLowerCase());
                        const childHasChildren = child.children && child.children.length > 0;

                        if (!childHasChildren && !isChildModule) {
                            const flattenedItem: NavItemInternal = {
                                key: child.key,
                                title: isGenericTitle ? child.title : item.title,
                                icon: item.icon || child.icon,
                                path: child.path,
                                children: child.children,
                                isModule: isChildModule || item.isModule,
                                sort_order: item.sort_order
                            };
                            result.push(flattenedItem);
                        } else {
                            result.push(item);
                        }
                    } else {
                        item.children!.sort((a: NavItemInternal, b: NavItemInternal) => (a.sort_order || 0) - (b.sort_order || 0));
                        result.push(item);
                    }
                }

                return result;
            };

            const rawFinalNavigation = finalizeNavigation(navItems);

            const cleanupNavItem = (item: NavItemInternal) => {
                delete item.sort_order;
                delete item.isModule;
                delete item.route_active;
                if (item.children) {
                    item.children.forEach(cleanupNavItem);
                }
            };

            return rawFinalNavigation
                .sort((a: NavItemInternal, b: NavItemInternal) => (a.sort_order || 0) - (b.sort_order || 0))
                .map(item => {
                    cleanupNavItem(item);
                    return item;
                });
        } catch (error) {
            logger.error('[NavigationService.buildNavigationFromPlan] Error:', error);
            return [];
        }
    }
}

export default NavigationService;

