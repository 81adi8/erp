// Institute Module Routes
import { Routes, Route, Navigate } from 'react-router-dom';
import InstituteLayout from './layouts/InstituteLayout';

function DashboardPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Institute Dashboard</h1></div>;
}
function StudentsPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Students</h1></div>;
}
function StaffPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Staff</h1></div>;
}
function CoursesPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Courses</h1></div>;
}
function AttendancePage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Attendance</h1></div>;
}
function FeesPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Fees</h1></div>;
}
function ReportsPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Reports</h1></div>;
}
function SettingsPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Settings</h1></div>;
}

export default function InstituteRoutes() {
    return (
        <Routes>
            <Route element={<InstituteLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="staff" element={<StaffPage />} />
                <Route path="courses" element={<CoursesPage />} />
                <Route path="attendance" element={<AttendancePage />} />
                <Route path="fees" element={<FeesPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
            </Route>
        </Routes>
    );
}
