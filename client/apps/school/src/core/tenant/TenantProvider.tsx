import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { TenantContext } from './TenantContext';
import type { TenantInfo, TenantContextState } from './types';
import { parseSubdomain, getPublicSiteUrl } from './tenantUtils';
import { env } from '../config/env';
import { initializeSecureStorage, secureStorage } from '../storage/SecureStorage';

interface TenantProviderProps {
    children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
    const [state, setState] = useState<TenantContextState>({
        tenant: null,
        isLoading: true,
        isValidTenant: false,
        isMainDomain: false,
        error: null,
    });

    // Fetch tenant info from API
    const fetchTenantInfo = useCallback(async (subdomain: string): Promise<TenantInfo | null> => {
        try {
            const response = await fetch(`${env.API_BASE_URL}/verify/${subdomain}`);

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            return data.tenant;
        } catch (error) {
            console.error('Failed to fetch tenant info:', error);
            return null;
        }
    }, []);

    // Initialize tenant on mount
    useEffect(() => {
        const initializeTenant = async () => {
            const { isMainDomain, subdomain } = parseSubdomain();

            // If main domain, redirect to public site (in production)
            if (isMainDomain) {
                if (!env.IS_DEV) {
                    window.location.href = getPublicSiteUrl();
                    return;
                }

                // In development, allow main domain for testing
                setState({
                    tenant: null,
                    isLoading: false,
                    isValidTenant: false,
                    isMainDomain: true,
                    error: 'Main domain access - redirect to public site in production',
                });
                return;
            }

            // Validate subdomain and fetch tenant info
            if (subdomain) {
                const tenantInfo = await fetchTenantInfo(subdomain);

                if (tenantInfo) {
                    // Initialize secure storage with tenant ID
                    initializeSecureStorage(tenantInfo.id);
                    // Store tenant info securely for API headers
                    secureStorage.setTenant(tenantInfo);

                    setState({
                        tenant: tenantInfo,
                        isLoading: false,
                        isValidTenant: true,
                        isMainDomain: false,
                        error: null,
                    });
                } else {
                    setState({
                        tenant: null,
                        isLoading: false,
                        isValidTenant: false,
                        isMainDomain: false,
                        error: `Invalid tenant: ${subdomain}`,
                    });
                }
            }
        };

        initializeTenant();
    }, [fetchTenantInfo]);

    // Actions
    const setTenant = useCallback((tenant: TenantInfo) => {
        setState(prev => ({
            ...prev,
            tenant,
            isValidTenant: true,
            error: null,
        }));
    }, []);

    const clearTenant = useCallback(() => {
        setState(prev => ({
            ...prev,
            tenant: null,
            isValidTenant: false,
        }));
    }, []);

    const refreshTenant = useCallback(async () => {
        if (state.tenant?.subdomain) {
            setState(prev => ({ ...prev, isLoading: true }));
            const tenantInfo = await fetchTenantInfo(state.tenant!.subdomain);

            if (tenantInfo) {
                setState(prev => ({
                    ...prev,
                    tenant: tenantInfo,
                    isLoading: false,
                }));
            }
        }
    }, [state.tenant?.subdomain, fetchTenantInfo]);

    return (
        <TenantContext.Provider
            value={{
                ...state,
                setTenant,
                clearTenant,
                refreshTenant,
            }}
        >
            {children}
        </TenantContext.Provider>
    );
}
