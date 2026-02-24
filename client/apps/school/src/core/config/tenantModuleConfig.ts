// Tenant Module Types and Configuration
import type { ComponentType, LazyExoticComponent } from 'react';

// Tenant types
export type TenantType = 'school' | 'coaching' | 'university' | 'institute';

// Navigation item definition
export interface NavigationItem {
    id: string;
    label: string;
    path: string;
    icon: string;
    permission?: string;
    children?: NavigationItem[];
}

// Tenant module interface
export interface TenantModule {
    routes: LazyExoticComponent<ComponentType>;
    navigation: NavigationItem[];
    config: TenantModuleConfig;
}

// Module configuration
export interface TenantModuleConfig {
    type: TenantType;
    name: string;
    description: string;
    version: string;
    features: Record<string, FeatureConfig>;
}

// Feature configuration
export interface FeatureConfig {
    enabled: boolean;
    permission?: string;
}

// Module definition for registry
export interface TenantModuleDefinition {
    type: TenantType;
    name: string;
    description: string;
    load: () => Promise<{ default: TenantModule }>;
}

// Tenant module registry - lazy load each tenant module
export const TENANT_MODULES: Record<TenantType, TenantModuleDefinition> = {
    school: {
        type: 'school',
        name: 'School Management',
        description: 'Complete K-12 school ERP solution',
        load: () => import('../../tenant-modules/school'),
    },
    coaching: {
        type: 'coaching',
        name: 'Coaching Institute',
        description: 'Test series and batch management for coaching centers',
        load: () => import('../../tenant-modules/coaching'),
    },
    university: {
        type: 'university',
        name: 'University Management',
        description: 'Higher education institution management',
        load: () => import('../../tenant-modules/university'),
    },
    institute: {
        type: 'institute',
        name: 'Generic Institute',
        description: 'Flexible institute management system',
        load: () => import('../../tenant-modules/institute'),
    },
};

// Get module definition by type
export function getTenantModuleDefinition(type: TenantType): TenantModuleDefinition | null {
    return TENANT_MODULES[type] || null;
}

// Load tenant module dynamically
export async function loadTenantModule(type: TenantType): Promise<TenantModule | null> {
    const definition = getTenantModuleDefinition(type);
    if (!definition) {
        console.error(`Unknown tenant type: ${type}`);
        return null;
    }

    try {
        const module = await definition.load();
        return module.default;
    } catch (error) {
        console.error(`Failed to load tenant module: ${type}`, error);
        return null;
    }
}
