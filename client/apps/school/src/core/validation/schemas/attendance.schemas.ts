import { z } from 'zod';

export const attendanceStatusSchema = z.enum(['PRESENT', 'ABSENT', 'LATE', 'LEAVE']);

export const markAttendanceSchema = z.object({
    date: z.string().min(1, 'Date is required'),
    sectionId: z.string().min(1, 'Section is required'),
});

export const markAttendanceSubmissionSchema = markAttendanceSchema.extend({
    records: z.array(
        z.object({
            studentId: z.string(),
            status: attendanceStatusSchema,
        })
    ).min(1, 'At least one student required'),
});

export type MarkAttendanceFormData = z.infer<typeof markAttendanceSchema>;
export type MarkAttendanceSubmissionData = z.infer<typeof markAttendanceSubmissionSchema>;
