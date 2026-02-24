import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import type { RootState } from '../store';
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
} from '../store/slices/appearanceSlice';

/**
 * useGlobalStyle Sync Hook for Super Admin
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
    }, [preferences, dispatch, reduxPrefs]);

    return { preferences };
}
