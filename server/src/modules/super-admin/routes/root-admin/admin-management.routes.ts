/**
 * Admin Management Routes
 * Sub-admin creation and management for platform.
 * 
 * RBAC: All routes require 'root.admins.manage' permission
 * (Platform-level permission for root admins only)
 */
import { Router } from 'express';
import { rootAuthGuard } from '../../../../core/middleware/rootAuthGuard';
import { requirePermission } from '../../../../core/rbac/rbac.middleware';
import { validate, validateParams } from '../../../../core/middleware/validate.middleware';
import { AdminManagementController } from '../../controllers/root/admin-management.controller';
import {
    SubAdminIdParamSchema,
    CreateSubAdminSchema,
    UpdateSubAdminSchema,
} from '../../validators/super-admin.validators';

const router = Router();
const controller = new AdminManagementController();

// All routes require root authentication and admin management permission
router.use(rootAuthGuard, requirePermission('root.admins.manage'));

router.post('/', validate(CreateSubAdminSchema), controller.createSubAdmin);
router.get('/', controller.listSubAdmins);
router.patch('/:id', validateParams(SubAdminIdParamSchema), validate(UpdateSubAdminSchema), controller.updateSubAdmin);
router.delete('/:id', validateParams(SubAdminIdParamSchema), controller.deleteSubAdmin);

export default router;
