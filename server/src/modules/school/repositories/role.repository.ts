import { Transaction } from 'sequelize';
import { Role } from '../../../database/models/shared/core/Role.model';
import { TenantContext } from '../../tenant/types/tenant.types';

/**
 * Role Repository
 * 
 * Handles role data access in tenant schema.
 * Part of repository extraction from UserManagementService.
 */

export interface CreateRoleDTO {
    name: string;
    description?: string;
    roleType: string;
    isSystem?: boolean;
    assetType?: string;
    permissions?: string[];
    metadata?: Record<string, unknown>;
}

export interface RoleFilters {
    roleType?: string;
    isSystem?: boolean;
    name?: string;
    limit?: number;
    offset?: number;
}

export class RoleRepository {
    private static readonly DEFAULT_LIST_LIMIT = 100;
    private static readonly MAX_LIST_LIMIT = 500;
    private tenant: TenantContext;

    constructor(tenant: TenantContext) {
        this.tenant = tenant;
    }

    /**
     * Create a new role
     */
    async create(dto: CreateRoleDTO, tx?: Transaction): Promise<Role> {
        return Role.schema(this.tenant.db_schema).create({
            name: dto.name,
            description: dto.description,
            role_type: dto.roleType,
            is_system: dto.isSystem ?? false,
            asset_type: dto.assetType || 'custom',
            permissions: dto.permissions || [],
            metadata: dto.metadata || {},
        }, { transaction: tx });
    }

    /**
     * Find role by ID
     */
    async findById(roleId: string): Promise<Role | null> {
        return Role.schema(this.tenant.db_schema).findByPk(roleId);
    }

    /**
     * Find role by type
     */
    async findByType(roleType: string): Promise<Role | null> {
        return Role.schema(this.tenant.db_schema).findOne({
            where: { role_type: roleType }
        });
    }

    /**
     * Find or create role by type
     * Returns [role, created] tuple
     */
    async findOrCreateByType(
        roleType: string,
        defaults: Partial<CreateRoleDTO>,
        tx?: Transaction
    ): Promise<[Role, boolean]> {
        return Role.schema(this.tenant.db_schema).findOrCreate({
            where: { role_type: roleType },
            defaults: {
                name: defaults.name || roleType.charAt(0).toUpperCase() + roleType.slice(1),
                description: defaults.description || `Default ${roleType} role`,
                role_type: roleType,
                is_system: defaults.isSystem ?? false,
                asset_type: defaults.assetType || 'custom',
                permissions: defaults.permissions || [],
                metadata: defaults.metadata || {},
            },
            transaction: tx
        });
    }

    /**
     * List roles with filtering
     */
    async list(filters: RoleFilters = {}) {
        const where: Record<string, unknown> = {};
        if (filters.roleType) where.role_type = filters.roleType;
        if (filters.isSystem !== undefined) where.is_system = filters.isSystem;
        if (filters.name) where.name = filters.name;
        const safeLimit = Math.min(
            Math.max(1, Number(filters.limit) || RoleRepository.DEFAULT_LIST_LIMIT),
            RoleRepository.MAX_LIST_LIMIT
        );
        const safeOffset = Math.max(0, Number(filters.offset) || 0);

        return Role.schema(this.tenant.db_schema).findAll({
            where,
            order: [['created_at', 'DESC']],
            limit: safeLimit,
            offset: safeOffset
        });
    }

    /**
     * Update role
     */
    async update(roleId: string, dto: Partial<CreateRoleDTO>, tx?: Transaction): Promise<void> {
        await Role.schema(this.tenant.db_schema).update({
            name: dto.name,
            description: dto.description,
            role_type: dto.roleType,
            is_system: dto.isSystem,
            asset_type: dto.assetType,
            permissions: dto.permissions,
            metadata: dto.metadata,
        }, {
            where: { id: roleId },
            transaction: tx
        });
    }

    /**
     * Delete role
     */
    async delete(roleId: string, tx?: Transaction): Promise<void> {
        await Role.schema(this.tenant.db_schema).destroy({
            where: { id: roleId },
            transaction: tx
        });
    }
}

export default RoleRepository;
