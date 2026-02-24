// ============================================================================
// Route Permission Configuration
// ============================================================================
// This file maps routes to their required permissions.
// Used for:
// 1. Route protection with PermissionGuard
// 2. Server-side navigation building
// 3. Documentation reference
// ============================================================================

export interface RoutePermission {
    /** Route path pattern */
    path: string;
    /** Required permission(s) - user needs at least one */
    permissions?: string | string[];
    /** Required role(s) - user needs at least one */
    roles?: string[];
    /** If true, requires ALL permissions instead of ANY */
    requireAll?: boolean;
    /** Human-readable title for the route */
    title: string;
    /** Icon name for navigation */
    icon?: string;
    /** Child routes */
    children?: RoutePermission[];
}

// ============================================================================
// Admin Portal Routes
// ============================================================================

export const ADMIN_ROUTE_PERMISSIONS: RoutePermission[] = [
    {
        path: '/admin/dashboard',
        title: 'Dashboard',
        icon: 'LayoutDashboard',
        // No permission required - basic dashboard access
    },
    {
        path: '/admin/users',
        permissions: 'users.view',
        title: 'Users',
        icon: 'Users',
        children: [
            { path: '/admin/users/create', permissions: 'users.create', title: 'Create User' },
            { path: '/admin/users/:id/edit', permissions: 'users.edit', title: 'Edit User' },
            { path: '/admin/users/:id/delete', permissions: 'users.delete', title: 'Delete User' },
        ],
    },
    {
        path: '/admin/students',
        permissions: 'academics.students.view',
        title: 'Students',
        icon: 'Users',
        children: [
            { path: '/admin/students/create', permissions: 'academics.students.create', title: 'Add Student' },
            { path: '/admin/students/:id/edit', permissions: 'academics.students.edit', title: 'Edit Student' },
        ],
    },
    {
        path: '/admin/teachers',
        permissions: 'academics.teachers.view',
        title: 'Teachers',
        icon: 'GraduationCap',
        children: [
            { path: '/admin/teachers/create', permissions: 'academics.teachers.create', title: 'Add Teacher' },
            { path: '/admin/teachers/:id/edit', permissions: 'academics.teachers.edit', title: 'Edit Teacher' },
        ],
    },
    {
        path: '/admin/classes',
        permissions: 'academics.classes.view',
        title: 'Classes',
        icon: 'School',
        children: [
            { path: '/admin/classes/create', permissions: 'academics.classes.create', title: 'Create Class' },
            { path: '/admin/classes/:id/edit', permissions: 'academics.classes.edit', title: 'Edit Class' },
        ],
    },
    {
        path: '/admin/attendance',
        permissions: 'attendance.view',
        title: 'Attendance',
        icon: 'ClipboardCheck',
        children: [
            { path: '/admin/attendance/mark', permissions: 'attendance.mark', title: 'Mark Attendance' },
            { path: '/admin/attendance/reports', permissions: 'attendance.reports', title: 'Attendance Reports' },
        ],
    },
    {
        path: '/admin/fees',
        permissions: 'finance.fees.view',
        title: 'Fees',
        icon: 'CreditCard',
        children: [
            { path: '/admin/fees/collect', permissions: 'finance.fees.collect', title: 'Collect Fees' },
            { path: '/admin/fees/reports', permissions: 'finance.fees.reports', title: 'Fee Reports' },
        ],
    },
    {
        path: '/admin/exams',
        permissions: 'exams.view',
        title: 'Exams',
        icon: 'FileText',
        children: [
            { path: '/admin/exams/create', permissions: 'exams.create', title: 'Create Exam' },
            { path: '/admin/exams/results', permissions: 'exams.results', title: 'Exam Results' },
        ],
    },
    {
        path: '/admin/reports',
        permissions: 'reports.view',
        title: 'Reports',
        icon: 'BarChart',
    },
    {
        path: '/admin/settings',
        permissions: 'settings.view',
        title: 'Settings',
        icon: 'Settings',
        children: [
            { path: '/admin/settings/general', permissions: 'settings.general', title: 'General Settings' },
            { path: '/admin/settings/roles', permissions: 'settings.roles', title: 'Role Management' },
            { path: '/admin/settings/permissions', permissions: 'settings.permissions', title: 'Permissions' },
        ],
    },
];

// ============================================================================
// Teacher Portal Routes
// ============================================================================

export const TEACHER_ROUTE_PERMISSIONS: RoutePermission[] = [
    {
        path: '/teacher/dashboard',
        title: 'Dashboard',
        icon: 'LayoutDashboard',
    },
    {
        path: '/teacher/classes',
        permissions: 'teacher.classes.view',
        title: 'My Classes',
        icon: 'School',
    },
    {
        path: '/teacher/attendance',
        permissions: 'attendance.mark',
        title: 'Attendance',
        icon: 'ClipboardCheck',
    },
    {
        path: '/teacher/grading',
        permissions: 'grades.manage',
        title: 'Grading',
        icon: 'FileText',
    },
    {
        path: '/teacher/schedule',
        permissions: 'schedule.view',
        title: 'Schedule',
        icon: 'Calendar',
    },
    {
        path: '/teacher/profile',
        title: 'Profile',
        icon: 'User',
    },
];

// ============================================================================
// Student Portal Routes
// ============================================================================

export const STUDENT_ROUTE_PERMISSIONS: RoutePermission[] = [
    {
        path: '/student/dashboard',
        title: 'Dashboard',
        icon: 'LayoutDashboard',
    },
    {
        path: '/student/courses',
        permissions: 'student.courses.view',
        title: 'My Courses',
        icon: 'BookOpen',
    },
    {
        path: '/student/assignments',
        permissions: 'student.assignments.view',
        title: 'Assignments',
        icon: 'FileText',
    },
    {
        path: '/student/grades',
        permissions: 'student.grades.view',
        title: 'Grades',
        icon: 'BarChart',
    },
    {
        path: '/student/timetable',
        permissions: 'student.timetable.view',
        title: 'Timetable',
        icon: 'Calendar',
    },
    {
        path: '/student/profile',
        title: 'Profile',
        icon: 'User',
    },
];

// ============================================================================
// Staff Portal Routes
// ============================================================================

export const STAFF_ROUTE_PERMISSIONS: RoutePermission[] = [
    {
        path: '/staff/dashboard',
        title: 'Dashboard',
        icon: 'LayoutDashboard',
    },
    {
        path: '/staff/tasks',
        permissions: 'staff.tasks.view',
        title: 'Tasks',
        icon: 'ClipboardCheck',
    },
    {
        path: '/staff/attendance',
        permissions: 'staff.attendance.view',
        title: 'Attendance',
        icon: 'Calendar',
    },
    {
        path: '/staff/profile',
        title: 'Profile',
        icon: 'User',
    },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all route permissions for a portal
 */
export function getPortalRoutePermissions(portal: 'admin' | 'teacher' | 'student' | 'staff'): RoutePermission[] {
    switch (portal) {
        case 'admin':
            return ADMIN_ROUTE_PERMISSIONS;
        case 'teacher':
            return TEACHER_ROUTE_PERMISSIONS;
        case 'student':
            return STUDENT_ROUTE_PERMISSIONS;
        case 'staff':
            return STAFF_ROUTE_PERMISSIONS;
        default:
            return [];
    }
}

/**
 * Find route permission by path
 */
export function findRoutePermission(
    path: string,
    routes: RoutePermission[] = [...ADMIN_ROUTE_PERMISSIONS, ...TEACHER_ROUTE_PERMISSIONS, ...STUDENT_ROUTE_PERMISSIONS, ...STAFF_ROUTE_PERMISSIONS]
): RoutePermission | undefined {
    for (const route of routes) {
        if (route.path === path) {
            return route;
        }
        if (route.children) {
            const found = findRoutePermission(path, route.children);
            if (found) return found;
        }
    }
    return undefined;
}

/**
 * Get all unique permissions from routes
 */
export function getAllRoutePermissions(): string[] {
    const permissions = new Set<string>();

    const collectPermissions = (routes: RoutePermission[]) => {
        for (const route of routes) {
            if (route.permissions) {
                const perms = Array.isArray(route.permissions) ? route.permissions : [route.permissions];
                perms.forEach(p => permissions.add(p));
            }
            if (route.children) {
                collectPermissions(route.children);
            }
        }
    };

    collectPermissions([
        ...ADMIN_ROUTE_PERMISSIONS,
        ...TEACHER_ROUTE_PERMISSIONS,
        ...STUDENT_ROUTE_PERMISSIONS,
        ...STAFF_ROUTE_PERMISSIONS,
    ]);

    return Array.from(permissions).sort();
}

export default {
    ADMIN_ROUTE_PERMISSIONS,
    TEACHER_ROUTE_PERMISSIONS,
    STUDENT_ROUTE_PERMISSIONS,
    STAFF_ROUTE_PERMISSIONS,
    getPortalRoutePermissions,
    findRoutePermission,
    getAllRoutePermissions,
};
