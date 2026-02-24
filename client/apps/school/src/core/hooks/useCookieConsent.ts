// ============================================================================
// useCookieConsent Hook - React hook for cookie consent management
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
    CookieConsentManager,
    type StorageStrategy
} from '../storage/CookieConsentManager';

// ============================================================================
// Types
// ============================================================================

export interface UseCookieConsentReturn {
    /** Whether user has granted consent (null = not yet checked) */
    hasConsent: boolean | null;
    /** Whether consent state is being loaded */
    isLoading: boolean;
    /** Whether browser allows cookies */
    cookiesEnabled: boolean;
    /** Whether user has made any consent choice */
    hasConsentChoice: boolean;
    /** Current storage strategy based on consent */
    currentStrategy: StorageStrategy;
    /** Current tenant subdomain */
    tenantSubdomain: string | null;
    /** Grant cookie consent */
    grantConsent: () => void;
    /** Revoke cookie consent */
    revokeConsent: () => void;
    /** Clear consent (will ask again) */
    clearConsent: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * useCookieConsent - React hook for managing cookie consent
 * 
 * @example
 * ```tsx
 * function LoginPage() {
 *     const { hasConsent, grantConsent, revokeConsent, currentStrategy } = useCookieConsent();
 * 
 *     if (hasConsent === null) {
 *         return <ConsentBanner onAccept={grantConsent} onDecline={revokeConsent} />;
 *     }
 * 
 *     return <LoginForm storageStrategy={currentStrategy} />;
 * }
 * ```
 */
export function useCookieConsent(): UseCookieConsentReturn {
    const [hasConsent, setHasConsent] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [cookiesEnabled, setCookiesEnabled] = useState(true);
    const [hasConsentChoice, setHasConsentChoice] = useState(false);
    const [currentStrategy, setCurrentStrategy] = useState<StorageStrategy>('secure-local-storage');
    const [tenantSubdomain, setTenantSubdomain] = useState<string | null>(null);

    // Initialize state on mount
    useEffect(() => {
        const initializeState = () => {
            try {
                setCookiesEnabled(CookieConsentManager.areCookiesEnabled());
                setHasConsent(CookieConsentManager.hasConsent());
                setHasConsentChoice(CookieConsentManager.hasConsentChoice());
                setCurrentStrategy(CookieConsentManager.getStorageStrategy());
                setTenantSubdomain(CookieConsentManager.getTenantSubdomain());
            } catch (error) {
                console.error('Failed to initialize cookie consent state:', error);
                setCurrentStrategy('secure-local-storage');
            } finally {
                setIsLoading(false);
            }
        };

        initializeState();
    }, []);

    // Grant consent handler
    const grantConsent = useCallback(() => {
        try {
            CookieConsentManager.grantConsent();
            setHasConsent(true);
            setHasConsentChoice(true);
            setCurrentStrategy(CookieConsentManager.getStorageStrategy());
        } catch (error) {
            console.error('Failed to grant cookie consent:', error);
        }
    }, []);

    // Revoke consent handler
    const revokeConsent = useCallback(() => {
        try {
            CookieConsentManager.revokeConsent();
            setHasConsent(false);
            setHasConsentChoice(true);
            setCurrentStrategy('secure-local-storage');
        } catch (error) {
            console.error('Failed to revoke cookie consent:', error);
        }
    }, []);

    // Clear consent handler (reset to ask again)
    const clearConsent = useCallback(() => {
        try {
            CookieConsentManager.clearConsent();
            setHasConsent(null);
            setHasConsentChoice(false);
            setCurrentStrategy('secure-local-storage');
        } catch (error) {
            console.error('Failed to clear cookie consent:', error);
        }
    }, []);

    return {
        hasConsent,
        isLoading,
        cookiesEnabled,
        hasConsentChoice,
        currentStrategy,
        tenantSubdomain,
        grantConsent,
        revokeConsent,
        clearConsent,
    };
}

// ============================================================================
// Additional Hooks
// ============================================================================

/**
 * useStorageStrategy - Simple hook that just returns current storage strategy
 */
export function useStorageStrategy(): StorageStrategy {
    const [strategy, setStrategy] = useState<StorageStrategy>(() =>
        CookieConsentManager.getStorageStrategy()
    );

    useEffect(() => {
        // Update strategy when consent might have changed
        const checkStrategy = () => {
            setStrategy(CookieConsentManager.getStorageStrategy());
        };

        // Check on focus in case consent changed in another tab
        window.addEventListener('focus', checkStrategy);

        return () => {
            window.removeEventListener('focus', checkStrategy);
        };
    }, []);

    return strategy;
}
