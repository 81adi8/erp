/**
 * Plan Routes
 * Subscription plan management for platform.
 * 
 * RBAC: All routes require 'root.plans.manage' permission
 * (Platform-level permission for root admins only)
 */
import { Router } from 'express';
import { rootAuthGuard } from '../../../../core/middleware/rootAuthGuard';
import { requirePermission } from '../../../../core/rbac/rbac.middleware';
import { validate, validateParams } from '../../../../core/middleware/validate.middleware';
import { PlanController } from '../../controllers/plan.controller';
import {
    PlanIdParamSchema,
    CreatePlanSchema,
    UpdatePlanSchema,
} from '../../validators/super-admin.validators';

const router = Router();
const planController = new PlanController();

// All routes require root authentication and plan management permission
router.use(rootAuthGuard, requirePermission('root.plans.manage'));

router.get('/', planController.findAll);
router.get('/:id', validateParams(PlanIdParamSchema), planController.findById);
router.post('/', validate(CreatePlanSchema), planController.create);
router.put('/:id', validateParams(PlanIdParamSchema), validate(UpdatePlanSchema), planController.update);
router.delete('/:id', validateParams(PlanIdParamSchema), planController.delete);

export default router;
