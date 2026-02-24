import { logger } from '../../../../core/utils/logger';
// ============================================================================
// ATTENDANCE ROUTES
// RESTful API endpoints for attendance module
// ============================================================================

import { Router, RequestHandler } from 'express';
import { validateRequest } from '../../../../core/middleware/validation.middleware';
import { MarkAttendanceSchema, BulkMarkAttendanceSchema, LockAttendanceSchema, UpdateAttendanceSchema, CreateAttendanceSettingsSchema, UpdateAttendanceSettingsSchema, ApplyLeaveSchema, ApproveLeaveSchema, RejectLeaveSchema } from '../validators';
import { 
    studentAttendanceController, 
    attendanceSettingsController, 
    leaveController 
} from '../controllers/attendance.controller';
import { attendanceDashboardController } from '../controllers/dashboard.controller';
import { ATTENDANCE_PERMISSIONS } from '../constants/attendance.constants';

// RBAC Pilot - Environment-based switching
import { requirePermission as rbacRequirePermission } from '../../../../core/rbac/rbac.middleware';
import { requirePermissionOrRole as legacyRequirePermissionOrRole } from '../../middlewares/permission.middleware';

/**
 * RBAC Pilot Wrapper Function
 * 
 * Switches between new RBAC enforcement and legacy permission system
 * based on RBAC_ENFORCE_ATTENDANCE environment variable.
 * 
 * Environment Variables:
 * - RBAC_ENFORCE_ATTENDANCE=false (default) - Uses legacy permission system
 * - RBAC_ENFORCE_ATTENDANCE=true - Uses new RBAC enforcement
 */
function attendanceRequirePermission(...permissions: string[]): RequestHandler {
    const useRBAC = process.env.RBAC_ENFORCE_ATTENDANCE === 'true';

    if (useRBAC) {
        logger.info(`[RBAC Pilot] Using RBAC enforcement for: ${permissions.join(', ')}`);
        return rbacRequirePermission(...permissions);
    } else {
        return legacyRequirePermissionOrRole(permissions, ['Admin']);
    }
}

// ============================================================================
// ROUTER SETUP
// ============================================================================

const router = Router();

// =========================================================================
// STUDENT ATTENDANCE ROUTES
// =========================================================================

// Get daily attendance for marking (class/section view)
router.get(
    '/students/daily',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.STUDENT_VIEW),
    studentAttendanceController.getDailyAttendance
);

// Get attendance list with filters
router.get(
    '/students',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.STUDENT_VIEW),
    studentAttendanceController.getAttendance
);

// Mark single student attendance
router.post(
    '/students/mark',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.STUDENT_MARK),
    validateRequest({ body: MarkAttendanceSchema }),
    studentAttendanceController.markAttendance
);

// Bulk mark attendance
router.post(
    '/students/bulk-mark',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.STUDENT_MARK),
    validateRequest({ body: BulkMarkAttendanceSchema }),
    studentAttendanceController.bulkMarkAttendance
);

// Lock attendance for a date/section
router.post(
    '/students/lock',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.LOCK_MANAGE),
    validateRequest({ body: LockAttendanceSchema }),
    studentAttendanceController.lockAttendance
);

// Get student summary
router.get(
    '/students/:studentId/summary',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.STUDENT_VIEW),
    studentAttendanceController.getStudentSummary
);

// Get audit history
router.get(
    '/students/:id/audit',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.AUDIT_VIEW),
    studentAttendanceController.getAuditHistory
);

// Update attendance
router.put(
    '/students/:id',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.STUDENT_EDIT),
    validateRequest({ body: UpdateAttendanceSchema }),
    studentAttendanceController.updateAttendance
);

// =========================================================================
// SETTINGS ROUTES
// =========================================================================

// Get all settings
router.get(
    '/settings',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.SETTINGS_VIEW),
    attendanceSettingsController.getAllSettings
);

// Get effective settings (with inheritance)
router.get(
    '/settings/effective',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.SETTINGS_VIEW),
    attendanceSettingsController.getEffectiveSettings
);

// Get class-wise settings overview
router.get(
    '/settings/classes',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.SETTINGS_VIEW),
    attendanceSettingsController.getClassSettingsOverview
);

// Create/update settings
router.post(
    '/settings',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.SETTINGS_MANAGE),
    validateRequest({ body: CreateAttendanceSettingsSchema }),
    attendanceSettingsController.saveSettings
);

// Update class-specific settings
router.put(
    '/settings/class/:classId',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.SETTINGS_MANAGE),
    validateRequest({ body: UpdateAttendanceSettingsSchema }),
    attendanceSettingsController.updateClassSettings
);

// Reset class settings to defaults
router.delete(
    '/settings/class/:classId',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.SETTINGS_MANAGE),
    attendanceSettingsController.resetClassSettings
);

// =========================================================================
// LEAVE ROUTES
// =========================================================================

// Get leave applications
router.get(
    '/leaves',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.LEAVE_VIEW),
    leaveController.getLeaves
);

// Get leave balance
router.get(
    '/leaves/balance/:entityId',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.LEAVE_VIEW),
    leaveController.getLeaveBalance
);

// Get leave by ID
router.get(
    '/leaves/:id',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.LEAVE_VIEW),
    leaveController.getLeaveById
);

// Apply for leave
router.post(
    '/leaves',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.LEAVE_APPLY),
    validateRequest({ body: ApplyLeaveSchema }),
    leaveController.applyLeave
);

// Approve leave
router.post(
    '/leaves/:id/approve',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.LEAVE_APPROVE),
    validateRequest({ body: ApproveLeaveSchema }),
    leaveController.approveLeave
);

// Reject leave
router.post(
    '/leaves/:id/reject',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.LEAVE_REJECT),
    validateRequest({ body: RejectLeaveSchema }),
    leaveController.rejectLeave
);

// =========================================================================
// DASHBOARD ROUTES
// =========================================================================

router.get(
    '/dashboard/stats',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.STUDENT_VIEW),
    attendanceDashboardController.getStats
);

router.get(
    '/dashboard/activity',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.STUDENT_VIEW),
    attendanceDashboardController.getActivity
);

router.get(
    '/dashboard/class-summary',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.STUDENT_VIEW),
    attendanceDashboardController.getClassSummary
);

router.get(
    '/dashboard/history',
    attendanceRequirePermission(ATTENDANCE_PERMISSIONS.STUDENT_VIEW),
    attendanceDashboardController.getHistory
);

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default router;

