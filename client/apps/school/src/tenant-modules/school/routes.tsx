// ============================================================================
// School Module Routes - Role-Based Portal Routing
// ============================================================================

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { usePermission } from '../../core/rbac';
import { PortalGuard } from './shared/guards/PortalGuard';
import { getDefaultPortal } from './config/portals.config';
import NoPermissionPage from '@/core/router/error/NoPermissionPage';

// ============================================================================
// Lazy Load Portal Routes
// ============================================================================

const AdminRoutes = lazy(() => import('./portals/admin/routes'));
const TeacherRoutes = lazy(() => import('./portals/teacher/routes'));
const StudentRoutes = lazy(() => import('./portals/student/routes'));
const StaffRoutes = lazy(() => import('./portals/staff/routes'));
const ParentRoutes = lazy(() => import('./portals/parent/routes'));

// ============================================================================
// Main School Routes
// ============================================================================

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
// Portal Redirect Component
// ============================================================================

function PortalRedirect() {
    const { roleLevel, roles, isLoading } = usePermission();

    if (isLoading) {
        return <PortalLoadingFallback />;
    }

    const defaultPortal = getDefaultPortal(roleLevel, roles);
    return <Navigate to={defaultPortal} replace />;
}

// ============================================================================
// Main School Routes
// ============================================================================

export default function SchoolRoutes() {
    return (
        <Suspense fallback={<PortalLoadingFallback />}>
            <Routes>
                {/* 
                  Note: Auth routes (login, register, etc.) are primarily handled by 
                  the core AppRouter. These are kept here as fallbacks or for module-specific
                  sub-paths if needed.
                */}

                {/* Default redirect based on user role */}
                <Route index element={<PortalRedirect />} />

                {/* Admin Portal */}
                <Route
                    path="admin/*"
                    element={
                        <PortalGuard portalId="admin">
                            <AdminRoutes />
                        </PortalGuard>
                    }
                />

                {/* Teacher Portal */}
                <Route
                    path="teacher/*"
                    element={
                        <PortalGuard portalId="teacher">
                            <TeacherRoutes />
                        </PortalGuard>
                    }
                />

                {/* Student Portal */}
                <Route
                    path="student/*"
                    element={
                        <PortalGuard portalId="student">
                            <StudentRoutes />
                        </PortalGuard>
                    }
                />

                {/* Staff Portal */}
                <Route
                    path="staff/*"
                    element={
                        <PortalGuard portalId="staff">
                            <StaffRoutes />
                        </PortalGuard>
                    }
                />

                {/* Parent Portal */}
                <Route
                    path="parent/*"
                    element={
                        <PortalGuard portalId="parent">
                            <ParentRoutes />
                        </PortalGuard>
                    }
                />

                {/* Catch-all redirect to appropriate portal */}
                <Route path="*" element={<PortalRedirect />} />
                <Route path='np' element={<NoPermissionPage/>}/>
            </Routes>
        </Suspense>
    );
}
