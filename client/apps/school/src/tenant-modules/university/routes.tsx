// University Module Routes
import { Routes, Route, Navigate } from 'react-router-dom';
import UniversityLayout from './layouts/UniversityLayout';

function DashboardPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">University Dashboard</h1></div>;
}
function DepartmentsPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Departments</h1></div>;
}
function CoursesPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Courses</h1></div>;
}
function StudentsPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Students</h1></div>;
}
function FacultyPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Faculty</h1></div>;
}
function SemestersPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Semesters</h1></div>;
}
function ResearchPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Research</h1></div>;
}
function FeesPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Fees</h1></div>;
}
function SettingsPage() {
    return <div className="p-6"><h1 className="text-2xl font-bold">Settings</h1></div>;
}

export default function UniversityRoutes() {
    return (
        <Routes>
            <Route element={<UniversityLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="departments" element={<DepartmentsPage />} />
                <Route path="courses" element={<CoursesPage />} />
                <Route path="students" element={<StudentsPage />} />
                <Route path="faculty" element={<FacultyPage />} />
                <Route path="semesters" element={<SemestersPage />} />
                <Route path="research" element={<ResearchPage />} />
                <Route path="fees" element={<FeesPage />} />
                <Route path="settings" element={<SettingsPage />} />
            </Route>
        </Routes>
    );
}
