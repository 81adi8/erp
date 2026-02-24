/**
 * Teacher Portal Routes
 * 
 * Routes with permission-based access control for teachers.
 * Teachers have access to their assigned classes, attendance, and grading.
 * 
 * URL Structure: /teacher/{module}/{feature}
 */

import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TeacherLayout from './layout/TeacherLayout';
import { ProtectedRoute, TeacherLoading } from '../../shared/routing';

// ============================================================================
// LAZY LOADED PAGES
// ============================================================================

const DashboardPage = lazy(() => import('./modules/dashboard/DashboardPage'));
const MyClassesPage = lazy(() => import('./modules/classes/MyClassesPage'));
const AttendancePage = lazy(() => import('./modules/attendance/AttendancePage'));
const GradingPage = lazy(() => import('./modules/grading/GradingPage'));
const SchedulePage = lazy(() => import('./modules/schedule/SchedulePage'));
const ProfilePage = lazy(() => import('./modules/profile/ProfilePage'));

// ============================================================================
// TEACHER ROUTES COMPONENT
// ============================================================================

export default function TeacherRoutes() {
    return (
        <Routes>
            <Route element={<TeacherLayout />}>
                {/* Default redirect */}
                <Route index element={<Navigate to="dashboard" replace />} />

                {/* ============================================ */}
                {/* DASHBOARD */}
                {/* ============================================ */}
                <Route
                    path="dashboard"
                    element={
                        <ProtectedRoute LoadingComponent={TeacherLoading}>
                            <DashboardPage />
                        </ProtectedRoute>
                    }
                />

                {/* ============================================ */}
                {/* MY CLASSES */}
                {/* ============================================ */}
                <Route
                    path="classes/*"
                    element={
                        <ProtectedRoute permissions="teacher.classes.view" LoadingComponent={TeacherLoading}>
                            <MyClassesPage />
                        </ProtectedRoute>
                    }
                />

                {/* ============================================ */}
                {/* ATTENDANCE */}
                {/* ============================================ */}
                <Route
                    path="attendance/*"
                    element={
                        <ProtectedRoute permissions="attendance.mark" LoadingComponent={TeacherLoading}>
                            <AttendancePage />
                        </ProtectedRoute>
                    }
                />

                {/* ============================================ */}
                {/* GRADING */}
                {/* ============================================ */}
                <Route
                    path="grading/*"
                    element={
                        <ProtectedRoute permissions="grades.manage" LoadingComponent={TeacherLoading}>
                            <GradingPage />
                        </ProtectedRoute>
                    }
                />

                {/* ============================================ */}
                {/* SCHEDULE */}
                {/* ============================================ */}
                <Route
                    path="schedule"
                    element={
                        <ProtectedRoute permissions="schedule.view" LoadingComponent={TeacherLoading}>
                            <SchedulePage />
                        </ProtectedRoute>
                    }
                />

                {/* ============================================ */}
                {/* PROFILE (Always accessible) */}
                {/* ============================================ */}
                <Route
                    path="profile"
                    element={
                        <ProtectedRoute LoadingComponent={TeacherLoading}>
                            <ProfilePage />
                        </ProtectedRoute>
                    }
                />
            </Route>
        </Routes>
    );
}
