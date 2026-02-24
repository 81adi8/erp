/**
 * TASK-E1.1 — Identity Provider Abstraction Layer
 *
 * Defines the contract every auth provider must implement.
 * Today: PasswordIdentityProvider + RootAdminProvider
 * Tomorrow: SSOIdentityProvider (Keycloak / Azure AD / Google Workspace)
 *
 * AuthService calls this layer — never raw password logic directly.
 */

import type { Request } from 'express';

// ─── Core identity types ──────────────────────────────────────────────────────

export type AuthProviderType = 'password' | 'keycloak' | 'google' | 'azure' | 'root';

export interface IdentityCredentials {
    email: string;
    password?: string;
    ssoToken?: string;
    provider: AuthProviderType;
}

export interface IdentityUser {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    roles: string[];
    institutionId?: string;
    isActive: boolean;
    isEmailVerified: boolean;
    authProvider: AuthProviderType;
    mfaEnabled: boolean;
    mfaVerifiedAt?: Date;
    requiresMfa: boolean;
}

export interface IssuedTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    mfaPending?: boolean;   // true = partial token, MFA step required
    mfaToken?: string;      // short-lived token for MFA challenge
}

export interface SessionContext {
    sessionId: string;
    deviceId?: string;
    ip: string;
    userAgent: string;
    deviceType?: string;
    geoRegion?: string;
    userAgentHash?: string;
    isNewDevice?: boolean;
}

export interface VerifiedSession {
    valid: boolean;
    userId?: string;
    sessionId?: string;
    mfaVerified?: boolean;
    error?: string;
}

// ─── Identity Provider Interface ─────────────────────────────────────────────

export interface IIdentityProvider {
    readonly providerType: AuthProviderType;

    /**
     * Authenticate credentials and return identity user.
     * Throws on invalid credentials.
     */
    authenticate(
        credentials: IdentityCredentials,
        req: Request,
        schemaName: string
    ): Promise<IdentityUser>;

    /**
     * Verify a session token and return session state.
     */
    verifySession(token: string): Promise<VerifiedSession>;

    /**
     * Issue access + refresh tokens for an authenticated user.
     */
    issueTokens(
        user: IdentityUser,
        sessionContext: SessionContext,
        schemaName: string
    ): Promise<IssuedTokens>;

    /**
     * Revoke a session by ID.
     */
    revokeSession(sessionId: string, schemaName: string, reason?: string): Promise<void>;
}

// ─── Provider Registry ────────────────────────────────────────────────────────

const _registry = new Map<AuthProviderType, IIdentityProvider>();

export const IdentityProviderRegistry = {
    register(provider: IIdentityProvider): void {
        _registry.set(provider.providerType, provider);
    },

    get(type: AuthProviderType): IIdentityProvider {
        const p = _registry.get(type);
        if (!p) throw new Error(`[IdentityProvider] No provider registered for type: ${type}`);
        return p;
    },

    has(type: AuthProviderType): boolean {
        return _registry.has(type);
    },

    /**
     * Resolve provider from user's auth_provider field.
     * Falls back to 'password' for legacy users without auth_provider set.
     */
    resolveForUser(authProvider?: string | null): IIdentityProvider {
        const type = (authProvider as AuthProviderType) || 'password';
        if (!_registry.has(type)) {
            // SSO provider not yet configured — fall back gracefully
            throw new Error(`AUTH_PROVIDER_NOT_CONFIGURED:${type}`);
        }
        return _registry.get(type)!;
    },
};
