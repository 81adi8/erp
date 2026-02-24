/**
 * Admin API Endpoints
 * Admin user management endpoints
 */

import { api } from '../api';
import { createEndpoint } from '../../utils/api-utils';
import type { AdminUser, ApiResponse } from '../types';

interface CreateAdminRequest {
    email: string;
    name: string;
    password: string;
    permissions?: Record<string, boolean>;
}

interface GetAdminsParams {
    page?: number;
    limit?: number;
}

// Inject admin endpoints into the api
export const adminApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // Get all admins
        getAdmins: builder.query<
            { success: boolean; data: AdminUser[]; total: number }, 
            GetAdminsParams
        >({
            query: ({ page = 1, limit = 20 }) => 
                createEndpoint(`/admins?page=${page}&limit=${limit}`),
            providesTags: (result) =>
                result?.data
                    ? [
                        ...result.data.map(({ id }) => ({ type: 'Admin' as const, id })),
                        { type: 'Admin', id: 'LIST' },
                    ]
                    : [{ type: 'Admin', id: 'LIST' }],
        }),

        // Get single admin
        getAdmin: builder.query<ApiResponse<AdminUser>, string>({
            query: (id) => createEndpoint(`/admins/${id}`),
            providesTags: (_result, _error, id) => [{ type: 'Admin', id }],
        }),

        // Create admin
        createAdmin: builder.mutation<ApiResponse<AdminUser>, CreateAdminRequest>({
            query: (body) => ({
                url: createEndpoint('/admins'),
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Admin', id: 'LIST' }],
        }),

        // Update admin
        updateAdmin: builder.mutation<
            ApiResponse<AdminUser>, 
            { id: string; data: Partial<CreateAdminRequest> }
        >({
            query: ({ id, data }) => ({
                url: createEndpoint(`/admins/${id}`),
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Admin', id },
                { type: 'Admin', id: 'LIST' },
            ],
        }),

        // Delete admin
        deleteAdmin: builder.mutation<ApiResponse, string>({
            query: (id) => ({
                url: createEndpoint(`/admins/${id}`),
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'Admin', id: 'LIST' }],
        }),
    }),
    overrideExisting: false,
});

// Export hooks
export const {
    useGetAdminsQuery,
    useGetAdminQuery,
    useCreateAdminMutation,
    useUpdateAdminMutation,
    useDeleteAdminMutation,
} = adminApi;
