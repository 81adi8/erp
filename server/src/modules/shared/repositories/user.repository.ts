import { Transaction } from 'sequelize';
import { User } from '../../../database/models/shared/core/User.model';
import type { TenantIdentity } from '../../../core/tenant/tenant-identity';
import { TenantShadowTelemetry } from '../../../core/tenant/tenant-shadow.telemetry';
import { ApiError } from '../../../core/http/ApiError';

export interface CreateUserDTO {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    passwordHash?: string;
    keycloakId?: string;
    role?: string;
    institutionId?: string;
    metadata?: Record<string, unknown>;
}

export interface UpdateUserDTO {
    firstName?: string;
    lastName?: string;
    phone?: string;
    isActive?: boolean;
    metadata?: Record<string, unknown>;
}

/**
 * User Repository
 * 
 * MANDATORY: Requires TenantIdentity for all operations.
 * No fallback schema - fails closed if tenant not provided.
 */
export class UserRepository {

    private tenant: TenantIdentity;

    constructor(tenant: TenantIdentity) {
        if (!tenant || !tenant.db_schema) {
            TenantShadowTelemetry.repoUnscopedWrite({
                repository: 'shared.user.repository',
                operation: 'constructor',
                reason: 'tenant_or_schema_missing',
            });
            throw ApiError.internal('TENANT_SCOPE_VIOLATION: UserRepository requires valid TenantIdentity');
        }
        this.tenant = tenant;
    }

    private getSchema(): string {
        // NO FALLBACK - schema must exist from constructor
        return this.tenant.db_schema;
    }

    async findById(id: string): Promise<User | null> {
        return User.schema(this.getSchema()).findByPk(id);
    }

    async findByEmail(email: string): Promise<User | null> {
        return User.schema(this.getSchema()).findOne({
            where: { email: email.toLowerCase() }
        });
    }

    async create(dto: CreateUserDTO, tx?: Transaction): Promise<User> {
        return User.schema(this.getSchema()).create({
            email: dto.email.toLowerCase(),
            first_name: dto.firstName,
            last_name: dto.lastName,
            phone: dto.phone,
            password_hash: dto.passwordHash,
            keycloak_id: dto.keycloakId,
            role: dto.role,
            institution_id: dto.institutionId,
            metadata: dto.metadata,
            is_active: true,
            is_email_verified: false,
            is_phone_verified: false,
        }, { transaction: tx });
    }

    async update(id: string, dto: UpdateUserDTO, tx?: Transaction): Promise<User | null> {
        const user = await this.findById(id);
        if (!user) return null;

        await user.update({
            first_name: dto.firstName,
            last_name: dto.lastName,
            phone: dto.phone,
            is_active: dto.isActive,
            metadata: dto.metadata,
        }, { transaction: tx });

        return user;
    }

    async delete(id: string, tx?: Transaction): Promise<boolean> {
        const user = await this.findById(id);
        if (!user) return false;

        await user.destroy({ transaction: tx });
        return true;
    }

    async findAll(query: { limit?: number; offset?: number; search?: string }) {
        const { limit = 20, offset = 0, search } = query;

        const where: Record<string, unknown> = {};
        if (search) {
            const { Op } = require('sequelize');
            where[Op.or] = [
                { email: { [Op.iLike]: `%${search}%` } },
                { first_name: { [Op.iLike]: `%${search}%` } },
                { last_name: { [Op.iLike]: `%${search}%` } },
            ];
        }

        return User.schema(this.getSchema()).findAndCountAll({
            where,
            limit,
            offset,
            order: [['created_at', 'DESC']],
        });
    }

    async deactivate(userId: string): Promise<void> {
        await User.schema(this.getSchema()).update(
            { is_active: false },
            { where: { id: userId } }
        );
    }

    async list(options: { userType?: string; isActive?: boolean; page?: number; limit?: number }) {
        const { userType, isActive = true, page = 1, limit = 50 } = options;
        const offset = (page - 1) * limit;

        const where: Record<string, unknown> = { is_active: isActive };
        if (userType) {
            where.role = userType;
        }

        const { count, rows } = await User.schema(this.getSchema()).findAndCountAll({
            where,
            limit,
            offset,
            order: [['created_at', 'DESC']],
        });

        return { rows, count };
    }
}