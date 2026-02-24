// ============================================================================
// Cookie Consent Banner - GDPR Compliant Cookie Notice
// ============================================================================

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Shield, X, Check, Settings } from 'lucide-react';
import { useCookieConsent } from '../../core/hooks/useCookieConsent';

// ============================================================================
// Types
// ============================================================================

interface CookieConsentBannerProps {
    /** Position of the banner */
    position?: 'bottom' | 'top';
    /** Custom privacy policy URL */
    privacyPolicyUrl?: string;
    /** Custom cookie policy URL */
    cookiePolicyUrl?: string;
    /** Show detailed settings option */
    showSettings?: boolean;
    /** Compact mode for minimal display */
    compact?: boolean;
    /** Custom className for styling */
    className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function CookieConsentBanner({
    position = 'bottom',
    privacyPolicyUrl = '/privacy-policy',
    cookiePolicyUrl = '/cookie-policy',
    showSettings = true,
    compact = false,
    className = '',
}: CookieConsentBannerProps) {
    const {
        hasConsentChoice,
        isLoading,
        cookiesEnabled,
        currentStrategy,
        grantConsent,
        revokeConsent,
    } = useCookieConsent();

    const [showDetails, setShowDetails] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // Show banner only if user hasn't made a choice yet
    useEffect(() => {
        if (!isLoading && !hasConsentChoice) {
            // Small delay for smoother appearance
            const timer = setTimeout(() => setIsVisible(true), 500);
            return () => clearTimeout(timer);
        }
    }, [isLoading, hasConsentChoice]);

    // Don't render if loading or user has already made a choice
    if (isLoading || hasConsentChoice) {
        return null;
    }

    const handleAcceptAll = () => {
        grantConsent();
        setIsVisible(false);
    };

    const handleRejectNonEssential = () => {
        revokeConsent();
        setIsVisible(false);
    };

    const positionClasses = position === 'bottom'
        ? 'bottom-0 left-0 right-0'
        : 'top-0 left-0 right-0';

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: position === 'bottom' ? 100 : -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: position === 'bottom' ? 100 : -100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className={`
                        fixed ${positionClasses} z-[9999]
                        mx-4 mb-4 rounded-xl
                        bg-white/95 dark:bg-gray-900/95 
                        backdrop-blur-lg
                        border border-gray-200 dark:border-gray-700
                        shadow-2xl
                        ${className}
                    `}
                    role="dialog"
                    aria-label="Cookie consent"
                    aria-describedby="cookie-consent-description"
                >
                    <div className="p-4 md:p-6">
                        {/* Header */}
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
                                <Cookie className="w-6 h-6 text-primary" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    We use cookies
                                </h2>
                                <p
                                    id="cookie-consent-description"
                                    className="mt-1 text-sm text-gray-600 dark:text-gray-400"
                                >
                                    {compact ? (
                                        'We use cookies to enhance your experience.'
                                    ) : (
                                        <>
                                            We use cookies to enhance your browsing experience,
                                            provide personalized content, and analyze our traffic.
                                            By clicking "Accept All", you consent to our use of cookies.
                                        </>
                                    )}
                                </p>

                                {/* Details Section */}
                                <AnimatePresence>
                                    {showDetails && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-4 space-y-3">
                                                {/* Essential Cookies */}
                                                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                    <Shield className="w-5 h-5 text-green-500 mt-0.5" />
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                                            Essential Cookies
                                                            <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                                                                (Always Active)
                                                            </span>
                                                        </h4>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            Required for authentication, security, and core functionality.
                                                            These cannot be disabled.
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Analytics Cookies */}
                                                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                    <Cookie className="w-5 h-5 text-blue-500 mt-0.5" />
                                                    <div>
                                                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                                            Performance & Analytics
                                                        </h4>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            Help us understand how you use our site to improve performance.
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Current Strategy Info */}
                                                <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                    <strong>Current mode:</strong>{' '}
                                                    {currentStrategy === 'httponly-cookies'
                                                        ? 'Secure cookies (recommended)'
                                                        : 'Local storage (cross-origin mode)'
                                                    }
                                                    {!cookiesEnabled && (
                                                        <span className="text-amber-500 ml-2">
                                                            (Cookies are blocked in your browser)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Links */}
                                <div className="mt-3 flex flex-wrap gap-4 text-xs">
                                    <a
                                        href={privacyPolicyUrl}
                                        className="text-primary hover:underline"
                                    >
                                        Privacy Policy
                                    </a>
                                    <a
                                        href={cookiePolicyUrl}
                                        className="text-primary hover:underline"
                                    >
                                        Cookie Policy
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-end">
                            {showSettings && (
                                <button
                                    onClick={() => setShowDetails(!showDetails)}
                                    className="
                                        flex items-center justify-center gap-2 
                                        px-4 py-2 text-sm font-medium
                                        text-gray-700 dark:text-gray-300
                                        hover:bg-gray-100 dark:hover:bg-gray-800
                                        rounded-lg transition-colors
                                    "
                                >
                                    <Settings className="w-4 h-4" />
                                    {showDetails ? 'Hide Details' : 'Cookie Settings'}
                                </button>
                            )}

                            <button
                                onClick={handleRejectNonEssential}
                                className="
                                    flex items-center justify-center gap-2
                                    px-4 py-2 text-sm font-medium
                                    text-gray-700 dark:text-gray-300
                                    border border-gray-300 dark:border-gray-600
                                    hover:bg-gray-100 dark:hover:bg-gray-800
                                    rounded-lg transition-colors
                                "
                            >
                                <X className="w-4 h-4" />
                                Reject Non-Essential
                            </button>

                            <button
                                onClick={handleAcceptAll}
                                className="
                                    flex items-center justify-center gap-2
                                    px-6 py-2 text-sm font-medium
                                    text-white bg-primary
                                    hover:bg-primary/90
                                    rounded-lg transition-colors
                                    shadow-lg shadow-primary/25
                                "
                            >
                                <Check className="w-4 h-4" />
                                Accept All
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ============================================================================
// Compact Floating Button to Re-Open Settings
// ============================================================================

interface CookieSettingsButtonProps {
    onClick?: () => void;
    className?: string;
}

export function CookieSettingsButton({
    onClick,
    className = ''
}: CookieSettingsButtonProps) {
    const { hasConsentChoice, clearConsent } = useCookieConsent();

    if (!hasConsentChoice) {
        return null; // Banner will show instead
    }

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            // Reset consent to show banner again
            clearConsent();
        }
    };

    return (
        <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClick}
            className={`
                fixed bottom-4 left-4 z-50
                p-3 rounded-full
                bg-gray-100 dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                shadow-lg
                hover:bg-gray-200 dark:hover:bg-gray-700
                transition-colors
                ${className}
            `}
            aria-label="Cookie settings"
            title="Cookie settings"
        >
            <Cookie className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </motion.button>
    );
}

export default CookieConsentBanner;
