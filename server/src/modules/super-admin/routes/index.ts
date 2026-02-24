import { Router } from 'express';

import { TenantController } from '../controllers/tenant.controller';
import { rootAuthMiddleware } from '../../../core/middleware/rootAuth.middleware';
import { attachPlatformRBACContext } from '../../../core/rbac/platform-rbac.middleware';
import { requirePermission as rbacRequirePermission } from '../../../core/rbac/rbac.middleware';
import rootAdminRouter from './root-admin';
import institutionRouter from './institutions';
// FIXED: Added dashboard router — frontend calls /dashboard/stats and /dashboard/health
// which were absent, causing mock fallback in DashboardPage.tsx.
import dashboardRouter from './dashboard';

const router = Router();

// Root Admin Routes (Internal)
router.use('/', rootAdminRouter);

// Tenant Management (Infrastructure Level)
router.use(
    '/institutions',
    rootAuthMiddleware,
    attachPlatformRBACContext('root'),
    rbacRequirePermission('root.institutions.manage'),
    institutionRouter
);

router.post(
    '/tenants',
    rootAuthMiddleware,
    attachPlatformRBACContext('root'),
    rbacRequirePermission('root.tenants.manage'),
    TenantController.create
);

// FIXED: Super-admin dashboard stats & health endpoints
// Protected by rootAuthMiddleware — root admin only.
router.use(
    '/dashboard',
    rootAuthMiddleware,
    attachPlatformRBACContext('root'),
    dashboardRouter
);

export default router;
