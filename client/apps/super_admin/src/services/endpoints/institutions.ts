/**
 * Institution API Endpoints
 * Tenant/Institution management endpoints
 */

import { api } from '../api';
import { createEndpoint } from '../../utils/api-utils';
import type { 
    Institution, 
    CreateInstitutionRequest,
    ApiResponse,
} from '../types';

// Query params for institutions list
interface GetInstitutionsParams {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
}

// Inject institution endpoints into the api
export const institutionApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // Get all institutions
        getInstitutions: builder.query<
            { success: boolean; data: Institution[]; total: number }, 
            GetInstitutionsParams
        >({
            query: ({ page = 1, limit = 20, status, search }) => {
                const params = new URLSearchParams({
                    page: String(page),
                    limit: String(limit),
                });
                if (status) params.append('status', status);
                if (search) params.append('search', search);
                
                return createEndpoint(`/institutions?${params.toString()}`);
            },
            providesTags: (result) => 
                result?.data
                    ? [
                        ...result.data.map(({ id }) => ({ type: 'Institution' as const, id })),
                        { type: 'Institution', id: 'LIST' },
                    ]
                    : [{ type: 'Institution', id: 'LIST' }],
        }),

        // Get single institution
        getInstitution: builder.query<ApiResponse<Institution>, string>({
            query: (id) => createEndpoint(`/institutions/${id}`),
            providesTags: (_result, _error, id) => [{ type: 'Institution', id }],
        }),

        // Create institution
        createInstitution: builder.mutation<
            { success: boolean; data: Institution; message: string }, 
            CreateInstitutionRequest
        >({
            query: (body) => ({
                url: createEndpoint('/institutions'),
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Institution', id: 'LIST' }],
        }),

        // Update institution
        updateInstitution: builder.mutation<
            ApiResponse<Institution>, 
            { id: string; data: Partial<CreateInstitutionRequest> }
        >({
            query: ({ id, data }) => ({
                url: createEndpoint(`/institutions/${id}`),
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Institution', id },
                { type: 'Institution', id: 'LIST' },
            ],
        }),

        // Delete institution
        deleteInstitution: builder.mutation<ApiResponse, string>({
            query: (id) => ({
                url: createEndpoint(`/institutions/${id}`),
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'Institution', id: 'LIST' }],
        }),

        // Activate/Deactivate institution
        updateInstitutionStatus: builder.mutation<
            ApiResponse<Institution>,
            { id: string; status: Institution['status'] }
        >({
            query: ({ id, status }) => ({
                url: createEndpoint(`/institutions/${id}/status`),
                method: 'PATCH',
                body: { status },
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Institution', id },
                { type: 'Institution', id: 'LIST' },
            ],
        }),
    }),
    overrideExisting: false,
});

// Export hooks
export const {
    useGetInstitutionsQuery,
    useGetInstitutionQuery,
    useCreateInstitutionMutation,
    useUpdateInstitutionMutation,
    useDeleteInstitutionMutation,
    useUpdateInstitutionStatusMutation,
} = institutionApi;
