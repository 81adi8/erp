import { z } from 'zod';

const uuidSchema = z.string().uuid('Invalid UUID');

const optionalTrimmedString = (max: number) => z.string().trim().min(1).max(max).optional();

const timeHHMMSS = z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm format');

export const createAcademicYearSchema = z.object({
    name: z.string().trim().min(1, 'name is required').max(120),
    start_date: z.string().date('start_date must be a valid ISO date (YYYY-MM-DD)'),
    end_date: z.string().date('end_date must be a valid ISO date (YYYY-MM-DD)'),
    is_active: z.coerce.boolean().optional()
}).superRefine((data, ctx) => {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return;
    }

    if (startDate >= endDate) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['end_date'],
            message: 'end_date must be after start_date'
        });
    }
});

export const updateAcademicYearSchema = createAcademicYearSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
    })
    .superRefine((data, ctx) => {
        if (data.start_date && data.end_date) {
            const startDate = new Date(data.start_date);
            const endDate = new Date(data.end_date);
            if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && startDate >= endDate) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['end_date'],
                    message: 'end_date must be after start_date'
                });
            }
        }
    });

export const createClassSchema = z.object({
    academic_year_id: uuidSchema,
    name: z.string().trim().min(1, 'name is required').max(50),
    order_index: z.coerce.number().int().min(0).optional(),
    code: optionalTrimmedString(20),
    numeric_grade: z.coerce.number().int().min(1).max(20).optional(),
    category: z
        .enum([
            'PRE_PRIMARY',
            'PRIMARY',
            'MIDDLE',
            'SECONDARY',
            'HIGHER_SECONDARY',
            'DIPLOMA',
            'GRADUATE',
            'POST_GRADUATE'
        ])
        .optional(),
    language_of_instruction: optionalTrimmedString(100),
    display_order: z.coerce.number().int().min(0).optional(),
    description: z.string().trim().max(500).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

export const updateClassSchema = createClassSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
    });

export const createSectionSchema = z.object({
    name: z.string().trim().min(1, 'name is required').max(20),
    max_strength: z.coerce.number().int().min(1).max(100).optional(),
    capacity: z.coerce.number().int().min(1).max(2000).optional(),
    class_teacher_id: uuidSchema.optional(),
    room_number: optionalTrimmedString(100),
    floor: optionalTrimmedString(30),
    wing: optionalTrimmedString(30),
    attendance_mode: z.enum(['DAILY', 'PERIOD_WISE']).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
}).superRefine((data, ctx) => {
    if (data.capacity !== undefined && data.max_strength !== undefined && data.max_strength > data.capacity) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['max_strength'],
            message: 'max_strength cannot exceed capacity'
        });
    }
});

export const updateSectionSchema = createSectionSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
    })
    .superRefine((data, ctx) => {
        if (data.capacity !== undefined && data.max_strength !== undefined && data.max_strength > data.capacity) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['max_strength'],
                message: 'max_strength cannot exceed capacity'
            });
        }
    });

export const createSubjectSchema = z.object({
    name: z.string().trim().min(2, 'name is required').max(100),
    code: z.string().trim().min(1, 'code is required').max(20),
    subject_type: z
        .enum(['theory', 'practical', 'both']),
    is_practical: z.coerce.boolean().optional(),
    description: z.string().trim().max(500).optional(),
    credit_hours: z.coerce.number().int().min(0).max(100).optional(),
    color_code: z.string().trim().max(30).optional(),
    icon_name: z.string().trim().max(100).optional(),
    is_compulsory: z.coerce.boolean().optional(),
    assessment_weights: z.record(z.string(), z.unknown()).optional(),
    max_marks: z.coerce.number().int().min(1),
    passing_marks: z.coerce.number().int().min(0),
    metadata: z.record(z.string(), z.unknown()).optional()
}).superRefine((data, ctx) => {
    if ((data.passing_marks as number) > (data.max_marks as number)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['passing_marks'],
            message: 'passing_marks cannot exceed max_marks'
        });
    }
});

export const updateSubjectSchema = createSubjectSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
    })
    .superRefine((data, ctx) => {
        const hasMax = data.max_marks !== undefined;
        const hasPassing = data.passing_marks !== undefined;

        if (hasMax !== hasPassing) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['passing_marks'],
                message: 'max_marks and passing_marks must be provided together when updating'
            });
            return;
        }

        if (hasMax && hasPassing && (data.passing_marks as number) > (data.max_marks as number)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['passing_marks'],
                message: 'passing_marks cannot exceed max_marks'
            });
        }
    });

export const createClassTeacherAssignmentSchema = z.object({
    teacher_id: uuidSchema,
    class_id: uuidSchema,
    section_id: uuidSchema,
    academic_year_id: uuidSchema,
    is_active: z.coerce.boolean().optional()
});

export const createSubjectTeacherAssignmentSchema = z.object({
    teacher_id: uuidSchema,
    subject_id: uuidSchema,
    section_id: uuidSchema,
    academic_year_id: uuidSchema,
    is_active: z.coerce.boolean().optional()
});

const fixedSlotSchema = z.object({
    day: z.coerce.number().int().min(0).max(6),
    slot: z.coerce.number().int().min(1).max(12)
});

const schedulingPreferencesSchema = z.object({
    preferred_days: z.array(z.coerce.number().int().min(0).max(6)).optional(),
    avoid_days: z.array(z.coerce.number().int().min(0).max(6)).optional(),
    preferred_slots: z.array(z.union([z.string(), z.coerce.number().int()])).optional(),
    avoid_slots: z.array(z.coerce.number().int().min(1).max(12)).optional(),
    prefer_consecutive: z.coerce.boolean().optional(),
    min_gap_same_day: z.coerce.number().int().min(0).max(6).optional(),
    priority: z.coerce.number().int().min(1).max(10).optional(),
    required_room_type: optionalTrimmedString(100),
    fixed_slots: z.array(fixedSlotSchema).optional(),
    spread_evenly: z.coerce.boolean().optional()
});

export const assignSubjectToClassSchema = z.object({
    subject_id: uuidSchema,
    teacher_id: uuidSchema.optional(),
    periods_per_week: z.coerce.number().int().min(1).max(12).optional(),
    max_periods_per_day: z.coerce.number().int().min(1).max(6).optional(),
    min_periods_per_week: z.coerce.number().int().min(1).optional(),
    is_elective: z.coerce.boolean().optional(),
    requires_special_room: z.coerce.boolean().optional(),
    special_room_type: optionalTrimmedString(50),
    max_marks: z.coerce.number().int().min(0).optional(),
    passing_marks: z.coerce.number().int().min(0).optional(),
    scheduling_preferences: schedulingPreferencesSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
}).superRefine((data, ctx) => {
    const hasMaxMarks = data.max_marks !== undefined;
    const hasPassingMarks = data.passing_marks !== undefined;

    if (hasMaxMarks !== hasPassingMarks) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['passing_marks'],
            message: 'max_marks and passing_marks must be provided together'
        });
        return;
    }

    if (hasMaxMarks && hasPassingMarks && (data.passing_marks as number) > (data.max_marks as number)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['passing_marks'],
            message: 'passing_marks cannot exceed max_marks'
        });
    }
});

export const updateClassSubjectAssignmentSchema = z.object({
    teacher_id: z.union([uuidSchema, z.null()]).optional(),
    periods_per_week: z.coerce.number().int().min(1).max(12).optional(),
    max_periods_per_day: z.coerce.number().int().min(1).max(6).optional(),
    min_periods_per_week: z.coerce.number().int().min(1).optional(),
    is_elective: z.coerce.boolean().optional(),
    requires_special_room: z.coerce.boolean().optional(),
    special_room_type: optionalTrimmedString(50),
    max_marks: z.coerce.number().int().min(0).optional(),
    passing_marks: z.coerce.number().int().min(0).optional(),
    scheduling_preferences: schedulingPreferencesSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
}).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required'
}).superRefine((data, ctx) => {
    const hasMaxMarks = data.max_marks !== undefined;
    const hasPassingMarks = data.passing_marks !== undefined;

    if (hasMaxMarks !== hasPassingMarks) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['passing_marks'],
            message: 'max_marks and passing_marks must be provided together'
        });
        return;
    }

    if (hasMaxMarks && hasPassingMarks && (data.passing_marks as number) > (data.max_marks as number)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['passing_marks'],
            message: 'passing_marks cannot exceed max_marks'
        });
    }
});

const dayOfWeekSchema = z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']);

export const addTimetablePeriodSchema = z.object({
    academic_year_id: uuidSchema,
    class_id: uuidSchema,
    section_id: uuidSchema,
    subject_id: uuidSchema,
    teacher_id: uuidSchema,
    day_of_week: dayOfWeekSchema,
    period_number: z.coerce.number().int().min(1).max(8),
    start_time: timeHHMMSS,
    end_time: timeHHMMSS,
    room_number: optionalTrimmedString(100),
    is_active: z.coerce.boolean().optional()
}).superRefine((data, ctx) => {
    if (data.start_time >= data.end_time) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['end_time'],
            message: 'end_time must be after start_time'
        });
    }
});

export const updateTimetablePeriodSchema = addTimetablePeriodSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
    })
    .superRefine((data, ctx) => {
        if (data.start_time && data.end_time && data.start_time >= data.end_time) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['end_time'],
                message: 'end_time must be after start_time'
            });
        }
    });

export const timetableConflictCheckSchema = z.object({
    academic_year_id: uuidSchema,
    class_id: uuidSchema,
    section_id: uuidSchema,
    teacher_id: uuidSchema,
    day_of_week: dayOfWeekSchema,
    period_number: z.coerce.number().int().min(1).max(8),
    exclude_id: uuidSchema.optional()
});

export const academicYearIdParamSchema = z.object({
    id: uuidSchema
});

export const entityIdParamSchema = z.object({
    id: uuidSchema
});

export const teacherIdParamSchema = z.object({
    teacherId: uuidSchema
});

export const classIdParamSchema = z.object({
    classId: uuidSchema
});

export const classSectionParamSchema = z.object({
    classId: uuidSchema,
    sectionId: uuidSchema
});

export const classSubjectParamSchema = z.object({
    classId: uuidSchema,
    subjectId: uuidSchema
});

export const sectionIdParamSchema = z.object({
    sectionId: uuidSchema
});

export const academicYearQuerySchema = z.object({
    academicYearId: uuidSchema
});

export const sessionTermParamSchema = z.object({
    id: uuidSchema,
    termId: uuidSchema
}).strict();

export const sessionHolidayParamSchema = z.object({
    id: uuidSchema,
    holidayId: uuidSchema
}).strict();

export const holidayIdParamSchema = z.object({
    holidayId: uuidSchema
}).strict();

export const createAcademicSessionSchema = z.object({
    name: z.string().trim().min(3, 'name is required').max(50),
    code: optionalTrimmedString(20),
    start_date: z.string().date('start_date must be a valid ISO date (YYYY-MM-DD)'),
    end_date: z.string().date('end_date must be a valid ISO date (YYYY-MM-DD)'),
    admission_start_date: z.string().date('admission_start_date must be a valid ISO date (YYYY-MM-DD)').optional(),
    admission_end_date: z.string().date('admission_end_date must be a valid ISO date (YYYY-MM-DD)').optional(),
    status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
    is_current: z.coerce.boolean().optional(),
    weekly_off_days: z.array(z.coerce.number().int().min(0).max(6)).optional(),
    attendance_backdate_days: z.coerce.number().int().min(0).max(365).optional(),
    marks_lock_days: z.coerce.number().int().min(0).max(365).optional(),
    promotion_rule: z.record(z.string(), z.unknown()).optional(),
    result_publish_rules: z.record(z.string(), z.unknown()).optional(),
    notes: z.string().trim().max(2000).optional(),
    settings_config: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
}).strict().superRefine((data, ctx) => {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && startDate >= endDate) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['end_date'],
            message: 'end_date must be after start_date'
        });
    }

    if (data.admission_start_date && data.admission_end_date) {
        const admissionStart = new Date(data.admission_start_date);
        const admissionEnd = new Date(data.admission_end_date);
        if (!Number.isNaN(admissionStart.getTime()) && !Number.isNaN(admissionEnd.getTime()) && admissionStart > admissionEnd) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['admission_end_date'],
                message: 'admission_end_date must be on or after admission_start_date'
            });
        }
    }
});

export const updateAcademicSessionSchema = createAcademicSessionSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
    });

export const createAcademicTermSchema = z.object({
    name: z.string().trim().min(1, 'name is required').max(120),
    code: optionalTrimmedString(20),
    start_date: z.string().date('start_date must be a valid ISO date (YYYY-MM-DD)'),
    end_date: z.string().date('end_date must be a valid ISO date (YYYY-MM-DD)'),
    is_active: z.coerce.boolean().optional(),
    display_order: z.coerce.number().int().min(0).max(1000).optional(),
    weightage: z.coerce.number().min(0).max(100).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
}).strict().superRefine((data, ctx) => {
    if (new Date(data.start_date) >= new Date(data.end_date)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['end_date'],
            message: 'end_date must be after start_date'
        });
    }
});

export const updateAcademicTermSchema = createAcademicTermSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
    });

const sessionHolidayBaseSchema = z.object({
    name: z.string().trim().min(1, 'name is required').max(200),
    start_date: z.string().date('start_date must be a valid ISO date (YYYY-MM-DD)'),
    end_date: z.string().date('end_date must be a valid ISO date (YYYY-MM-DD)'),
    description: z.string().trim().max(1000).optional(),
    is_gazetted: z.coerce.boolean().optional(),
    holiday_type: optionalTrimmedString(100),
    metadata: z.record(z.string(), z.unknown()).optional()
}).strict();

export const createSessionHolidaySchema = sessionHolidayBaseSchema.superRefine((data, ctx) => {
    if (new Date(data.start_date) > new Date(data.end_date)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['end_date'],
            message: 'end_date must be on or after start_date'
        });
    }
});

export const updateSessionHolidaySchema = sessionHolidayBaseSchema
    .extend({
        is_active: z.coerce.boolean().optional()
    })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
    })
    .superRefine((data, ctx) => {
        if (data.start_date && data.end_date && new Date(data.start_date) > new Date(data.end_date)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['end_date'],
                message: 'end_date must be on or after start_date'
            });
        }
    });

export const createMasterHolidaySchema = z.object({
    name: z.string().trim().min(1, 'name is required').max(200),
    month: z.coerce.number().int().min(1).max(12),
    day: z.coerce.number().int().min(1).max(31),
    description: z.string().trim().max(1000).optional(),
    is_gazetted: z.coerce.boolean().optional(),
    holiday_type: optionalTrimmedString(100),
    metadata: z.record(z.string(), z.unknown()).optional()
}).strict();

export const updateMasterHolidaySchema = createMasterHolidaySchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
    });

export const syncMasterHolidaysSchema = z.object({}).strict();

export const lockAcademicSessionSchema = z.object({
    lockAttendance: z.coerce.boolean().optional(),
    lockMarks: z.coerce.boolean().optional(),
    lockFees: z.coerce.boolean().optional(),
    lockEnrollment: z.coerce.boolean().optional(),
    reason: z.string().trim().max(500).optional()
}).strict();

const promotionDecisionSchema = z.enum(['PROMOTED', 'DETAINED', 'COMPLETED', 'TRANSFERRED', 'DROPPED', 'LATERAL_ENTRY']);

const promotionDecisionItemSchema = z.object({
    enrollmentId: uuidSchema,
    decision: promotionDecisionSchema,
    toClassId: uuidSchema.optional(),
    toSectionId: uuidSchema.optional(),
    percentage: z.coerce.number().min(0).max(100).optional(),
    grade: z.string().trim().max(20).optional(),
    remarks: z.string().trim().max(1000).optional()
}).strict();

export const bulkPromotionSchema = z.object({
    fromSessionId: uuidSchema,
    toSessionId: uuidSchema,
    decisions: z.array(promotionDecisionItemSchema).min(1, 'At least one promotion decision is required')
}).strict();

export const createNextSessionSchema = z.object({
    currentSessionId: uuidSchema,
    name: z.string().trim().min(1, 'name is required').max(120),
    code: optionalTrimmedString(20),
    start_date: z.string().date('start_date must be a valid ISO date (YYYY-MM-DD)'),
    end_date: z.string().date('end_date must be a valid ISO date (YYYY-MM-DD)')
}).strict().superRefine((data, ctx) => {
    if (new Date(data.start_date) >= new Date(data.end_date)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['end_date'],
            message: 'end_date must be after start_date'
        });
    }
});

export const classReorderSchema = z.object({
    orderedIds: z.array(uuidSchema).min(1, 'orderedIds must contain at least one class id')
}).strict();

export const createChapterSchema = z.object({
    subject_id: uuidSchema,
    name: z.string().trim().min(2, 'name is required').max(200),
    chapter_number: z.coerce.number().int().min(1).optional(),
    description: z.string().trim().max(2000).optional(),
    display_order: z.coerce.number().int().min(0).optional(),
    estimated_hours: z.coerce.number().min(0).optional(),
    learning_outcomes: z.array(z.string().trim().min(1).max(300)).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
}).strict();

export const updateChapterSchema = createChapterSchema
    .omit({ subject_id: true })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
    });

export const createTopicSchema = z.object({
    chapter_id: uuidSchema,
    name: z.string().trim().min(2, 'name is required').max(200),
    topic_number: z.coerce.number().int().min(1).optional(),
    estimated_hours: z.coerce.number().min(0.5).optional(),
    description: z.string().trim().max(2000).optional(),
    display_order: z.coerce.number().int().min(0).optional(),
    resource_links: z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())]).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
}).strict();

export const updateTopicSchema = createTopicSchema
    .omit({ chapter_id: true })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
    });

export const topicCompletionSchema = z.object({
    completed: z.coerce.boolean().optional().default(true)
}).strict();

const lessonPlanStatusSchema = z.enum(['PLANNED', 'ONGOING', 'COMPLETED', 'CANCELLED']);

export const createLessonPlanSchema = z.object({
    topic_id: uuidSchema,
    class_id: uuidSchema,
    section_id: uuidSchema,
    teacher_id: uuidSchema.optional(),
    planned_date: z.string().date('planned_date must be a valid ISO date (YYYY-MM-DD)'),
    remarks: z.string().trim().max(2000).optional(),
    status: lessonPlanStatusSchema.optional(),
    aims_objectives: z.string().trim().max(3000).optional(),
    teaching_aids: z.array(z.string().trim().min(1).max(300)).optional(),
    homework_assignment: z.string().trim().max(2000).optional(),
    attachment_urls: z.array(z.string().trim().url('attachment_urls must contain valid URLs')).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
}).strict();

export const updateLessonPlanSchema = z.object({
    planned_date: z.string().date('planned_date must be a valid ISO date (YYYY-MM-DD)').optional(),
    completion_date: z.string().date('completion_date must be a valid ISO date (YYYY-MM-DD)').optional(),
    remarks: z.string().trim().max(2000).optional(),
    status: lessonPlanStatusSchema.optional(),
    teacher_id: z.union([uuidSchema, z.null()]).optional(),
    aims_objectives: z.string().trim().max(3000).optional(),
    teaching_aids: z.array(z.string().trim().min(1).max(300)).optional(),
    homework_assignment: z.string().trim().max(2000).optional(),
    student_feedback: z.string().trim().max(2000).optional(),
    coordinator_remarks: z.string().trim().max(2000).optional(),
    attachment_urls: z.array(z.string().trim().url('attachment_urls must contain valid URLs')).optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
}).strict().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required'
});

export const updateLessonPlanStatusSchema = z.object({
    status: lessonPlanStatusSchema
}).strict();

const timetableSlotTypeSchema = z.enum(['REGULAR', 'BREAK', 'ASSEMBLY', 'LUNCH', 'SPECIAL']);
const hhmmTimeSchema = z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm format');

const generationRulesSchema = z.object({
    max_consecutive_hours_teacher: z.coerce.number().int().min(1).max(12).optional(),
    max_periods_per_subject_per_day: z.coerce.number().int().min(1).max(12).optional(),
    allow_double_periods: z.coerce.boolean().optional(),
    balance_subject_distribution: z.coerce.boolean().optional()
}).strict();

const slotConfigSchema = z.object({
    lunch_after_slot: z.coerce.number().int().min(1).max(12).optional(),
    break_after_slots: z.array(z.coerce.number().int().min(1).max(12)).optional()
}).strict();

export const createTimetableTemplateSchema = z.object({
    name: z.string().trim().min(1, 'name is required').max(100),
    code: optionalTrimmedString(20),
    description: z.string().trim().max(2000).optional(),
    total_slots_per_day: z.coerce.number().int().min(1).max(16).optional(),
    start_time: hhmmTimeSchema.optional(),
    slot_duration_minutes: z.coerce.number().int().min(15).max(180).optional(),
    break_slots: z.array(z.coerce.number().int().min(1).max(16)).optional(),
    lunch_slot: z.coerce.number().int().min(1).max(16).optional(),
    is_default: z.coerce.boolean().optional(),
    is_active: z.coerce.boolean().optional(),
    slot_config: slotConfigSchema.optional(),
    generation_rules: generationRulesSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
}).strict();

export const updateTimetableTemplateSchema = createTimetableTemplateSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
    });

export const createTimetableSlotSchema = z.object({
    class_id: uuidSchema,
    section_id: uuidSchema,
    subject_id: z.union([uuidSchema, z.null()]).optional(),
    teacher_id: z.union([uuidSchema, z.null()]).optional(),
    session_id: uuidSchema,
    day_of_week: z.coerce.number().int().min(0).max(6),
    slot_number: z.coerce.number().int().min(1).max(16),
    slot_type: timetableSlotTypeSchema.optional(),
    start_time: hhmmTimeSchema,
    end_time: hhmmTimeSchema,
    room_number: z.string().trim().max(50).optional(),
    notes: z.string().trim().max(2000).optional()
}).strict().superRefine((data, ctx) => {
    if (data.start_time >= data.end_time) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['end_time'],
            message: 'end_time must be after start_time'
        });
    }
});

export const updateTimetableSlotSchema = createTimetableSlotSchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required'
    })
    .superRefine((data, ctx) => {
        if (data.start_time && data.end_time && data.start_time >= data.end_time) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['end_time'],
                message: 'end_time must be after start_time'
            });
        }
    });

export const bulkCreateTimetableSlotsSchema = z.object({
    session_id: uuidSchema,
    section_id: uuidSchema,
    slots: z.array(z.object({
        day_of_week: z.coerce.number().int().min(0).max(6),
        slot_number: z.coerce.number().int().min(1).max(16),
        subject_id: z.union([uuidSchema, z.null()]).optional(),
        teacher_id: z.union([uuidSchema, z.null()]).optional(),
        slot_type: timetableSlotTypeSchema.optional(),
        start_time: hhmmTimeSchema,
        end_time: hhmmTimeSchema
    }).strict()).min(1, 'At least one slot is required')
}).strict();

export const copyTimetableSchema = z.object({
    sourceSessionId: uuidSchema,
    targetSessionId: uuidSchema,
    sectionId: uuidSchema.optional()
}).strict();

export const generateTimetableSchema = z.object({
    session_id: uuidSchema,
    template_id: uuidSchema.optional()
}).strict();
