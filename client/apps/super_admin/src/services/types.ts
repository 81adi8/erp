/**
 * API Types
 * Centralized type definitions for API responses
 */

// Generic API response wrapper
export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}

// Paginated response
export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// Auth types
export interface AdminUser {
    id: string;
    email: string;
    name: string;
    role: string;
    permissions: Record<string, boolean>;
    is_main: boolean;
    is_two_factor_enabled: boolean;
}

export interface LoginRequest {
    email: string;
    password: string;
    twoFactorCode?: string;
}

export interface LoginResponse {
    success: boolean;
    require2FA?: boolean;
    message?: string;
    data?: {
        user: AdminUser;
        accessToken: string;
    };
}

export interface SessionInfo {
    id: string;
    device_info: Record<string, unknown>;
    ip: string;
    created_at: string;
    last_active_at: string;
    revoked_at: string | null;
}

export interface TwoFASetupResponse {
    success: boolean;
    data: {
        secret: string;
        qrCodeUrl: string;
    };
}

// Institution/Tenant types
export interface Institution {
    id: string;
    name: string;
    subdomain: string;
    schema_name: string;
    status: 'active' | 'inactive' | 'suspended' | 'pending';
    plan_id: string | null;
    plan?: {
        id: string;
        name: string;
    };
    contact_email: string;
    contact_phone?: string;
    address?: string;
    logo_url?: string;
    settings?: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface CreateInstitutionRequest {
    name: string;
    subdomain: string;
    contactEmail: string;
    contactPhone?: string;
    planId?: string;
    address?: string;
    adminName?: string;
    adminEmail?: string;
    adminPassword?: string;
}

// Dashboard types
export interface DashboardStats {
    totalInstitutions: number;
    activeInstitutions: number;
    pendingApprovals: number;
    totalAdmins: number;
    recentActivity: Array<{
        id: string;
        type: string;
        message: string;
        timestamp: string;
    }>;
}

// SubAdmin types
export type SubAdminType = 'sub_admin' | 'staff' | 'team';
export type SubAdminStatus = 'active' | 'inactive' | 'expired';

export interface AccessPolicy {
    id: string;
    name: string;
    description?: string;
    permissions: Record<string, boolean>;
}

export interface SubAdmin {
    id: string;
    email: string;
    name: string;
    type: SubAdminType;
    role: string;
    status: SubAdminStatus;
    permissions: Record<string, boolean>;
    access_policy?: AccessPolicy;
    valid_at: string | null;
    valid_until: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    last_login_at?: string;
}

export interface CreateSubAdminRequest {
    name: string;
    email: string;
    password?: string; // Default: FirstName@123
    type: SubAdminType;
    role?: string;
    permissions?: Record<string, boolean>;
    valid_at?: string;
    valid_until?: string;
}

export interface UpdateSubAdminRequest {
    name?: string;
    email?: string;
    type?: SubAdminType;
    role?: string;
    status?: SubAdminStatus;
    permissions?: Record<string, boolean>;
    valid_at?: string | null;
    valid_until?: string | null;
}

// Permission categories for the UI
export const PERMISSION_CATEGORIES = {
    users: {
        label: 'User Management',
        permissions: ['view_users', 'create_users', 'edit_users', 'delete_users'],
    },
    institutions: {
        label: 'Institution Management',
        permissions: ['view_institutions', 'create_institutions', 'edit_institutions', 'delete_institutions'],
    },
    settings: {
        label: 'Settings',
        permissions: ['view_settings', 'edit_settings'],
    },
    reports: {
        label: 'Reports',
        permissions: ['view_reports', 'export_reports'],
    },
    billing: {
        label: 'Billing',
        permissions: ['view_billing', 'manage_billing'],
    },
} as const;

// Access Control Management Types
export interface Permission {
    id: string;
    feature_id: string;
    key: string;
    action: string;
    description?: string;
    is_active: boolean;
    route_name?: string;
    route_active: boolean;
    route_title?: string;
    feature?: Feature;
}

export interface Feature {
    id: string;
    module_id: string;
    slug: string;
    name: string;
    description?: string;
    icon?: string;
    sort_order: number;
    is_active: boolean;
    route_name?: string;
    route_active: boolean;
    route_title?: string;
    permissions?: Permission[];
    module?: Module;
}

export interface Module {
    id: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    is_active: boolean;
    route_name?: string;
    route_active: boolean;
    route_title?: string;
    features?: Feature[];
    children?: Module[];
    parent_id?: string;
}

// Plan types
export interface Plan {
    id: string;
    name: string;
    slug: string;
    price_monthly: number;
    price_yearly: number;
    description: string;
    is_active: boolean;
    modules?: Module[];
    permissions?: Permission[];
    permission_ids?: string[];
    created_at: string;
    updated_at: string;
}

