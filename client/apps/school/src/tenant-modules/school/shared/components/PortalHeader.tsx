// ============================================================================
// Portal Header Component - Using Tailwind Theme Classes
// ============================================================================

import { motion } from 'framer-motion';
import { Bell, Search, ChevronDown, LogOut, User, Settings, Menu, Maximize, Minimize } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeSwitcher, useFullscreen, Tooltip } from '@erp/common';
import { SessionSelector } from './SessionSelector';
import { secureStorage } from '../../../../core/storage/SecureStorage';
import { usePermission } from '../../../../core/rbac';

// Portal-specific configs
export type PortalType = 'admin' | 'teacher' | 'student' | 'staff';

// User interface for proper typing
interface User {
    firstName?: string;
    lastName?: string;
    email?: string;
}

interface PortalHeaderProps {
    portal: PortalType;
    title?: string;
    icon?: React.ReactNode;
    showSearch?: boolean;
    onMenuClick?: () => void;
    className?: string;
    /** Custom actions to render in the header */
    children?: React.ReactNode;
}

const portalAccentClasses: Record<PortalType, { bg: string; text: string }> = {
    admin: { bg: 'bg-primary', text: 'text-primary' },
    teacher: { bg: 'bg-secondary', text: 'text-secondary' },
    student: { bg: 'bg-success', text: 'text-success' },
    staff: { bg: 'bg-warning', text: 'text-warning' },
};

export function PortalHeader({
    portal,
    title,
    icon,
    showSearch = false,
    onMenuClick,
    className = '',
    children,
}: PortalHeaderProps) {
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const navigate = useNavigate();
    const { roles } = usePermission();
    const user = secureStorage.getUser<User>();
    const accentClasses = portalAccentClasses[portal];
    const { isFullscreen, toggleFullscreen } = useFullscreen();

    const initials = user?.firstName?.[0] || 'U';
    const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User' : 'User';

    const handleLogout = () => {
        secureStorage.removeAuthToken();
        secureStorage.removeRefreshToken();
        secureStorage.removeUser();
        secureStorage.setSessionValid(false);
        navigate('/login');
    };

    return (
        <header className={`h-16 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 bg-surface border-b border-border ${className}`}>
            {/* Left side */}
            <div className="flex items-center gap-4">
                {onMenuClick && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onMenuClick}
                        className="lg:hidden p-2 rounded-lg text-text-muted hover:bg-muted"
                    >
                        <Menu className="w-5 h-5" />
                    </motion.button>
                )}

                {(icon || title) && (
                    <div className="flex items-center gap-2">
                        {icon && (
                            <div className={`p-1.5 rounded-lg hidden lg:flex ${accentClasses.bg}/10`}>
                                <span className={accentClasses.text}>{icon}</span>
                            </div>
                        )}
                        {title && (
                            <h1 className="text-lg font-semibold text-text hidden sm:block">{title}</h1>
                        )}
                    </div>
                )}

                {showSearch && (
                    <div className="hidden md:flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                        <Search className="w-4 h-4 text-text-muted" />
                        <input type="text" placeholder="Search..." className="bg-transparent border-none outline-none text-sm w-48 text-text placeholder:text-text-muted" />
                    </div>
                )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
                {/* Custom header actions */}
                {children}

                {/* Academic Session Selector */}
                <SessionSelector />

                <ThemeSwitcher variant="dropdown" showPreview />

                <Tooltip content={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'} position="bottom">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleFullscreen}
                        className="p-2 rounded-lg text-text-muted hover:bg-muted hidden sm:flex"
                    >
                        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </motion.button>
                </Tooltip>

                <Tooltip content="Notifications" position="bottom">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative p-2 rounded-lg text-text-muted hover:bg-muted"
                    >
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error" />
                    </motion.button>
                </Tooltip>

                <div className="relative">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted"
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${accentClasses.bg}`}>
                            {initials}
                        </div>
                        <span className="hidden lg:block text-sm font-medium text-text">{userName}</span>
                        <motion.div animate={{ rotate: isUserMenuOpen ? 180 : 0 }} transition={{ duration: 0.2 }} className="hidden lg:block text-text-muted">
                            <ChevronDown className="w-4 h-4" />
                        </motion.div>
                    </motion.button>

                    {isUserMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 top-full mt-2 w-56 rounded-lg z-50 overflow-hidden bg-surface border border-border shadow-lg"
                            >
                                <div className="p-3 border-b border-border">
                                    <p className="font-medium text-text">{userName}</p>
                                    <p className="text-sm text-text-muted truncate">{user?.email || 'user@example.com'}</p>
                                    <p className={`text-xs mt-1 ${accentClasses.text}`}>{roles[0] || portal.charAt(0).toUpperCase() + portal.slice(1)}</p>
                                </div>

                                <div className="py-1">
                                    <button onClick={() => { setIsUserMenuOpen(false); navigate(`/${portal}/profile`); }}
                                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-text hover:bg-muted">
                                        <User className="w-4 h-4" />Profile
                                    </button>
                                    <button onClick={() => setIsUserMenuOpen(false)}
                                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-text hover:bg-muted">
                                        <Settings className="w-4 h-4" />Settings
                                    </button>
                                </div>

                                <div className="border-t border-border py-1">
                                    <button onClick={() => { setIsUserMenuOpen(false); handleLogout(); }}
                                        className="flex items-center gap-3 w-full px-3 py-2 text-sm text-error hover:bg-error/10">
                                        <LogOut className="w-4 h-4" />Logout
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}

export default PortalHeader;
