/**
 * Dashboard API Endpoints
 * Dashboard statistics and data
 */

import { api } from '../api';
import { createEndpoint } from '../../utils/api-utils';
import type { DashboardStats, ApiResponse } from '../types';

// Inject dashboard endpoints into the api
export const dashboardApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // Get dashboard stats
        getDashboardStats: builder.query<ApiResponse<DashboardStats>, void>({
            query: () => createEndpoint('/dashboard/stats'),
            // Refetch every 5 minutes
            keepUnusedDataFor: 300,
        }),

        // Get system health
        getSystemHealth: builder.query<ApiResponse<{
            status: 'healthy' | 'degraded' | 'down';
            uptime: number;
            responseTime: number;
            activeSessions: number;
        }>, void>({
            query: () => createEndpoint('/dashboard/health'),
            // Refetch every minute
            keepUnusedDataFor: 60,
        }),
    }),
    overrideExisting: false,
});

// Export hooks
export const {
    useGetDashboardStatsQuery,
    useGetSystemHealthQuery,
} = dashboardApi;
