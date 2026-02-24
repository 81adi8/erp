// ============================================================================
// Admin Portal Navigation Configuration
// ============================================================================

import {
    LayoutDashboard
    Users
    GraduationCap
    School
    Settings
    Calendar
    CreditCard
    BarChart3
    Shield
    BookOpen
    Layers
    Library
    Clock
    UserPlus
    Bell
    FileText
    History
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface NavItem {
    id: string;
    label: string;
    path: string;
    icon: React.ReactNode;
    permission?: string;
    children?: NavItem[];
}

// ============================================================================
// Admin Navigation Items
// ============================================================================

export const ADMIN_NAVIGATION: NavItem[] = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/admin/dashboard',
        icon: <LayoutDashboard className="w-5 h-5" />,
        permission: 'dashboard.view',
    },
    {
        id: 'users',
        label: 'User Management',
        path: '/admin/users',
        icon: <Users className="w-5 h-5" />,
        permission: 'users.view',
    },
    {
        id: 'academics',
        label: 'Academics',
        path: '/admin/academics',
        icon: <GraduationCap className="w-5 h-5" />,
        permission: 'academics.classes.view',
        children: [
            {
                id: 'acad-dashboard',
                label: 'Overview',
                path: '/admin/academics/dashboard',
                icon: <LayoutDashboard className="w-4 h-4" />,
                permission: 'academics.classes.view',
            },
            {
                id: 'acad-sessions',
                label: 'Academic Sessions',
                path: '/admin/academics/sessions',
                icon: <Calendar className="w-4 h-4" />,
                permission: 'academics.sessions.view',
            },
            {
                id: 'acad-calendar',
                label: 'Academic Calendar',
                path: '/admin/academics/sessions/calendar',
                icon: <Calendar className="w-4 h-4" />,
                permission: 'academics.sessions.view',
            },
            {
                id: 'acad-classes',
                label: 'Classes',
                path: '/admin/academics/classes',
                icon: <School className="w-4 h-4" />,
                permission: 'academics.classes.view',
            },
            {
                id: 'acad-sections',
                label: 'Sections',
                path: '/admin/academics/sections',
                icon: <Layers className="w-4 h-4" />,
                permission: 'academics.classes.view',
            },
            {
                id: 'acad-subjects',
                label: 'Subjects',
                path: '/admin/academics/subjects',
                icon: <BookOpen className="w-4 h-4" />,
                permission: 'academics.subjects.view',
            },
            {
                id: 'acad-curriculum',
                label: 'Curriculum',
                path: '/admin/academics/curriculum',
                icon: <Library className="w-4 h-4" />,
                permission: 'academics.curriculum.view',
            },
            {
                id: 'acad-lesson-plans',
                label: 'Lesson Plans',
                path: '/admin/academics/lesson-plans',
                icon: <Clock className="w-4 h-4" />,
                permission: 'academics.lessonPlans.view',
            },
        ]
    },
    {
        id: 'attendance',
        label: 'Attendance',
        path: '/admin/attendance',
        icon: <Calendar className="w-5 h-5" />,
        permission: 'attendance.dashboard.view',
        children: [
            {
                id: 'attendance-dashboard',
                label: 'Dashboard',
                path: '/admin/attendance/dashboard',
                icon: <LayoutDashboard className="w-4 h-4" />,
                permission: 'attendance.dashboard.view',
            },
            {
                id: 'attendance-marking',
                label: 'Mark Attendance',
                path: '/admin/attendance/marking',
                icon: <Calendar className="w-4 h-4" />,
                permission: 'attendance.marking.mark',
            },
            {
                id: 'attendance-history',
                label: 'History',
                path: '/admin/attendance/history',
                icon: <History className="w-4 h-4" />,
                permission: 'attendance.history.view',
            },
        ]
    },
    {
        id: 'admissions',
        label: 'Admissions',
        path: '/admin/admissions',
        icon: <UserPlus className="w-5 h-5" />,
        permission: 'users.students.manage',
    },
    {
        id: 'communication',
        label: 'Communication',
        path: '/admin/communication',
        icon: <Bell className="w-5 h-5" />,
        permission: 'communication.view',
        children: [
            {
                id: 'communication-notices',
                label: 'Notices',
                path: '/admin/communication/notices',
                icon: <Bell className="w-4 h-4" />,
                permission: 'communication.notices.view',
            },
        ]
    },
    {
        id: 'fees',
        label: 'Fees',
        path: '/admin/fees',
        icon: <CreditCard className="w-5 h-5" />,
        permission: 'fees.view',
    },
    {
        id: 'reports',
        label: 'Reports',
        path: '/admin/reports',
        icon: <BarChart3 className="w-5 h-5" />,
        permission: 'reports.view',
    },
    {
        id: 'settings',
        label: 'Settings',
        path: '/admin/settings',
        icon: <Settings className="w-5 h-5" />,
        permission: 'settings.view',
        children: [
            {
                id: 'settings-general',
                label: 'General Settings',
                path: '/admin/settings/general',
                icon: <Settings className="w-4 h-4" />,
            },
            {
                id: 'settings-roles',
                label: 'Roles & Permissions',
                path: '/admin/settings/roles',
                icon: <Shield className="w-4 h-4" />,
                permission: 'settings.roles.manage',
            },
        ]
    },
];

