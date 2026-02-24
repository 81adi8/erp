import { Router } from 'express';
import { RootAuthController } from '../../controllers/root/auth.controller';
// FIXED: Use rootAuthGuard — root routes have no tenant context, authGuard
// would always fail with 403 TENANT_INVALID on this chain.
import { rootAuthGuard } from '../../../../core/middleware/rootAuthGuard';
import { attachPlatformRBACContext } from '../../../../core/rbac/platform-rbac.middleware';
import { requirePermission as rbacRequirePermission } from '../../../../core/rbac/rbac.middleware';

const adminRouter = Router();
const controller = new RootAuthController();

adminRouter.post('/login', controller.login);
adminRouter.post('/refresh', controller.refresh);

// Protected operational auth surface (RBAC-only)
adminRouter.use(
    rootAuthGuard,
    attachPlatformRBACContext('root'),
    rbacRequirePermission('root.auth.sessions.manage')
);

adminRouter.post('/2fa/setup', controller.setup2FA);
adminRouter.post('/2fa/verify', controller.verify2FA);
adminRouter.post('/2fa/disable', controller.disable2FA);

adminRouter.get('/sessions', controller.getSessions);
adminRouter.delete('/sessions/:sessionId', controller.revokeSession);
adminRouter.post('/logout', controller.logout);

export default adminRouter;

