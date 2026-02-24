// ============================================================================
// Cookie Consent Manager - Secure Storage Strategy with Tenant Isolation
// ============================================================================

import { parseSubdomain, getTenantCookieDomain } from '../tenant/tenantUtils';

// ============================================================================
// Types
// ============================================================================

export type StorageStrategy = 'httponly-cookies' | 'secure-local-storage';

export interface CookieConsentState {
    hasConsent: boolean;
    strategy: StorageStrategy;
    tenantDomain: string;
    cookiesEnabled: boolean;
}

// ============================================================================
// Cookie Consent Manager
// ============================================================================

/**
 * CookieConsentManager - Manages cookie consent and storage strategy
 * 
 * Features:
 * - Detects if browser allows cookies
 * - Tracks user consent per-tenant (raj.localhost vs vdj.localhost have separate consent)
 * - Returns appropriate storage strategy based on consent + capability
 * - Provides tenant-specific cookie domain for proper isolation
 */
export class CookieConsentManager {
    private static CONSENT_KEY = 'cookie_consent';
    private static CONSENT_GRANTED = 'granted';
    private static CONSENT_DENIED = 'denied';

    // ========================================================================
    // Tenant Cookie Domain
    // ========================================================================

    /**
     * Get the tenant-specific cookie domain for isolation
     * - raj.localhost for raj.localhost:5173
     * - vdj.localhost for vdj.localhost:5173
     * - raj.schoolerp.com for production
     */
    static getTenantCookieDomain(): string {
        return getTenantCookieDomain();
    }

    /**
     * Get current tenant subdomain
     */
    static getTenantSubdomain(): string | null {
        const { subdomain } = parseSubdomain();
        return subdomain;
    }

    // ========================================================================
    // Cookie Capability Detection
    // ========================================================================

    /**
     * Check if browser supports and allows cookies
     * Tests by setting and reading a test cookie
     */
    static areCookiesEnabled(): boolean {
        try {
            // Try to set a test cookie
            const testKey = '__cookie_test_' + Date.now();
            document.cookie = `${testKey}=1; path=/`;

            // Check if it was set
            const enabled = document.cookie.includes(testKey);

            // Clean up test cookie
            document.cookie = `${testKey}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;

            return enabled;
        } catch {
            return false;
        }
    }

    /**
     * Check if third-party cookies are blocked
     * This is harder to detect accurately, so we use a heuristic
     */
    static areThirdPartyCookiesBlocked(): boolean {
        // In a same-origin context, this shouldn't affect us
        // But we can detect some restrictive settings
        try {
            // Check if storage access API exists (indicates restrictive environment)
            if ('hasStorageAccess' in document) {
                return true; // Storage Access API indicates restrictions may apply
            }
            return false;
        } catch {
            return false;
        }
    }

    // ========================================================================
    // Consent Management (Per-Tenant)
    // ========================================================================

    /**
     * Get the storage key for consent (tenant-scoped)
     * Uses localStorage which doesn't require consent
     */
    private static getConsentKey(): string {
        const subdomain = this.getTenantSubdomain() || 'main';
        return `${subdomain}:${this.CONSENT_KEY}`;
    }

    /**
     * Check if user has granted consent for cookies
     * Consent is stored per-tenant in localStorage
     */
    static hasConsent(): boolean {
        try {
            const consentKey = this.getConsentKey();
            return localStorage.getItem(consentKey) === this.CONSENT_GRANTED;
        } catch {
            return false;
        }
    }

    /**
     * Check if user has explicitly denied consent
     */
    static hasExplicitlyDenied(): boolean {
        try {
            const consentKey = this.getConsentKey();
            return localStorage.getItem(consentKey) === this.CONSENT_DENIED;
        } catch {
            return false;
        }
    }

    /**
     * Check if user has made any consent choice
     */
    static hasConsentChoice(): boolean {
        try {
            const consentKey = this.getConsentKey();
            const value = localStorage.getItem(consentKey);
            return value === this.CONSENT_GRANTED || value === this.CONSENT_DENIED;
        } catch {
            return false;
        }
    }

    /**
     * Grant cookie consent for current tenant
     */
    static grantConsent(): void {
        try {
            const consentKey = this.getConsentKey();
            localStorage.setItem(consentKey, this.CONSENT_GRANTED);
        } catch (error) {
            console.warn('Failed to store cookie consent:', error);
        }
    }

    /**
     * Revoke/Deny cookie consent for current tenant
     */
    static revokeConsent(): void {
        try {
            const consentKey = this.getConsentKey();
            localStorage.setItem(consentKey, this.CONSENT_DENIED);
        } catch (error) {
            console.warn('Failed to store cookie consent revocation:', error);
        }
    }

    /**
     * Clear consent choice for current tenant (reset to ask again)
     */
    static clearConsent(): void {
        try {
            const consentKey = this.getConsentKey();
            localStorage.removeItem(consentKey);
        } catch (error) {
            console.warn('Failed to clear cookie consent:', error);
        }
    }

    // ========================================================================
    // Storage Strategy
    // ========================================================================

    /**
     * Check if API is on a different origin (cross-origin)
     * Cross-origin cookies have issues in development
     */
    static isCrossOriginAPI(): boolean {
        try {
            const windowWithApiBase = window as Window & { __API_BASE_URL__?: string };
            // Get the API base URL from environment or default
            const apiUrl = windowWithApiBase.__API_BASE_URL__ ||
                import.meta.env?.VITE_API_BASE_URL ||
                'http://localhost:3000';

            const apiOrigin = new URL(apiUrl).origin;
            const frontendOrigin = window.location.origin;

            // Different origins = cross-origin
            return apiOrigin !== frontendOrigin;
        } catch {
            // Assume cross-origin if we can't determine
            return true;
        }
    }

    /**
     * Get the current storage strategy based on consent, capability, and origin
     * - 'httponly-cookies': Most secure, uses httpOnly cookies for tokens
     * - 'secure-local-storage': Fallback, uses encrypted localStorage
     * 
     * NOTE: Cross-origin setups (frontend on vdm.localhost:5173, API on localhost:3000)
     * MUST use localStorage because the API cannot set cookies for a different domain.
     */
    static getStorageStrategy(): StorageStrategy {
        // IMPORTANT: Cross-origin API setups cannot use httpOnly cookies
        // because the server cannot set cookies for a different domain
        if (this.isCrossOriginAPI()) {
            return 'secure-local-storage';
        }

        // If cookies are enabled AND user has granted consent, use httpOnly cookies
        if (this.areCookiesEnabled() && this.hasConsent()) {
            return 'httponly-cookies';
        }

        // Fallback to secure local storage
        return 'secure-local-storage';
    }

    /**
     * Check if currently using httpOnly cookies for auth
     */
    static isUsingHttpOnlyCookies(): boolean {
        return this.getStorageStrategy() === 'httponly-cookies';
    }

    /**
     * Check if currently using secure local storage for auth
     */
    static isUsingLocalStorage(): boolean {
        return this.getStorageStrategy() === 'secure-local-storage';
    }

    // ========================================================================
    // Full State
    // ========================================================================

    /**
     * Get complete consent state for debugging/UI
     */
    static getConsentState(): CookieConsentState {
        return {
            hasConsent: this.hasConsent(),
            strategy: this.getStorageStrategy(),
            tenantDomain: this.getTenantCookieDomain(),
            cookiesEnabled: this.areCookiesEnabled(),
        };
    }
}

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Get current storage strategy
 */
export function getStorageStrategy(): StorageStrategy {
    return CookieConsentManager.getStorageStrategy();
}

/**
 * Check if using httpOnly cookies
 */
export function isUsingHttpOnlyCookies(): boolean {
    return CookieConsentManager.isUsingHttpOnlyCookies();
}

/**
 * Check if cookies are enabled in browser
 */
export function areCookiesEnabled(): boolean {
    return CookieConsentManager.areCookiesEnabled();
}
