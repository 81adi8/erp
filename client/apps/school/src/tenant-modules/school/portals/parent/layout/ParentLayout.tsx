/**
 * Parent Layout
 * Mobile-first layout with bottom navigation
 */
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Home, User, Calendar, FileText, IndianRupee, LogOut, ChevronDown } from 'lucide-react';
import { useParent } from '../context/ParentContext';
import { useAuth } from '../../../../../core/hooks/useAuth';
import { LoadingSpinner } from '@erp/common';

export default function ParentLayout() {
    const { children, selectedChild, setSelectedChild, isLoading, hasChildren } = useParent();
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/parent/login');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (!hasChildren) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                        <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground mb-2">No Children Linked</h2>
                    <p className="text-muted-foreground text-sm mb-4">
                        Your account is not linked to any student. Please contact the school administration.
                    </p>
                    <button onClick={handleLogout} className="text-primary text-sm hover:underline">
                        Logout
                    </button>
                </div>
            </div>
        );
    }

    const navItems = [
        { to: '/parent/dashboard', icon: Home, label: 'Home' },
        { to: '/parent/child', icon: User, label: 'Profile' },
        { to: '/parent/attendance', icon: Calendar, label: 'Attendance' },
        { to: '/parent/marks', icon: FileText, label: 'Marks' },
        { to: '/parent/fees', icon: IndianRupee, label: 'Fees' },
    ];

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-card border-b border-border">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-muted-foreground">Welcome,</p>
                            <p className="font-semibold text-foreground text-sm">{user?.firstName || 'Parent'}</p>
                        </div>
                        <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-foreground">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Child Selector */}
                    {children.length > 1 && (
                        <div className="mt-3">
                            <div className="relative">
                                <select
                                    value={selectedChild?.id || ''}
                                    onChange={(e) => {
                                        const child = children.find(c => c.id === e.target.value);
                                        setSelectedChild(child || null);
                                    }}
                                    className="w-full h-10 px-3 pr-10 rounded-lg border border-input bg-background text-sm appearance-none"
                                >
                                    {children.map((child) => (
                                        <option key={child.id} value={child.id}>
                                            {child.firstName} {child.lastName} - {child.class_name || 'No Class'}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {/* Single Child Display */}
                    {children.length === 1 && selectedChild && (
                        <div className="mt-3 flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium text-foreground text-sm">
                                    {selectedChild.firstName} {selectedChild.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {selectedChild.class_name} {selectedChild.section_name}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="px-4 py-4">
                <Outlet />
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
                <div className="flex items-center justify-around">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex flex-col items-center py-2 px-3 min-w-[60px] ${
                                    isActive ? 'text-primary' : 'text-muted-foreground'
                                }`
                            }
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="text-[10px] mt-1">{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>
        </div>
    );
}