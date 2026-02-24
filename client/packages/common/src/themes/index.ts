/**
 * Theme Configuration
 * 
 * Provides a comprehensive theme system with:
 * - Static predefined themes (light and dark variants)
 * - Dynamic themes loaded from API
 * - User customization support
 * - CSS variable injection
 * - System theme preference detection
 */

// Types
export type {
    Theme,
    ThemeColors,
    ThemeTypography,
    ThemeSpacing,
    ThemeBorderRadius,
    ThemeShadows,
    UserThemePreferences,
    ThemeContextValue,
} from './types';

// Static themes
export {
    staticThemes,
    defaultLightTheme,
    defaultDarkTheme,
    oceanLightTheme,
    roseLightTheme,
    forestLightTheme,
    midnightDarkTheme,
    carbonDarkTheme,
    DEFAULT_THEME_ID,
    DEFAULT_DARK_THEME_ID,
    getThemeById,
    getLightThemes,
    getDarkThemes,
} from './staticThemes';

// Context and hooks
export {
    ThemeProvider,
    useTheme,
    useThemeColors,
    useIsDarkMode,
} from './ThemeContext';
