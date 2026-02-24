import { Router } from 'express';

import { validate, validateParams, validateQuery } from '../../../../core/middleware/validate.middleware';
import { requirePermission } from '../../../../core/rbac/rbac.middleware';
import { registerReportsWorker } from '../processors/reports.processor';
import {
    downloadReport,
    getReportHistory,
    getReportStatus,
    getReportTypes,
    requestReport,
} from '../controllers/reports.controller';
import {
    ReportHistoryQuerySchema,
    ReportJobIdParamsSchema,
    RequestReportSchema,
} from '../validators/reports.validators';

const router = Router();

router.post(
    '/request',
    requirePermission('reports.create'),
    validate(RequestReportSchema),
    requestReport,
);

router.post(
    '/requests',
    requirePermission('reports.create'),
    validate(RequestReportSchema),
    requestReport,
);

router.get(
    '/status/:jobId',
    requirePermission('reports.view'),
    validateParams(ReportJobIdParamsSchema),
    getReportStatus,
);

router.get(
    '/requests/:jobId/status',
    requirePermission('reports.view'),
    validateParams(ReportJobIdParamsSchema),
    getReportStatus,
);

router.get(
    '/download/:jobId',
    requirePermission('reports.view'),
    validateParams(ReportJobIdParamsSchema),
    downloadReport,
);

router.get(
    '/requests/:jobId/download',
    requirePermission('reports.view'),
    validateParams(ReportJobIdParamsSchema),
    downloadReport,
);

router.get(
    '/history',
    requirePermission('reports.view'),
    validateQuery(ReportHistoryQuerySchema),
    getReportHistory,
);

router.get(
    '/types',
    requirePermission('reports.view'),
    getReportTypes,
);

export const reportsRouter = router;
export default reportsRouter;
export { registerReportsWorker };
