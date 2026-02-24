import { baseApi } from '../baseApi';
import type { ApiResponse } from '../baseApi';
import { API_TAGS } from '../../config/constants';
import { secureStorage } from '../../storage/SecureStorage';
import { emitApiError } from '../../errors/GlobalErrorHandler';
import type { NavigationResponse } from './navigationApi';

// ============================================================================
// Auth Types (matching server)
// ============================================================================

export interface LoginCredentials {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface RegisterData {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
}

export interface User {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    roles: string[];
    permissions?: string[];
    institutionId?: string;
    isActive: boolean;
    isEmailVerified: boolean;
}

export interface AuthResponse {
    user: User;
    accessToken?: string; // Optional - not sent in httpOnly cookie mode
    refreshToken: string;
    expiresIn: number;
    storageMode?: 'httponly' | 'local'; // Server indicates which mode was used
}

export interface RefreshResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface SessionInfo {
    id: string;
    deviceInfo: {
        ip: string;
        userAgent: string;
        browser?: string;
        os?: string;
        deviceType?: string;
    };
    ip: string;
    lastActiveAt: string;
    createdAt: string;
    isCurrent: boolean;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

// ============================================================================
// Auth API Endpoints
// ============================================================================

export const authApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Login
        login: builder.mutation<ApiResponse<AuthResponse & { mfaPending?: boolean; mfaToken?: string }>, LoginCredentials>({
            query: ({ email, password }) => ({
                url: '/auth/login',
                method: 'POST',
                body: { email, password },
            }),
            async onQueryStarted(_, { queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    if (data.success && data.data) {
                        const authData = data.data;

                        // ── Fix 3: Handle MFA pending state ──────────────────────────────────
                        // When admin has MFA enabled, server returns mfaPending=true + mfaToken.
                        // Do NOT store tokens (they're empty). Surface MFA screen via event bus.
                        if (authData.mfaPending) {
                            emitApiError({
                                status: 403,
                                code: 'MFA_REQUIRED',
                                mfaToken: authData.mfaToken,
                            });
                            return;
                        }

                        // ── Handle MFA setup required (admin without MFA configured) ─────────
                        // Server throws MFA_SETUP_REQUIRED — this is caught in the catch block
                        // below and surfaced as a login error. The MFA setup page handles it.

                        // Check storage mode from response
                        if (authData.storageMode === 'httponly') {
                            // Tokens are in httpOnly cookies, just mark session valid
                            secureStorage.setSessionValid(true);
                        } else {
                            // Store access token in memory only
                            if (authData.accessToken) {
                                secureStorage.setAuthToken(authData.accessToken);
                            }
                            // IMPORTANT: Also mark session valid so we know to try refresh
                            // even if access token expires. The refresh token persists.
                            secureStorage.setSessionValid(true);
                        }

                        // Always store user info locally
                        secureStorage.setUser(authData.user);

                        // Fetch and store navigation/permissions after successful login
                        try {
                            // Get tenant info for the request headers
                            const storedTenant = secureStorage.getTenant();
                            const headers: Record<string, string> = {
                                'Content-Type': 'application/json',
                            };

                            // Add auth token if available
                            if (authData.accessToken) {
                                headers['Authorization'] = `Bearer ${authData.accessToken}`;
                            }

                            // Add tenant headers
                            if (storedTenant?.id) {
                                headers['X-Institution-ID'] = storedTenant.id;
                            }

                            // Use the correct tenant API base (not auth base)
                            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
                            const navResponse = await fetch(`${apiBaseUrl}/school/navigation`, {
                                method: 'GET',
                                credentials: 'include',
                                headers,
                            });

                            if (navResponse.ok) {
                                const navData: ApiResponse<NavigationResponse> = await navResponse.json();
                                if (navData.success && navData.data) {
                                    secureStorage.setPermissions(navData.data.permissions);
                                    secureStorage.setNavigation(navData.data.navigation);
                                    secureStorage.setUserRoles(navData.data.roles);
                                }
                            }
                        } catch (navError) {
                            console.warn('[Auth] Failed to fetch navigation after login:', navError);
                        }
                    }
                } catch {
                    // Login failed, don't store tokens
                }
            },
            invalidatesTags: [API_TAGS.AUTH, API_TAGS.NAVIGATION],
        }),

        // Register
        register: builder.mutation<ApiResponse<AuthResponse>, RegisterData>({
            query: (data) => ({
                url: '/auth/register',
                method: 'POST',
                body: data,
            }),
            async onQueryStarted(_, { queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    if (data.success && data.data) {
                        const authData = data.data;

                        // Check storage mode from response
                        if (authData.storageMode === 'httponly') {
                            secureStorage.setSessionValid(true);
                        } else {
                            if (authData.accessToken) {
                                secureStorage.setAuthToken(authData.accessToken);
                            }
                        }

                        secureStorage.setUser(authData.user);
                    }
                } catch {
                    // Registration failed
                }
            },
        }),

        // Logout
        logout: builder.mutation<ApiResponse<null>, void>({
            query: () => ({
                url: '/auth/logout',
                method: 'POST',
            }),
            async onQueryStarted(_, { queryFulfilled }) {
                try {
                    await queryFulfilled;
                } finally {
                    // Always clear auth data on logout attempt (tokens, user, permissions, navigation)
                    secureStorage.clearAuthData();
                }
            },
            invalidatesTags: [API_TAGS.AUTH, API_TAGS.NAVIGATION],
        }),

        // Get current user
        getCurrentUser: builder.query<ApiResponse<{ user: User }>, void>({
            query: () => '/auth/me',
            providesTags: [API_TAGS.AUTH],
        }),

        // Refresh token
        refreshToken: builder.mutation<ApiResponse<RefreshResponse>, { refreshToken: string }>({
            query: (data) => ({
                url: '/auth/refresh',
                method: 'POST',
                body: data,
            }),
            async onQueryStarted(_, { queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    if (data.success && data.data) {
                        secureStorage.setAuthToken(data.data.accessToken);
                        secureStorage.setSessionValid(true);
                    }
                } catch {
                    // Refresh failed, clear all tokens
                    secureStorage.clearAll();
                }
            },
        }),

        // Get active sessions
        getSessions: builder.query<ApiResponse<{ sessions: SessionInfo[] }>, void>({
            query: () => '/auth/sessions',
            providesTags: [API_TAGS.SESSIONS],
        }),

        // Revoke a session
        revokeSession: builder.mutation<ApiResponse<null>, string>({
            query: (sessionId) => ({
                url: `/auth/sessions/${sessionId}`,
                method: 'DELETE',
            }),
            invalidatesTags: [API_TAGS.SESSIONS],
        }),

        // Logout from all devices
        logoutAll: builder.mutation<ApiResponse<{ revokedCount: number }>, { keepCurrent?: boolean }>({
            query: (data) => ({
                url: '/auth/logout-all',
                method: 'POST',
                body: data,
            }),
            async onQueryStarted({ keepCurrent }, { queryFulfilled }) {
                try {
                    await queryFulfilled;
                    if (!keepCurrent) {
                        secureStorage.clearAll();
                    }
                } catch {
                    // Request failed
                }
            },
            invalidatesTags: [API_TAGS.AUTH, 'Sessions'],
        }),

        // Change password
        changePassword: builder.mutation<ApiResponse<null>, ChangePasswordRequest>({
            query: (data) => ({
                url: '/auth/change-password',
                method: 'POST',
                body: data,
            }),
        }),

        // Forgot password
        forgotPassword: builder.mutation<ApiResponse<null>, { email: string }>({
            query: (data) => ({
                url: '/auth/forgot-password',
                method: 'POST',
                body: data,
            }),
        }),

        // Reset password
        resetPassword: builder.mutation<ApiResponse<null>, { token: string; newPassword: string }>({
            query: (data) => ({
                url: '/auth/reset-password',
                method: 'POST',
                body: data,
            }),
        }),

        // MFA verify — called after login returns MFA_REQUIRED
        verifyMfa: builder.mutation<ApiResponse<AuthResponse>, { totpCode: string; mfaToken?: string }>({
            query: ({ totpCode, mfaToken }) => ({
                url: '/auth/mfa/verify',
                method: 'POST',
                body: { mfaToken, totpCode },
            }),
            async onQueryStarted(_, { queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    if (data.success && data.data) {
                        const authData = data.data;
                        if (authData.storageMode === 'httponly') {
                            secureStorage.setSessionValid(true);
                        } else {
                            if (authData.accessToken) {
                                secureStorage.setAuthToken(authData.accessToken);
                            }
                            secureStorage.setSessionValid(true);
                        }
                        if (authData.user) {
                            secureStorage.setUser(authData.user);
                        }
                    }
                } catch {
                    // MFA verification failed
                }
            },
            invalidatesTags: [API_TAGS.AUTH],
        }),

        // MFA setup — get QR/secret for admin
        setupMfa: builder.mutation<ApiResponse<{ secret: string; qrCode?: string; qrCodeDataUrl?: string; backupCodes?: string[] }>, void>({
            query: () => ({
                url: '/auth/mfa/setup',
                method: 'POST',
            }),
        }),
    }),
    overrideExisting: true,
});

// Export hooks
export const {
    useLoginMutation,
    useRegisterMutation,
    useLogoutMutation,
    useGetCurrentUserQuery,
    useLazyGetCurrentUserQuery,
    useRefreshTokenMutation,
    useGetSessionsQuery,
    useRevokeSessionMutation,
    useLogoutAllMutation,
    useChangePasswordMutation,
    useForgotPasswordMutation,
    useResetPasswordMutation,
    useVerifyMfaMutation,
    useSetupMfaMutation,
} = authApi;
