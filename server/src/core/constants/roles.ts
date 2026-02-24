import { InstitutionType } from './tenant';

export enum Roles {
    SUPER_ADMIN = 'SUPER_ADMIN', // Platform owner
    ADMIN = 'ADMIN',             // Tenant owner (Principal/Director)
    TEACHER = 'TEACHER',         // Academic staff
    STUDENT = 'STUDENT',         // Student
    PARENT = 'PARENT',           // Legal guardian
    STAFF = 'STAFF'              // Non-academic staff
}

export enum RoleType {
    ADMIN = 'admin',
    SUB_ADMIN = 'sub_admin',
    TEACHER = 'teacher', // School (default)
    FACULTY = 'faculty', // University
    STUDENT = 'student',
    STAFF = 'staff',
    PARENT = 'parent',
    INSTRUCTOR = 'instructor', // Coaching
    OTHER = 'other'
}

/**
 * Security Action Constants
 * Used for granular permission checks
 */
export const SECURITY_ACTIONS = {
    VIEW: 'view',
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    MANAGE: 'manage',   // Full access (create, update, delete)
    APPROVE: 'approve'  // Workflow specific
} as const;

export interface RoleTypeMetadata {
    id: RoleType;
    label: string;
    description: string;
    icon?: string;
}

/**
 * Mapping of Roles by Institution Type
 * This allows the UI to dynamically show "Teacher" for Schools 
 * but "Faculty" for Universities, based on the same underlying logic.
 */
export const INSTITUTION_ROLES: Record<InstitutionType, RoleTypeMetadata[]> = {
    [InstitutionType.SCHOOL]: [
        { id: RoleType.ADMIN, label: 'Principal / Admin', description: 'Full school management access', icon: 'shield' },
        { id: RoleType.TEACHER, label: 'Teacher', description: 'Manage classes, attendance and marks', icon: 'user-cap' },
        { id: RoleType.STUDENT, label: 'Student', description: 'View academics and profile', icon: 'graduation-cap' },
        { id: RoleType.PARENT, label: 'Parent', description: 'Monitor child performance', icon: 'users' },
        { id: RoleType.STAFF, label: 'Non-Academic Staff', description: 'Office, Library or Accounts', icon: 'user-cog' },
    ],
    [InstitutionType.UNIVERSITY]: [
        { id: RoleType.ADMIN, label: 'Registrar / Admin', description: 'University level administration', icon: 'shield' },
        { id: RoleType.FACULTY, label: 'Faculty Member', description: 'Professor or Lecturer access', icon: 'user-cap' },
        { id: RoleType.STUDENT, label: 'University Student', description: 'Course enrollment and results', icon: 'graduation-cap' },
        { id: RoleType.STAFF, label: 'Department Staff', description: 'Administrative support staff', icon: 'user-cog' },
    ],
    [InstitutionType.COACHING]: [
        { id: RoleType.ADMIN, label: 'Director / Admin', description: 'Full center management', icon: 'shield' },
        { id: RoleType.INSTRUCTOR, label: 'Instructor', description: 'Tutor or Coach access', icon: 'user-cap' },
        { id: RoleType.STUDENT, label: 'Aspirant / Student', description: 'Test series and notes access', icon: 'graduation-cap' },
    ]
};
