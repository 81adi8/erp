import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { secureStorage } from '../../storage/SecureStorage';
import { ROUTES } from '../../config/constants';
import { useTenant } from '../../tenant';

interface AuthGuardProps {
    children: ReactNode;
    redirectTo?: string;
}

/**
 * AuthGuard - Protects routes that require authentication
 * Redirects to login if user is not authenticated
 */
export function AuthGuard({ children, redirectTo }: AuthGuardProps) {
    const location = useLocation();
    const { tenant } = useTenant();

    // Check if user is authenticated
    let isAuthenticated = false;
    try {
        const token = secureStorage.getAuthToken();
        isAuthenticated = !!token;
    } catch {
        // Storage not initialized, user not authenticated
        isAuthenticated = false;
    }

    if (!isAuthenticated) {
        // Determine redirect path
        let finalRedirect = redirectTo || ROUTES.LOGIN;

        // If it's a school tenant and trying to access /admin, redirect to /admin (which is the admin login)
        if (!redirectTo && location.pathname.startsWith('/admin') && tenant?.type === 'school') {
            finalRedirect = '/admin/dashboard';
        }

        // Save the attempted URL for redirecting after login
        return <Navigate to={finalRedirect} state={{ from: location }} replace />;
    }

    return <>{children}</>;
}

/**
 * GuestGuard - Protects routes that should only be accessible to guests
 * Redirects to dashboard if user is authenticated
 */
export function GuestGuard({ children, redirectTo = ROUTES.DASHBOARD }: AuthGuardProps) {
    let isAuthenticated = false;
    try {
        const token = secureStorage.getAuthToken();
        isAuthenticated = !!token;
    } catch {
        isAuthenticated = false;
    }

    if (isAuthenticated) {
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
}

export default AuthGuard;
