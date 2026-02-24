// ============================================================================
// Shared Portal Layout - Reusable layout for all portals
// ============================================================================
// This eliminates duplicacy across Admin, Teacher, Student, and Staff layouts
// ============================================================================

import { useState, type ReactNode } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, LogOut, type LucideIcon } from 'lucide-react';
import { DynamicNavigation } from './DynamicNavigation';
import { PortalHeader } from './PortalHeader';
import { useTenant } from '../../../../core/tenant/useTenant';
import { useLogoutMutation } from '../../../../core/api/endpoints/authApi';

// ============================================================================
// Types
// ============================================================================

export interface PortalConfig {
    /** Portal identifier */
    id: 'admin' | 'teacher' | 'student' | 'staff';
    /** Portal display name */
    name: string;
    /** Portal icon component */
    icon: LucideIcon;
    /** Primary color for the portal (tailwind class) */
    accentColor: string;
    /** Background color for icon */
    iconBgColor: string;
}

interface PortalLayoutProps {
    /** Portal configuration */
    config: PortalConfig;
    /** Optional header actions */
    headerActions?: ReactNode;
    /** Show search in header */
    showSearch?: boolean;
}

// ============================================================================
// Portal Layout Component
// ============================================================================

export function PortalLayout({ config, headerActions, showSearch = true }: PortalLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const { tenant } = useTenant();
    const [logout] = useLogoutMutation();

    const { id, name, icon: Icon, accentColor, iconBgColor } = config;

    const handleLogout = async () => {
        try {
            await logout().unwrap();
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Desktop Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: sidebarOpen ? 280 : 72 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="fixed left-0 top-0 h-full z-40 hidden lg:flex flex-col bg-card border-r border-border shadow-sm"
            >
                {/* Logo/Header */}
                <div className="flex items-center justify-between h-16 px-3 border-b border-border flex-shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl ${iconBgColor} flex-shrink-0 transition-all duration-200`}>
                            <Icon className={`w-5 h-5 ${accentColor}`} />
                        </div>
                        <AnimatePresence mode="wait">
                            {sidebarOpen && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.15 }}
                                    className="min-w-0 overflow-hidden"
                                >
                                    <p className="font-semibold text-foreground text-sm truncate">{name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{tenant?.name || 'School ERP'}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all flex-shrink-0"
                        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                    >
                        <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${sidebarOpen ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {/* Dynamic Navigation */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                    <DynamicNavigation
                        collapsed={!sidebarOpen}
                        accentColor={accentColor}
                    />
                </div>

                {/* Logout Button */}
                <div className="p-3 border-t border-border flex-shrink-0">
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-all ${!sidebarOpen ? 'justify-center' : ''
                            }`}
                        title={!sidebarOpen ? 'Logout' : undefined}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        <AnimatePresence>
                            {sidebarOpen && (
                                <motion.span
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    className="text-sm font-medium whitespace-nowrap"
                                >
                                    Logout
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </button>
                </div>
            </motion.aside>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileMenuOpen(false)}
                            className="lg:hidden fixed inset-0 bg-black/60 glass z-50"
                        />
                        <motion.aside
                            initial={{ x: -300 }}
                            animate={{ x: 0 }}
                            exit={{ x: -300 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="lg:hidden fixed left-0 top-0 h-full w-[280px] max-w-[85vw] z-50 glass shadow-2xl flex flex-col"
                        >
                            {/* Mobile Header */}
                            <div className="flex items-center justify-between h-16 px-4 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${iconBgColor}`}>
                                        <Icon className={`w-5 h-5 ${accentColor}`} />
                                    </div>
                                    <span className="font-semibold text-foreground">{name}</span>
                                </div>
                                <button
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                    aria-label="Close menu"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Mobile Navigation */}
                            <div className="flex-1 overflow-y-auto">
                                <DynamicNavigation
                                    onNavigate={() => setMobileMenuOpen(false)}
                                    accentColor={accentColor}
                                />
                            </div>

                            {/* Mobile Logout */}
                            <div className="p-4 border-t border-border">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center justify-center gap-3 px-4 py-3 text-red-500 bg-red-500/5 hover:bg-red-500/10 rounded-xl transition-colors font-medium"
                                >
                                    <LogOut className="w-5 h-5" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <div
                className={`transition-all duration-200 ${sidebarOpen ? 'lg:ml-[280px]' : 'lg:ml-[72px]'}`}
            >
                <PortalHeader
                    portal={id}
                    title={`${name.replace(' Portal', '')} Dashboard`}
                    icon={<Icon className="w-5 h-5" />}
                    showSearch={showSearch}
                    onMenuClick={() => setMobileMenuOpen(true)}
                >
                    {headerActions}
                </PortalHeader>

                {/* Page Content with responsive padding */}
                <main className="p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default PortalLayout;
