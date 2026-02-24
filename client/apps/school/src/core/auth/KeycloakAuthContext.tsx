/**
 * Keycloak Authentication Context
 * 
 * Provides Keycloak auth state and methods throughout the application.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { keycloakAuthService, type KeycloakUser, type KeycloakAuthState } from './keycloak.service';
import { useTenant } from '../tenant/useTenant';

// ============================================================================
// Types
// ============================================================================

interface KeycloakAuthContextValue extends KeycloakAuthState {
    login: (options?: { redirectUri?: string }) => void;
    logout: (options?: { redirectUri?: string }) => void;
    hasRole: (role: string) => boolean;
    hasAnyRole: (roles: string[]) => boolean;
    updateToken: (minValidity?: number) => Promise<boolean>;
    isInitialized: boolean;
}

// ============================================================================
// Context
// ============================================================================

const KeycloakAuthContext = createContext<KeycloakAuthContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface KeycloakAuthProviderProps {
    children: ReactNode;
}

export function KeycloakAuthProvider({ children }: KeycloakAuthProviderProps) {
    const { tenant, isValidTenant } = useTenant();
    const [authState, setAuthState] = useState<KeycloakAuthState>({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        token: null,
        error: null,
    });
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize Keycloak when tenant is resolved
    useEffect(() => {
        if (!tenant || !isValidTenant) {
            return;
        }

        const initKeycloak = async () => {
            setAuthState(prev => ({ ...prev, isLoading: true }));
            
            try {
                await keycloakAuthService.initialize(tenant, (state) => {
                    setAuthState(state);
                });
                setIsInitialized(true);
            } catch (error) {
                console.error('[KeycloakAuth] Failed to initialize:', error);
                setAuthState({
                    isAuthenticated: false,
                    isLoading: false,
                    user: null,
                    token: null,
                    error: error instanceof Error ? error.message : 'Keycloak initialization failed',
                });
            }
        };

        initKeycloak();
    }, [tenant, isValidTenant]);

    // Login
    const login = useCallback((options?: { redirectUri?: string }) => {
        keycloakAuthService.login(options);
    }, []);

    // Logout
    const logout = useCallback((options?: { redirectUri?: string }) => {
        keycloakAuthService.logout(options);
    }, []);

    // Has role
    const hasRole = useCallback((role: string) => {
        return keycloakAuthService.hasRole(role);
    }, []);

    // Has any role
    const hasAnyRole = useCallback((roles: string[]) => {
        return keycloakAuthService.hasAnyRole(roles);
    }, []);

    // Update token
    const updateToken = useCallback(async (minValidity: number = 30) => {
        return keycloakAuthService.updateToken(minValidity);
    }, []);

    const value: KeycloakAuthContextValue = {
        ...authState,
        login,
        logout,
        hasRole,
        hasAnyRole,
        updateToken,
        isInitialized,
    };

    return (
        <KeycloakAuthContext.Provider value={value}>
            {children}
        </KeycloakAuthContext.Provider>
    );
}

// ============================================================================
// Hook
// ============================================================================

export function useKeycloakAuth(): KeycloakAuthContextValue {
    const context = useContext(KeycloakAuthContext);
    if (!context) {
        throw new Error('useKeycloakAuth must be used within a KeycloakAuthProvider');
    }
    return context;
}

// ============================================================================
// Exports
// ============================================================================

export { KeycloakAuthContext };
export type { KeycloakAuthContextValue };
