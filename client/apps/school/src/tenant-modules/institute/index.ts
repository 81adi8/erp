// Institute Module Entry Point (Generic)
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { TenantModule, NavigationItem } from '../../core/config/tenantModuleConfig';

const InstituteRoutes = lazy(() => import('./routes'));

export const instituteNavigation: NavigationItem[] = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', permission: 'dashboard.view' },
    { id: 'students', label: 'Students', path: '/students', icon: 'Users', permission: 'students.view' },
    { id: 'staff', label: 'Staff', path: '/staff', icon: 'User', permission: 'staff.view' },
    { id: 'courses', label: 'Courses', path: '/courses', icon: 'BookOpen', permission: 'courses.view' },
    { id: 'attendance', label: 'Attendance', path: '/attendance', icon: 'ClipboardCheck', permission: 'attendance.view' },
    { id: 'fees', label: 'Fees', path: '/fees', icon: 'CreditCard', permission: 'fees.view' },
    { id: 'reports', label: 'Reports', path: '/reports', icon: 'BarChart', permission: 'reports.view' },
    { id: 'settings', label: 'Settings', path: '/settings', icon: 'Settings', permission: 'settings.view' },
];

export const instituteModuleConfig = {
    type: 'institute' as const,
    name: 'Generic Institute',
    description: 'Flexible institute management system',
    version: '1.0.0',
    features: {
        dashboard: { enabled: true, permission: 'dashboard.view' },
        students: { enabled: true, permission: 'students.view' },
        staff: { enabled: true, permission: 'staff.view' },
        courses: { enabled: true, permission: 'courses.view' },
        attendance: { enabled: true, permission: 'attendance.view' },
        fees: { enabled: true, permission: 'fees.view' },
        reports: { enabled: true, permission: 'reports.view' },
    },
};

export const InstituteModule: TenantModule = {
    routes: InstituteRoutes as LazyExoticComponent<ComponentType>,
    navigation: instituteNavigation,
    config: instituteModuleConfig,
};

export default InstituteModule;
