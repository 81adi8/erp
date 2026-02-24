// Teacher Portal Navigation
import { LayoutDashboard, BookOpen, ClipboardCheck, FileSpreadsheet, ClipboardList, User } from 'lucide-react';

export interface NavItem {
    id: string;
    label: string;
    path: string;
    icon: React.ReactNode;
    permission?: string;
}

export const TEACHER_NAVIGATION: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', path: '/teacher/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, permission: 'dashboard.view' },
    { id: 'my-classes', label: 'My Classes', path: '/teacher/my-classes', icon: <BookOpen className="w-5 h-5" />, permission: 'my_classes.view' },
    { id: 'attendance', label: 'Attendance', path: '/teacher/attendance', icon: <ClipboardCheck className="w-5 h-5" />, permission: 'attendance.view' },
    { id: 'gradebook', label: 'Gradebook', path: '/teacher/gradebook', icon: <FileSpreadsheet className="w-5 h-5" />, permission: 'grades.view' },
    { id: 'assignments', label: 'Assignments', path: '/teacher/assignments', icon: <ClipboardList className="w-5 h-5" />, permission: 'assignments.view' },
    { id: 'profile', label: 'My Profile', path: '/teacher/profile', icon: <User className="w-5 h-5" />, permission: 'profile.view' },
];
