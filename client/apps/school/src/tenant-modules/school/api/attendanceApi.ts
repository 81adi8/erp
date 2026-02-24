// School Attendance API
// FIXED: Aligned all endpoint paths with backend attendance.routes.ts
//   Backend mounts at /school/attendance/* (via school/routes/index.ts)
//   Backend routes:
//     GET  /students/daily          → getDailyAttendance
//     POST /students/bulk-mark      → bulkMarkAttendance
//     GET  /students/:studentId/summary → getStudentSummary
//   Frontend was calling /daily, /bulk, /summary — all 404.
import { baseApi } from '../../../core/api/baseApi';
import { API_TAGS } from '../../../core/config/constants';

export interface SectionOption {
    id: string;
    name: string;
    grade?: string;
    classRoom?: string;
}

export const attendanceApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Fetch sections for the dropdown — teacher sees only their assigned sections
        getSections: builder.query<{ data: SectionOption[] }, void>({
            query: () => ({ url: '/school/academics/sections' }),
            providesTags: ['Sections'],
        }),

        // GET /school/attendance/students/daily?date=&sectionId=
        getDailyAttendance: builder.query<{ data: unknown[] }, { date: string; sectionId?: string }>({
            query: (params) => ({ url: '/school/attendance/students/daily', params }),
            providesTags: [API_TAGS.ATTENDANCE],
        }),

        // POST /school/attendance/students/bulk-mark
        bulkMarkStudentAttendance: builder.mutation<{ data: unknown }, {
            records: Array<{ studentId: string; date: string; status: string; sectionId?: string }>;
            date: string;
            sectionId?: string;
        }>({
            query: (body) => ({ url: '/school/attendance/students/bulk-mark', method: 'POST', body }),
            invalidatesTags: [API_TAGS.ATTENDANCE],
        }),

        // GET /school/attendance/students/:studentId/summary?from=&to=
        getAttendanceSummary: builder.query<{ data: unknown }, { studentId: string; from?: string; to?: string }>({
            query: ({ studentId, ...params }) => ({
                url: `/school/attendance/students/${studentId}/summary`,
                params,
            }),
            providesTags: [API_TAGS.ATTENDANCE],
        }),

        // GET /school/attendance/dashboard/stats
        getAttendanceDashboardStats: builder.query<
            { data: unknown },
            { date?: string; academicYearId?: string } | void
        >({
            query: (params) => ({ url: '/school/attendance/dashboard/stats', params }),
            providesTags: [API_TAGS.ATTENDANCE],
        }),

        // GET /school/attendance/dashboard/recent-activity
        getAttendanceRecentActivity: builder.query<{ data: unknown[] }, { limit?: number }>({
            query: (params) => ({ url: '/school/attendance/dashboard/activity', params }),
            providesTags: [API_TAGS.ATTENDANCE],
        }),

        // GET /school/attendance/dashboard/class-summary
        getAttendanceClassSummary: builder.query<{ data: unknown[] }, void>({
            query: () => ({ url: '/school/attendance/dashboard/class-summary' }),
            providesTags: [API_TAGS.ATTENDANCE],
        }),

        // POST /school/attendance/lock
        lockAttendance: builder.mutation<{ data: unknown }, { date: string; sectionId: string }>({
            query: (body) => ({ url: '/school/attendance/students/lock', method: 'POST', body }),
            invalidatesTags: [API_TAGS.ATTENDANCE],
        }),

        // GET /school/attendance/dashboard/history
        getAttendanceHistory: builder.query<{
            data: unknown[];
        }, {
            from?: string;
            to?: string;
            startDate?: string;
            endDate?: string;
            sectionId?: string;
            classId?: string;
            academicYearId?: string;
        } | void>({
            query: (params) => {
                const normalizedParams = !params
                    ? undefined
                    : {
                        ...params,
                        startDate: params.startDate || params.from,
                        endDate: params.endDate || params.to,
                    };

                return { url: '/school/attendance/dashboard/history', params: normalizedParams };
            },
            providesTags: [API_TAGS.ATTENDANCE],
        }),

        // GET /school/attendance/students/monthly-summary
        getMonthlyAttendanceSummary: builder.query<{
            data: unknown[];
        }, {
            classId: string;
            sectionId: string;
            academicYearId?: string;
            month?: string;
            year?: string;
            studentId?: string;
        }>({
            query: (params) => ({ url: '/school/attendance/students/monthly-summary', params }),
            providesTags: [API_TAGS.ATTENDANCE],
        }),

        // GET /school/attendance/settings
        getAttendanceSettings: builder.query<{ data: unknown }, void>({
            query: () => ({ url: '/school/attendance/settings' }),
            providesTags: [API_TAGS.ATTENDANCE],
        }),

        // POST /school/attendance/settings
        saveAttendanceSettings: builder.mutation<{ data: unknown }, unknown>({
            query: (body) => ({ url: '/school/attendance/settings', method: 'POST', body }),
            invalidatesTags: [API_TAGS.ATTENDANCE],
        }),

        // GET /school/attendance/leaves
        getLeaves: builder.query<{ data: unknown[] }, { status?: string; studentId?: string }>({
            query: (params) => ({ url: '/school/attendance/leaves', params }),
            providesTags: [API_TAGS.ATTENDANCE],
        }),

        // POST /school/attendance/leaves/:id/approve
        approveLeave: builder.mutation<{ data: unknown }, { id: string; notes?: string }>({
            query: ({ id, ...body }) => ({ url: `/school/attendance/leaves/${id}/approve`, method: 'POST', body }),
            invalidatesTags: [API_TAGS.ATTENDANCE],
        }),

        // POST /school/attendance/leaves/:id/reject
        rejectLeave: builder.mutation<{ data: unknown }, { id: string; reason: string }>({
            query: ({ id, ...body }) => ({ url: `/school/attendance/leaves/${id}/reject`, method: 'POST', body }),
            invalidatesTags: [API_TAGS.ATTENDANCE],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetSectionsQuery,
    useGetDailyAttendanceQuery,
    useBulkMarkStudentAttendanceMutation,
    useGetAttendanceSummaryQuery,
    useGetAttendanceDashboardStatsQuery,
    useGetAttendanceRecentActivityQuery,
    useGetAttendanceClassSummaryQuery,
    useLockAttendanceMutation,
    useGetAttendanceHistoryQuery,
    useGetMonthlyAttendanceSummaryQuery,
    useGetAttendanceSettingsQuery,
    useSaveAttendanceSettingsMutation,
    useGetLeavesQuery,
    useApproveLeaveMutation,
    useRejectLeaveMutation,
} = attendanceApi;
