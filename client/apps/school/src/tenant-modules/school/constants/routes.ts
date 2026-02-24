/**
 * Centralized Route Constants for School ERP
 * 
 * This file defines all route paths for every portal (Admin, Teacher, Student, Staff).
 * Routes are organized by portal and module, with shared/common routes accessible across portals.
 * 
 * Usage:
 *   import { ROUTES, ADMIN_ROUTES, TEACHER_ROUTES } from '@tenant-modules/school/constants/routes';
 *   navigate(ROUTES.ADMIN.ACADEMICS.CLASSES.ROOT);
 *   navigate(ROUTES.COMMON.PROFILE);
 */

// ============================================================================
// PORTAL BASE PATHS
// ============================================================================

export const PORTAL_BASES = {
    ADMIN: '/admin',
    TEACHER: '/teacher',
    STUDENT: '/student',
    STAFF: '/staff',
    PARENT: '/parent',
} as const;

export type PortalType = keyof typeof PORTAL_BASES;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const path = (base: string, ...segments: string[]) => [base, ...segments].join('/');

// Dynamic path builder for parameterized routes
const dynamicPath = (base: string, ...segments: string[]) => {
    const fullPath = [base, ...segments].join('/');
    return (params: Record<string, string>) => {
        let result = fullPath;
        Object.entries(params).forEach(([key, value]) => {
            result = result.replace(`:${key}`, value);
        });
        return result;
    };
};

// ============================================================================
// COMMON ROUTES (Shared across all portals)
// ============================================================================

export const COMMON_ROUTES = {
    // Profile - Every user has access
    PROFILE: 'profile',
    SETTINGS: 'settings',
    NOTIFICATIONS: 'notifications',
    HELP: 'help',

    // Build full path for a specific portal
    forPortal: (portalBase: string) => ({
        PROFILE: path(portalBase, 'profile'),
        SETTINGS: path(portalBase, 'settings'),
        NOTIFICATIONS: path(portalBase, 'notifications'),
        HELP: path(portalBase, 'help'),
    }),
} as const;

// ============================================================================
// ADMIN PORTAL ROUTES
// ============================================================================

const ADMIN_BASE = PORTAL_BASES.ADMIN;

export const ADMIN_ROUTES = {
    ROOT: ADMIN_BASE,

    // Dashboard
    DASHBOARD: {
        ROOT: path(ADMIN_BASE, 'dashboard'),
    },

    // Academics Module
    ACADEMICS: {
        ROOT: path(ADMIN_BASE, 'academics'),

        // Module Dashboards
        DASHBOARD: {
            ROOT: path(ADMIN_BASE, 'academics', 'dashboard'),
            SESSIONS: path(ADMIN_BASE, 'academics', 'dashboard', 'sessions'),
            CLASSES: path(ADMIN_BASE, 'academics', 'dashboard', 'classes'),
            CURRICULUM: path(ADMIN_BASE, 'academics', 'dashboard', 'curriculum'),
            TIMETABLE: path(ADMIN_BASE, 'academics', 'dashboard', 'timetable'),
            SUBJECTS: path(ADMIN_BASE, 'academics', 'dashboard', 'subjects'),
        },

        // Sessions
        SESSIONS: {
            ROOT: path(ADMIN_BASE, 'academics', 'sessions'),
            PROMOTION: path(ADMIN_BASE, 'academics', 'sessions', 'promotion'),
            DETAIL: (id: string) => path(ADMIN_BASE, 'academics', 'sessions', id),
        },

        // Classes
        CLASSES: {
            ROOT: path(ADMIN_BASE, 'academics', 'classes'),
            DETAIL: (id: string) => path(ADMIN_BASE, 'academics', 'classes', id),
            SUBJECTS: (classId: string) => path(ADMIN_BASE, 'academics', 'classes', classId, 'subjects'),
            SECTIONS: (classId: string) => path(ADMIN_BASE, 'academics', 'classes', classId, 'sections'),
        },

        // Subjects
        SUBJECTS: {
            ROOT: path(ADMIN_BASE, 'academics', 'subjects'),
            DETAIL: (id: string) => path(ADMIN_BASE, 'academics', 'subjects', id),
        },

        // Sections
        SECTIONS: {
            ROOT: path(ADMIN_BASE, 'academics', 'sections'),
            DETAIL: (id: string) => path(ADMIN_BASE, 'academics', 'sections', id),
        },

        // Curriculum
        CURRICULUM: {
            ROOT: path(ADMIN_BASE, 'academics', 'curriculum'),
            CHAPTERS: path(ADMIN_BASE, 'academics', 'curriculum', 'chapters'),
            TOPICS: path(ADMIN_BASE, 'academics', 'curriculum', 'topics'),
        },

        // Lesson Plans
        LESSON_PLANS: {
            ROOT: path(ADMIN_BASE, 'academics', 'lesson-plans'),
            CREATE: path(ADMIN_BASE, 'academics', 'lesson-plans', 'create'),
            DETAIL: (id: string) => path(ADMIN_BASE, 'academics', 'lesson-plans', id),
        },

        // Timetable
        TIMETABLE: {
            ROOT: path(ADMIN_BASE, 'academics', 'timetable'),
            GENERATE: path(ADMIN_BASE, 'academics', 'timetable', 'generate'),
            TEMPLATES: path(ADMIN_BASE, 'academics', 'timetable', 'templates'),
        },
    },

    // Users Module
    USERS: {
        ROOT: path(ADMIN_BASE, 'users'),
        MANAGEMENT: path(ADMIN_BASE, 'users', 'management'),

        // Teachers
        TEACHERS: {
            ROOT: path(ADMIN_BASE, 'users', 'teachers'),
            DETAIL: (id: string) => path(ADMIN_BASE, 'users', 'teachers', id),
            CREATE: path(ADMIN_BASE, 'users', 'teachers', 'create'),
        },

        // Students
        STUDENTS: {
            ROOT: path(ADMIN_BASE, 'users', 'students'),
            ADMISSION: path(ADMIN_BASE, 'users', 'students', 'admission'),
            ENROLLMENT: path(ADMIN_BASE, 'users', 'students', 'enrollment'),
            BULK_IMPORT: path(ADMIN_BASE, 'users', 'students', 'bulk-import'),
            DETAIL: (id: string) => path(ADMIN_BASE, 'users', 'students', id),
        },

        // Staff
        STAFF: {
            ROOT: path(ADMIN_BASE, 'users', 'staff'),
            DETAIL: (id: string) => path(ADMIN_BASE, 'users', 'staff', id),
            CREATE: path(ADMIN_BASE, 'users', 'staff', 'create'),
        },

        // Parents
        PARENTS: {
            ROOT: path(ADMIN_BASE, 'users', 'parents'),
            DETAIL: (id: string) => path(ADMIN_BASE, 'users', 'parents', id),
        },
    },

    // Attendance Module
    ATTENDANCE: {
        ROOT: path(ADMIN_BASE, 'attendance'),
        DASHBOARD: path(ADMIN_BASE, 'attendance', 'dashboard'),
        MARKING: path(ADMIN_BASE, 'attendance', 'marking'),
        STUDENT: path(ADMIN_BASE, 'attendance', 'student'),
        TEACHER: path(ADMIN_BASE, 'attendance', 'teacher'),
        STAFF: path(ADMIN_BASE, 'attendance', 'staff'),
        CLASS: path(ADMIN_BASE, 'attendance', 'class'),
        REPORTS: path(ADMIN_BASE, 'attendance', 'reports'),
        HISTORY: path(ADMIN_BASE, 'attendance', 'history'),
        LEAVES: path(ADMIN_BASE, 'attendance', 'leaves'),
        SETTINGS: path(ADMIN_BASE, 'attendance', 'settings'),
    },

    // Admissions Module
    ADMISSIONS: {
        ROOT: path(ADMIN_BASE, 'admissions'),
        DASHBOARD: path(ADMIN_BASE, 'admissions', 'dashboard'),
        STUDENT: path(ADMIN_BASE, 'admissions', 'student'),
        TEACHER: path(ADMIN_BASE, 'admissions', 'teacher'),
        STAFF: path(ADMIN_BASE, 'admissions', 'staff'),
        REPORTS: path(ADMIN_BASE, 'admissions', 'reports'),
    },

    // Finance Module
    FINANCE: {
        ROOT: path(ADMIN_BASE, 'finance'),
        FEES: {
            ROOT: path(ADMIN_BASE, 'finance', 'fees'),
            STRUCTURE: path(ADMIN_BASE, 'finance', 'fees', 'structure'),
            COLLECTIONS: path(ADMIN_BASE, 'finance', 'fees', 'collections'),
            INVOICES: path(ADMIN_BASE, 'finance', 'fees', 'invoices'),
        },
        EXPENSES: path(ADMIN_BASE, 'finance', 'expenses'),
        REPORTS: path(ADMIN_BASE, 'finance', 'reports'),
    },

    // Exams Module
    EXAMS: {
        ROOT: path(ADMIN_BASE, 'exams'),
        MANAGEMENT: path(ADMIN_BASE, 'exams', 'management'),
        SCHEDULES: path(ADMIN_BASE, 'exams', 'schedules'),
        RESULTS: path(ADMIN_BASE, 'exams', 'results'),
        GRADE_SYSTEM: path(ADMIN_BASE, 'exams', 'grade-system'),
    },

    // Reports Module
    REPORTS: {
        ROOT: path(ADMIN_BASE, 'reports'),
        ANALYTICS: path(ADMIN_BASE, 'reports', 'analytics'),
        ACADEMIC: path(ADMIN_BASE, 'reports', 'academic'),
        FINANCIAL: path(ADMIN_BASE, 'reports', 'financial'),
        ATTENDANCE: path(ADMIN_BASE, 'reports', 'attendance'),
    },

    // Settings Module
    SETTINGS: {
        ROOT: path(ADMIN_BASE, 'settings'),
        GENERAL: path(ADMIN_BASE, 'settings', 'general'),
        ROLES: path(ADMIN_BASE, 'settings', 'roles'),
        PERMISSIONS: path(ADMIN_BASE, 'settings', 'permissions'),
        SCHOOL_INFO: path(ADMIN_BASE, 'settings', 'school-info'),
        INTEGRATIONS: path(ADMIN_BASE, 'settings', 'integrations'),
    },

    // Common routes for admin portal
    COMMON: COMMON_ROUTES.forPortal(ADMIN_BASE),
} as const;

// ============================================================================
// TEACHER PORTAL ROUTES
// ============================================================================

const TEACHER_BASE = PORTAL_BASES.TEACHER;

export const TEACHER_ROUTES = {
    ROOT: TEACHER_BASE,

    // Dashboard
    DASHBOARD: {
        ROOT: path(TEACHER_BASE, 'dashboard'),
    },

    // My Classes
    CLASSES: {
        ROOT: path(TEACHER_BASE, 'classes'),
        DETAIL: (classId: string) => path(TEACHER_BASE, 'classes', classId),
        STUDENTS: (classId: string) => path(TEACHER_BASE, 'classes', classId, 'students'),
        SUBJECTS: (classId: string) => path(TEACHER_BASE, 'classes', classId, 'subjects'),
    },

    // Attendance
    ATTENDANCE: {
        ROOT: path(TEACHER_BASE, 'attendance'),
        MARK: path(TEACHER_BASE, 'attendance', 'mark'),
        HISTORY: path(TEACHER_BASE, 'attendance', 'history'),
        CLASS: (classId: string) => path(TEACHER_BASE, 'attendance', 'class', classId),
    },

    // Grading
    GRADING: {
        ROOT: path(TEACHER_BASE, 'grading'),
        ASSIGNMENTS: path(TEACHER_BASE, 'grading', 'assignments'),
        EXAMS: path(TEACHER_BASE, 'grading', 'exams'),
        REPORTS: path(TEACHER_BASE, 'grading', 'reports'),
    },

    // Lesson Plans (if teacher has permission)
    LESSON_PLANS: {
        ROOT: path(TEACHER_BASE, 'lesson-plans'),
        CREATE: path(TEACHER_BASE, 'lesson-plans', 'create'),
        DETAIL: (id: string) => path(TEACHER_BASE, 'lesson-plans', id),
    },

    // Schedule/Timetable
    SCHEDULE: {
        ROOT: path(TEACHER_BASE, 'schedule'),
        WEEKLY: path(TEACHER_BASE, 'schedule', 'weekly'),
        DAILY: path(TEACHER_BASE, 'schedule', 'daily'),
    },

    // Assignments
    ASSIGNMENTS: {
        ROOT: path(TEACHER_BASE, 'assignments'),
        CREATE: path(TEACHER_BASE, 'assignments', 'create'),
        DETAIL: (id: string) => path(TEACHER_BASE, 'assignments', id),
        SUBMISSIONS: (id: string) => path(TEACHER_BASE, 'assignments', id, 'submissions'),
    },

    // Exams (if teacher has permission)
    EXAMS: {
        ROOT: path(TEACHER_BASE, 'exams'),
        RESULTS: path(TEACHER_BASE, 'exams', 'results'),
    },

    // Common routes
    COMMON: COMMON_ROUTES.forPortal(TEACHER_BASE),
} as const;

// ============================================================================
// STUDENT PORTAL ROUTES
// ============================================================================

const STUDENT_BASE = PORTAL_BASES.STUDENT;

export const STUDENT_ROUTES = {
    ROOT: STUDENT_BASE,

    // Dashboard
    DASHBOARD: {
        ROOT: path(STUDENT_BASE, 'dashboard'),
    },

    // Courses/Subjects
    COURSES: {
        ROOT: path(STUDENT_BASE, 'courses'),
        DETAIL: (courseId: string) => path(STUDENT_BASE, 'courses', courseId),
        MATERIALS: (courseId: string) => path(STUDENT_BASE, 'courses', courseId, 'materials'),
    },

    // Assignments
    ASSIGNMENTS: {
        ROOT: path(STUDENT_BASE, 'assignments'),
        DETAIL: (id: string) => path(STUDENT_BASE, 'assignments', id),
        SUBMIT: (id: string) => path(STUDENT_BASE, 'assignments', id, 'submit'),
    },

    // Grades/Results
    GRADES: {
        ROOT: path(STUDENT_BASE, 'grades'),
        EXAMS: path(STUDENT_BASE, 'grades', 'exams'),
        ASSIGNMENTS: path(STUDENT_BASE, 'grades', 'assignments'),
        REPORT_CARD: path(STUDENT_BASE, 'grades', 'report-card'),
    },

    // Timetable
    TIMETABLE: {
        ROOT: path(STUDENT_BASE, 'timetable'),
    },

    // Attendance
    ATTENDANCE: {
        ROOT: path(STUDENT_BASE, 'attendance'),
        HISTORY: path(STUDENT_BASE, 'attendance', 'history'),
    },

    // Fees
    FEES: {
        ROOT: path(STUDENT_BASE, 'fees'),
        HISTORY: path(STUDENT_BASE, 'fees', 'history'),
        PENDING: path(STUDENT_BASE, 'fees', 'pending'),
    },

    // Exams
    EXAMS: {
        ROOT: path(STUDENT_BASE, 'exams'),
        SCHEDULE: path(STUDENT_BASE, 'exams', 'schedule'),
        RESULTS: path(STUDENT_BASE, 'exams', 'results'),
    },

    // Common routes
    COMMON: COMMON_ROUTES.forPortal(STUDENT_BASE),
} as const;

// ============================================================================
// STAFF PORTAL ROUTES
// ============================================================================

const STAFF_BASE = PORTAL_BASES.STAFF;

export const STAFF_ROUTES = {
    ROOT: STAFF_BASE,

    // Dashboard
    DASHBOARD: {
        ROOT: path(STAFF_BASE, 'dashboard'),
    },

    // Tasks
    TASKS: {
        ROOT: path(STAFF_BASE, 'tasks'),
        DETAIL: (id: string) => path(STAFF_BASE, 'tasks', id),
        CREATE: path(STAFF_BASE, 'tasks', 'create'),
    },

    // Attendance
    ATTENDANCE: {
        ROOT: path(STAFF_BASE, 'attendance'),
        HISTORY: path(STAFF_BASE, 'attendance', 'history'),
    },

    // Leave Management (if permitted)
    LEAVE: {
        ROOT: path(STAFF_BASE, 'leave'),
        APPLY: path(STAFF_BASE, 'leave', 'apply'),
        HISTORY: path(STAFF_BASE, 'leave', 'history'),
    },

    // Common routes
    COMMON: COMMON_ROUTES.forPortal(STAFF_BASE),
} as const;

// ============================================================================
// PARENT PORTAL ROUTES (Future)
// ============================================================================

const PARENT_BASE = PORTAL_BASES.PARENT;

export const PARENT_ROUTES = {
    ROOT: PARENT_BASE,

    // Dashboard
    DASHBOARD: {
        ROOT: path(PARENT_BASE, 'dashboard'),
    },

    // Children
    CHILDREN: {
        ROOT: path(PARENT_BASE, 'children'),
        DETAIL: (childId: string) => path(PARENT_BASE, 'children', childId),
        GRADES: (childId: string) => path(PARENT_BASE, 'children', childId, 'grades'),
        ATTENDANCE: (childId: string) => path(PARENT_BASE, 'children', childId, 'attendance'),
    },

    // Fees
    FEES: {
        ROOT: path(PARENT_BASE, 'fees'),
        PAY: path(PARENT_BASE, 'fees', 'pay'),
        HISTORY: path(PARENT_BASE, 'fees', 'history'),
    },

    // Communication
    MESSAGES: {
        ROOT: path(PARENT_BASE, 'messages'),
        TEACHERS: path(PARENT_BASE, 'messages', 'teachers'),
    },

    // Common routes
    COMMON: COMMON_ROUTES.forPortal(PARENT_BASE),
} as const;

// ============================================================================
// UNIFIED ROUTES OBJECT
// ============================================================================

export const ROUTES = {
    PORTALS: PORTAL_BASES,
    COMMON: COMMON_ROUTES,
    ADMIN: ADMIN_ROUTES,
    TEACHER: TEACHER_ROUTES,
    STUDENT: STUDENT_ROUTES,
    STAFF: STAFF_ROUTES,
    PARENT: PARENT_ROUTES,
} as const;

// ============================================================================
// PERMISSION-BASED ROUTE MAPPING
// ============================================================================

/**
 * Maps permissions to their corresponding routes.
 * Used for dynamic navigation based on user permissions.
 */
export const PERMISSION_ROUTE_MAP = {
    // Admin Academics
    'academics.classes.view': ADMIN_ROUTES.ACADEMICS.CLASSES.ROOT,
    'academics.classes.manage': ADMIN_ROUTES.ACADEMICS.CLASSES.ROOT,
    'academics.sessions.view': ADMIN_ROUTES.ACADEMICS.SESSIONS.ROOT,
    'academics.sessions.manage': ADMIN_ROUTES.ACADEMICS.SESSIONS.PROMOTION,
    'academics.subjects.view': ADMIN_ROUTES.ACADEMICS.SUBJECTS.ROOT,
    'academics.curriculum.view': ADMIN_ROUTES.ACADEMICS.CURRICULUM.ROOT,
    'academics.lessonPlans.view': ADMIN_ROUTES.ACADEMICS.LESSON_PLANS.ROOT,
    'academics.timetable.view': ADMIN_ROUTES.ACADEMICS.TIMETABLE.ROOT,

    // Admin Users
    'users.teachers.manage': ADMIN_ROUTES.USERS.TEACHERS.ROOT,
    'users.students.manage': ADMIN_ROUTES.USERS.STUDENTS.ROOT,
    'users.staff.manage': ADMIN_ROUTES.USERS.STAFF.ROOT,
    'users.parents.manage': ADMIN_ROUTES.USERS.PARENTS.ROOT,

    // Attendance
    'attendance.view': ADMIN_ROUTES.ATTENDANCE.ROOT,
    'attendance.mark': TEACHER_ROUTES.ATTENDANCE.MARK,

    // Finance
    'finance.fees.view': ADMIN_ROUTES.FINANCE.FEES.ROOT,

    // Exams
    'exams.view': ADMIN_ROUTES.EXAMS.ROOT,

    // Reports
    'reports.view': ADMIN_ROUTES.REPORTS.ROOT,

    // Settings
    'settings.view': ADMIN_ROUTES.SETTINGS.ROOT,
    'settings.roles.manage': ADMIN_ROUTES.SETTINGS.ROLES,

    // Teacher specific
    'teacher.classes.view': TEACHER_ROUTES.CLASSES.ROOT,
    'grades.manage': TEACHER_ROUTES.GRADING.ROOT,
    'schedule.view': TEACHER_ROUTES.SCHEDULE.ROOT,

    // Student specific
    'student.courses.view': STUDENT_ROUTES.COURSES.ROOT,
    'student.assignments.view': STUDENT_ROUTES.ASSIGNMENTS.ROOT,
    'student.grades.view': STUDENT_ROUTES.GRADES.ROOT,
    'student.timetable.view': STUDENT_ROUTES.TIMETABLE.ROOT,

    // Staff specific
    'staff.tasks.view': STAFF_ROUTES.TASKS.ROOT,
    'staff.attendance.view': STAFF_ROUTES.ATTENDANCE.ROOT,
} as const;

// ============================================================================
// ROUTE GUARDS & HELPERS
// ============================================================================

/**
 * Get the default landing route for a portal
 */
export const getDefaultRoute = (portal: PortalType): string => {
    switch (portal) {
        case 'ADMIN':
            return ADMIN_ROUTES.DASHBOARD.ROOT;
        case 'TEACHER':
            return TEACHER_ROUTES.DASHBOARD.ROOT;
        case 'STUDENT':
            return STUDENT_ROUTES.DASHBOARD.ROOT;
        case 'STAFF':
            return STAFF_ROUTES.DASHBOARD.ROOT;
        case 'PARENT':
            return PARENT_ROUTES.DASHBOARD.ROOT;
        default:
            return '/';
    }
};

/**
 * Check if a route belongs to a specific portal
 */
export const isPortalRoute = (route: string, portal: PortalType): boolean => {
    return route.startsWith(PORTAL_BASES[portal]);
};

/**
 * Extract portal type from a route
 */
export const getPortalFromRoute = (route: string): PortalType | null => {
    for (const [key, base] of Object.entries(PORTAL_BASES)) {
        if (route.startsWith(base)) {
            return key as PortalType;
        }
    }
    return null;
};

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AdminRoutes = typeof ADMIN_ROUTES;
export type TeacherRoutes = typeof TEACHER_ROUTES;
export type StudentRoutes = typeof STUDENT_ROUTES;
export type StaffRoutes = typeof STAFF_ROUTES;
export type ParentRoutes = typeof PARENT_ROUTES;
export type AllRoutes = typeof ROUTES;
