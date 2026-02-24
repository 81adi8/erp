/**
 * Student Portal Routes
 * 
 * Routes with permission-based access control for students.
 * Students have access to their courses, assignments, grades, and timetable.
 * 
 * URL Structure: /student/{module}/{feature}
 */

import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StudentLayout from './layout/StudentLayout';
import { ProtectedRoute, StudentLoading } from '../../shared/routing';

// ============================================================================
// LAZY LOADED PAGES
// ============================================================================

const DashboardPage = lazy(() => import('./modules/dashboard/DashboardPage'));
const CoursesPage = lazy(() => import('./modules/courses/CoursesPage'));
const AssignmentsPage = lazy(() => import('./modules/assignments/AssignmentsPage'));
const GradesPage = lazy(() => import('./modules/grades/GradesPage'));
const TimetablePage = lazy(() => import('./modules/timetable/TimetablePage'));
const ProfilePage = lazy(() => import('./modules/profile/ProfilePage'));

// ============================================================================
// STUDENT ROUTES COMPONENT
// ============================================================================

export default function StudentRoutes() {
    return (
        <Routes>
            <Route element={<StudentLayout />}>
                {/* Default redirect */}
                <Route index element={<Navigate to="dashboard" replace />} />

                {/* ============================================ */}
                {/* DASHBOARD */}
                {/* ============================================ */}
                <Route
                    path="dashboard"
                    element={
                        <ProtectedRoute LoadingComponent={StudentLoading}>
                            <DashboardPage />
                        </ProtectedRoute>
                    }
                />

                {/* ============================================ */}
                {/* COURSES */}
                {/* ============================================ */}
                <Route
                    path="courses/*"
                    element={
                        <ProtectedRoute permissions="student.courses.view" LoadingComponent={StudentLoading}>
                            <CoursesPage />
                        </ProtectedRoute>
                    }
                />

                {/* ============================================ */}
                {/* ASSIGNMENTS */}
                {/* ============================================ */}
                <Route
                    path="assignments/*"
                    element={
                        <ProtectedRoute permissions="student.assignments.view" LoadingComponent={StudentLoading}>
                            <AssignmentsPage />
                        </ProtectedRoute>
                    }
                />

                {/* ============================================ */}
                {/* GRADES */}
                {/* ============================================ */}
                <Route
                    path="grades/*"
                    element={
                        <ProtectedRoute permissions="student.grades.view" LoadingComponent={StudentLoading}>
                            <GradesPage />
                        </ProtectedRoute>
                    }
                />

                {/* ============================================ */}
                {/* TIMETABLE */}
                {/* ============================================ */}
                <Route
                    path="timetable"
                    element={
                        <ProtectedRoute permissions="student.timetable.view" LoadingComponent={StudentLoading}>
                            <TimetablePage />
                        </ProtectedRoute>
                    }
                />

                {/* ============================================ */}
                {/* PROFILE (Always accessible) */}
                {/* ============================================ */}
                <Route
                    path="profile"
                    element={
                        <ProtectedRoute LoadingComponent={StudentLoading}>
                            <ProfilePage />
                        </ProtectedRoute>
                    }
                />
            </Route>
        </Routes>
    );
}
