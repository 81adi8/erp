/**
 * Role Templates API Endpoints
 * Manage role templates - define default roles with permissions for tenant provisioning
 */

import { api } from '../api';
import { createEndpoint } from '../../utils/api-utils';
import type { ApiResponse, Permission, Plan } from '../types';

// Role Template type
export interface RoleTemplate {
    id: string;
    name: string;
    slug: string;
    description?: string;
    role_type?: string;
    tenant_type: string; // 'school', 'university', 'coaching', 'all'
    // Asset type for two-tier caching: 'public' (template), 'readonly' (system), 'custom' (tenant)
    asset_type?: string;
    plan_id?: string;
    plan?: Pick<Plan, 'id' | 'name' | 'slug'>;
    // Reference to original role when cloned
    source_role_id?: string;
    is_system: boolean;
    is_active: boolean;
    sort_order: number;
    permission_ids: string[];
    permissions?: Permission[];
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface CreateRoleTemplateRequest {
    name: string;
    slug: string;
    description?: string;
    role_type?: string;
    tenant_type?: string;
    asset_type?: string;
    plan_id?: string;
    source_role_id?: string;
    is_system?: boolean;
    is_active?: boolean;
    sort_order?: number;
    permission_ids?: string[];
    metadata?: Record<string, unknown>;
}

export interface UpdateRoleTemplateRequest {
    name?: string;
    slug?: string;
    description?: string;
    role_type?: string;
    tenant_type?: string;
    asset_type?: string;
    plan_id?: string | null;
    source_role_id?: string | null;
    is_active?: boolean;
    sort_order?: number;
    permission_ids?: string[];
    metadata?: Record<string, unknown>;
}

// Inject role template endpoints into the api
export const roleTemplateApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // Get all role templates (supports filtering via query params)
        getRoleTemplates: builder.query<{ success: boolean; data: RoleTemplate[] }, { tenant_type?: string; plan_id?: string; is_active?: boolean } | void>({
            query: (params) => {
                let url = '/role-templates';
                if (params?.tenant_type || params?.plan_id || params?.is_active !== undefined) {
                    const queryParams = new URLSearchParams();
                    if (params.tenant_type) queryParams.append('tenant_type', params.tenant_type);
                    if (params.plan_id) queryParams.append('plan_id', params.plan_id);
                    if (params.is_active !== undefined) queryParams.append('is_active', String(params.is_active));
                    url += `?${queryParams.toString()}`;
                }
                return createEndpoint(url);
            },
            providesTags: (result) =>
                result?.data
                    ? [
                        ...result.data.map(({ id }) => ({ type: 'RoleTemplate' as const, id })),
                        { type: 'RoleTemplate', id: 'LIST' },
                    ]
                    : [{ type: 'RoleTemplate', id: 'LIST' }],
        }),

        // Get single role template
        getRoleTemplate: builder.query<ApiResponse<RoleTemplate>, string>({
            query: (id) => createEndpoint(`/role-templates/${id}`),
            providesTags: (_result, _error, id) => [{ type: 'RoleTemplate', id }],
        }),

        // Create role template
        createRoleTemplate: builder.mutation<ApiResponse<RoleTemplate>, CreateRoleTemplateRequest>({
            query: (body) => ({
                url: createEndpoint('/role-templates'),
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'RoleTemplate', id: 'LIST' }],
        }),

        // Update role template
        updateRoleTemplate: builder.mutation<ApiResponse<RoleTemplate>, { id: string; data: UpdateRoleTemplateRequest }>({
            query: ({ id, data }) => ({
                url: createEndpoint(`/role-templates/${id}`),
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'RoleTemplate', id },
                { type: 'RoleTemplate', id: 'LIST' },
            ],
        }),

        // Delete role template
        deleteRoleTemplate: builder.mutation<ApiResponse, string>({
            query: (id) => ({
                url: createEndpoint(`/role-templates/${id}`),
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'RoleTemplate', id: 'LIST' }],
        }),

        // Duplicate role template
        duplicateRoleTemplate: builder.mutation<ApiResponse<RoleTemplate>, { id: string; newSlug: string }>({
            query: ({ id, newSlug }) => ({
                url: createEndpoint(`/role-templates/${id}/duplicate`),
                method: 'POST',
                body: { newSlug },
            }),
            invalidatesTags: [{ type: 'RoleTemplate', id: 'LIST' }],
        }),
    }),
    overrideExisting: false,
});

// Export hooks
export const {
    useGetRoleTemplatesQuery,
    useGetRoleTemplateQuery,
    useCreateRoleTemplateMutation,
    useUpdateRoleTemplateMutation,
    useDeleteRoleTemplateMutation,
    useDuplicateRoleTemplateMutation,
} = roleTemplateApi;
