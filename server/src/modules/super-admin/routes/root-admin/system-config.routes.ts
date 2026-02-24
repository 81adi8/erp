/**
 * System Configuration Routes
 * Platform-level system configuration (read-only for most).
 * 
 * RBAC: All routes require 'root.config.view' permission
 * (Platform-level permission for root admins only)
 */
import { Router } from 'express';
import { rootAuthGuard } from '../../../../core/middleware/rootAuthGuard';
import { requirePermission } from '../../../../core/rbac/rbac.middleware';
import { SystemConfigController } from '../../controllers/system-config.controller';

const router = Router();
const controller = new SystemConfigController();

// All routes require root authentication and config view permission
router.use(rootAuthGuard, requirePermission('root.config.view'));

// GET /config/institution-types
router.get('/institution-types', controller.getInstitutionTypes);

// GET /config/role-types
router.get('/role-types', controller.getRoleTypes);

// GET /config/institution-roles
router.get('/institution-roles', controller.getInstitutionRoles);

// GET /config/all
router.get('/all', controller.getAllConfig);

export default router;
