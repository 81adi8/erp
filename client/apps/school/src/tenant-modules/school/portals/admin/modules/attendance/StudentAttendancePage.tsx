// ============================================================================
// Student Attendance Page - Mark and manage student attendance
// ============================================================================

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Users, Calendar, Clock, Search, Save, Lock, RotateCcw, Download, AlertCircle,
    UserCheck, UserX, Timer, ChevronLeft, ChevronRight, Check, X
} from 'lucide-react';
import { Card, Badge, Button, Input, Skeleton, FadeIn, StaggerContainer, StaggerItem } from '@erp/common';
import { AttendanceStatusBadge, ProgressRing } from '@erp/common';
import { ATTENDANCE_ROUTES } from '../../constants/routes';
import { useGetClassesQuery } from '../../../../api/classesApi';
import { 
    useGetDailyAttendanceQuery, 
    useBulkMarkStudentAttendanceMutation, 
    useLockAttendanceMutation 
} from '../../../../api/attendanceApi';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'HALF_DAY' | 'LEAVE' | 'HOLIDAY' | 'NOT_MARKED';

// ============================================================================
// TYPES
// ============================================================================

interface Student {
    id: string;
    name: string;
    rollNo: string;
    avatar?: string;
    status: AttendanceStatus;
    remarks?: string;
}

interface AttendanceApiRecord {
    studentId?: string;
    entityId?: string;
    studentName?: string;
    entityName?: string;
    rollNumber?: string;
    rollNo?: string;
    status?: AttendanceStatus;
    remark?: string;
    isLocked?: boolean;
}

interface ClassWithSections {
    id: string;
    name: string;
    sections?: Array<{
        id: string;
        name: string;
    }>;
}

interface SectionOption {
    id: string;
    displayName: string;
}


// ============================================================================
// STATUS BUTTON COMPONENT
// ============================================================================

interface StatusButtonProps {
    status: AttendanceStatus;
    isActive: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    color: string;
    bgColor: string;
}

function StatusButton({ status, isActive, onClick, icon, label, color, bgColor }: StatusButtonProps) {
    return (
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`
                p-2 rounded-lg flex items-center gap-1.5 text-xs font-medium
                transition-all duration-200 border
                ${isActive 
                    ? `${bgColor} ${color} border-current` 
                    : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50'
                }
            `}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </motion.button>
    );
}

// ============================================================================
// STUDENT ROW COMPONENT
// ============================================================================

interface StudentRowProps {
    student: Student;
    index: number;
    onStatusChange: (studentId: string, status: AttendanceStatus) => void;
    isLocked: boolean;
}

function StudentRow({ student, index, onStatusChange, isLocked }: StudentRowProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            className={`
                flex items-center justify-between p-4 rounded-xl
                ${student.status === 'PRESENT' ? 'bg-success/5 border border-success/20' :
                  student.status === 'ABSENT' ? 'bg-error/5 border border-error/20' :
                  student.status === 'LATE' ? 'bg-warning/5 border border-warning/20' :
                  student.status === 'EXCUSED' ? 'bg-info/5 border border-info/20' :
                  'bg-muted/30 border border-transparent'}
                hover:shadow-sm transition-all duration-200
            `}
        >
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{student.rollNo}</span>
                </div>
                <div>
                    <p className="text-sm font-medium text-foreground">{student.name}</p>
                    <p className="text-xs text-muted-foreground">Roll No: {student.rollNo}</p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <StatusButton
                    status="PRESENT"
                    isActive={student.status === 'PRESENT'}
                    onClick={() => !isLocked && onStatusChange(student.id, 'PRESENT')}
                    icon={<Check size={14} />}
                    label="Present"
                    color="text-success"
                    bgColor="bg-success/10"
                />
                <StatusButton
                    status="ABSENT"
                    isActive={student.status === 'ABSENT'}
                    onClick={() => !isLocked && onStatusChange(student.id, 'ABSENT')}
                    icon={<X size={14} />}
                    label="Absent"
                    color="text-error"
                    bgColor="bg-error/10"
                />
                <StatusButton
                    status="LATE"
                    isActive={student.status === 'LATE'}
                    onClick={() => !isLocked && onStatusChange(student.id, 'LATE')}
                    icon={<Clock size={14} />}
                    label="Late"
                    color="text-warning"
                    bgColor="bg-warning/10"
                />
                <StatusButton
                    status="EXCUSED"
                    isActive={student.status === 'EXCUSED'}
                    onClick={() => !isLocked && onStatusChange(student.id, 'EXCUSED')}
                    icon={<Timer size={14} />}
                    label="Excused"
                    color="text-info"
                    bgColor="bg-info/10"
                />
            </div>
        </motion.div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StudentAttendancePage() {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSectionId, setSelectedSectionId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [students, setStudents] = useState<Student[]>([]);

    // API Hooks
    const { data: classesResponse } = useGetClassesQuery({});
    const { data: attendanceResponse, isLoading, isFetching } = useGetDailyAttendanceQuery(
        { sectionId: selectedSectionId, date: selectedDate },
        { skip: !selectedSectionId }
    );
    const [bulkMark] = useBulkMarkStudentAttendanceMutation();
    const [lockAttendance] = useLockAttendanceMutation();

    const classes = (classesResponse?.data || []) as ClassWithSections[];
    const attendanceRows = (attendanceResponse?.data || []) as AttendanceApiRecord[];
    const isLocked = attendanceRows.some((record) => record.isLocked) || false;

    // Initialize local students state from API response
    useEffect(() => {
        const rows = (attendanceResponse?.data || []) as AttendanceApiRecord[];
        if (rows.length > 0) {
            setStudents(rows.map((item) => ({
                id: item.studentId || item.entityId,
                name: item.studentName || item.entityName,
                rollNo: item.rollNumber || item.rollNo || '',
                status: (item.status || 'NOT_MARKED') as AttendanceStatus,
                remarks: item.remark || ''
            })));
        } else {
            setStudents([]);
        }
    }, [attendanceResponse?.data]);

    // Flatten sections for dropdown
    const availableSections = useMemo<SectionOption[]>(() => {
        return classes.flatMap((cls) =>
            (cls.sections || []).map((section) => ({
                id: section.id,
                displayName: `${cls.name} - ${section.name}`
            }))
        );
    }, [classes]);

    // Set initial section selection
    useEffect(() => {
        if (availableSections.length > 0 && !selectedSectionId) {
            setSelectedSectionId(availableSections[0].id);
        }
    }, [availableSections, selectedSectionId]);

    // Filter students
    const filteredStudents = useMemo(() => {
        return students.filter(s => 
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.rollNo.includes(searchQuery)
        );
    }, [students, searchQuery]);

    // Stats
    const stats = useMemo(() => {
        const present = students.filter(s => s.status === 'PRESENT').length;
        const absent = students.filter(s => s.status === 'ABSENT').length;
        const late = students.filter(s => s.status === 'LATE').length;
        const excused = students.filter(s => s.status === 'EXCUSED').length;
        const notMarked = students.filter(s => s.status === 'NOT_MARKED').length;
        const total = students.length;
        const markedCount = total - notMarked;
        const rate = markedCount > 0 ? ((present + late) / markedCount) * 100 : 0;
        return { present, absent, late, excused, notMarked, total, rate, markedCount };
    }, [students]);

    // Handlers
    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setStudents(prev => prev.map(s => 
            s.id === studentId ? { ...s, status } : s
        ));
    };

    const handleMarkAll = (status: AttendanceStatus) => {
        setStudents(prev => prev.map(s => ({ ...s, status })));
    };

    const handleReset = () => {
        if (attendanceRows.length > 0) {
            setStudents(attendanceRows.map((item) => ({
                id: item.studentId || item.entityId,
                name: item.studentName || item.entityName,
                rollNo: item.rollNumber || item.rollNo || '',
                status: 'NOT_MARKED' as AttendanceStatus,
            })));
        }
    };

    const handleSave = async () => {
        try {
            await bulkMark({
                scope: 'STUDENT',
                date: selectedDate,
                sectionId: selectedSectionId,
                entries: students.map(s => ({
                    entityId: s.id,
                    status: s.status,
                    remark: s.remarks
                }))
            }).unwrap();
            alert('Attendance saved successfully');
        } catch (err) {
            alert('Failed to save attendance');
        }
    };

    const handleLock = async () => {
        try {
            await lockAttendance({
                scope: 'STUDENT',
                date: selectedDate,
                sectionId: selectedSectionId
            }).unwrap();
            alert('Attendance locked successfully');
        } catch (err) {
            alert('Failed to lock attendance');
        }
    };

    // Navigate date
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
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/20"
                        >
                            <Users className="w-7 h-7 text-primary" />
                        </motion.div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Student Attendance</h1>
                            <p className="text-sm text-muted-foreground">
                                Mark and manage daily student attendance
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(ATTENDANCE_ROUTES.ROOT)}>
                            <ChevronLeft size={14} className="mr-1" />Back
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleReset} disabled={isLocked || isFetching}>
                            <RotateCcw size={14} className="mr-1" />Reset
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleLock} disabled={isLocked || isFetching}>
                            <Lock size={14} className="mr-1" />Lock
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={isLocked || stats.notMarked > 0 || isFetching}>
                            <Save size={14} className="mr-1" />Save
                        </Button>
                    </div>
                </div>
            </FadeIn>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Date Navigation */}
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigateDate(-1)}>
                            <ChevronLeft size={16} />
                        </Button>
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
                            <Calendar size={16} className="text-muted-foreground" />
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="border-0 bg-transparent p-0 h-auto text-sm font-medium"
                            />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => navigateDate(1)}>
                            <ChevronRight size={16} />
                        </Button>
                    </div>

                    {/* Class & Section */}
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedSectionId}
                            onChange={(e) => setSelectedSectionId(e.target.value)}
                            className="h-10 px-3 rounded-lg border border-border bg-background text-sm"
                        >
                            <option value="">Select Class & Section</option>
                            {availableSections.map((sec) => (
                                <option key={sec.id} value={sec.id}>{sec.displayName}</option>
                            ))}
                        </select>
                    </div>

                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or roll number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                </Card>
                <Card className="p-4 text-center bg-success/5 border-success/20">
                    <p className="text-2xl font-bold text-success">{stats.present}</p>
                    <p className="text-xs text-muted-foreground">Present</p>
                </Card>
                <Card className="p-4 text-center bg-error/5 border-error/20">
                    <p className="text-2xl font-bold text-error">{stats.absent}</p>
                    <p className="text-xs text-muted-foreground">Absent</p>
                </Card>
                <Card className="p-4 text-center bg-warning/5 border-warning/20">
                    <p className="text-2xl font-bold text-warning">{stats.late}</p>
                    <p className="text-xs text-muted-foreground">Late</p>
                </Card>
                <Card className="p-4 text-center bg-info/5 border-info/20">
                    <p className="text-2xl font-bold text-info">{stats.excused}</p>
                    <p className="text-xs text-muted-foreground">Excused</p>
                </Card>
                <Card className="p-4 text-center bg-muted/50">
                    <p className="text-2xl font-bold text-muted-foreground">{stats.notMarked}</p>
                    <p className="text-xs text-muted-foreground">Not Marked</p>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">Quick Actions:</span>
                        <Button variant="outline" size="sm" onClick={() => handleMarkAll('PRESENT')} disabled={isLocked || isFetching}>
                            <UserCheck size={14} className="mr-1" />Mark All Present
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleMarkAll('ABSENT')} disabled={isLocked || isFetching}>
                            <UserX size={14} className="mr-1" />Mark All Absent
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <ProgressRing value={stats.rate} size="sm" />
                        <span className="text-sm font-semibold">{stats.rate.toFixed(1)}%</span>
                    </div>
                </div>
            </Card>

            {/* Locked Banner */}
            <AnimatePresence>
                {isLocked && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <Card className="p-4 bg-warning/10 border-warning/30">
                            <div className="flex items-center gap-3">
                                <Lock size={18} className="text-warning" />
                                <div>
                                    <p className="text-sm font-medium text-warning">Attendance Locked</p>
                                    <p className="text-xs text-muted-foreground">Historical records or finalized attendance are locked for data integrity.</p>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Student List */}
            <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-foreground">
                        Student List
                    </h3>
                    <Badge variant="outline">{filteredStudents.length} Students</Badge>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {isLoading || isFetching ? (
                        [...Array(10)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
                    ) : filteredStudents.length > 0 ? (
                        filteredStudents.map((student, index) => (
                            <StudentRow
                                key={student.id}
                                student={student}
                                index={index}
                                onStatusChange={handleStatusChange}
                                isLocked={isLocked}
                            />
                        ))
                    ) : (
                        <div className="py-12 text-center">
                            <AlertCircle size={40} className="mx-auto text-muted-foreground/50 mb-3" />
                            <p className="text-muted-foreground">No students found or select a class to view</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Bottom Action Bar */}
            <FadeIn delay={0.2}>
                <Card className="p-4 bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-muted-foreground">
                            {stats.markedCount} of {stats.total} students marked
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                                <Download size={14} className="mr-1" />Export
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={isLocked || stats.notMarked > 0 || isFetching}>
                                <Save size={14} className="mr-1" />Save Attendance
                            </Button>
                        </div>
                    </div>
                </Card>
            </FadeIn>
        </div>
    );
}
