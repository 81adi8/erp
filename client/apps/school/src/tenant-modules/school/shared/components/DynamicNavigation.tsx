// ============================================================================
// Dynamic Navigation - Server-driven navigation with nested children support
// ============================================================================

import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePermissions } from '../../../../core/hooks/usePermissions';
import type { NavItem } from '../../../../core/api/endpoints/navigationApi';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Shield, Folder } from 'lucide-react';
import { DynamicIcon } from '@erp/common';

// ============================================================================
// Types
// ============================================================================

interface DynamicNavigationProps {
    /** Collapsed state for sidebar */
    collapsed?: boolean;
    /** Callback when navigation item is clicked */
    onNavigate?: () => void;
    /** Accent color class for active items */
    accentColor?: string;
    /** Portal prefix for routes (e.g., '/admin', '/teacher') */
    portalPrefix?: string;
}

// ============================================================================
// Single Nav Item Component
// ============================================================================

interface NavItemProps {
    item: NavItem;
    collapsed?: boolean;
    onNavigate?: () => void;
    accentColor?: string;
    depth?: number;
    /** Portal prefix for routes */
    portalPrefix?: string;
}

/**
 * Get full path with portal prefix
 */
function getFullPath(path: string | undefined, portalPrefix: string = ''): string {
    if (!path) return '';
    // If path already starts with portal prefix, return as-is
    if (portalPrefix && path.startsWith(portalPrefix)) return path;
    // Prepend portal prefix
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return portalPrefix ? `${portalPrefix}${cleanPath}` : cleanPath;
}

function NavItemComponent({ item, collapsed, onNavigate, accentColor = 'text-primary', depth = 0, portalPrefix = '' }: NavItemProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const [isExpanded, setIsExpanded] = useState(false);

    const hasChildren = item.children && item.children.length > 0;

    // Get the full path with portal prefix
    const fullPath = getFullPath(item.path, portalPrefix);

    // Check if current path matches this item or any child
    const isActive = fullPath ? (
        location.pathname === fullPath ||
        location.pathname.startsWith(fullPath + '/')
    ) : false;

    // Check recursively if any child is active
    const checkChildActive = (children: NavItem[] | undefined): boolean => {
        if (!children) return false;
        return children.some((child: NavItem) => {
            const childFullPath = getFullPath(child.path, portalPrefix);
            if (childFullPath && (location.pathname === childFullPath || location.pathname.startsWith(childFullPath + '/'))) {
                return true;
            }
            return checkChildActive(child.children);
        });
    };

    const isChildActive = hasChildren && checkChildActive(item.children);
    const isCurrentActive = isActive || isChildActive;

    // Auto-expand if child is active
    useEffect(() => {
        if (isChildActive) setIsExpanded(true);
    }, [isChildActive]);

    // Handle click for items with/without children
    const handleClick = () => {
        if (hasChildren && !collapsed) {
            // Toggle expansion for parent items
            setIsExpanded(!isExpanded);
            // Also navigate if it has a path
            if (fullPath) {
                navigate(fullPath);
                onNavigate?.();
            }
        } else if (fullPath) {
            // Navigate for leaf items
            navigate(fullPath);
            onNavigate?.();
        }
    };

    // Render collapsed state (icon only with tooltip)
    if (collapsed) {
        return (
            <button
                onClick={handleClick}
                className={`flex items-center justify-center p-3 rounded-xl transition-all group relative w-full ${isCurrentActive
                    ? `bg-primary/10 ${accentColor}`
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                title={item.title}
            >
                <DynamicIcon name={item.icon || 'Folder'} className="w-5 h-5" />
                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-foreground text-background text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-lg">
                    {item.title}
                </div>
            </button>
        );
    }

    // Render with children (expandable)
    if (hasChildren) {
        return (
            <div className="space-y-1">
                <button
                    onClick={handleClick}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isCurrentActive
                        ? `bg-primary/10 ${accentColor}`
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    style={{ paddingLeft: `${12 + depth * 12}px` }}
                >
                    <DynamicIcon name={item.icon || 'Folder'} className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1 text-left text-sm font-medium truncate">{item.title}</span>
                    <ChevronDown
                        className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                            }`}
                    />
                </button>

                <AnimatePresence initial={false}>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden"
                        >
                            <div className="pl-3 space-y-1 border-l-2 border-border ml-5">
                                {item.children?.map((child: NavItem) => (
                                    <NavItemComponent
                                        key={child.key}
                                        item={child}
                                        collapsed={collapsed}
                                        onNavigate={onNavigate}
                                        accentColor={accentColor}
                                        depth={depth + 1}
                                        portalPrefix={portalPrefix}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // Render simple button (leaf item)
    return (
        <button
            onClick={handleClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${isActive
                ? `bg-primary ${accentColor === 'text-primary' ? 'text-primary-foreground' : 'text-white'} shadow-lg shadow-primary/20`
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            style={{ paddingLeft: `${12 + depth * 12}px` }}
        >
            <DynamicIcon name={item.icon || 'Folder'} className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium truncate">{item.title}</span>
        </button>
    );
}

// ============================================================================
// Main Navigation Component
// ============================================================================

export function DynamicNavigation({ collapsed, onNavigate, accentColor = 'text-primary', portalPrefix }: DynamicNavigationProps) {
    const location = useLocation();
    const { navigation, isLoading, roles } = usePermissions();

    // Detect portal prefix from current URL if not provided
    // Matches: /admin, /teacher, /student, /staff
    const detectedPortalPrefix = useMemo(() => {
        if (portalPrefix) return portalPrefix;
        const match = location.pathname.match(/^\/(admin|teacher|student|staff)/);
        return match ? `/${match[1]}` : '';
    }, [portalPrefix, location.pathname]);

    // Get role display name
    const roleDisplay = useMemo(() => {
        if (!roles || roles.length === 0) return 'User';
        return roles[0]?.name || 'User';
    }, [roles]);

    // Loading skeleton
    if (isLoading) {
        return (
            <nav className="p-3 space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                    <div
                        key={i}
                        className={`h-10 bg-muted/50 rounded-xl animate-pulse ${collapsed ? 'w-10 mx-auto' : ''
                            }`}
                    />
                ))}
            </nav>
        );
    }

    // Empty state
    if (!navigation || navigation.length === 0) {
        return (
            <nav className="p-4">
                {!collapsed && (
                    <div className="text-center py-8">
                        <Folder className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No navigation available</p>
                    </div>
                )}
            </nav>
        );
    }

    return (
        <nav className="flex flex-col h-full">
            {/* Role Badge - Only show when expanded */}
            {!collapsed && (
                <div className="px-3 py-3 border-b border-border">
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/50">
                        <div className={`h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0`}>
                            <Shield className={`w-4 h-4 ${accentColor}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Role</p>
                            <p className="text-sm font-semibold text-foreground truncate">{roleDisplay}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Items */}
            <div className={`flex-1 overflow-y-auto p-3 space-y-1 ${collapsed ? 'px-2' : ''}`}>
                {navigation.map((item: NavItem) => (
                    <NavItemComponent
                        key={item.key}
                        item={item}
                        collapsed={collapsed}
                        onNavigate={onNavigate}
                        accentColor={accentColor}
                        portalPrefix={detectedPortalPrefix}
                    />
                ))}
            </div>
        </nav>
    );
}

export default DynamicNavigation;
