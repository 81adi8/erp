/**
 * School Auth Validators
 * Zod schemas for school auth endpoints
 */

import { z } from 'zod';

export const SchoolLoginSchema = z.object({
    email: z.string()
        .email('Invalid email format')
        .max(255, 'Email must not exceed 255 characters')
        .transform((value) => value.toLowerCase().trim()),
    password: z.string()
        .min(1, 'Password is required')
        .max(128, 'Password must not exceed 128 characters'),
    rememberMe: z.boolean().optional().default(false),
});

export type SchoolLoginDTO = z.infer<typeof SchoolLoginSchema>;
