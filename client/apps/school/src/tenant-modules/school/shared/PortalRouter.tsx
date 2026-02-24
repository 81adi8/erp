// ============================================================================
// Portal Router - Role-Based Routing for Sub-Tenant Portals
// ============================================================================

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { usePermission } from '../../../core/rbac';
import { PortalGuard } from '../shared/guards/PortalGuard';
import { getDefaultPortal, PORTAL_CONFIG } from '../config/portals.config';

// ============================================================================
// Lazy Load Portal Routes
// ============================================================================

const AdminRoutes = lazy(() => import('../portals/admin/routes'));
const TeacherRoutes = lazy(() => import('../portals/teacher/routes'));
const StudentRoutes = lazy(() => import('../portals/student/routes'));
const StaffRoutes = lazy(() => import('../portals/staff/routes'));

// ============================================================================
// Loading Fallback
// ============================================================================

function PortalLoadingFallback() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Loading portal...</p>
            </div>
        </div>
    );
}

// ============================================================================
// Portal Router Component
// ============================================================================

/**
 * PortalRouter - Main router for role-based portal navigation
 * 
 * Routes users to their appropriate portal based on role:
 * - Admin (ADMIN level) → /admin/*
 * - Teacher (STAFF level with teacher role) → /teacher/*
 * - Student (USER level with student role) → /student/*
 * - Staff (ASSISTANT level) → /staff/*
 */
export function PortalRouter() {
    const { roleLevel, roles, isLoading } = usePermission();

    // Show loading while determining role
    if (isLoading) {
        return <PortalLoadingFallback />;
    }

    // Get default portal for user's role
    const defaultPortal = getDefaultPortal(roleLevel, roles);

    return (
        <Suspense fallback={<PortalLoadingFallback />}>
            <Routes>
                {/* Default redirect based on role */}
                <Route index element={<Navigate to={defaultPortal} replace />} />

                {/* Admin Portal Routes */}
                <Route
                    path={`${PORTAL_CONFIG.admin.basePath.slice(1)}/*`}
                    element={
                        <PortalGuard portalId="admin">
                            <AdminRoutes />
                        </PortalGuard>
                    }
                />

                {/* Teacher Portal Routes */}
                <Route
                    path={`${PORTAL_CONFIG.teacher.basePath.slice(1)}/*`}
                    element={
                        <PortalGuard portalId="teacher">
                            <TeacherRoutes />
                        </PortalGuard>
                    }
                />

                {/* Student Portal Routes */}
                <Route
                    path={`${PORTAL_CONFIG.student.basePath.slice(1)}/*`}
                    element={
                        <PortalGuard portalId="student">
                            <StudentRoutes />
                        </PortalGuard>
                    }
                />

                {/* Staff Portal Routes */}
                <Route
                    path={`${PORTAL_CONFIG.staff.basePath.slice(1)}/*`}
                    element={
                        <PortalGuard portalId="staff">
                            <StaffRoutes />
                        </PortalGuard>
                    }
                />

                {/* Catch-all redirect to default portal */}
                <Route path="*" element={<Navigate to={defaultPortal} replace />} />
            </Routes>
        </Suspense>
    );
}

export default PortalRouter;
