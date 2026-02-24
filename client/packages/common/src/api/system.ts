/**
 * Shared System API Endpoints
 * Logic for fetching global configuration metadata
 */



/**
 * Shared endpoint definitions that can be injected into any RTK Query API
 */
import type { BaseQueryFn, EndpointBuilder } from '@reduxjs/toolkit/query';

type SystemConfigValue = Record<string, unknown>;
type SystemConfigBaseQuery = BaseQueryFn<string, unknown, unknown>;
type SystemConfigBuilder = EndpointBuilder<SystemConfigBaseQuery, string, string>;

export const systemConfigEndpoints = (builder: SystemConfigBuilder, createEndpoint: (path: string) => string) => {
    return {
        getSystemConfig: builder.query<SystemConfigValue, void>({
            query: () => createEndpoint('/config/all'),
        }),
        getInstitutionTypes: builder.query<SystemConfigValue, void>({
            query: () => createEndpoint('/config/institution-types'),
        }),
        getRoleTypes: builder.query<SystemConfigValue, void>({
            query: () => createEndpoint('/config/role-types'),
        }),
        getInstitutionRoles: builder.query<SystemConfigValue, void>({
            query: () => createEndpoint('/config/institution-roles'),
        }),
    };
};
