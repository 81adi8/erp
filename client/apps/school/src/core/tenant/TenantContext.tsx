import { createContext } from 'react';
import type { TenantContextType } from './types';

// Default context value
const defaultContext: TenantContextType = {
    tenant: null,
    isLoading: true,
    isValidTenant: false,
    isMainDomain: false,
    error: null,
    setTenant: () => { },
    clearTenant: () => { },
    refreshTenant: async () => { },
};

export const TenantContext = createContext<TenantContextType>(defaultContext);
TenantContext.displayName = 'TenantContext';
