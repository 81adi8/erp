// ============================================================================
// Header Component - Top bar with user menu and theme switcher
// ============================================================================
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Bell, Search, ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { ThemeSwitcher } from '../ThemeSwitcher';

interface UserInfo {
    name: string;
    email: string;
    avatar?: string;
    initials?: string;
}

interface HeaderProps {
    /** User information */
    user?: UserInfo;
    /** Sidebar toggle callback (for mobile) */
    onMenuClick?: () => void;
    /** Logout callback */
    onLogout?: () => void;
    /** Show search bar */
    showSearch?: boolean;
    /** Custom class */
    className?: string;
    /** Title to display */
    title?: string;
}

/**
 * Header - Top navigation bar with user menu and theme switcher
 */
export function Header({
    user,
    onMenuClick,
    onLogout,
    showSearch = false,
    className = '',
    title,
}: HeaderProps) {
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const initials = user?.initials ||
        (user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()) ||
        'U';

    return (
        <header
            className={`
                h-16 bg-card border-b border-border
                flex items-center justify-between px-4 lg:px-6
                sticky top-0 z-30
                ${className}
            `}
        >
            {/* Left side */}
            <div className="flex items-center gap-4">
                {/* Mobile menu button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onMenuClick}
                    className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
                >
                    <Menu className="w-5 h-5 text-muted-foreground" />
                </motion.button>

                {/* Title */}
                {title && (
                    <h1 className="text-lg font-semibold text-foreground hidden sm:block">
                        {title}
                    </h1>
                )}

                {/* Search */}
                {showSearch && (
                    <div className="hidden md:flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                        <Search className="w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="bg-transparent border-none outline-none text-sm w-48 text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
                {/* Theme Switcher */}
                <ThemeSwitcher variant="dropdown" showPreview />

                {/* Notifications */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative p-2 rounded-lg hover:bg-muted transition-colors"
                >
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    {/* Notification dot */}
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
                </motion.button>

                {/* User Menu */}
                <div className="relative">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                        {/* Avatar */}
                        {user?.avatar ? (
                            <img
                                src={user.avatar}
                                alt={user.name}
                                className="w-8 h-8 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                                {initials}
                            </div>
                        )}

                        {/* Name (hidden on mobile) */}
                        <span className="hidden lg:block text-sm font-medium text-foreground">
                            {user?.name || 'User'}
                        </span>

                        <motion.div
                            animate={{ rotate: isUserMenuOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="hidden lg:block"
                        >
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </motion.div>
                    </motion.button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                        {isUserMenuOpen && (
                            <>
                                {/* Backdrop */}
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setIsUserMenuOpen(false)}
                                />

                                {/* Menu */}
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className="
                                        absolute right-0 top-full mt-2
                                        w-56 bg-card rounded-lg
                                        border border-border shadow-lg
                                        z-50 overflow-hidden
                                    "
                                >
                                    {/* User info */}
                                    <div className="p-3 border-b border-border">
                                        <p className="font-medium text-foreground">
                                            {user?.name || 'User'}
                                        </p>
                                        <p className="text-sm text-muted-foreground truncate">
                                            {user?.email || 'user@example.com'}
                                        </p>
                                    </div>

                                    {/* Menu items */}
                                    <div className="py-1">
                                        <button
                                            onClick={() => {
                                                setIsUserMenuOpen(false);
                                            }}
                                            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                        >
                                            <User className="w-4 h-4" />
                                            Profile
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsUserMenuOpen(false);
                                            }}
                                            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                        >
                                            <Settings className="w-4 h-4" />
                                            Settings
                                        </button>
                                    </div>

                                    {/* Logout */}
                                    <div className="border-t border-border py-1">
                                        <button
                                            onClick={() => {
                                                setIsUserMenuOpen(false);
                                                onLogout?.();
                                            }}
                                            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Logout
                                        </button>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </header>
    );
}

export default Header;
