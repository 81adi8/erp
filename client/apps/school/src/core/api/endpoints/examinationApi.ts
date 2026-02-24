// School Examination API
// FIXED: All paths changed from /school/examination/* to /school/exams/*
// Backend mounts examination router at /school/exams (school/routes/index.ts).
// The old /school/examination/* namespace caused 404 on every call.
import { baseApi } from '../baseApi';

export enum ExamType {
    MID_TERM = 'MID_TERM',
    FINAL = 'FINAL',
    UNIT_TEST = 'UNIT_TEST',
    QUIZ = 'QUIZ',
    PRACTICAL = 'PRACTICAL',
    ASSIGNMENT = 'ASSIGNMENT',
}

export enum ExamStatus {
    DRAFT = 'DRAFT',
    SCHEDULED = 'SCHEDULED',
    ONGOING = 'ONGOING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export interface Exam {
    id: string;
    title: string;
    subject?: string;
    date?: string;
    duration?: number;
    totalMarks?: number;
    status?: string;
    [key: string]: unknown;
}

export interface ExamSchedule {
    id: string;
    examId: string;
    classId?: string;
    date?: string;
    room?: string;
    [key: string]: unknown;
}

export interface Grade {
    id: string;
    name: string;
    minMarks: number;
    maxMarks: number;
    [key: string]: unknown;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}

export const examinationApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // ── Exams ──────────────────────────────────────────────────────────────
        getExams: builder.query<ApiResponse<Exam[]>, Record<string, unknown>>({
            query: (params) => ({
                // FIXED: was /school/examination/exams → now /school/exams
                url: '/school/exams',
                params,
            }),
            providesTags: ['Exams'],
        }),

        getExamById: builder.query<ApiResponse<Exam>, string>({
            // FIXED: was /school/examination/exams/:id → now /school/exams/:id
            query: (id) => `/school/exams/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Exams', id }],
        }),

        createExam: builder.mutation<ApiResponse<Exam>, Partial<Exam>>({
            query: (data) => ({
                // FIXED: was /school/examination/exams → now /school/exams
                url: '/school/exams',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Exams'],
        }),

        updateExam: builder.mutation<ApiResponse<Exam>, { id: string; data: Partial<Exam> }>({
            query: ({ id, data }) => ({
                // FIXED: was /school/examination/exams/:id → now /school/exams/:id
                url: `/school/exams/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['Exams'],
        }),

        updateExamStatus: builder.mutation<ApiResponse<Exam>, { id: string; status: string }>({
            query: ({ id, status }) => ({
                // FIXED: was /school/examination/exams/:id/status → now /school/exams/:id/status
                url: `/school/exams/${id}/status`,
                method: 'PATCH',
                body: { status },
            }),
            invalidatesTags: ['Exams'],
        }),

        deleteExam: builder.mutation<ApiResponse<void>, string>({
            query: (id) => ({
                // FIXED: was /school/examination/exams/:id → now /school/exams/:id
                url: `/school/exams/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Exams'],
        }),

        // ── Schedules ──────────────────────────────────────────────────────────
        getExamSchedules: builder.query<ApiResponse<ExamSchedule[]>, string>({
            // FIXED: was /school/examination/exams/:examId/schedules → now /school/exams/:examId/schedules
            query: (examId) => `/school/exams/${examId}/schedules`,
            providesTags: ['ExamSchedules'],
        }),

        getSchedulesByClass: builder.query<ApiResponse<ExamSchedule[]>, { classId: string; sessionId?: string }>({
            query: ({ classId, sessionId }) => ({
                // FIXED: was /school/examination/classes/:classId/schedules → now /school/exams/classes/:classId/schedules
                url: `/school/exams/classes/${classId}/schedules`,
                params: { sessionId },
            }),
            providesTags: ['ExamSchedules'],
        }),

        createSchedule: builder.mutation<ApiResponse<ExamSchedule>, Partial<ExamSchedule>>({
            query: (data) => ({
                // FIXED: was /school/examination/schedules → now /school/exams/schedules
                url: '/school/exams/schedules',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['ExamSchedules'],
        }),

        updateSchedule: builder.mutation<ApiResponse<ExamSchedule>, { id: string; data: Partial<ExamSchedule> }>({
            query: ({ id, data }) => ({
                // FIXED: was /school/examination/schedules/:id → now /school/exams/schedules/:id
                url: `/school/exams/schedules/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['ExamSchedules'],
        }),

        deleteSchedule: builder.mutation<ApiResponse<void>, string>({
            query: (id) => ({
                // FIXED: was /school/examination/schedules/:id → now /school/exams/schedules/:id
                url: `/school/exams/schedules/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['ExamSchedules'],
        }),

        // ── Marks ──────────────────────────────────────────────────────────────
        getMarks: builder.query<ApiResponse<unknown[]>, { examScheduleId: string; [key: string]: unknown }>({
            query: ({ examScheduleId, ...params }) => ({
                // FIXED: was /school/examination/schedules/:id/marks → now /school/exams/schedules/:id/marks
                url: `/school/exams/schedules/${examScheduleId}/marks`,
                params,
            }),
            providesTags: ['Marks'],
        }),

        enterMarks: builder.mutation<ApiResponse<unknown>, unknown>({
            query: (data) => ({
                // FIXED: was /school/examination/marks → now /school/exams/marks
                url: '/school/exams/marks',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Marks'],
        }),

        getStudentMarks: builder.query<ApiResponse<unknown[]>, { studentId: string; sessionId?: string }>({
            query: ({ studentId, sessionId }) => ({
                // FIXED: was /school/examination/students/:id/marks → now /school/exams/students/:id/marks
                url: `/school/exams/students/${studentId}/marks`,
                params: { sessionId },
            }),
            providesTags: ['Marks'],
        }),

        // ── Grades ─────────────────────────────────────────────────────────────
        getGrades: builder.query<ApiResponse<Grade[]>, void>({
            // FIXED: was /school/examination/grades → now /school/exams/grades
            query: () => '/school/exams/grades',
            providesTags: ['Grades'],
        }),

        createGrade: builder.mutation<ApiResponse<Grade>, Partial<Grade>>({
            query: (data) => ({
                // FIXED: was /school/examination/grades → now /school/exams/grades
                url: '/school/exams/grades',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Grades'],
        }),

        // ── Stats ──────────────────────────────────────────────────────────────
        getExamStats: builder.query<ApiResponse<unknown>, Record<string, unknown>>({
            query: (params) => ({
                // FIXED: was /school/examination/stats → now /school/exams/stats
                url: '/school/exams/stats',
                params,
            }),
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetExamsQuery,
    useGetExamByIdQuery,
    useCreateExamMutation,
    useUpdateExamMutation,
    useUpdateExamStatusMutation,
    useDeleteExamMutation,
    useGetExamSchedulesQuery,
    useGetSchedulesByClassQuery,
    useCreateScheduleMutation,
    useUpdateScheduleMutation,
    useDeleteScheduleMutation,
    useGetMarksQuery,
    useEnterMarksMutation,
    useGetStudentMarksQuery,
    useGetGradesQuery,
    useCreateGradeMutation,
    useGetExamStatsQuery,
} = examinationApi;

export default examinationApi;
