import { motion, AnimatePresence } from 'framer-motion';
import {
    Palette,
    Sun,
    Moon,
    Monitor,
    Type,
    Layout,
    Sliders,
    Zap,
    Columns,
    RefreshCw,
    Check,
    Save
} from 'lucide-react';
import { useState } from 'react';
import { Card, Button, useTheme, staticThemes, type FontStyle, type FontSize, type ThemeMode, type LayoutDensity, type FontWeight, type LineHeight } from '@erp/common';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('themes');
    const {
        preferences: appearance,
        setTheme,
        setThemeMode,
        setLayoutDensity,
        setFontFamily,
        setFontSize,
        setFontWeight,
        setLineHeight,
        setCustomColors,
        setBorderRadius,
        resetToDefault
    } = useTheme();

    const tabs = [
        { id: 'themes', label: 'Themes', icon: Sun },
        { id: 'fonts', label: 'Fonts', icon: Type },
        { id: 'layout', label: 'Layout', icon: Layout },
        { id: 'advanced', label: 'Advanced', icon: Sliders },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                        <Palette size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text">System Appearance</h1>
                        <p className="text-sm text-text-muted">Customize the look and feel of the Super Admin portal</p>
                    </div>
                </div>
                <Button className="bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/20">
                    <Save size={16} className="mr-2" />
                    Save Configuration
                </Button>
            </div>

            <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                            ? 'bg-card text-primary shadow-sm'
                            : 'text-text-muted hover:text-text hover:bg-card/50'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'themes' && (
                        <Card className="p-6 space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-text">Color Themes</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {staticThemes.map((theme) => (
                                        <button
                                            key={theme.id}
                                            onClick={() => {
                                                setTheme(theme.id);
                                                setCustomColors({ primary: theme.colors.primary });
                                            }}
                                            className={`group relative flex flex-col gap-2 p-3 rounded-xl border-2 transition-all ${appearance.themeId === theme.id
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-text-muted hover:bg-muted/50'
                                                }`}
                                        >
                                            <div className="flex gap-1 h-12 w-full rounded-lg overflow-hidden border border-border/50">
                                                <div className="flex-1" style={{ backgroundColor: theme.colors.primary }} />
                                                <div className="flex-1" style={{ backgroundColor: theme.colors.background }} />
                                                <div className="flex-1" style={{ backgroundColor: theme.colors.surface }} />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold truncate">{theme.name}</span>
                                                {appearance.themeId === theme.id && <Check size={12} className="text-primary" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-border">
                                <h3 className="text-sm font-medium text-text">Display Mode</h3>
                                <div className="grid grid-cols-3 gap-4 max-w-lg">
                                    {[
                                        { id: 'light', label: 'Light', icon: Sun },
                                        { id: 'dark', label: 'Dark', icon: Moon },
                                        { id: 'system', label: 'System', icon: Monitor },
                                    ].map((mode) => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setThemeMode(mode.id as ThemeMode)}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${appearance.themeMode === mode.id
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-text-muted'
                                                }`}
                                        >
                                            <mode.icon size={20} className={appearance.themeMode === mode.id ? 'text-primary' : 'text-text-muted'} />
                                            <span className="text-xs font-semibold">{mode.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'fonts' && (
                        <Card className="p-6 space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-text">Typography</h3>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                    {(['Inter', 'Outfit', 'Roboto', 'Poppins', 'Lexend'] as FontStyle[]).map((font) => (
                                        <button
                                            key={font}
                                            onClick={() => setFontFamily(font)}
                                            className={`px-4 py-3 rounded-xl border text-left transition-all ${appearance.fontFamily === font
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                : 'border-border hover:border-text-muted bg-card'
                                                }`}
                                        >
                                            <p className={`text-base font-medium font-${font.toLowerCase()}`}>{font}</p>
                                            <p className="text-[10px] text-text-muted mt-0.5">Sphinx of black quartz, judge my vow</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-text">Scaling</h3>
                                    <div className="flex flex-wrap gap-2 p-1 bg-muted rounded-xl w-fit">
                                        {(['xs', 'sm', 'md', 'lg', 'xl'] as FontSize[]).map((size) => (
                                            <button
                                                key={size}
                                                onClick={() => setFontSize(size)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${appearance.fontSize === size
                                                    ? 'bg-card text-primary shadow-sm'
                                                    : 'text-text-muted hover:text-text'
                                                    }`}
                                            >
                                                {size.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-text">Weight</h3>
                                    <div className="flex flex-wrap gap-2 p-1 bg-muted rounded-xl w-fit">
                                        {(['light', 'normal', 'medium', 'semibold', 'bold'] as FontWeight[]).map((weight) => (
                                            <button
                                                key={weight}
                                                onClick={() => setFontWeight(weight)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${appearance.fontWeight === weight
                                                    ? 'bg-card text-primary shadow-sm'
                                                    : 'text-text-muted hover:text-text'
                                                    }`}
                                            >
                                                {weight.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium text-text">Line Height</h3>
                                    <div className="flex flex-wrap gap-2 p-1 bg-muted rounded-xl w-fit">
                                        {(['tight', 'normal', 'relaxed'] as LineHeight[]).map((height) => (
                                            <button
                                                key={height}
                                                onClick={() => setLineHeight(height)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${appearance.lineHeight === height
                                                    ? 'bg-card text-primary shadow-sm'
                                                    : 'text-text-muted hover:text-text'
                                                    }`}
                                            >
                                                {height.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'layout' && (
                        <Card className="p-6 space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-text">Interface Density</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { id: 'compact', label: 'Compact' },
                                        { id: 'comfortable', label: 'Standard' },
                                        { id: 'spacious', label: 'Breathable' },
                                    ].map((density) => (
                                        <button
                                            key={density.id}
                                            onClick={() => setLayoutDensity(density.id as LayoutDensity)}
                                            className={`p-4 rounded-xl border-2 text-left transition-all ${appearance.layoutDensity === density.id
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-text-muted'
                                                }`}
                                        >
                                            <span className="text-xs font-bold">{density.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-text">Corner Radius</h3>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="0"
                                        max="24"
                                        value={appearance.borderRadius}
                                        onChange={(e) => setBorderRadius(parseInt(e.target.value))}
                                        className="flex-1 accent-primary"
                                    />
                                    <span className="text-xs font-bold bg-muted px-2 py-1 rounded min-w-[36px] text-center">
                                        {appearance.borderRadius}px
                                    </span>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'advanced' && (
                        <Card className="p-6 space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-text text-red-500">System Reset</h3>
                                <p className="text-xs text-text-muted">Revert all appearance customizations to system defaults.</p>
                                <Button variant="outline" onClick={() => resetToDefault()} className="text-red-500 hover:bg-red-50 gap-2">
                                    <RefreshCw size={14} />
                                    Reset to Default
                                </Button>
                            </div>
                        </Card>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
