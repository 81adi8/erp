import { Transaction } from 'sequelize';
import { TenantRoleConfig } from '../../../database/models/shared/core/TenantRoleConfig.model';
import { TenantContext } from '../../tenant/types/tenant.types';

/**
 * TenantRoleConfig Repository
 * 
 * Handles tenant role configuration data access.
 * Part of repository extraction from UserManagementService.
 * 
 * TenantRoleConfig defines default roles and minimal permissions
 * for each user type in a tenant.
 */

export interface CreateTenantRoleConfigDTO {
    userType: string;
    defaultRoleId: string;
    isSystemRole?: boolean;
    roleSlug?: string;
    planId?: string;
    changedBy?: string;
    metadata?: Record<string, unknown>;
}

export class TenantRoleConfigRepository {
    private static readonly DEFAULT_LIST_LIMIT = 100;
    private static readonly MAX_LIST_LIMIT = 500;
    private tenant: TenantContext;

    constructor(tenant: TenantContext) {
        this.tenant = tenant;
    }

    /**
     * Create tenant role configuration
     */
    async create(dto: CreateTenantRoleConfigDTO, tx?: Transaction): Promise<TenantRoleConfig> {
        return TenantRoleConfig.schema(this.tenant.db_schema).create({
            user_type: dto.userType,
            default_role_id: dto.defaultRoleId,
            is_system_role: dto.isSystemRole ?? true,
            role_slug: dto.roleSlug,
            plan_id: dto.planId,
            changed_by: dto.changedBy,
            metadata: dto.metadata || {},
        }, { transaction: tx });
    }

    /**
     * Find config by user type
     */
    async findByUserType(userType: string): Promise<TenantRoleConfig | null> {
        return TenantRoleConfig.schema(this.tenant.db_schema).findOne({
            where: { user_type: userType, is_active: true }
        });
    }

    /**
     * Find config by ID
     */
    async findById(configId: string): Promise<TenantRoleConfig | null> {
        return TenantRoleConfig.schema(this.tenant.db_schema).findByPk(configId);
    }

    /**
     * Get default role ID for user type
     * Returns null if no config exists
     */
    async getDefaultRoleId(userType: string): Promise<string | null> {
        const config = await this.findByUserType(userType);
        return config?.default_role_id || null;
    }

    /**
     * Update config
     */
    async update(
        configId: string,
        dto: Partial<CreateTenantRoleConfigDTO>,
        tx?: Transaction
    ): Promise<void> {
        await TenantRoleConfig.schema(this.tenant.db_schema).update({
            user_type: dto.userType,
            default_role_id: dto.defaultRoleId,
            is_system_role: dto.isSystemRole,
            role_slug: dto.roleSlug,
            plan_id: dto.planId,
            changed_by: dto.changedBy,
            metadata: dto.metadata,
        }, {
            where: { id: configId },
            transaction: tx
        });
    }

    /**
     * Delete config
     */
    async delete(configId: string, tx?: Transaction): Promise<void> {
        await TenantRoleConfig.schema(this.tenant.db_schema).destroy({
            where: { id: configId },
            transaction: tx
        });
    }

    /**
     * List all configs
     */
    async list(
        activeOnly: boolean = true,
        options: { limit?: number; offset?: number } = {}
    ) {
        const where: Record<string, unknown> = {};
        if (activeOnly) where.is_active = true;
        const safeLimit = Math.min(
            Math.max(1, Number(options.limit) || TenantRoleConfigRepository.DEFAULT_LIST_LIMIT),
            TenantRoleConfigRepository.MAX_LIST_LIMIT
        );
        const safeOffset = Math.max(0, Number(options.offset) || 0);

        return TenantRoleConfig.schema(this.tenant.db_schema).findAll({
            where,
            order: [['user_type', 'ASC']],
            limit: safeLimit,
            offset: safeOffset
        });
    }

    /**
     * Upsert config (create or update)
     */
    async upsert(
        userType: string,
        dto: Partial<CreateTenantRoleConfigDTO>,
        tx?: Transaction
    ): Promise<TenantRoleConfig> {
        const [config] = await TenantRoleConfig.schema(this.tenant.db_schema).findOrCreate({
            where: { user_type: userType },
            defaults: {
                user_type: userType,
                default_role_id: dto.defaultRoleId || '',
                is_system_role: dto.isSystemRole ?? true,
                role_slug: dto.roleSlug,
                plan_id: dto.planId,
                changed_by: dto.changedBy,
                metadata: dto.metadata || {},
            },
            transaction: tx
        });

        // If found (not created), update it
        if (dto.defaultRoleId || dto.isSystemRole !== undefined || dto.roleSlug || dto.planId) {
            await this.update(config.id, dto, tx);
            return config.reload();
        }

        return config;
    }
}

export default TenantRoleConfigRepository;
