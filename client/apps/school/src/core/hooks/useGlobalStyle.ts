import { useEffect } from 'react';
import { useAppSelector, useAppDispatch, type RootState } from '../../store';
import { useTheme } from '@erp/common';
import {
    setThemeId,
    setThemeMode,
    setLayoutDensity,
    setSidebarStyle,
    setAnimationLevel,
    setFontFamily,
    setFontSize,
    setFontWeight,
    setLineHeight,
    setPrimaryColor,
    setBorderRadius,
    setGlassmorphism
} from '../../store/slices/appearanceSlice';

/**
 * useGlobalStyle Sync Hook
 * 
 * Since we are using the common ThemeProvider as the master, 
 * this hook ensures that the school app's Redux store stays in sync 
 * with the ThemeProvider's state (which is the single source of truth).
 */
export function useGlobalStyle() {
    const { preferences } = useTheme();
    const dispatch = useAppDispatch();
    const reduxPrefs = useAppSelector((state: RootState) => state.appearance);

    // Sync from ThemeProvider (Master) to Redux (Mirror)
    useEffect(() => {
        if (preferences.themeId !== reduxPrefs.themeId) dispatch(setThemeId(preferences.themeId));
        if (preferences.themeMode !== reduxPrefs.themeMode) dispatch(setThemeMode(preferences.themeMode));
        if (preferences.layoutDensity !== reduxPrefs.layoutDensity) dispatch(setLayoutDensity(preferences.layoutDensity));
        if (preferences.sidebarStyle !== reduxPrefs.sidebarStyle) dispatch(setSidebarStyle(preferences.sidebarStyle));
        if (preferences.animationLevel !== reduxPrefs.animationLevel) dispatch(setAnimationLevel(preferences.animationLevel));
        if (preferences.fontFamily !== reduxPrefs.fontFamily) dispatch(setFontFamily(preferences.fontFamily));
        if (preferences.fontSize !== reduxPrefs.fontSize) dispatch(setFontSize(preferences.fontSize));
        if (preferences.fontWeight !== reduxPrefs.fontWeight) dispatch(setFontWeight(preferences.fontWeight));
        if (preferences.lineHeight !== reduxPrefs.lineHeight) dispatch(setLineHeight(preferences.lineHeight));
        if (preferences.primaryColor !== reduxPrefs.primaryColor) dispatch(setPrimaryColor(preferences.primaryColor));
        if (preferences.borderRadius !== reduxPrefs.borderRadius) dispatch(setBorderRadius(preferences.borderRadius));
        if (preferences.glassmorphism !== reduxPrefs.glassmorphism) dispatch(setGlassmorphism(preferences.glassmorphism));
    }, [preferences, dispatch]);

    return { preferences };
}
