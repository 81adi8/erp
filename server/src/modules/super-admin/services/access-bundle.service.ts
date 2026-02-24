import { AccessBundle } from '../../../database/models/public/AccessBundle.model';
import { Module } from '../../../database/models/public/Module.model';
import { Permission } from '../../../database/models/public/Permission.model';
import { ApiError } from '../../../core/http/ApiError';
import { HttpStatus } from '../../../core/http/HttpStatus';
import { nestItems } from '../../../core/utils/hierarchy.util';

export interface ModulePermissionConfig {
    allPermissions: boolean;
    permissionIds: string[];
}

export class AccessBundleService {
    /**
     * Get all access bundles
     */
    async findAll(query: { target_model?: string; target_id?: string; tenant_type?: string; asset_type?: string } = {}) {
        const where: Record<string, unknown> = {};
        if (query.target_model) where.target_model = query.target_model;
        if (query.target_id) where.target_id = query.target_id;
        if (query.tenant_type) where.tenant_type = query.tenant_type;
        if (query.asset_type) where.asset_type = query.asset_type;

        const bundles = await AccessBundle.findAll({
            where,
            order: [['created_at', 'DESC']],
        });

        // Enrich with module and permission data
        const enrichedBundles = await Promise.all(
            bundles.map(async (bundle) => {
                const modules = bundle.module_ids?.length
                    ? await Module.findAll({ where: { id: bundle.module_ids } })
                    : [];
                const permissions = bundle.permission_ids?.length
                    ? await Permission.findAll({ where: { id: bundle.permission_ids } })
                    : [];
                return {
                    ...bundle.toJSON(),
                    modules: nestItems(modules.map(m => m.toJSON())),
                    permissions,
                };
            })
        );

        return enrichedBundles;
    }

    /**
     * Get single access bundle by ID
     */
    async findById(id: string) {
        const bundle = await AccessBundle.findByPk(id);
        if (!bundle) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Access bundle not found');
        }

        const modules = bundle.module_ids?.length
            ? await Module.findAll({ where: { id: bundle.module_ids } })
            : [];
        const permissions = bundle.permission_ids?.length
            ? await Permission.findAll({ where: { id: bundle.permission_ids } })
            : [];

        return {
            ...bundle.toJSON(),
            modules: nestItems(modules.map(m => m.toJSON())),
            permissions,
        };
    }

    /**
     * Create a new access bundle
     */
    async create(data: {
        name: string;
        description?: string;
        is_active?: boolean;
        parent_title: string;
        parent_slug: string;
        parent_icon: string;
        tenant_type?: string;
        asset_type?: string;
        target_model?: string;
        target_id?: string;
        module_ids?: string[];
        permission_ids?: string[];
        module_permissions?: Record<string, ModulePermissionConfig>;
    }) {
        const {
            name,
            description,
            is_active = true,
            parent_title,
            parent_slug,
            parent_icon,
            tenant_type = 'all',
            asset_type = 'public',
            target_model,
            target_id,
            module_ids = [],
            permission_ids = [],
            module_permissions = {},
        } = data;

        // Validate module IDs exist
        if (module_ids.length > 0) {
            const existingModules = await Module.findAll({ where: { id: module_ids } });
            if (existingModules.length !== module_ids.length) {
                throw new ApiError(HttpStatus.BAD_REQUEST, 'Some module IDs are invalid');
            }
        }

        // Validate permission IDs exist
        if (permission_ids.length > 0) {
            const existingPermissions = await Permission.findAll({ where: { id: permission_ids } });
            if (existingPermissions.length !== permission_ids.length) {
                throw new ApiError(HttpStatus.BAD_REQUEST, 'Some permission IDs are invalid');
            }
        }

        const bundle = await AccessBundle.create({
            name,
            description,
            is_active,
            parent_title,
            parent_slug,
            parent_icon,
            tenant_type,
            asset_type,
            target_model,
            target_id,
            module_ids,
            permission_ids,
            module_permissions,
        });

        return this.findById(bundle.id);
    }

    /**
     * Update an access bundle
     */
    async update(
        id: string,
        data: {
            name?: string;
            description?: string;
            is_active?: boolean;
            parent_title?: string;
            parent_slug?: string;
            parent_icon?: string;
            tenant_type?: string;
            asset_type?: string;
            target_model?: string;
            target_id?: string;
            module_ids?: string[];
            permission_ids?: string[];
            module_permissions?: Record<string, ModulePermissionConfig>;
        }
    ) {
        const bundle = await AccessBundle.findByPk(id);
        if (!bundle) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Access bundle not found');
        }

        const { module_ids, permission_ids, module_permissions, ...updateData } = data;

        // Validate module IDs if provided
        if (module_ids !== undefined && module_ids.length > 0) {
            const existingModules = await Module.findAll({ where: { id: module_ids } });
            if (existingModules.length !== module_ids.length) {
                throw new ApiError(HttpStatus.BAD_REQUEST, 'Some module IDs are invalid');
            }
        }

        // Validate permission IDs if provided
        if (permission_ids !== undefined && permission_ids.length > 0) {
            const existingPermissions = await Permission.findAll({ where: { id: permission_ids } });
            if (existingPermissions.length !== permission_ids.length) {
                throw new ApiError(HttpStatus.BAD_REQUEST, 'Some permission IDs are invalid');
            }
        }

        await bundle.update({
            ...updateData,
            module_ids: module_ids !== undefined ? module_ids : bundle.module_ids,
            permission_ids: permission_ids !== undefined ? permission_ids : bundle.permission_ids,
            module_permissions: module_permissions !== undefined ? module_permissions : bundle.module_permissions,
        });

        // Explicitly mark JSONB fields as changed to ensure Sequelize persists them
        if (module_ids !== undefined) bundle.changed('module_ids', true);
        if (permission_ids !== undefined) bundle.changed('permission_ids', true);
        if (module_permissions !== undefined) bundle.changed('module_permissions', true);

        await bundle.save();

        return this.findById(id);
    }

    /**
     * Delete an access bundle
     */
    async delete(id: string) {
        const bundle = await AccessBundle.findByPk(id);
        if (!bundle) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Access bundle not found');
        }

        await bundle.destroy();
        return { message: 'Access bundle deleted successfully' };
    }
}
