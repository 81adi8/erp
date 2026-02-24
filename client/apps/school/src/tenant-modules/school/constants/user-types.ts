/**
 * Centralized User Type Constants for the School Module
 * Following ERP standards for type-safety and modularity.
 */
export const USER_TYPES = {
    ADMIN: 'admin',
    TEACHER: 'teacher',
    STUDENT: 'student',
    STAFF: 'staff',
    PARENT: 'parent',
} as const;

export type UserType = typeof USER_TYPES[keyof typeof USER_TYPES];
