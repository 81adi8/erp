// Staff Portal Navigation
import { LayoutDashboard, ListTodo, ClipboardCheck, User } from 'lucide-react';

export interface NavItem { id: string; label: string; path: string; icon: React.ReactNode; permission?: string; }

export const STAFF_NAVIGATION: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', path: '/staff/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, permission: 'dashboard.view' },
    { id: 'tasks', label: 'My Tasks', path: '/staff/tasks', icon: <ListTodo className="w-5 h-5" />, permission: 'tasks.view' },
    { id: 'attendance', label: 'Attendance', path: '/staff/attendance', icon: <ClipboardCheck className="w-5 h-5" />, permission: 'my_attendance.view' },
    { id: 'profile', label: 'My Profile', path: '/staff/profile', icon: <User className="w-5 h-5" />, permission: 'profile.view' },
];
