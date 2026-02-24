/**
 * School Dashboard Stats Route
 *
 * REFACTORED: Raw SQL moved to dashboard.service.ts
 * Route now follows Route -> Controller pattern.
 */
import { Router } from 'express';

import { validateRequest } from '../../../../core/middleware/validation.middleware';
import { requirePermission } from '../../../../core/rbac/rbac.middleware';
import { getDashboardStats } from '../controllers/dashboard.controller';
import { DashboardStatsQuerySchema } from '../validators';

const router = Router();

/**
 * GET /school/dashboard/stats
 * Returns aggregated stats for the school dashboard.
 * Tenant-scoped via schema from request context.
 *
 * RBAC: Requires 'dashboard.view' permission
 */
router.get('/stats',
    requirePermission('dashboard.view'),
    validateRequest({ query: DashboardStatsQuerySchema }),
    getDashboardStats,
);

export default router;
