/**
 * Parent Portal Routes
 * Provides read-only access for parents to view their child's data.
 * 
 * SECURITY: Authentication handled at app.ts level via keycloakOidcMiddleware
 * DO NOT add authGuard here - it would create auth collision (both JWT and Keycloak)
 */
import { Router } from 'express';
import { requirePermission } from '../../../../core/rbac/rbac.middleware';
import { validateRequest } from '../../../../core/middleware/validation.middleware';
import {
    linkParentSchema,
    studentIdSchema,
} from '../validators/communication.validators';
import { parentPortalController } from '../controllers/parent-portal.controller';

const router = Router();

router.get(
    '/children',
    requirePermission('parent.portal.view'),
    parentPortalController.getChildren,
);

router.get(
    '/students/:studentId/attendance',
    requirePermission('parent.portal.view'),
    validateRequest(studentIdSchema.shape),
    parentPortalController.getStudentAttendance,
);

router.get(
    '/students/:studentId/fees',
    requirePermission('parent.portal.view'),
    validateRequest(studentIdSchema.shape),
    parentPortalController.getStudentFees,
);

router.get(
    '/students/:studentId/marks',
    requirePermission('parent.portal.view'),
    validateRequest(studentIdSchema.shape),
    parentPortalController.getStudentMarks,
);

router.get(
    '/notices',
    requirePermission('parent.portal.view'),
    parentPortalController.getNotices,
);

router.post(
    '/link',
    requirePermission('users.parents.manage'),
    validateRequest(linkParentSchema.shape),
    parentPortalController.linkParent,
);

router.delete(
    '/link/:studentId',
    requirePermission('users.parents.manage'),
    validateRequest(studentIdSchema.shape),
    parentPortalController.unlinkParent,
);

export const parentPortalRouter = router;
export default parentPortalRouter;
