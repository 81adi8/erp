import { z } from 'zod';

const optionalText = z.string().trim().optional().or(z.literal(''));

export const academicSessionSchema = z.object({
    name: z.string().min(1, 'Session name is required'),
    code: optionalText,
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    status: z.string().optional(),
    attendance_backdate_days: z.coerce.number().min(0).optional(),
    marks_lock_days: z.coerce.number().min(0).optional(),
    weekly_off_days: z.array(z.number().int().min(0).max(6)).optional(),
    is_attendance_locked: z.boolean().optional(),
    is_marks_locked: z.boolean().optional(),
    is_fees_locked: z.boolean().optional(),
    is_enrollment_locked: z.boolean().optional(),
    admission_start_date: optionalText,
    admission_end_date: optionalText,
    notes: optionalText,
}).refine((d) => d.end_date > d.start_date, {
    message: 'End date must be after start date',
    path: ['end_date'],
});

export const classSchema = z.object({
    name: z.string().min(1, 'Class name is required'),
    code: optionalText,
    numeric_grade: z.coerce.number().min(0).optional(),
    category: z.string().min(1, 'Category is required'),
    language_of_instruction: optionalText,
    display_order: z.coerce.number().min(0).optional(),
    description: optionalText,
    is_active: z.boolean().optional(),
    next_class_id: optionalText,
    is_terminal_class: z.boolean().optional(),
    min_passing_percentage: z.coerce.number().min(0).max(100).optional(),
});

export const sectionSchema = z.object({
    name: z.string().min(1, 'Section name is required'),
    class_id: z.string().min(1, 'Class is required'),
    class_teacher_id: optionalText,
    capacity: z.coerce.number().min(1, 'Capacity must be at least 1').max(100, 'Capacity cannot exceed 100').optional(),
    room_number: optionalText,
    floor: optionalText,
    wing: optionalText,
    attendance_mode: z.enum(['DAILY', 'PERIOD_WISE']).default('DAILY'),
    is_active: z.boolean().optional(),
});

export const subjectSchema = z.object({
    name: z.string().min(1, 'Subject name is required'),
    code: z.string().min(1, 'Subject code is required').optional().or(z.literal('')),
    subject_type: z.enum(['CORE', 'ELECTIVE', 'LANGUAGE', 'VOCATIONAL']),
    credit_hours: z.coerce.number().min(0).optional(),
    is_compulsory: z.boolean().optional(),
    is_practical: z.boolean().optional(),
    is_active: z.boolean().optional(),
    description: optionalText,
    color_code: optionalText,
    assessment_weights: z.object({
        theory: z.coerce.number().min(0),
        practical: z.coerce.number().min(0),
    }),
}).refine((d) => d.assessment_weights.theory + d.assessment_weights.practical <= 100, {
    message: 'Total assessment weight cannot exceed 100',
    path: ['assessment_weights', 'practical'],
});

export const classSubjectSchema = z.object({
    subjectId: z.string().min(1, 'Subject is required'),
    teacherId: optionalText,
    periodsPerWeek: z.coerce.number().min(1, 'Periods per week is required'),
    maxPeriodsPerDay: z.coerce.number().min(1, 'Max periods per day is required'),
    isElective: z.boolean().optional(),
    maxMarks: z.coerce.number().min(1, 'Max marks required'),
    passingMarks: z.coerce.number().min(0),
    requiresSpecialRoom: z.boolean().optional(),
    specialRoomType: optionalText,
    schedulingPreferences: z.object({
        preferred_days: z.array(z.number()).optional(),
        avoid_days: z.array(z.number()).optional(),
        preferred_slots: z.array(z.union([z.string(), z.number()])).optional(),
        avoid_slots: z.array(z.number()).optional(),
        prefer_consecutive: z.boolean().optional(),
        spread_evenly: z.boolean().optional(),
        priority: z.number().optional(),
        min_gap_same_day: z.number().optional(),
    }).optional(),
}).refine((d) => d.passingMarks <= d.maxMarks, {
    message: 'Passing marks cannot exceed max marks',
    path: ['passingMarks'],
});

export const curriculumChapterSchema = z.object({
    name: z.string().min(1, 'Chapter name is required'),
    description: optionalText,
    display_order: z.coerce.number().min(1),
    estimated_hours: z.coerce.number().min(0).optional(),
    learning_outcomes: optionalText,
});

export const curriculumTopicSchema = z.object({
    name: z.string().min(1, 'Topic name is required'),
    description: optionalText,
    display_order: z.coerce.number().min(1),
    estimated_hours: z.coerce.number().min(0).optional(),
    resource_links: optionalText,
});

export const lessonPlanSchema = z.object({
    topic_id: z.string().min(1, 'Topic is required'),
    class_id: z.string().min(1, 'Class is required'),
    section_id: z.string().min(1, 'Section is required'),
    subject_id: z.string().min(1, 'Subject is required'),
    teacher_id: z.string().min(1, 'Teacher is required'),
    planned_date: z.string().min(1, 'Planned date is required'),
    completion_date: optionalText,
    status: z.enum(['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED']),
    remarks: optionalText,
    aims_objectives: optionalText,
    teaching_aids: optionalText,
    homework_assignment: optionalText,
    student_feedback: optionalText,
    coordinator_remarks: optionalText,
    attachment_urls: optionalText,
    academic_year_id: optionalText,
});

export const calendarHolidaySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    holiday_type: z.string().min(1, 'Holiday type is required'),
    description: optionalText,
    is_gazetted: z.boolean().optional(),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    is_recurring: z.boolean().optional(),
}).refine((d) => d.end_date >= d.start_date, {
    message: 'End date must be on or after start date',
    path: ['end_date'],
});

export type AcademicSessionFormData = z.infer<typeof academicSessionSchema>;
export type ClassFormData = z.infer<typeof classSchema>;
export type SectionFormData = z.infer<typeof sectionSchema>;
export type SubjectFormData = z.infer<typeof subjectSchema>;
export type ClassSubjectFormData = z.infer<typeof classSubjectSchema>;
export type CurriculumChapterFormData = z.infer<typeof curriculumChapterSchema>;
export type CurriculumTopicFormData = z.infer<typeof curriculumTopicSchema>;
export type LessonPlanFormData = z.infer<typeof lessonPlanSchema>;
export type CalendarHolidayFormData = z.infer<typeof calendarHolidaySchema>;
