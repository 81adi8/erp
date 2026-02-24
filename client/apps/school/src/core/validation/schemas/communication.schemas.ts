import { z } from 'zod';

const optionalText = z.string().trim().optional().or(z.literal(''));

export const createNoticeSchema = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or fewer'),
    content: z.string().min(1, 'Content is required'),
    noticeType: z.enum(['general', 'exam', 'holiday', 'event', 'urgent']),
    targetAudience: z.enum(['all', 'students', 'parents', 'teachers', 'staff']),
    classId: optionalText,
    priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
    expiresAt: optionalText,
    isPinned: z.boolean().optional().default(false),
}).superRefine((data, ctx) => {
    if (data.targetAudience === 'students' && !data.classId?.trim()) {
        return;
    }

    if (data.targetAudience === 'all') {
        return;
    }

    if (data.targetAudience === 'students' && data.classId?.trim()) {
        return;
    }

    if (data.classId?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['classId'],
            message: 'Class can only be set when target audience is students',
        });
    }
});

export type CreateNoticeFormData = z.infer<typeof createNoticeSchema>;
