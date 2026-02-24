/**
 * Dynamic Icon Utility - Lazy loading icons for optimal bundle size
 * 
 * Features:
 * - Dynamic imports - only loads icons when needed
 * - Caching - loaded icons are cached for reuse
 * - Fallback support - shows fallback while loading
 * - SSR compatible with proper loading states
 */

import React, { useState, useEffect, memo, useMemo, ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type IconComponent = ComponentType<LucideProps>;

export interface DynamicIconProps extends LucideProps {
    /** Icon name to load */
    name: string;
    /** Fallback icon name while loading */
    fallback?: string;
    /** Custom loading component */
    loadingComponent?: React.ReactNode;
}

// ============================================================================
// Icon Name Mapping
// ============================================================================

const iconNameMap: Record<string, string> = {
    // Dashboard & Home
    dashboard: 'LayoutDashboard',
    home: 'Home',
    overview: 'LayoutDashboard',
    activity: 'Activity',

    // Users & People
    users: 'Users',
    user: 'User',
    profile: 'User',
    students: 'Users',
    student: 'User',
    teachers: 'GraduationCap',
    teacher: 'GraduationCap',
    staff: 'Briefcase',
    'user-management': 'UserCog',
    'user-plus': 'UserPlus',
    'add-user': 'UserPlus',
    contacts: 'Contact',

    // Education
    academics: 'BookOpen',
    courses: 'BookOpen',
    classes: 'School',
    school: 'School',
    graduation: 'GraduationCap',
    library: 'Library',
    subjects: 'BookOpen',
    curriculum: 'BookMarked',

    // Tasks & Records
    attendance: 'ClipboardCheck',
    tasks: 'ClipboardCheck',
    exams: 'FileText',
    documents: 'FileText',
    assignments: 'PenTool',
    results: 'FileText',
    records: 'Archive',

    // Schedule
    calendar: 'Calendar',
    schedule: 'CalendarDays',
    timetable: 'CalendarDays',
    time: 'Clock',

    // Finance
    fees: 'CreditCard',
    payments: 'CreditCard',
    finance: 'DollarSign',
    billing: 'CreditCard',
    invoice: 'Receipt',
    salary: 'BadgeDollarSign',

    // Analytics
    analytics: 'BarChart',
    reports: 'BarChart',
    statistics: 'PieChart',
    grades: 'BarChart',
    performance: 'TrendingUp',

    // Infrastructure
    building: 'Building',
    infrastructure: 'Building',
    lab: 'FlaskConical',
    laboratories: 'FlaskConical',
    departments: 'Building2',

    // Communication
    notifications: 'Bell',
    messages: 'MessageSquare',
    chat: 'MessageCircle',
    email: 'Mail',
    announcements: 'Megaphone',

    // Security & Admin
    security: 'Shield',
    admin: 'Shield',
    permissions: 'Key',
    settings: 'Settings',
    lock: 'Lock',

    // Organization
    folder: 'Folder',
    category: 'Folder',
    modules: 'Layers',
    sections: 'Layers',

    // Actions
    add: 'Plus',
    edit: 'Edit',
    delete: 'Trash2',
    search: 'Search',
    filter: 'Filter',
    refresh: 'RefreshCw',
    download: 'Download',
    upload: 'Upload',

    // Status
    success: 'CircleCheck',
    error: 'CircleX',
    warning: 'AlertTriangle',
    info: 'Info',
    help: 'HelpCircle',
};

// ============================================================================
// Icon Cache
// ============================================================================

const iconCache = new Map<string, IconComponent>();
const loadingPromises = new Map<string, Promise<IconComponent>>();

function normalizeIconName(name: string): string {
    const lowerName = name.toLowerCase();
    if (iconNameMap[lowerName]) return iconNameMap[lowerName];

    if (name[0] === name[0].toUpperCase() && !name.includes('-')) return name;

    return name
        .split(/[-_]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join('');
}

async function loadIcon(name: string): Promise<IconComponent> {
    const normalizedName = normalizeIconName(name);

    if (iconCache.has(normalizedName)) return iconCache.get(normalizedName)!;
    if (loadingPromises.has(normalizedName)) return loadingPromises.get(normalizedName)!;

    const loadPromise = (async () => {
        try {
            const icons = await import('lucide-react');
            const iconRegistry = icons as Record<string, IconComponent>;
            const IconComponent = iconRegistry[normalizedName];

            if (IconComponent) {
                iconCache.set(normalizedName, IconComponent);
                return IconComponent;
            }

            const FolderIcon = icons.Folder;
            iconCache.set(normalizedName, FolderIcon);
            return FolderIcon;
        } catch (error) {
            console.warn(`Failed to load icon: ${normalizedName}`, error);
            const icons = await import('lucide-react');
            return icons.Folder;
        } finally {
            loadingPromises.delete(normalizedName);
        }
    })();

    loadingPromises.set(normalizedName, loadPromise);
    return loadPromise;
}

// ============================================================================
// React Components
// ============================================================================

const IconPlaceholder = ({ size = 24 }: { size?: number | string }) => {
    const s = typeof size === 'number' ? size : parseInt(String(size), 10) || 24;
    return (
        <div
            style={{
                width: s,
                height: s,
                borderRadius: 4,
                backgroundColor: 'currentColor',
                opacity: 0.1,
            }}
        />
    );
};

export const DynamicIcon = memo(({
    name,
    fallback = 'Folder',
    loadingComponent,
    ...props
}: DynamicIconProps) => {
    const normalizedName = useMemo(() => normalizeIconName(name), [name]);
    const [Icon, setIcon] = useState<IconComponent | null>(() => iconCache.get(normalizedName) || null);
    const [isLoading, setIsLoading] = useState(!Icon);

    useEffect(() => {
        let mounted = true;

        if (!Icon || iconCache.get(normalizedName) !== Icon) {
            setIsLoading(true);
            loadIcon(name).then(LoadedIcon => {
                if (mounted) {
                    setIcon(() => LoadedIcon);
                    setIsLoading(false);
                }
            });
        } else {
            setIsLoading(false);
        }

        return () => { mounted = false; };
    }, [name, normalizedName, Icon]);

    if (isLoading || !Icon) {
        if (loadingComponent) return <>{loadingComponent}</>;
        return <IconPlaceholder size={props.size} />;
    }

    return <Icon {...props} />;
});

DynamicIcon.displayName = 'DynamicIcon';

export function useIcon(name: string): IconComponent | null {
    const normalizedName = useMemo(() => normalizeIconName(name), [name]);
    const [Icon, setIcon] = useState<IconComponent | null>(() => iconCache.get(normalizedName) || null);

    useEffect(() => {
        let mounted = true;

        if (!Icon || iconCache.get(normalizedName) !== Icon) {
            loadIcon(name).then(LoadedIcon => {
                if (mounted) setIcon(() => LoadedIcon);
            });
        }

        return () => { mounted = false; };
    }, [name, normalizedName, Icon]);

    return Icon;
}

export function getIconSync(name: string): IconComponent | undefined {
    const normalizedName = normalizeIconName(name);
    return iconCache.get(normalizedName);
}

export async function getIconAsync(name: string): Promise<IconComponent> {
    return loadIcon(name);
}

export function isIconCached(name: string): boolean {
    const normalizedName = normalizeIconName(name);
    return iconCache.has(normalizedName);
}

export function clearIconCache(): void {
    iconCache.clear();
}
