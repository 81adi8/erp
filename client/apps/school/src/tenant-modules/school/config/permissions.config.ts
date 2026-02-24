// ============================================================================
// Permission Configuration - Centralized Permission Definitions
// ============================================================================

// ============================================================================
// Permission Categories
// ============================================================================

export const PERMISSION_CATEGORIES = {
    DASHBOARD: 'dashboard',
    USERS: 'users',
    STUDENTS: 'students',
    TEACHERS: 'teachers',
    CLASSES: 'classes',
    ATTENDANCE: 'attendance',
    EXAMS: 'exams',
    GRADES: 'grades',
    FEES: 'fees',
    TIMETABLE: 'timetable',
    ASSIGNMENTS: 'assignments',
    REPORTS: 'reports',
    SETTINGS: 'settings',
    PROFILE: 'profile',
} as const;

// ============================================================================
// Permission Actions
// ============================================================================

export const PERMISSION_ACTIONS = {
    VIEW: 'view',
    CREATE: 'create',
    EDIT: 'edit',
    DELETE: 'delete',
    EXPORT: 'export',
    IMPORT: 'import',
    MANAGE: 'manage',
} as const;

// ============================================================================
// Permission Definitions by Portal
// ============================================================================

/**
 * Admin Portal Permissions
 * Full access to school management
 */
export const ADMIN_PERMISSIONS = {
    // Dashboard
    DASHBOARD_VIEW: 'dashboard.view',
    DASHBOARD_ANALYTICS: 'dashboard.analytics',

    // User Management
    USERS_VIEW: 'users.view',
    USERS_CREATE: 'users.create',
    USERS_EDIT: 'users.edit',
    USERS_DELETE: 'users.delete',
    USERS_MANAGE_ROLES: 'users.manage_roles',

    // Students
    STUDENTS_VIEW: 'students.view',
    STUDENTS_CREATE: 'students.create',
    STUDENTS_EDIT: 'students.edit',
    STUDENTS_DELETE: 'students.delete',
    STUDENTS_EXPORT: 'students.export',

    // Teachers
    TEACHERS_VIEW: 'teachers.view',
    TEACHERS_CREATE: 'teachers.create',
    TEACHERS_EDIT: 'teachers.edit',
    TEACHERS_DELETE: 'teachers.delete',

    // Classes
    CLASSES_VIEW: 'classes.view',
    CLASSES_CREATE: 'classes.create',
    CLASSES_EDIT: 'classes.edit',
    CLASSES_DELETE: 'classes.delete',
    CLASSES_ASSIGN_TEACHERS: 'classes.assign_teachers',

    // Settings
    SETTINGS_VIEW: 'settings.view',
    SETTINGS_EDIT: 'settings.edit',
    SETTINGS_ACADEMIC: 'settings.academic',

    // Reports
    REPORTS_VIEW: 'reports.view',
    REPORTS_GENERATE: 'reports.generate',
    REPORTS_EXPORT: 'reports.export',
} as const;

/**
 * Teacher Portal Permissions
 * Class and student management
 */
export const TEACHER_PERMISSIONS = {
    // Dashboard
    DASHBOARD_VIEW: 'dashboard.view',

    // My Classes
    MY_CLASSES_VIEW: 'my_classes.view',
    MY_CLASSES_MANAGE: 'my_classes.manage',

    // Attendance
    ATTENDANCE_VIEW: 'attendance.view',
    ATTENDANCE_MARK: 'attendance.mark',
    ATTENDANCE_EDIT: 'attendance.edit',

    // Gradebook
    GRADES_VIEW: 'grades.view',
    GRADES_ENTER: 'grades.enter',
    GRADES_EDIT: 'grades.edit',

    // Assignments
    ASSIGNMENTS_VIEW: 'assignments.view',
    ASSIGNMENTS_CREATE: 'assignments.create',
    ASSIGNMENTS_GRADE: 'assignments.grade',

    // Exams
    EXAMS_VIEW: 'exams.view',
    EXAMS_CREATE: 'exams.create',
    EXAMS_GRADE: 'exams.grade',

    // Profile
    PROFILE_VIEW: 'profile.view',
    PROFILE_EDIT: 'profile.edit',
} as const;

/**
 * Student Portal Permissions
 * View-only with assignment submission
 */
export const STUDENT_PERMISSIONS = {
    // Dashboard
    DASHBOARD_VIEW: 'dashboard.view',

    // Courses
    MY_COURSES_VIEW: 'my_courses.view',

    // Assignments
    ASSIGNMENTS_VIEW: 'assignments.view',
    ASSIGNMENTS_SUBMIT: 'assignments.submit',

    // Grades
    MY_GRADES_VIEW: 'my_grades.view',

    // Attendance
    MY_ATTENDANCE_VIEW: 'my_attendance.view',

    // Timetable
    TIMETABLE_VIEW: 'timetable.view',

    // Profile
    PROFILE_VIEW: 'profile.view',
    PROFILE_EDIT: 'profile.edit',
} as const;

/**
 * Staff Portal Permissions
 * Task-based access
 */
export const STAFF_PERMISSIONS = {
    // Dashboard
    DASHBOARD_VIEW: 'dashboard.view',

    // Tasks
    TASKS_VIEW: 'tasks.view',
    TASKS_UPDATE: 'tasks.update',

    // Attendance
    MY_ATTENDANCE_VIEW: 'my_attendance.view',

    // Profile
    PROFILE_VIEW: 'profile.view',
    PROFILE_EDIT: 'profile.edit',
} as const;

// ============================================================================
// Permission Helper Functions
// ============================================================================

/**
 * Check if a permission belongs to a category
 */
export function isPermissionInCategory(permission: string, category: string): boolean {
    return permission.startsWith(`${category}.`);
}

/**
 * Get all permissions for a category
 */
export function getPermissionsForCategory(
    permissions: Record<string, string>,
    category: string
): string[] {
    return Object.values(permissions).filter(p => isPermissionInCategory(p, category));
}
