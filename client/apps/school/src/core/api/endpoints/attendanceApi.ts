import { baseApi } from '../baseApi';
import type { ApiResponse, PaginatedResponse } from '../baseApi';
import { API_TAGS } from '../../config/constants';

// Attendance types
export interface AttendanceRecord {
    id: string;
    studentId: string;
    classId: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    remarks?: string;
    markedBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface AttendanceQueryParams {
    page?: number;
    limit?: number;
    classId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
}

export interface MarkAttendanceData {
    classId: string;
    date: string;
    records: {
        studentId: string;
        status: 'present' | 'absent' | 'late' | 'excused';
        remarks?: string;
    }[];
}

export interface AttendanceSummary {
    totalDays: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
}

export interface ClassAttendanceSummary {
    classId: string;
    totalDays: number;
    totalStudents: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
}

// Attendance API endpoints
export const attendanceApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Get attendance records
        getAttendance: builder.query<PaginatedResponse<AttendanceRecord>, AttendanceQueryParams>({
            query: (params) => ({
                url: '/attendance',
                params,
            }),
            providesTags: [{ type: API_TAGS.ATTENDANCE, id: 'LIST' }],
        }),

        // Get class attendance for a date
        getClassAttendance: builder.query<ApiResponse<AttendanceRecord[]>, { classId: string; date: string }>({
            query: ({ classId, date }) => `/attendance/class/${classId}?date=${date}`,
            providesTags: [{ type: API_TAGS.ATTENDANCE, id: 'LIST' }],
        }),

        // Mark attendance (bulk)
        markAttendance: builder.mutation<ApiResponse<AttendanceRecord[]>, MarkAttendanceData>({
            query: (data) => ({
                url: '/attendance/mark',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [{ type: API_TAGS.ATTENDANCE, id: 'LIST' }],
        }),

        // Update single attendance record
        updateAttendance: builder.mutation<ApiResponse<AttendanceRecord>, { id: string; data: Partial<AttendanceRecord> }>({
            query: ({ id, data }) => ({
                url: `/attendance/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [
                { type: API_TAGS.ATTENDANCE, id },
                { type: API_TAGS.ATTENDANCE, id: 'LIST' },
            ],
        }),

        // Get student attendance summary
        getStudentAttendanceSummary: builder.query<ApiResponse<AttendanceSummary>, { studentId: string; startDate?: string; endDate?: string }>({
            query: ({ studentId, ...params }) => ({
                url: `/attendance/student/${studentId}/summary`,
                params,
            }),
            providesTags: (result, error, { studentId }) => [{ type: API_TAGS.ATTENDANCE, id: studentId }],
        }),

        // Get class attendance summary
        getClassAttendanceSummary: builder.query<ApiResponse<ClassAttendanceSummary>, { classId: string; month?: string; year?: string }>({
            query: ({ classId, ...params }) => ({
                url: `/attendance/class/${classId}/summary`,
                params,
            }),
            providesTags: [{ type: API_TAGS.ATTENDANCE, id: 'LIST' }],
        }),
    }),
    overrideExisting: false,
});

// Export hooks
export const {
    useGetAttendanceQuery,
    useLazyGetAttendanceQuery,
    useGetClassAttendanceQuery,
    useLazyGetClassAttendanceQuery,
    useMarkAttendanceMutation,
    useUpdateAttendanceMutation,
    useGetStudentAttendanceSummaryQuery,
    useGetClassAttendanceSummaryQuery,
} = attendanceApi;
