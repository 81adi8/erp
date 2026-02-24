import { Op, WhereOptions } from 'sequelize';
import { AuditLog } from '../../../database/models/shared/core/AuditLog.model';

export type DataAuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface DataAuditQuery {
    action?: DataAuditAction;
    tableName?: string;
    recordId?: string;
    userId?: string;
    userRole?: string;
    from?: Date | string;
    to?: Date | string;
    page?: number;
    limit?: number;
}

export interface DataAuditResult {
    logs: AuditLog[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export class DataAuditService {
    /**
     * Query tenant-scoped data-change audit logs.
     */
    static async query(
        schemaName: string,
        institutionId: string,
        query: DataAuditQuery = {}
    ): Promise<DataAuditResult> {
        const {
            action,
            tableName,
            recordId,
            userId,
            userRole,
            from,
            to,
            page = 1,
            limit = 50,
        } = query;

        const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
        const safePage = Math.max(Number(page) || 1, 1);

        const where: WhereOptions = {
            institution_id: institutionId,
            table_name: { [Op.not]: null },
        };

        if (action) where.action = action;
        if (tableName) where.table_name = tableName;
        if (recordId) where.record_id = recordId;
        if (userId) where.user_id = userId;
        if (userRole) where.user_role = userRole;

        if (from || to) {
            const createdAtFilter: Record<symbol, Date> = {};
            if (from) createdAtFilter[Op.gte] = new Date(from);
            if (to) createdAtFilter[Op.lte] = new Date(to);
            where.created_at = createdAtFilter;
        }

        const { rows, count } = await AuditLog.schema(schemaName).findAndCountAll({
            where,
            order: [['created_at', 'DESC']],
            limit: safeLimit,
            offset: (safePage - 1) * safeLimit,
        });

        return {
            logs: rows,
            pagination: {
                page: safePage,
                limit: safeLimit,
                total: count,
                totalPages: Math.ceil(count / safeLimit),
            },
        };
    }

    /**
     * Convenience helper to fetch full change history for a single record.
     */
    static async getRecordHistory(
        schemaName: string,
        institutionId: string,
        tableName: string,
        recordId: string,
        limit: number = 100
    ): Promise<AuditLog[]> {
        const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);

        return AuditLog.schema(schemaName).findAll({
            where: {
                institution_id: institutionId,
                table_name: tableName,
                record_id: recordId,
            },
            order: [['created_at', 'DESC']],
            limit: safeLimit,
        });
    }
}

export default DataAuditService;

