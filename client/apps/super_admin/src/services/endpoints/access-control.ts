import { api } from '../api';
import { Module, Feature, Permission, ApiResponse } from '../types';
import { createEndpoint } from '../../utils/api-utils';

// Stats response type
interface PermissionStats {
    modules: number;
    features: number;
    permissions: number;
    plans: number;
    definedModules: number;
    definedFeatures: number;
}

// Refresh response type
interface RefreshResult {
    success: boolean;
    message: string;
    stats: {
        modulesCreated: number;
        modulesUpdated: number;
        featuresCreated: number;
        featuresUpdated: number;
        permissionsCreated: number;
        permissionsUpdated: number;
    };
}

export const accessControlApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // Modules
        getModules: builder.query<ApiResponse<Module[]>, void>({
            query: () => createEndpoint('/access-control/modules'),
            providesTags: ['Module'],
        }),
        createModule: builder.mutation<ApiResponse<Module>, Partial<Module>>({
            query: (data) => ({
                url: createEndpoint('/access-control/modules'),
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Module'],
        }),
        updateModule: builder.mutation<ApiResponse<Module>, { id: string; data: Partial<Module> }>({
            query: ({ id, data }) => ({
                url: createEndpoint(`/access-control/modules/${id}`),
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Module'],
        }),
        deleteModule: builder.mutation<ApiResponse<void>, string>({
            query: (id) => ({
                url: createEndpoint(`/access-control/modules/${id}`),
                method: 'DELETE',
            }),
            invalidatesTags: ['Module'],
        }),

        // Features
        getFeatures: builder.query<ApiResponse<Feature[]>, void>({
            query: () => createEndpoint('/access-control/features'),
            providesTags: ['Module', 'Permission'], // Features often updated with these
        }),
        createFeature: builder.mutation<ApiResponse<Feature>, Partial<Feature>>({
            query: (data) => ({
                url: createEndpoint('/access-control/features'),
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Module'],
        }),
        updateFeature: builder.mutation<ApiResponse<Feature>, { id: string; data: Partial<Feature> }>({
            query: ({ id, data }) => ({
                url: createEndpoint(`/access-control/features/${id}`),
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Module'],
        }),
        deleteFeature: builder.mutation<ApiResponse<void>, string>({
            query: (id) => ({
                url: createEndpoint(`/access-control/features/${id}`),
                method: 'DELETE',
            }),
            invalidatesTags: ['Module'],
        }),

        // Permissions
        getPermissions: builder.query<ApiResponse<Permission[]>, void>({
            query: () => createEndpoint('/access-control/permissions'),
            providesTags: ['Permission'],
        }),
        createPermission: builder.mutation<ApiResponse<Permission>, Partial<Permission>>({
            query: (data) => ({
                url: createEndpoint('/access-control/permissions'),
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Permission', 'Module'],
        }),
        updatePermission: builder.mutation<ApiResponse<Permission>, { id: string; data: Partial<Permission> }>({
            query: ({ id, data }) => ({
                url: createEndpoint(`/access-control/permissions/${id}`),
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Permission', 'Module'],
        }),
        deletePermission: builder.mutation<ApiResponse<void>, string>({
            query: (id) => ({
                url: createEndpoint(`/access-control/permissions/${id}`),
                method: 'DELETE',
            }),
            invalidatesTags: ['Permission', 'Module'],
        }),

        // Refresh & Stats
        refreshPermissions: builder.mutation<RefreshResult, void>({
            query: () => ({
                url: createEndpoint('/access-control/refresh'),
                method: 'POST',
            }),
            invalidatesTags: ['Module', 'Permission'], // Refresh all data after sync
        }),
        getPermissionStats: builder.query<ApiResponse<PermissionStats>, void>({
            query: () => createEndpoint('/access-control/stats'),
            providesTags: ['Module', 'Permission'],
        }),
    }),
});

export const {
    useGetModulesQuery,
    useCreateModuleMutation,
    useUpdateModuleMutation,
    useDeleteModuleMutation,
    useGetFeaturesQuery,
    useCreateFeatureMutation,
    useUpdateFeatureMutation,
    useDeleteFeatureMutation,
    useGetPermissionsQuery,
    useCreatePermissionMutation,
    useUpdatePermissionMutation,
    useDeletePermissionMutation,
    useRefreshPermissionsMutation,
    useGetPermissionStatsQuery,
} = accessControlApi;

