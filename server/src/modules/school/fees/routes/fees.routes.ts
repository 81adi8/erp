/**
 * Fee Management Routes
 * Route -> Controller only (thin routes)
 * 
 * ENTERPRISE OIDC: Auth is handled at app.ts via keycloakOidcMiddleware
 * No need for duplicate authGuard here.
 */
import { Router } from 'express';

import { validate, validateParams, validateQuery } from '../../../../core/middleware/validate.middleware';
import { requirePermission } from '../../../../core/rbac/rbac.middleware';
import { feeController } from '../controllers/fees.controller';
import {
    FeeAssignToClassSchema,
    FeeAssignToStudentSchema,
    FeeCategoryCreateSchema,
    FeeCategoryListQuerySchema,
    FeeCategoryUpdateSchema,
    FeeCollectSchema,
    FeeDiscountApplySchema,
    FeeDiscountCreateSchema,
    FeeDiscountUpdateSchema,
    FeeDuesQuerySchema,
    FeeIdParamSchema,
    FeePaymentsQuerySchema,
    FeeReceiptParamSchema,
    FeeStudentParamSchema,
    FeeStructureCreateSchema,
    FeeStructureListQuerySchema,
    FeeStructureUpdateSchema,
    FeeSummaryQuerySchema,
} from '../validators/fee.validators';

const router = Router();
// Auth handled by keycloakOidcMiddleware at app.ts level

// Categories
router.get('/categories', requirePermission('fees.view'), validateQuery(FeeCategoryListQuerySchema), feeController.getCategories);
router.post('/categories', requirePermission('fees.create', 'fees.manage'), validate(FeeCategoryCreateSchema), feeController.createCategory);
router.patch('/categories/:id', requirePermission('fees.update', 'fees.manage'), validateParams(FeeIdParamSchema), validate(FeeCategoryUpdateSchema), feeController.updateCategory);
router.delete('/categories/:id', requirePermission('fees.delete', 'fees.manage'), validateParams(FeeIdParamSchema), feeController.deleteCategory);

// Structures
router.get('/structures', requirePermission('fees.view'), validateQuery(FeeStructureListQuerySchema), feeController.getStructures);
router.get('/structures/:id', requirePermission('fees.view'), validateParams(FeeIdParamSchema), feeController.getStructureById);
router.post('/structures', requirePermission('fees.create', 'fees.manage'), validate(FeeStructureCreateSchema), feeController.createStructure);
router.patch('/structures/:id', requirePermission('fees.update', 'fees.manage'), validateParams(FeeIdParamSchema), validate(FeeStructureUpdateSchema), feeController.updateStructure);
router.delete('/structures/:id', requirePermission('fees.delete', 'fees.manage'), validateParams(FeeIdParamSchema), feeController.deleteStructure);

// Assignments
router.post('/assign/student', requirePermission('fees.create', 'fees.manage'), validate(FeeAssignToStudentSchema), feeController.assignToStudent);
router.post('/assign/class', requirePermission('fees.create', 'fees.manage'), validate(FeeAssignToClassSchema), feeController.assignToClass);
router.get('/assignments/student/:studentId', requirePermission('fees.view'), validateParams(FeeStudentParamSchema), validateQuery(FeeDuesQuerySchema), feeController.getStudentAssignments);

// Payments
router.get('/payments', requirePermission('fees.view'), validateQuery(FeePaymentsQuerySchema), feeController.getPayments);
router.post('/payments', requirePermission('fees.collect'), validate(FeeCollectSchema), feeController.collectPayment);
router.get('/payments/student/:studentId', requirePermission('fees.view'), validateParams(FeeStudentParamSchema), validateQuery(FeeDuesQuerySchema), feeController.getStudentPayments);
router.get('/payments/receipt/:receiptNumber', requirePermission('fees.view', 'fees.collect', 'fees.receipt.generate'), validateParams(FeeReceiptParamSchema), feeController.getPaymentReceipt);

// Dues + Summary
router.get('/dues/student/:studentId', requirePermission('fees.view'), validateParams(FeeStudentParamSchema), validateQuery(FeeDuesQuerySchema), feeController.getStudentDues);
router.get('/summary', requirePermission('fees.view'), validateQuery(FeeSummaryQuerySchema), feeController.getSummary);

// Discounts
router.get('/discounts', requirePermission('fees.view'), feeController.getDiscounts);
router.post('/discounts', requirePermission('fees.create', 'fees.manage'), validate(FeeDiscountCreateSchema), feeController.createDiscount);
router.patch('/discounts/:id', requirePermission('fees.update', 'fees.manage'), validateParams(FeeIdParamSchema), validate(FeeDiscountUpdateSchema), feeController.updateDiscount);
router.delete('/discounts/:id', requirePermission('fees.delete', 'fees.manage'), validateParams(FeeIdParamSchema), feeController.deleteDiscount);
router.post('/discounts/apply', requirePermission('fees.update', 'fees.manage'), validate(FeeDiscountApplySchema), feeController.applyDiscount);

export const feeRouter = router;
export default feeRouter;
