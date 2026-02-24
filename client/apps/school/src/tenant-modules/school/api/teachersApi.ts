// School Module API Services - Teachers
import { baseApi } from '../../../core/api/baseApi';
import { API_TAGS } from '../../../core/config/constants';

interface Teacher {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string;
    phone?: string;
    specialization?: string;
    qualifications?: string;
    joiningDate?: string;
    status: 'active' | 'inactive' | 'on_leave';
    createdAt: string;
    updatedAt: string;
}

interface QueryParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
}

interface PaginatedResponse<T> {
    data: T[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export const teachersApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getTeachers: builder.query<PaginatedResponse<Teacher>, QueryParams>({
            query: (params) => ({ url: '/school/teachers', params }),
            providesTags: (result) =>
                result
                    ? [...result.data.map(({ id }) => ({ type: API_TAGS.TEACHERS, id } as const)), { type: API_TAGS.TEACHERS, id: 'LIST' }]
                    : [{ type: API_TAGS.TEACHERS, id: 'LIST' }],
            keepUnusedDataFor: 300,
        }),
        getTeacher: builder.query<{ data: Teacher }, string>({
            query: (id) => `/school/users/${id}`,
            providesTags: (result, error, id) => [{ type: API_TAGS.TEACHERS, id }],
        }),
        createTeacher: builder.mutation<{ data: Teacher }, Partial<Teacher>>({
            query: (data) => ({ url: '/school/teachers', method: 'POST', body: data }),
            invalidatesTags: [{ type: API_TAGS.TEACHERS, id: 'LIST' }],
        }),
        updateTeacher: builder.mutation<{ data: Teacher }, { id: string; data: Partial<Teacher> }>({
            query: ({ id, data }) => ({ url: `/school/teachers/${id}`, method: 'PUT', body: data }),
            invalidatesTags: (result, error, { id }) => [{ type: API_TAGS.TEACHERS, id }, { type: API_TAGS.TEACHERS, id: 'LIST' }],
        }),
        deleteTeacher: builder.mutation<void, string>({
            query: (id) => ({ url: `/school/teachers/${id}`, method: 'DELETE' }),
            invalidatesTags: (result, error, id) => [{ type: API_TAGS.TEACHERS, id }, { type: API_TAGS.TEACHERS, id: 'LIST' }],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetTeachersQuery,
    useGetTeacherQuery,
    useCreateTeacherMutation,
    useUpdateTeacherMutation,
    useDeleteTeacherMutation,
} = teachersApi;
