// Permission constants and utilities
export const PERMISSIONS = {
    // Dashboard
    DASHBOARD_VIEW: 'dashboard.view',
    DASHBOARD_ANALYTICS: 'dashboard.analytics',

    // Students
    STUDENTS_VIEW: 'students.view',
    STUDENTS_CREATE: 'students.create',
    STUDENTS_UPDATE: 'students.update',
    STUDENTS_DELETE: 'students.delete',
    STUDENTS_EXPORT: 'students.export',

    // Teachers
    TEACHERS_VIEW: 'teachers.view',
    TEACHERS_CREATE: 'teachers.create',
    TEACHERS_UPDATE: 'teachers.update',
    TEACHERS_DELETE: 'teachers.delete',

    // Attendance
    ATTENDANCE_VIEW: 'attendance.view',
    ATTENDANCE_MARK: 'attendance.mark',
    ATTENDANCE_EDIT: 'attendance.edit',
    ATTENDANCE_REPORTS: 'attendance.reports',

    // Classes
    CLASSES_VIEW: 'classes.view',
    CLASSES_CREATE: 'classes.create',
    CLASSES_UPDATE: 'classes.update',
    CLASSES_DELETE: 'classes.delete',

    // Exams
    EXAMS_VIEW: 'exams.view',
    EXAMS_CREATE: 'exams.create',
    EXAMS_UPDATE: 'exams.update',
    EXAMS_DELETE: 'exams.delete',
    EXAMS_GRADES: 'exams.grades',

    // Fees
    FEES_VIEW: 'fees.view',
    FEES_CREATE: 'fees.create',
    FEES_COLLECT: 'fees.collect',
    FEES_REFUND: 'fees.refund',
    FEES_REPORTS: 'fees.reports',

    // Timetable
    TIMETABLE_VIEW: 'timetable.view',
    TIMETABLE_CREATE: 'timetable.create',
    TIMETABLE_UPDATE: 'timetable.update',

    // Settings
    SETTINGS_VIEW: 'settings.view',
    SETTINGS_UPDATE: 'settings.update',
    SETTINGS_USERS: 'settings.users',
    SETTINGS_ROLES: 'settings.roles',

    // Reports
    REPORTS_VIEW: 'reports.view',
    REPORTS_GENERATE: 'reports.generate',
    REPORTS_EXPORT: 'reports.export',
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
export type PermissionValue = typeof PERMISSIONS[PermissionKey];

// Role definitions
export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    PRINCIPAL: 'principal',
    TEACHER: 'teacher',
    STAFF: 'staff',
    STUDENT: 'student',
    PARENT: 'parent',
} as const;

export type RoleKey = keyof typeof ROLES;
export type RoleValue = typeof ROLES[RoleKey];
