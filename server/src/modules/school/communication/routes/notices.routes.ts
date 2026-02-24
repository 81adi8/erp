/**
 * Notices / Announcements Routes
 * DB table: notices
 * 
 * SECURITY: Authentication handled at app.ts level via keycloakOidcMiddleware
 * DO NOT add authGuard here - it would create auth collision (both JWT and Keycloak)
 */
import { Router } from 'express';
import { requirePermission } from '../../../../core/rbac/rbac.middleware';
import { validateRequest } from '../../../../core/middleware/validation.middleware';
import {
    createNoticeSchema,
    updateNoticeSchema,
    noticeIdSchema,
    noticeQuerySchema,
} from '../validators/communication.validators';
import { noticesController } from '../controllers/notices.controller';

const router = Router();

router.get(
    '/',
    requirePermission('notices.view'),
    validateRequest(noticeQuerySchema.shape),
    noticesController.getPublished,
);

router.get(
    '/all',
    requirePermission('notices.manage'),
    noticesController.getAll,
);

router.get(
    '/:id',
    requirePermission('notices.view'),
    validateRequest(noticeIdSchema.shape),
    noticesController.getById,
);

router.post(
    '/',
    requirePermission('notices.manage'),
    validateRequest(createNoticeSchema.shape),
    noticesController.create,
);

router.patch(
    '/:id',
    requirePermission('notices.manage'),
    validateRequest(updateNoticeSchema.shape),
    noticesController.update,
);

router.delete(
    '/:id',
    requirePermission('notices.manage'),
    validateRequest(noticeIdSchema.shape),
    noticesController.delete,
);

export const noticeRouter = router;
export default noticeRouter;
