/**
 * Admin Portal Routes
 * 
 * All admin routes with permission-based access control.
 * Uses centralized route constants from @tenant-modules/school/constants/routes.
 * 
 * URL Structure: /admin/{module}/{feature}
 */

import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './layout/AdminLayout';
import { ProtectedRoute, AdminLoading } from '../../shared/routing';

// ============================================================================
// LAZY LOADED PAGES - Dashboard
// ============================================================================

const DashboardPage = lazy(() => import('./modules/dashboard/DashboardPage'));
const UnderDevelopmentPage = lazy(() => import('./modules/UnderDevelopmentPage'));

// ============================================================================
// LAZY LOADED PAGES - User Management
// ============================================================================

const UsersPage = lazy(() => import('./modules/users/UsersPage'));
const TeachersPage = lazy(() => import('../../pages/users/TeachersPage'));
const StudentsPage = lazy(() => import('./modules/students/StudentsPage'));
const StaffPage = lazy(() => import('../../pages/users/StaffPage'));
const ParentsPage = lazy(() => import('../../pages/users/ParentsPage'));

// Student specific pages
const StudentAdmissionPage = lazy(() => import('./modules/students/StudentAdmissionPage'));
const StudentEnrollmentPage = lazy(() => import('./modules/students/StudentEnrollmentPage'));
const StudentBulkImportPage = lazy(() => import('./modules/students/StudentBulkImportPage'));
const StudentDetailPage = lazy(() => import('./modules/students/StudentDetailPage'));
const StudentDocumentsPage = lazy(() => import('./modules/students/StudentDocumentsPage'));

// ============================================================================
// LAZY LOADED PAGES - Communication
// ============================================================================

const NoticesPage = lazy(() => import('./modules/communication/NoticesPage'));

// ============================================================================
// LAZY LOADED PAGES - Academics
// ============================================================================

// Dashboards
const AcademicDashboardPage = lazy(() => import('./modules/academics/AcademicDashboardPage'));
const SessionDashboardPage = lazy(() => import('./modules/academics/SessionDashboardPage'));
const ClassDashboardPage = lazy(() => import('./modules/academics/ClassDashboardPage'));
const CurriculumDashboardPage = lazy(() => import('./modules/academics/CurriculumDashboardPage'));
const TimetableDashboardPage = lazy(() => import('./modules/academics/TimetableDashboardPage'));
const SubjectDashboardPage = lazy(() => import('./modules/academics/SubjectDashboardPage'));

// Feature pages
const ClassesPage = lazy(() => import('./modules/academics/ClassesPage'));
const ClassSubjectsPage = lazy(() => import('./modules/academics/ClassSubjectsPage'));
const AcademicSessionsPage = lazy(() => import('./modules/academics/AcademicSessionsPage'));
const SessionPromotionPage = lazy(() => import('./modules/academics/SessionPromotionPage'));
const AcademicCalendarPage = lazy(() => import('../../pages/calendar/CalendarPage'));
const SubjectsPage = lazy(() => import('./modules/academics/SubjectsPage'));
const SectionsPage = lazy(() => import('./modules/academics/SectionsPage'));
const CurriculumPage = lazy(() => import('./modules/academics/CurriculumPage'));
const LessonPlansPage = lazy(() => import('./modules/academics/LessonPlansPage'));
const TimetablePage = lazy(() => import('./modules/academics/TimetablePage'));

// ============================================================================
// LAZY LOADED PAGES - Other Modules
// ============================================================================

// Attendance Module
const AttendanceDashboardPage = lazy(() => import('./modules/attendance/AttendanceDashboardPage'));
const AttendancePage = lazy(() => import('./modules/attendance/AttendancePage'));
const StudentAttendancePage = lazy(() => import('./modules/attendance/StudentAttendancePage'));
const TeacherAttendancePage = lazy(() => import('./modules/attendance/TeacherAttendancePage'));
const StaffAttendancePage = lazy(() => import('./modules/attendance/StaffAttendancePage'));
const ClassAttendancePage = lazy(() => import('./modules/attendance/ClassAttendancePage'));
const AttendanceReportsPage = lazy(() => import('./modules/attendance/AttendanceReportsPage'));
const AttendanceHistoryPage = lazy(() => import('./modules/attendance/AttendanceHistoryPage'));
const LeaveManagementPage = lazy(() => import('./modules/attendance/LeaveManagementPage'));
const AttendanceSettingsPage = lazy(() => import('./modules/attendance/AttendanceSettingsPage'));

// Admissions Module
const AdmissionsDashboardPage = lazy(() => import('./modules/admissions/AdmissionsDashboardPage'));
const StudentAdmissionsPage = lazy(() => import('./modules/admissions/StudentAdmissionsPage'));
const TeacherAdmissionsPage = lazy(() => import('./modules/admissions/TeacherAdmissionsPage'));
const StaffAdmissionsPage = lazy(() => import('./modules/admissions/StaffAdmissionsPage'));

// Other Modules
const FeesPage = lazy(() => import('./modules/fees/FeesPage'));
const ExamsPage = lazy(() => import('./modules/exams/ExamsPage'));
const ReportsPage = lazy(() => import('./modules/reports/ReportsPage'));
const SettingsPage = lazy(() => import('./modules/settings/SettingsPage'));
const RolesPermissionsPage = lazy(() => import('./modules/access-control/RolesPermissionsPage'));

// ============================================================================
// ADMIN ROUTES COMPONENT
// ============================================================================

export default function AdminRoutes() {
    return (
        <Routes>
            <Route element={<AdminLayout />}>
                {/* Default redirect */}
                <Route index element={<Navigate to="dashboard" replace />} />

                {/* ============================================ */}
                {/* DASHBOARD MODULE */}
                {/* ============================================ */}
                <Route path="dashboard" element={<ProtectedRoute LoadingComponent={AdminLoading}><DashboardPage /></ProtectedRoute>} />
                <Route path="dashboard/:subpath" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

                {/* ============================================ */}
                {/* ACADEMICS MODULE */}
                {/* ============================================ */}
                <Route path="academics">
                    {/* Main Dashboard */}
                    <Route index element={<ProtectedRoute permissions="academics.classes.view"><AcademicDashboardPage /></ProtectedRoute>} />

                    {/* Module Dashboards */}
                    <Route path="dashboard">
                        <Route index element={<ProtectedRoute permissions="academics.classes.view"><AcademicDashboardPage /></ProtectedRoute>} />
                        <Route path="sessions" element={<ProtectedRoute permissions="academics.sessions.view"><SessionDashboardPage /></ProtectedRoute>} />
                        <Route path="classes" element={<ProtectedRoute permissions="academics.classes.view"><ClassDashboardPage /></ProtectedRoute>} />
                        <Route path="curriculum" element={<ProtectedRoute permissions="academics.curriculumDashboard.view"><CurriculumDashboardPage /></ProtectedRoute>} />
                        <Route path="timetable" element={<ProtectedRoute permissions="academics.timetable.view"><TimetableDashboardPage /></ProtectedRoute>} />
                        <Route path="subjects" element={<ProtectedRoute permissions="academics.subjects.view"><SubjectDashboardPage /></ProtectedRoute>} />
                    </Route>

                    {/* Sessions */}
                    <Route path="sessions">
                        <Route index element={<ProtectedRoute permissions="academics.sessions.view"><AcademicSessionsPage /></ProtectedRoute>} />
                        <Route path="promotion" element={<ProtectedRoute permissions="academics.sessions.manage"><SessionPromotionPage /></ProtectedRoute>} />
                        <Route path="calendar" element={<ProtectedRoute permissions="academics.sessions.view"><AcademicCalendarPage /></ProtectedRoute>} />
                        <Route path="*" element={<ProtectedRoute permissions="academics.sessions.view"><AcademicSessionsPage /></ProtectedRoute>} />
                    </Route>

                    {/* Classes */}
                    <Route path="classes">
                        <Route index element={<ProtectedRoute permissions="academics.classes.view"><ClassesPage /></ProtectedRoute>} />
                        <Route path=":classId/subjects" element={<ProtectedRoute permissions="academics.classes.view"><ClassSubjectsPage /></ProtectedRoute>} />
                        <Route path="*" element={<ProtectedRoute permissions="academics.classes.view"><ClassesPage /></ProtectedRoute>} />
                    </Route>

                    {/* Subjects */}
                    <Route path="subjects/*" element={<ProtectedRoute permissions="academics.subjects.view"><SubjectsPage /></ProtectedRoute>} />

                    {/* Sections */}
                    <Route path="sections/*" element={<ProtectedRoute permissions="academics.classes.view"><SectionsPage /></ProtectedRoute>} />

                    {/* Curriculum */}
                    <Route path="curriculum/*" element={<ProtectedRoute permissions="academics.curriculum.view"><CurriculumPage /></ProtectedRoute>} />

                    {/* Lesson Plans */}
                    <Route path="lesson-plans/*" element={<ProtectedRoute permissions="academics.lessonPlans.view"><LessonPlansPage /></ProtectedRoute>} />

                    {/* Timetable */}
                    <Route path="timetable/*" element={<ProtectedRoute permissions="academics.timetable.view"><TimetablePage /></ProtectedRoute>} />
                </Route>

                {/* ============================================ */}
                {/* USERS MODULE */}
                {/* ============================================ */}
                <Route path="users">
                    <Route index element={<Navigate to="teachers" replace />} />

                    {/* Teachers */}
                    <Route path="teachers/*" element={<ProtectedRoute permissions="users.teachers.manage"><TeachersPage /></ProtectedRoute>} />

                    {/* Students */}
                    <Route path="students">
                        <Route index element={<ProtectedRoute permissions="users.students.manage"><StudentsPage /></ProtectedRoute>} />
                        <Route path="admission" element={<ProtectedRoute permissions="users.students.manage"><StudentAdmissionPage /></ProtectedRoute>} />
                        <Route path="enrollment" element={<ProtectedRoute permissions="users.students.manage"><StudentEnrollmentPage /></ProtectedRoute>} />
                        <Route path="bulk-import" element={<ProtectedRoute permissions="users.students.manage"><StudentBulkImportPage /></ProtectedRoute>} />
                        <Route path="documents" element={<ProtectedRoute permissions="users.students.manage"><StudentDocumentsPage /></ProtectedRoute>} />
                        <Route path=":id" element={<ProtectedRoute permissions="users.students.view"><StudentDetailPage /></ProtectedRoute>} />
                    </Route>

                    {/* Staff */}
                    <Route path="staff/*" element={<ProtectedRoute permissions="users.staff.manage"><StaffPage /></ProtectedRoute>} />

                    {/* Parents */}
                    <Route path="parents/*" element={<ProtectedRoute permissions="users.parents.manage"><ParentsPage /></ProtectedRoute>} />

                    {/* User Management */}
                    <Route path="management/*" element={<ProtectedRoute permissions="user.management.view"><UsersPage /></ProtectedRoute>} />
                </Route>

                {/* ============================================ */}
                {/* ATTENDANCE MODULE */}
                {/* ============================================ */}
                <Route path="attendance">
                    <Route index element={<ProtectedRoute permissions="attendance.dashboard.view"><AttendanceDashboardPage /></ProtectedRoute>} />
                    <Route path="dashboard" element={<ProtectedRoute permissions="attendance.dashboard.view"><AttendanceDashboardPage /></ProtectedRoute>} />
                    <Route path="marking/*" element={<ProtectedRoute permissions="attendance.marking.mark"><AttendancePage /></ProtectedRoute>} />
                    <Route path="student/*" element={<ProtectedRoute permissions="attendance.student.manage"><StudentAttendancePage /></ProtectedRoute>} />
                    <Route path="teacher/*" element={<ProtectedRoute permissions="attendance.teacher.manage"><TeacherAttendancePage /></ProtectedRoute>} />
                    <Route path="staff/*" element={<ProtectedRoute permissions="attendance.staff.manage"><StaffAttendancePage /></ProtectedRoute>} />
                    <Route path="class/*" element={<ProtectedRoute permissions="attendance.class.view"><ClassAttendancePage /></ProtectedRoute>} />
                    <Route path="reports/*" element={<ProtectedRoute permissions="attendance.reports.view"><AttendanceReportsPage /></ProtectedRoute>} />
                    <Route path="history/*" element={<ProtectedRoute permissions="attendance.history.view"><AttendanceHistoryPage /></ProtectedRoute>} />
                    <Route path="leaves/*" element={<ProtectedRoute permissions="attendance.leaves.approve"><LeaveManagementPage /></ProtectedRoute>} />
                    <Route path="settings/*" element={<ProtectedRoute permissions="attendance.settings.manage"><AttendanceSettingsPage /></ProtectedRoute>} />
                </Route>

                {/* ============================================ */}
                {/* COMMUNICATION MODULE */}
                {/* ============================================ */}
                <Route path="communication">
                    <Route index element={<Navigate to="notices" replace />} />
                    <Route path="notices" element={<ProtectedRoute permissions="communication.notices.view"><NoticesPage /></ProtectedRoute>} />
                </Route>

                {/* ============================================ */}
                {/* ADMISSIONS MODULE */}
                {/* ============================================ */}
                <Route path="admissions">
                    <Route index element={<ProtectedRoute permissions="users.students.manage"><AdmissionsDashboardPage /></ProtectedRoute>} />
                    <Route path="dashboard" element={<ProtectedRoute permissions="users.students.manage"><AdmissionsDashboardPage /></ProtectedRoute>} />
                    <Route path="student" element={<ProtectedRoute permissions="users.students.manage"><StudentAdmissionsPage /></ProtectedRoute>} />
                    <Route path="teacher" element={<ProtectedRoute permissions="users.teachers.manage"><TeacherAdmissionsPage /></ProtectedRoute>} />
                    <Route path="staff" element={<ProtectedRoute permissions="users.staff.manage"><StaffAdmissionsPage /></ProtectedRoute>} />
                    <Route path="reports" element={<ProtectedRoute permissions="reports.view"><UnderDevelopmentPage /></ProtectedRoute>} />
                </Route>

                {/* ============================================ */}
                {/* FINANCE MODULE */}
                {/* ============================================ */}
                <Route path="finance">
                    <Route index element={<Navigate to="fees" replace />} />
                    <Route path="fees/*" element={<ProtectedRoute permissions="finance.fees.view"><FeesPage /></ProtectedRoute>} />
                </Route>

                {/* ============================================ */}
                {/* EXAMS MODULE */}
                {/* ============================================ */}
                <Route path="exams">
                    <Route index element={<Navigate to="management" replace />} />
                    <Route path="management/*" element={<ProtectedRoute permissions="exams.view"><ExamsPage /></ProtectedRoute>} />
                </Route>

                {/* ============================================ */}
                {/* REPORTS MODULE */}
                {/* ============================================ */}
                <Route path="reports">
                    <Route index element={<Navigate to="analytics" replace />} />
                    <Route path="analytics/*" element={<ProtectedRoute permissions="reports.view"><ReportsPage /></ProtectedRoute>} />
                </Route>

                {/* ============================================ */}
                {/* SETTINGS MODULE */}
                {/* ============================================ */}
                <Route path="settings">
                    <Route index element={<Navigate to="general" replace />} />
                    <Route path="general/*" element={<ProtectedRoute permissions="settings.general.view"><SettingsPage /></ProtectedRoute>} />
                    <Route path="roles/*" element={<ProtectedRoute permissions="settings.roles.manage"><RolesPermissionsPage /></ProtectedRoute>} />
                </Route>

                {/* ============================================ */}
                {/* LEGACY REDIRECTS */}
                {/* ============================================ */}
                <Route path="students/*" element={<Navigate to="/admin/users/students" replace />} />
                <Route path="teachers/*" element={<Navigate to="/admin/users/teachers" replace />} />
                <Route path="classes/*" element={<Navigate to="/admin/academics/classes" replace />} />
                <Route path="fees/*" element={<Navigate to="/admin/finance/fees" replace />} />

                {/* ============================================ */}
                {/* FALLBACK */}
                {/* ============================================ */}
                <Route path="*" element={<ProtectedRoute><UnderDevelopmentPage /></ProtectedRoute>} />
            </Route>
        </Routes>
    );
}
