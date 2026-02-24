import { env } from '../../config/env';

/**
 * Utilities for Tenant management, naming conventions and URL generation
 */
export class TenantUtil {
    /**
     * Generate a consistent DB schema name from a tenant slug
     */
    static generateSchemaName(slug: string): string {
        return `tenant_${slug.replace(/-/g, '_').replace(/[^a-z0-9_]/gi, '').toLowerCase()}`;
    }

    /**
     * Generate a Keycloak realm name from tenant identity.
     * Realm naming must stay aligned with runtime tenant resolution
     * (subdomain-first) to avoid token issuer mismatches.
     */
    static generateRealmName(identity: string): string {
        const normalized = identity
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        return normalized || 'tenant';
    }

    /**
     * Generate the frontend URL for a tenant based on subdomain
     */
    static generateTenantUrl(subdomain: string): string {
        const { domains, nodeEnv } = env;
        if (nodeEnv === 'development') {
            return `http://${subdomain}.localhost:5173`;
        }
        return `https://${subdomain}.${domains.rootDomain}`;
    }

    /**
     * Sanitize a slug for use in various identifiers
     */
    static sanitizeSlug(slug: string): string {
        return slug.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }
}
