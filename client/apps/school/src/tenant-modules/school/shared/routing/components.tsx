/**
 * Shared Routing Components
 * 
 * Reusable components for route protection and common UI elements.
 * Used by all portal route files.
 */

import React, { Suspense } from 'react';
import { PermissionGuard } from '../../../../core/router/guards/PermissionGuard';

// ============================================================================
// LOADING COMPONENTS
// ============================================================================

interface LoadingSpinnerProps {
    color?: string;
}

export function LoadingSpinner({ color = 'border-primary' }: LoadingSpinnerProps) {
    return (
        <div className="flex items-center justify-center h-64">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${color}`}></div>
        </div>
    );
}

// Portal-specific loading spinners
export const AdminLoading = () => <LoadingSpinner color="border-primary" />;
export const TeacherLoading = () => <LoadingSpinner color="border-secondary" />;
export const StudentLoading = () => <LoadingSpinner color="border-success" />;
export const StaffLoading = () => <LoadingSpinner color="border-warning" />;

// ============================================================================
// PROTECTED ROUTE WRAPPER
// ============================================================================

export interface ProtectedRouteProps {
    /** Permission(s) required to access this route */
    permissions?: string | string[];
    /** Route content */
    children: React.ReactNode;
    /** Custom loading component */
    LoadingComponent?: React.ComponentType;
    /** Redirect path if permission denied (optional) */
    redirectTo?: string;
}

/**
 * Wraps a route with permission check and suspense fallback.
 * 
 * Usage:
 *   <ProtectedRoute permissions="academics.classes.view">
 *       <ClassesPage />
 *   </ProtectedRoute>
 */
export function ProtectedRoute({
    permissions,
    children,
    LoadingComponent = AdminLoading
}: ProtectedRouteProps) {
    const suspenseContent = (
        <Suspense fallback={<LoadingComponent />}>
            {children}
        </Suspense>
    );

    if (!permissions) {
        return suspenseContent;
    }

    return (
        <PermissionGuard permissions={permissions}>
            {suspenseContent}
        </PermissionGuard>
    );
}

// ============================================================================
// ROUTE CONFIG TYPES
// ============================================================================

export interface RouteConfig {
    path: string;
    element: React.ReactElement;
    permissions?: string | string[];
    children?: RouteConfig[];
}

export interface ModuleRouteConfig {
    basePath: string;
    routes: RouteConfig[];
}
