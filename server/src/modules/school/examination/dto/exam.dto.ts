/**
 * Examination DTOs and Validation Schemas
 * INTEGRITY: Zod validation for all exam-related inputs
 */
import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const ExamTypeEnum = z.enum([
    'MID_TERM',
    'FINAL',
    'UNIT_TEST',
    'QUIZ',
    'PRACTICAL',
    'ASSIGNMENT'
]);

export const ExamStatusEnum = z.enum([
    'draft',
    'scheduled',
    'ongoing',
    'completed',
    'cancelled'
]);

// ============================================================================
// EXAM SCHEMAS
// ============================================================================

/**
 * Create Exam Schema
 * Validates all required fields for creating a new exam
 */
export const CreateExamSchema = z.object({
    name: z.string()
        .min(1, 'Exam name is required')
        .max(100, 'Exam name must be 100 characters or less'),
    
    code: z.string()
        .max(20, 'Exam code must be 20 characters or less')
        .optional(),
    
    type: ExamTypeEnum
        .refine(val => val, { message: 'Exam type is required' }),
    
    academic_year_id: z.string()
        .uuid('Academic year ID must be a valid UUID'),
    
    start_date: z.string()
        .datetime({ message: 'Start date must be a valid ISO date' })
        .optional()
        .nullable(),
    
    end_date: z.string()
        .datetime({ message: 'End date must be a valid ISO date' })
        .optional()
        .nullable(),
    
    total_marks: z.number()
        .int('Total marks must be an integer')
        .positive('Total marks must be positive')
        .optional(),
    
    passing_marks: z.number()
        .int('Passing marks must be an integer')
        .min(0, 'Passing marks cannot be negative')
        .optional(),
    
    description: z.string()
        .max(500, 'Description must be 500 characters or less')
        .optional(),
}).refine(
    (data) => {
        // If both dates are provided, end_date must be after start_date
        if (data.start_date && data.end_date) {
            return new Date(data.end_date) > new Date(data.start_date);
        }
        return true;
    },
    {
        message: 'End date must be after start date',
        path: ['end_date']
    }
);

/**
 * Update Exam Schema
 * All fields optional for partial updates
 */
export const UpdateExamSchema = z.object({
    name: z.string()
        .min(1, 'Exam name cannot be empty')
        .max(100, 'Exam name must be 100 characters or less')
        .optional(),
    
    code: z.string()
        .max(20, 'Exam code must be 20 characters or less')
        .optional(),
    
    type: ExamTypeEnum.optional(),
    
    start_date: z.string()
        .datetime({ message: 'Start date must be a valid ISO date' })
        .optional()
        .nullable(),
    
    end_date: z.string()
        .datetime({ message: 'End date must be a valid ISO date' })
        .optional()
        .nullable(),
    
    total_marks: z.number()
        .int('Total marks must be an integer')
        .positive('Total marks must be positive')
        .optional(),
    
    passing_marks: z.number()
        .int('Passing marks must be an integer')
        .min(0, 'Passing marks cannot be negative')
        .optional(),
    
    description: z.string()
        .max(500, 'Description must be 500 characters or less')
        .optional(),
    
    status: ExamStatusEnum.optional(),
});

/**
 * Exam ID Parameter Schema
 */
export const ExamIdParamSchema = z.object({
    id: z.string().uuid('Exam ID must be a valid UUID'),
});

// ============================================================================
// EXAM SCHEDULE SCHEMAS
// ============================================================================

/**
 * Create Exam Schedule Schema
 */
export const CreateScheduleSchema = z.object({
    exam_id: z.string()
        .uuid('Exam ID must be a valid UUID'),
    
    subject_id: z.string()
        .uuid('Subject ID must be a valid UUID'),
    
    class_id: z.string()
        .uuid('Class ID must be a valid UUID'),
    
    section_id: z.string()
        .uuid('Section ID must be a valid UUID')
        .optional()
        .nullable(),
    
    date: z.string()
        .datetime({ message: 'Schedule date must be a valid ISO date' }),
    
    start_time: z.string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Start time must be in HH:MM or HH:MM:SS format'),
    
    end_time: z.string()
        .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'End time must be in HH:MM or HH:MM:SS format'),
    
    max_marks: z.number()
        .int('Max marks must be an integer')
        .positive('Max marks must be positive'),
    
    passing_marks: z.number()
        .int('Passing marks must be an integer')
        .min(0, 'Passing marks cannot be negative')
        .optional(),
    
    room_number: z.string()
        .max(20, 'Room number must be 20 characters or less')
        .optional(),
    
    notes: z.string()
        .max(500, 'Notes must be 500 characters or less')
        .optional(),
}).refine(
    (data) => {
        // End time must be after start time
        return data.end_time > data.start_time;
    },
    {
        message: 'End time must be after start time',
        path: ['end_time']
    }
);

/**
 * Update Exam Schedule Schema
 */
export const UpdateScheduleSchema = z.object({
    subject_id: z.string().uuid().optional(),
    class_id: z.string().uuid().optional(),
    section_id: z.string().uuid().optional().nullable(),
    date: z.string().datetime().optional(),
    start_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).optional(),
    end_time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).optional(),
    max_marks: z.number().int().positive().optional(),
    passing_marks: z.number().int().min(0).optional(),
    room_number: z.string().max(20).optional(),
    notes: z.string().max(500).optional(),
});

/**
 * Schedule ID Parameter Schema
 */
export const ScheduleIdParamSchema = z.object({
    id: z.string().uuid('Schedule ID must be a valid UUID'),
    examId: z.string().uuid('Exam ID must be a valid UUID').optional(),
    examScheduleId: z.string().uuid('Exam Schedule ID must be a valid UUID').optional(),
});

// ============================================================================
// MARKS SCHEMAS
// ============================================================================

/**
 * Single Mark Entry Schema
 */
export const MarkEntrySchema = z.object({
    student_id: z.string()
        .uuid('Student ID must be a valid UUID'),
    
    marks_obtained: z.number()
        .min(0, 'Marks cannot be negative')
        .optional()
        .nullable(),
    
    is_absent: z.boolean()
        .optional()
        .default(false),
    
    remarks: z.string()
        .max(200, 'Remarks must be 200 characters or less')
        .optional(),
});

/**
 * Enter Marks Schema (Bulk)
 */
export const EnterMarksSchema = z.object({
    exam_schedule_id: z.string()
        .uuid('Exam schedule ID must be a valid UUID'),
    
    marks: z.array(MarkEntrySchema)
        .min(1, 'At least one mark entry is required')
        .max(200, 'Maximum 200 mark entries allowed at once'),
}).refine(
    (data) => {
        // Validate that marks_obtained doesn't exceed max_marks (would need to fetch schedule)
        // This is a basic validation; service layer should do full validation
        for (const mark of data.marks) {
            if (mark.marks_obtained !== undefined && mark.marks_obtained !== null && mark.marks_obtained < 0) {
                return false;
            }
        }
        return true;
    },
    {
        message: 'Marks obtained cannot be negative'
    }
);

/**
 * Student Marks Query Schema
 */
export const StudentMarksQuerySchema = z.object({
    studentId: z.string().uuid('Student ID must be a valid UUID'),
});

// ============================================================================
// GRADE SCHEMAS
// ============================================================================

/**
 * Create Grade Schema
 */
export const CreateGradeSchema = z.object({
    name: z.string()
        .min(1, 'Grade name is required')
        .max(10, 'Grade name must be 10 characters or less'),
    
    min_percentage: z.number()
        .min(0, 'Minimum percentage cannot be negative')
        .max(100, 'Minimum percentage cannot exceed 100'),
    
    max_percentage: z.number()
        .min(0, 'Maximum percentage cannot be negative')
        .max(100, 'Maximum percentage cannot exceed 100'),
    
    grade_points: z.number()
        .min(0, 'Grade points cannot be negative')
        .max(10, 'Grade points cannot exceed 10')
        .optional(),
    
    description: z.string()
        .max(100, 'Description must be 100 characters or less')
        .optional(),
}).refine(
    (data) => data.max_percentage > data.min_percentage,
    {
        message: 'Maximum percentage must be greater than minimum percentage',
        path: ['max_percentage']
    }
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateExamDTO = z.infer<typeof CreateExamSchema>;
export type UpdateExamDTO = z.infer<typeof UpdateExamSchema>;
export type CreateScheduleDTO = z.infer<typeof CreateScheduleSchema>;
export type UpdateScheduleDTO = z.infer<typeof UpdateScheduleSchema>;
export type EnterMarksDTO = z.infer<typeof EnterMarksSchema>;
export type CreateGradeDTO = z.infer<typeof CreateGradeSchema>;