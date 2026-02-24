// ============================================================================
// School Layout - Modern animated layout with sidebar and header
// ============================================================================
import { Outlet } from 'react-router-dom';
import { Suspense, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingFallback } from '../../../core/utils/moduleLoader';
import { Sidebar, Header, PageTransition } from '@erp/common';
import type { NavItem } from '@erp/common';
import { schoolNavigation } from '../navigation';
import { useLogoutMutation, useGetCurrentUserQuery } from '../../../core/api/endpoints/authApi';
import { secureStorage } from '../../../core/storage/SecureStorage';
import { useNavigate } from 'react-router-dom';

// Convert navigation config to NavItem format
const navItems: NavItem[] = schoolNavigation.map(item => ({
    id: item.id,
    label: item.label,
    path: item.path,
    icon: item.icon,
    permission: item.permission,
}));

export default function SchoolLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const [logout] = useLogoutMutation();
    const { data: userData } = useGetCurrentUserQuery();

    const user = userData?.data?.user;

    const handleLogout = async () => {
        try {
            await logout().unwrap();
        } catch {
            // Ignore logout errors
        }
        secureStorage.clearAll();
        navigate('/login');
    };

    // Close mobile menu when navigating
    const handleMobileMenuClose = () => setMobileMenuOpen(false);

    return (
        <div className="school-layout min-h-screen bg-background">
            {/* Sidebar - Desktop Only */}
            <div className="hidden lg:block fixed left-0 top-0 h-full z-30">
                <Sidebar
                    items={navItems}
                    logo={<span className="text-primary">🏫 School ERP</span>}
                    collapsed={sidebarCollapsed}
                    onCollapsedChange={setSidebarCollapsed}
                />
            </div>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                            onClick={handleMobileMenuClose}
                        />
                        <motion.div
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed left-0 top-0 h-full z-50 lg:hidden"
                        >
                            <Sidebar
                                items={navItems}
                                logo={<span className="text-primary">🏫 School ERP</span>}
                                collapsed={false}
                                onItemClick={handleMobileMenuClose}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content Area - Responsive margin */}
            <div
                className={`
                    min-h-screen transition-[margin-left] duration-300
                    lg:ml-[260px]
                    ${sidebarCollapsed ? 'lg:!ml-[72px]' : ''}
                `}
            >
                {/* Header */}
                <Header
                    user={user ? {
                        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
                        email: user.email,
                    } : undefined}
                    onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    onLogout={handleLogout}
                    showSearch
                />

                {/* Page Content */}
                <main className="p-4 lg:p-6">
                    <Suspense fallback={<LoadingFallback message="Loading page..." />}>
                        <PageTransition variant="fade" duration={0.2}>
                            <Outlet />
                        </PageTransition>
                    </Suspense>
                </main>
            </div>
        </div>
    );
}
