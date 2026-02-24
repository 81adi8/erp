import { env } from '../../../core/config/env';
import { secureStorage } from '../../../core/storage/SecureStorage';
import { parseSubdomain } from '../../../core/tenant/tenantUtils';
import { getCookie } from '../../../core/storage/cookieUtils';

// ============================================================================
// Types
// ============================================================================

export interface Permission {
    id: string;
    key: string;
    action?: string;
    description?: string;
    module_id?: string;
    feature_id?: string;
    icon?: string;
}

export interface FeatureAbilities {
    id: string;
    name: string;
    slug: string;
    icon?: string;
    permissions: Permission[];
}

export interface ModuleAbilities {
    id: string;
    name: string;
    icon?: string;
    features: FeatureAbilities[];
}

export interface Role {
    id: string;
    name: string;
    slug?: string;
    description?: string;
    // Asset type for two-tier caching: 'public' (template), 'readonly' (system), 'custom' (tenant)
    asset_type?: string;
    source_role_id?: string;
    is_system?: boolean;
    permissions?: Permission[];
}

export interface RoleListResponse {
    success: boolean;
    data: Role[];
}

export interface AbilityRangeResponse {
    success: boolean;
    data: ModuleAbilities[];
}

// ============================================================================
// HTTP Client (Shared logic from userManagementApi.ts)
// ============================================================================

const BASE_URL = `${env.API_BASE_URL}/school`;

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
        // Ignore storage access errors
    }

    return headers;
}

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
 * List all roles for the current school
 */
export async function listRoles(includePermissions: boolean = true): Promise<RoleListResponse> {
    return request<RoleListResponse>(`/roles?includePermissions=${includePermissions}`);
}

/**
 * Create a new role
 */
export async function createRole(data: { name: string; description?: string }): Promise<{ success: boolean; data: Role }> {
    return request('/roles', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Update a role
 */
export async function updateRole(id: string, data: { name?: string; description?: string }): Promise<{ success: boolean; data: Role }> {
    return request(`/roles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * Delete a role
 */
export async function deleteRole(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/roles/${id}`, {
        method: 'DELETE',
    });
}

/**
 * Get the permitted permissions for this school (from Plan)
 */
export async function getAdminRange(): Promise<AbilityRangeResponse> {
    return request<AbilityRangeResponse>('/permissions/admin-range');
}

/**
 * Assign permissions to a role
 */
export async function assignPermissions(roleId: string, permissionIds: string[]): Promise<{ success: boolean; data: Role }> {
    return request(`/roles/${roleId}/permissions`, {
        method: 'POST',
        body: JSON.stringify({ permissionIds }),
    });
}

/**
 * Refresh public roles from templates (sync from super admin)
 * Creates new roles and updates existing public roles
 */
export async function refreshFromTemplates(): Promise<{ success: boolean; data: { refreshed: number; created: number; skipped: number; errors: string[] }; message: string }> {
    return request('/roles/refresh-from-templates', {
        method: 'POST',
    });
}

// ============================================================================
// Role Configuration Types (Default roles per user type)
// ============================================================================

export interface RoleConfig {
    id: string;
    user_type: string;
    default_role_id: string;
    defaultRole?: Role;
    previous_role_id?: string;
    is_system_role: boolean;
    role_slug?: string;
    plan_id?: string;
    last_changed_at?: string;
    changed_by?: string;
    metadata?: Record<string, unknown>;
}

export interface RoleWithCacheInfo extends Role {
    cacheStrategy?: 'tenant-scoped' | 'plan-scoped';
    cacheDescription?: string;
}

// ============================================================================
// Role Configuration API Functions
// ============================================================================

/**
 * Get all default role configurations
 */
export async function getAllRoleConfigs(): Promise<{ success: boolean; data: RoleConfig[] }> {
    return request<{ success: boolean; data: RoleConfig[] }>('/roles/config');
}

/**
 * Get default role config for a specific user type
 */
export async function getRoleConfigByUserType(userType: string): Promise<{ success: boolean; data: RoleConfig }> {
    return request<{ success: boolean; data: RoleConfig }>(`/roles/config/${userType}`);
}

/**
 * Set/update default role for a user type
 * 
 * IMPORTANT: By default, existing users keep their current role!
 * Set migrateUsers=true to also migrate existing users.
 * 
 * @param userType - User type (student, teacher, etc.)
 * @param roleId - New default role ID  
 * @param migrateUsers - If true, migrate existing users to new role
 */
export async function setDefaultRole(
    userType: string,
    roleId: string,
    migrateUsers: boolean = false
): Promise<{
    success: boolean;
    data: {
        config: RoleConfig;
        previousRoleId?: string;
        usersWithPreviousRole: number;
        migration?: { migratedCount: number };
    };
    message: string;
}> {
    return request(`/roles/config/${userType}`, {
        method: 'PUT',
        body: JSON.stringify({ roleId, migrateUsers }),
    });
}

/**
 * Migrate users from old role to new role
 * This is an explicit action that admin must trigger
 */
export async function migrateUsersToRole(
    userType: string,
    oldRoleId: string,
    newRoleId: string
): Promise<{ success: boolean; data: { migratedCount: number }; message: string }> {
    return request(`/roles/config/${userType}/migrate`, {
        method: 'POST',
        body: JSON.stringify({ oldRoleId, newRoleId }),
    });
}

/**
 * Initialize default role configurations
 * Called once during tenant setup or to reset configs
 */
export async function initializeRoleConfigs(): Promise<{ success: boolean; data: RoleConfig[]; message: string }> {
    return request('/roles/config/initialize', {
        method: 'POST',
    });
}

/**
 * Get available roles for a user type (with cache strategy info)
 */
export async function getAvailableRolesForType(userType: string): Promise<{ success: boolean; data: RoleWithCacheInfo[] }> {
    return request<{ success: boolean; data: RoleWithCacheInfo[] }>(`/roles/available-for-type/${userType}`);
}

export const rbacApi = {
    listRoles,
    createRole,
    updateRole,
    deleteRole,
    getAdminRange,
    assignPermissions,
    refreshFromTemplates,
    // Role configuration methods
    getAllRoleConfigs,
    getRoleConfigByUserType,
    setDefaultRole,
    migrateUsersToRole,
    initializeRoleConfigs,
    getAvailableRolesForType,
};

export default rbacApi;
