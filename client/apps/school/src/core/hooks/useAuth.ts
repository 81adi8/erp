import { useMemo } from 'react';
import { useKeycloakAuth } from '../auth/KeycloakAuthContext';
import { secureStorage } from '../storage/SecureStorage';

interface AuthUser {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    roles: string[];
    permissions?: string[];
    institutionId?: string;
    isActive: boolean;
    isEmailVerified: boolean;
}

interface AuthState {
    isAuthenticated: boolean;
    user: AuthUser | null;
    isLoading: boolean;
}

interface AuthActions {
    login: (_credentials?: { email?: string; password?: string; rememberMe?: boolean }) => Promise<void>;
    register: (_data?: unknown) => Promise<void>;
    logout: () => Promise<void>;
}

/**
 * useAuth - Keycloak-backed auth hook.
 * Legacy credential-based login is deprecated and redirected to OIDC.
 */
export function useAuth(): AuthState & AuthActions {
    const { isAuthenticated, isLoading, user: keycloakUser, login: keycloakLogin, logout: keycloakLogout } = useKeycloakAuth();

    const user = useMemo<AuthUser | null>(() => {
        if (!keycloakUser) return null;
        return {
            id: keycloakUser.id,
            email: keycloakUser.email,
            firstName: keycloakUser.firstName,
            lastName: keycloakUser.lastName,
            roles: keycloakUser.roles || [],
            institutionId: keycloakUser.tenantId,
            isActive: true,
            isEmailVerified: true,
        };
    }, [keycloakUser]);

    const login = async (): Promise<void> => {
        keycloakLogin();
    };

    const register = async (): Promise<void> => {
        // Registration is identity-provider managed in OIDC mode.
        keycloakLogin();
    };

    const logout = async (): Promise<void> => {
        secureStorage.clearAuthData();
        keycloakLogout({ redirectUri: `${window.location.origin}/login` });
    };

    return {
        isAuthenticated,
        user,
        isLoading,
        login,
        register,
        logout,
    };
}

export function useAuthUser(): AuthUser | null {
    const { user } = useAuth();
    return user;
}

export function useIsAuthenticated(): boolean {
    const { isAuthenticated } = useAuth();
    return isAuthenticated;
}

export default useAuth;

