// University Module Entry Point
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { TenantModule, NavigationItem } from '../../core/config/tenantModuleConfig';

const UniversityRoutes = lazy(() => import('./routes'));

export const universityNavigation: NavigationItem[] = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', permission: 'dashboard.view' },
    { id: 'departments', label: 'Departments', path: '/departments', icon: 'Building', permission: 'departments.view' },
    { id: 'courses', label: 'Courses', path: '/courses', icon: 'BookOpen', permission: 'courses.view' },
    { id: 'students', label: 'Students', path: '/students', icon: 'GraduationCap', permission: 'students.view' },
    { id: 'faculty', label: 'Faculty', path: '/faculty', icon: 'Users', permission: 'faculty.view' },
    { id: 'semesters', label: 'Semesters', path: '/semesters', icon: 'Calendar', permission: 'semesters.view' },
    { id: 'research', label: 'Research', path: '/research', icon: 'FlaskConical', permission: 'research.view' },
    { id: 'fees', label: 'Fees', path: '/fees', icon: 'CreditCard', permission: 'fees.view' },
    { id: 'settings', label: 'Settings', path: '/settings', icon: 'Settings', permission: 'settings.view' },
];

export const universityModuleConfig = {
    type: 'university' as const,
    name: 'University Management',
    description: 'Higher education institution management',
    version: '1.0.0',
    features: {
        dashboard: { enabled: true, permission: 'dashboard.view' },
        departments: { enabled: true, permission: 'departments.view' },
        courses: { enabled: true, permission: 'courses.view' },
        students: { enabled: true, permission: 'students.view' },
        faculty: { enabled: true, permission: 'faculty.view' },
        semesters: { enabled: true, permission: 'semesters.view' },
        research: { enabled: true, permission: 'research.view' },
        fees: { enabled: true, permission: 'fees.view' },
    },
};

export const UniversityModule: TenantModule = {
    routes: UniversityRoutes as LazyExoticComponent<ComponentType>,
    navigation: universityNavigation,
    config: universityModuleConfig,
};

export default UniversityModule;
