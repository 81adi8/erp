import { Request, Response } from 'express';

import { logger } from '../../../../core/utils/logger';
import { dashboardService } from '../services/dashboard.service';

type TenantRequest = Request & {
    tenant?: {
        db_schema?: string;
        id?: string;
    };
};

const sendSuccess = (res: Response, data: unknown, message: string, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        errors: [],
    });
};

const sendError = (res: Response, message: string, statusCode = 500, errors: string[] = []) => {
    return res.status(statusCode).json({
        success: false,
        message,
        data: null,
        errors,
    });
};

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const typedReq = req as TenantRequest;
        const schema = typedReq.tenant?.db_schema;
        const tenantId = typedReq.tenant?.id;

        if (!schema) {
            return sendError(res, 'Tenant context missing', 400, ['TENANT_CONTEXT_MISSING']);
        }

        const today = (req.query.date as string) || new Date().toISOString().split('T')[0];
        const stats = await dashboardService.getStats(tenantId || schema, schema, today);

        return sendSuccess(res, stats, 'Dashboard stats fetched successfully');
    } catch (err) {
        logger.error('[Dashboard] Stats error:', err);
        return sendError(res, 'Failed to load dashboard stats', 500, ['DASHBOARD_STATS_FETCH_FAILED']);
    }
};
