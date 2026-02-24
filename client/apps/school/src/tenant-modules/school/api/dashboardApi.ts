// School Dashboard API — real stats from backend
import { baseApi } from '../../../core/api/baseApi';
import { API_TAGS } from '../../../core/config/constants';

export interface DashboardStats {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    attendanceRate: number | null;
    studentsChange?: string;
    teachersChange?: string;
    recentActivity: Array<{
        icon?: string;
        title: string;
        subtitle?: string;
        color?: string;
    }>;
}

export const dashboardApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getDashboardStats: builder.query<{ data: DashboardStats }, { date?: string }>({
            query: (params) => ({ url: '/school/dashboard/stats', params }),
            providesTags: [API_TAGS.STUDENTS, API_TAGS.ATTENDANCE],
        }),
    }),
    overrideExisting: false,
});

export const { useGetDashboardStatsQuery } = dashboardApi;
