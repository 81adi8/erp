import { z } from 'zod';

import {
    REPORT_FORMATS,
    REPORT_JOB_STATUSES,
    REPORT_TYPES,
} from '../../../../database/models/school/reports';

const uuidSchema = z.string().uuid('Invalid UUID');
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const ReportFiltersSchema = z.object({
    class_id: uuidSchema.optional(),
    section_id: uuidSchema.optional(),
    exam_id: uuidSchema.optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    date_from: dateSchema.optional(),
    date_to: dateSchema.optional(),
    status: z.string().trim().max(50).optional(),
    gender: z.string().trim().max(30).optional(),
    category: z.string().trim().max(100).optional(),
    payment_mode: z.string().trim().max(50).optional(),
    min_due_amount: z.coerce.number().min(0).optional(),
}).catchall(z.unknown()).superRefine((value, ctx) => {
    if (value.date_from && value.date_to) {
        const from = new Date(value.date_from);
        const to = new Date(value.date_to);
        if (from > to) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['date_to'],
                message: 'date_to must be greater than or equal to date_from',
            });
        }
    }
});

export const RequestReportSchema = z.object({
    reportType: z.enum(REPORT_TYPES),
    format: z.enum(REPORT_FORMATS),
    academicYearId: uuidSchema.optional(),
    filters: ReportFiltersSchema.optional().default({}),
});

export const ReportJobIdParamsSchema = z.object({
    jobId: uuidSchema,
});

export const ReportHistoryQuerySchema = z.object({
    reportType: z.enum(REPORT_TYPES).optional(),
    status: z.enum(REPORT_JOB_STATUSES).optional(),
    page: z.coerce.number().int().min(1).max(1000).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type RequestReportInput = z.infer<typeof RequestReportSchema>;
export type ReportHistoryQueryInput = z.infer<typeof ReportHistoryQuerySchema>;
