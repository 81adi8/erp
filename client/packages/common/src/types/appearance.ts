export type FontStyle = 'Inter' | 'Outfit' | 'Roboto' | 'Poppins' | 'Lexend';
export type FontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ThemeMode = 'light' | 'dark' | 'system';
export type LayoutDensity = 'compact' | 'comfortable' | 'spacious';
export type SidebarStyle = 'light' | 'dark' | 'accent' | 'glass';
export type AnimationLevel = 'none' | 'subtle' | 'full';
export type FontWeight = 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
export type LineHeight = 'tight' | 'normal' | 'relaxed';

export interface AppearanceState {
    themeId: string;
    themeMode: ThemeMode;
    layoutDensity: LayoutDensity;
    sidebarStyle: SidebarStyle;
    animationLevel: AnimationLevel;
    fontFamily: FontStyle;
    fontSize: FontSize;
    fontWeight: FontWeight;
    lineHeight: LineHeight;
    primaryColor: string;
    borderRadius: number;
    glassmorphism: boolean;
}

export const APPEARANCE_LOCAL_STORAGE_KEY = 'appearance-settings';

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceState = {
    themeId: 'default-light',
    themeMode: 'light',
    layoutDensity: 'comfortable',
    sidebarStyle: 'light',
    animationLevel: 'full',
    fontFamily: 'Outfit',
    fontSize: 'md',
    fontWeight: 'normal',
    lineHeight: 'normal',
    primaryColor: '#3b82f6',
    borderRadius: 12,
    glassmorphism: true,
};
