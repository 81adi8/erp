// Coaching Module Entry Point
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { TenantModule, NavigationItem } from '../../core/config/tenantModuleConfig';

// Lazy load routes component
const CoachingRoutes = lazy(() => import('./routes'));

// Coaching navigation
export const coachingNavigation: NavigationItem[] = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', permission: 'dashboard.view' },
    { id: 'batches', label: 'Batches', path: '/batches', icon: 'Users', permission: 'batches.view' },
    { id: 'students', label: 'Students', path: '/students', icon: 'GraduationCap', permission: 'students.view' },
    { id: 'faculty', label: 'Faculty', path: '/faculty', icon: 'User', permission: 'faculty.view' },
    { id: 'test-series', label: 'Test Series', path: '/test-series', icon: 'FileText', permission: 'tests.view' },
    { id: 'schedules', label: 'Schedules', path: '/schedules', icon: 'Calendar', permission: 'schedules.view' },
    { id: 'performance', label: 'Performance', path: '/performance', icon: 'BarChart', permission: 'performance.view' },
    { id: 'fees', label: 'Fees', path: '/fees', icon: 'CreditCard', permission: 'fees.view' },
    { id: 'settings', label: 'Settings', path: '/settings', icon: 'Settings', permission: 'settings.view' },
];

// Module config
export const coachingModuleConfig = {
    type: 'coaching' as const,
    name: 'Coaching Institute',
    description: 'Test series and batch management for coaching centers',
    version: '1.0.0',
    features: {
        dashboard: { enabled: true, permission: 'dashboard.view' },
        batches: { enabled: true, permission: 'batches.view' },
        students: { enabled: true, permission: 'students.view' },
        faculty: { enabled: true, permission: 'faculty.view' },
        testSeries: { enabled: true, permission: 'tests.view' },
        schedules: { enabled: true, permission: 'schedules.view' },
        performance: { enabled: true, permission: 'performance.view' },
        fees: { enabled: true, permission: 'fees.view' },
    },
};

// Coaching Module Definition
export const CoachingModule: TenantModule = {
    routes: CoachingRoutes as LazyExoticComponent<ComponentType>,
    navigation: coachingNavigation,
    config: coachingModuleConfig,
};

export default CoachingModule;
