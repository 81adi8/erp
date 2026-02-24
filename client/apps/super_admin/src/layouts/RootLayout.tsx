import React, { memo, useState, useCallback, useMemo } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logout } from '../features/auth/authSlice';
import { hasPermission } from '../utils/permissions';
import { useLogoutMutation } from '../services';
import { useIsDarkMode, useTheme, Badge } from '@erp/common';
import {
    LayoutDashboard,
    Building2,
    Users,
    CreditCard,
    Settings,
    LogOut,
    Sun,
    Moon,
    Shield,
    Menu,
    ChevronLeft,
    Calendar,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const NavLink: React.FC<{ to: string; icon: React.ReactNode; children: React.ReactNode }> = memo(({
    to,
    icon,
    children
}) => {
    const location = useLocation();
    const isActive = useMemo(() =>
        location.pathname === to || (to !== '/' && location.pathname.startsWith(to)),
        [location.pathname, to]
    );

    return (
        <Link
            to={to}
            className={`
                flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all relative group
                ${isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:text-text'
                }
            `}
        >
            <span className={isActive ? 'text-primary' : 'text-text-muted group-hover:text-text transition-colors'}>
                {React.cloneElement(icon as React.ReactElement, { size: 18, strokeWidth: 2 })}
            </span>
            {children}
        </Link>
    );
});

NavLink.displayName = 'NavLink';

const SidebarContent: React.FC<{ isSqueezed?: boolean }> = memo(({ isSqueezed }) => {
    const location = useLocation();
    const path = location.pathname;

    const renderContent = () => {
        if (path.startsWith('/plans')) {
            return (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div>
                        {!isSqueezed && <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60 mb-5">Plan Insights</h3>}
                        <div className="space-y-2">
                            <button className={`w-full flex items-center ${isSqueezed ? 'justify-center' : 'justify-between'} p-3 rounded-2xl hover:bg-muted/50 transition-all text-xs font-semibold group border border-transparent hover:border-border/50`}>
                                <span className={`flex items-center gap-3 ${isSqueezed ? 'flex-col gap-1' : ''}`}>
                                    <Shield size={isSqueezed ? 20 : 16} className="text-primary group-hover:scale-110 transition-transform" />
                                    {!isSqueezed && 'Active Plans'}
                                </span>
                                {!isSqueezed && <Badge variant="success" className="h-5 px-1.5 text-[9px] font-semibold border-none ring-1 ring-success/20">12</Badge>}
                            </button>
                            <button className={`w-full flex items-center ${isSqueezed ? 'justify-center' : 'justify-between'} p-3 rounded-2xl hover:bg-muted/50 transition-all text-xs font-medium text-muted-foreground border border-transparent hover:border-border/50 group`}>
                                <span className={`flex items-center gap-3 ${isSqueezed ? 'flex-col gap-1' : ''}`}>
                                    <Building2 size={isSqueezed ? 20 : 16} className="group-hover:scale-110 transition-transform group-hover:text-primary" />
                                    {!isSqueezed && 'All Tiers'}
                                </span>
                                {!isSqueezed && <span className="text-[10px] font-mono opacity-60">3 / 3</span>}
                            </button>
                        </div>
                    </div>
                    {!isSqueezed && (
                        <div className="pt-6 border-t border-border/40">
                            <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10 shadow-sm shadow-primary/5">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    <p className="text-[10px] text-primary font-semibold uppercase tracking-widest">Pricing Tip</p>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                                    Yearly plans generally increase retention by 20%. Ensure your annual discount is compelling.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        if (path.startsWith('/permissions')) {
            return (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div>
                        {!isSqueezed && <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60 mb-5">Access Management</h3>}
                        {!isSqueezed && <p className="text-xs text-muted-foreground/70 mb-5 leading-relaxed font-medium">Jump to a module to manage its core features and permissions.</p>}
                        <div className="space-y-1.5">
                            {['Core Module', 'Academics', 'Finance', 'HRMS'].map(mod => (
                                <button key={mod} className={`w-full text-left p-3 rounded-2xl hover:bg-muted/50 transition-all text-xs font-semibold text-foreground flex items-center gap-3 border border-transparent hover:border-border/50 group ${isSqueezed ? 'justify-center' : ''}`}>
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary group-hover:scale-125 transition-all flex-shrink-0" />
                                    {!isSqueezed && mod}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        if (path.startsWith('/institutions')) {
            return (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div>
                        {!isSqueezed && <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60 mb-5">Institution Hub</h3>}
                        <div className="space-y-2">
                            <button className={`w-full flex items-center ${isSqueezed ? 'justify-center' : 'justify-between'} p-3.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 text-xs font-semibold shadow-sm ring-1 ring-primary/5 group`}>
                                <span className={`flex items-center gap-3 ${isSqueezed ? 'flex-col gap-1' : ''}`}>
                                    <Building2 size={isSqueezed ? 20 : 16} className="group-hover:scale-110 transition-transform" />
                                    {!isSqueezed && 'All Entities'}
                                </span>
                                {!isSqueezed && <Badge variant="default" className="bg-primary/20 text-primary border-none h-5 px-1.5 text-[9px]">42</Badge>}
                            </button>
                            <button className={`w-full flex items-center ${isSqueezed ? 'justify-center' : 'justify-between'} p-3.5 rounded-2xl hover:bg-muted/50 transition-all text-xs font-semibold text-muted-foreground border border-transparent hover:border-border/50 group`}>
                                <span className={`flex items-center gap-3 ${isSqueezed ? 'flex-col gap-1' : ''}`}>
                                    <Users size={isSqueezed ? 20 : 16} className="group-hover:scale-110 transition-transform group-hover:text-primary" />
                                    {!isSqueezed && 'Pending Approval'}
                                </span>
                                {!isSqueezed && <Badge variant="warning" className="h-5 px-1.5 text-[9px] border-none font-semibold ring-1 ring-warning/20">3</Badge>}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                <div className={`bg-muted/20 rounded-3xl ${isSqueezed ? 'p-4' : 'p-6'} border border-dashed border-border/60 flex flex-col items-center text-center group hover:bg-muted/30 transition-all`}>
                    <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                        <LayoutDashboard size={24} className="text-muted-foreground/40" />
                    </div>
                    {!isSqueezed && <p className="text-xs font-semibold text-muted-foreground leading-relaxed px-2">Select a module to see specific controls.</p>}
                </div>
                {!isSqueezed && (
                    <div>
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60 mb-4">System Log</h3>
                        <div className="space-y-5">
                            {[1, 2].map(i => (
                                <div key={i} className="flex gap-4 group">
                                    <div className="relative">
                                        <div className="w-2 h-2 rounded-full bg-success ring-4 ring-success/10 group-hover:scale-125 transition-all mt-1.5" />
                                        {i === 1 && <div className="absolute top-4 bottom-[-20px] left-1 w-px bg-border/40" />}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-semibold leading-tight text-foreground/90">New Institution Added</span>
                                        <span className="text-[10px] font-semibold text-muted-foreground/50 tracking-wide uppercase">2 mins ago</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return <div className="h-full">{renderContent()}</div>;
});

SidebarContent.displayName = 'SidebarContent';

export const RootLayout = () => {
    const { user } = useAppSelector((state) => state.auth);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const [logoutApi] = useLogoutMutation();
    const [showThemeMenu, setShowThemeMenu] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [isSqueezed, setIsSqueezed] = useState(false);

    const { theme, setTheme, availableThemes } = useTheme();
    const isDark = useIsDarkMode();

    const handleLogout = useCallback(async () => {
        try {
            await logoutApi().unwrap();
        } catch {
            // Continue with local logout even if API fails
        }
        dispatch(logout());
        navigate('/login');
    }, [dispatch, logoutApi, navigate]);

    return (
        <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-primary/20 selection:text-primary">
            {/* Top Header */}
            <header className="bg-surface border-b border-border/60 px-6 py-2.5 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-4 sm:gap-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileSidebarOpen(true)}
                            className="lg:hidden p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <Menu size={20} />
                        </button>

                        <button
                            onClick={() => setIsSqueezed(!isSqueezed)}
                            className="hidden lg:flex p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-primary transition-all active:scale-95 group"
                            title={isSqueezed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            <motion.div
                                animate={{ rotate: isSqueezed ? 180 : 0 }}
                                transition={{ type: 'spring', damping: 20 }}
                            >
                                <ChevronLeft size={20} />
                            </motion.div>
                        </button>

                        {/* Logo Section */}
                        <Link to="/" className="flex items-center gap-3 group transition-all">
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
                                <span className="text-white font-black text-xl">S</span>
                            </div>
                            <div className="flex flex-col hidden xs:flex">
                                <span className="font-bold text-lg tracking-tight text-foreground leading-none mb-0.5">Antigravity</span>
                                {user?.is_main && (
                                    <Badge variant="warning" size="sm" className="px-1 py-0 h-3 text-[8px] font-semibold uppercase tracking-widest border-none self-start leading-none opacity-80">
                                        Root
                                    </Badge>
                                )}
                            </div>
                        </Link>
                    </div>

                    {/* Global Horizontal Nav */}
                    <nav className="hidden xl:flex items-center gap-0.5 ml-4">
                        <NavLink to="/" icon={<LayoutDashboard size={17} />}>
                            Dashboard
                        </NavLink>

                        {hasPermission(user, 'manage_institutions') && (
                            <NavLink to="/institutions" icon={<Building2 size={17} />}>
                                Institutions
                            </NavLink>
                        )}

                        {hasPermission(user, 'manage_admins') && (
                            <NavLink to="/admins" icon={<Users size={17} />}>
                                Admins
                            </NavLink>
                        )}

                        {hasPermission(user, 'manage_plans') && (
                            <NavLink to="/plans" icon={<CreditCard size={17} />}>
                                Plans
                            </NavLink>
                        )}
                        
                        {hasPermission(user, 'manage_plans') && (
                            <NavLink to="/global-holidays" icon={<Calendar size={17} />}>
                                Global Holidays
                            </NavLink>
                        )}
                        
                        {hasPermission(user, 'manage_plans') && (
                            <NavLink to="/access-bundles" icon={<Settings size={17} />}>
                                Access Bundles
                            </NavLink>
                        )}

                        {hasPermission(user, 'manage_permissions') && (
                            <NavLink to="/permissions" icon={<Shield size={17} />}>
                                Access Control
                            </NavLink>
                        )}

                        {hasPermission(user, 'manage_plans') && (
                            <NavLink to="/role-templates" icon={<Users size={17} />}>
                                Role Templates
                            </NavLink>
                        )}

                        {hasPermission(user, 'manage_settings') && (
                            <NavLink to="/settings" icon={<Settings size={17} />}>
                                Settings
                            </NavLink>
                        )}
                    </nav>
                </div>

                <div className="flex items-center gap-3 sm:gap-4">
                    {/* Theme Toggle */}
                    <div className="relative">
                        <button
                            onClick={() => setShowThemeMenu(!showThemeMenu)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-all border border-border/40 group overflow-hidden"
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={isDark ? 'moon' : 'sun'}
                                    initial={{ y: 20, opacity: 0, rotate: -45 }}
                                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                                    exit={{ y: -20, opacity: 0, rotate: 45 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {isDark ? <Moon size={19} /> : <Sun size={19} />}
                                </motion.div>
                            </AnimatePresence>
                        </button>

                        <AnimatePresence>
                            {showThemeMenu && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowThemeMenu(false)}
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 top-full mt-3 w-48 bg-card rounded-2xl shadow-2xl border border-border p-2 z-50 overflow-hidden"
                                    >
                                        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 border-b border-border/40 mb-1">Appearance</div>
                                        {availableThemes.map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => {
                                                    setTheme(t.id);
                                                    setShowThemeMenu(false);
                                                }}
                                                className={`
                                                    w-full px-3 py-2 text-left text-xs rounded-xl transition-all flex items-center justify-between font-medium
                                                    ${theme.id === t.id
                                                        ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/5'
                                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                    }
                                                `}
                                            >
                                                {t.name}
                                                {theme.id === t.id && <div className="w-1 h-1 rounded-full bg-primary" />}
                                            </button>
                                        ))}
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="h-7 w-px bg-border/40 mx-0.5" />

                    {/* User Profile Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-3 pl-2 sm:pl-3 pr-1 py-1 transition-all group"
                        >
                            <div className="flex flex-col items-end hidden md:flex">
                                <span className="text-xs font-bold text-foreground leading-none mb-1">{user?.name}</span>
                                <span className="text-[10px] font-medium text-muted-foreground/50 leading-none">{user?.email}</span>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold transition-transform group-hover:scale-105">
                                {user?.name?.[0] || 'A'}
                            </div>
                        </button>

                        <AnimatePresence>
                            {showUserMenu && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowUserMenu(false)}
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 top-full mt-3 w-56 bg-card rounded-2xl shadow-2xl border border-border p-2 z-50 overflow-hidden"
                                    >
                                        <div className="px-4 py-4 mb-2 bg-muted/40 rounded-xl flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-background border border-border/50 flex items-center justify-center text-primary font-bold shadow-sm">
                                                {user?.name?.[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-foreground truncate leading-none mb-1">{user?.name}</p>
                                                <p className="text-[10px] font-medium text-muted-foreground truncate leading-none uppercase tracking-tighter">{user?.email}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-0.5">
                                            <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-muted text-[11px] font-medium text-muted-foreground hover:text-foreground transition-all group">
                                                <Settings size={15} className="text-muted-foreground/60 group-hover:text-primary transition-colors" /> Account Settings
                                            </button>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-error hover:bg-error/10 text-[11px] font-semibold transition-all"
                                            >
                                                <LogOut size={15} /> Sign Out
                                            </button>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            {/* Layout Wrapper with Dynamic Sidebar */}
            <div className="flex flex-1 relative overflow-hidden">
                {/* Desktop Sidebar */}
                <motion.aside
                    animate={{ width: isSqueezed ? 80 : 250 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="hidden lg:block sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto px-6 py-8 border-r border-border/40 bg-background/50 backdrop-blur-sm shrink-0"
                >
                    <SidebarContent isSqueezed={isSqueezed} />
                </motion.aside>

                {/* Mobile Sidebar Slider */}
                <AnimatePresence>
                    {isMobileSidebarOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setMobileSidebarOpen(false)}
                                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] lg:hidden"
                            />
                            <motion.aside
                                initial={{ x: -300 }}
                                animate={{ x: 0 }}
                                exit={{ x: -300 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="fixed inset-y-0 left-0 w-72 bg-card border-r border-border shadow-2xl z-[101] lg:hidden overflow-y-auto p-6"
                            >
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">S</div>
                                        <span className="font-bold text-sm tracking-tight">Antigravity</span>
                                    </div>
                                    <button
                                        onClick={() => setMobileSidebarOpen(false)}
                                        className="p-2 rounded-xl hover:bg-muted text-muted-foreground"
                                    >
                                        <Menu size={18} />
                                    </button>
                                </div>
                                <SidebarContent />
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>

                <main className="flex-1 min-w-0 bg-background overflow-hidden relative">
                    <div className="h-full overflow-y-auto bg-muted/10">
                        <div className="max-w-[1600px] mx-auto min-h-full flex flex-col">
                            <div className="flex-1 px-6 py-8">
                                <Outlet />
                            </div>
                            {/* Footer */}
                            <footer className="px-8 py-10 mt-auto border-t border-border/30 text-center">
                                <p className="text-[10px] text-muted-foreground/40 font-semibold tracking-[0.2em] uppercase">
                                    &copy; 2025 Antigravity Cloud Platform. All rights reserved.
                                </p>
                            </footer>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

