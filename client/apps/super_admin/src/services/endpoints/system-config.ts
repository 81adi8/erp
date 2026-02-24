/**
 * System Configuration API Endpoints
 * Fetch global system metadata like institution types and role types
 */

import { api } from '../api';
import { createEndpoint } from '../../utils/api-utils';
import { systemConfigEndpoints } from '@erp/common';

export const systemConfigApi = api.injectEndpoints({
    endpoints: (builder) => systemConfigEndpoints(builder, createEndpoint),
    overrideExisting: false,
});

export const {
    useGetSystemConfigQuery,
    useGetInstitutionTypesQuery,
    useGetRoleTypesQuery,
    useGetInstitutionRolesQuery,
} = systemConfigApi;
