// Feature Flag Context and Provider
import { createContext, useContext, useMemo, useCallback, type ReactNode } from 'react';
import { useTenant } from '../tenant';
import { DEFAULT_FEATURE_FLAGS } from '../config/featureFlags';

// Feature flag context type
interface FeatureFlagContextType {
    flags: Record<string, boolean>;
    isEnabled: (flagKey: string) => boolean;
    isDisabled: (flagKey: string) => boolean;
    hasAnyEnabled: (flagKeys: string[]) => boolean;
    hasAllEnabled: (flagKeys: string[]) => boolean;
}

// Create context
const FeatureFlagContext = createContext<FeatureFlagContextType | null>(null);

// Provider props
interface FeatureFlagProviderProps {
    children: ReactNode;
    overrides?: Record<string, boolean>;
}

// Feature Flag Provider
export function FeatureFlagProvider({ children, overrides = {} }: FeatureFlagProviderProps) {
    const { tenant } = useTenant();

    // Merge flags: defaults < tenant flags < overrides
    const flags = useMemo(() => ({
        ...DEFAULT_FEATURE_FLAGS,
        ...(tenant?.settings?.featureFlags || {}),
        ...overrides,
    }), [tenant?.settings?.featureFlags, overrides]);

    // Check if a flag is enabled
    const isEnabled = useCallback((flagKey: string): boolean => {
        return flags[flagKey] === true;
    }, [flags]);

    // Check if a flag is disabled
    const isDisabled = useCallback((flagKey: string): boolean => {
        return flags[flagKey] !== true;
    }, [flags]);

    // Check if any of the flags are enabled
    const hasAnyEnabled = useCallback((flagKeys: string[]): boolean => {
        return flagKeys.some(key => flags[key] === true);
    }, [flags]);

    // Check if all flags are enabled
    const hasAllEnabled = useCallback((flagKeys: string[]): boolean => {
        return flagKeys.every(key => flags[key] === true);
    }, [flags]);

    const value = useMemo(() => ({
        flags,
        isEnabled,
        isDisabled,
        hasAnyEnabled,
        hasAllEnabled,
    }), [flags, isEnabled, isDisabled, hasAnyEnabled, hasAllEnabled]);

    return (
        <FeatureFlagContext.Provider value={value}>
            {children}
        </FeatureFlagContext.Provider>
    );
}

// Hook to use feature flags
export function useFeatureFlags(): FeatureFlagContextType {
    const context = useContext(FeatureFlagContext);
    if (!context) {
        throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
    }
    return context;
}

// Convenience hook for single flag check
export function useFeatureFlag(flagKey: string): boolean {
    const { isEnabled } = useFeatureFlags();
    return isEnabled(flagKey);
}

// Export context for testing
export { FeatureFlagContext };
