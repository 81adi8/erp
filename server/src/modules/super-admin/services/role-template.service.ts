import { RoleTemplate } from '../../../database/models/public/RoleTemplate.model';
import { Permission } from '../../../database/models/public/Permission.model';
import { Feature } from '../../../database/models/public/Feature.model';
import { Module } from '../../../database/models/public/Module.model';
import { Plan } from '../../../database/models/public/Plan.model';
import { ApiError } from '../../../core/http/ApiError';
import { HttpStatus } from '../../../core/http/HttpStatus';
import { Op } from 'sequelize';
import { nestItems } from '../../../core/utils/hierarchy.util';
import { logger } from '../../../core/utils/logger';

export interface CreateRoleTemplateDto {
    name: string;
    slug: string;
    description?: string;
    role_type?: string;
    tenant_type?: string;
    plan_id?: string;
    is_system?: boolean;
    is_active?: boolean;
    sort_order?: number;
    permission_ids?: string[];
    metadata?: Record<string, unknown>;
}

export interface UpdateRoleTemplateDto {
    name?: string;
    slug?: string;
    description?: string;
    role_type?: string;
    tenant_type?: string;
    plan_id?: string | null;
    is_active?: boolean;
    sort_order?: number;
    permission_ids?: string[];
    metadata?: Record<string, unknown>;
}

export class RoleTemplateService {
    /**
     * Get all role templates with optional filters
     */
    async findAll(query: { tenant_type?: string; plan_id?: string; is_active?: boolean } = {}) {
        const where: Record<PropertyKey, unknown> = {};

        if (query.tenant_type) {
            // Include templates for specific type or 'all'
            where.tenant_type = { [Op.in]: [query.tenant_type, 'all'] };
        }
        if (query.plan_id) {
            // Include templates for specific plan or null (global)
            where[Op.or] = [
                { plan_id: query.plan_id },
                { plan_id: null }
            ];
        }
        if (query.is_active !== undefined) {
            where.is_active = query.is_active;
        }

        const templates = await RoleTemplate.findAll({
            where,
            order: [['sort_order', 'ASC'], ['name', 'ASC']],
            include: [{ model: Plan, attributes: ['id', 'name', 'slug'] }],
        });

        // Enrich with permission data including feature and module
        const enrichedTemplates = await Promise.all(
            templates.map(async (template) => {
                const permissions = template.permission_ids?.length
                    ? await Permission.findAll({
                        where: { id: template.permission_ids },
                        include: [{
                            model: Feature,
                            as: 'feature',
                            include: [{ model: Module, as: 'module' }]
                        }]
                    })
                    : [];
                return {
                    ...template.toJSON(),
                    permissions,
                };
            })
        );

        return enrichedTemplates;
    }

    /**
     * Get single role template by ID
     */
    async findById(id: string) {
        const template = await RoleTemplate.findByPk(id, {
            include: [{ model: Plan, attributes: ['id', 'name', 'slug'] }],
        });

        if (!template) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Role template not found');
        }

        const permissions = template.permission_ids?.length
            ? await Permission.findAll({
                where: { id: template.permission_ids },
                include: [{
                    model: Feature,
                    as: 'feature',
                    include: [{ model: Module, as: 'module' }]
                }]
            })
            : [];

        return {
            ...template.toJSON(),
            permissions,
        };
    }

    /**
     * Create a new role template
     */
    async create(data: CreateRoleTemplateDto) {
        const {
            name,
            slug,
            description,
            tenant_type = 'all',
            role_type,
            plan_id,
            is_system = false,
            is_active = true,
            sort_order = 0,
            permission_ids = [],
            metadata = {},
        } = data;

        // Check slug uniqueness
        const existing = await RoleTemplate.findOne({ where: { slug } });
        if (existing) {
            throw new ApiError(HttpStatus.CONFLICT, `Role template with slug '${slug}' already exists`);
        }

        // Validate permission IDs exist
        if (permission_ids.length > 0) {
            const existingPermissions = await Permission.findAll({ where: { id: permission_ids } });
            if (existingPermissions.length !== permission_ids.length) {
                throw new ApiError(HttpStatus.BAD_REQUEST, 'Some permission IDs are invalid');
            }
        }

        // Validate plan_id if provided
        if (plan_id) {
            const plan = await Plan.findByPk(plan_id);
            if (!plan) {
                throw new ApiError(HttpStatus.BAD_REQUEST, 'Invalid plan ID');
            }
        }

        const template = await RoleTemplate.create({
            name,
            slug,
            description,
            tenant_type,
            role_type,
            plan_id,
            is_system,
            is_active,
            sort_order,
            permission_ids,
            metadata,
        });

        return this.findById(template.id);
    }

    /**
     * Update a role template
     */
    async update(id: string, data: UpdateRoleTemplateDto) {
        const template = await RoleTemplate.findByPk(id);
        if (!template) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Role template not found');
        }

        if (template.is_system && data.is_active === false) {
            throw new ApiError(HttpStatus.FORBIDDEN, 'Cannot deactivate system role template');
        }

        const { permission_ids, ...updateData } = data;

        // Check slug uniqueness if changing
        if (data.slug && data.slug !== template.slug) {
            const existing = await RoleTemplate.findOne({ where: { slug: data.slug } });
            if (existing) {
                throw new ApiError(HttpStatus.CONFLICT, `Role template with slug '${data.slug}' already exists`);
            }
        }

        // Validate permission IDs if provided
        if (permission_ids !== undefined && permission_ids.length > 0) {
            const existingPermissions = await Permission.findAll({ where: { id: permission_ids } });
            if (existingPermissions.length !== permission_ids.length) {
                throw new ApiError(HttpStatus.BAD_REQUEST, 'Some permission IDs are invalid');
            }
        }

        // Validate plan_id if provided
        if (data.plan_id) {
            const plan = await Plan.findByPk(data.plan_id);
            if (!plan) {
                throw new ApiError(HttpStatus.BAD_REQUEST, 'Invalid plan ID');
            }
        }

        await template.update({
            ...updateData,
            permission_ids: permission_ids !== undefined ? permission_ids : template.permission_ids,
        });

        // Mark JSONB as changed to ensure Sequelize persists
        if (permission_ids !== undefined) template.changed('permission_ids', true);
        await template.save();

        return this.findById(id);
    }

    /**
     * Delete a role template
     */
    async delete(id: string) {
        const template = await RoleTemplate.findByPk(id);
        if (!template) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Role template not found');
        }

        if (template.is_system) {
            throw new ApiError(HttpStatus.FORBIDDEN, 'Cannot delete system role template');
        }

        await template.destroy();
        return { message: 'Role template deleted successfully' };
    }

    /**
     * Duplicate a role template
     */
    async duplicate(id: string, newSlug: string) {
        const original = await RoleTemplate.findByPk(id);
        if (!original) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Role template not found');
        }

        return this.create({
            name: `${original.name} (Copy)`,
            slug: newSlug,
            description: original.description,
            tenant_type: original.tenant_type,
            role_type: original.role_type,
            plan_id: original.plan_id ?? undefined,
            is_system: false,
            is_active: true,
            sort_order: original.sort_order + 1,
            permission_ids: [...original.permission_ids],
            metadata: { ...original.metadata },
        });
    }

    /**
     * Get templates applicable for a specific tenant creation
     */
    async getTemplatesForTenant(planId: string, tenantType: string) {
        const templates = await RoleTemplate.findAll({
            where: {
                is_active: true,
                tenant_type: { [Op.in]: [tenantType, 'all'] },
                [Op.or]: [
                    { plan_id: planId },
                    { plan_id: null }
                ],
            },
            order: [['sort_order', 'ASC']],
        });

        return templates;
    }

    /**
     * Apply role templates to a tenant schema
     * Creates roles and assigns permissions from templates
     */
    async applyTemplatesToSchema(schemaName: string, templates: RoleTemplate[]) {
        const { Role } = require('../../../database/models/shared/core/Role.model');
        const { RolePermission } = require('../../../database/models/shared/core/RolePermission.model');

        const createdRoles: Record<string, any> = {};

        for (const template of templates) {
            // Create role in tenant schema
            const role = await Role.schema(schemaName).create({
                name: template.name,
                description: template.description,
                role_type: template.role_type,
                asset_type: template.asset_type || 'public',
                plan_id: template.plan_id,
                is_system: template.is_system,
            });

            createdRoles[template.slug] = role;

            // Assign permissions to role
            if (template.permission_ids?.length) {
                const permissionRecords = template.permission_ids.map((permissionId) => ({
                    role_id: role.id,
                    permission_id: permissionId,
                }));

                await RolePermission.schema(schemaName).bulkCreate(permissionRecords);
            }

            logger.info(`  ✓ Role '${template.name}' created with ${template.permission_ids?.length || 0} permissions`);
        }

        return createdRoles;
    }
}

export default new RoleTemplateService();
