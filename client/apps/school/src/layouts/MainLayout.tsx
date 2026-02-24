// MainLayout - Dynamic navigation from server-based permissions
import { type ReactNode } from 'react';
import { useTenant } from '../core/tenant/useTenant';
import { useLogoutMutation } from '../core/api/endpoints/authApi';
import { Link, useNavigate } from 'react-router-dom';
import { DynamicNavigation } from '../common/components/DynamicNavigation';
import { LogOut, Bell, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { secureStorage } from '../core/storage/SecureStorage';

interface MainLayoutProps {
    children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const { tenant } = useTenant();
    const navigate = useNavigate();
    const [logout] = useLogoutMutation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Get user info from storage
    const user = secureStorage.getUser<{ firstName?: string; lastName?: string; email?: string }>();
    const userName = user?.firstName
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : user?.email || 'User';

    const handleLogout = async () => {
        try {
            await logout().unwrap();
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            // clearAuthData is called by the mutation, just navigate
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Desktop Sidebar */}
            <aside className="w-64 glass border-r border-border fixed h-full z-20 hidden lg:flex flex-col">
                {/* Logo/Tenant Name */}
                <div className="h-16 flex items-center px-6 border-b border-border flex-shrink-0">
                    {tenant?.logoUrl ? (
                        <img src={tenant.logoUrl} alt={tenant.name} className="h-8" />
                    ) : (
                        <span className="text-xl font-bold text-primary">
                            {tenant?.name || 'School ERP'}
                        </span>
                    )}
                </div>

                {/* Dynamic Navigation from server */}
                <div className="flex-1 overflow-hidden">
                    <DynamicNavigation />
                </div>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-border bg-card flex-shrink-0">
                    <Link
                        to="/settings"
                        className="flex items-center gap-3 px-4 py-2 rounded-lg mb-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                        <span>⚙️</span>
                        <span>Settings</span>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-72 bg-card border-r border-border z-40 lg:hidden transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    } flex flex-col`}
            >
                {/* Header with close button */}
                <div className="h-16 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
                    <span className="text-xl font-bold text-primary">
                        {tenant?.name || 'School ERP'}
                    </span>
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-2 rounded-lg hover:bg-muted"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-hidden">
                    <DynamicNavigation onNavigate={() => setIsMobileMenuOpen(false)} />
                </div>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-border flex-shrink-0">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 min-h-screen">
                {/* Header */}
                <header className="h-16 glass border-b border-border sticky top-0 z-10 px-4 lg:px-6 flex items-center justify-between">
                    {/* Mobile menu button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 rounded-lg hover:bg-muted lg:hidden"
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <h2 className="text-lg font-semibold text-foreground hidden lg:block">
                        {tenant?.type ? tenant.type.charAt(0).toUpperCase() + tenant.type.slice(1) : ''} Portal
                    </h2>

                    <div className="flex items-center gap-4">
                        {/* Notifications */}
                        <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                        </button>

                        {/* User Avatar */}
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:block text-right">
                                <p className="text-sm font-medium text-foreground">{userName}</p>
                                <p className="text-xs text-muted-foreground">
                                    {tenant?.type ? tenant.type.charAt(0).toUpperCase() + tenant.type.slice(1) : 'User'}
                                </p>
                            </div>
                            <div className="h-9 w-9 bg-primary/10 rounded-full overflow-hidden flex items-center justify-center">
                                <img
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random&color=fff`}
                                    alt="Profile"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-0">
                    {children}
                </div>
            </main>
        </div>
    );
}
