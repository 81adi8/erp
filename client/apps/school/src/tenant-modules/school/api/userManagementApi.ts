// Simple axios-like HTTP client for User Management API
// Uses fetch with proper authentication headers

import { env } from '../../../core/config/env';
import { secureStorage } from '../../../core/storage/SecureStorage';
import { parseSubdomain } from '../../../core/tenant/tenantUtils';
import { getCookie } from '../../../core/storage/cookieUtils';

import { USER_TYPES, type UserType } from '../constants';

export { USER_TYPES, type UserType };

export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    user_type: UserType;
    is_active: boolean;
    keycloak_id?: string;
    created_at: string;
    metadata?: Record<string, unknown>;
}

export interface CreateUserData {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    roleId?: string;
    metadata?: Record<string, unknown>;
}

export interface UserListResponse {
    success: boolean;
    data: User[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface UserStatsData {
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
}

export interface UserStatsResponse {
    success: boolean;
    data: UserStatsData;
}

export interface CreateUserResponse {
    success: boolean;
    data: {
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            userType: UserType;
            keycloakId: string;
        };
        message: string;
    };
}

export interface BulkCreateData {
    users: CreateUserData[];
    userType: UserType;
    defaultMetadata?: Record<string, unknown>;
}

export interface BulkCreateResponse {
    success: boolean;
    data: {
        success: CreateUserResponse['data'][];
        failed: { email: string; error: string }[];
    };
    summary: {
        created: number;
        failed: number;
    };
}

// ============================================================================
// HTTP Client
// ============================================================================

const BASE_URL = `${env.API_BASE_URL}/school`;

/**
 * Get auth headers with tenant context
 */
function getHeaders(): HeadersInit {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    try {
        const token = secureStorage.getAuthToken();
        if (token && !secureStorage.isHttpOnlyMarker(token)) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    } catch {
        // Ignore storage access errors
    }

    const csrfToken = getCookie('csrf_token');
    if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
    }

    // Add tenant context
    try {
        const tenant = secureStorage.getTenant();
        if (tenant?.id) {
            headers['X-Institution-ID'] = tenant.id;
        } else {
            const { subdomain, isMainDomain } = parseSubdomain();
            if (!isMainDomain && subdomain) {
                headers['X-Tenant-ID'] = subdomain;
            }
        }
    } catch {
        // Ignore storage errors
    }

    return headers;
}

/**
 * Make HTTP request with proper error handling
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            ...getHeaders(),
            ...(options.headers || {}),
        },
        credentials: 'include',
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || error.error || 'Request failed');
    }

    return response.json();
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * List users with optional filters
 */
export async function listUsers(params: {
    userType?: UserType;
    search?: string;
    role?: string;
    status?: 'all' | 'active' | 'inactive';
    isActive?: boolean;
    page?: number;
    limit?: number;
} = {}): Promise<UserListResponse> {
    const searchParams = new URLSearchParams();
    if (params.userType) searchParams.set('userType', params.userType);
    if (params.search?.trim()) searchParams.set('search', params.search.trim());
    if (params.role) searchParams.set('role', params.role);
    if (params.status) searchParams.set('status', params.status);
    else if (params.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    if (params.page) searchParams.set('page', String(params.page));
    if (params.limit) searchParams.set('limit', String(params.limit));

    const queryString = searchParams.toString();
    return request<UserListResponse>(`/users${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get aggregated user stats with optional filters
 */
export async function getUserStats(params: {
    userType?: UserType;
    search?: string;
    role?: string;
} = {}): Promise<UserStatsResponse> {
    const searchParams = new URLSearchParams();
    if (params.userType) searchParams.set('userType', params.userType);
    if (params.search?.trim()) searchParams.set('search', params.search.trim());
    if (params.role) searchParams.set('role', params.role);

    const queryString = searchParams.toString();
    return request<UserStatsResponse>(`/users/stats${queryString ? `?${queryString}` : ''}`);
}

/**
 * Get user by ID
 */
export async function getUser(userId: string): Promise<{ success: boolean; data: User & { permissions: string[] } }> {
    return request(`/users/${userId}`);
}

/**
 * Create a teacher
 */
export async function createTeacher(data: CreateUserData): Promise<CreateUserResponse> {
    return request<CreateUserResponse>('/users/teachers', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Create a student
 */
export async function createStudent(data: CreateUserData): Promise<CreateUserResponse> {
    return request<CreateUserResponse>('/users/students', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Create a staff member
 */
export async function createStaff(data: CreateUserData): Promise<CreateUserResponse> {
    return request<CreateUserResponse>('/users/staff', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Create a parent
 */
export async function createParent(data: CreateUserData): Promise<CreateUserResponse> {
    return request<CreateUserResponse>('/users/parents', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Bulk create users
 */
export async function bulkCreateUsers(data: BulkCreateData): Promise<BulkCreateResponse> {
    return request<BulkCreateResponse>('/users/bulk', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Deactivate a user
 */
export async function deactivateUser(userId: string): Promise<{ success: boolean; message: string }> {
    return request(`/users/${userId}`, {
        method: 'DELETE',
    });
}

/**
 * Assign permissions to user
 */
export async function assignPermissions(
    userId: string,
    permissionKeys: string[]
): Promise<{ success: boolean; message: string }> {
    return request(`/users/${userId}/permissions`, {
        method: 'POST',
        body: JSON.stringify({ permissionKeys }),
    });
}

// Export as object
export const userManagementApi = {
    listUsers,
    getUserStats,
    getUser,
    createTeacher,
    createStudent,
    createStaff,
    createParent,
    bulkCreateUsers,
    deactivateUser,
    assignPermissions,
};

export default userManagementApi;
