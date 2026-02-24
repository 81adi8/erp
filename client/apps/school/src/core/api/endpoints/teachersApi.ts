import { baseApi } from '../baseApi';
import type { ApiResponse, PaginatedResponse } from '../baseApi';

type JsonObject = Record<string, unknown>;

interface TeacherClassAssignment {
    id: string;
    classId?: string;
    sectionId?: string;
    subjectId?: string;
    className?: string;
    sectionName?: string;
    subjectName?: string;
}

interface TeacherSchedule {
    day: string;
    slots: Array<{
        startTime: string;
        endTime: string;
        className?: string;
        sectionName?: string;
        subjectName?: string;
        roomNumber?: string;
    }>;
}

// Teacher types
export interface Teacher {
    id: string;
    userId: string;
    employee_id: string;
    qualification?: string;
    designation?: string;
    specialization?: string;
    experience_years?: number;
    date_of_joining?: string;
    phone?: string;
    email?: string;
    address?: string;
    is_active: boolean;
    biography?: string;
    skills?: string[];
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    documents?: JsonObject;
    metadata?: JsonObject;
    user?: {
        first_name: string;
        last_name: string;
        email: string;
        phone?: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface TeacherQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface CreateTeacherData {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    employeeId?: string;
    qualification?: string;
    designation?: string;
    specialization?: string;
    experienceYears?: number;
    dateOfJoining?: string;
    biography?: string;
    skills?: string[];
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    address?: string;
    metadata?: JsonObject;
    documents?: JsonObject;
}

export interface UpdateTeacherData extends Partial<CreateTeacherData> {
    is_active?: boolean;
}

export interface AssignSubjectData {
    subjectId: string;
    classId: string;
    sectionId?: string;
}

// Teachers API endpoints
export const teachersApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Get all teachers with pagination
        getTeachers: builder.query<PaginatedResponse<Teacher>, TeacherQueryParams>({
            query: (params) => ({
                url: '/school/teachers',
                params,
            }),
            providesTags: (result) =>
                result
                    ? [
                        ...result.data.map(({ id }) => ({ type: 'Teachers' as const, id })),
                        { type: 'Teachers' as const, id: 'LIST' },
                    ]
                    : [{ type: 'Teachers' as const, id: 'LIST' }],
        }),

        // Get single teacher
        getTeacherById: builder.query<ApiResponse<Teacher>, string>({
            query: (id) => `/school/users/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Teachers' as const, id }],
        }),

        // Create teacher
        createTeacher: builder.mutation<ApiResponse<Teacher>, CreateTeacherData>({
            query: (data) => ({
                url: '/school/teachers',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [{ type: 'Teachers' as const, id: 'LIST' }],
        }),

        // Update teacher
        updateTeacher: builder.mutation<ApiResponse<Teacher>, { id: string; data: UpdateTeacherData }>({
            query: ({ id, data }) => ({
                url: `/school/teachers/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Teachers' as const, id },
                { type: 'Teachers' as const, id: 'LIST' },
            ],
        }),

        // Delete teacher
        deleteTeacher: builder.mutation<ApiResponse<null>, string>({
            query: (id) => ({
                url: `/school/teachers/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'Teachers' as const, id: 'LIST' }],
        }),

        // Assign subject to teacher
        assignSubject: builder.mutation<ApiResponse<null>, { id: string; data: AssignSubjectData }>({
            query: ({ id, data }) => ({
                url: `/school/teachers/${id}/assign-subject`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [{ type: 'Teachers' as const, id }],
        }),

        // Get teacher's assigned classes
        getTeacherClasses: builder.query<ApiResponse<TeacherClassAssignment[]>, string>({
            query: (id) => `/school/teachers/${id}/classes`,
            providesTags: (_result, _error, id) => [{ type: 'Teachers' as const, id }],
        }),

        // Get teacher's schedule
        getTeacherSchedule: builder.query<ApiResponse<TeacherSchedule[]>, string>({
            query: (id) => `/school/teachers/${id}/schedule`,
            providesTags: (_result, _error, id) => [
                { type: 'Teachers' as const, id },
                { type: 'Timetable' as const, id: 'LIST' },
            ],
        }),
    }),
    overrideExisting: false,
});

// Export hooks
export const {
    useGetTeachersQuery,
    useLazyGetTeachersQuery,
    useGetTeacherByIdQuery,
    useLazyGetTeacherByIdQuery,
    useCreateTeacherMutation,
    useUpdateTeacherMutation,
    useDeleteTeacherMutation,
    useAssignSubjectMutation,
    useGetTeacherClassesQuery,
    useGetTeacherScheduleQuery,
} = teachersApi;
