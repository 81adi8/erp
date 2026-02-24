/**
 * Keycloak OIDC Authentication Service
 * 
 * Handles Keycloak initialization, login, logout, and token management
 * with tenant-specific realm resolution.
 */

import Keycloak from 'keycloak-js';
import type { TenantInfo } from '../tenant/types';

// ============================================================================
// Types
// ============================================================================

export interface KeycloakUser {
    id: string;
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
    roles: string[];
    tenantId?: string;
}

export interface KeycloakAuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: KeycloakUser | null;
    token: string | null;
    error: string | null;
}

// ============================================================================
// Keycloak Service
// ============================================================================

class KeycloakAuthService {
    private keycloak: Keycloak | null = null;
    private tenant: TenantInfo | null = null;
    private refreshTimer: ReturnType<typeof setTimeout> | null = null;
    private onAuthChange: ((state: KeycloakAuthState) => void) | null = null;

    /**
     * Initialize Keycloak with tenant-specific realm
     * Realm naming convention: realm = tenant.subdomain
     */
    async initialize(
        tenant: TenantInfo,
        onAuthStateChange?: (state: KeycloakAuthState) => void
    ): Promise<boolean> {
        this.tenant = tenant;
        this.onAuthChange = onAuthStateChange || null;

        const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080';
        const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'school-frontend';
        
        // Realm is tenant subdomain
        const realm = tenant.subdomain;

        console.log(`[Keycloak] Initializing for realm: ${realm}`);

        this.keycloak = new Keycloak({
            url: keycloakUrl,
            realm: realm,
            clientId: clientId,
        });

        try {
            const authenticated = await this.keycloak.init({
                onLoad: 'check-sso',
                pkceMethod: 'S256',
                checkLoginIframe: false,
                silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
                responseMode: 'query',
                flow: 'standard',
            });

            if (authenticated && this.keycloak.token) {
                this.setupTokenRefresh();
                this.notifyAuthChange({
                    isAuthenticated: true,
                    isLoading: false,
                    user: this.extractUser(),
                    token: this.keycloak.token,
                    error: null,
                });
            } else {
                this.notifyAuthChange({
                    isAuthenticated: false,
                    isLoading: false,
                    user: null,
                    token: null,
                    error: null,
                });
            }

            return authenticated;
        } catch (error) {
            console.error('[Keycloak] Initialization failed:', error);
            this.notifyAuthChange({
                isAuthenticated: false,
                isLoading: false,
                user: null,
                token: null,
                error: error instanceof Error ? error.message : 'Keycloak initialization failed',
            });
            return false;
        }
    }

    /**
     * Login - redirects to Keycloak login page
     */
    login(options?: { redirectUri?: string }): void {
        if (!this.keycloak) {
            console.error('[Keycloak] Not initialized');
            return;
        }

        this.keycloak.login({
            redirectUri: options?.redirectUri || window.location.href,
        });
    }

    /**
     * Logout - clears session and redirects to Keycloak logout
     */
    logout(options?: { redirectUri?: string }): void {
        if (!this.keycloak) {
            console.error('[Keycloak] Not initialized');
            return;
        }

        this.clearRefreshTimer();
        
        this.keycloak.logout({
            redirectUri: options?.redirectUri || window.location.origin + '/login',
        });
    }

    /**
     * Get current access token
     */
    getToken(): string | null {
        return this.keycloak?.token || null;
    }

    /**
     * Get current refresh token
     */
    getRefreshToken(): string | null {
        return this.keycloak?.refreshToken || null;
    }

    /**
     * Check if authenticated
     */
    isAuthenticated(): boolean {
        return this.keycloak?.authenticated || false;
    }

    /**
     * Get user info from token
     */
    getUser(): KeycloakUser | null {
        return this.extractUser();
    }

    /**
     * Update token (refresh if needed)
     */
    async updateToken(minValidity: number = 30): Promise<boolean> {
        if (!this.keycloak) {
            return false;
        }

        try {
            const refreshed = await this.keycloak.updateToken(minValidity);
            if (refreshed) {
                console.log('[Keycloak] Token refreshed');
                this.notifyAuthChange({
                    isAuthenticated: true,
                    isLoading: false,
                    user: this.extractUser(),
                    token: this.keycloak.token || null,
                    error: null,
                });
            }
            return refreshed;
        } catch (error) {
            console.error('[Keycloak] Token refresh failed:', error);
            this.logout();
            return false;
        }
    }

    /**
     * Check if user has role
     */
    hasRole(role: string): boolean {
        if (!this.keycloak) return false;
        return this.keycloak.hasRealmRole(role);
    }

    /**
     * Check if user has any of the specified roles
     */
    hasAnyRole(roles: string[]): boolean {
        return roles.some(role => this.hasRole(role));
    }

    /**
     * Get realm roles
     */
    getRoles(): string[] {
        if (!this.keycloak?.tokenParsed) return [];
        return (this.keycloak.tokenParsed as any).realm_access?.roles || [];
    }

    /**
     * Get tenant info
     */
    getTenant(): TenantInfo | null {
        return this.tenant;
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    private extractUser(): KeycloakUser | null {
        if (!this.keycloak?.tokenParsed) return null;

        const token = this.keycloak.tokenParsed as any;
        const roles = token.realm_access?.roles || [];

        return {
            id: token.sub,
            email: token.email || token.preferred_username || '',
            username: token.preferred_username || token.email || '',
            firstName: token.given_name,
            lastName: token.family_name,
            roles: roles,
            tenantId: this.tenant?.id,
        };
    }

    private setupTokenRefresh(): void {
        this.clearRefreshTimer();

        if (!this.keycloak?.tokenParsed?.exp) return;

        const expiresIn = (this.keycloak.tokenParsed.exp * 1000) - Date.now() - 30000; // 30s buffer

        if (expiresIn > 0) {
            this.refreshTimer = setTimeout(() => {
                this.updateToken();
            }, expiresIn);
        }
    }

    private clearRefreshTimer(): void {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    private notifyAuthChange(state: KeycloakAuthState): void {
        if (this.onAuthChange) {
            this.onAuthChange(state);
        }
    }
}

// Export singleton instance
export const keycloakAuthService = new KeycloakAuthService();

// Export for testing
export { KeycloakAuthService };