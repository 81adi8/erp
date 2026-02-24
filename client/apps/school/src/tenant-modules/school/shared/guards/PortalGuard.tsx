// ============================================================================
// PortalGuard - Role-Based Portal Access Control
// ============================================================================

import { Navigate } from 'react-router-dom';
import { usePermission } from '../../../../core/rbac';
// usePermissi
import { canAccessPortal, getDefaultPortal } from '../../config/portals.config';

// ============================================================================
// Types
// ============================================================================

interface PortalGuardProps {
    /** Portal ID to check access for */
    portalId: string;
    /** Component to render if access granted */
    children: React.ReactNode;
    /** Redirect path if unauthorized (default: appropriate portal) */
    fallbackPath?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * PortalGuard - Protects portal routes based on user role
 * 
 * Usage:
 * <PortalGuard portalId="admin">
 *   <AdminRoutes />
 * </PortalGuard>
 */
export function PortalGuard({ portalId, children, fallbackPath }: PortalGuardProps) {
    const { roleLevel, roles, isLoading } = usePermission();

    // Show loading while checking permissions
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Check if user can access this portal
    const hasAccess = canAccessPortal(portalId, roleLevel, roles);

    // Debug logging for portal access
    console.log('[PortalGuard] Checking access:', { portalId, roleLevel, roles, hasAccess });

    if (!hasAccess) {
        // Redirect to appropriate portal or fallback
        const redirectPath = fallbackPath || getDefaultPortal(roleLevel, roles);
        console.log('[PortalGuard] Access denied, redirecting to:', redirectPath);
        return <Navigate to={redirectPath} replace />;
    }

    return <>{children}</>;
}

// ============================================================================
// Higher-Order Component Version
// ============================================================================

/**
 * withPortalGuard - HOC to wrap components with portal access check
 * 
 * Usage:
 * export default withPortalGuard('admin')(AdminDashboard);
 */
export function withPortalGuard(portalId: string) {
    return function <P extends object>(WrappedComponent: React.ComponentType<P>) {
        return function WithPortalGuard(props: P) {
            return (
                <PortalGuard portalId={portalId}>
                    <WrappedComponent {...props} />
                </PortalGuard>
            );
        };
    };
}

export default PortalGuard;
