// ============================================================================
// Sidebar Component - Animated navigation sidebar
// ============================================================================
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

export interface NavItem {
    id: string;
    label: string;
    path: string;
    icon: string;
    permission?: string;
    children?: NavItem[];
}

interface SidebarProps {
    /** Navigation items */
    items: NavItem[];
    /** Logo/brand element */
    logo?: React.ReactNode;
    /** Collapsed state (controlled) */
    collapsed?: boolean;
    /** Callback when collapsed state changes */
    onCollapsedChange?: (collapsed: boolean) => void;
    /** Custom class */
    className?: string;
}

/**
 * Get icon component from lucide-react by name
 */
function getIcon(iconName: string) {
    const LucideIcons = Icons as Record<string, React.FC<{ className?: string }>>;
    const Icon = LucideIcons[iconName];
    return Icon || Icons.Circle;
}

/**
 * Sidebar - Animated navigation sidebar for layouts
 */
export function Sidebar({
    items,
    logo,
    collapsed = false,
    onCollapsedChange,
    className = '',
}: SidebarProps) {
    const location = useLocation();
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    const sidebarVariants = {
        expanded: { width: 260 },
        collapsed: { width: 72 },
    };

    const labelVariants = {
        expanded: { opacity: 1, x: 0, display: 'block' },
        collapsed: { opacity: 0, x: -10, transitionEnd: { display: 'none' } },
    };

    return (
        <motion.aside
            initial={false}
            animate={collapsed ? 'collapsed' : 'expanded'}
            variants={sidebarVariants}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className={`
                h-screen bg-card border-r border-border
                flex flex-col fixed left-0 top-0 z-40
                ${className}
            `}
        >
            {/* Logo / Brand */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-border">
                <AnimatePresence mode="wait">
                    {!collapsed && logo && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="font-bold text-lg text-foreground"
                        >
                            {logo}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Collapse toggle */}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onCollapsedChange?.(!collapsed)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                    <motion.div
                        animate={{ rotate: collapsed ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <Icons.ChevronLeft className="w-5 h-5 text-muted-foreground" />
                    </motion.div>
                </motion.button>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 overflow-y-auto py-4 px-2">
                <ul className="space-y-1">
                    {items.map((item) => {
                        const Icon = getIcon(item.icon);
                        const isActive = location.pathname === item.path ||
                            location.pathname.startsWith(item.path + '/');
                        const isHovered = hoveredItem === item.id;

                        return (
                            <li key={item.id}>
                                <NavLink
                                    to={item.path}
                                    onMouseEnter={() => setHoveredItem(item.id)}
                                    onMouseLeave={() => setHoveredItem(null)}
                                    className={`
                                        relative flex items-center gap-3 px-3 py-2.5 rounded-lg
                                        transition-colors duration-200
                                        ${isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }
                                    `}
                                >
                                    {/* Active indicator */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeIndicator"
                                            className="absolute inset-0 bg-primary rounded-lg"
                                            initial={false}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 500,
                                                damping: 35,
                                            }}
                                        />
                                    )}

                                    {/* Icon */}
                                    <span className="relative z-10 flex-shrink-0">
                                        <Icon className="w-5 h-5" />
                                    </span>

                                    {/* Label */}
                                    <motion.span
                                        variants={labelVariants}
                                        className="relative z-10 font-medium whitespace-nowrap"
                                    >
                                        {item.label}
                                    </motion.span>

                                    {/* Tooltip for collapsed state */}
                                    <AnimatePresence>
                                        {collapsed && isHovered && (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
                                                className="
                                                    absolute left-full ml-2 px-2 py-1
                                                    bg-popover text-popover-foreground
                                                    rounded-md shadow-lg text-sm font-medium
                                                    whitespace-nowrap z-50
                                                "
                                            >
                                                {item.label}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </NavLink>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-border">
                <motion.div
                    variants={labelVariants}
                    className="text-xs text-muted-foreground text-center"
                >
                    © 2024 School ERP
                </motion.div>
            </div>
        </motion.aside>
    );
}

export default Sidebar;
