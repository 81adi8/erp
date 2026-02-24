import { env } from './env';

/**
 * Centralized Keycloak Configuration for the Client
 */
export const KEYCLOAK_CONFIG = {
    url: env.KEYCLOAK.URL,
    realm: env.KEYCLOAK.REALM,
    clientId: env.KEYCLOAK.CLIENT_ID,

    // Auth Flow settings
    redirectUri: window.location.origin,

    // Helper to generate realm-specific OIDC endpoints
    getEndpoints: (realmName?: string) => {
        const realm = realmName || env.KEYCLOAK.REALM;
        const baseUrl = `${env.KEYCLOAK.URL}/realms/${realm}/protocol/openid-connect`;

        return {
            token: `${baseUrl}/token`,
            auth: `${baseUrl}/auth`,
            logout: `${baseUrl}/logout`,
            userInfo: `${baseUrl}/userinfo`,
            certs: `${baseUrl}/certs`,
        };
    },

    // Helper to generate a consistent realm name from a tenant slug/subdomain
    generateRealmName: (slug: string) => {
        return `tenant_${slug.replace(/-/g, '_').toLowerCase()}`;
    },

    // Scopes used for authentication
    scopes: 'openid profile email',
};

export default KEYCLOAK_CONFIG;
