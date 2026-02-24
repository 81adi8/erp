import { Router } from 'express';
import StudentController from '../controllers/student.controller';
import { requirePermissionOrRole as legacyRequirePermissionOrRole } from '../../middlewares/permission.middleware';
import { requirePermission as rbacRequirePermission } from '../../../../core/rbac/rbac.middleware';
import { validate, validateQuery, validateParams } from '../../../../core/middleware/validate.middleware';
import { logger } from '../../../../core/utils/logger';
import { 
    AdmitStudentSchema, 
    EnrollStudentSchema,
    BulkAdmitSchema,
    GetStudentsQuerySchema,
    StudentIdParamSchema,
    UpdateStudentSchema,
    AddStudentDocumentSchema,
    CreateParentProfileSchema,
    LinkStudentParentSchema,
    SetPrimaryParentSchema,
    StudentPromotionSchema,
    StudentSearchQuerySchema,
} from '../dto/student.dto';

/**
 * RBAC PILOT: Student Module
 * 
 * This module is the pilot for RBAC enforcement migration.
 * When RBAC_ENFORCE_STUDENT=true, uses new RBAC middleware.
 * Otherwise, uses legacy permission middleware.
 * 
 * Rollback: Set RBAC_ENFORCE_STUDENT=false to revert instantly.
 * 
 * @phase RBAC Migration - Pilot Module
 * @status Pilot Active
 */

const router = Router();

/**
 * Permission wrapper with environment-based switching
 * 
 * Logic:
 * - If RBAC_ENFORCE_STUDENT=true: Use RBAC requirePermission (with mapping)
 * - Else: Use legacy requirePermissionOrRole
 * 
 * Note: RBAC version doesn't use role fallback (RBAC uses roles via permissions)
 * For pilot, we assume Admin role has all permissions assigned.
 */
function studentRequirePermission(...permissions: string[]) {
    const useRBAC = process.env.RBAC_ENFORCE_STUDENT === 'true';
    
    if (useRBAC) {
        // Use RBAC middleware (with permission mapping)
        logger.info(`[RBAC Pilot] Using RBAC enforcement for: ${permissions.join(', ')}`);
        return rbacRequirePermission(...permissions);
    } else {
        // Use legacy middleware (with role fallback)
        return legacyRequirePermissionOrRole(permissions, ['Admin']);
    }
}

// ============================================================================
// STUDENT ROUTES
// ============================================================================

// Admit student
router.post(
    '/admit',
    studentRequirePermission('students.manage', 'students.create'),
    validate(AdmitStudentSchema),
    StudentController.admitStudent
);

// List students
router.get(
    '/',
    studentRequirePermission('students.view'),
    validateQuery(GetStudentsQuerySchema),
    StudentController.getStudents
);

// Search students by name (must be before /:id to avoid route conflict)
// SEC-04: Added validateQuery with Zod schema for search query validation
router.get(
    '/search',
    studentRequirePermission('students.view'),
    validateQuery(StudentSearchQuerySchema),
    StudentController.searchStudents
);

// Get single student by ID
router.get(
    '/:id',
    studentRequirePermission('students.view'),
    validateParams(StudentIdParamSchema),
    StudentController.getStudentById
);

// Enroll student
router.post(
    '/enroll',
    studentRequirePermission('students.manage', 'students.create'),
    validate(EnrollStudentSchema),
    StudentController.enrollStudent
);

// Bulk admit students
router.post(
    '/bulk-admit',
    studentRequirePermission('students.manage', 'students.create'),
    validate(BulkAdmitSchema),
    StudentController.bulkAdmitStudents
);

// ── TASK-04: Restored CRUD endpoints ────────────────────────────────────────

// Update student — PUT (canonical)
// PRODUCTION HARDENED: Added body validation with UpdateStudentSchema
router.put(
    '/:id',
    studentRequirePermission('students.manage', 'students.update'),
    validateParams(StudentIdParamSchema),
    validate(UpdateStudentSchema),
    StudentController.updateStudent
);

// FIXED: PATCH alias — frontend studentsApi.ts calls PATCH /school/students/:id
// Backend only had PUT. Added PATCH pointing to same controller method.
// PRODUCTION HARDENED: Added body validation with UpdateStudentSchema
router.patch(
    '/:id',
    studentRequirePermission('students.manage', 'students.update'),
    validateParams(StudentIdParamSchema),
    validate(UpdateStudentSchema),
    StudentController.updateStudent
);

// Delete student (soft delete)
router.delete(
    '/:id',
    studentRequirePermission('students.manage', 'students.delete'),
    validateParams(StudentIdParamSchema),
    StudentController.deleteStudent
);

// Student document routes
router.post(
    '/:id/documents',
    studentRequirePermission('students.manage', 'students.update'),
    validateParams(StudentIdParamSchema),
    validate(AddStudentDocumentSchema),
    StudentController.addStudentDocument
);

router.get(
    '/:id/documents',
    studentRequirePermission('students.view'),
    validateParams(StudentIdParamSchema),
    StudentController.getStudentDocuments
);

// Parent profile and linking routes
router.post(
    '/parents',
    studentRequirePermission('students.manage', 'students.update'),
    validate(CreateParentProfileSchema),
    StudentController.createParentProfile
);

router.post(
    '/parents/link',
    studentRequirePermission('students.manage', 'students.update'),
    validate(LinkStudentParentSchema),
    StudentController.linkParentToStudent
);

router.post(
    '/parents/primary',
    studentRequirePermission('students.manage', 'students.update'),
    validate(SetPrimaryParentSchema),
    StudentController.setPrimaryParent
);

router.get(
    '/:id/parents',
    studentRequirePermission('students.view'),
    validateParams(StudentIdParamSchema),
    StudentController.getStudentParents
);

// Promotion and transfer certificate routes
router.post(
    '/promotions',
    studentRequirePermission('students.manage', 'students.update'),
    validate(StudentPromotionSchema),
    StudentController.promoteStudent
);

router.get(
    '/:id/promotions',
    studentRequirePermission('students.view'),
    validateParams(StudentIdParamSchema),
    StudentController.getStudentPromotionHistory
);

router.get(
    '/:id/transfer-certificate',
    studentRequirePermission('students.view'),
    validateParams(StudentIdParamSchema),
    StudentController.getTransferCertificate
);

export default router;

