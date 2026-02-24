/**
 * Access Control Routes
 * Platform-level module, feature, and permission management.
 * 
 * RBAC: All routes require 'root.access.manage' permission
 * (Platform-level permission for root admins only)
 */
import { Router } from 'express';
import { rootAuthGuard } from '../../../../core/middleware/rootAuthGuard';
import { requirePermission } from '../../../../core/rbac/rbac.middleware';
import { validate, validateParams } from '../../../../core/middleware/validate.middleware';
import { AccessControlController } from '../../controllers/access-control.controller';
import {
    EntityIdParamSchema,
    CreateModuleSchema,
    UpdateModuleSchema,
    CreateFeatureSchema,
    UpdateFeatureSchema,
    CreatePermissionSchema,
    UpdatePermissionSchema,
} from '../../validators/super-admin.validators';

const router = Router();
const controller = new AccessControlController();

// All routes require root authentication and access management permission
router.use(rootAuthGuard, requirePermission('root.access.manage'));

// Modules
router.get('/modules', controller.getModules);
router.post('/modules', validate(CreateModuleSchema), controller.createModule);
router.patch('/modules/:id', validateParams(EntityIdParamSchema), validate(UpdateModuleSchema), controller.updateModule);
router.delete('/modules/:id', validateParams(EntityIdParamSchema), controller.deleteModule);

// Features
router.get('/features', controller.getFeatures);
router.post('/features', validate(CreateFeatureSchema), controller.createFeature);
router.patch('/features/:id', validateParams(EntityIdParamSchema), validate(UpdateFeatureSchema), controller.updateFeature);
router.delete('/features/:id', validateParams(EntityIdParamSchema), controller.deleteFeature);

// Permissions
router.get('/permissions', controller.getPermissions);
router.post('/permissions', validate(CreatePermissionSchema), controller.createPermission);
router.patch('/permissions/:id', validateParams(EntityIdParamSchema), validate(UpdatePermissionSchema), controller.updatePermission);
router.delete('/permissions/:id', validateParams(EntityIdParamSchema), controller.deletePermission);

// Refresh & Stats
router.post('/refresh', controller.refreshPermissions);
router.get('/stats', controller.getStats);

export default router;
