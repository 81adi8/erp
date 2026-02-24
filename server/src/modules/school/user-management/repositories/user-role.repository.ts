import { Transaction } from 'sequelize';
import { UserRole } from '../../../../database/models/shared/core/UserRole.model';
import { TenantContext } from '../../../tenant/types/tenant.types';

/**
 * UserRole Repository
 * 
 * Handles user-role assignments in tenant schema.
 * Part of repository extraction from UserManagementService.
 */

export interface AssignRoleDTO {
    userId: string;
    roleId: string;
    assignedBy: string;
    expiresAt?: Date;
    metadata?: Record<string, unknown>;
}

export interface UserRoleFilters {
    userId?: string;
    roleId?: string;
    assignedBy?: string;
    limit?: number;
    offset?: number;
}

export class UserRoleRepository {
    private static readonly DEFAULT_LIST_LIMIT = 100;
    private static readonly MAX_LIST_LIMIT = 500;
    private tenant: TenantContext;

    constructor(tenant: TenantContext) {
        this.tenant = tenant;
    }

    /**
     * Assign role to user
     */
    async assign(dto: AssignRoleDTO, tx?: Transaction): Promise<UserRole> {
        return UserRole.schema(this.tenant.db_schema).create({
            user_id: dto.userId,
            role_id: dto.roleId,
            assigned_by: dto.assignedBy,
            expires_at: dto.expiresAt,
            metadata: dto.metadata || {},
        }, { transaction: tx });
    }

    /**
     * Bulk assign roles to users
     */
    async bulkAssign(
        assignments: AssignRoleDTO[],
        tx?: Transaction
    ): Promise<UserRole[]> {
        const data = assignments.map(dto => ({
            user_id: dto.userId,
            role_id: dto.roleId,
            assigned_by: dto.assignedBy,
            expires_at: dto.expiresAt,
            metadata: dto.metadata || {},
        }));

        return UserRole.schema(this.tenant.db_schema).bulkCreate(data, { transaction: tx });
    }

    /**
     * Find user-role assignment by ID
     */
    async findById(userRoleId: string): Promise<UserRole | null> {
        return UserRole.schema(this.tenant.db_schema).findByPk(userRoleId);
    }

    /**
     * Find all roles for a user
     */
    async findByUser(userId: string): Promise<UserRole[]> {
        return UserRole.schema(this.tenant.db_schema).findAll({
            where: { user_id: userId }
        });
    }

    /**
     * Find all users with a specific role
     */
    async findByRole(roleId: string): Promise<UserRole[]> {
        return UserRole.schema(this.tenant.db_schema).findAll({
            where: { role_id: roleId }
        });
    }

    /**
     * Check if user has role
     */
    async hasRole(userId: string, roleId: string): Promise<boolean> {
        const count = await UserRole.schema(this.tenant.db_schema).count({
            where: { user_id: userId, role_id: roleId }
        });
        return count > 0;
    }

    /**
     * Remove role from user
     */
    async remove(userId: string, roleId: string, tx?: Transaction): Promise<void> {
        await UserRole.schema(this.tenant.db_schema).destroy({
            where: { user_id: userId, role_id: roleId },
            transaction: tx
        });
    }

    /**
     * Remove all roles from user
     */
    async removeAllFromUser(userId: string, tx?: Transaction): Promise<void> {
        await UserRole.schema(this.tenant.db_schema).destroy({
            where: { user_id: userId },
            transaction: tx
        });
    }

    /**
     * List user-role assignments with filtering
     */
    async list(filters: UserRoleFilters = {}) {
        const where: Record<string, unknown> = {};
        if (filters.userId) where.user_id = filters.userId;
        if (filters.roleId) where.role_id = filters.roleId;
        if (filters.assignedBy) where.assigned_by = filters.assignedBy;
        const safeLimit = Math.min(
            Math.max(1, Number(filters.limit) || UserRoleRepository.DEFAULT_LIST_LIMIT),
            UserRoleRepository.MAX_LIST_LIMIT
        );
        const safeOffset = Math.max(0, Number(filters.offset) || 0);

        return UserRole.schema(this.tenant.db_schema).findAll({
            where,
            order: [['created_at', 'DESC']],
            limit: safeLimit,
            offset: safeOffset
        });
    }
}

export default UserRoleRepository;
