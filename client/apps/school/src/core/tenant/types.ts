// Tenant type definition (defined locally to avoid circular/module issues)
export type TenantType = 'school' | 'university' | 'coaching' | 'institute';

// Tenant information structure
export interface TenantInfo {
    id: string;
    subdomain: string;
    name: string;
    type: TenantType;
    logoUrl?: string;
    primaryColor?: string;
    settings?: TenantSettings;
}

// Tenant-specific settings
export interface TenantSettings {
    enabledModules: string[];
    timezone: string;
    dateFormat: string;
    currency: string;
    language: string;
    featureFlags?: Record<string, boolean>;
    customization?: {
        primaryColor?: string;
        secondaryColor?: string;
        logoUrl?: string;
        faviconUrl?: string;
    };
}

// Tenant context state
export interface TenantContextState {
    tenant: TenantInfo | null;
    isLoading: boolean;
    isValidTenant: boolean;
    isMainDomain: boolean;
    error: string | null;
}

// Tenant context actions
export interface TenantContextActions {
    setTenant: (tenant: TenantInfo) => void;
    clearTenant: () => void;
    refreshTenant: () => Promise<void>;
}

// Combined tenant context type
export interface TenantContextType extends TenantContextState, TenantContextActions { }

// Subdomain parsing result
export interface SubdomainResult {
    isMainDomain: boolean;
    subdomain: string | null;
    fullHostname: string;
}

// API response for tenant verification
export interface TenantVerificationResponse {
    success: boolean;
    tenant: TenantInfo | null;
    message?: string;
}
