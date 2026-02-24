import type { Theme, ThemeTypography, ThemeSpacing, ThemeBorderRadius, ThemeShadows, ThemeContainerSize } from './types';

/**
 * Shared typography configuration
 */
const sharedTypography: ThemeTypography = {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontFamilyMono: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
    fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
    },
    fontWeight: {
        light: 300,
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
    },
    lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
    },
};

/**
 * Shared spacing configuration
 */
const sharedSpacing: ThemeSpacing = {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
};

/**
 * Shared border radius
 */
const sharedBorderRadius: ThemeBorderRadius = {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
};

const ContainerSize: ThemeContainerSize = {
    xs: '20rem',
    sm: '28rem',
    md: '36rem',
    lg: '48rem',
    xl: '64rem',
}

// ============================================
// LIGHT THEMES
// ============================================

/**
 * Default Light Theme - Clean and Professional
 */
export const defaultLightTheme: Theme = {
    id: 'default-light',
    name: 'Default Light',
    description: 'Clean and professional light theme',
    isDark: false,
    colors: {
        primary: '#3B82F6',
        primaryLight: '#60A5FA',
        primaryDark: '#2563EB',
        secondary: '#8B5CF6',
        secondaryLight: '#A78BFA',
        secondaryDark: '#7C3AED',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        surfaceHover: '#F1F5F9',
        text: '#1E293B',
        textSecondary: '#475569',
        textMuted: '#94A3B8',
        border: '#E2E8F0',
        borderLight: '#F1F5F9',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#0EA5E9',
        card: '#FFFFFF',
        cardForeground: '#1E293B',
    },
    typography: sharedTypography,
    spacing: sharedSpacing,
    borderRadius: sharedBorderRadius,
    shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    },
};

/**
 * Ocean Light Theme - Blue/Teal
 */
export const oceanLightTheme: Theme = {
    id: 'ocean-light',
    name: 'Ocean',
    description: 'Calm ocean-inspired blue and teal theme',
    isDark: false,
    colors: {
        primary: '#0891B2',
        primaryLight: '#22D3EE',
        primaryDark: '#0E7490',
        secondary: '#0D9488',
        secondaryLight: '#2DD4BF',
        secondaryDark: '#0F766E',
        background: '#F0FDFA',
        surface: '#FFFFFF',
        surfaceHover: '#ECFDF5',
        text: '#134E4A',
        textSecondary: '#2D6A4F',
        textMuted: '#6B8B8B',
        border: '#99F6E4',
        borderLight: '#CCFBF1',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#0EA5E9',
        card: '#FFFFFF',
        cardForeground: '#134E4A',
    },
    typography: sharedTypography,
    spacing: sharedSpacing,
    borderRadius: sharedBorderRadius,
    shadows: defaultLightTheme.shadows,
};

/**
 * Rose Light Theme - Pink/Rose
 */
export const roseLightTheme: Theme = {
    id: 'rose-light',
    name: 'Rose',
    description: 'Elegant rose and pink theme',
    isDark: false,
    colors: {
        primary: '#E11D48',
        primaryLight: '#FB7185',
        primaryDark: '#BE123C',
        secondary: '#DB2777',
        secondaryLight: '#F472B6',
        secondaryDark: '#BE185D',
        background: '#FFF1F2',
        surface: '#FFFFFF',
        surfaceHover: '#FFE4E6',
        text: '#881337',
        textSecondary: '#9F1239',
        textMuted: '#BE123C',
        border: '#FECDD3',
        borderLight: '#FFE4E6',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#0EA5E9',
        card: '#FFFFFF',
        cardForeground: '#881337',
    },
    typography: sharedTypography,
    spacing: sharedSpacing,
    borderRadius: sharedBorderRadius,
    shadows: defaultLightTheme.shadows,
};

/**
 * Forest Light Theme - Green/Earth tones
 */
export const forestLightTheme: Theme = {
    id: 'forest-light',
    name: 'Forest',
    description: 'Natural forest-inspired green theme',
    isDark: false,
    colors: {
        primary: '#059669',
        primaryLight: '#34D399',
        primaryDark: '#047857',
        secondary: '#65A30D',
        secondaryLight: '#A3E635',
        secondaryDark: '#4D7C0F',
        background: '#F0FDF4',
        surface: '#FFFFFF',
        surfaceHover: '#DCFCE7',
        text: '#14532D',
        textSecondary: '#166534',
        textMuted: '#4D7C0F',
        border: '#BBF7D0',
        borderLight: '#DCFCE7',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#0EA5E9',
        card: '#FFFFFF',
        cardForeground: '#14532D',
    },
    typography: sharedTypography,
    spacing: sharedSpacing,
    borderRadius: sharedBorderRadius,
    shadows: defaultLightTheme.shadows,
};

// ============================================
// DARK THEMES
// ============================================

/**
 * Default Dark Theme
 */
export const defaultDarkTheme: Theme = {
    id: 'default-dark',
    name: 'Default Dark',
    description: 'Professional dark theme for reduced eye strain',
    isDark: true,
    colors: {
        primary: '#60A5FA',
        primaryLight: '#93C5FD',
        primaryDark: '#3B82F6',
        secondary: '#A78BFA',
        secondaryLight: '#C4B5FD',
        secondaryDark: '#8B5CF6',
        background: '#0F172A',
        surface: '#1E293B',
        surfaceHover: '#334155',
        text: '#F1F5F9',
        textSecondary: '#CBD5E1',
        textMuted: '#64748B',
        border: '#334155',
        borderLight: '#475569',
        success: '#34D399',
        warning: '#FBBF24',
        error: '#F87171',
        info: '#38BDF8',
        card: '#1E293B',
        cardForeground: '#F1F5F9',
    },
    typography: sharedTypography,
    spacing: sharedSpacing,
    borderRadius: sharedBorderRadius,
    shadows: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.3)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.3)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.4)',
    },
};

/**
 * Midnight Dark Theme - Deep purple/blue
 */
export const midnightDarkTheme: Theme = {
    id: 'midnight-dark',
    name: 'Midnight',
    description: 'Deep midnight purple theme',
    isDark: true,
    colors: {
        primary: '#A78BFA',
        primaryLight: '#C4B5FD',
        primaryDark: '#8B5CF6',
        secondary: '#818CF8',
        secondaryLight: '#A5B4FC',
        secondaryDark: '#6366F1',
        background: '#0C0A1D',
        surface: '#1A1632',
        surfaceHover: '#2E2653',
        text: '#E8E4F0',
        textSecondary: '#C4B5FD',
        textMuted: '#7C6DA8',
        border: '#3B3266',
        borderLight: '#4C4380',
        success: '#34D399',
        warning: '#FBBF24',
        error: '#F87171',
        info: '#38BDF8',
        card: '#1A1632',
        cardForeground: '#E8E4F0',
    },
    typography: sharedTypography,
    spacing: sharedSpacing,
    borderRadius: sharedBorderRadius,
    shadows: defaultDarkTheme.shadows,
};

/**
 * Carbon Dark Theme - True black (OLED)
 */
export const carbonDarkTheme: Theme = {
    id: 'carbon-dark',
    name: 'Carbon',
    description: 'True black theme optimized for OLED displays',
    isDark: true,
    colors: {
        primary: '#22D3EE',
        primaryLight: '#67E8F9',
        primaryDark: '#06B6D4',
        secondary: '#A3E635',
        secondaryLight: '#BEF264',
        secondaryDark: '#84CC16',
        background: '#000000',
        surface: '#0A0A0A',
        surfaceHover: '#171717',
        text: '#FAFAFA',
        textSecondary: '#D4D4D4',
        textMuted: '#737373',
        border: '#262626',
        borderLight: '#404040',
        success: '#22C55E',
        warning: '#EAB308',
        error: '#EF4444',
        info: '#3B82F6',
        card: '#0A0A0A',
        cardForeground: '#FAFAFA',
    },
    typography: sharedTypography,
    spacing: sharedSpacing,
    borderRadius: sharedBorderRadius,
    shadows: defaultDarkTheme.shadows,
};

/**
 * Violet Dream Theme - Vibrant Purple/Indigo
 */
export const violetDreamTheme: Theme = {
    id: 'violet-dream',
    name: 'Violet Dream',
    description: 'Vibrant and professional purple dream theme',
    isDark: false,
    colors: {
        primary: '#7C3AED',
        primaryLight: '#A78BFA',
        primaryDark: '#5B21B6',
        secondary: '#EC4899',
        secondaryLight: '#F472B6',
        secondaryDark: '#BE185D',
        background: '#FAF5FF',
        surface: '#FFFFFF',
        surfaceHover: '#F5F3FF',
        text: '#2E1065',
        textSecondary: '#5B21B6',
        textMuted: '#A78BFA',
        border: '#EDE9FE',
        borderLight: '#F5F3FF',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#0EA5E9',
        card: '#FFFFFF',
        cardForeground: '#2E1065',
    },
    typography: sharedTypography,
    spacing: sharedSpacing,
    borderRadius: sharedBorderRadius,
    shadows: defaultLightTheme.shadows,
};

/**
 * Amber Gold Theme - Warm Sunset
 */
export const amberGoldTheme: Theme = {
    id: 'amber-gold',
    name: 'Amber Gold',
    description: 'Warm and inviting gold sunset theme',
    isDark: false,
    colors: {
        primary: '#D97706',
        primaryLight: '#FBBF24',
        primaryDark: '#92400E',
        secondary: '#EA580C',
        secondaryLight: '#FB923C',
        secondaryDark: '#9A3412',
        background: '#FFFBEB',
        surface: '#FFFFFF',
        surfaceHover: '#FEF3C7',
        text: '#451A03',
        textSecondary: '#92400E',
        textMuted: '#F59E0B',
        border: '#FEF3C7',
        borderLight: '#FFFBEB',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#0EA5E9',
        card: '#FFFFFF',
        cardForeground: '#451A03',
    },
    typography: sharedTypography,
    spacing: sharedSpacing,
    borderRadius: sharedBorderRadius,
    shadows: defaultLightTheme.shadows,
};

/**
 * Slate Pro Theme - Minimalist Slate
 */
export const slateProTheme: Theme = {
    id: 'slate-pro',
    name: 'Slate Pro',
    description: 'High-contrast minimalist slate theme',
    isDark: true,
    colors: {
        primary: '#94A3B8',
        primaryLight: '#CBD5E1',
        primaryDark: '#475569',
        secondary: '#64748B',
        secondaryLight: '#94A3B8',
        secondaryDark: '#334155',
        background: '#020617',
        surface: '#0F172A',
        surfaceHover: '#1E293B',
        text: '#F8FAFC',
        textSecondary: '#CBD5E1',
        textMuted: '#64748B',
        border: '#1E293B',
        borderLight: '#334155',
        success: '#34D399',
        warning: '#FBBF24',
        error: '#F87171',
        info: '#38BDF8',
        card: '#0F172A',
        cardForeground: '#F8FAFC',
    },
    typography: sharedTypography,
    spacing: sharedSpacing,
    borderRadius: sharedBorderRadius,
    shadows: defaultDarkTheme.shadows,
};

/**
 * Cyber Neon Theme - Dark Neon
 */
export const cyberNeonTheme: Theme = {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    description: 'Glow-in-the-dark neon cyberpunk theme',
    isDark: true,
    colors: {
        primary: '#39FF14',
        primaryLight: '#99FF99',
        primaryDark: '#00CC00',
        secondary: '#BC13FE',
        secondaryLight: '#D891EF',
        secondaryDark: '#8A2BE2',
        background: '#050505',
        surface: '#0D0D0D',
        surfaceHover: '#1A1A1A',
        text: '#FFFFFF',
        textSecondary: '#B0B0B0',
        textMuted: '#666666',
        border: '#262626',
        borderLight: '#333333',
        success: '#39FF14',
        warning: '#FFFF00',
        error: '#FF0033',
        info: '#00FFFF',
        card: '#0D0D0D',
        cardForeground: '#FFFFFF',
    },
    typography: sharedTypography,
    spacing: sharedSpacing,
    borderRadius: sharedBorderRadius,
    shadows: {
        sm: '0 0 5px rgba(57, 255, 20, 0.2)',
        md: '0 0 10px rgba(57, 255, 20, 0.3)',
        lg: '0 0 20px rgba(57, 255, 20, 0.4)',
        xl: '0 0 30px rgba(57, 255, 20, 0.5)',
    },
};

// ============================================
// EXPORTS
// ============================================

/**
 * All static themes
 */
export const staticThemes: Theme[] = [
    defaultLightTheme,
    oceanLightTheme,
    roseLightTheme,
    forestLightTheme,
    violetDreamTheme,
    amberGoldTheme,
    defaultDarkTheme,
    midnightDarkTheme,
    carbonDarkTheme,
    slateProTheme,
    cyberNeonTheme,
];

/**
 * Default theme ID
 */
export const DEFAULT_THEME_ID = 'default-light';
export const DEFAULT_DARK_THEME_ID = 'default-dark';

/**
 * Get theme by ID
 */
export const getThemeById = (id: string): Theme | undefined => {
    return staticThemes.find(t => t.id === id);
};

/**
 * Get light themes only
 */
export const getLightThemes = (): Theme[] => {
    return staticThemes.filter(t => !t.isDark);
};

/**
 * Get dark themes only
 */
export const getDarkThemes = (): Theme[] => {
    return staticThemes.filter(t => t.isDark);
};
