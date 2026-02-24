// School-specific Login Page (Student, Teacher, Staff)
// MIGRATED: Uses Keycloak OIDC login instead of backend /auth/login

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Users, Briefcase, ShieldCheck, Loader2 } from 'lucide-react';
import { useKeycloakAuth } from '../../../core/auth/KeycloakAuthContext';
import { SchoolAuthLayout } from './SchoolAuthLayout';
import { cn } from '@erp/common';

type LoginRole = 'student' | 'teacher' | 'staff';

const ROLES_CONFIG = [
    { id: 'student' as const, label: 'Student', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'teacher' as const, label: 'Teacher', icon: GraduationCap, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { id: 'staff' as const, label: 'Staff', icon: Briefcase, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
];

export function SchoolLoginPage() {
    const navigate = useNavigate();
    const { isAuthenticated, isLoading, login, hasAnyRole } = useKeycloakAuth();

    // Redirect authenticated users based on role
    useEffect(() => {
        if (isAuthenticated) {
            if (hasAnyRole(['admin', 'school_admin'])) {
                navigate('/admin/dashboard');
            } else if (hasAnyRole(['teacher'])) {
                navigate('/teacher');
            } else if (hasAnyRole(['student'])) {
                navigate('/student');
            } else if (hasAnyRole(['staff'])) {
                navigate('/staff');
            } else {
                // Default fallback
                navigate('/dashboard');
            }
        }
    }, [isAuthenticated, hasAnyRole, navigate]);

    // Handle login - redirects to Keycloak
    const handleLogin = () => {
        login();
    };

    // Show loading state while checking authentication
    if (isLoading) {
        return (
            <SchoolAuthLayout title="School Login" subtitle="Verifying authentication...">
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="mt-4 text-sm text-muted-foreground">Checking authentication status...</p>
                </div>
            </SchoolAuthLayout>
        );
    }

    return (
        <SchoolAuthLayout
            title="School Login"
            subtitle="Access your personal portal"
        >
            <div className="mb-8">
                <p className="text-sm font-medium text-muted-foreground mb-4 text-center">
                    Select your portal
                </p>
                <div className="grid grid-cols-3 gap-3">
                    {ROLES_CONFIG.map((role) => {
                        const Icon = role.icon;

                        return (
                            <button
                                key={role.id}
                                onClick={handleLogin}
                                className={cn(
                                    "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200",
                                    "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
                                )}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center mb-1",
                                    role.bg,
                                    role.color
                                )}>
                                    <Icon size={20} />
                                </div>
                                <span className="text-xs font-semibold text-muted-foreground">
                                    {role.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-4">
                <button
                    onClick={handleLogin}
                    className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                    Sign in with Keycloak
                </button>
            </div>

            <div className="mt-8 pt-6 border-t border-border">
                <div className="flex items-center justify-center gap-2 text-sm">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Are you an administrator?</span>
                    <button
                        onClick={() => navigate('/admin')}
                        className="text-primary hover:underline font-semibold"
                    >
                        Admin Login
                    </button>
                </div>
            </div>
        </SchoolAuthLayout>
    );
}

export default SchoolLoginPage;