// ============================================================================
// ATTENDANCE MODULE - CONSTANTS
// ============================================================================

import { AttendanceStatus, AttendanceScope, AttendanceMode, NotificationChannel } from '../types/attendance.types';

// ============================================================================
// PERMISSION CODES
// ============================================================================

export const ATTENDANCE_PERMISSIONS = {
    // Student Attendance
    STUDENT_VIEW: 'attendance.student_attendance.view',
    STUDENT_MARK: 'attendance.student_attendance.mark',
    STUDENT_EDIT: 'attendance.student_attendance.edit',
    STUDENT_DELETE: 'attendance.student_attendance.delete',

    // Teacher Attendance
    TEACHER_VIEW: 'attendance.teacher_attendance.view',
    TEACHER_MARK: 'attendance.teacher_attendance.mark',
    TEACHER_EDIT: 'attendance.teacher_attendance.edit',

    // Staff Attendance
    STAFF_VIEW: 'attendance.staff_attendance.view',
    STAFF_MARK: 'attendance.staff_attendance.mark',
    STAFF_EDIT: 'attendance.staff_attendance.edit',

    // Leave Management
    LEAVE_VIEW: 'attendance.leaves.view',
    LEAVE_APPLY: 'attendance.leaves.apply',
    LEAVE_APPROVE: 'attendance.leaves.approve',
    LEAVE_REJECT: 'attendance.leaves.reject',

    // Reports
    REPORTS_VIEW: 'attendance.reports.view',
    REPORTS_EXPORT: 'attendance.reports.export',

    // Settings
    SETTINGS_VIEW: 'attendance.settings.view',
    SETTINGS_MANAGE: 'attendance.settings.manage',

    // Audit
    AUDIT_VIEW: 'attendance.audit.view',

    // Lock/Unlock
    LOCK_MANAGE: 'attendance.lock.manage'
} as const;

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const DEFAULT_ATTENDANCE_CONFIG = {
    mode: AttendanceMode.DAILY,
    defaultStartTime: '09:00',
    defaultEndTime: '15:30',
    rules: {
        lateThresholdMinutes: 15,
        halfDayThresholdMinutes: 90,
        absentThresholdMinutes: 180,
        lockAfterHours: 24,
        editWindowHours: 2,
        requireApprovalForEdit: true,
        requireReasonForAbsent: true,
        autoMarkLeaveAsExcused: true,
        minimumAttendancePercent: 75
    },
    allowBackdatedMarking: false,
    backdatedDaysLimit: 3,
    showToParents: true,
    showToStudents: true,
    autoNotifyParentOnAbsent: true,
    notificationChannels: [NotificationChannel.SMS, NotificationChannel.PUSH],
    workingDaysInWeek: 6,
    isActive: true
};

// ============================================================================
// STATUS DISPLAY CONFIG
// ============================================================================

export const ATTENDANCE_STATUS_CONFIG: Record<AttendanceStatus, {
    label: string;
    code: string;
    color: string;
    countValue: number;
    isDefault: boolean;
}> = {
    [AttendanceStatus.PRESENT]: {
        label: 'Present',
        code: 'P',
        color: '#10b981',
        countValue: 1,
        isDefault: true
    },
    [AttendanceStatus.ABSENT]: {
        label: 'Absent',
        code: 'A',
        color: '#ef4444',
        countValue: 0,
        isDefault: false
    },
    [AttendanceStatus.LATE]: {
        label: 'Late',
        code: 'L',
        color: '#f59e0b',
        countValue: 0.75,
        isDefault: false
    },
    [AttendanceStatus.HALF_DAY]: {
        label: 'Half Day',
        code: 'HD',
        color: '#3b82f6',
        countValue: 0.5,
        isDefault: false
    },
    [AttendanceStatus.LEAVE]: {
        label: 'Leave',
        code: 'LV',
        color: '#8b5cf6',
        countValue: 0,
        isDefault: false
    },
    [AttendanceStatus.EXCUSED]: {
        label: 'Excused',
        code: 'EX',
        color: '#06b6d4',
        countValue: 1,
        isDefault: false
    },
    [AttendanceStatus.HOLIDAY]: {
        label: 'Holiday',
        code: 'H',
        color: '#9333ea',
        countValue: 0,
        isDefault: false
    }
};

// ============================================================================
// API ROUTES
// ============================================================================

export const ATTENDANCE_API_ROUTES = {
    BASE: '/api/v1/attendance',
    
    // Student Attendance
    STUDENTS: '/students',
    STUDENTS_MARK: '/students/mark',
    STUDENTS_BULK_MARK: '/students/bulk-mark',
    STUDENTS_BY_CLASS: '/students/class/:classId',
    STUDENTS_BY_SECTION: '/students/section/:sectionId',
    
    // Teacher Attendance
    TEACHERS: '/teachers',
    TEACHERS_MARK: '/teachers/mark',
    
    // Staff Attendance
    STAFF: '/staff',
    STAFF_MARK: '/staff/mark',
    
    // Reports
    REPORTS: '/reports',
    REPORTS_SUMMARY: '/reports/summary',
    REPORTS_CLASS_WISE: '/reports/class-wise',
    REPORTS_EXPORT: '/reports/export',
    
    // History
    HISTORY: '/history',
    AUDIT_LOG: '/audit-log',
    
    // Leave Management
    LEAVES: '/leaves',
    LEAVES_APPLY: '/leaves/apply',
    LEAVES_APPROVE: '/leaves/:id/approve',
    LEAVES_REJECT: '/leaves/:id/reject',
    
    // Settings
    SETTINGS: '/settings',
    SETTINGS_CLASS: '/settings/class/:classId',
    
    // Lock Management
    LOCK: '/lock',
    UNLOCK: '/unlock'
} as const;

// ============================================================================
// VALIDATION LIMITS
// ============================================================================

export const ATTENDANCE_LIMITS = {
    MAX_BULK_MARK_COUNT: 100,
    MAX_BACKDATED_DAYS: 30,
    MAX_LEAVE_DURATION_DAYS: 365,
    MAX_REMARK_LENGTH: 500,
    MAX_REJECTION_REASON_LENGTH: 500,
    MIN_ATTENDANCE_PERCENTAGE: 0,
    MAX_ATTENDANCE_PERCENTAGE: 100,
    MIN_WORKING_DAYS: 1,
    MAX_WORKING_DAYS: 7,
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 200
} as const;

// ============================================================================
// CACHE KEYS
// ============================================================================

export const ATTENDANCE_CACHE_KEYS = {
    SETTINGS: (institutionId: string, scope: AttendanceScope, classId?: string) => 
        `attendance:settings:${institutionId}:${scope}${classId ? `:${classId}` : ''}`,
    
    SUMMARY: (institutionId: string, entityId: string, academicYearId: string) =>
        `attendance:summary:${institutionId}:${entityId}:${academicYearId}`,
    
    CLASS_STATS: (institutionId: string, classId: string, date: string) =>
        `attendance:class:${institutionId}:${classId}:${date}`,
    
    WORKING_DAYS: (institutionId: string, academicYearId: string) =>
        `attendance:working_days:${institutionId}:${academicYearId}`
} as const;

// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================

export const NOTIFICATION_TEMPLATES = {
    STUDENT_ABSENT: {
        sms: 'Dear Parent, your ward {studentName} of class {className} was marked absent on {date}.',
        email: {
            subject: 'Attendance Alert - Student Absent',
            body: 'Dear Parent,\n\nThis is to inform you that your ward {studentName} of class {className} was marked absent on {date}.\n\nIf this was unexpected, please contact the school.\n\nRegards,\n{schoolName}'
        }
    },
    LOW_ATTENDANCE_WARNING: {
        sms: 'Alert: {studentName} attendance is {percentage}%, below minimum {minimumPercentage}%. Contact school.',
        email: {
            subject: 'Low Attendance Warning',
            body: 'Dear Parent,\n\n{studentName} current attendance is {percentage}%, which is below the required minimum of {minimumPercentage}%.\n\nPlease ensure regular attendance to avoid academic issues.\n\nRegards,\n{schoolName}'
        }
    },
    LEAVE_APPROVED: {
        sms: 'Leave approved for {studentName} from {startDate} to {endDate}.',
        email: {
            subject: 'Leave Application Approved',
            body: 'Dear Parent,\n\nThe leave application for {studentName} from {startDate} to {endDate} has been approved.\n\nRegards,\n{schoolName}'
        }
    },
    LEAVE_REJECTED: {
        sms: 'Leave request for {studentName} from {startDate} to {endDate} was rejected.',
        email: {
            subject: 'Leave Application Rejected',
            body: 'Dear Parent,\n\nThe leave application for {studentName} from {startDate} to {endDate} has been rejected.\n\nReason: {rejectionReason}\n\nRegards,\n{schoolName}'
        }
    }
} as const;
