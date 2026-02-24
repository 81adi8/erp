import { baseApi } from '../baseApi';
import type { ApiResponse, PaginatedResponse } from '../baseApi';
import { API_TAGS } from '../../config/constants';
import type { User } from './authApi';

// User query params
export interface UserQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    userType?: 'admin' | 'teacher' | 'student' | 'staff' | 'parent';
    role?: string;
    role_type?: string;
    status?: 'all' | 'active' | 'inactive';
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface CreateUserData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
    phone?: string;
    avatar?: string;
}

export interface UpdateUserData {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatar?: string;
    status?: 'active' | 'inactive' | 'suspended';
}

const USER_CREATE_ENDPOINT_BY_ROLE: Record<string, string> = {
    teacher: '/school/users/teachers',
    student: '/school/users/students',
    staff: '/school/users/staff',
    parent: '/school/users/parents',
};

// Users API endpoints
export const usersApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Get all users with pagination
        getUsers: builder.query<PaginatedResponse<User>, UserQueryParams>({
            query: (params) => {
                const queryParams: Record<string, string | number> = {};
                if (params.page) queryParams.page = params.page;
                if (params.limit) queryParams.limit = params.limit;
                if (params.search?.trim()) queryParams.search = params.search.trim();
                if (params.userType) queryParams.userType = params.userType;
                if (params.role) queryParams.role = params.role;
                if (params.role_type) queryParams.role_type = params.role_type;
                if (params.status) queryParams.status = params.status;
                else if (params.isActive !== undefined) queryParams.isActive = String(params.isActive);

                return {
                    url: '/school/users',
                    params: queryParams,
                };
            },
            providesTags: (result) =>
                result
                    ? [
                        ...result.data.map(({ id }) => ({ type: API_TAGS.USERS as const, id })),
                        { type: API_TAGS.USERS, id: 'LIST' },
                    ]
                    : [{ type: API_TAGS.USERS, id: 'LIST' }],
        }),

        // Get single user
        getUserById: builder.query<ApiResponse<User>, string>({
            query: (id) => `/school/users/${id}`,
            providesTags: (result, error, id) => [{ type: API_TAGS.USERS, id }],
        }),

        // Create user
        createUser: builder.mutation<ApiResponse<User>, CreateUserData>({
            query: (data) => ({
                url: USER_CREATE_ENDPOINT_BY_ROLE[data.role?.toLowerCase()] || '/school/users/teachers',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [{ type: API_TAGS.USERS, id: 'LIST' }],
        }),

        // Update user
        updateUser: builder.mutation<ApiResponse<User>, { id: string; data: UpdateUserData }>({
            query: ({ id, data }) => ({
                url: `/school/teachers/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [
                { type: API_TAGS.USERS, id },
                { type: API_TAGS.USERS, id: 'LIST' },
            ],
        }),

        // Delete user
        deleteUser: builder.mutation<ApiResponse<null>, string>({
            query: (id) => ({
                url: `/school/users/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: API_TAGS.USERS, id: 'LIST' }],
        }),

        // Bulk delete users
        bulkDeleteUsers: builder.mutation<ApiResponse<null>, string[]>({
            query: (ids) => ({
                url: '/school/users/bulk-delete',
                method: 'POST',
                body: { ids },
            }),
            invalidatesTags: [{ type: API_TAGS.USERS, id: 'LIST' }],
        }),
    }),
    overrideExisting: false,
});

// Export hooks
export const {
    useGetUsersQuery,
    useLazyGetUsersQuery,
    useGetUserByIdQuery,
    useLazyGetUserByIdQuery,
    useCreateUserMutation,
    useUpdateUserMutation,
    useDeleteUserMutation,
    useBulkDeleteUsersMutation,
} = usersApi;
