import { Transaction, Op } from 'sequelize';
import { User } from '../../../../database/models/shared/core/User.model';
import { TenantContext } from '../../../tenant/types/tenant.types';

/**
 * User Repository
 * 
 * Handles all user data access in tenant schema.
 * Part of repository extraction from UserManagementService.
 * 
 * FUTURE: Move to shared module (users are cross-cutting)
 */

export interface CreateUserDTO {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    passwordHash: string;
    keycloakId: string;
    institutionId: string;
    userType: string;
    createdBy: string;
    metadata?: Record<string, unknown>;
    isActive?: boolean;
    isEmailVerified?: boolean;
}

export interface UpdateUserDTO extends Partial<CreateUserDTO> {}

export interface UserFilters {
    email?: string;
    userType?: string;
    isActive?: boolean;
    institutionId?: string;
}

export class UserRepository {
    private tenant: TenantContext;

    constructor(tenant: TenantContext) {
        this.tenant = tenant;
    }

    /**
     * Create a new user in tenant schema
     */
    async create(dto: CreateUserDTO, tx?: Transaction): Promise<User> {
        return User.schema(this.tenant.db_schema).create({
            email: dto.email.toLowerCase(),
            first_name: dto.firstName,
            last_name: dto.lastName,
            phone: dto.phone,
            password_hash: dto.passwordHash,
            keycloak_id: dto.keycloakId,
            institution_id: dto.institutionId,
            user_type: dto.userType,
            created_by: dto.createdBy,
            metadata: dto.metadata || {},
            is_active: dto.isActive ?? true,
            is_email_verified: dto.isEmailVerified ?? true,
        }, { transaction: tx });
    }

    /**
     * Find user by email (case-insensitive)
     */
    async findByEmail(email: string): Promise<User | null> {
        return User.schema(this.tenant.db_schema).findOne({
            where: { email: email.toLowerCase() }
        });
    }

    /**
     * Find user by ID
     */
    async findById(userId: string): Promise<User | null> {
        return User.schema(this.tenant.db_schema).findByPk(userId);
    }

    /**
     * Find user by Keycloak ID
     */
    async findByKeycloakId(keycloakId: string): Promise<User | null> {
        return User.schema(this.tenant.db_schema).findOne({
            where: { keycloak_id: keycloakId }
        });
    }

    /**
     * Update user
     */
    async update(userId: string, dto: UpdateUserDTO, tx?: Transaction): Promise<void> {
        await User.schema(this.tenant.db_schema).update({
            email: dto.email?.toLowerCase(),
            first_name: dto.firstName,
            last_name: dto.lastName,
            phone: dto.phone,
            password_hash: dto.passwordHash,
            keycloak_id: dto.keycloakId,
            institution_id: dto.institutionId,
            user_type: dto.userType,
            metadata: dto.metadata,
            is_active: dto.isActive,
            is_email_verified: dto.isEmailVerified,
        }, {
            where: { id: userId },
            transaction: tx
        });
    }

    /**
     * Soft deactivate user (set is_active = false)
     */
    async deactivate(userId: string): Promise<void> {
        await User.schema(this.tenant.db_schema).update(
            { is_active: false },
            { where: { id: userId } }
        );
    }

    /**
     * Hard delete user (use with caution)
     */
    async delete(userId: string, tx?: Transaction): Promise<void> {
        await User.schema(this.tenant.db_schema).destroy({
            where: { id: userId },
            transaction: tx
        });
    }

    /**
     * Check if user exists by email
     */
    async existsByEmail(email: string): Promise<boolean> {
        const count = await User.schema(this.tenant.db_schema).count({
            where: { email: email.toLowerCase() }
        });
        return count > 0;
    }

    /**
     * List users with filtering and pagination
     */
    async list(filters: UserFilters = {}, options: { page?: number; limit?: number } = {}) {
        const { page = 1, limit = 50 } = options;
        
        const where: Record<string, unknown> = {};
        if (filters.email) where.email = filters.email.toLowerCase();
        if (filters.userType) where.user_type = filters.userType;
        if (filters.isActive !== undefined) where.is_active = filters.isActive;
        if (filters.institutionId) where.institution_id = filters.institutionId;

        return User.schema(this.tenant.db_schema).findAndCountAll({
            where,
            limit,
            offset: (page - 1) * limit,
            order: [['created_at', 'DESC']],
            attributes: ['id', 'email', 'first_name', 'last_name', 'user_type', 'is_active', 'created_at', 'keycloak_id'],
        });
    }
}

export default UserRepository;
