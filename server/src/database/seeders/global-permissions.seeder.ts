import { Module } from '../models/public/Module.model';
import { Feature } from '../models/public/Feature.model';
import { Permission } from '../models/public/Permission.model';
import { Plan } from '../models/public/Plan.model';
import { PlanPermission } from '../models/public/PlanPermission.model';

/**
 * Permission Seed Data Structure
 * Organized by module → features → actions
 */
interface FeatureDefinition {
    slug: string;
    name: string;
    icon?: string;
    actions: string[];
    route_name?: string;
    route_title?: string;
}

interface ModuleDefinition {
    slug: string;
    name: string;
    icon?: string;
    institution_type: string;
    description?: string;
    route_name?: string;
    route_title?: string;
    features: FeatureDefinition[];
    children?: ModuleDefinition[];
}

/**
 * Seeder Statistics Tracking
 */
interface SeederStats {
    modulesCreated: number;
    modulesUpdated: number;
    featuresCreated: number;
    featuresUpdated: number;
    permissionsCreated: number;
    permissionsUpdated: number;
}

/**
 * Complete Permission Definitions for School ERP
 * Aligned with client routes structure
 */
const PERMISSION_DEFINITIONS: ModuleDefinition[] = [
    // ============================================================================
    // ROOT / PLATFORM CONTROL-PLANE MODULE
    // ============================================================================
    {
        slug: 'root',
        name: 'Root Control Plane',
        icon: 'ShieldCheck',
        institution_type: 'platform',
        description: 'Platform-level control plane permissions for root and super-admin routes',
        route_name: '/v1/root/admin',
        route_title: 'Root Control Plane',
        features: [
            {
                slug: 'config',
                name: 'Root Config',
                icon: 'Settings',
                actions: ['view', 'manage'],
                route_name: '/v1/root/admin/config',
                route_title: 'Root Config'
            },
            {
                slug: 'institutions',
                name: 'Root Institutions',
                icon: 'Building',
                actions: ['view', 'manage'],
                route_name: '/v1/root/admin/institutions',
                route_title: 'Root Institutions'
            },
            {
                slug: 'tenants',
                name: 'Root Tenants',
                icon: 'Layers',
                actions: ['manage'],
                route_name: '/v1/root/admin/tenants',
                route_title: 'Root Tenants'
            },
            {
                slug: 'auth',
                name: 'Root Auth',
                icon: 'KeyRound',
                actions: ['sessions.manage', '2fa.manage'],
                route_name: '/v1/root/admin/auth',
                route_title: 'Root Auth'
            },
            {
                slug: 'access',
                name: 'Root Access',
                icon: 'Shield',
                actions: ['manage'],
                route_name: '/v1/root/admin/access',
                route_title: 'Root Access Management'
            },
            {
                slug: 'admins',
                name: 'Root Admins',
                icon: 'UserCog',
                actions: ['manage'],
                route_name: '/v1/root/admin/admins',
                route_title: 'Root Admin Management'
            },
            {
                slug: 'holidays',
                name: 'Root Holidays',
                icon: 'Calendar',
                actions: ['manage'],
                route_name: '/v1/root/admin/holidays',
                route_title: 'Global Holidays'
            },
            {
                slug: 'plans',
                name: 'Root Plans',
                icon: 'CreditCard',
                actions: ['manage'],
                route_name: '/v1/root/admin/plans',
                route_title: 'Plan Management'
            },
            {
                slug: 'roles',
                name: 'Root Roles',
                icon: 'ShieldCheck',
                actions: ['manage'],
                route_name: '/v1/root/admin/roles',
                route_title: 'Role Template Management'
            }
        ]
    },

    // ============================================================================
    // SYSTEM / PLATFORM OPERATIONS MODULE
    // ============================================================================
    {
        slug: 'system',
        name: 'System Operations',
        icon: 'Cpu',
        institution_type: 'platform',
        description: 'Platform operations permissions (queues, platform lifecycle)',
        route_name: '/api/v1/system',
        route_title: 'System Operations',
        features: [
            {
                slug: 'queues',
                name: 'System Queues',
                icon: 'ListChecks',
                actions: ['manage'],
                route_name: '/api/v1/queues',
                route_title: 'Queue Operations'
            },
            {
                slug: 'platform',
                name: 'System Platform',
                icon: 'ServerCog',
                actions: ['manage'],
                route_name: '/v1/root/admin',
                route_title: 'Platform Operations'
            }
        ]
    },

    // ============================================================================
    // DASHBOARD MODULE
    // ============================================================================
    {
        slug: 'dashboard',
        name: 'Dashboard',
        icon: 'LayoutDashboard',
        institution_type: 'school',
        description: 'School overview, metrics, and analytics',
        route_name: '/dashboard',
        route_title: 'Dashboard',
        features: [
            { slug: 'overview', name: 'Overview', icon: 'Activity', actions: ['view'], route_name: '/dashboard', route_title: 'Overview' },
            { slug: 'analytics', name: 'Analytics', icon: 'BarChart3', actions: ['view', 'export'], route_name: '/dashboard/analytics', route_title: 'Analytics' },
        ]
    },

    // ============================================================================
    // NAVIGATION MODULE
    // ============================================================================
    {
        slug: 'navigation',
        name: 'Navigation',
        icon: 'Menu',
        institution_type: 'school',
        description: 'Navigation and permission access for authenticated users',
        route_name: '/navigation',
        route_title: 'Navigation',
        features: [
            { slug: 'menu', name: 'Navigation Menu', icon: 'Menu', actions: ['view'], route_name: '/navigation', route_title: 'Navigation' },
        ]
    },

    // ============================================================================
    // PARENT PORTAL MODULE
    // ============================================================================
    {
        slug: 'parent',
        name: 'Parent Portal',
        icon: 'Users',
        institution_type: 'school',
        description: 'Parent access to view student data',
        route_name: '/parent-portal',
        route_title: 'Parent Portal',
        features: [
            { slug: 'portal', name: 'Portal Access', icon: 'Eye', actions: ['view'], route_name: '/parent-portal', route_title: 'Portal Access' },
        ]
    },

    // ============================================================================
    // ACADEMICS MODULE
    // ============================================================================
    {
        slug: 'academics',
        name: 'Academics',
        icon: 'GraduationCap',
        institution_type: 'school',
        description: 'Academic management - classes, sessions, curriculum',
        route_name: '/academics',
        route_title: 'Academics',
        features: [
            // Main Academic Dashboard
            { slug: 'dashboard', name: 'Academic Dashboard', icon: 'LayoutDashboard', actions: ['view'], route_name: '/academics/dashboard', route_title: 'Academic Dashboard' },
            
            // Module Dashboards
            { slug: 'sessionsDashboard', name: 'Sessions Dashboard', icon: 'CalendarDays', actions: ['view'], route_name: '/academics/dashboard/sessions', route_title: 'Sessions Dashboard' },
            { slug: 'classesDashboard', name: 'Classes Dashboard', icon: 'School', actions: ['view'], route_name: '/academics/dashboard/classes', route_title: 'Classes Dashboard' },
            { slug: 'curriculumDashboard', name: 'Curriculum Dashboard', icon: 'BookCopy', actions: ['view'], route_name: '/academics/dashboard/curriculum', route_title: 'Curriculum Dashboard' },
            { slug: 'timetableDashboard', name: 'Timetable Dashboard', icon: 'Clock', actions: ['view'], route_name: '/academics/dashboard/timetable', route_title: 'Timetable Dashboard' },
            
            // Classes & Sections
            { slug: 'classes', name: 'Classes', icon: 'School', actions: ['view', 'create', 'edit', 'delete', 'manage'], route_name: '/academics/classes', route_title: 'Classes' },
            { slug: 'sections', name: 'Sections', icon: 'Layers', actions: ['view', 'create', 'edit', 'delete', 'manage'], route_name: '/academics/sections', route_title: 'Sections' },
            
            // Subjects
            { slug: 'subjects', name: 'Subjects', icon: 'BookOpen', actions: ['view', 'create', 'edit', 'delete', 'manage'], route_name: '/academics/subjects', route_title: 'Subjects' },
            
            // Sessions
            { slug: 'sessions', name: 'Academic Sessions', icon: 'CalendarDays', actions: ['view', 'create', 'edit', 'delete', 'manage', 'activate', 'promote'], route_name: '/academics/sessions', route_title: 'Sessions' },
            
            // Curriculum
            { slug: 'curriculum', name: 'Curriculum', icon: 'BookCopy', actions: ['view', 'create', 'edit', 'delete', 'manage'], route_name: '/academics/curriculum', route_title: 'Curriculum' },
            { slug: 'chapters', name: 'Chapters', icon: 'FileText', actions: ['view', 'create', 'edit', 'delete'], route_name: '/academics/curriculum/chapters', route_title: 'Chapters' },
            { slug: 'topics', name: 'Topics', icon: 'Target', actions: ['view', 'create', 'edit', 'delete'], route_name: '/academics/curriculum/topics', route_title: 'Topics' },
            
            // Lesson Plans
            { slug: 'lessonPlans', name: 'Lesson Plans', icon: 'FileText', actions: ['view', 'create', 'edit', 'delete', 'manage'], route_name: '/academics/lesson-plans', route_title: 'Lesson Plans' },
            
            // Timetable
            { slug: 'timetable', name: 'Timetable', icon: 'Clock', actions: ['view', 'create', 'edit', 'delete', 'generate', 'manage'], route_name: '/academics/timetable', route_title: 'Timetable' },
        ]
    },

    // ============================================================================
    // USERS MODULE
    // ============================================================================
    {
        slug: 'users',
        name: 'Users',
        icon: 'Users',
        institution_type: 'school',
        description: 'User management - teachers, students, staff, parents',
        route_name: '/users',
        route_title: 'Users',
        features: [
            // Teachers
            { slug: 'teachers', name: 'Teachers', icon: 'GraduationCap', actions: ['view', 'create', 'edit', 'delete', 'manage', 'assign'], route_name: '/users/teachers', route_title: 'Teachers' },
            
            // Students
            { slug: 'students', name: 'Students', icon: 'Users', actions: ['view', 'create', 'edit', 'delete', 'manage', 'admit', 'enroll', 'import', 'export'], route_name: '/users/students', route_title: 'Students' },
            
            // Staff
            { slug: 'staff', name: 'Staff', icon: 'UserCheck', actions: ['view', 'create', 'edit', 'delete', 'manage'], route_name: '/users/staff', route_title: 'Staff' },
            
            // Parents
            { slug: 'parents', name: 'Parents', icon: 'UserPlus', actions: ['view', 'create', 'edit', 'delete', 'manage'], route_name: '/users/parents', route_title: 'Parents' },
            
            // User Management
            { slug: 'management', name: 'User Management', icon: 'Settings', actions: ['view', 'manage', 'resetPassword'], route_name: '/users/management', route_title: 'User Management' },
        ]
    },

    // ============================================================================
    // ATTENDANCE MODULE
    // ============================================================================
    {
        slug: 'attendance',
        name: 'Attendance',
        icon: 'CalendarCheck',
        institution_type: 'school',
        description: 'Student and staff attendance management',
        route_name: '/attendance',
        route_title: 'Attendance',
        features: [
            { slug: 'dashboard', name: 'Attendance Dashboard', icon: 'LayoutDashboard', actions: ['view'], route_name: '/attendance/dashboard', route_title: 'Dashboard' },
            { slug: 'marking', name: 'Mark Attendance', icon: 'ClipboardCheck', actions: ['view', 'mark', 'edit'], route_name: '/attendance/marking', route_title: 'Mark Attendance' },
            { slug: 'student', name: 'Student Attendance', icon: 'Users', actions: ['view', 'mark', 'edit', 'manage', 'export'], route_name: '/attendance/student', route_title: 'Student Attendance' },
            { slug: 'teacher', name: 'Teacher Attendance', icon: 'GraduationCap', actions: ['view', 'mark', 'edit', 'manage', 'export'], route_name: '/attendance/teacher', route_title: 'Teacher Attendance' },
            { slug: 'staff', name: 'Staff Attendance', icon: 'UserCheck', actions: ['view', 'mark', 'edit', 'manage', 'export'], route_name: '/attendance/staff', route_title: 'Staff Attendance' },
            { slug: 'class', name: 'Class Attendance Summary', icon: 'BarChart3', actions: ['view', 'export'], route_name: '/attendance/class', route_title: 'Class Summary' },
            { slug: 'reports', name: 'Attendance Reports', icon: 'FileText', actions: ['view', 'generate', 'export'], route_name: '/attendance/reports', route_title: 'Reports' },
            { slug: 'history', name: 'Attendance History', icon: 'Clock', actions: ['view', 'edit', 'delete', 'audit'], route_name: '/attendance/history', route_title: 'History' },
            { slug: 'leaves', name: 'Leave Management', icon: 'Calendar', actions: ['view', 'apply', 'approve', 'reject'], route_name: '/attendance/leaves', route_title: 'Leaves' },
            { slug: 'settings', name: 'Attendance Settings', icon: 'Settings', actions: ['view', 'manage'], route_name: '/attendance/settings', route_title: 'Settings' },
            { slug: 'lock', name: 'Attendance Lock', icon: 'Lock', actions: ['manage'], route_name: '/attendance/lock', route_title: 'Lock Management' },
        ]
    },

    // ============================================================================
    // ADMISSIONS MODULE
    // ============================================================================
    {
        slug: 'admissions',
        name: 'Admissions',
        icon: 'UserPlus',
        institution_type: 'school',
        description: 'Manage student admissions and staff onboarding',
        route_name: '/admissions',
        route_title: 'Admissions',
        features: [
            { slug: 'dashboard', name: 'Admissions Dashboard', icon: 'LayoutDashboard', actions: ['view'], route_name: '/admissions/dashboard', route_title: 'Admissions Dashboard' },
            { slug: 'student', name: 'Student Admissions', icon: 'Users', actions: ['view', 'manage', 'enroll'], route_name: '/admissions/student', route_title: 'Student Admissions' },
            { slug: 'teacher', name: 'Teacher Onboarding', icon: 'GraduationCap', actions: ['view', 'manage'], route_name: '/admissions/teacher', route_title: 'Teacher Onboarding' },
            { slug: 'staff', name: 'Staff Onboarding', icon: 'UserCheck', actions: ['view', 'manage'], route_name: '/admissions/staff', route_title: 'Staff Onboarding' },
            { slug: 'reports', name: 'Admission Reports', icon: 'BarChart3', actions: ['view', 'generate', 'export'], route_name: '/admissions/reports', route_title: 'Admission Reports' },
        ]
    },

    // ============================================================================
    // FINANCE MODULE
    // ============================================================================
    {
        slug: 'finance',
        name: 'Finance',
        icon: 'DollarSign',
        institution_type: 'school',
        description: 'Fees, expenses, and financial management',
        route_name: '/finance',
        route_title: 'Finance',
        features: [
            // Fees
            { slug: 'fees', name: 'Fees Management', icon: 'Receipt', actions: ['view', 'create', 'edit', 'delete', 'collect', 'manage'], route_name: '/finance/fees', route_title: 'Fees' },
            { slug: 'feeStructure', name: 'Fee Structure', icon: 'FileSpreadsheet', actions: ['view', 'create', 'edit', 'delete', 'manage'], route_name: '/finance/fees/structure', route_title: 'Fee Structure' },
            { slug: 'feeCollections', name: 'Fee Collections', icon: 'Banknote', actions: ['view', 'collect', 'refund', 'export'], route_name: '/finance/fees/collections', route_title: 'Collections' },
            { slug: 'invoices', name: 'Invoices', icon: 'FileText', actions: ['view', 'create', 'print', 'send'], route_name: '/finance/fees/invoices', route_title: 'Invoices' },
            
            // Expenses
            { slug: 'expenses', name: 'Expenses', icon: 'Wallet', actions: ['view', 'create', 'edit', 'delete', 'approve'], route_name: '/finance/expenses', route_title: 'Expenses' },
            
            // Reports
            { slug: 'financialReports', name: 'Financial Reports', icon: 'PieChart', actions: ['view', 'generate', 'export'], route_name: '/finance/reports', route_title: 'Financial Reports' },
        ]
    },

    // ============================================================================
    // EXAMS MODULE
    // ============================================================================
    {
        slug: 'exams',
        name: 'Examinations',
        icon: 'ClipboardList',
        institution_type: 'school',
        description: 'Exam management, marks entry, and results',
        route_name: '/exams',
        route_title: 'Exams',
        features: [
            { slug: 'management', name: 'Exam Management', icon: 'FileSpreadsheet', actions: ['view', 'create', 'edit', 'delete', 'manage'], route_name: '/exams/management', route_title: 'Exam Management' },
            { slug: 'schedules', name: 'Exam Schedules', icon: 'Calendar', actions: ['view', 'create', 'edit', 'delete', 'publish'], route_name: '/exams/schedules', route_title: 'Schedules' },
            { slug: 'marks', name: 'Marks Entry', icon: 'Edit3', actions: ['view', 'enter', 'edit', 'approve', 'lock'], route_name: '/exams/marks', route_title: 'Marks Entry' },
            { slug: 'results', name: 'Results', icon: 'Award', actions: ['view', 'generate', 'publish', 'print'], route_name: '/exams/results', route_title: 'Results' },
            { slug: 'gradeSystem', name: 'Grade System', icon: 'Trophy', actions: ['view', 'create', 'edit', 'delete', 'manage'], route_name: '/exams/grade-system', route_title: 'Grade System' },
        ]
    },

    // ============================================================================
    // COMMUNICATION MODULE
    // ============================================================================
    {
        slug: 'communication',
        name: 'Communication',
        icon: 'MessageSquare',
        institution_type: 'school',
        description: 'Messages, announcements, and notifications',
        route_name: '/communication',
        route_title: 'Communication',
        features: [
            { slug: 'messages', name: 'Messages', icon: 'Mail', actions: ['view', 'send', 'delete'], route_name: '/communication/messages', route_title: 'Messages' },
            { slug: 'announcements', name: 'Announcements', icon: 'Megaphone', actions: ['view', 'create', 'edit', 'delete', 'publish'], route_name: '/communication/announcements', route_title: 'Announcements' },
            { slug: 'notices', name: 'Notices', icon: 'FileText', actions: ['view', 'manage'], route_name: '/communication/notices', route_title: 'Notices' },
            { slug: 'notifications', name: 'Notifications', icon: 'Bell', actions: ['view', 'send', 'manage'], route_name: '/communication/notifications', route_title: 'Notifications' },
        ]
    },

    // ============================================================================
    // REPORTS MODULE
    // ============================================================================
    {
        slug: 'reports',
        name: 'Reports',
        icon: 'BarChart3',
        institution_type: 'school',
        description: 'Analytics, custom reports, and data exports',
        route_name: '/reports',
        route_title: 'Reports',
        features: [
            { slug: 'analytics', name: 'Analytics Dashboard', icon: 'Activity', actions: ['view'], route_name: '/reports/analytics', route_title: 'Analytics' },
            { slug: 'academic', name: 'Academic Reports', icon: 'GraduationCap', actions: ['view', 'create', 'generate', 'export'], route_name: '/reports/academic', route_title: 'Academic Reports' },
            { slug: 'financial', name: 'Financial Reports', icon: 'DollarSign', actions: ['view', 'create', 'generate', 'export'], route_name: '/reports/financial', route_title: 'Financial Reports' },
            { slug: 'attendance', name: 'Attendance Reports', icon: 'CalendarCheck', actions: ['view', 'create', 'generate', 'export'], route_name: '/reports/attendance', route_title: 'Attendance Reports' },
            { slug: 'custom', name: 'Custom Reports', icon: 'FileSpreadsheet', actions: ['view', 'create', 'generate', 'export'], route_name: '/reports/custom', route_title: 'Custom Reports' },
        ]
    },

    // ============================================================================
    // SETTINGS MODULE
    // ============================================================================
    {
        slug: 'settings',
        name: 'Settings',
        icon: 'Settings',
        institution_type: 'school',
        description: 'System configuration and access control',
        route_name: '/settings',
        route_title: 'Settings',
        features: [
            { slug: 'general', name: 'General Settings', icon: 'Settings', actions: ['view', 'edit'], route_name: '/settings/general', route_title: 'General' },
            { slug: 'schoolInfo', name: 'School Information', icon: 'Building', actions: ['view', 'edit'], route_name: '/settings/school-info', route_title: 'School Info' },
            { slug: 'roles', name: 'Roles', icon: 'Shield', actions: ['view', 'create', 'edit', 'delete', 'manage'], route_name: '/settings/roles', route_title: 'Roles' },
            { slug: 'permissions', name: 'Permissions', icon: 'Lock', actions: ['view', 'assign', 'manage'], route_name: '/settings/permissions', route_title: 'Permissions' },
            { slug: 'integrations', name: 'Integrations', icon: 'Plug', actions: ['view', 'configure', 'manage'], route_name: '/settings/integrations', route_title: 'Integrations' },
        ]
    },

    // ============================================================================
    // TEACHER PORTAL PERMISSIONS
    // ============================================================================
    // {
    //     slug: 'teacher',
    //     name: 'Teacher Portal',
    //     icon: 'GraduationCap',
    //     institution_type: 'school',
    //     description: 'Teacher-specific permissions',
    //     route_name: '/teacher',
    //     route_title: 'Teacher Portal',
    //     features: [
    //         { slug: 'dashboard', name: 'Teacher Dashboard', icon: 'LayoutDashboard', actions: ['view'], route_name: '/teacher/dashboard', route_title: 'Dashboard' },
    //         { slug: 'classes', name: 'My Classes', icon: 'School', actions: ['view'], route_name: '/teacher/classes', route_title: 'My Classes' },
    //         { slug: 'attendance', name: 'Mark Attendance', icon: 'CalendarCheck', actions: ['view', 'mark', 'edit'], route_name: '/teacher/attendance', route_title: 'Attendance' },
    //         { slug: 'grades', name: 'Grading', icon: 'Award', actions: ['view', 'enter', 'edit', 'manage'], route_name: '/teacher/grading', route_title: 'Grading' },
    //         { slug: 'lessonPlans', name: 'Lesson Plans', icon: 'FileText', actions: ['view', 'create', 'edit'], route_name: '/teacher/lesson-plans', route_title: 'Lesson Plans' },
    //         { slug: 'schedule', name: 'Schedule', icon: 'Clock', actions: ['view'], route_name: '/teacher/schedule', route_title: 'Schedule' },
    //         { slug: 'assignments', name: 'Assignments', icon: 'ClipboardList', actions: ['view', 'create', 'edit', 'grade'], route_name: '/teacher/assignments', route_title: 'Assignments' },
    //     ]
    // },

    // ============================================================================
    // STUDENT PORTAL PERMISSIONS
    // ============================================================================
    // {
    //     slug: 'student',
    //     name: 'Student Portal',
    //     icon: 'Users',
    //     institution_type: 'school',
    //     description: 'Student-specific permissions',
    //     route_name: '/student',
    //     route_title: 'Student Portal',
    //     features: [
    //         { slug: 'dashboard', name: 'Student Dashboard', icon: 'LayoutDashboard', actions: ['view'], route_name: '/student/dashboard', route_title: 'Dashboard' },
    //         { slug: 'courses', name: 'My Courses', icon: 'BookOpen', actions: ['view'], route_name: '/student/courses', route_title: 'Courses' },
    //         { slug: 'assignments', name: 'Assignments', icon: 'ClipboardList', actions: ['view', 'submit'], route_name: '/student/assignments', route_title: 'Assignments' },
    //         { slug: 'grades', name: 'My Grades', icon: 'Award', actions: ['view'], route_name: '/student/grades', route_title: 'Grades' },
    //         { slug: 'timetable', name: 'Timetable', icon: 'Clock', actions: ['view'], route_name: '/student/timetable', route_title: 'Timetable' },
    //         { slug: 'attendance', name: 'My Attendance', icon: 'CalendarCheck', actions: ['view'], route_name: '/student/attendance', route_title: 'Attendance' },
    //         { slug: 'fees', name: 'Fee Details', icon: 'Receipt', actions: ['view', 'pay'], route_name: '/student/fees', route_title: 'Fees' },
    //         { slug: 'exams', name: 'Exam Schedule', icon: 'FileSpreadsheet', actions: ['view'], route_name: '/student/exams', route_title: 'Exams' },
    //     ]
    // },

    // ============================================================================
    // STAFF PORTAL PERMISSIONS
    // ============================================================================
    // {
    //     slug: 'staff',
    //     name: 'Staff Portal',
    //     icon: 'UserCheck',
    //     institution_type: 'school',
    //     description: 'Staff-specific permissions',
    //     route_name: '/staff',
    //     route_title: 'Staff Portal',
    //     features: [
    //         { slug: 'dashboard', name: 'Staff Dashboard', icon: 'LayoutDashboard', actions: ['view'], route_name: '/staff/dashboard', route_title: 'Dashboard' },
    //         { slug: 'tasks', name: 'Tasks', icon: 'CheckSquare', actions: ['view', 'create', 'edit', 'complete'], route_name: '/staff/tasks', route_title: 'Tasks' },
    //         { slug: 'attendance', name: 'My Attendance', icon: 'CalendarCheck', actions: ['view', 'checkIn'], route_name: '/staff/attendance', route_title: 'Attendance' },
    //         { slug: 'leave', name: 'Leave Management', icon: 'Calendar', actions: ['view', 'apply'], route_name: '/staff/leave', route_title: 'Leave' },
    //     ]
    // },
];

/**
 * Seed or refresh global permissions
 * Uses findOrCreate to update existing and add new without losing data
 */
export async function seedGlobalPermissions(options: { dryRun?: boolean; verbose?: boolean } = {}) {
    const { dryRun = false, verbose = true } = options;
    const stats: SeederStats = {
        modulesCreated: 0,
        modulesUpdated: 0,
        featuresCreated: 0,
        featuresUpdated: 0,
        permissionsCreated: 0,
        permissionsUpdated: 0,
    };

    if (verbose) console.log('[Seeder] Starting global permission seeding...');
    if (dryRun) console.log('[Seeder] DRY RUN - No changes will be made');

    try {
        const allPermissions: Permission[] = [];

        // Process each module definition
        for (const moduleDef of PERMISSION_DEFINITIONS) {
            const moduleResult = await processModule(moduleDef, null, stats, dryRun, verbose);
            if (moduleResult?.permissions) {
                allPermissions.push(...moduleResult.permissions);
            }
        }

        // Link permissions to plans
        if (!dryRun) {
            await linkPermissionsToPlans(allPermissions, verbose);
        }

        if (verbose) {
            console.log('[Seeder] ===============================');
            console.log('[Seeder] Seeding completed successfully!');
            console.log(`[Seeder] Modules: ${stats.modulesCreated} created, ${stats.modulesUpdated} updated`);
            console.log(`[Seeder] Features: ${stats.featuresCreated} created, ${stats.featuresUpdated} updated`);
            console.log(`[Seeder] Permissions: ${stats.permissionsCreated} created, ${stats.permissionsUpdated} updated`);
            console.log('[Seeder] ===============================');
        }

        return { success: true, stats };
    } catch (err: unknown) {
        console.error('[Seeder] Error during seeding:', err);
        throw err;
    }
}

/**
 * Process a module definition recursively
 */
async function processModule(
    moduleDef: ModuleDefinition,
    parentId: string | null,
    stats: SeederStats,
    dryRun: boolean,
    verbose: boolean
): Promise<{ module: Module; permissions: Permission[] } | null> {
    if (dryRun) {
        if (verbose) console.log(`[Seeder] [DRY] Would process module: ${moduleDef.slug}`);
        return null;
    }

    // Create or update module
    const [module, moduleCreated] = await Module.findOrCreate({
        where: { slug: moduleDef.slug },
        defaults: {
            name: moduleDef.name,
            slug: moduleDef.slug,
            icon: moduleDef.icon,
            institution_type: moduleDef.institution_type,
            description: moduleDef.description,
            route_name: moduleDef.route_name,
            route_title: moduleDef.route_title,
            parent_id: parentId,
            is_active: true,
            route_active: true,
        }
    });

    if (moduleCreated) {
        stats.modulesCreated++;
        if (verbose) console.log(`[Seeder] Created module: ${moduleDef.slug}`);
    } else {
        // Update existing module with new data
        await module.update({
            name: moduleDef.name,
            icon: moduleDef.icon || module.icon,
            description: moduleDef.description || module.description,
            route_name: moduleDef.route_name || module.route_name,
            route_title: moduleDef.route_title || module.route_title,
            parent_id: parentId,
        });
        stats.modulesUpdated++;
        if (verbose) console.log(`[Seeder] Updated module: ${moduleDef.slug}`);
    }

    const modulePermissions: Permission[] = [];

    // Process features
    for (const featureDef of moduleDef.features) {
        const featurePerms = await processFeature(featureDef, module, moduleDef.slug, stats, verbose);
        modulePermissions.push(...featurePerms);
    }

    // Process child modules recursively
    if (moduleDef.children) {
        for (const childDef of moduleDef.children) {
            const childResult = await processModule(childDef, module.id, stats, dryRun, verbose);
            if (childResult?.permissions) {
                modulePermissions.push(...childResult.permissions);
            }
        }
    }

    return { module, permissions: modulePermissions };
}

/**
 * Process a feature definition
 */
async function processFeature(
    featureDef: FeatureDefinition,
    module: Module,
    moduleSlug: string,
    stats: SeederStats,
    verbose: boolean
): Promise<Permission[]> {
    // Create or update feature
    const [feature, featureCreated] = await Feature.findOrCreate({
        where: { slug: featureDef.slug, module_id: module.id },
        defaults: {
            name: featureDef.name,
            slug: featureDef.slug,
            icon: featureDef.icon,
            module_id: module.id,
            route_name: featureDef.route_name,
            route_title: featureDef.route_title,
            is_active: true,
            route_active: true,
        }
    });

    if (featureCreated) {
        stats.featuresCreated++;
        if (verbose) console.log(`  [Seeder] Created feature: ${featureDef.slug}`);
    } else {
        await feature.update({
            name: featureDef.name,
            icon: featureDef.icon || feature.icon,
            route_name: featureDef.route_name || feature.route_name,
            route_title: featureDef.route_title || feature.route_title,
        });
        stats.featuresUpdated++;
        if (verbose) console.log(`  [Seeder] Updated feature: ${featureDef.slug}`);
    }

    // Process permissions
    const permissions: Permission[] = [];
    for (const action of featureDef.actions) {
        const permissionKey = `${moduleSlug}.${featureDef.slug}.${action}`;
        
        const [permission, permCreated] = await Permission.findOrCreate({
            where: { key: permissionKey },
            defaults: {
                feature_id: feature.id,
                action,
                key: permissionKey,
                description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${featureDef.name}`,
                is_active: true,
                route_active: true,
            }
        });

        if (permCreated) {
            stats.permissionsCreated++;
            if (verbose) console.log(`    [Seeder] Created permission: ${permissionKey}`);
        } else {
            await permission.update({
                feature_id: feature.id,
                description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${featureDef.name}`,
            });
            stats.permissionsUpdated++;
        }

        permissions.push(permission);
    }

    return permissions;
}

/**
 * Link permissions to subscription plans
 */
async function linkPermissionsToPlans(allPermissions: Permission[], verbose: boolean) {
    const plansData = [
        {
            slug: 'basic',
            name: 'Basic Plan',
            description: 'Limited access plan',
            permissions: [
                'dashboard.overview.view',
                'academics.classes.view',
                'academics.subjects.view',
                'academics.sessions.view',
                'users.students.view',
                'users.teachers.view',
                'attendance.student.view',
                'communication.announcements.view',
            ]
        },
        {
            slug: 'standard',
            name: 'Standard Plan',
            description: 'Standard access with most features',
            permissions: [
                // All basic permissions plus more
                '*basic*', // Include all basic
                'academics.*.view',
                'academics.*.create',
                'academics.*.edit',
                'users.*.view',
                'users.*.create',
                'users.*.edit',
                'attendance.*.view',
                'attendance.*.mark',
                'admissions.*.view',
                'admissions.*.manage',
                'finance.fees.view',
                'exams.*.view',
                'reports.*.view',
            ]
        },
        {
            slug: 'pro',
            name: 'Pro Plan',
            description: 'Full access to all features',
            permissions: ['*'] // All permissions
        },
    ];

    for (const planData of plansData) {
        if (verbose) console.log(`[Seeder] Linking permissions to plan: ${planData.slug}`);
        
        const [plan] = await Plan.findOrCreate({
            where: { slug: planData.slug },
            defaults: { 
                name: planData.name,
                description: planData.description,
            }
        });

        let targetPermissions: Permission[] = [];
        
        if (planData.permissions.includes('*')) {
            // All permissions
            targetPermissions = allPermissions;
        } else {
            // Filter by specific patterns
            targetPermissions = allPermissions.filter(p => {
                return planData.permissions.some(pattern => {
                    if (pattern.includes('*')) {
                        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                        return regex.test(p.key);
                    }
                    return p.key === pattern;
                });
            });
        }

        for (const perm of targetPermissions) {
            await PlanPermission.findOrCreate({
                where: { plan_id: plan.id, permission_id: perm.id }
            });
        }

        if (verbose) console.log(`  [Seeder] Linked ${targetPermissions.length} permissions to ${planData.slug}`);
    }
}

/**
 * Refresh permissions without losing existing data
 * This is the main function called by the API
 */
export async function refreshGlobalPermissions() {
    return seedGlobalPermissions({ dryRun: false, verbose: true });
}

/**
 * Get permission statistics
 */
export async function getPermissionStats() {
    const moduleCount = await Module.count();
    const featureCount = await Feature.count();
    const permissionCount = await Permission.count();
    const planCount = await Plan.count();

    return {
        modules: moduleCount,
        features: featureCount,
        permissions: permissionCount,
        plans: planCount,
        definedModules: PERMISSION_DEFINITIONS.length,
        definedFeatures: PERMISSION_DEFINITIONS.reduce((acc, m) => acc + m.features.length, 0),
    };
}
