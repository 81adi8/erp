// ============================================================================
// Module Registry - Dynamic Module Loading
// ============================================================================

import { lazy, type ComponentType } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ModuleDefinition {
    id: string;
    name: string;
    description: string;
    portal: string;
    path: string;
    component: () => Promise<{ default: ComponentType }>;
    permissions?: string[];
    icon?: string;
}

// ============================================================================
// Module Registry
// ============================================================================

/**
 * Central registry of all dynamically loadable modules
 * Organized by portal.module pattern
 */
export const MODULE_REGISTRY: Record<string, ModuleDefinition> = {
    // ========================================================================
    // Admin Portal Modules
    // ========================================================================
    'admin.dashboard': {
        id: 'admin.dashboard',
        name: 'Dashboard',
        description: 'School overview and analytics',
        portal: 'admin',
        path: 'dashboard',
        component: () => import('../portals/admin/modules/dashboard/DashboardPage'),
        permissions: ['dashboard.view'],
        icon: 'LayoutDashboard',
    },
    'admin.users': {
        id: 'admin.users',
        name: 'User Management',
        description: 'Manage users and roles',
        portal: 'admin',
        path: 'users',
        component: () => import('../portals/admin/modules/users/UsersPage'),
        permissions: ['users.view'],
        icon: 'Users',
    },
    'admin.students': {
        id: 'admin.students',
        name: 'Students',
        description: 'Student management',
        portal: 'admin',
        path: 'students',
        component: () => import('../portals/admin/modules/students/StudentsPage'),
        permissions: ['students.view'],
        icon: 'UserSquare',
    },
    'admin.teachers': {
        id: 'admin.teachers',
        name: 'Teachers',
        description: 'Teacher management',
        portal: 'admin',
        path: 'teachers',
        component: () => import('../portals/admin/modules/teachers/TeachersPage'),
        permissions: ['teachers.view'],
        icon: 'GraduationCap',
    },
    'admin.classes': {
        id: 'admin.classes',
        name: 'Classes',
        description: 'Class and section management',
        portal: 'admin',
        path: 'classes',
        component: () => import('../portals/admin/modules/academics/ClassesPage'),
        permissions: ['classes.view'],
        icon: 'School',
    },
    'admin.settings': {
        id: 'admin.settings',
        name: 'Settings',
        description: 'School settings',
        portal: 'admin',
        path: 'settings',
        component: () => import('../portals/admin/modules/settings/SettingsPage'),
        permissions: ['settings.view'],
        icon: 'Settings',
    },

    // ========================================================================
    // Teacher Portal Modules
    // ========================================================================
    'teacher.dashboard': {
        id: 'teacher.dashboard',
        name: 'Dashboard',
        description: 'Teaching overview',
        portal: 'teacher',
        path: 'dashboard',
        component: () => import('../portals/teacher/modules/dashboard/DashboardPage'),
        permissions: ['dashboard.view'],
        icon: 'LayoutDashboard',
    },
    'teacher.my-classes': {
        id: 'teacher.my-classes',
        name: 'My Classes',
        description: 'Classes you teach',
        portal: 'teacher',
        path: 'my-classes',
        component: () => import('../portals/teacher/modules/classes/MyClassesPage'),
        permissions: ['my_classes.view'],
        icon: 'BookOpen',
    },
    'teacher.attendance': {
        id: 'teacher.attendance',
        name: 'Attendance',
        description: 'Mark and view attendance',
        portal: 'teacher',
        path: 'attendance',
        component: () => import('../portals/teacher/modules/attendance/AttendancePage'),
        permissions: ['attendance.view'],
        icon: 'ClipboardCheck',
    },
    'teacher.gradebook': {
        id: 'teacher.gradebook',
        name: 'Gradebook',
        description: 'Enter and manage grades',
        portal: 'teacher',
        path: 'gradebook',
        component: () => import('../portals/teacher/modules/gradebook/GradebookPage'),
        permissions: ['grades.view'],
        icon: 'FileSpreadsheet',
    },

    // ========================================================================
    // Student Portal Modules
    // ========================================================================
    'student.dashboard': {
        id: 'student.dashboard',
        name: 'Dashboard',
        description: 'Your academic overview',
        portal: 'student',
        path: 'dashboard',
        component: () => import('../portals/student/modules/dashboard/DashboardPage'),
        permissions: ['dashboard.view'],
        icon: 'LayoutDashboard',
    },
    'student.courses': {
        id: 'student.courses',
        name: 'My Courses',
        description: 'Your enrolled courses',
        portal: 'student',
        path: 'courses',
        component: () => import('../portals/student/modules/courses/CoursesPage'),
        permissions: ['my_courses.view'],
        icon: 'BookOpen',
    },
    'student.assignments': {
        id: 'student.assignments',
        name: 'Assignments',
        description: 'View and submit assignments',
        portal: 'student',
        path: 'assignments',
        component: () => import('../portals/student/modules/assignments/AssignmentsPage'),
        permissions: ['assignments.view'],
        icon: 'ClipboardList',
    },
    'student.grades': {
        id: 'student.grades',
        name: 'My Grades',
        description: 'View your grades',
        portal: 'student',
        path: 'grades',
        component: () => import('../portals/student/modules/grades/GradesPage'),
        permissions: ['my_grades.view'],
        icon: 'Award',
    },

    // ========================================================================
    // Staff Portal Modules
    // ========================================================================
    'staff.dashboard': {
        id: 'staff.dashboard',
        name: 'Dashboard',
        description: 'Your work overview',
        portal: 'staff',
        path: 'dashboard',
        component: () => import('../portals/staff/modules/dashboard/DashboardPage'),
        permissions: ['dashboard.view'],
        icon: 'LayoutDashboard',
    },
    'staff.tasks': {
        id: 'staff.tasks',
        name: 'My Tasks',
        description: 'Assigned tasks',
        portal: 'staff',
        path: 'tasks',
        component: () => import('../portals/staff/modules/tasks/TasksPage'),
        permissions: ['tasks.view'],
        icon: 'ListTodo',
    },
};

// ============================================================================
// Module Utilities
// ============================================================================

/**
 * Get all modules for a specific portal
 */
export function getPortalModules(portalId: string): ModuleDefinition[] {
    return Object.values(MODULE_REGISTRY).filter(m => m.portal === portalId);
}

/**
 * Get a lazy-loaded component for a module
 */
export function getModuleComponent(moduleId: string): ComponentType | null {
    const module = MODULE_REGISTRY[moduleId];
    if (!module) return null;
    return lazy(module.component);
}

/**
 * Check if a module exists
 */
export function moduleExists(moduleId: string): boolean {
    return moduleId in MODULE_REGISTRY;
}
