/**
 * Global Holiday Routes
 * Platform-wide holiday management for all tenants.
 * 
 * RBAC: All routes require 'root.holidays.manage' permission
 * (Platform-level permission for root admins only)
 */
import { Router } from 'express';
import { rootAuthGuard } from '../../../../core/middleware/rootAuthGuard';
import { requirePermission } from '../../../../core/rbac/rbac.middleware';
import { validate, validateParams, validateQuery } from '../../../../core/middleware/validate.middleware';
import { globalHolidayController } from '../../controllers/global-holiday.controller';
import {
    GlobalHolidayIdParamSchema,
    CreateGlobalHolidaySchema,
    UpdateGlobalHolidaySchema,
    SyncHolidaysQuerySchema,
} from '../../validators/super-admin.validators';

const router = Router();

// All routes require root authentication and holiday management permission
router.use(rootAuthGuard, requirePermission('root.holidays.manage'));

router.get('/', (req, res) => globalHolidayController.getHolidays(req, res));
router.post('/sync', validateQuery(SyncHolidaysQuerySchema), (req, res) => globalHolidayController.syncHolidays(req, res));
router.post('/upsert', validate(CreateGlobalHolidaySchema), (req, res) => globalHolidayController.upsertHoliday(req, res));
router.delete('/:id', validateParams(GlobalHolidayIdParamSchema), (req, res) => globalHolidayController.deleteHoliday(req, res));

export default router;
