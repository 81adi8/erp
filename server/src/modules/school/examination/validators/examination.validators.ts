/**
 * Examination Module — Zod Validators
 *
 * Provides route-level Zod schemas for every POST/PUT/PATCH endpoint
 * in the examination module.
 */

import { z } from 'zod';

const uuidSchema = z.string().uuid('Invalid UUID');

const dateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'Date must be in ISO date format')
    .optional();

const timeSchema = z
    .string()
    .regex(/^\d{2}:\d{2}/, 'Time must be in HH:mm format')
    .optional();

const examTypeEnum = z.enum([
    'MID_TERM', 'FINAL', 'UNIT_TEST', 'QUIZ', 'PRACTICAL', 'ASSIGNMENT',
]);

const examStatusEnum = z.enum([
    'draft', 'scheduled', 'ongoing', 'completed', 'cancelled',
]);

// ============================================================================
// EXAMS
// ============================================================================

/** POST /exams — Create exam */
export const CreateExamSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(200),
    code: z.string().trim().max(50).optional(),
    type: examTypeEnum,
    academic_year_id: uuidSchema,
    start_date: dateSchema,
    end_date: dateSchema,
}).strict();

/** PUT /exams/:id — Update exam */
export const UpdateExamSchema = z.object({
    name: z.string().trim().min(1).max(200).optional(),
    code: z.string().trim().max(50).optional(),
    type: examTypeEnum.optional(),
    academic_year_id: uuidSchema.optional(),
    start_date: dateSchema,
    end_date: dateSchema,
}).strict().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
});

/** PATCH /exams/:id/status — Update exam status */
export const UpdateExamStatusSchema = z.object({
    status: examStatusEnum,
}).strict();

export const ExamIdParamSchema = z.object({
    id: uuidSchema,
}).strict();

// ============================================================================
// SCHEDULES
// ============================================================================

/** POST /schedules — Create schedule */
export const CreateScheduleSchema = z.object({
    exam_id: uuidSchema,
    subject_id: uuidSchema,
    class_id: uuidSchema,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Date is required'),
    start_time: z.string().regex(/^\d{2}:\d{2}/, 'Start time is required'),
    end_time: z.string().regex(/^\d{2}:\d{2}/, 'End time is required'),
    max_marks: z.coerce.number().int().positive('Max marks must be positive').max(1000),
    passing_marks: z.coerce.number().int().min(0).max(1000).optional(),
    room_number: z.string().max(50).optional(),
}).strict();

/** PUT /schedules/:id — Update schedule */
export const UpdateScheduleSchema = z.object({
    exam_id: uuidSchema.optional(),
    subject_id: uuidSchema.optional(),
    class_id: uuidSchema.optional(),
    date: dateSchema,
    start_time: timeSchema,
    end_time: timeSchema,
    max_marks: z.coerce.number().int().positive().max(1000).optional(),
    passing_marks: z.coerce.number().int().min(0).max(1000).optional(),
    room_number: z.string().max(50).optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
});

export const ScheduleIdParamSchema = z.object({
    id: uuidSchema,
}).strict();

export const ExamScheduleParamSchema = z.object({
    examId: uuidSchema,
}).strict();

export const ClassScheduleParamSchema = z.object({
    classId: uuidSchema,
}).strict();

// ============================================================================
// MARKS
// ============================================================================

/** POST /marks — Enter marks */
export const EnterMarksSchema = z.object({
    exam_schedule_id: uuidSchema,
    marks: z
        .array(
            z.object({
                student_id: uuidSchema,
                marks_obtained: z.coerce.number().min(0).max(1000).optional(),
                is_absent: z.coerce.boolean().optional(),
                remarks: z.string().max(500).optional(),
            }).strict(),
        )
        .min(1, 'At least one mark entry is required')
        .max(200, 'Cannot enter more than 200 marks at once'),
}).strict();

export const MarksQueryParamSchema = z.object({
    examScheduleId: uuidSchema,
}).strict();

export const StudentMarksParamSchema = z.object({
    studentId: uuidSchema,
}).strict();

// ============================================================================
// GRADES
// ============================================================================

/** POST /grades — Create grade */
export const CreateGradeSchema = z.object({
    name: z.string().trim().min(1, 'Name is required').max(10),
    min_percentage: z.coerce.number().min(0).max(100),
    max_percentage: z.coerce.number().min(0).max(100),
    grade_point: z.coerce.number().min(0).max(10).optional(),
    description: z.string().max(200).optional(),
}).strict();
