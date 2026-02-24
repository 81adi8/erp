import { baseApi } from '../baseApi';
import type { ApiResponse } from '../baseApi';
import { API_TAGS } from '../../config/constants';
import { secureStorage } from '../../storage/SecureStorage';

// ============================================================================
// Navigation Types
// ============================================================================

export interface NavItem {
    key: string;
    title: string;
    icon?: string;
    path?: string;
    children?: NavItem[];
}

export interface UserRole {
    id: string;
    name: string;
}

export interface PermissionsResponse {
    permissions: string[];
    roles: UserRole[];
    isAdmin: boolean;
}

export interface NavItemsResponse {
    navigation: NavItem[];
}

export interface NavigationResponse {
    permissions: string[];
    navigation: NavItem[];
    roles: UserRole[];
    isAdmin: boolean;
}

// ============================================================================
// Navigation API Endpoints
// ============================================================================

export const navigationApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        /**
         * Get user permissions array
         */
        getUserPermissions: builder.query<ApiResponse<PermissionsResponse>, void>({
            query: () => '/school/navigation/permissions',
            providesTags: [API_TAGS.NAVIGATION],
            async onQueryStarted(_, { queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    if (data.success && data.data) {
                        // Store permissions in secure storage
                        secureStorage.setPermissions(data.data.permissions);
                        secureStorage.setUserRoles(data.data.roles);
                    }
                } catch {
                    // Failed to fetch permissions
                }
            },
        }),

        /**
         * Get navigation items based on user permissions
         */
        getNavItems: builder.query<ApiResponse<NavItemsResponse>, void>({
            query: () => '/school/navigation/nav-items',
            providesTags: [API_TAGS.NAVIGATION],
            async onQueryStarted(_, { queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    if (data.success && data.data) {
                        // Store navigation in secure storage
                        secureStorage.setNavigation(data.data.navigation);
                    }
                } catch {
                    // Failed to fetch navigation
                }
            },
        }),

        /**
         * Get combined permissions and navigation (optimized for initial load)
         */
        getNavigation: builder.query<ApiResponse<NavigationResponse>, void>({
            query: () => '/school/navigation',
            providesTags: [API_TAGS.NAVIGATION],
            async onQueryStarted(_, { queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    if (data.success && data.data) {
                        // Store all navigation data in secure storage
                        secureStorage.setPermissions(data.data.permissions);
                        secureStorage.setNavigation(data.data.navigation);
                        secureStorage.setUserRoles(data.data.roles);
                    }
                } catch {
                    // Failed to fetch navigation data
                }
            },
        }),
    }),
    overrideExisting: true,
});

// Export hooks
export const {
    useGetUserPermissionsQuery,
    useLazyGetUserPermissionsQuery,
    useGetNavItemsQuery,
    useLazyGetNavItemsQuery,
    useGetNavigationQuery,
    useLazyGetNavigationQuery,
} = navigationApi;

// ============================================================================
// Helper function to fetch navigation after login
// ============================================================================

/**
 * Fetch navigation data after successful login
 * This should be called from the login success handler
 */
export async function fetchNavigationAfterLogin(accessToken?: string): Promise<NavigationResponse | null> {
    try {
        // Get tenant info for headers
        const storedTenant = secureStorage.getTenant();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Add auth token if available
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        // Add tenant headers
        if (storedTenant?.id) {
            headers['X-Institution-ID'] = storedTenant.id;
        }

        // Use the correct API path
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1/tenant';
        const response = await fetch(`${apiBaseUrl}/school/navigation`, {
            method: 'GET',
            credentials: 'include',
            headers,
        });

        if (!response.ok) {
            throw new Error('Failed to fetch navigation');
        }

        const data: ApiResponse<NavigationResponse> = await response.json();

        if (data.success && data.data) {
            secureStorage.setPermissions(data.data.permissions);
            secureStorage.setNavigation(data.data.navigation);
            secureStorage.setUserRoles(data.data.roles);
            return data.data;
        }

        return null;
    } catch (error) {
        console.error('[NavigationApi] Failed to fetch navigation after login:', error);
        return null;
    }
}
