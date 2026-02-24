import { z } from 'zod';

const optionalText = z.string().trim().optional().or(z.literal(''));

export const collectFeeSchema = z.object({
    amountPaid: z.coerce.number().positive('Amount must be greater than 0'),
    paymentMethod: z.enum(['cash', 'online', 'manual']),
    paymentDate: z.string().min(1, 'Payment date is required'),
    transactionRef: optionalText,
    remarks: optionalText,
});

export const createFeeCategorySchema = z.object({
    name: z.string().min(1, 'Category name is required'),
    description: optionalText,
    academicYearId: z.string().optional(),
});

export const assignFeeSchema = z.object({
    name: z.string().min(1, 'Fee name is required'),
    academicYear: z.string().min(1, 'Academic year is required'),
    classId: z.string().optional().or(z.literal('')),
    categoryId: z.string().optional().or(z.literal('')),
    amount: z.coerce.number().positive('Amount must be greater than 0'),
    dueDate: z.string().optional().or(z.literal('')),
});

export const feeCategorySchema = z.object({
    name: z.string().min(1, 'Category name is required'),
    description: optionalText,
    amount: z.coerce.number().min(0, 'Amount cannot be negative').optional(),
    academicYearId: z.string().optional(),
    classId: z.string().optional(),
});

export type CollectFeeFormData = z.infer<typeof collectFeeSchema>;
export type CreateFeeCategoryFormData = z.infer<typeof createFeeCategorySchema>;
export type AssignFeeFormData = z.infer<typeof assignFeeSchema>;
export type FeeCategoryFormData = z.infer<typeof feeCategorySchema>;
