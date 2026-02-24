/**
 * API Service
 * Core RTK Query API instance with interceptors
 * 
 * This is the base API - endpoints are injected from separate modules.
 * See /endpoints folder for domain-specific endpoints.
 * 
 * IMPORTANT: Do NOT import from ./endpoints here to avoid circular dependency.
 * Import hooks from './endpoints' directly in components.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithInterceptors } from './baseQuery';

/**
 * Core API instance
 * Uses custom baseQuery with:
 * - 401 auto-logout interceptor
 * - Auth header injection
 * - Error handling & logging
 */
export const api = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithInterceptors,
    tagTypes: ['Session', 'Admin', 'Institution', 'Plan', 'Module', 'Permission', 'PlanModule', 'AccessBundle', 'RoleTemplate', 'GlobalHoliday'],
    // Endpoints are injected via injectEndpoints in separate files
    endpoints: () => ({}),
});

