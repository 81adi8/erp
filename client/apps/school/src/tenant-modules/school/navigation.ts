// School Module Navigation Configuration
import type { NavigationItem } from '../../core/config/tenantModuleConfig';

export const schoolNavigation: NavigationItem[] = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        icon: 'LayoutDashboard',
        permission: 'dashboard.view',
    },
    {
        id: 'students',
        label: 'Students',
        path: '/students',
        icon: 'Users',
        permission: 'students.view',
    },
    {
        id: 'teachers',
        label: 'Teachers',
        path: '/teachers',
        icon: 'GraduationCap',
        permission: 'teachers.view',
    },
    {
        id: 'classes',
        label: 'Classes',
        path: '/classes',
        icon: 'School',
        permission: 'classes.view',
    },
    {
        id: 'attendance',
        label: 'Attendance',
        path: '/attendance',
        icon: 'ClipboardCheck',
        permission: 'attendance.view',
    },
    {
        id: 'exams',
        label: 'Exams',
        path: '/exams',
        icon: 'FileText',
        permission: 'exams.view',
    },
    // TASK-04 PILOT: fees, timetable, analytics, university hidden until functional
    // {
    //     id: 'fees',
    //     label: 'Fees',
    //     path: '/fees',
    //     icon: 'CreditCard',
    //     permission: 'fees.view',
    // },
    // {
    //     id: 'timetable',
    //     label: 'Timetable',
    //     path: '/timetable',
    //     icon: 'Calendar',
    //     permission: 'timetable.view',
    // },
    // {
    //     id: 'analytics',
    //     label: 'Analytics',
    //     path: '/analytics',
    //     icon: 'BarChart2',
    //     permission: 'analytics.view',
    // },
    // {
    //     id: 'university',
    //     label: 'University',
    //     path: '/university',
    //     icon: 'Building2',
    //     permission: 'university.view',
    // },
    {
        id: 'settings',
        label: 'Settings',
        path: '/settings',
        icon: 'Settings',
        permission: 'settings.view',
    },
];

export default schoolNavigation;
