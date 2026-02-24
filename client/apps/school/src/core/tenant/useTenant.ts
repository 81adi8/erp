import { useContext } from 'react';
import { TenantContext } from './TenantContext';
import type { TenantContextType } from './types';

/**
 * Hook to access tenant context
 * @throws Error if used outside TenantProvider
 */
export function useTenant(): TenantContextType {
    const context = useContext(TenantContext);

    if (!context) {
        throw new Error('useTenant must be used within a TenantProvider');
    }

    return context;
}

/**
 * Hook to get current tenant ID (convenience hook)
 */
export function useTenantId(): string | null {
    const { tenant } = useTenant();
    return tenant?.id ?? null;
}

/**
 * Hook to get current tenant subdomain (convenience hook)
 */
export function useTenantSubdomain(): string | null {
    const { tenant } = useTenant();
    return tenant?.subdomain ?? null;
}
