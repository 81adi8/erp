import { Router } from "express";
import authRouter from "./auth.routes";
import adminManagementRouter from "./admin-management.routes";
import planRouter from "./plan.routes";
import accessBundleRouter from "./access-bundle.routes";
import accessControlRouter from "./access-control.routes";
import roleTemplateRouter from "./role-template.routes";
import systemConfigRouter from "./system-config.routes";
import globalHolidayRouter from "./global-holiday.routes";
// FIXED: Use rootAuthGuard instead of authGuard — root routes have no tenant
// context so authGuard always fails with 403 TENANT_INVALID on this chain.
import { rootAuthGuard } from "../../../../core/middleware/rootAuthGuard";
import { attachPlatformRBACContext } from '../../../../core/rbac/platform-rbac.middleware';
import { requirePermission as rbacRequirePermission } from '../../../../core/rbac/rbac.middleware';

const router = Router();

router.use('/auth', authRouter);

router.use(
    '/config',
    rootAuthGuard,
    attachPlatformRBACContext('root'),
    rbacRequirePermission('root.config.view'),
    systemConfigRouter
);

router.use(
    '/admins',
    rootAuthGuard,
    attachPlatformRBACContext('root'),
    rbacRequirePermission('root.auth.sessions.manage'),
    adminManagementRouter
);

router.use(
    '/plans',
    rootAuthGuard,
    attachPlatformRBACContext('root'),
    rbacRequirePermission('system.platform.manage'),
    planRouter
);

router.use(
    '/access-bundles',
    rootAuthGuard,
    attachPlatformRBACContext('root'),
    rbacRequirePermission('system.platform.manage'),
    accessBundleRouter
);

router.use(
    '/access-control',
    rootAuthGuard,
    attachPlatformRBACContext('root'),
    rbacRequirePermission('root.config.manage'),
    accessControlRouter
);

router.use(
    '/role-templates',
    rootAuthGuard,
    attachPlatformRBACContext('root'),
    rbacRequirePermission('root.config.manage'),
    roleTemplateRouter
);

router.use(
    '/global-holidays',
    rootAuthGuard,
    attachPlatformRBACContext('root'),
    rbacRequirePermission('root.config.manage'),
    globalHolidayRouter
);

export default router;
