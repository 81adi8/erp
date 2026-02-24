// ============================================================================
// PermissionGuard - Route-level permission protection
// ============================================================================
import { type ReactNode } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import NoPermissionPage from '../error/NoPermissionPage';

// ============================================================================
// Types
// ============================================================================

interface PermissionGuardProps {
    /** Required permission key(s) - user must have at least one */
    permissions?: string | string[];
    /** Required role(s) - user must have at least one */
    roles?: string | string[];
    /** If true, user must have ALL permissions (not just one) */
    requireAll?: boolean;
    /** Children to render if authorized */
    children: ReactNode;
    /** Custom fallback component instead of NoPermissionPage */
    fallback?: ReactNode;
    /** Custom message for the no permission page */
    message?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * PermissionGuard - Protects routes based on permissions or roles
 * 
 * Usage:
 * ```tsx
 * <PermissionGuard permissions="academics.students.view">
 *   <StudentsPage />
 * </PermissionGuard>
 * 
 * <PermissionGuard permissions={['reports.view', 'analytics.view']} roles="admin">
 *   <ReportsPage />
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
    permissions,
    roles,
    requireAll = false,
    children,
    fallback,
    message
}: PermissionGuardProps) {
    const {
        hasAnyPermission,
        hasAllPermissions,
        hasAnyRole,
        isAdmin,
        isLoading
    } = usePermissions();

    // Show loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Checking permissions...</p>
                </div>
            </div>
        );
    }

    // Check role access
    let hasRoleAccess = true;
    if (roles) {
        const roleList = Array.isArray(roles) ? roles : [roles];
        hasRoleAccess = hasAnyRole(roleList);
    }

    // Check permission access
    let hasPermissionAccess = true;
    if (permissions) {
        const permList = Array.isArray(permissions) ? permissions : [permissions];
        if (requireAll) {
            hasPermissionAccess = hasAllPermissions(permList);
        } else {
            hasPermissionAccess = hasAnyPermission(permList);
        }
    }

    // User needs to pass both role check AND permission check (if both specified)
    // If only one is specified, just that one is checked
    const hasAccess = hasRoleAccess && hasPermissionAccess;

    // Debug logging
    console.log('[PermissionGuard] Access check:', {
        path: window.location.pathname,
        requiredPermissions: permissions,
        isAdmin,
        hasRoleAccess,
        hasPermissionAccess,
        hasAccess: isAdmin || hasAccess
    });

    // Admin bypasses all permission checks - Commented out to support granular control
    // if (isAdmin) {
    //     return <>{children}</>;
    // }

    if (!hasAccess) {
        // Return custom fallback or NoPermissionPage
        if (fallback) {
            return <>{fallback}</>;
        }

        const requiredPermission = Array.isArray(permissions)
            ? permissions.join(' or ')
            : permissions;

        return (
            <NoPermissionPage
                requiredPermission={requiredPermission}
                message={message}
            />
        );
    }

    return <>{children}</>;
}

// ============================================================================
// Higher-Order Component Version
// ============================================================================

/**
 * withPermissionGuard - HOC to wrap components with permission check
 * 
 * Usage:
 * ```tsx
 * export default withPermissionGuard('students.view')(StudentsPage);
 * ```
 */
export function withPermissionGuard(
    permissions?: string | string[],
    options?: { roles?: string | string[]; requireAll?: boolean; message?: string }
) {
    return function <P extends object>(WrappedComponent: React.ComponentType<P>) {
        return function WithPermissionGuard(props: P) {
            return (
                <PermissionGuard
                    permissions={permissions}
                    roles={options?.roles}
                    requireAll={options?.requireAll}
                    message={options?.message}
                >
                    <WrappedComponent {...props} />
                </PermissionGuard>
            );
        };
    };
}

// ============================================================================
// Utility Components
// ============================================================================

/**
 * PermissionGate - Conditionally render content based on permissions
 * Does NOT show error page, just hides content
 * 
 * Usage:
 * ```tsx
 * <PermissionGate permissions="users.delete">
 *   <DeleteButton />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
    permissions,
    roles,
    requireAll = false,
    children,
    fallback = null
}: Omit<PermissionGuardProps, 'message'>) {
    const {
        hasAnyPermission,
        hasAllPermissions,
        hasAnyRole,
        isAdmin,
        isLoading
    } = usePermissions();

    if (isLoading) {
        return null;
    }

    // Admin sees everything
    if (isAdmin) {
        return <>{children}</>;
    }

    // Check role access
    let hasRoleAccess = true;
    if (roles) {
        const roleList = Array.isArray(roles) ? roles : [roles];
        hasRoleAccess = hasAnyRole(roleList);
    }

    // Check permission access
    let hasPermissionAccess = true;
    if (permissions) {
        const permList = Array.isArray(permissions) ? permissions : [permissions];
        if (requireAll) {
            hasPermissionAccess = hasAllPermissions(permList);
        } else {
            hasPermissionAccess = hasAnyPermission(permList);
        }
    }

    if (!hasRoleAccess || !hasPermissionAccess) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

export default PermissionGuard;
