// School Admin Login Page
// MIGRATED: Uses Keycloak OIDC login instead of backend /auth/login

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useKeycloakAuth } from '../../../core/auth/KeycloakAuthContext';
import { SchoolAuthLayout } from './SchoolAuthLayout';

export function SchoolAdminLoginPage() {
    const navigate = useNavigate();
    const { isAuthenticated, isLoading, login, hasAnyRole } = useKeycloakAuth();

    // Redirect authenticated admins to dashboard
    useEffect(() => {
        if (isAuthenticated) {
            if (hasAnyRole(['admin', 'school_admin', 'super_admin'])) {
                navigate('/admin/dashboard');
            } else {
                // Non-admin authenticated user - redirect to appropriate portal
                if (hasAnyRole(['teacher'])) {
                    navigate('/teacher');
                } else if (hasAnyRole(['student'])) {
                    navigate('/student');
                } else {
                    navigate('/dashboard');
                }
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
            <SchoolAuthLayout
                title="School Administration"
                subtitle="Verifying authentication..."
            >
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="mt-4 text-sm text-muted-foreground">Checking authentication status...</p>
                </div>
            </SchoolAuthLayout>
        );
    }

    return (
        <SchoolAuthLayout
            title="School Administration"
            subtitle="Secure access for school administrators and principals"
        >
            <div className="space-y-4">
                <button
                    onClick={handleLogin}
                    className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                    Sign in with Keycloak
                </button>
            </div>

            <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                    Not an admin?{' '}
                    <button
                        onClick={() => navigate('/login')}
                        className="text-primary hover:underline font-medium"
                    >
                        Student/Staff Login
                    </button>
                </p>
            </div>
        </SchoolAuthLayout>
    );
}

export default SchoolAdminLoginPage;