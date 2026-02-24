/**
 * Super Admin Validators
 * Zod schemas for super-admin platform management endpoints
 */

import { z } from 'zod';

// ============================================================================
// Access Bundle Validators
// ============================================================================

export const AccessBundleIdParamSchema = z.object({
    id: z.string().uuid('Valid bundle ID required'),
});

export const CreateAccessBundleSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(500).optional(),
    permissions: z.array(z.string()).min(1, 'At least one permission required'),
    isActive: z.boolean().optional().default(true),
});

export const UpdateAccessBundleSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    permissions: z.array(z.string()).min(1).optional(),
    isActive: z.boolean().optional(),
});

// ============================================================================
// Access Control Validators (Modules, Features, Permissions)
// ============================================================================

export const EntityIdParamSchema = z.object({
    id: z.string().uuid('Valid ID required'),
});

export const CreateModuleSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    code: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, 'Code must be lowercase alphanumeric with underscores'),
    description: z.string().max(500).optional(),
    isActive: z.boolean().optional().default(true),
    sortOrder: z.number().int().min(0).optional(),
});

export const UpdateModuleSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    code: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/).optional(),
    description: z.string().max(500).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
});

export const CreateFeatureSchema = z.object({
    moduleId: z.string().uuid('Valid module ID required'),
    name: z.string().min(1, 'Name is required').max(100),
    code: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/),
    description: z.string().max(500).optional(),
    isActive: z.boolean().optional().default(true),
    sortOrder: z.number().int().min(0).optional(),
});

export const UpdateFeatureSchema = z.object({
    moduleId: z.string().uuid().optional(),
    name: z.string().min(1).max(100).optional(),
    code: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/).optional(),
    description: z.string().max(500).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
});

export const CreatePermissionSchema = z.object({
    featureId: z.string().uuid('Valid feature ID required'),
    name: z.string().min(1, 'Name is required').max(100),
    code: z.string().min(1).max(100).regex(/^[a-z0-9_.]+$/, 'Code must be lowercase alphanumeric with dots/underscores'),
    description: z.string().max(500).optional(),
    isActive: z.boolean().optional().default(true),
});

export const UpdatePermissionSchema = z.object({
    featureId: z.string().uuid().optional(),
    name: z.string().min(1).max(100).optional(),
    code: z.string().min(1).max(100).regex(/^[a-z0-9_.]+$/).optional(),
    description: z.string().max(500).optional(),
    isActive: z.boolean().optional(),
});

// ============================================================================
// Admin Management Validators
// ============================================================================

export const SubAdminIdParamSchema = z.object({
    id: z.string().uuid('Valid admin ID required'),
});

export const CreateSubAdminSchema = z.object({
    email: z.string().email('Valid email required'),
    firstName: z.string().min(1, 'First name required').max(100),
    lastName: z.string().min(1, 'Last name required').max(100),
    phone: z.string().max(20).optional(),
    roles: z.array(z.string()).min(1, 'At least one role required'),
});

export const UpdateSubAdminSchema = z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phone: z.string().max(20).optional(),
    roles: z.array(z.string()).min(1).optional(),
    isActive: z.boolean().optional(),
});

// ============================================================================
// Plan Validators
// ============================================================================

export const PlanIdParamSchema = z.object({
    id: z.string().uuid('Valid plan ID required'),
});

export const CreatePlanSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    code: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/),
    description: z.string().max(1000).optional(),
    price: z.number().min(0).optional(),
    billingCycle: z.enum(['monthly', 'yearly', 'lifetime']).optional(),
    maxStudents: z.number().int().min(-1).optional(),
    maxTeachers: z.number().int().min(-1).optional(),
    maxStaff: z.number().int().min(-1).optional(),
    features: z.record(z.string(), z.unknown()).optional(),
    permissions: z.array(z.string()).optional(),
    isActive: z.boolean().optional().default(true),
});

export const UpdatePlanSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    code: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/).optional(),
    description: z.string().max(1000).optional(),
    price: z.number().min(0).optional(),
    billingCycle: z.enum(['monthly', 'yearly', 'lifetime']).optional(),
    maxStudents: z.number().int().min(-1).optional(),
    maxTeachers: z.number().int().min(-1).optional(),
    maxStaff: z.number().int().min(-1).optional(),
    features: z.record(z.string(), z.unknown()).optional(),
    permissions: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
});

// ============================================================================
// Role Template Validators
// ============================================================================

export const RoleTemplateIdParamSchema = z.object({
    id: z.string().uuid('Valid role template ID required'),
});

export const CreateRoleTemplateSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    code: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/),
    description: z.string().max(500).optional(),
    permissions: z.array(z.string()).min(1, 'At least one permission required'),
    userType: z.enum(['admin', 'teacher', 'student', 'parent', 'staff']).optional(),
    isSystem: z.boolean().optional().default(false),
    isActive: z.boolean().optional().default(true),
});

export const UpdateRoleTemplateSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    code: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/).optional(),
    description: z.string().max(500).optional(),
    permissions: z.array(z.string()).min(1).optional(),
    userType: z.enum(['admin', 'teacher', 'student', 'parent', 'staff']).optional(),
    isActive: z.boolean().optional(),
});

// ============================================================================
// Global Holiday Validators
// ============================================================================

export const GlobalHolidayIdParamSchema = z.object({
    id: z.string().uuid('Valid holiday ID required'),
});

export const CreateGlobalHolidaySchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    type: z.enum(['national', 'regional', 'religious', 'school']).optional(),
    isRecurring: z.boolean().optional().default(false),
    description: z.string().max(500).optional(),
});

export const UpdateGlobalHolidaySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    type: z.enum(['national', 'regional', 'religious', 'school']).optional(),
    isRecurring: z.boolean().optional(),
    description: z.string().max(500).optional(),
});

export const SyncHolidaysQuerySchema = z.object({
    year: z.string().regex(/^\d{4}$/).optional(),
    country: z.string().min(2).max(2).optional(),
});
