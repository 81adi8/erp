import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs } from '@reduxjs/toolkit/query';
import { env } from '../config/env';
import { API_TAGS } from '../config/constants';
import { secureStorage } from '../storage/SecureStorage';
import { parseSubdomain } from '../tenant/tenantUtils';
import { getCookie } from '../storage/cookieUtils';
import { emitApiError } from '../errors/GlobalErrorHandler';
import { keycloakAuthService } from '../auth/keycloak.service';

// Types for API responses
export type ApiResponse<T> = {
    success: boolean;
    data: T;
    message?: string;
};

export type ApiError = {
    status: number;
    message: string;
    errors?: Record<string, string[]>;
};

export type PaginatedResponse<T> = {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
};

// Auth routes that must go to AUTH_API_BASE_URL (not tenant base)
const AUTH_ROUTE_PREFIXES = ['/auth/'];

function isAuthRoute(url: string): boolean {
    return AUTH_ROUTE_PREFIXES.some((prefix) => url.startsWith(prefix));
}

/**
 * Get tenant identifier for API headers
 * Priority: 1) Stored tenant ID, 2) Subdomain from URL
 */
function getTenantIdentifier(): { id?: string; subdomain?: string } {
    try {
        const storedTenant = secureStorage.getTenant();
        if (storedTenant?.id) {
            return { id: storedTenant.id, subdomain: storedTenant.subdomain };
        }
    } catch {
        // Storage not available
    }

    const { subdomain, isMainDomain } = parseSubdomain();
    if (!isMainDomain && subdomain) {
        return { subdomain };
    }

    return {};
}

function buildHeaders(headers: Headers): Headers {
    // Priority 1: Keycloak access token (OIDC flow)
    const keycloakToken = keycloakAuthService.getToken();
    if (keycloakToken) {
        headers.set('Authorization', `Bearer ${keycloakToken}`);
    } else {
        // Priority 2: Legacy token from secure storage (fallback during migration)
        try {
            const token = secureStorage.getAuthToken();
            if (token && !secureStorage.isHttpOnlyMarker(token)) {
                headers.set('Authorization', `Bearer ${token}`);
            }
        } catch {
            // Storage not initialized yet
        }
    }

    const csrfToken = getCookie('csrf_token');
    if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken);
    }

    const tenantInfo = getTenantIdentifier();
    if (tenantInfo.id) {
        headers.set('X-Institution-ID', tenantInfo.id);
    } else if (tenantInfo.subdomain) {
        headers.set('X-Tenant-ID', tenantInfo.subdomain);
    }

    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    try {
        const sessionData = localStorage.getItem('erp_selected_academic_session');
        if (sessionData) {
            const parsed = JSON.parse(sessionData);
            if (parsed?.selectedSessionId) {
                headers.set('X-Academic-Session-ID', parsed.selectedSessionId);
            }
        }
    } catch {
        // Session storage not available
    }

    return headers;
}

// Tenant data base query (for /school/* routes)
const tenantBaseQuery = fetchBaseQuery({
    baseUrl: env.API_BASE_URL,
    prepareHeaders: buildHeaders,
    credentials: 'include',
    timeout: 30000,
});

// Auth base query (for /auth/* routes)
const authBaseQuery = fetchBaseQuery({
    baseUrl: env.AUTH_API_BASE_URL,
    prepareHeaders: buildHeaders,
    credentials: 'include',
    timeout: 30000,
});

// Route to correct base query based on URL prefix
const routedBaseQuery: BaseQueryFn<string | FetchArgs, unknown, unknown> = async (
    args: string | FetchArgs,
    api: Parameters<BaseQueryFn>[1],
    extraOptions: Parameters<BaseQueryFn>[2]
) => {
    const url = typeof args === 'string' ? args : args.url;
    if (isAuthRoute(url)) {
        return authBaseQuery(args, api, extraOptions);
    }
    return tenantBaseQuery(args, api, extraOptions);
};

// Enhanced base query with 401 handling and Keycloak token refresh
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, unknown> = async (
    args: string | FetchArgs,
    api: Parameters<BaseQueryFn>[1],
    extraOptions: Parameters<BaseQueryFn>[2]
) => {
    let result = await routedBaseQuery(args, api, extraOptions);

    if (result.error && result.error.status === 401) {
        // Try Keycloak token refresh first
        if (keycloakAuthService.isAuthenticated()) {
            try {
                const refreshed = await keycloakAuthService.updateToken(30);
                if (refreshed) {
                    // Retry with new token
                    result = await routedBaseQuery(args, api, extraOptions);
                    return result;
                }
            } catch (error) {
                console.error('[API] Keycloak token refresh failed:', error);
            }
            // If refresh failed, redirect to Keycloak login
            keycloakAuthService.login();
            return result;
        }

        // OIDC-only mode: legacy /auth/refresh fallback has been removed.
        secureStorage.clearAuthData();
        keycloakAuthService.login();
    }

    // ── Fix 2: Wire emitApiError for 403 and 500 responses ───────────────────
    // This triggers GlobalErrorHandler overlays (MFA_REQUIRED, TENANT_SUSPENDED,
    // Forbidden toast, Server Error toast) without any component needing to handle
    // these cases individually.
    if (result.error) {
        const status = result.error.status as number;
        if (status === 403 || status === 500) {
            const errData = result.error.data as { code?: string; message?: string } | undefined;
            // Skip MFA_REQUIRED here — authApi.login handles it directly to pass mfaToken
            if (errData?.code !== 'MFA_REQUIRED') {
                emitApiError({
                    status,
                    code: errData?.code,
                    message: errData?.message,
                });
            }
        }
    }

    return result;
};

export const baseApi = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithReauth,
    tagTypes: Object.values(API_TAGS),
    endpoints: () => ({}),
});

export type RootState = ReturnType<typeof baseApi.reducer>;
