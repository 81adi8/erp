/**
 * Plans API Endpoints
 * Subscription plan management endpoints
 */

import { api } from '../api';
import { createEndpoint } from '../../utils/api-utils';
import type {
    Plan,
    ApiResponse,
} from '../types';

// Inject plan endpoints into the api
export const planApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // Get all plans
        getPlans: builder.query<{ success: boolean; data: Plan[] }, void>({
            query: () => createEndpoint('/plans'),
            providesTags: (result) =>
                result?.data
                    ? [
                        ...result.data.map(({ id }) => ({ type: 'Plan' as const, id })),
                        { type: 'Plan', id: 'LIST' },
                    ]
                    : [{ type: 'Plan', id: 'LIST' }],
        }),

        // Get single plan
        getPlan: builder.query<ApiResponse<Plan>, string>({
            query: (id) => createEndpoint(`/plans/${id}`),
            providesTags: (_result, _error, id) => [{ type: 'Plan', id }],
        }),

        // Create plan
        createPlan: builder.mutation<ApiResponse<Plan>, Partial<Plan> & { module_ids?: string[], permission_ids?: string[] }>({
            query: (body) => ({
                url: createEndpoint('/plans'),
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'Plan', id: 'LIST' }],
        }),

        // Update plan
        updatePlan: builder.mutation<ApiResponse<Plan>, { id: string; data: Partial<Plan> & { module_ids?: string[], permission_ids?: string[] } }>({
            query: ({ id, data }) => ({
                url: createEndpoint(`/plans/${id}`),
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Plan', id },
                { type: 'Plan', id: 'LIST' },
            ],
        }),

        // Delete plan
        deletePlan: builder.mutation<ApiResponse, string>({
            query: (id) => ({
                url: createEndpoint(`/plans/${id}`),
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'Plan', id: 'LIST' }],
        }),
    }),
    overrideExisting: false,
});

// Export hooks
export const {
    useGetPlansQuery,
    useGetPlanQuery,
    useCreatePlanMutation,
    useUpdatePlanMutation,
    useDeletePlanMutation,
} = planApi;
