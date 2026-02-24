/**
 * TASK-E1.1 — SSO Identity Provider (STUB — Future Implementation)
 *
 * Placeholder for Keycloak / Azure AD / Google Workspace SSO.
 * Registered in the IdentityProviderRegistry when SSO is configured.
 *
 * When E1.2 (Secret Management) and SSO configuration is ready:
 *   1. Replace stub methods with real OIDC/SAML flows
 *   2. Register per-tenant SSO config in DB
 *   3. Route users with auth_provider != 'password' here
 *
 * Architecture contract: AuthService calls IdentityProviderRegistry.resolveForUser()
 * — no changes to AuthService needed when SSO goes live.
 */

import type { Request } from 'express';
import {
    IIdentityProvider,
    IdentityCredentials,
    IdentityUser,
    IssuedTokens,
    SessionContext,
    VerifiedSession,
    AuthProviderType,
} from '../identity.provider';

export class SSOIdentityProvider implements IIdentityProvider {
    readonly providerType: AuthProviderType;

    constructor(providerType: 'keycloak' | 'google' | 'azure') {
        this.providerType = providerType;
    }

    async authenticate(
        credentials: IdentityCredentials,
        req: Request,
        schemaName: string
    ): Promise<IdentityUser> {
        // TODO (E1.2): Implement OIDC token exchange
        // 1. Validate ssoToken against provider's JWKS endpoint
        // 2. Extract user claims from ID token
        // 3. Upsert user in tenant schema (JIT provisioning)
        // 4. Return IdentityUser

        throw Object.assign(
            new Error(`SSO provider '${this.providerType}' is not yet configured for this tenant`),
            { code: 'SSO_NOT_CONFIGURED', provider: this.providerType }
        );
    }

    async verifySession(token: string): Promise<VerifiedSession> {
        // TODO (E1.2): Verify token against SSO provider's introspection endpoint
        return { valid: false, error: 'SSO session verification not implemented' };
    }

    async issueTokens(
        user: IdentityUser,
        sessionContext: SessionContext,
        schemaName: string
    ): Promise<IssuedTokens> {
        // TODO (E1.2): Issue ERP-native tokens after SSO verification
        throw new Error('SSO token issuance not implemented');
    }

    async revokeSession(sessionId: string, schemaName: string, reason?: string): Promise<void> {
        // TODO (E1.2): Optionally back-channel logout to SSO provider
        // For now, just revoke the local session
        const { SessionService } = await import('../../../modules/auth/session.service');
        await SessionService.revokeSession(sessionId, schemaName, reason || 'SSO logout');
    }
}

/**
 * SSO Provider configuration per tenant.
 * Stored in DB (tenant metadata or dedicated SSO config table).
 * Used by IdentityProviderRegistry to route SSO users.
 */
export interface TenantSSOConfig {
    tenantId: string;
    provider: 'keycloak' | 'google' | 'azure';
    issuerUrl: string;
    clientId: string;
    clientSecret?: string;  // Stored in Vault (E1.2)
    jwksUri?: string;
    scopes: string[];
    enabled: boolean;
}
