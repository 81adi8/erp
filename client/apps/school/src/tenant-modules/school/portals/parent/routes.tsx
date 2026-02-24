/**
 * Parent Portal Routes
 * Isolated routing for parent users
 */
import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { LoadingSpinner } from '@erp/common';
import ParentLayout from './layout/ParentLayout';
import { ParentProvider } from './context/ParentContext';

// Lazy load pages
const ParentDashboard = lazy(() => import('./pages/ParentDashboard'));
const ChildProfilePage = lazy(() => import('./pages/ChildProfilePage'));
const AttendanceViewPage = lazy(() => import('./pages/AttendanceViewPage'));
const MarksViewPage = lazy(() => import('./pages/MarksViewPage'));
const FeesViewPage = lazy(() => import('./pages/FeesViewPage'));

function ParentLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <LoadingSpinner size="lg" />
        </div>
    );
}

export default function ParentRoutes() {
    return (
        <Suspense fallback={<ParentLoading />}>
            <ParentProvider>
                <Routes>
                    <Route element={<ParentLayout />}>
                        {/* Default redirect to dashboard */}
                        <Route index element={<Navigate to="dashboard" replace />} />
                        
                        {/* Dashboard */}
                        <Route path="dashboard" element={<ParentDashboard />} />
                        
                        {/* Child Profile */}
                        <Route path="child" element={<ChildProfilePage />} />
                        
                        {/* Attendance */}
                        <Route path="attendance" element={<AttendanceViewPage />} />
                        
                        {/* Marks */}
                        <Route path="marks" element={<MarksViewPage />} />
                        
                        {/* Fees */}
                        <Route path="fees" element={<FeesViewPage />} />
                        
                        {/* Catch-all */}
                        <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </Route>
                </Routes>
            </ParentProvider>
        </Suspense>
    );
}