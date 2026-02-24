/**
 * Role Template Routes
 * Platform-level role templates for tenant provisioning.
 * 
 * RBAC: All routes require 'root.roles.manage' permission
 * (Platform-level permission for root admins only)
 */
import { Router } from 'express';
import { rootAuthGuard } from '../../../../core/middleware/rootAuthGuard';
import { requirePermission } from '../../../../core/rbac/rbac.middleware';
import { validate, validateParams } from '../../../../core/middleware/validate.middleware';
import { RoleTemplateController } from '../../controllers/role-template.controller';
import {
    RoleTemplateIdParamSchema,
    CreateRoleTemplateSchema,
    UpdateRoleTemplateSchema,
} from '../../validators/super-admin.validators';

const router = Router();
const controller = new RoleTemplateController();

// All routes require root authentication and role management permission
router.use(rootAuthGuard, requirePermission('root.roles.manage'));

// GET /role-templates - Get all role templates
router.get('/', controller.findAll);

// GET /role-templates/:id - Get single role template
router.get('/:id', validateParams(RoleTemplateIdParamSchema), controller.findById);

// POST /role-templates - Create a new role template
router.post('/', validate(CreateRoleTemplateSchema), controller.create);

// PUT /role-templates/:id - Update a role template
router.put('/:id', validateParams(RoleTemplateIdParamSchema), validate(UpdateRoleTemplateSchema), controller.update);

// DELETE /role-templates/:id - Delete a role template
router.delete('/:id', validateParams(RoleTemplateIdParamSchema), controller.delete);

// POST /role-templates/:id/duplicate - Duplicate a role template
router.post('/:id/duplicate', validateParams(RoleTemplateIdParamSchema), controller.duplicate);

export default router;
