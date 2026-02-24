/**
 * Shared System Types
 * Decoupled from specific app implementations
 */

// Generic API response wrapper
export interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    data?: T;
    error?: string;
}

export type InstitutionType = 'school' | 'university' | 'coaching' | 'all';

export interface SystemRole {
    id: string;
    label: string;
    description: string;
    icon?: string;
}

export interface SystemConfig {
    institutionTypes: string[];
    roleTypes: string[];
    institutionRoles: Record<string, SystemRole[]>;
}
