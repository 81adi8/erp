import { z } from 'zod';

/**
 * Base user creation schema with common fields
 */
const BaseUserSchema = z.object({
    email: z.string().email('Valid email is required'),
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    phone: z.string().optional(),
}).strict();

/**
 * Teacher creation schema
 */
export const CreateTeacherSchema = BaseUserSchema.extend({
    employeeId: z.string().optional(),
    qualification: z.string().optional(),
    designation: z.string().optional(),
    specialization: z.string().optional(),
    experienceYears: z.number().optional(),
    dateOfJoining: z.string().optional(),
    biography: z.string().optional(),
    skills: z.array(z.string()).optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    address: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    documents: z.record(z.string(), z.any()).optional(),
}).strict();

export type CreateTeacherDTO = z.infer<typeof CreateTeacherSchema>;

/**
 * Student creation schema
 */
export const CreateStudentSchema = BaseUserSchema.extend({
    admissionNumber: z.string().optional(),
    rollNumber: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    classId: z.string().uuid().optional(),
    sectionId: z.string().uuid().optional(),
    academicYearId: z.string().uuid().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
}).strict();

export type CreateStudentDTO = z.infer<typeof CreateStudentSchema>;

/**
 * Staff creation schema
 */
export const CreateStaffSchema = BaseUserSchema.extend({
    employeeId: z.string().optional(),
    department: z.string().optional(),
    designation: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
}).strict();

export type CreateStaffDTO = z.infer<typeof CreateStaffSchema>;

/**
 * Parent creation schema
 */
export const CreateParentSchema = BaseUserSchema.extend({
    relationship: z.enum(['father', 'mother', 'guardian']).optional(),
    occupation: z.string().optional(),
    studentIds: z.array(z.string().uuid()).optional(),
    metadata: z.record(z.string(), z.any()).optional(),
}).strict();

export type CreateParentDTO = z.infer<typeof CreateParentSchema>;

/**
 * Bulk user creation schema
 */
export const BulkCreateUsersSchema = z.object({
    users: z.array(BaseUserSchema).min(1).max(100),
    userType: z.enum(['teacher', 'student', 'staff', 'parent']),
    defaultMetadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

export type BulkCreateUsersDTO = z.infer<typeof BulkCreateUsersSchema>;

/**
 * Update user schema
 */
export const UpdateUserSchema = z.object({
    firstName: z.string().min(2).optional(),
    lastName: z.string().min(2).optional(),
    phone: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    isActive: z.boolean().optional(),
}).strict();

export type UpdateUserDTO = z.infer<typeof UpdateUserSchema>;

/**
 * Assign permissions schema
 */
export const AssignPermissionsSchema = z.object({
    userId: z.string().uuid('Valid user ID required'),
    permissionKeys: z.array(z.string()).min(1, 'At least one permission required'),
}).strict();

export type AssignPermissionsDTO = z.infer<typeof AssignPermissionsSchema>;

/**
 * Param schemas
 */
export const UserIdParamSchema = z.object({
    id: z.string().uuid('Valid user ID required'),
}).strict();

export type UserIdParamDTO = z.infer<typeof UserIdParamSchema>;

/**
 * Query schemas for listing users
 */
export const UserListQuerySchema = z.object({
    userType: z.enum(['admin', 'teacher', 'student', 'staff', 'parent']).optional(),
    isActive: z.enum(['true', 'false']).optional(),
    status: z.enum(['active', 'inactive', 'all']).optional(),
    role: z.string().optional(),
    role_type: z.string().optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    search: z.string().optional(),
}).strict();

export type UserListQueryDTO = z.infer<typeof UserListQuerySchema>;

/**
 * Query schema for user stats endpoint
 */
export const UserStatsQuerySchema = z.object({
    userType: z.enum(['admin', 'teacher', 'student', 'staff', 'parent']).optional(),
    role: z.string().optional(),
    role_type: z.string().optional(),
    search: z.string().optional(),
}).strict();

export type UserStatsQueryDTO = z.infer<typeof UserStatsQuerySchema>;
