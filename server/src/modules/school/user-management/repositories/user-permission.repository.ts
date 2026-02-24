import { Transaction, Op } from 'sequelize';
import { UserPermission } from '../../../../database/models/shared/core/UserPermission.model';
import { TenantContext } from '../../../tenant/types/tenant.types';

/**
 * UserPermission Repository
 * 
 * Handles user-specific permission overrides in tenant schema.
 * Part of repository extraction from UserManagementService.
 * 
 * Note: User permissions are assigned ON TOP OF role permissions.
 * These represent user-specific overrides, not the full permission set.
 */

export interface GrantPermissionDTO {
    userId: string;
    permissionId: string;
    permissionKey: string;
    grantedBy: string;
    expiresAt?: Date;
    reason?: string;
    metadata?: Record<string, unknown>;
}

export interface PermissionFilters {
    userId?: string;
    permissionKey?: string;
    grantedBy?: string;
    isExpired?: boolean;
}

export class UserPermissionRepository {
    private tenant: TenantContext;

    constructor(tenant: TenantContext) {
        this.tenant = tenant;
    }

    /**
     * Grant permission to user
     */
    async grant(dto: GrantPermissionDTO, tx?: Transaction): Promise<UserPermission> {
        return UserPermission.schema(this.tenant.db_schema).create({
            user_id: dto.userId,
            permission_id: dto.permissionId,
            permission_key: dto.permissionKey,
            granted_by: dto.grantedBy,
            expires_at: dto.expiresAt,
            reason: dto.reason,
            metadata: dto.metadata || {},
        }, { transaction: tx });
    }

    /**
     * Bulk grant permissions to user
     */
    async bulkGrant(
        userId: string,
        permissions: Array<{
            permissionId: string;
            permissionKey: string;
            grantedBy: string;
        }>,
        tx?: Transaction
    ): Promise<UserPermission[]> {
        const data = permissions.map(p => ({
            user_id: userId,
            permission_id: p.permissionId,
            permission_key: p.permissionKey,
            granted_by: p.grantedBy,
        }));

        return UserPermission.schema(this.tenant.db_schema).bulkCreate(data, { transaction: tx });
    }

    /**
     * Find permission assignment by ID
     */
    async findById(permissionId: string): Promise<UserPermission | null> {
        return UserPermission.schema(this.tenant.db_schema).findByPk(permissionId);
    }

    /**
     * Find all permissions for a user
     */
    async findByUser(userId: string): Promise<UserPermission[]> {
        return UserPermission.schema(this.tenant.db_schema).findAll({
            where: { user_id: userId }
        });
    }

    /**
     * Get permission keys for a user
     */
    async getPermissionKeys(userId: string): Promise<string[]> {
        const permissions = await UserPermission.schema(this.tenant.db_schema).findAll({
            where: { user_id: userId },
            attributes: ['permission_key']
        });
        return permissions.map(p => p.permission_key);
    }

    /**
     * Check if user has specific permission
     */
    async hasPermission(userId: string, permissionKey: string): Promise<boolean> {
        const count = await UserPermission.schema(this.tenant.db_schema).count({
            where: { 
                user_id: userId, 
                permission_key: permissionKey,
                [Op.or]: [
                    { expires_at: null },
                    { expires_at: { [Op.gt]: new Date() } }
                ]
            }
        });
        return count > 0;
    }

    /**
     * Revoke permission from user
     */
    async revoke(userId: string, permissionKey: string, tx?: Transaction): Promise<void> {
        await UserPermission.schema(this.tenant.db_schema).destroy({
            where: { user_id: userId, permission_key: permissionKey },
            transaction: tx
        });
    }

    /**
     * Revoke all permissions from user
     */
    async revokeAll(userId: string, tx?: Transaction): Promise<void> {
        await UserPermission.schema(this.tenant.db_schema).destroy({
            where: { user_id: userId },
            transaction: tx
        });
    }

    /**
     * List permission assignments with filtering
     */
    async list(filters: PermissionFilters = {}) {
        const where: Record<PropertyKey, unknown> = {};
        
        if (filters.userId) where.user_id = filters.userId;
        if (filters.permissionKey) where.permission_key = filters.permissionKey;
        if (filters.grantedBy) where.granted_by = filters.grantedBy;
        
        if (filters.isExpired !== undefined) {
            if (filters.isExpired) {
                where.expires_at = { [Op.lt]: new Date() };
            } else {
                where[Op.or] = [
                    { expires_at: null },
                    { expires_at: { [Op.gt]: new Date() } }
                ];
            }
        }

        return UserPermission.schema(this.tenant.db_schema).findAll({
            where,
            order: [['created_at', 'DESC']]
        });
    }

    /**
     * Clean up expired permissions
     */
    async cleanupExpired(): Promise<number> {
        const result = await UserPermission.schema(this.tenant.db_schema).destroy({
            where: {
                expires_at: { [Op.lt]: new Date() }
            }
        });
        return result;
    }
}

export default UserPermissionRepository;
