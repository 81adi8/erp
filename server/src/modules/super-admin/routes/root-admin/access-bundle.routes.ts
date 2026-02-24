/**
 * Access Bundle Routes
 * 
 * RBAC: All routes require 'root.access.manage' permission
 * (Platform-level permission for root admins only)
 */
import { Router } from 'express';
import { rootAuthGuard } from '../../../../core/middleware/rootAuthGuard';
import { requirePermission } from '../../../../core/rbac/rbac.middleware';
import { validate, validateParams } from '../../../../core/middleware/validate.middleware';
import { AccessBundleController } from '../../controllers/access-bundle.controller';
import {
    AccessBundleIdParamSchema,
    CreateAccessBundleSchema,
    UpdateAccessBundleSchema,
} from '../../validators/super-admin.validators';

const router = Router();
const controller = new AccessBundleController();

// All routes require root authentication and access management permission
router.use(rootAuthGuard, requirePermission('root.access.manage'));

// GET /access-bundles - Get all access bundles
router.get('/', controller.findAll);

// GET /access-bundles/:id - Get single access bundle
router.get('/:id', validateParams(AccessBundleIdParamSchema), controller.findById);

// POST /access-bundles - Create a new access bundle
router.post('/', validate(CreateAccessBundleSchema), controller.create);

// PUT /access-bundles/:id - Update an access bundle
router.put('/:id', validateParams(AccessBundleIdParamSchema), validate(UpdateAccessBundleSchema), controller.update);

// DELETE /access-bundles/:id - Delete an access bundle
router.delete('/:id', validateParams(AccessBundleIdParamSchema), controller.delete);

export default router;
