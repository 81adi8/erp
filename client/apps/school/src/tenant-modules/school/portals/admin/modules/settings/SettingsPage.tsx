import { AnimatePresence, motion } from 'framer-motion';
import {
    Database,
    Mail,
    RefreshCw,
    Save,
    Monitor,
    Sun,
    Moon,
    Type,
    Layout,
    Sliders,
    Zap,
    Columns,
    School,
    Bell,
    Shield,
    Palette,
    Check
} from 'lucide-react';
import { useState } from 'react';
import { Card, Button, Input } from '@erp/common';
import { useAppDispatch, useAppSelector, type RootState } from '@store';
import { useTheme } from '@erp/common';
import {
    type FontStyle,
    type FontSize,
    type ThemeMode,
    type LayoutDensity,
    type SidebarStyle,
    type AnimationLevel,
    type FontWeight,
    type LineHeight,
    staticThemes
} from '@erp/common';

const settingsSections = [
    { id: 'general', title: 'General Settings', icon: School, description: 'School profile, name, logo and basic information' },
    { id: 'notifications', title: 'Notifications', icon: Bell, description: 'Configure email, SMS and push notifications' },
    { id: 'security', title: 'Security', icon: Shield, description: 'Password policies, 2FA and access controls' },
    { id: 'appearance', title: 'Appearance', icon: Palette, description: 'Theme, colors and branding customization' },
    { id: 'integrations', title: 'Integrations', icon: Database, description: 'Third-party services and API connections' },
    { id: 'email', title: 'Email Settings', icon: Mail, description: 'SMTP configuration and email templates' },
];

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState('general');
    const [appearanceTab, setAppearanceTab] = useState('themes');
    const {
        preferences: appearance,
        setTheme,
        setThemeMode,
        setLayoutDensity,
        setSidebarStyle,
        setAnimationLevel,
        setFontFamily,
        setFontSize,
        setFontWeight,
        setLineHeight,
        setCustomColors,
        setBorderRadius,
        setGlassmorphism,
        resetToDefault
    } = useTheme();

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                        <Palette size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text">Settings</h1>
                        <p className="text-sm text-text-muted">Manage your school's configuration and preferences</p>
                    </div>
                </div>
                <Button className="bg-primary hover:bg-primary-dark text-white">
                    <Save size={16} className="mr-2" />
                    Save Changes
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-1">
                    <Card className="p-2">
                        <nav className="space-y-1">
                            {settingsSections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeSection === section.id
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-text-muted hover:bg-muted hover:text-text'
                                        }`}
                                >
                                    <section.icon size={18} />
                                    <span className="text-sm font-medium">{section.title}</span>
                                </button>
                            ))}
                        </nav>
                    </Card>
                </div>

                {/* Settings Content */}
                <div className="lg:col-span-3">
                    <motion.div
                        key={activeSection}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        {activeSection === 'general' && (
                            <Card className="p-6 space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-text mb-1">General Settings</h2>
                                    <p className="text-sm text-text-muted">Configure your school's basic information</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-text">School Name</label>
                                        <Input placeholder="Enter school name" defaultValue="Vidya Public School" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-text">School Code</label>
                                        <Input placeholder="Enter school code" defaultValue="VPS2024" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-text">Admin Email</label>
                                        <Input type="email" placeholder="admin@school.com" defaultValue="admin@vidyapublic.edu" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-text">Phone Number</label>
                                        <Input placeholder="+91 ..." defaultValue="+91 98765 43210" />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <label className="text-sm font-medium text-text">Address</label>
                                        <textarea
                                            className="w-full min-h-[100px] p-3 rounded-lg border border-input bg-background text-sm"
                                            placeholder="Full address"
                                            defaultValue="123 Education Street, Knowledge City, State - 110001"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-border">
                                    <h3 className="text-sm font-medium text-text mb-4">School Logo</h3>
                                    <div className="flex items-center gap-4">
                                        <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center">
                                            <School size={32} className="text-text-muted" />
                                        </div>
                                        <div>
                                            <Button variant="outline" size="sm">Upload New Logo</Button>
                                            <p className="text-xs text-text-muted mt-2">PNG, JPG up to 2MB. Recommended 200x200px.</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {activeSection === 'notifications' && (
                            <Card className="p-6 space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-text mb-1">Notification Settings</h2>
                                    <p className="text-sm text-text-muted">Manage how you receive notifications</p>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { title: 'Email Notifications', desc: 'Receive important updates via email' },
                                        { title: 'SMS Alerts', desc: 'Get critical alerts via SMS' },
                                        { title: 'Push Notifications', desc: 'Browser and mobile push notifications' },
                                        { title: 'Fee Reminders', desc: 'Automatic fee payment reminders' },
                                        { title: 'Attendance Alerts', desc: 'Daily attendance summary alerts' },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                            <div>
                                                <p className="font-medium text-text">{item.title}</p>
                                                <p className="text-sm text-text-muted">{item.desc}</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" defaultChecked={i < 3} />
                                                <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {activeSection === 'security' && (
                            <Card className="p-6 space-y-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-text mb-1">Security Settings</h2>
                                    <p className="text-sm text-text-muted">Configure security and access controls</p>
                                </div>

                                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
                                    <div className="flex items-center gap-3">
                                        <Shield className="w-5 h-5 text-blue-600" />
                                        <div>
                                            <p className="font-medium text-blue-800 dark:text-blue-400">Two-Factor Authentication</p>
                                            <p className="text-sm text-blue-700 dark:text-blue-300">Add an extra layer of security to your account</p>
                                        </div>
                                        <Button variant="outline" size="sm" className="ml-auto">Enable 2FA</Button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-text">Session Timeout (minutes)</label>
                                        <Input type="number" defaultValue="30" className="max-w-xs" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-text">Minimum Password Length</label>
                                        <Input type="number" defaultValue="8" className="max-w-xs" />
                                    </div>
                                </div>
                            </Card>
                        )}

                        {activeSection === 'appearance' && (
                            <div className="space-y-6">
                                {/* Appearance Sub-navigation */}
                                <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit">
                                    {[
                                        { id: 'themes', label: 'Themes', icon: Sun },
                                        { id: 'fonts', label: 'Fonts', icon: Type },
                                        { id: 'layout', label: 'Layout', icon: Layout },
                                        { id: 'advanced', label: 'Advanced', icon: Sliders },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setAppearanceTab(tab.id)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${appearanceTab === tab.id
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
                                        key={appearanceTab}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {appearanceTab === 'themes' && (
                                            <Card className="p-6 space-y-8">
                                                <div className="space-y-4">
                                                    <h3 className="text-sm font-medium text-text">Predefined Themes</h3>
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
                                                                    {appearance.themeId === theme.id && (
                                                                        <Check size={12} className="text-primary" />
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] text-text-muted leading-tight truncate">{theme.description}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-4 pt-6 border-t border-border">
                                                    <h3 className="text-sm font-medium text-text">Theme Mode</h3>
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

                                                <div className="space-y-4">
                                                    <h3 className="text-sm font-medium text-text">Primary Accent Color</h3>
                                                    <div className="flex flex-wrap items-center gap-4">
                                                        <div className="flex gap-2">
                                                            {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'].map(color => (
                                                                <button
                                                                    key={color}
                                                                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${appearance.primaryColor === color ? 'border-primary scale-110 shadow-md' : 'border-white dark:border-gray-800'
                                                                        }`}
                                                                    style={{ backgroundColor: color }}
                                                                    onClick={() => setCustomColors({ primary: color })}
                                                                />
                                                            ))}
                                                        </div>
                                                        <div className="flex items-center gap-3 p-1.5 bg-muted rounded-lg border border-border">
                                                            <input
                                                                type="color"
                                                                value={appearance.primaryColor}
                                                                onChange={(e) => setCustomColors({ primary: e.target.value })}
                                                                className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                                            />
                                                            <span className="text-xs font-mono font-medium uppercase">{appearance.primaryColor}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        )}

                                        {appearanceTab === 'fonts' && (
                                            <Card className="p-6 space-y-8">
                                                <div className="space-y-4">
                                                    <h3 className="text-sm font-medium text-text">Font Family</h3>
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
                                                                <p className={`text-base font-medium ${font === 'Inter' ? 'font-inter' : font === 'Outfit' ? 'font-outfit' : font === 'Roboto' ? 'font-roboto' : font === 'Poppins' ? 'font-poppins' : 'font-lexend'}`}>
                                                                    {font}
                                                                </p>
                                                                <p className="text-[10px] text-text-muted mt-0.5">Sphinx of black quartz, judge my vow</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                    <div className="space-y-4">
                                                        <h3 className="text-sm font-medium text-text">Interface Scaling</h3>
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
                                                        <h3 className="text-sm font-medium text-text">Font Weight</h3>
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
                                                        <h3 className="text-sm font-medium text-text">Line Spacing</h3>
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

                                        {appearanceTab === 'layout' && (
                                            <Card className="p-6 space-y-8">
                                                <div className="space-y-4">
                                                    <h3 className="text-sm font-medium text-text">Layout Density</h3>
                                                    <div className="grid grid-cols-3 gap-4">
                                                        {[
                                                            { id: 'compact', label: 'Compact', desc: 'Maximum content visibility' },
                                                            { id: 'comfortable', label: 'Comfortable', desc: 'Standard balanced spacing' },
                                                            { id: 'spacious', label: 'Spacious', desc: 'Minimalist and breathable' },
                                                        ].map((density) => (
                                                            <button
                                                                key={density.id}
                                                                onClick={() => setLayoutDensity(density.id as LayoutDensity)}
                                                                className={`flex flex-col gap-1 p-4 rounded-xl border-2 text-left transition-all ${appearance.layoutDensity === density.id
                                                                    ? 'border-primary bg-primary/5'
                                                                    : 'border-border hover:border-text-muted'
                                                                    }`}
                                                            >
                                                                <span className="text-xs font-bold">{density.label}</span>
                                                                <span className="text-[10px] text-text-muted leading-tight">{density.desc}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="space-y-4">
                                                        <h3 className="text-sm font-medium text-text">Component Corner Radius</h3>
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

                                                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
                                                        <div>
                                                            <p className="text-sm font-semibold text-text">Glassmorphism UI</p>
                                                            <p className="text-[10px] text-text-muted">Dynamic frosted glass effects</p>
                                                        </div>
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={appearance.glassmorphism}
                                                                onChange={(e) => setGlassmorphism(e.target.checked)}
                                                            />
                                                            <div className="w-10 h-5 bg-border peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                                        </label>
                                                    </div>
                                                </div>
                                            </Card>
                                        )}

                                        {appearanceTab === 'advanced' && (
                                            <Card className="p-6 space-y-8">
                                                <div className="space-y-4">
                                                    <h3 className="text-sm font-medium text-text flex items-center gap-2">
                                                        <Columns size={16} className="text-primary" />
                                                        Sidebar Style
                                                    </h3>
                                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                        {[
                                                            { id: 'light', label: 'Classic Light' },
                                                            { id: 'dark', label: 'Modern Dark' },
                                                            { id: 'accent', label: 'Brand Accent' },
                                                            { id: 'glass', label: 'Glassy Blur' },
                                                        ].map((style) => (
                                                            <button
                                                                key={style.id}
                                                                onClick={() => setSidebarStyle(style.id as SidebarStyle)}
                                                                className={`p-4 rounded-xl border-2 text-center transition-all ${appearance.sidebarStyle === style.id
                                                                    ? 'border-primary bg-primary/5 shadow-sm'
                                                                    : 'border-border hover:border-text-muted'
                                                                    }`}
                                                            >
                                                                <span className="text-xs font-bold">{style.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-4 pt-4 border-t border-border">
                                                    <h3 className="text-sm font-medium text-text flex items-center gap-2">
                                                        <Zap size={16} className="text-primary" />
                                                        Interface Animations
                                                    </h3>
                                                    <div className="grid grid-cols-3 gap-4">
                                                        {[
                                                            { id: 'none', label: 'Static', desc: 'No animations' },
                                                            { id: 'subtle', label: 'Subtle', desc: 'Smooth fades only' },
                                                            { id: 'full', label: 'Dynamic', desc: 'Bouncy & interactive' },
                                                        ].map((anim) => (
                                                            <button
                                                                key={anim.id}
                                                                onClick={() => setAnimationLevel(anim.id as AnimationLevel)}
                                                                className={`flex flex-col gap-1 p-4 rounded-xl border-2 text-left transition-all ${appearance.animationLevel === anim.id
                                                                    ? 'border-primary bg-primary/5'
                                                                    : 'border-border hover:border-text-muted'
                                                                    }`}
                                                            >
                                                                <span className="text-xs font-bold">{anim.label}</span>
                                                                <span className="text-[10px] text-text-muted">{anim.desc}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex justify-end pt-4 border-t border-border mt-4">
                                                    <Button variant="outline" size="sm" onClick={() => resetToDefault()} className="text-red-500 hover:bg-red-50 text-xs gap-2">
                                                        <RefreshCw size={14} />
                                                        Reset All Appearance Settings
                                                    </Button>
                                                </div>
                                            </Card>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        )}

                        {['integrations', 'email'].includes(activeSection) && (
                            <Card className="p-12 flex flex-col items-center justify-center text-center">
                                <div className="p-4 rounded-full bg-muted mb-4">
                                    {activeSection === 'integrations' && <Database size={32} className="text-text-muted" />}
                                    {activeSection === 'email' && <Mail size={32} className="text-text-muted" />}
                                </div>
                                <h3 className="text-lg font-semibold text-text mb-2">
                                    {settingsSections.find(s => s.id === activeSection)?.title}
                                </h3>
                                <p className="text-text-muted max-w-sm">
                                    This settings section is currently under development and will be available soon.
                                </p>
                            </Card>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
