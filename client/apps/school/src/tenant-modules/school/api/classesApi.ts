// School Module API Services - Classes
import { baseApi } from '../../../core/api/baseApi';

interface Class {
    id: string;
    name: string;
    section: string;
    grade: number;
    capacity: number;
    currentStrength: number;
    classTeacherId?: string;
    classTeacher?: { firstName: string; lastName: string };
    status: 'active' | 'inactive';
    createdAt: string;
}

export const classesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getClasses: builder.query<{ data: Class[] }, { status?: string }>({
            query: (params) => ({ url: '/school/academics/classes', params }),
            providesTags: ['Classes'],
            keepUnusedDataFor: 300,
        }),
        getClass: builder.query<{ data: Class }, string>({
            query: (id) => `/school/academics/classes/${id}`,
            providesTags: (result, error, id) => [{ type: 'Classes', id }],
        }),
        createClass: builder.mutation<{ data: Class }, Partial<Class>>({
            query: (data) => ({ url: '/school/academics/classes', method: 'POST', body: data }),
            invalidatesTags: ['Classes'],
        }),
        updateClass: builder.mutation<{ data: Class }, { id: string; data: Partial<Class> }>({
            query: ({ id, data }) => ({ url: `/school/academics/classes/${id}`, method: 'PUT', body: data }),
            invalidatesTags: ['Classes'],
        }),
        deleteClass: builder.mutation<void, string>({
            query: (id) => ({ url: `/school/academics/classes/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Classes'],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetClassesQuery,
    useGetClassQuery,
    useCreateClassMutation,
    useUpdateClassMutation,
    useDeleteClassMutation,
} = classesApi;
