// ============================================================================
// Teacher Attendance Page - Manage teacher attendance
// ============================================================================

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, Search, Save, Lock, Unlock, Download, AlertCircle,
    ChevronLeft, ChevronRight, Check, X, Clock, Timer, GraduationCap, BookOpen
} from 'lucide-react';
import { Card, Badge, Button, Input, Skeleton, FadeIn } from '@erp/common';
import { ProgressRing, type AttendanceStatus } from '@erp/common';
import { ATTENDANCE_ROUTES } from '../../constants/routes';

// ============================================================================
// TYPES
// ============================================================================

interface Teacher {
    id: string;
    name: string;
    employeeId: string;
    department: string;
    subjects: string[];
    status: AttendanceStatus;
    checkIn?: string;
    classes: string[];
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_TEACHERS: Teacher[] = [
    { id: '1', name: 'Mr. Sharma', employeeId: 'T001', department: 'Science', subjects: ['Physics', 'Math'], status: 'present', checkIn: '08:30', classes: ['10-A', '10-B'] },
    { id: '2', name: 'Mrs. Gupta', employeeId: 'T002', department: 'Science', subjects: ['Chemistry'], status: 'present', checkIn: '08:45', classes: ['9-A', '10-A'] },
    { id: '3', name: 'Mr. Singh', employeeId: 'T003', department: 'Math', subjects: ['Mathematics'], status: 'late', checkIn: '09:15', classes: ['8-A', '8-B'] },
    { id: '4', name: 'Mrs. Patel', employeeId: 'T004', department: 'English', subjects: ['English'], status: 'present', checkIn: '08:40', classes: ['9-B', '10-B'] },
    { id: '5', name: 'Mr. Kumar', employeeId: 'T005', department: 'Social', subjects: ['History', 'Geography'], status: 'absent', classes: ['7-A', '7-B'] },
    { id: '6', name: 'Mrs. Verma', employeeId: 'T006', department: 'Hindi', subjects: ['Hindi'], status: 'excused', classes: ['6-A', '6-B'] },
    { id: '7', name: 'Mr. Nair', employeeId: 'T007', department: 'Computer', subjects: ['Computer Science'], status: 'present', checkIn: '08:35', classes: ['9-A', '10-A', '10-B'] },
    { id: '8', name: 'Mrs. Reddy', employeeId: 'T008', department: 'Art', subjects: ['Art', 'Craft'], status: 'present', checkIn: '08:50', classes: ['5-A', '6-A'] },
];

const DEPARTMENTS = ['All', 'Science', 'Math', 'English', 'Social', 'Hindi', 'Computer', 'Art', 'Sports'];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TeacherAttendancePage() {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedDepartment, setSelectedDepartment] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [teachers, setTeachers] = useState<Teacher[]>(MOCK_TEACHERS);
    const isLoading = false;

    const filteredTeachers = useMemo(() => {
        return teachers.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  t.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDept = selectedDepartment === 'All' || t.department === selectedDepartment;
            return matchesSearch && matchesDept;
        });
    }, [teachers, searchQuery, selectedDepartment]);

    const stats = useMemo(() => {
        const present = filteredTeachers.filter(t => t.status === 'present').length;
        const absent = filteredTeachers.filter(t => t.status === 'absent').length;
        const late = filteredTeachers.filter(t => t.status === 'late').length;
        const excused = filteredTeachers.filter(t => t.status === 'excused').length;
        const total = filteredTeachers.length;
        const rate = total > 0 ? ((present + late) / total) * 100 : 0;
        return { present, absent, late, excused, total, rate };
    }, [filteredTeachers]);

    const handleStatusChange = (teacherId: string, status: AttendanceStatus) => {
        setTeachers(prev => prev.map(t => t.id === teacherId ? { ...t, status } : t));
    };

    const navigateDate = (days: number) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + days);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <FadeIn>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="p-3 bg-gradient-to-br from-success/20 to-success/5 rounded-2xl border border-success/20">
                            <GraduationCap className="w-7 h-7 text-success" />
                        </motion.div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Teacher Attendance</h1>
                            <p className="text-sm text-muted-foreground">Manage teaching staff attendance</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(ATTENDANCE_ROUTES.ROOT)}>
                            <ChevronLeft size={14} className="mr-1" />Back
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setIsLocked(!isLocked)}>
                            {isLocked ? <Unlock size={14} className="mr-1" /> : <Lock size={14} className="mr-1" />}
                            {isLocked ? 'Unlock' : 'Lock'}
                        </Button>
                        <Button size="sm" disabled={isLocked}><Save size={14} className="mr-1" />Save</Button>
                    </div>
                </div>
            </FadeIn>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigateDate(-1)}><ChevronLeft size={16} /></Button>
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
                            <Calendar size={16} className="text-muted-foreground" />
                            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                                className="border-0 bg-transparent p-0 h-auto text-sm font-medium" />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => navigateDate(1)}><ChevronRight size={16} /></Button>
                    </div>
                    <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="h-10 px-3 rounded-lg border border-border bg-background text-sm">
                        {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                    <div className="flex-1 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Search teacher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                    </div>
                </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <Card className="p-4 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></Card>
                <Card className="p-4 text-center bg-success/5 border-success/20"><p className="text-2xl font-bold text-success">{stats.present}</p><p className="text-xs text-muted-foreground">Present</p></Card>
                <Card className="p-4 text-center bg-error/5 border-error/20"><p className="text-2xl font-bold text-error">{stats.absent}</p><p className="text-xs text-muted-foreground">Absent</p></Card>
                <Card className="p-4 text-center bg-warning/5 border-warning/20"><p className="text-2xl font-bold text-warning">{stats.late}</p><p className="text-xs text-muted-foreground">Late</p></Card>
                <Card className="p-4 text-center bg-info/5 border-info/20"><p className="text-2xl font-bold text-info">{stats.excused}</p><p className="text-xs text-muted-foreground">Excused</p></Card>
                <Card className="p-4 flex items-center justify-center gap-3">
                    <ProgressRing value={stats.rate} size="md" color="stroke-success" />
                    <div><p className="text-lg font-bold">{stats.rate.toFixed(1)}%</p><p className="text-xs text-muted-foreground">Rate</p></div>
                </Card>
            </div>

            {/* Teacher List */}
            <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold">Teachers</h3>
                    <Badge variant="outline">{filteredTeachers.length} Teachers</Badge>
                </div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {isLoading ? [...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) :
                    filteredTeachers.length > 0 ? filteredTeachers.map((teacher, index) => (
                        <motion.div key={teacher.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                            className={`flex items-center justify-between p-4 rounded-xl ${
                                teacher.status === 'present' ? 'bg-success/5 border border-success/20' :
                                teacher.status === 'absent' ? 'bg-error/5 border border-error/20' :
                                teacher.status === 'late' ? 'bg-warning/5 border border-warning/20' :
                                teacher.status === 'excused' ? 'bg-info/5 border border-info/20' : 'bg-muted/30'}`}>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                                    <GraduationCap size={20} className="text-success" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium">{teacher.name}</p>
                                        <Badge variant="outline" className="text-xs">{teacher.employeeId}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{teacher.department} • {teacher.subjects.join(', ')}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                        <BookOpen size={10} className="text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">{teacher.classes.join(', ')}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {teacher.checkIn && <span className="text-xs text-muted-foreground mr-2">In: {teacher.checkIn}</span>}
                                {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map(status => (
                                    <motion.button key={status} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                        onClick={() => !isLocked && handleStatusChange(teacher.id, status)}
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border ${
                                            teacher.status === status ? 
                                            status === 'present' ? 'bg-success/20 text-success border-success/30' :
                                            status === 'absent' ? 'bg-error/20 text-error border-error/30' :
                                            status === 'late' ? 'bg-warning/20 text-warning border-warning/30' : 'bg-info/20 text-info border-info/30'
                                            : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50'}`}>
                                        {status === 'present' && <Check size={14} />}
                                        {status === 'absent' && <X size={14} />}
                                        {status === 'late' && <Clock size={14} />}
                                        {status === 'excused' && <Timer size={14} />}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    )) : (
                        <div className="py-12 text-center"><AlertCircle size={40} className="mx-auto text-muted-foreground/50 mb-3" /><p className="text-muted-foreground">No teachers found</p></div>
                    )}
                </div>
            </Card>

            {/* Bottom */}
            <FadeIn delay={0.2}>
                <Card className="p-4 bg-gradient-to-r from-success/5 to-transparent">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{stats.present + stats.late} of {stats.total} teachers present</p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm"><Download size={14} className="mr-1" />Export</Button>
                            <Button size="sm" disabled={isLocked}><Save size={14} className="mr-1" />Save</Button>
                        </div>
                    </div>
                </Card>
            </FadeIn>
        </div>
    );
}
