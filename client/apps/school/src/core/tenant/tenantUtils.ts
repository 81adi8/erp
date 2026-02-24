import { env } from '../config/env';
import type { SubdomainResult } from './types';

/**
 * Parse subdomain from the current hostname
 */
export function parseSubdomain(): SubdomainResult {
    const hostname = window.location.hostname;
    const mainDomain = env.MAIN_DOMAIN.toLowerCase();

    // Handle hostname cleaning (lowercase and remove port if present)
    const cleanHostname = hostname.split(':')[0].toLowerCase();

    // 1. Exact matches for main domain or localhost
    if (cleanHostname === mainDomain || cleanHostname === 'localhost') {
        return {
            isMainDomain: true,
            subdomain: null,
            fullHostname: hostname,
        };
    }

    // 2. Subdomain check: check if hostname ends with .mainDomain
    if (cleanHostname.endsWith(`.${mainDomain}`)) {
        const subdomain = cleanHostname.slice(0, -(mainDomain.length + 1));
        return {
            isMainDomain: false,
            subdomain,
            fullHostname: hostname,
        };
    }

    // 3. Fallback for localhost subdomains (e.g., school1.localhost)
    if (cleanHostname.endsWith('.localhost')) {
        const subdomain = cleanHostname.slice(0, -'.localhost'.length);
        return {
            isMainDomain: false,
            subdomain,
            fullHostname: hostname,
        };
    }

    // Default to main domain if no subdomain pattern matches
    return {
        isMainDomain: true,
        subdomain: null,
        fullHostname: hostname,
    };
}

/**
 * Validate if a subdomain follows valid tenant naming rules
 */
export function isValidSubdomain(subdomain: string): boolean {
    // Must be alphanumeric with optional hyphens, 3-63 characters
    const subdomainRegex = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/i;
    return subdomainRegex.test(subdomain);
}

/**
 * Build tenant-specific URL
 */
export function buildTenantUrl(subdomain: string, path: string = '/'): string {
    const protocol = window.location.protocol;
    const mainDomain = env.MAIN_DOMAIN;
    const port = window.location.port ? `:${window.location.port}` : '';

    if (mainDomain === 'localhost') {
        return `${protocol}//${subdomain}.localhost${port}${path}`;
    }

    return `${protocol}//${subdomain}.${mainDomain}${port}${path}`;
}

/**
 * Get the public site URL for redirecting main domain visitors
 */
export function getPublicSiteUrl(): string {
    return env.PUBLIC_SITE_URL;
}

/**
 * Check if we should redirect to public site
 */
export function shouldRedirectToPublicSite(): boolean {
    const { isMainDomain } = parseSubdomain();
    return isMainDomain && !env.IS_DEV; // In dev, allow main domain access for testing
}

/**
 * Extract tenant identifier from cookie domain
 */
export function getTenantCookieDomain(): string {
    const { subdomain } = parseSubdomain();
    const mainDomain = env.MAIN_DOMAIN;

    if (mainDomain === 'localhost') {
        return subdomain ? `${subdomain}.localhost` : 'localhost';
    }

    return subdomain ? `${subdomain}.${mainDomain}` : mainDomain;
}
