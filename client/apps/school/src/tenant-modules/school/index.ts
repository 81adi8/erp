// School Tenant Module - Main Entry
import { lazy } from 'react';
import type { TenantModule, NavigationItem } from '../../core/config/tenantModuleConfig';

// Lazy load routes
const SchoolRoutes = lazy(() => import('./routes'));

// Navigation configuration (shared across portals)
const navigation: NavigationItem[] = [
    { id: 'admin', label: 'Admin Portal', path: '/admin', icon: 'Shield' },
    { id: 'teacher', label: 'Teacher Portal', path: '/teacher', icon: 'GraduationCap' },
    { id: 'student', label: 'Student Portal', path: '/student', icon: 'BookOpen' },
    { id: 'staff', label: 'Staff Portal', path: '/staff', icon: 'Briefcase' },
];

// Module configuration
const config = {
    type: 'school' as const,
    name: 'School Management',
    description: 'Complete K-12 school ERP solution',
    version: '1.0.0',
    features: {
        students: { enabled: true, permission: 'students.view' },
        teachers: { enabled: true, permission: 'teachers.view' },
        classes: { enabled: true, permission: 'classes.view' },
        attendance: { enabled: true, permission: 'attendance.view' },
        fees: { enabled: true, permission: 'fees.view' },
        exams: { enabled: true, permission: 'exams.view' },
    },
};

// Export the tenant module
const schoolModule: TenantModule = {
    routes: SchoolRoutes,
    navigation,
    config,
};

export default schoolModule;

// Also export named exports for direct imports
export { SchoolRoutes };
export * from './config';
export * from './shared';
