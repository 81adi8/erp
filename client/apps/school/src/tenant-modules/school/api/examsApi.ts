// School Exams API
import { baseApi } from '../../../core/api/baseApi';
import { API_TAGS } from '../../../core/config/constants';

type ExamType = 'MID_TERM' | 'FINAL' | 'UNIT_TEST' | 'QUIZ' | 'PRACTICAL' | 'ASSIGNMENT';

interface RawExamRecord {
    id: string;
    name?: string;
    title?: string;
    start_date?: string;
    date?: string;
    status?: string;
    [key: string]: unknown;
}

interface NormalizedExamRecord extends RawExamRecord {
    title: string;
    date?: string;
}

interface CreateExamInput {
    title: string;
    subject?: string;
    date?: string;
    duration?: number;
    totalMarks?: number;
    code?: string;
    type?: ExamType;
    academicYearId?: string;
}

interface MarkEntryInput {
    student_id: string;
    marks_obtained?: number;
    is_absent?: boolean;
    remarks?: string;
}

function getSelectedAcademicYearId(): string | undefined {
    try {
        const raw = localStorage.getItem('erp_selected_academic_session');
        if (!raw) return undefined;
        const parsed = JSON.parse(raw) as { selectedSessionId?: string };
        return parsed.selectedSessionId;
    } catch {
        return undefined;
    }
}

function normalizeExamRecord(exam: RawExamRecord): NormalizedExamRecord {
    return {
        ...exam,
        title: typeof exam.title === 'string' && exam.title.length > 0
            ? exam.title
            : (typeof exam.name === 'string' ? exam.name : ''),
        date: typeof exam.date === 'string' ? exam.date : exam.start_date,
    };
}

export const examsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getExams: builder.query<{ data: NormalizedExamRecord[] }, Record<string, unknown>>({
            query: (params) => ({ url: '/school/exams', params }),
            transformResponse: (response: { data?: RawExamRecord[] }) => ({
                ...response,
                data: (response.data || []).map(normalizeExamRecord),
            }),
            providesTags: [API_TAGS.EXAMS],
        }),
        getExamById: builder.query<{ data: NormalizedExamRecord }, string>({
            query: (id) => `/school/exams/${id}`,
            transformResponse: (response: { data: RawExamRecord }) => ({
                ...response,
                data: normalizeExamRecord(response.data),
            }),
            providesTags: [API_TAGS.EXAMS],
        }),
        createExam: builder.mutation<{ data: NormalizedExamRecord }, CreateExamInput>({
            query: (body) => {
                const academicYearId = body.academicYearId || getSelectedAcademicYearId();

                return {
                    url: '/school/exams',
                    method: 'POST',
                    body: {
                        name: body.title,
                        code: body.code,
                        type: body.type || 'UNIT_TEST',
                        academic_year_id: academicYearId,
                        start_date: body.date,
                        end_date: body.date,
                    },
                };
            },
            transformResponse: (response: { data: RawExamRecord }) => ({
                ...response,
                data: normalizeExamRecord(response.data),
            }),
            invalidatesTags: [API_TAGS.EXAMS],
        }),
        updateExam: builder.mutation<{ data: NormalizedExamRecord }, { id: string; [key: string]: unknown }>({
            query: ({ id, ...body }) => ({ url: `/school/exams/${id}`, method: 'PUT', body }),
            transformResponse: (response: { data: RawExamRecord }) => ({
                ...response,
                data: normalizeExamRecord(response.data),
            }),
            invalidatesTags: [API_TAGS.EXAMS],
        }),
        deleteExam: builder.mutation<{ data: unknown }, string>({
            query: (id) => ({ url: `/school/exams/${id}`, method: 'DELETE' }),
            invalidatesTags: [API_TAGS.EXAMS],
        }),
        getExamMarks: builder.query<{ data: unknown[] }, { examScheduleId: string }>({
            query: ({ examScheduleId }) => `/school/exams/schedules/${examScheduleId}/marks`,
            providesTags: [API_TAGS.MARKS],
        }),
        saveExamMarks: builder.mutation<
            { data: unknown },
            { examScheduleId: string; marks: MarkEntryInput[] }
        >({
            query: ({ examScheduleId, marks }) => ({
                url: '/school/exams/marks',
                method: 'POST',
                body: {
                    exam_schedule_id: examScheduleId,
                    marks,
                },
            }),
            invalidatesTags: [API_TAGS.MARKS],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetExamsQuery,
    useGetExamByIdQuery,
    useCreateExamMutation,
    useUpdateExamMutation,
    useDeleteExamMutation,
    useGetExamMarksQuery,
    useSaveExamMarksMutation,
} = examsApi;
