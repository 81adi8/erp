/**
 * Staff Portal Routes
 * 
 * Routes with permission-based access control for staff members.
 * Staff have access to tasks, attendance, and profile.
 * 
 * URL Structure: /staff/{module}/{feature}
 */

import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StaffLayout from './layout/StaffLayout';
import { ProtectedRoute, StaffLoading } from '../../shared/routing';

// ============================================================================
// LAZY LOADED PAGES
// ============================================================================

const DashboardPage = lazy(() => import('./modules/dashboard/DashboardPage'));
const TasksPage = lazy(() => import('./modules/tasks/TasksPage'));
const AttendancePage = lazy(() => import('./modules/attendance/AttendancePage'));
const ProfilePage = lazy(() => import('./modules/profile/ProfilePage'));

// ============================================================================
// STAFF ROUTES COMPONENT
// ============================================================================

export default function StaffRoutes() {
    return (
        <Routes>
            <Route element={<StaffLayout />}>
                {/* Default redirect */}
                <Route index element={<Navigate to="dashboard" replace />} />

                {/* ============================================ */}
                {/* DASHBOARD */}
                {/* ============================================ */}
                <Route
                    path="dashboard"
                    element={
                        <ProtectedRoute LoadingComponent={StaffLoading}>
                            <DashboardPage />
                        </ProtectedRoute>
                    }
                />

                {/* ============================================ */}
                {/* TASKS */}
                {/* ============================================ */}
                <Route
                    path="tasks/*"
                    element={
                        <ProtectedRoute permissions="staff.tasks.view" LoadingComponent={StaffLoading}>
                            <TasksPage />
                        </ProtectedRoute>
                    }
                />

                {/* ============================================ */}
                {/* ATTENDANCE */}
                {/* ============================================ */}
                <Route
                    path="attendance/*"
                    element={
                        <ProtectedRoute permissions="staff.attendance.view" LoadingComponent={StaffLoading}>
                            <AttendancePage />
                        </ProtectedRoute>
                    }
                />

                {/* ============================================ */}
                {/* PROFILE (Always accessible) */}
                {/* ============================================ */}
                <Route
                    path="profile"
                    element={
                        <ProtectedRoute LoadingComponent={StaffLoading}>
                            <ProfilePage />
                        </ProtectedRoute>
                    }
                />
            </Route>
        </Routes>
    );
}
