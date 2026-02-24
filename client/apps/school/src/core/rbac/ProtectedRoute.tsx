// ============================================================================
// Protected Route Components - Scalable Multi-Tenant RBAC
// ============================================================================
import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePermission } from './PermissionProvider';
import { ROLE_LEVELS, type RoleLevelValue } from './roleHierarchy';

interface ProtectedRouteProps {
    children: ReactNode;
    // Permission-based access
    permission?: string;
    permissions?: string[];
    requireAll?: boolean;
    // Role name-based access (specific role names)
    role?: string;
    roles?: string[];
    // Role level-based access (tenant-agnostic)
    minRoleLevel?: RoleLevelValue;
    // Fallback/redirect
    fallback?: ReactNode;
    redirectTo?: string;
}

/**
 * ProtectedRoute - Wraps routes that require authentication/authorization
 * 
 * Supports three access control methods:
 * 1. Permission-based: Check for specific permissions
 * 2. Role name-based: Check for specific role names
 * 3. Role level-based: Check minimum role level (recommended for multi-tenant)
 * 
 * @example
 * // Permission-based
 * <ProtectedRoute permission="students.view">...</ProtectedRoute>
 * 
 * // Role name-based (tenant-specific)
 * <ProtectedRoute role="admin">...</ProtectedRoute>
 * 
 * // Role level-based (tenant-agnostic) - RECOMMENDED
 * <ProtectedRoute minRoleLevel={ROLE_LEVELS.STAFF}>...</ProtectedRoute>
 * <ProtectedRoute minRoleLevel={ROLE_LEVELS.ADMIN}>...</ProtectedRoute>
 */
export function ProtectedRoute({
    children,
    permission,
    permissions,
    requireAll = false,
    role,
    roles,
    minRoleLevel,
    fallback,
    redirectTo = '/unauthorized',
}: ProtectedRouteProps) {
    const location = useLocation();
    const {
        isLoading,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
        hasAnyRole,
        hasMinRoleLevel,
    } = usePermission();

    // Show loading state while permissions are being fetched
    if (isLoading) {
        if (fallback) return <>{fallback}</>;
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    
    // Check role level-based access (tenant-agnostic - most flexible)
    if (minRoleLevel !== undefined && !hasMinRoleLevel(minRoleLevel)) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    // Check role name-based access
    if (role && !hasRole(role)) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    if (roles && roles.length > 0 && !hasAnyRole(roles)) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    // Check permission-based access
    if (permission && !hasPermission(permission)) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    if (permissions && permissions.length > 0) {
        const hasAccess = requireAll
            ? hasAllPermissions(permissions)
            : hasAnyPermission(permissions);

        if (!hasAccess) {
            return <Navigate to={redirectTo} state={{ from: location }} replace />;
        }
    }

    return <>{children}</>;
}

// ============================================================================
// PermissionGate - Conditionally render content based on permissions
// ============================================================================

interface PermissionGateProps {
    children: ReactNode;
    permission?: string;
    permissions?: string[];
    requireAll?: boolean;
    role?: string;
    roles?: string[];
    minRoleLevel?: RoleLevelValue;
    fallback?: ReactNode;
}

/**
 * PermissionGate - Conditionally render content based on permissions/roles
 * Same as ProtectedRoute but doesn't redirect - just hides content
 * 
 * @example
 * // Show delete button only for admins
 * <PermissionGate minRoleLevel={ROLE_LEVELS.ADMIN}>
 *   <DeleteButton />
 * </PermissionGate>
 * 
 * // Show with fallback
 * <PermissionGate permission="reports.export" fallback={<DisabledExportButton />}>
 *   <ExportButton />
 * </PermissionGate>
 */
export function PermissionGate({
    children,
    permission,
    permissions,
    requireAll = false,
    role,
    roles,
    minRoleLevel,
    fallback = null,
}: PermissionGateProps) {
    const {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
        hasAnyRole,
        hasMinRoleLevel,
    } = usePermission();

    // Check role level-based access
    if (minRoleLevel !== undefined && !hasMinRoleLevel(minRoleLevel)) {
        return <>{fallback}</>;
    }

    // Check role name-based access
    if (role && !hasRole(role)) {
        return <>{fallback}</>;
    }

    if (roles && roles.length > 0 && !hasAnyRole(roles)) {
        return <>{fallback}</>;
    }

    // Check permission-based access
    if (permission && !hasPermission(permission)) {
        return <>{fallback}</>;
    }

    if (permissions && permissions.length > 0) {
        const hasAccess = requireAll
            ? hasAllPermissions(permissions)
            : hasAnyPermission(permissions);

        if (!hasAccess) {
            return <>{fallback}</>;
        }
    }

    return <>{children}</>;
}

// Re-export role levels for convenience
export { ROLE_LEVELS };

