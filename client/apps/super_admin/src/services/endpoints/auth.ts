/**
 * Auth API Endpoints
 * Authentication related API endpoints
 */

import { api } from '../api';
import { createEndpoint } from '../../utils/api-utils';
import type { 
    LoginRequest, 
    LoginResponse, 
    SessionInfo, 
    TwoFASetupResponse,
    ApiResponse,
} from '../types';

// Inject auth endpoints into the api
export const authApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // Login
        login: builder.mutation<LoginResponse, LoginRequest>({
            query: (credentials) => ({
                url: createEndpoint('/auth/login'),
                method: 'POST',
                body: credentials,
            }),
        }),

        // Logout
        logout: builder.mutation<ApiResponse, void>({
            query: () => ({
                url: createEndpoint('/auth/logout'),
                method: 'POST',
            }),
        }),

        // Refresh token
        refresh: builder.mutation<LoginResponse, void>({
            query: () => ({
                url: createEndpoint('/auth/refresh'),
                method: 'POST',
            }),
        }),

        // 2FA Setup
        setup2FA: builder.mutation<TwoFASetupResponse, void>({
            query: () => ({
                url: createEndpoint('/auth/2fa/setup'),
                method: 'POST',
            }),
        }),

        // 2FA Verify
        verify2FA: builder.mutation<ApiResponse, { token: string }>({
            query: (body) => ({
                url: createEndpoint('/auth/2fa/verify'),
                method: 'POST',
                body,
            }),
        }),

        // 2FA Disable
        disable2FA: builder.mutation<ApiResponse, void>({
            query: () => ({
                url: createEndpoint('/auth/2fa/disable'),
                method: 'POST',
            }),
        }),

        // Get Sessions
        getSessions: builder.query<ApiResponse<SessionInfo[]>, void>({
            query: () => createEndpoint('/auth/sessions'),
            providesTags: ['Session'],
        }),

        // Revoke Session
        revokeSession: builder.mutation<ApiResponse, string>({
            query: (sessionId) => ({
                url: createEndpoint(`/auth/sessions/${sessionId}`),
                method: 'DELETE',
            }),
            invalidatesTags: ['Session'],
        }),
    }),
    overrideExisting: false,
});

// Export hooks
export const {
    useLoginMutation,
    useLogoutMutation,
    useRefreshMutation,
    useSetup2FAMutation,
    useVerify2FAMutation,
    useDisable2FAMutation,
    useGetSessionsQuery,
    useRevokeSessionMutation,
} = authApi;
