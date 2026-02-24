import { AuditLog } from '../../../database/models/shared/core/AuditLog.model';
import { Request } from 'express';
import { Op } from 'sequelize';
import { logger } from '../../../core/utils/logger';

/**
 * Audit Action Types for User Management
 */
export const AuditActions = {
    // User Management
    USER_CREATED: 'USER_CREATED',
    USER_UPDATED: 'USER_UPDATED',
    USER_DEACTIVATED: 'USER_DEACTIVATED',
    USER_BULK_CREATED: 'USER_BULK_CREATED',

    // Permission Management
    PERMISSIONS_ASSIGNED: 'PERMISSIONS_ASSIGNED',
    PERMISSIONS_REVOKED: 'PERMISSIONS_REVOKED',

    // Role Management
    ROLE_ASSIGNED: 'ROLE_ASSIGNED',
    ROLE_REMOVED: 'ROLE_REMOVED',

    // Authentication
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILED: 'LOGIN_FAILED',
    LOGOUT: 'LOGOUT',
    PASSWORD_RESET: 'PASSWORD_RESET',
} as const;

export type AuditAction = typeof AuditActions[keyof typeof AuditActions];

export interface AuditMeta {
    targetUserId?: string;
    targetUserEmail?: string;
    userType?: string;
    roleId?: string;
    roleName?: string;
    permissionKeys?: string[];
    bulkCount?: number;
    successCount?: number;
    failedCount?: number;
    additionalInfo?: Record<string, any>;
}

/**
 * Audit Log Service
 * Centralized logging for all user management operations
 */
export class AuditLogService {

    /**
     * Log an audit event
     */
    static async log(
        schemaName: string,
        action: AuditAction,
        performedByUserId: string,
        meta: AuditMeta = {},
        req?: Request
    ): Promise<void> {
        try {
            await AuditLog.schema(schemaName).create({
                user_id: performedByUserId,
                action,
                meta: {
                    ...meta,
                    timestamp: new Date().toISOString(),
                },
                ip: req ? (req.ip || req.headers['x-forwarded-for'] || 'unknown') : undefined,
                user_agent: req ? req.headers['user-agent'] : undefined,
            });
        } catch (error) {
            // Don't throw - audit logging should not break main operations
            logger.error('[AuditLogService] Failed to log audit event:', error);
        }
    }

    /**
     * Log user creation
     */
    static async logUserCreated(
        schemaName: string,
        adminUserId: string,
        targetUserId: string,
        targetUserEmail: string,
        userType: string,
        req?: Request
    ): Promise<void> {
        await this.log(schemaName, AuditActions.USER_CREATED, adminUserId, {
            targetUserId,
            targetUserEmail,
            userType,
        }, req);
    }

    /**
     * Log user deactivation
     */
    static async logUserDeactivated(
        schemaName: string,
        adminUserId: string,
        targetUserId: string,
        targetUserEmail: string,
        req?: Request
    ): Promise<void> {
        await this.log(schemaName, AuditActions.USER_DEACTIVATED, adminUserId, {
            targetUserId,
            targetUserEmail,
        }, req);
    }

    /**
     * Log bulk user creation
     */
    static async logBulkUserCreated(
        schemaName: string,
        adminUserId: string,
        userType: string,
        successCount: number,
        failedCount: number,
        req?: Request
    ): Promise<void> {
        await this.log(schemaName, AuditActions.USER_BULK_CREATED, adminUserId, {
            userType,
            bulkCount: successCount + failedCount,
            successCount,
            failedCount,
        }, req);
    }

    /**
     * Log permission assignment
     */
    static async logPermissionsAssigned(
        schemaName: string,
        adminUserId: string,
        targetUserId: string,
        permissionKeys: string[],
        req?: Request
    ): Promise<void> {
        await this.log(schemaName, AuditActions.PERMISSIONS_ASSIGNED, adminUserId, {
            targetUserId,
            permissionKeys,
        }, req);
    }

    /**
     * Log role assignment
     */
    static async logRoleAssigned(
        schemaName: string,
        adminUserId: string,
        targetUserId: string,
        roleId: string,
        roleName: string,
        req?: Request
    ): Promise<void> {
        await this.log(schemaName, AuditActions.ROLE_ASSIGNED, adminUserId, {
            targetUserId,
            roleId,
            roleName,
        }, req);
    }

    /**
     * Get audit logs for admin review
     */
    static async getAuditLogs(
        schemaName: string,
        options: {
            action?: AuditAction;
            userId?: string;
            startDate?: Date;
            endDate?: Date;
            page?: number;
            limit?: number;
        } = {}
    ) {
        const { action, userId, startDate, endDate, page = 1, limit = 50 } = options;

        const where: Record<PropertyKey, unknown> = {};
        if (action) where.action = action;
        if (userId) where.user_id = userId;
        if (startDate || endDate) {
            const createdAt: Record<symbol, Date> = {};
            if (startDate) createdAt[Op.gte] = startDate;
            if (endDate) createdAt[Op.lte] = endDate;
            where.created_at = createdAt;
        }

        const { rows, count } = await AuditLog.schema(schemaName).findAndCountAll({
            where,
            limit,
            offset: (page - 1) * limit,
            order: [['created_at', 'DESC']],
        });

        return {
            logs: rows,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit),
            }
        };
    }
}

export default AuditLogService;
