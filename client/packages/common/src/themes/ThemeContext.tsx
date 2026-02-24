import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Theme, ThemeColors, ThemeContextValue } from './types';
import { staticThemes, defaultLightTheme } from './staticThemes';
import { APPEARANCE_LOCAL_STORAGE_KEY, DEFAULT_APPEARANCE_SETTINGS, type AppearanceState, type ThemeMode, type LayoutDensity, type SidebarStyle, type AnimationLevel, type FontSize, type FontWeight, type LineHeight, type FontStyle } from '../types/appearance';

/**
 * Theme Context
 */
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Load preferences from localStorage (Unified)
 */
const loadPreferences = (): AppearanceState => {
    try {
        const stored = localStorage.getItem(APPEARANCE_LOCAL_STORAGE_KEY);
        if (stored) {
            return {
                ...DEFAULT_APPEARANCE_SETTINGS,
                ...JSON.parse(stored)
            };
        }
    } catch {
        // Ignore
    }
    return DEFAULT_APPEARANCE_SETTINGS;
};

/**
 * Save preferences to localStorage (Unified)
 */
const savePreferences = (prefs: AppearanceState) => {
    try {
        localStorage.setItem(APPEARANCE_LOCAL_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
        // Ignore
    }
};

/**
 * Generate CSS variables from theme and preferences
 */
const applyThemeToCSSVariables = (theme: Theme, prefs: AppearanceState) => {
    const root = document.documentElement;

    // 1. Colors from Theme + Optional primaryColor override
    const colors = { ...theme.colors };
    if (prefs.primaryColor) {
        colors.primary = prefs.primaryColor;
    }

    Object.entries(colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${kebabCase(key)}`, value);
    });

    // 2. Typography
    root.style.setProperty('--font-family', prefs.fontFamily || theme.typography.fontFamily);
    root.style.setProperty('--font-family-sans', `'${prefs.fontFamily}', sans-serif`);
    root.style.setProperty('--font-family-mono', theme.typography.fontFamilyMono);

    // Font Scaling (Applied to root)
    const fontSizeMap: Record<FontSize, string> = {
        xs: '14px',
        sm: '15px',
        md: '16px',
        lg: '17px',
        xl: '18px'
    };
    root.style.fontSize = fontSizeMap[prefs.fontSize] || '16px';

    // Dynamic Font Weight Scale (Shifts the entire hierarchy)
    const weights: Record<FontWeight, number> = { light: 300, normal: 400, medium: 500, semibold: 600, bold: 700 };
    const baseWeight = weights[prefs.fontWeight] || 400;
    const offset = baseWeight - 400;

    const applyShiftedWeight = (key: string, original: number) => {
        const shifted = Math.min(900, Math.max(100, original + offset));
        root.style.setProperty(`--font-weight-${key}`, shifted.toString());
    };

    applyShiftedWeight('light', 300);
    applyShiftedWeight('normal', 400);
    applyShiftedWeight('medium', 500);
    applyShiftedWeight('semibold', 600);
    applyShiftedWeight('bold', 700);

    // Set the base body weight as well
    root.style.setProperty('--font-weight-base', baseWeight.toString());

    // Line Height
    const leadingMap: Record<LineHeight, string> = {
        tight: '1.25',
        normal: '1.5',
        relaxed: '1.75'
    };
    root.style.setProperty('--line-height-base', leadingMap[prefs.lineHeight]);

    // 3. Layout Density
    const densityConfig = {
        compact: { padding: '0.75rem', gap: '0.75rem' },
        comfortable: { padding: '1.25rem', gap: '1.5rem' },
        spacious: { padding: '2rem', gap: '2.5rem' }
    };
    const density = densityConfig[prefs.layoutDensity] || densityConfig.comfortable;
    root.style.setProperty('--page-padding', density.padding);
    root.style.setProperty('--content-gap', density.gap);

    // 4. Sidebar & Animations
    root.setAttribute('data-sidebar-style', prefs.sidebarStyle);
    root.setAttribute('data-animation-level', prefs.animationLevel);

    // 5. Border Radius (Scaled based on user preference)
    const baseRadius = prefs.borderRadius;
    root.style.setProperty('--radius-xs', `${Math.max(0, Math.floor(baseRadius / 6))}px`);
    root.style.setProperty('--radius-sm', `${Math.max(0, Math.floor(baseRadius / 3))}px`);
    root.style.setProperty('--radius-md', `${Math.max(0, Math.floor(baseRadius / 1.5))}px`);
    root.style.setProperty('--radius-lg', `${baseRadius}px`);
    root.style.setProperty('--radius-xl', `${baseRadius + 4}px`);
    root.style.setProperty('--radius-2xl', `${baseRadius * 1.5}px`);
    root.style.setProperty('--radius-3xl', `${baseRadius * 2}px`);
    root.style.setProperty('--radius-full', '9999px');

    // 6. Shadows from Theme
    Object.entries(theme.shadows).forEach(([key, value]) => {
        root.style.setProperty(`--shadow-${key}`, value);
    });

    // 7. Glassmorphism
    if (prefs.glassmorphism) {
        root.classList.add('glassmorphism-enabled');
        root.style.setProperty('--glass-blur', '12px');
        root.style.setProperty('--glass-opacity', '0.8');
        root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.1)');
    } else {
        root.classList.remove('glassmorphism-enabled');
        root.style.setProperty('--glass-blur', '0px');
        root.style.setProperty('--glass-opacity', '1');
        root.style.setProperty('--glass-border', 'transparent');
    }

    // 8. Dark Mode Class
    const applyMode = (isDark: boolean) => {
        if (isDark) {
            root.classList.add('dark');
            root.style.setProperty('color-scheme', 'dark');
        } else {
            root.classList.remove('dark');
            root.style.setProperty('color-scheme', 'light');
        }
    };

    if (prefs.themeMode === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyMode(isDark);
    } else {
        applyMode(prefs.themeMode === 'dark');
    }
};

const kebabCase = (str: string) => {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
};

interface ThemeProviderProps {
    children: React.ReactNode;
    dynamicThemes?: Theme[];
    initialPreferences?: Partial<AppearanceState>;
    onThemeChange?: (theme: Theme, prefs: AppearanceState) => void;
}

/**
 * Unified Theme Provider Component
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
    children,
    dynamicThemes = [],
    initialPreferences,
    onThemeChange,
}) => {
    const [preferences, setPreferences] = useState<AppearanceState>(() => {
        const saved = loadPreferences();
        return {
            ...saved,
            ...initialPreferences,
        };
    });

    const [isLoading] = useState(false);

    const availableThemes = useMemo(() => {
        const combined = [...staticThemes, ...dynamicThemes];
        return combined.filter((theme, index, self) =>
            index === self.findIndex(t => t.id === theme.id)
        );
    }, [dynamicThemes]);

    const theme = useMemo(() => {
        return availableThemes.find(t => t.id === preferences.themeId) || defaultLightTheme;
    }, [availableThemes, preferences.themeId]);

    // Apply styles when preferences change
    useEffect(() => {
        applyThemeToCSSVariables(theme, preferences);
        onThemeChange?.(theme, preferences);
        savePreferences(preferences);
    }, [theme, preferences, onThemeChange]);

    // Sync with system theme if mode is 'system'
    useEffect(() => {
        if (preferences.themeMode !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            // Re-apply style to force refresh of mode-dependent variables
            applyThemeToCSSVariables(theme, preferences);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme, preferences]);

    const setTheme = useCallback((themeId: string) => {
        setPreferences(prev => ({ ...prev, themeId }));
    }, []);

    const setThemeMode = useCallback((themeMode: ThemeMode) => {
        setPreferences(prev => ({ ...prev, themeMode }));
    }, []);

    const setLayoutDensity = useCallback((layoutDensity: LayoutDensity) => {
        setPreferences(prev => ({ ...prev, layoutDensity }));
    }, []);

    const setSidebarStyle = useCallback((sidebarStyle: SidebarStyle) => {
        setPreferences(prev => ({ ...prev, sidebarStyle }));
    }, []);

    const setAnimationLevel = useCallback((animationLevel: AnimationLevel) => {
        setPreferences(prev => ({ ...prev, animationLevel }));
    }, []);

    const setCustomColors = useCallback((colors: Partial<ThemeColors>) => {
        if (colors.primary) {
            setPreferences(prev => ({ ...prev, primaryColor: colors.primary! }));
        }
    }, []);

    const setFontFamily = useCallback((fontFamily: FontStyle) => {
        setPreferences(prev => ({ ...prev, fontFamily }));
    }, []);

    const setFontSize = useCallback((fontSize: FontSize) => {
        setPreferences(prev => ({ ...prev, fontSize }));
    }, []);

    const setFontWeight = useCallback((fontWeight: FontWeight) => {
        setPreferences(prev => ({ ...prev, fontWeight }));
    }, []);

    const setLineHeight = useCallback((lineHeight: LineHeight) => {
        setPreferences(prev => ({ ...prev, lineHeight }));
    }, []);

    const setBorderRadius = useCallback((borderRadius: number) => {
        setPreferences(prev => ({ ...prev, borderRadius }));
    }, []);

    const setGlassmorphism = useCallback((glassmorphism: boolean) => {
        setPreferences(prev => ({ ...prev, glassmorphism }));
    }, []);

    const resetToDefault = useCallback(() => {
        setPreferences(DEFAULT_APPEARANCE_SETTINGS);
    }, []);

    const toggleDarkMode = useCallback(() => {
        setPreferences(prev => ({
            ...prev,
            themeMode: prev.themeMode === 'dark' ? 'light' : 'dark'
        }));
    }, []);

    const contextValue: ThemeContextValue = useMemo(() => ({
        theme,
        preferences,
        availableThemes,
        isDarkMode: theme.isDark || (preferences.themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches),
        isLoading,
        setTheme,
        setThemeMode,
        setLayoutDensity,
        setSidebarStyle,
        setAnimationLevel,
        setCustomColors,
        setFontFamily,
        setFontSize,
        setFontWeight,
        setLineHeight,
        setBorderRadius,
        setGlassmorphism,
        resetToDefault,
        toggleDarkMode,
    }), [theme, preferences, availableThemes, isLoading, setTheme, setThemeMode, setLayoutDensity, setSidebarStyle, setAnimationLevel, setCustomColors, setFontFamily, setFontSize, setFontWeight, setLineHeight, setBorderRadius, setGlassmorphism, resetToDefault, toggleDarkMode]);

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextValue => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const useThemeColors = () => {
    const { theme, preferences } = useTheme();
    const colors = { ...theme.colors };
    if (preferences.primaryColor) colors.primary = preferences.primaryColor;
    return colors;
};

export const useIsDarkMode = () => {
    const { isDarkMode } = useTheme();
    return isDarkMode;
};
