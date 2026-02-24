/**
 * Access Bundles API Endpoints
 * Manage access bundles - polymorphic collections of modules/permissions for Plans or Roles
 */

import { api } from '../api';
import { createEndpoint } from '../../utils/api-utils';
import type { ApiResponse, Module, Permission } from '../types';

// Module permission configuration
export interface ModulePermissionConfig {
    allPermissions: boolean;
    permissionIds: string[];
}

// Access Bundle type (polymorphic - can target Plan, Role, etc.)
export interface AccessBundle {
    id: string;
    name: string;
    description?: string;
    is_active: boolean;
    // UI metadata
    parent_title?: string;
    parent_slug?: string;
    parent_icon?: string;
    // Tenant type categorization (e.g., 'school', 'university', 'coaching', 'all')
    tenant_type?: string;
    // Asset type categorization ('public', 'readonly', 'custom')
    asset_type?: string;
    // Polymorphic association
    target_model?: string; // e.g., 'Plan', 'Role'
    target_id?: string;
    // Module/Permission data
    module_ids: string[];
    permission_ids: string[];
    module_permissions: Record<string, ModulePermissionConfig>;
    modules?: Module[];
    permissions?: Permission[];
    created_at: string;
    updated_at: string;
}

// Legacy alias for backwards compatibility
export type PlanModuleBundle = AccessBundle;

export interface CreateAccessBundleRequest {
    name: string;
    description?: string;
    is_active?: boolean;
    parent_title: string;
    parent_slug: string;
    parent_icon: string;
    tenant_type?: string;
    asset_type?: string;
    target_model?: string;
    target_id?: string;
    module_ids: string[];
    permission_ids?: string[];
    module_permissions?: Record<string, ModulePermissionConfig>;
}

export interface UpdateAccessBundleRequest {
    name?: string;
    description?: string;
    is_active?: boolean;
    parent_title?: string;
    parent_slug?: string;
    parent_icon?: string;
    tenant_type?: string;
    asset_type?: string;
    target_model?: string;
    target_id?: string;
    module_ids?: string[];
    permission_ids?: string[];
    module_permissions?: Record<string, ModulePermissionConfig>;
}

// Inject access bundle endpoints into the api
export const accessBundleApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // Get all access bundles (supports filtering via query params)
        getAccessBundles: builder.query<{ success: boolean; data: AccessBundle[] }, { target_model?: string; target_id?: string; tenant_type?: string; asset_type?: string } | void>({
            query: (params) => {
                let url = '/access-bundles';
                if (params?.target_model || params?.target_id || params?.tenant_type || params?.asset_type) {
                    const queryParams = new URLSearchParams();
                    if (params.target_model) queryParams.append('target_model', params.target_model);
                    if (params.target_id) queryParams.append('target_id', params.target_id);
                    if (params.tenant_type) queryParams.append('tenant_type', params.tenant_type);
                    if (params.asset_type) queryParams.append('asset_type', params.asset_type);
                    url += `?${queryParams.toString()}`;
                }
                return createEndpoint(url);
            },
            providesTags: (result) =>
                result?.data
                    ? [
                        ...result.data.map(({ id }) => ({ type: 'AccessBundle' as const, id })),
                        { type: 'AccessBundle', id: 'LIST' },
                    ]
                    : [{ type: 'AccessBundle', id: 'LIST' }],
        }),

        // Get single access bundle
        getAccessBundle: builder.query<ApiResponse<AccessBundle>, string>({
            query: (id) => createEndpoint(`/access-bundles/${id}`),
            providesTags: (_result, _error, id) => [{ type: 'AccessBundle', id }],
        }),

        // Create access bundle
        createAccessBundle: builder.mutation<ApiResponse<AccessBundle>, CreateAccessBundleRequest>({
            query: (body) => ({
                url: createEndpoint('/access-bundles'),
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: 'AccessBundle', id: 'LIST' }],
        }),

        // Update access bundle
        updateAccessBundle: builder.mutation<ApiResponse<AccessBundle>, { id: string; data: UpdateAccessBundleRequest }>({
            query: ({ id, data }) => ({
                url: createEndpoint(`/access-bundles/${id}`),
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'AccessBundle', id },
                { type: 'AccessBundle', id: 'LIST' },
            ],
        }),

        // Delete access bundle
        deleteAccessBundle: builder.mutation<ApiResponse, string>({
            query: (id) => ({
                url: createEndpoint(`/access-bundles/${id}`),
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'AccessBundle', id: 'LIST' }],
        }),
    }),
    overrideExisting: false,
});

// Export hooks
export const {
    useGetAccessBundlesQuery,
    useGetAccessBundleQuery,
    useCreateAccessBundleMutation,
    useUpdateAccessBundleMutation,
    useDeleteAccessBundleMutation,
} = accessBundleApi;

// Legacy exports for backwards compatibility
export const planModuleApi = accessBundleApi;
export const useGetPlanModulesQuery = useGetAccessBundlesQuery;
export const useGetPlanModuleQuery = useGetAccessBundleQuery;
export const useCreatePlanModuleMutation = useCreateAccessBundleMutation;
export const useUpdatePlanModuleMutation = useUpdateAccessBundleMutation;
export const useDeletePlanModuleMutation = useDeleteAccessBundleMutation;
