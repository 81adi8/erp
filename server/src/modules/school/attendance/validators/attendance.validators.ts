/**
 * Attendance Module — Zod Validators
 *
 * Provides route-level Zod schemas for every POST/PUT/PATCH endpoint.
 * Uses the same approach as fee.validators.ts (Zod + validateDTO middleware).
 */

import { z } from 'zod';

// ============================================================================
// SHARED HELPERS
// ============================================================================

const uuidSchema = z.string().uuid('Invalid UUID');

const dateStringSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'Date must be in ISO date format');

const timeStringSchema = z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format')
    .optional();

const attendanceStatusEnum = z.enum([
    'PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'EXCUSED', 'HOLIDAY',
]);

const attendanceScopeEnum = z.enum([
    'STUDENT', 'TEACHER', 'STAFF',
]);

const attendanceModeEnum = z.enum([
    'DAILY', 'PERIOD_WISE', 'HOURLY',
]);

const leaveTypeEnum = z.enum([
    'SICK', 'CASUAL', 'EARNED', 'MATERNITY', 'PATERNITY', 'OTHER',
]);

const leaveStatusEnum = z.enum([
    'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED',
]);

const notificationChannelEnum = z.enum([
    'EMAIL', 'SMS', 'PUSH', 'WHATSAPP',
]);

// ============================================================================
// STUDENT ATTENDANCE — POST/PUT Routes
// ============================================================================

/** POST /students/mark — Mark single student attendance */
export const MarkAttendanceSchema = z.object({
    entityId: uuidSchema,
    status: attendanceStatusEnum,
    date: dateStringSchema,
    remark: z.string().max(500).optional(),
    checkInTime: timeStringSchema,
    checkOutTime: timeStringSchema,
    periodNumber: z.coerce.number().int().min(1).max(12).optional(),
});

/** POST /students/bulk-mark — Bulk mark attendance */
export const BulkMarkAttendanceSchema = z.object({
    scope: attendanceScopeEnum,
    date: dateStringSchema,
    classId: uuidSchema.optional(),
    sectionId: uuidSchema.optional(),
    entries: z
        .array(
            z.object({
                entityId: uuidSchema,
                status: attendanceStatusEnum,
                remark: z.string().max(500).optional(),
                checkInTime: timeStringSchema,
                checkOutTime: timeStringSchema,
            }),
        )
        .min(1, 'At least one entry is required')
        .max(200, 'Cannot mark more than 200 entries at once'),
});

/** POST /students/lock — Lock attendance */
export const LockAttendanceSchema = z.object({
    scope: attendanceScopeEnum,
    date: dateStringSchema,
    classId: uuidSchema.optional(),
    sectionId: uuidSchema.optional(),
    reason: z.string().max(500).optional(),
});

/** PUT /students/:id — Update attendance */
export const UpdateAttendanceSchema = z.object({
    status: attendanceStatusEnum.optional(),
    remark: z.string().max(500).optional(),
    checkInTime: timeStringSchema,
    checkOutTime: timeStringSchema,
    editReason: z.string().max(500).optional(),
});

export const AttendanceIdParamSchema = z.object({
    id: uuidSchema,
});

// ============================================================================
// SETTINGS — POST/PUT Routes
// ============================================================================

const rulesSchema = z
    .object({
        lateThresholdMinutes: z.coerce.number().int().min(1).max(120).optional(),
        halfDayThresholdMinutes: z.coerce.number().int().min(30).max(240).optional(),
        absentThresholdMinutes: z.coerce.number().int().min(60).max(480).optional(),
        lockAfterHours: z.coerce.number().int().min(1).max(72).optional(),
        editWindowHours: z.coerce.number().int().min(0).max(24).optional(),
        requireApprovalForEdit: z.coerce.boolean().optional(),
        requireReasonForAbsent: z.coerce.boolean().optional(),
        autoMarkLeaveAsExcused: z.coerce.boolean().optional(),
        minimumAttendancePercent: z.coerce.number().int().min(0).max(100).optional(),
    })
    .optional();

/** POST /settings — Save settings */
export const CreateAttendanceSettingsSchema = z.object({
    scope: attendanceScopeEnum,
    classId: uuidSchema.optional(),
    mode: attendanceModeEnum.optional(),
    defaultStartTime: z.string().optional(),
    defaultEndTime: z.string().optional(),
    rules: rulesSchema,
    allowBackdatedMarking: z.coerce.boolean().optional(),
    backdatedDaysLimit: z.coerce.number().int().min(1).max(30).optional(),
    showToParents: z.coerce.boolean().optional(),
    showToStudents: z.coerce.boolean().optional(),
    autoNotifyParentOnAbsent: z.coerce.boolean().optional(),
    notificationChannels: z.array(notificationChannelEnum).optional(),
    workingDaysInWeek: z.coerce.number().int().min(1).max(7).optional(),
    leaveQuotaPerYear: z.coerce.number().int().min(1).max(365).optional(),
    isActive: z.coerce.boolean().optional(),
});

/** PUT /settings/class/:classId — Update class settings */
export const UpdateAttendanceSettingsSchema = z.object({
    scope: attendanceScopeEnum.optional(),
    classId: uuidSchema.optional(),
    mode: attendanceModeEnum.optional(),
    defaultStartTime: z.string().optional(),
    defaultEndTime: z.string().optional(),
    rules: rulesSchema,
    allowBackdatedMarking: z.coerce.boolean().optional(),
    backdatedDaysLimit: z.coerce.number().int().min(1).max(30).optional(),
    showToParents: z.coerce.boolean().optional(),
    showToStudents: z.coerce.boolean().optional(),
    autoNotifyParentOnAbsent: z.coerce.boolean().optional(),
    notificationChannels: z.array(notificationChannelEnum).optional(),
    workingDaysInWeek: z.coerce.number().int().min(1).max(7).optional(),
    leaveQuotaPerYear: z.coerce.number().int().min(1).max(365).optional(),
    isActive: z.coerce.boolean().optional(),
});

export const ClassIdParamSchema = z.object({
    classId: uuidSchema,
});

// ============================================================================
// LEAVES — POST Routes
// ============================================================================

/** POST /leaves — Apply for leave */
export const ApplyLeaveSchema = z.object({
    scope: attendanceScopeEnum,
    entityId: uuidSchema,
    leaveType: leaveTypeEnum,
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    reason: z.string().min(1, 'Reason is required').max(500),
    attachmentUrls: z.array(z.string().url()).optional(),
});

/** POST /leaves/:id/approve */
export const ApproveLeaveSchema = z.object({
    approvalNote: z.string().max(500).optional(),
    markAsExcused: z.coerce.boolean().optional(),
});

/** POST /leaves/:id/reject */
export const RejectLeaveSchema = z.object({
    rejectionReason: z.string().min(1, 'Rejection reason is required').max(1000),
});

export const LeaveIdParamSchema = z.object({
    id: uuidSchema,
});
