import { env } from './env';
import { logger } from '../core/utils/logger';

const isProductionLike = env.nodeEnv === 'production' || env.nodeEnv === 'staging';

const enforceOrWarn = (violations: string[]): void => {
    if (violations.length === 0) return;

    const message = violations.map(v => `- ${v}`).join('\n');
    if (env.envValidationMode === 'enforce' || isProductionLike) {
        throw new Error(`[Keycloak Config] Unsafe configuration detected:\n${message}`);
    }

    logger.warn(`[Keycloak Config] Unsafe configuration warnings:\n${message}`);
};

export const assertKeycloakRuntimeConfig = (): void => {
    const violations: string[] = [];

    if (!env.keycloak.url) violations.push('KEYCLOAK_URL is missing');
    if (!env.keycloak.realm) violations.push('KEYCLOAK_REALM is missing');
    if (!env.keycloak.clientId) violations.push('KEYCLOAK_CLIENT_ID is missing');
    if (!env.keycloak.clientSecret) violations.push('KEYCLOAK_CLIENT_SECRET is missing');
    if (!env.keycloak.adminClientId) violations.push('KEYCLOAK_ADMIN_CLIENT_ID is missing');
    if (!env.keycloak.adminUsername) violations.push('KEYCLOAK_ADMIN_USERNAME is missing');
    if (!env.keycloak.adminPassword) violations.push('KEYCLOAK_ADMIN_PASSWORD is missing');

    if (isProductionLike && env.keycloak.url && !env.keycloak.url.startsWith('https://')) {
        violations.push('KEYCLOAK_URL must use https in staging/production');
    }

    if (
        isProductionLike &&
        env.keycloak.adminUsername?.toLowerCase() === 'admin' &&
        env.keycloak.adminPassword?.toLowerCase() === 'admin'
    ) {
        violations.push('KEYCLOAK admin/admin credentials are forbidden in staging/production');
    }

    if (isProductionLike && env.keycloak.adminClientId?.toLowerCase() === 'admin-cli') {
        violations.push('KEYCLOAK admin-cli client is forbidden in staging/production');
    }

    enforceOrWarn(violations);
};

/**
 * Centralized Keycloak Configuration for the Server
 */
export const KEYCLOAK_CONFIG = {
    url: env.keycloak.url!,
    realm: env.keycloak.realm!,
    clientId: env.keycloak.clientId!,
    admin: {
        clientId: env.keycloak.adminClientId!,
        username: env.keycloak.adminUsername!,
        password: env.keycloak.adminPassword!,
    },
    clientSecret: env.keycloak.clientSecret!,

    // Helper to generate realm-specific OIDC endpoints
    getEndpoints: (realmName?: string) => {
        const realm = realmName || env.keycloak.realm;
        const baseUrl = `${env.keycloak.url}/realms/${realm}/protocol/openid-connect`;

        return {
            token: `${baseUrl}/token`,
            auth: `${baseUrl}/auth`,
            logout: `${baseUrl}/logout`,
            userInfo: `${baseUrl}/userinfo`,
            certs: `${baseUrl}/certs`,
            jwks: `${baseUrl}/certs`,
        };
    },

    // Default settings for new realms
    realmDefaults: {
        enabled: true,
        registrationAllowed: false,
        resetPasswordAllowed: true,
        rememberMe: true,
        verifyEmail: false,
        loginWithEmailAllowed: true,
        registrationEmailAsUsername: true,
        duplicateEmailsAllowed: false,
        passwordPolicy: "", // Reset any global complexity that might force password changes
    },

    // Default settings for new users (ensure no setup is needed)
    userDefaults: {
        enabled: true,
        emailVerified: true,
        requiredActions: [],
        firstName: 'Admin',
        lastName: 'User',
    },

    // Default settings for new clients
    clientDefaults: {
        enabled: true,
        protocol: 'openid-connect',
        publicClient: false,
        baseUrl: '/',
        standardFlowEnabled: true,
        directAccessGrantsEnabled: false,
    },

    // Standard Required Action aliases to disable at the realm level
    requiredActionAliases: [
        'VERIFY_EMAIL',
        'UPDATE_PROFILE',
        'UPDATE_PASSWORD',
        'CONFIGURE_TOTP',
        'terms_and_conditions'
    ]
};

// Module-load safety assertion (fail-fast in enforce mode)
assertKeycloakRuntimeConfig();

export default KEYCLOAK_CONFIG;
