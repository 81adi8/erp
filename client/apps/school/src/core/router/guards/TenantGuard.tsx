import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTenant } from '../../tenant/useTenant';
import { ROUTES } from '../../config/constants';

interface TenantGuardProps {
    children: ReactNode;
    fallbackPath?: string;
}

/**
 * TenantGuard - Protects routes that require a valid tenant
 * Redirects to login or shows error if tenant is invalid
 */
export function TenantGuard({ children, fallbackPath = ROUTES.LOGIN }: TenantGuardProps) {
    const { isLoading, isValidTenant, isMainDomain, error } = useTenant();
    const location = useLocation();

    // Show loading state while tenant is being resolved
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }

    // Main domain should be handled by TenantProvider redirect
    if (isMainDomain) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-2xl font-bold mb-4">Invalid Access</h1>
                <p className="text-gray-600">Please access the application via your institution's subdomain.</p>
            </div>
        );
    }

    // Invalid tenant
    if (!isValidTenant) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-2xl font-bold mb-4 text-red-600">Invalid Institution</h1>
                <p className="text-gray-600 mb-4">
                    {error || 'The institution you are trying to access does not exist.'}
                </p>
                <a href="/" className="text-primary hover:underline">
                    Go to Homepage
                </a>
            </div>
        );
    }

    // Valid tenant - render children
    return <>{children}</>;
}

export default TenantGuard;
