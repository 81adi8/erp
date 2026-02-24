import { baseApi } from '../baseApi';
// Updated Master Holiday endpoints
import type { ApiResponse } from '../baseApi';

export const AcademicSessionStatus = {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    COMPLETED: 'COMPLETED',
    ARCHIVED: 'ARCHIVED'
} as const;
export type AcademicSessionStatus = typeof AcademicSessionStatus[keyof typeof AcademicSessionStatus];

type JsonObject = Record<string, unknown>;
type QueryParams = Record<string, string | number | boolean | undefined>;

interface MutationResult {
    success?: boolean;
    message?: string;
}

interface SessionLockRequest {
    lock_all?: boolean;
    unlock_all?: boolean;
    lock_attendance?: boolean;
    lock_marks?: boolean;
    lock_fees?: boolean;
    lock_enrollment?: boolean;
}

interface SessionLockStatus {
    is_locked: boolean;
    is_attendance_locked?: boolean;
    is_marks_locked?: boolean;
    is_fees_locked?: boolean;
    is_enrollment_locked?: boolean;
    auto_lock_days?: number;
}

interface SessionPromotionDecision {
    enrollmentId: string;
    decision: 'PROMOTED' | 'DETAINED' | 'COMPLETED' | 'DROPPED';
    toClassId?: string;
    toSectionId?: string;
    remarks?: string;
}

interface PromoteStudentsPayload {
    fromSessionId: string;
    toSessionId: string;
    decisions: SessionPromotionDecision[];
}

interface PromoteStudentsResult {
    promoted: number;
    detained: number;
}

interface TransitionSessionPayload {
    fromSessionId: string;
    toSessionId: string;
    dryRun?: boolean;
    notes?: string;
}

export interface AcademicTerm {
    id: string;
    session_id: string;
    name: string;
    code?: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    display_order: number;
    weightage?: number;
    metadata?: JsonObject;
}

export interface SessionHoliday {
    id: string;
    session_id: string;
    name: string;
    start_date: string;
    end_date: string;
    description?: string;
    is_gazetted: boolean;
    holiday_type?: string;
    metadata?: JsonObject;
}

export interface MasterHoliday {
    id: string;
    name: string;
    month: number;
    day: number;
    description?: string;
    is_gazetted: boolean;
    holiday_type?: string;
    calculation_type: 'FIXED' | 'RELATIVE' | 'FORMULA';
    holiday_key?: string;
    is_system_generated: boolean;
    metadata?: JsonObject;
}

export interface AcademicSession {
    id: string;
    name: string;
    code?: string;
    start_date: string;
    end_date: string;
    admission_start_date?: string;
    admission_end_date?: string;
    status: AcademicSessionStatus;
    is_current: boolean;
    weekly_off_days: number[];
    attendance_backdate_days: number;
    marks_lock_days: number;
    promotion_rule?: JsonObject;
    result_publish_rules?: JsonObject;
    notes?: string;
    settings_config?: JsonObject;
    metadata?: JsonObject;
    terms?: AcademicTerm[];
    holidays?: SessionHoliday[];
    is_locked: boolean;
    is_attendance_locked: boolean;
    is_marks_locked: boolean;
    is_fees_locked: boolean;
    is_enrollment_locked: boolean;
    auto_lock_days: number;
    previous_session_id?: string;
    next_session_id?: string;
}

export interface ClassModel {
    id: string;
    name: string;
    code?: string;
    numeric_grade?: number;
    category?: string;
    language_of_instruction?: string;
    display_order?: number;
    description?: string;
    metadata?: JsonObject;
    sections?: Section[];
    is_active: boolean;
    next_class_id?: string;
    is_terminal_class: boolean;
    min_passing_percentage?: number;
}

export interface Section {
    id: string;
    class_id: string;
    name: string;
    capacity?: number;
    class_teacher_id?: string;
    room_number?: string;
    floor?: string;
    wing?: string;
    attendance_mode: string;
    is_active: boolean;
    metadata?: JsonObject;
    class?: ClassModel;
    classTeacher?: {
        id: string;
        name: string;
        email: string;
    };
}

export interface Subject {
    id: string;
    name: string;
    code?: string;
    subject_type: string;
    is_practical: boolean;
    description?: string;
    credit_hours: number;
    color_code?: string;
    icon_name?: string;
    is_compulsory: boolean;
    assessment_weights?: JsonObject;
    is_active: boolean;
    metadata?: JsonObject;
}

export interface ClassSubject {
    id: string;
    class_id: string;
    subject_id: string;
    teacher_id?: string;
    periods_per_week: number;
    is_elective: boolean;
    max_marks?: number;
    passing_marks?: number;
    metadata?: JsonObject;
    subject?: Subject;
    teacher?: {
        id: string;
        name: string;
        email: string;
    };
}

export interface Chapter {
    id: string;
    subject_id: string;
    name: string;
    description?: string;
    display_order: number;
    estimated_hours?: number;
    learning_outcomes?: string[];
    metadata?: JsonObject;
    topics?: Topic[];
}

export interface Topic {
    id: string;
    chapter_id: string;
    name: string;
    description?: string;
    display_order: number;
    is_completed: boolean;
    estimated_hours?: number;
    resource_links?: string[] | JsonObject[];
    completed_at?: string;
    metadata?: JsonObject;
}

export interface LessonPlan {
    id: string;
    topic_id: string;
    class_id: string;
    section_id: string;
    subject_id: string;
    teacher_id: string;
    academic_year_id: string;
    planned_date: string;
    completion_date?: string;
    status: 'PLANNED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
    remarks?: string;
    aims_objectives?: string;
    teaching_aids?: string[];
    homework_assignment?: string;
    student_feedback?: string;
    coordinator_remarks?: string;
    attachment_urls?: string[];
    metadata?: JsonObject;
    topic?: Topic;
    class?: ClassModel;
    section?: Section;
    subject?: Subject;
    teacher?: {
        id: string;
        name: string;
    };
}

export interface AcademicStats {
    classes: number;
    sections: number;
    subjects: number;
    chapters: number;
    topics: number;
    totalEnrollments: number;
    classSubjectMappings: number;
    currentSession: {
        id: string;
        name: string;
        startDate: string;
        endDate: string;
        daysRemaining: number;
        progressPercent: number;
    } | null;
    lessonPlans: {
        total: number;
        planned: number;
        ongoing: number;
        completed: number;
        completionRate: number;
    };
    subjectDistribution: Array<{
        type: string;
        count: number;
        percentage: number;
    }>;
    classWiseData: Array<{
        classId: string;
        className: string;
        studentCount: number;
        sectionCount: number;
    }>;
}

// Timetable Types
export const TimetableSlotType = {
    REGULAR: 'REGULAR',
    BREAK: 'BREAK',
    ASSEMBLY: 'ASSEMBLY',
    LUNCH: 'LUNCH',
    SPECIAL: 'SPECIAL',
} as const;
export type TimetableSlotType = typeof TimetableSlotType[keyof typeof TimetableSlotType];


export interface TimetableSlot {
    id: string;
    day_of_week: number;
    slot_number: number;
    slot_type: TimetableSlotType;
    start_time: string;
    end_time: string;
    room_number?: string;
    notes?: string;
    subject_id?: string;
    teacher_id?: string;
    subject?: {
        id: string;
        name: string;
        code: string;
        color_code?: string;
        icon_name?: string;
    };
    teacher?: { 
        id: string; 
        employee_id?: string;
        name?: string;
        email?: string;
    };
}

export interface TimetableTemplate {
    id: string;
    name: string;
    code?: string;
    description?: string;
    total_slots_per_day: number;
    start_time: string;
    slot_duration_minutes: number;
    break_slots: number[];
    lunch_slot?: number;
    is_default: boolean;
    is_active: boolean;
    slot_config?: {
        lunch_after_slot?: number;
        break_after_slots?: number[];
        [key: string]: unknown;
    };
    generation_rules?: {
        max_consecutive_hours_teacher?: number;
        max_periods_per_subject_per_day?: number;
        allow_double_periods?: boolean;
        balance_subject_distribution?: boolean;
        [key: string]: unknown;
    };
}

export interface TimetableView {
    section: {
        id: string;
        name: string;
        class: { id: string; name: string };
    };
    days: Array<{
        dayOfWeek: number;
        dayName: string;
        slots: TimetableSlot[];
    }>;
}

export interface BulkTimetableSlotsPayload {
    session_id: string;
    section_id: string;
    slots: Array<{
        day_of_week: number;
        slot_number: number;
        subject_id?: string;
        teacher_id?: string;
        slot_type?: TimetableSlotType;
        start_time: string;
        end_time: string;
    }>;
}

export interface PaginatedApiResponse<T> {
    success: boolean;
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
    message?: string;
}

export const academicsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Academic Sessions
        getAcademicSessions: builder.query<PaginatedApiResponse<AcademicSession>, QueryParams>({
            query: (params) => ({
                url: '/school/academics/academic-sessions',
                params
            }),
            providesTags: ['Sessions'],
        }),
        getCurrentAcademicSession: builder.query<ApiResponse<AcademicSession>, void>({
            query: () => '/school/academics/academic-sessions/current',
            providesTags: ['Sessions'],
        }),
        getAcademicSessionById: builder.query<ApiResponse<AcademicSession>, string>({
            query: (id) => `/school/academics/academic-sessions/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Sessions', id }],
        }),
        createAcademicSession: builder.mutation<ApiResponse<AcademicSession>, Partial<AcademicSession>>({
            query: (data) => ({
                url: '/school/academics/academic-sessions',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Sessions'],
        }),
        updateAcademicSession: builder.mutation<ApiResponse<AcademicSession>, { id: string; data: Partial<AcademicSession> }>({
            query: ({ id, data }) => ({
                url: `/school/academics/academic-sessions/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => ['Sessions', { type: 'Sessions', id }],
        }),
        deleteAcademicSession: builder.mutation<ApiResponse<MutationResult>, string>({
            query: (id) => ({
                url: `/school/academics/academic-sessions/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Sessions'],
        }),
        setCurrentSession: builder.mutation<ApiResponse<AcademicSession>, string>({
            query: (id) => ({
                url: `/school/academics/academic-sessions/${id}`,
                method: 'PUT',
                body: { is_current: true }
            }),
            invalidatesTags: ['Sessions'],
        }),

        // Terms & Holidays
        addAcademicTerm: builder.mutation<ApiResponse<AcademicTerm>, { sessionId: string; data: Partial<AcademicTerm> }>({
            query: ({ sessionId, data }) => ({
                url: `/school/academics/academic-sessions/${sessionId}/terms`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Sessions'],
        }),
        updateAcademicTerm: builder.mutation<ApiResponse<AcademicTerm>, { sessionId: string; termId: string; data: Partial<AcademicTerm> }>({
            query: ({ sessionId, termId, data }) => ({
                url: `/school/academics/academic-sessions/${sessionId}/terms/${termId}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Sessions'],
        }),
        deleteAcademicTerm: builder.mutation<ApiResponse<MutationResult>, { sessionId: string; termId: string }>({
            query: ({ sessionId, termId }) => ({
                url: `/school/academics/academic-sessions/${sessionId}/terms/${termId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Sessions'],
        }),
        addSessionHoliday: builder.mutation<ApiResponse<SessionHoliday>, { sessionId: string; data: Partial<SessionHoliday> }>({
            query: ({ sessionId, data }) => ({
                url: `/school/academics/academic-sessions/${sessionId}/holidays`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Sessions'],
        }),
        updateSessionHoliday: builder.mutation<ApiResponse<SessionHoliday>, { sessionId: string; holidayId: string; data: Partial<SessionHoliday> }>({
            query: ({ sessionId, holidayId, data }) => ({
                url: `/school/academics/academic-sessions/${sessionId}/holidays/${holidayId}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Sessions'],
        }),
        deleteSessionHoliday: builder.mutation<ApiResponse<MutationResult>, { sessionId: string; holidayId: string }>({
            query: ({ sessionId, holidayId }) => ({
                url: `/school/academics/academic-sessions/${sessionId}/holidays/${holidayId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Sessions'],
        }),

        // Master Holidays (Recurring)
        getMasterHolidays: builder.query<ApiResponse<MasterHoliday[]>, void>({
            query: () => '/school/academics/master-holidays',
            providesTags: ['Sessions'],
        }),
        addMasterHoliday: builder.mutation<ApiResponse<MasterHoliday>, Partial<MasterHoliday>>({
            query: (data) => ({
                url: '/school/academics/master-holidays',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Sessions'],
        }),
        updateMasterHoliday: builder.mutation<ApiResponse<MasterHoliday>, { holidayId: string; data: Partial<MasterHoliday> }>({
            query: ({ holidayId, data }) => ({
                url: `/school/academics/master-holidays/${holidayId}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Sessions'],
        }),
        deleteMasterHoliday: builder.mutation<ApiResponse<MutationResult>, string>({
            query: (holidayId) => ({
                url: `/school/academics/master-holidays/${holidayId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Sessions'],
        }),
        syncMasterHolidays: builder.mutation<ApiResponse<MutationResult>, void>({
            query: () => ({
                url: '/school/academics/master-holidays/sync',
                method: 'POST',
            }),
            invalidatesTags: ['Sessions'],
        }),

        // Classes
        getClasses: builder.query<PaginatedApiResponse<ClassModel>, QueryParams>({
            query: (params) => ({
                url: '/school/academics/classes',
                params
            }),
            providesTags: ['Classes'],
        }),
        getClassById: builder.query<ApiResponse<ClassModel>, string>({
            query: (id) => `/school/academics/classes/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Classes', id }],
        }),
        createClass: builder.mutation<ApiResponse<ClassModel>, Partial<ClassModel>>({
            query: (data) => ({
                url: '/school/academics/classes',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Classes'],
        }),
        updateClass: builder.mutation<ApiResponse<ClassModel>, { id: string; data: Partial<ClassModel> }>({
            query: ({ id, data }) => ({
                url: `/school/academics/classes/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => ['Classes', { type: 'Classes', id }],
        }),
        deleteClass: builder.mutation<ApiResponse<MutationResult>, string>({
            query: (id) => ({
                url: `/school/academics/classes/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Classes'],
        }),
        reorderClasses: builder.mutation<ApiResponse<MutationResult>, string[]>({
            query: (orderedIds) => ({
                url: '/school/academics/classes/reorder',
                method: 'POST',
                body: { orderedIds },
            }),
            invalidatesTags: ['Classes'],
        }),

        // Sections
        getSections: builder.query<ApiResponse<Section[]>, { classId?: string }>({
            query: (params) => ({
                url: '/school/academics/sections',
                params
            }),
            providesTags: ['Classes'],
        }),
        getSectionById: builder.query<ApiResponse<Section>, string>({
            query: (id) => `/school/academics/sections/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Classes', id }],
        }),
        createSection: builder.mutation<ApiResponse<Section>, { classId: string; data: Partial<Section> }>({
            query: ({ classId, data }) => ({
                url: `/school/academics/classes/${classId}/sections`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Classes'],
        }),
        updateSection: builder.mutation<ApiResponse<Section>, { id: string; data: Partial<Section> }>({
            query: ({ id, data }) => ({
                url: `/school/academics/sections/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Classes'],
        }),
        deleteSection: builder.mutation<ApiResponse<MutationResult>, string>({
            query: (id) => ({
                url: `/school/academics/sections/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Classes'],
        }),
        getSectionsByClassId: builder.query<ApiResponse<Section[]>, string>({
            query: (classId) => ({
                url: '/school/academics/sections',
                params: { classId },
            }),
            providesTags: ['Classes'],
        }),

        // Subjects
        getSubjects: builder.query<PaginatedApiResponse<Subject>, QueryParams>({
            query: (params) => ({
                url: '/school/academics/subjects',
                params
            }),
            providesTags: ['Subjects'],
        }),
        getSubjectById: builder.query<ApiResponse<Subject>, string>({
            query: (id) => `/school/academics/subjects/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Subjects', id }],
        }),
        createSubject: builder.mutation<ApiResponse<Subject>, Partial<Subject>>({
            query: (data) => ({
                url: '/school/academics/subjects',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Subjects'],
        }),
        updateSubject: builder.mutation<ApiResponse<Subject>, { id: string; data: Partial<Subject> }>({
            query: ({ id, data }) => ({
                url: `/school/academics/subjects/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => ['Subjects', { type: 'Subjects', id }],
        }),
        deleteSubject: builder.mutation<ApiResponse<MutationResult>, string>({
            query: (id) => ({
                url: `/school/academics/subjects/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Subjects'],
        }),

        // Class-Subject Assignments
        getClassSubjects: builder.query<ApiResponse<ClassSubject[]>, string>({
            query: (classId) => `/school/academics/classes/${classId}/subjects`,
            providesTags: ['Subjects'],
        }),
        assignSubjectToClass: builder.mutation<ApiResponse<ClassSubject>, { classId: string; data: Partial<ClassSubject> }>({
            query: ({ classId, data }) => ({
                url: `/school/academics/classes/${classId}/subjects`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Subjects'],
        }),
        updateClassSubject: builder.mutation<ApiResponse<ClassSubject>, { classId: string; subjectId: string; data: Partial<ClassSubject> }>({
            query: ({ classId, subjectId, data }) => ({
                url: `/school/academics/classes/${classId}/subjects/${subjectId}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Subjects'],
        }),
        removeSubjectFromClass: builder.mutation<ApiResponse<MutationResult>, { classId: string; subjectId: string }>({
            query: ({ classId, subjectId }) => ({
                url: `/school/academics/classes/${classId}/subjects/${subjectId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Subjects'],
        }),

        // Chapters
        getChapters: builder.query<ApiResponse<Chapter[]>, string>({
            query: (subjectId) => `/school/academics/subjects/${subjectId}/chapters`,
            providesTags: ['Chapters'],
        }),
        getChapterById: builder.query<ApiResponse<Chapter>, string>({
            query: (id) => `/school/academics/chapters/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Chapters', id }],
        }),
        createChapter: builder.mutation<ApiResponse<Chapter>, Partial<Chapter>>({
            query: (data) => ({
                url: '/school/academics/chapters',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Chapters'],
        }),
        updateChapter: builder.mutation<ApiResponse<Chapter>, { id: string; data: Partial<Chapter> }>({
            query: ({ id, data }) => ({
                url: `/school/academics/chapters/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => ['Chapters', { type: 'Chapters', id }],
        }),
        deleteChapter: builder.mutation<ApiResponse<MutationResult>, string>({
            query: (id) => ({
                url: `/school/academics/chapters/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Chapters'],
        }),

        // Topics
        getTopics: builder.query<ApiResponse<Topic[]>, string>({
            query: (chapterId) => `/school/academics/chapters/${chapterId}/topics`,
            providesTags: ['Topics'],
        }),
        getTopicById: builder.query<ApiResponse<Topic>, string>({
            query: (id) => `/school/academics/topics/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Topics', id }],
        }),
        createTopic: builder.mutation<ApiResponse<Topic>, Partial<Topic>>({
            query: (data) => ({
                url: '/school/academics/topics',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Topics', 'Chapters'],
        }),
        updateTopic: builder.mutation<ApiResponse<Topic>, { id: string; data: Partial<Topic> }>({
            query: ({ id, data }) => ({
                url: `/school/academics/topics/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => ['Topics', { type: 'Topics', id }],
        }),
        deleteTopic: builder.mutation<ApiResponse<MutationResult>, string>({
            query: (id) => ({
                url: `/school/academics/topics/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Topics'],
        }),
        markTopicCompleted: builder.mutation<ApiResponse<Topic>, { id: string; completed: boolean }>({
            query: ({ id, completed }) => ({
                url: `/school/academics/topics/${id}/complete`,
                method: 'PATCH',
                body: { completed },
            }),
            invalidatesTags: (_result, _error, { id }) => [{ type: 'Topics', id }],
        }),

        // Lesson Plans
        getLessonPlans: builder.query<PaginatedApiResponse<LessonPlan>, QueryParams>({
            query: (params) => ({
                url: '/school/academics/lesson-plans',
                params
            }),
            providesTags: ['LessonPlans'],
        }),
        getLessonPlanById: builder.query<ApiResponse<LessonPlan>, string>({
            query: (id) => `/school/academics/lesson-plans/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'LessonPlans', id }],
        }),
        createLessonPlan: builder.mutation<ApiResponse<LessonPlan>, Partial<LessonPlan>>({
            query: (data) => ({
                url: '/school/academics/lesson-plans',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['LessonPlans'],
        }),
        updateLessonPlan: builder.mutation<ApiResponse<LessonPlan>, { id: string; data: Partial<LessonPlan> }>({
            query: ({ id, data }) => ({
                url: `/school/academics/lesson-plans/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => ['LessonPlans', { type: 'LessonPlans', id }],
        }),
        deleteLessonPlan: builder.mutation<ApiResponse<MutationResult>, string>({
            query: (id) => ({
                url: `/school/academics/lesson-plans/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['LessonPlans'],
        }),
        getUpcomingLessonPlans: builder.query<ApiResponse<LessonPlan[]>, { days?: number }>({
            query: (params) => ({
                url: '/school/academics/lesson-plans/upcoming',
                params
            }),
            providesTags: ['LessonPlans'],
        }),
        updateLessonPlanStatus: builder.mutation<ApiResponse<LessonPlan>, { id: string; status: string }>({
            query: ({ id, status }) => ({
                url: `/school/academics/lesson-plans/${id}/status`,
                method: 'PATCH',
                body: { status },
            }),
            invalidatesTags: (_result, _error, { id }) => ['LessonPlans', { type: 'LessonPlans', id }],
        }),

        // Stats
        getAcademicStats: builder.query<ApiResponse<AcademicStats>, void>({
            query: () => '/school/academics/stats',
            providesTags: ['Sessions', 'Classes', 'Subjects', 'Chapters', 'Topics', 'LessonPlans'],
        }),

        // Session Management
        lockSession: builder.mutation<ApiResponse<MutationResult>, { id: string; data: SessionLockRequest }>({
            query: ({ id, data }) => ({
                url: `/school/academics/academic-sessions/${id}/lock`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Sessions'],
        }),
        unlockSession: builder.mutation<ApiResponse<MutationResult>, { id: string; data: SessionLockRequest }>({
            query: ({ id, data }) => ({
                url: `/school/academics/academic-sessions/${id}/unlock`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Sessions'],
        }),
        getSessionLockStatus: builder.query<ApiResponse<SessionLockStatus>, string>({
            query: (id) => `/school/academics/academic-sessions/${id}/lock-status`,
            providesTags: (_result, _error, id) => [{ type: 'Sessions', id }],
        }),
        promoteStudents: builder.mutation<ApiResponse<PromoteStudentsResult>, PromoteStudentsPayload>({
            query: (data) => ({
                url: '/school/academics/academic-sessions/promote',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Sessions', 'Classes'],
        }),
        transitionSession: builder.mutation<ApiResponse<MutationResult>, TransitionSessionPayload>({
            query: (data) => ({
                url: '/school/academics/academic-sessions/transition',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Sessions'],
        }),

        // ==================== Timetable ====================
        getTimetableTemplates: builder.query<ApiResponse<TimetableTemplate[]>, void>({
            query: () => '/school/academics/timetable/templates',
            providesTags: ['Timetable'],
        }),
        getTimetableTemplateById: builder.query<ApiResponse<TimetableTemplate>, string>({
            query: (id) => `/school/academics/timetable/templates/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Timetable', id }],
        }),
        createTimetableTemplate: builder.mutation<ApiResponse<TimetableTemplate>, Partial<TimetableTemplate>>({
            query: (data) => ({
                url: '/school/academics/timetable/templates',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Timetable'],
        }),
        updateTimetableTemplate: builder.mutation<ApiResponse<TimetableTemplate>, { id: string; data: Partial<TimetableTemplate> }>({
            query: ({ id, data }) => ({
                url: `/school/academics/timetable/templates/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Timetable'],
        }),
        deleteTimetableTemplate: builder.mutation<ApiResponse<MutationResult>, string>({
            query: (id) => ({
                url: `/school/academics/timetable/templates/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Timetable'],
        }),

        getSectionTimetable: builder.query<ApiResponse<TimetableView>, { sectionId: string; sessionId: string }>({
            query: ({ sectionId, sessionId }) => ({
                url: `/school/academics/timetable/sections/${sectionId}`,
                params: { sessionId },
            }),
            providesTags: ['Timetable'],
        }),
        getTeacherTimetable: builder.query<ApiResponse<TimetableSlot[]>, { teacherId: string; sessionId: string }>({
            query: ({ teacherId, sessionId }) => ({
                url: `/school/academics/timetable/teachers/${teacherId}`,
                params: { sessionId },
            }),
            providesTags: ['Timetable'],
        }),

        createTimetableSlot: builder.mutation<ApiResponse<TimetableSlot>, Partial<TimetableSlot>>({
            query: (data) => ({
                url: '/school/academics/timetable/slots',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Timetable'],
        }),
        updateTimetableSlot: builder.mutation<ApiResponse<TimetableSlot>, { id: string; data: Partial<TimetableSlot> }>({
            query: ({ id, data }) => ({
                url: `/school/academics/timetable/slots/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Timetable'],
        }),
        deleteTimetableSlot: builder.mutation<ApiResponse<MutationResult>, string>({
            query: (id) => ({
                url: `/school/academics/timetable/slots/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Timetable'],
        }),
        bulkCreateTimetableSlots: builder.mutation<ApiResponse<TimetableSlot[]>, BulkTimetableSlotsPayload>({
            query: (data) => ({
                url: '/school/academics/timetable/slots/bulk',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Timetable'],
        }),
        copyTimetable: builder.mutation<ApiResponse<{ copiedCount: number }>, { sourceSessionId: string; targetSessionId: string; sectionId?: string }>({
            query: (data) => ({
                url: '/school/academics/timetable/copy',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Timetable'],
        }),
        generateTimetable: builder.mutation<ApiResponse<MutationResult>, { sectionId: string; sessionId: string; templateId?: string }>({
            query: ({ sectionId, sessionId, templateId }) => ({
                url: `/school/academics/timetable/sections/${sectionId}/generate`,
                method: 'POST',
                body: {
                    session_id: sessionId,
                    template_id: templateId
                },
            }),
            invalidatesTags: ['Timetable'],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetAcademicSessionsQuery,
    useGetCurrentAcademicSessionQuery,
    useGetAcademicSessionByIdQuery,
    useCreateAcademicSessionMutation,
    useUpdateAcademicSessionMutation,
    useDeleteAcademicSessionMutation,
    useSetCurrentSessionMutation,

    useAddAcademicTermMutation,
    useUpdateAcademicTermMutation,
    useDeleteAcademicTermMutation,
    useAddSessionHolidayMutation,
    useUpdateSessionHolidayMutation,
    useDeleteSessionHolidayMutation,

    useGetMasterHolidaysQuery,
    useAddMasterHolidayMutation,
    useUpdateMasterHolidayMutation,
    useDeleteMasterHolidayMutation,
    useSyncMasterHolidaysMutation,

    useGetClassesQuery,
    useGetClassByIdQuery,
    useCreateClassMutation,
    useUpdateClassMutation,
    useDeleteClassMutation,
    useReorderClassesMutation,

    useGetSectionsQuery,
    useGetSectionByIdQuery,
    useCreateSectionMutation,
    useUpdateSectionMutation,
    useDeleteSectionMutation,
    useGetSectionsByClassIdQuery,

    useGetSubjectsQuery,
    useGetSubjectByIdQuery,
    useCreateSubjectMutation,
    useUpdateSubjectMutation,
    useDeleteSubjectMutation,

    useGetClassSubjectsQuery,
    useAssignSubjectToClassMutation,
    useUpdateClassSubjectMutation,
    useRemoveSubjectFromClassMutation,

    useGetChaptersQuery,
    useGetChapterByIdQuery,
    useCreateChapterMutation,
    useUpdateChapterMutation,
    useDeleteChapterMutation,

    useGetTopicsQuery,
    useGetTopicByIdQuery,
    useCreateTopicMutation,
    useUpdateTopicMutation,
    useDeleteTopicMutation,
    useMarkTopicCompletedMutation,

    useGetLessonPlansQuery,
    useGetLessonPlanByIdQuery,
    useCreateLessonPlanMutation,
    useUpdateLessonPlanMutation,
    useDeleteLessonPlanMutation,
    useGetUpcomingLessonPlansQuery,
    useUpdateLessonPlanStatusMutation,

    useGetAcademicStatsQuery,

    useLockSessionMutation,
    useUnlockSessionMutation,
    useGetSessionLockStatusQuery,
    usePromoteStudentsMutation,
    useTransitionSessionMutation,

    // Timetable
    useGetTimetableTemplatesQuery,
    useGetTimetableTemplateByIdQuery,
    useCreateTimetableTemplateMutation,
    useUpdateTimetableTemplateMutation,
    useDeleteTimetableTemplateMutation,
    useGetSectionTimetableQuery,
    useGetTeacherTimetableQuery,
    useCreateTimetableSlotMutation,
    useUpdateTimetableSlotMutation,
    useDeleteTimetableSlotMutation,
    useBulkCreateTimetableSlotsMutation,
    useCopyTimetableMutation,
    useGenerateTimetableMutation,
} = academicsApi;

export default academicsApi;
