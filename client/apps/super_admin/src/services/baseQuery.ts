/**
 * Base Query with Interceptors
 * Custom base query with 401 handling and automatic logout
 */

import {
    fetchBaseQuery,
    type BaseQueryFn,
    type FetchArgs,
    type FetchBaseQueryError
} from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import { logout } from '../features/auth/authSlice';
import { API_CONFIG } from './config';

/**
 * Base fetch query with auth headers
 */
const baseQuery = fetchBaseQuery({
    baseUrl: API_CONFIG.baseUrl,
    credentials: API_CONFIG.credentials,
    prepareHeaders: (headers, { getState }) => {
        // Get token from state if available (for Bearer auth)
        const token = (getState() as RootState).auth.token;
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        // Set content type if not already set
        if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }

        return headers;
    },
});

/**
 * Enhanced base query with interceptors
 * Handles:
 * - 401 Unauthorized: Auto logout and clear all stored data
 * - 403 Forbidden: Handle permission errors
 * - Network errors: Provide meaningful error messages
 */
export const baseQueryWithInterceptors: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
> = async (args, api, extraOptions) => {
    // Execute the base query
    const result = await baseQuery(args, api, extraOptions);

    // Handle errors
    if (result.error) {
        const status = result.error.status;

        // 401 Unauthorized - Session expired or invalid
        if (status === 401) {
            console.warn('[API] Unauthorized - Logging out user');

            // Dispatch logout action
            api.dispatch(logout());

            // Clear all stored values
            sessionStorage.clear();
            localStorage.removeItem('app_theme_preferences');

            // Note: Navigation should be handled by the component/middleware
            // that detects isAuthenticated becoming false
        }

        // 403 Forbidden - Insufficient permissions
        if (status === 403) {
            console.warn('[API] Forbidden - Insufficient permissions');
            // Could dispatch a notification here
        }

        // Network error
        if (status === 'FETCH_ERROR') {
            console.error('[API] Network error - Server may be unavailable');
        }

        // Timeout
        if (status === 'TIMEOUT_ERROR') {
            console.error('[API] Request timeout');
        }
    }

    return result;
};

