// Coaching Module Routes
import { Routes, Route, Navigate } from 'react-router-dom';
import CoachingLayout from './layouts/CoachingLayout';

// Placeholder pages - will be implemented fully later
function DashboardPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Coaching Dashboard</h1></div>;
}
function BatchesPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Batches</h1></div>;
}
function StudentsPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Students</h1></div>;
}
function FacultyPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Faculty</h1></div>;
}
function TestSeriesPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Test Series</h1></div>;
}
function SchedulesPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Schedules</h1></div>;
}
function PerformancePage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Performance</h1></div>;
}
function FeesPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Fees</h1></div>;
}
function SettingsPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Settings</h1></div>;
}

export default function CoachingRoutes() {
    return (
        <Routes>
            <Route element={<CoachingLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="batches" element={<BatchesPage />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="faculty" element={<FacultyPage />} />
                <Route path="test-series" element={<TestSeriesPage />} />
                <Route path="schedules" element={<SchedulesPage />} />
                <Route path="performance" element={<PerformancePage />} />
                <Route path="fees" element={<FeesPage />} />
                <Route path="settings" element={<SettingsPage />} />
            </Route>
        </Routes>
    );
}
