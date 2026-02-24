// Student Portal Navigation
import { LayoutDashboard, BookOpen, ClipboardList, Award, Calendar, User } from 'lucide-react';

export interface NavItem { id: string; label: string; path: string; icon: React.ReactNode; permission?: string; }

export const STUDENT_NAVIGATION: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', path: '/student/dashboard', icon: <LayoutDashboard className="w-5 h-5" />, permission: 'dashboard.view' },
    { id: 'courses', label: 'My Courses', path: '/student/courses', icon: <BookOpen className="w-5 h-5" />, permission: 'my_courses.view' },
    { id: 'assignments', label: 'Assignments', path: '/student/assignments', icon: <ClipboardList className="w-5 h-5" />, permission: 'assignments.view' },
    { id: 'grades', label: 'My Grades', path: '/student/grades', icon: <Award className="w-5 h-5" />, permission: 'my_grades.view' },
    { id: 'timetable', label: 'Timetable', path: '/student/timetable', icon: <Calendar className="w-5 h-5" />, permission: 'timetable.view' },
    { id: 'profile', label: 'My Profile', path: '/student/profile', icon: <User className="w-5 h-5" />, permission: 'profile.view' },
];
