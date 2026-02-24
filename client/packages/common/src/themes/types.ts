import type { AppearanceState, ThemeMode, LayoutDensity, SidebarStyle, AnimationLevel, FontSize, FontWeight, LineHeight, FontStyle } from '../types/appearance';

export interface ThemeColors {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    secondaryLight: string;
    secondaryDark: string;
    background: string;
    surface: string;
    surfaceHover: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    borderLight: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    card: string;
    cardForeground: string;
}

export interface ThemeTypography {
    fontFamily: string;
    fontFamilyMono: string;
    fontSize: {
        xs: string;
        sm: string;
        base: string;
        lg: string;
        xl: string;
        '2xl': string;
        '3xl': string;
        '4xl': string;
    };
    fontWeight: {
        light: number;
        normal: number;
        medium: number;
        semibold: number;
        bold: number;
        bitter?: number;
    };
    lineHeight: {
        tight: number;
        normal: number;
        relaxed: number;
    };
}

export interface ThemeSpacing {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
}

export interface ThemeBorderRadius {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
}

export interface ThemeShadows {
    sm: string;
    md: string;
    lg: string;
    xl: string;
}

export interface ThemeContainerSize {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
}

export interface Theme {
    id: string;
    name: string;
    description?: string;
    isDark: boolean;
    isCustom?: boolean;
    colors: ThemeColors;
    typography: ThemeTypography;
    spacing: ThemeSpacing;
    borderRadius: ThemeBorderRadius;
    shadows: ThemeShadows;
}

export interface UserThemePreferences extends AppearanceState {
    preferSystemTheme?: boolean; // Keep for backward compatibility or internal logic
}

export interface ThemeContextValue {
    theme: Theme;
    preferences: AppearanceState;
    availableThemes: Theme[];
    isDarkMode: boolean;
    isLoading: boolean;
    setTheme: (themeId: string) => void;
    setThemeMode: (mode: ThemeMode) => void;
    setLayoutDensity: (density: LayoutDensity) => void;
    setSidebarStyle: (style: SidebarStyle) => void;
    setAnimationLevel: (level: AnimationLevel) => void;
    setCustomColors: (colors: Partial<ThemeColors>) => void;
    setFontFamily: (font: FontStyle) => void;
    setFontSize: (size: FontSize) => void;
    setFontWeight: (weight: FontWeight) => void;
    setLineHeight: (height: LineHeight) => void;
    setBorderRadius: (radius: number) => void;
    setGlassmorphism: (enabled: boolean) => void;
    resetToDefault: () => void;
    toggleDarkMode: () => void;
}
