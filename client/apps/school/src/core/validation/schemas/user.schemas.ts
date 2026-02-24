import { z } from 'zod';

const optionalText = z.string().trim().optional().or(z.literal(''));

export const createUserSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email'),
    roleId: z.string().optional().or(z.literal('')),
    phone: optionalText,
});

export const createRoleSchema = z.object({
    name: z.string().min(1, 'Role name is required'),
    description: optionalText,
});

export const assignPermissionSchema = z.object({
    roleId: z.string().min(1, 'Role is required'),
    permissionIds: z.array(z.string()).min(1, 'At least one permission required'),
});

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type CreateRoleFormData = z.infer<typeof createRoleSchema>;
export type AssignPermissionFormData = z.infer<typeof assignPermissionSchema>;
