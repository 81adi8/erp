// Application-wide constants

// Tenant Types
export const TENANT_TYPES = {
    SCHOOL: 'school',
    UNIVERSITY: 'university',
    COACHING: 'coaching',
    INSTITUTE: 'institute',
} as const;

export type TenantType = typeof TENANT_TYPES[keyof typeof TENANT_TYPES];

// User Roles
export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    TEACHER: 'teacher',
    STUDENT: 'student',
    PARENT: 'parent',
    STAFF: 'staff',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

// Storage Keys (prefixed with tenant id at runtime)
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'auth_token',
    REFRESH_TOKEN: 'refresh_token',
    USER: 'user',
    THEME: 'theme',
    TENANT_INFO: 'tenant_info',
    LOCALE: 'locale',
    PERMISSIONS: 'permissions',
    NAVIGATION: 'navigation',
    USER_ROLES: 'user_roles',
} as const;

// Cookie Names
export const COOKIE_KEYS = {
    SESSION: 'session_id',
    AUTH_TOKEN: 'auth_token',
    REFRESH_TOKEN: 'refresh_token',
    TENANT_ID: 'tenant_id',
} as const;

// API Tag Types for RTK Query cache invalidation
export const API_TAGS = {
    AUTH: 'Auth',
    USERS: 'Users',
    STUDENTS: 'Students',
    TEACHERS: 'Teachers',
    PARENTS: 'Parents',
    ATTENDANCE: 'Attendance',
    CLASSES: 'Classes',
    SUBJECTS: 'Subjects',
    EXAMS: 'Exams',
    EXAM_SCHEDULES: 'ExamSchedules',
    MARKS: 'Marks',
    GRADES: 'Grades',
    FEES: 'Fees',
    TIMETABLE: 'Timetable',
    HOMEWORK: 'Homework',
    ANNOUNCEMENTS: 'Announcements',
    SESSIONS: 'Sessions',
    NAVIGATION: 'Navigation',
    CHAPTERS: 'Chapters',
    TOPICS: 'Topics',
    LESSON_PLANS: 'LessonPlans',
    EMPLOYEE: 'Employee',
    ACADEMIC_CALENDAR: 'AcademicCalendar',
} as const;

// Route Paths
export const ROUTES = {
    // Public
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',

    // Dashboard
    DASHBOARD: '/dashboard',

    // Admin
    ADMIN: {
        ROOT: '/admin',
        USERS: '/admin/users',
        SETTINGS: '/admin/settings',
        REPORTS: '/admin/reports',
    },

    // Academics
    STUDENTS: '/students',
    TEACHERS: '/teachers',
    CLASSES: '/classes',
    SUBJECTS: '/subjects',

    // Management
    ATTENDANCE: '/attendance',
    EXAMS: '/exams',
    FEES: '/fees',
    TIMETABLE: '/timetable',
    HOMEWORK: '/homework',
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
} as const;
