import React from 'react';
import clsx from 'clsx';

export interface ReadOnlyOverlayProps {
    /**
     * Custom text to display in the center
     * @default "Read-Only Mode"
     */
    text?: string;
    /**
     * Optional additional CSS classes
     */
    className?: string;
    /**
     * Whether to show the overlay
     * @default true
     */
    visible?: boolean;
    /**
     * Icon pattern opacity (0-1)
     * @default 0.03
     */
    patternOpacity?: number;
    /**
     * Overlay background opacity (0-1)
     * @default 0.4
     */
    overlayOpacity?: number;
    /**
     * Icon size in the pattern
     * @default 24
     */
    iconSize?: number;
    /**
     * Spacing between icons in pattern
     * @default 60
     */
    patternSpacing?: number;
    /**
     * Variant style
     * @default "default"
     */
    variant?: 'default' | 'subtle' | 'prominent';
}

/**
 * ReadOnlyOverlay Component
 * 
 * A premium overlay component that indicates read-only/view-only mode.
 * Features an SVG pattern with lock, eye, and document icons.
 * 
 * @example
 * ```tsx
 * <div className="relative">
 *   <YourContent />
 *   <ReadOnlyOverlay visible={isReadOnly} text="View Only" />
 * </div>
 * ```
 */
export const ReadOnlyOverlay: React.FC<ReadOnlyOverlayProps> = ({
    text = 'Read-Only Mode',
    className,
    visible = true,
    patternOpacity = 0.03,
    overlayOpacity = 0.4,
    iconSize = 24,
    patternSpacing = 60,
    variant = 'default',
}) => {
    if (!visible) return null;

    const variantStyles = {
        default: {
            bg: 'bg-surface/40 dark:bg-surface-dark/50',
            border: 'border-border/20 dark:border-border-dark/30',
            text: 'text-text-secondary dark:text-text-dark-secondary',
            badge: 'bg-surface-hover dark:bg-surface-dark-hover text-text dark:text-text-dark',
        },
        subtle: {
            bg: 'bg-transparent',
            border: 'border-transparent',
            text: 'text-text-tertiary dark:text-text-dark-tertiary',
            badge: 'bg-surface/60 dark:bg-surface-dark/60 text-text-secondary dark:text-text-dark-secondary',
        },
        prominent: {
            bg: 'bg-warning/10 dark:bg-warning-dark/10',
            border: 'border-warning/20 dark:border-warning-dark/30',
            text: 'text-warning dark:text-warning-dark',
            badge: 'bg-warning/20 dark:bg-warning-dark/20 text-warning dark:text-warning-dark',
        },
    };

    const styles = variantStyles[variant];

    // Icon color - use a visible gray color with better contrast
    const iconColor = '#94a3b8'; // Slate-400 (use raw hex, it'll be encoded/b64)
    const finalPatternOpacity = patternOpacity || 0.2; // Increased default opacity

    // SVG pattern with lock, eye, and document icons
    const patternSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${patternSpacing * 3}" height="${patternSpacing * 2}" viewBox="0 0 ${patternSpacing * 3} ${patternSpacing * 2}">
    <g opacity="${finalPatternOpacity}">
        <!-- Lock Icon -->
        <g transform="translate(${patternSpacing * 0.5 - iconSize / 2}, ${patternSpacing * 0.5 - iconSize / 2})">
            <path d="M7 11V7a5 5 0 0 1 10 0v4M3 11h18v11H3z" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="16" r="1.5" fill="${iconColor}"/>
        </g>
        <!-- Eye Icon -->
        <g transform="translate(${patternSpacing * 1.5 - iconSize / 2}, ${patternSpacing * 0.5 - iconSize / 2})">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="3" fill="none" stroke="${iconColor}" stroke-width="2"/>
        </g>
        <!-- Document Icon -->
        <g transform="translate(${patternSpacing * 2.5 - iconSize / 2}, ${patternSpacing * 0.5 - iconSize / 2})">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M14 2v6h6" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <!-- Row 2: Offset pattern -->
        <g transform="translate(${patternSpacing * 1 - iconSize / 2}, ${patternSpacing * 1.5 - iconSize / 2})">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
        <g transform="translate(${patternSpacing * 2 - iconSize / 2}, ${patternSpacing * 1.5 - iconSize / 2})">
            <path d="M7 11V7a5 5 0 0 1 10 0v4M3 11h18v11H3z" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
    </g>
</svg>`;

    // Use Base64 encoding for maximum reliability in case of special characters
    const encodedPattern = typeof window !== 'undefined'
        ? window.btoa(patternSvg.trim())
        : Buffer.from(patternSvg.trim()).toString('base64');

    return (
        <div
            className={clsx(
                'absolute inset-0 z-40 pointer-events-none',
                'flex items-center justify-center overflow-hidden',
                'transition-all duration-300',
                className
            )}
            aria-hidden="true"
            role="presentation"
        >
            {/* Background Overlay */}
            <div
                className="absolute inset-0 bg-white dark:bg-slate-900"
                style={{ opacity: overlayOpacity }}
            />

            {/* SVG Pattern Background */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `url("data:image/svg+xml;base64,${encodedPattern}")`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: `${patternSpacing * 3}px ${patternSpacing * 2}px`,
                    opacity: 1,
                }}
            />

            {/* Center Badge */}
            <div
                className={clsx(
                    'relative flex items-center gap-2',
                    'px-4 py-2 rounded-full',
                    'border shadow-sm',
                    'backdrop-blur-sm',
                    styles.badge,
                    styles.border
                )}
            >
                {/* Lock Icon */}
                <svg
                    className={clsx('w-4 h-4', styles.text)}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" />
                </svg>

                {/* Text */}
                <span className={clsx('text-sm font-medium', styles.text)}>
                    {text}
                </span>

                {/* Eye Icon */}
                <svg
                    className={clsx('w-4 h-4', styles.text)}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
            </div>
        </div>
    );
};

ReadOnlyOverlay.displayName = 'ReadOnlyOverlay';
