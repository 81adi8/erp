// ============================================================================
// ATTENDANCE MODULE - TYPE DEFINITIONS
// ============================================================================

// ============================================================================
// ENUMS
// ============================================================================

export enum AttendanceStatus {
    PRESENT = 'PRESENT',
    ABSENT = 'ABSENT',
    LATE = 'LATE',
    HALF_DAY = 'HALF_DAY',
    LEAVE = 'LEAVE',
    EXCUSED = 'EXCUSED',
    HOLIDAY = 'HOLIDAY'
}

export enum AttendanceScope {
    STUDENT = 'STUDENT',
    TEACHER = 'TEACHER',
    STAFF = 'STAFF'
}

export enum AttendanceMode {
    DAILY = 'DAILY',
    PERIOD_WISE = 'PERIOD_WISE'
}

export enum LeaveScope {
    STUDENT = 'STUDENT',
    TEACHER = 'TEACHER',
    STAFF = 'STAFF'
}

export enum LeaveType {
    SICK = 'SICK',
    CASUAL = 'CASUAL',
    EMERGENCY = 'EMERGENCY',
    PLANNED = 'PLANNED',
    OTHER = 'OTHER'
}

export enum LeaveStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    CANCELLED = 'CANCELLED'
}

export enum NotificationChannel {
    SMS = 'SMS',
    EMAIL = 'EMAIL',
    PUSH = 'PUSH',
    WHATSAPP = 'WHATSAPP'
}

export enum SummaryPeriodType {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    TERM = 'TERM',
    YEARLY = 'YEARLY'
}

export enum SummaryScope {
    STUDENT = 'STUDENT',      // Per student summary
    SECTION = 'SECTION',      // Per section summary
    CLASS = 'CLASS',          // Per class summary
    INSTITUTION = 'INSTITUTION' // School-wide summary
}

export enum AuditAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    LOCK = 'LOCK',
    UNLOCK = 'UNLOCK',
    RESTORE = 'RESTORE'
}

export enum AuditEntityType {
    STUDENT_ATTENDANCE = 'STUDENT_ATTENDANCE',
    TEACHER_ATTENDANCE = 'TEACHER_ATTENDANCE',
    STAFF_ATTENDANCE = 'STAFF_ATTENDANCE',
    LEAVE_APPLICATION = 'LEAVE_APPLICATION',
    ATTENDANCE_SETTINGS = 'ATTENDANCE_SETTINGS'
}

// ============================================================================
// STATUS COUNT VALUES (for attendance percentage calculation)
// ============================================================================

export const ATTENDANCE_COUNT_VALUES: Record<AttendanceStatus, number> = {
    [AttendanceStatus.PRESENT]: 1,
    [AttendanceStatus.ABSENT]: 0,
    [AttendanceStatus.LATE]: 0.75,
    [AttendanceStatus.HALF_DAY]: 0.5,
    [AttendanceStatus.LEAVE]: 0,
    [AttendanceStatus.EXCUSED]: 1,
    [AttendanceStatus.HOLIDAY]: 0 // Doesn't count towards working days
};

// ============================================================================
// INTERFACES
// ============================================================================

export interface AttendanceContext {
    institutionId: string;
    schemaName: string;
    academicYearId: string;
    userId: string;
    userPermissions: string[];
}

export interface AttendanceRecord {
    id: string;
    scope: AttendanceScope;
    entityId: string;       // student_id, teacher_id, or staff_id
    academicYearId: string;
    classId?: string;       // Only for students
    sectionId?: string;     // Only for students
    date: Date;
    status: AttendanceStatus;
    checkInTime?: Date;
    checkOutTime?: Date;
    periodNumber?: number;  // For period-wise attendance
    remark?: string;
    markedById: string;
    isLocked: boolean;
    lockedAt?: Date;
    lockedById?: string;
}

export interface IAttendanceSummary {
    entityId: string;
    entityName: string;
    totalWorkingDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    halfDays: number;
    leaveDays: number;
    excusedDays: number;
    attendancePercentage: number;
}

export interface ClassAttendanceSummary {
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
    date: Date;
    totalStudents: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
    unmarked: number;
    attendancePercentage: number;
}

export interface AttendanceConfigRules {
    lateThresholdMinutes: number;
    halfDayThresholdMinutes: number;
    absentThresholdMinutes: number;
    lockAfterHours: number;
    editWindowHours: number;
    requireApprovalForEdit: boolean;
    requireReasonForAbsent: boolean;
    autoMarkLeaveAsExcused: boolean;
    minimumAttendancePercent: number;
}

export interface AttendanceSettingsConfig {
    id: string;
    institutionId: string;
    scope: AttendanceScope;
    classId?: string;          // null = global, specific = class-level override
    mode: AttendanceMode;
    defaultStartTime: string;  // HH:mm format
    defaultEndTime: string;    // HH:mm format
    rules: AttendanceConfigRules;
    allowBackdatedMarking: boolean;
    backdatedDaysLimit: number;
    showToParents: boolean;
    showToStudents: boolean;
    autoNotifyParentOnAbsent: boolean;
    notificationChannels: NotificationChannel[];
    workingDaysInWeek: number;
    leaveQuotaPerYear: number;
    isActive: boolean;
}

export interface LeaveApplication {
    id: string;
    scope: AttendanceScope;
    entityId: string;
    academicYearId: string;
    classId?: string;
    sectionId?: string;
    leaveType: LeaveType;
    startDate: Date;
    endDate: Date;
    reason: string;
    status: LeaveStatus;
    appliedById: string;
    appliedAt: Date;
    approvedById?: string;
    approvedAt?: Date;
    rejectionReason?: string;
    attachmentUrls?: string[];
}

export interface AttendanceAuditLog {
    id: string;
    attendanceId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    previousStatus?: AttendanceStatus;
    newStatus?: AttendanceStatus;
    previousRemark?: string;
    newRemark?: string;
    changedById: string;
    changedAt: Date;
    reason?: string;
    ipAddress?: string;
}

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface AttendanceQuery {
    scope?: AttendanceScope;
    entityId?: string;
    classId?: string;
    sectionId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: AttendanceStatus;
    isLocked?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}

export interface AttendanceReportQuery {
    scope: AttendanceScope;
    classId?: string;
    sectionId?: string;
    startDate: Date;
    endDate: Date;
    groupBy?: 'day' | 'week' | 'month';
    includeDetails?: boolean;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface AttendanceMarkResult {
    success: boolean;
    markedCount: number;
    skippedCount: number;
    errors?: Array<{
        entityId: string;
        error: string;
    }>;
}

export interface AttendanceReportData {
    summary: {
        totalWorkingDays: number;
        averageAttendance: number;
        totalStudents: number;
        belowThresholdCount: number;
    };
    byDate: Array<{
        date: Date;
        present: number;
        absent: number;
        late: number;
        leave: number;
    }>;
    byEntity?: IAttendanceSummary[];
}
