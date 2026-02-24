import { z } from 'zod';

const optionalPositiveInteger = (field: string) =>
    z
        .string()
        .optional()
        .or(z.literal(''))
        .refine((value) => !value || /^\d+$/.test(value), {
            message: `${field} must be a whole number`,
        })
        .refine((value) => !value || Number(value) > 0, {
            message: `${field} must be greater than 0`,
        });

export const createExamSchema = z.object({
    title: z.string().trim().min(1, 'Exam title is required'),
    subject: z.string().trim().min(1, 'Subject is required'),
    date: z.string().min(1, 'Date is required'),
    duration: optionalPositiveInteger('Duration'),
    totalMarks: optionalPositiveInteger('Total marks'),
});

export const enterMarksSchema = z.object({
    marksObtained: z.number().min(0, 'Marks cannot be negative'),
    isAbsent: z.boolean().default(false),
    remarks: z.string().optional(),
});

export type CreateExamFormData = z.infer<typeof createExamSchema>;
export type EnterMarksFormData = z.infer<typeof enterMarksSchema>;
