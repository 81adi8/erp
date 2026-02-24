import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
    type AppearanceState,
    type FontStyle,
    type FontSize,
    type ThemeMode,
    type LayoutDensity,
    type SidebarStyle,
    type AnimationLevel,
    type FontWeight,
    type LineHeight,
    DEFAULT_APPEARANCE_SETTINGS,
    APPEARANCE_LOCAL_STORAGE_KEY
} from '@erp/common';

const loadFromStorage = (): AppearanceState => {
    try {
        const saved = localStorage.getItem(APPEARANCE_LOCAL_STORAGE_KEY);
        if (saved) {
            return {
                ...DEFAULT_APPEARANCE_SETTINGS,
                ...JSON.parse(saved)
            };
        }
    } catch {
        // Fallback to defaults
    }
    return DEFAULT_APPEARANCE_SETTINGS;
};

const initialState: AppearanceState = loadFromStorage();

const appearanceSlice = createSlice({
    name: 'appearance',
    initialState,
    reducers: {
        setThemeId: (state, action: PayloadAction<string>) => {
            state.themeId = action.payload;
            saveToStorage(state);
        },
        setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
            state.themeMode = action.payload;
            saveToStorage(state);
        },
        setLayoutDensity: (state, action: PayloadAction<LayoutDensity>) => {
            state.layoutDensity = action.payload;
            saveToStorage(state);
        },
        setSidebarStyle: (state, action: PayloadAction<SidebarStyle>) => {
            state.sidebarStyle = action.payload;
            saveToStorage(state);
        },
        setAnimationLevel: (state, action: PayloadAction<AnimationLevel>) => {
            state.animationLevel = action.payload;
            saveToStorage(state);
        },
        setFontFamily: (state, action: PayloadAction<FontStyle>) => {
            state.fontFamily = action.payload;
            saveToStorage(state);
        },
        setFontSize: (state, action: PayloadAction<FontSize>) => {
            state.fontSize = action.payload;
            saveToStorage(state);
        },
        setFontWeight: (state, action: PayloadAction<FontWeight>) => {
            state.fontWeight = action.payload;
            saveToStorage(state);
        },
        setLineHeight: (state, action: PayloadAction<LineHeight>) => {
            state.lineHeight = action.payload;
            saveToStorage(state);
        },
        setPrimaryColor: (state, action: PayloadAction<string>) => {
            state.primaryColor = action.payload;
            saveToStorage(state);
        },
        setBorderRadius: (state, action: PayloadAction<number>) => {
            state.borderRadius = action.payload;
            saveToStorage(state);
        },
        setGlassmorphism: (state, action: PayloadAction<boolean>) => {
            state.glassmorphism = action.payload;
            saveToStorage(state);
        },
        resetAppearance: (state) => {
            Object.assign(state, DEFAULT_APPEARANCE_SETTINGS);
            saveToStorage(state);
        },
    },
});

const saveToStorage = (state: AppearanceState) => {
    try {
        localStorage.setItem(APPEARANCE_LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Handle potential quota exceeded
    }
};

export const {
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
    setGlassmorphism,
    resetAppearance
} = appearanceSlice.actions;

export default appearanceSlice.reducer;
