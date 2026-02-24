// ============================================================================
// ATTENDANCE MODULE - CUSTOM ERRORS
// ============================================================================

export class AttendanceError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number = 400
    ) {
        super(message);
        this.name = 'AttendanceError';
    }
}

// ============================================================================
// ERROR CODES
// ============================================================================

export const AttendanceErrorCodes = {
    // Record Errors
    ATTENDANCE_NOT_FOUND: 'ATTENDANCE_NOT_FOUND',
    ATTENDANCE_DUPLICATE: 'ATTENDANCE_DUPLICATE',
    ATTENDANCE_LOCKED: 'ATTENDANCE_LOCKED',
    ATTENDANCE_NOT_LOCKED: 'ATTENDANCE_NOT_LOCKED',
    
    // Validation Errors
    INVALID_DATE: 'INVALID_DATE',
    INVALID_STATUS: 'INVALID_STATUS',
    INVALID_SCOPE: 'INVALID_SCOPE',
    INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
    FUTURE_DATE_NOT_ALLOWED: 'FUTURE_DATE_NOT_ALLOWED',
    BACKDATED_NOT_ALLOWED: 'BACKDATED_NOT_ALLOWED',
    BACKDATED_LIMIT_EXCEEDED: 'BACKDATED_LIMIT_EXCEEDED',
    EDIT_WINDOW_EXPIRED: 'EDIT_WINDOW_EXPIRED',
    
    // Permission Errors
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
    NOT_CLASS_TEACHER: 'NOT_CLASS_TEACHER',
    
    // Entity Errors
    STUDENT_NOT_FOUND: 'STUDENT_NOT_FOUND',
    TEACHER_NOT_FOUND: 'TEACHER_NOT_FOUND',
    STAFF_NOT_FOUND: 'STAFF_NOT_FOUND',
    CLASS_NOT_FOUND: 'CLASS_NOT_FOUND',
    SECTION_NOT_FOUND: 'SECTION_NOT_FOUND',
    ACADEMIC_YEAR_NOT_FOUND: 'ACADEMIC_YEAR_NOT_FOUND',
    
    // Leave Errors
    LEAVE_NOT_FOUND: 'LEAVE_NOT_FOUND',
    LEAVE_ALREADY_APPROVED: 'LEAVE_ALREADY_APPROVED',
    LEAVE_ALREADY_REJECTED: 'LEAVE_ALREADY_REJECTED',
    LEAVE_CANCELLED: 'LEAVE_CANCELLED',
    LEAVE_OVERLAP: 'LEAVE_OVERLAP',
    LEAVE_INVALID_DATES: 'LEAVE_INVALID_DATES',
    LEAVE_DURATION_EXCEEDED: 'LEAVE_DURATION_EXCEEDED',
    
    // Settings Errors
    SETTINGS_NOT_FOUND: 'SETTINGS_NOT_FOUND',
    SETTINGS_DUPLICATE: 'SETTINGS_DUPLICATE',
    INVALID_CONFIG: 'INVALID_CONFIG',
    
    // Session Errors
    SESSION_LOCKED: 'SESSION_LOCKED',
    SESSION_NOT_ACTIVE: 'SESSION_NOT_ACTIVE',
    HOLIDAY_DATE: 'HOLIDAY_DATE',
    OUT_OF_SESSION_RANGE: 'OUT_OF_SESSION_RANGE',
    
    // Bulk Operation Errors
    BULK_LIMIT_EXCEEDED: 'BULK_LIMIT_EXCEEDED',
    PARTIAL_SUCCESS: 'PARTIAL_SUCCESS',
    
    // Report Errors
    REPORT_GENERATION_FAILED: 'REPORT_GENERATION_FAILED',
    EXPORT_FAILED: 'EXPORT_FAILED',
    
    // General Errors
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    INSTITUTION_REQUIRED: 'INSTITUTION_REQUIRED',
    ACADEMIC_YEAR_REQUIRED: 'ACADEMIC_YEAR_REQUIRED'
} as const;

// ============================================================================
// ERROR MESSAGES (for consistent messaging)
// ============================================================================

export const AttendanceErrorMessages: Record<string, string> = {
    [AttendanceErrorCodes.ATTENDANCE_NOT_FOUND]: 'Attendance record not found',
    [AttendanceErrorCodes.ATTENDANCE_DUPLICATE]: 'Attendance already marked for this date',
    [AttendanceErrorCodes.ATTENDANCE_LOCKED]: 'Attendance record is locked and cannot be modified',
    [AttendanceErrorCodes.ATTENDANCE_NOT_LOCKED]: 'Attendance record is not locked',
    [AttendanceErrorCodes.INVALID_DATE]: 'Invalid date provided',
    [AttendanceErrorCodes.INVALID_STATUS]: 'Invalid attendance status',
    [AttendanceErrorCodes.FUTURE_DATE_NOT_ALLOWED]: 'Cannot mark attendance for future dates',
    [AttendanceErrorCodes.BACKDATED_NOT_ALLOWED]: 'Backdated attendance marking is not allowed',
    [AttendanceErrorCodes.BACKDATED_LIMIT_EXCEEDED]: 'Backdated marking limit exceeded',
    [AttendanceErrorCodes.EDIT_WINDOW_EXPIRED]: 'Edit window has expired',
    [AttendanceErrorCodes.PERMISSION_DENIED]: 'You do not have permission to perform this action',
    [AttendanceErrorCodes.APPROVAL_REQUIRED]: 'This action requires approval from admin',
    [AttendanceErrorCodes.NOT_CLASS_TEACHER]: 'You are not the class teacher for this section',
    [AttendanceErrorCodes.STUDENT_NOT_FOUND]: 'Student not found',
    [AttendanceErrorCodes.TEACHER_NOT_FOUND]: 'Teacher not found',
    [AttendanceErrorCodes.STAFF_NOT_FOUND]: 'Staff member not found',
    [AttendanceErrorCodes.CLASS_NOT_FOUND]: 'Class not found',
    [AttendanceErrorCodes.SECTION_NOT_FOUND]: 'Section not found',
    [AttendanceErrorCodes.ACADEMIC_YEAR_NOT_FOUND]: 'Academic year not found',
    [AttendanceErrorCodes.LEAVE_NOT_FOUND]: 'Leave application not found',
    [AttendanceErrorCodes.LEAVE_ALREADY_APPROVED]: 'Leave has already been approved',
    [AttendanceErrorCodes.LEAVE_ALREADY_REJECTED]: 'Leave has already been rejected',
    [AttendanceErrorCodes.LEAVE_CANCELLED]: 'Leave has been cancelled',
    [AttendanceErrorCodes.LEAVE_OVERLAP]: 'Leave dates overlap with existing leave',
    [AttendanceErrorCodes.LEAVE_DURATION_EXCEEDED]: 'Leave duration exceeds maximum allowed days',
    [AttendanceErrorCodes.SETTINGS_NOT_FOUND]: 'Attendance settings not found',
    [AttendanceErrorCodes.SESSION_LOCKED]: 'Academic session is locked',
    [AttendanceErrorCodes.SESSION_NOT_ACTIVE]: 'Academic session is not active',
    [AttendanceErrorCodes.HOLIDAY_DATE]: 'Cannot mark attendance on a holiday',
    [AttendanceErrorCodes.BULK_LIMIT_EXCEEDED]: 'Bulk operation limit exceeded',
    [AttendanceErrorCodes.VALIDATION_ERROR]: 'Validation failed',
    [AttendanceErrorCodes.INTERNAL_ERROR]: 'An internal error occurred',
    [AttendanceErrorCodes.INSTITUTION_REQUIRED]: 'Institution ID is required',
    [AttendanceErrorCodes.ACADEMIC_YEAR_REQUIRED]: 'Academic year ID is required'
};

// ============================================================================
// ERROR FACTORY
// ============================================================================

export const createAttendanceError = (
    code: keyof typeof AttendanceErrorCodes,
    customMessage?: string,
    statusCode: number = 400
): AttendanceError => {
    const message = customMessage || AttendanceErrorMessages[AttendanceErrorCodes[code]] || 'Unknown error';
    return new AttendanceError(message, AttendanceErrorCodes[code], statusCode);
};
