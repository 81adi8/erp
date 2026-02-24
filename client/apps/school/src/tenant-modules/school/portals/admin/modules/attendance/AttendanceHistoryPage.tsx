// ============================================================================
// Attendance History Page - View historical attendance records
// ============================================================================

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Clock, Calendar, ChevronLeft, Search, Download, Eye,
    AlertCircle, Building2, Table, Users, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Card, Badge, Button, Input, Skeleton, FadeIn } from '@erp/common';
import { ATTENDANCE_ROUTES } from '../../constants/routes';
import {
    useGetAttendanceHistoryQuery,
    useGetMonthlyAttendanceSummaryQuery,
} from '../../../../api/attendanceApi';
import { useGetClassesQuery } from '../../../../api/classesApi';
import { useGetSectionsQuery } from '@core/api/endpoints/academicsApi';
import { useAcademicSession } from '@core/hooks/useAcademicSession';

// ============================================================================
// TYPES
// ============================================================================

interface AttendanceRecord {
    id: string;
    date: string;
    className: string;
    section: string;
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    rate: number;
    markedBy: string;
    markedAt: string;
    isLocked: boolean;
    classId?: string;
    sectionId?: string;
    markedByName?: string;
}

interface StudentSummary {
    studentId: string;
    studentName: string;
    rollNumber?: string;
    present: number;
    absent: number;
    late: number;
    leave: number;
    totalDays: number;
    percentage: number;
}

interface ClassOption {
    id: string;
    name: string;
    section?: string;
}

interface SectionOption {
    id: string;
    name: string;
    classId?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AttendanceHistoryPage() {
    const navigate = useNavigate();
    const { sessionId } = useAcademicSession();
    
    // View mode state
    const [viewMode, setViewMode] = useState<'register' | 'summary'>('register');
    
    // Filter states
    const [classFilter, setClassFilter] = useState('');
    const [sectionFilter, setSectionFilter] = useState('');
    const [academicYearId, setAcademicYearId] = useState(sessionId || '');
    const [monthFilter, setMonthFilter] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [searchQuery, setSearchQuery] = useState('');
    
    // API Data
    const { data: response, isLoading } = useGetAttendanceHistoryQuery({
        startDate: monthFilter ? `${monthFilter}-01` : undefined,
        endDate: monthFilter ? `${monthFilter}-31` : undefined,
        classId: classFilter || undefined,
        sectionId: sectionFilter || undefined,
        academicYearId: academicYearId || undefined,
    });
    
    const { data: classesResponse } = useGetClassesQuery({});
    const { data: sectionsResponse } = useGetSectionsQuery(
        { classId: classFilter },
        { skip: !classFilter }
    );
    
    // Monthly summary for student view
    const { data: monthlySummaryResponse, isLoading: isLoadingSummary } = useGetMonthlyAttendanceSummaryQuery(
        {
            classId: classFilter,
            sectionId: sectionFilter,
            academicYearId: academicYearId || undefined,
            month: monthFilter ? monthFilter.split('-')[1] : undefined,
            year: monthFilter ? monthFilter.split('-')[0] : undefined,
        },
        { skip: !classFilter || !sectionFilter || viewMode !== 'summary' }
    );
    
    const classes: ClassOption[] = classesResponse?.data || [];
    const sections: SectionOption[] = sectionsResponse?.data || [];
    const historyData: AttendanceRecord[] = response?.data || [];
    const studentSummaries: StudentSummary[] = monthlySummaryResponse?.data || [];

    // Get days in selected month for register view
    const daysInMonth = useMemo(() => {
        if (!monthFilter) return [];
        const [year, month] = monthFilter.split('-').map(Number);
        const days = new Date(year, month, 0).getDate();
        return Array.from({ length: days }, (_, i) => i + 1);
    }, [monthFilter]);

    // Filter history records
    const filteredRecords = useMemo(() => {
        return historyData.filter(r => {
            const matchesSearch = (r.className || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  (r.markedByName || r.markedBy || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSection = !sectionFilter || r.sectionId === sectionFilter;
            return matchesSearch && matchesSection;
        });
    }, [historyData, searchQuery, sectionFilter]);

    // Filter student summaries
    const filteredSummaries = useMemo(() => {
        return studentSummaries
            .filter(s => s.studentName.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => a.percentage - b.percentage); // Worst first
    }, [studentSummaries, searchQuery]);

    // Group by date for register view
    const groupedByDate = useMemo(() => {
        const groups: Record<string, AttendanceRecord[]> = {};
        filteredRecords.forEach(r => {
            if (!groups[r.date]) groups[r.date] = [];
            groups[r.date].push(r);
        });
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [filteredRecords]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatMonth = (monthStr: string) => {
        if (!monthStr) return '';
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    };

    const isLoadingData = isLoading || (viewMode === 'summary' && isLoadingSummary);

    return (
        <div className="space-y-6">
            {/* Header */}
            <FadeIn>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="p-3 bg-gradient-to-br from-info/20 to-info/5 rounded-2xl border border-info/20">
                            <Clock className="w-7 h-7 text-info" />
                        </motion.div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Attendance History</h1>
                            <p className="text-sm text-muted-foreground">View past attendance records and student summaries</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(ATTENDANCE_ROUTES.ROOT)}>
                            <ChevronLeft size={14} className="mr-1" />Back
                        </Button>
                        <Button variant="outline" size="sm">
                            <Download size={14} className="mr-1" />Export
                        </Button>
                    </div>
                </div>
            </FadeIn>

            {/* Filters */}
            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Class *</label>
                        <select 
                            value={classFilter} 
                            onChange={(e) => { setClassFilter(e.target.value); setSectionFilter(''); }}
                            className="h-10 px-3 rounded-lg border border-border bg-background text-sm w-full"
                        >
                            <option value="">Select Class</option>
                            {classes.map((cls) => (
                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Section *</label>
                        <select 
                            value={sectionFilter} 
                            onChange={(e) => setSectionFilter(e.target.value)}
                            className="h-10 px-3 rounded-lg border border-border bg-background text-sm w-full"
                            disabled={!classFilter}
                        >
                            <option value="">Select Section</option>
                            {sections.map((sec) => (
                                <option key={sec.id} value={sec.id}>{sec.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Academic Year</label>
                        <Input
                            value={academicYearId}
                            onChange={(e) => setAcademicYearId(e.target.value)}
                            placeholder="Academic Year ID"
                            className="h-10"
                        />
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Month</label>
                        <Input
                            type="month"
                            value={monthFilter}
                            onChange={(e) => setMonthFilter(e.target.value)}
                            className="h-10"
                        />
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Student Search</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input 
                                placeholder="Search student..." 
                                value={searchQuery} 
                                onChange={(e) => setSearchQuery(e.target.value)} 
                                className="pl-9 h-10" 
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* View Toggle */}
            <Card className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{formatMonth(monthFilter)}</span>
                        {classFilter && sections.find(s => s.id === sectionFilter) && (
                            <Badge variant="outline">
                                {classes.find(c => c.id === classFilter)?.name} - {sections.find(s => s.id === sectionFilter)?.name}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('register')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
                                viewMode === 'register' 
                                    ? 'bg-background shadow-sm text-foreground' 
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Table size={16} />
                            Register View
                        </button>
                        <button
                            onClick={() => setViewMode('summary')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all ${
                                viewMode === 'summary' 
                                    ? 'bg-background shadow-sm text-foreground' 
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Users size={16} />
                            Student Summary
                        </button>
                    </div>
                </div>
            </Card>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                    <p className="text-2xl font-bold">{viewMode === 'register' ? filteredRecords.length : filteredSummaries.length}</p>
                    <p className="text-xs text-muted-foreground">{viewMode === 'register' ? 'Total Records' : 'Students'}</p>
                </Card>
                <Card className="p-4 text-center bg-success/5 border-success/20">
                    <p className="text-2xl font-bold text-success">
                        {viewMode === 'register' 
                            ? filteredRecords.filter(r => r.rate >= 95).length 
                            : filteredSummaries.filter(s => s.percentage >= 75).length}
                    </p>
                    <p className="text-xs text-muted-foreground">{viewMode === 'register' ? 'Excellent (95%+)' : 'Good (75%+)'}</p>
                </Card>
                <Card className="p-4 text-center bg-warning/5 border-warning/20">
                    <p className="text-2xl font-bold text-warning">
                        {viewMode === 'register' 
                            ? filteredRecords.filter(r => r.rate >= 85 && r.rate < 95).length 
                            : filteredSummaries.filter(s => s.percentage >= 60 && s.percentage < 75).length}
                    </p>
                    <p className="text-xs text-muted-foreground">{viewMode === 'register' ? 'Good (85-95%)' : 'Average (60-75%)'}</p>
                </Card>
                <Card className="p-4 text-center bg-error/5 border-error/20">
                    <p className="text-2xl font-bold text-error">
                        {viewMode === 'register' 
                            ? filteredRecords.filter(r => r.rate < 85).length 
                            : filteredSummaries.filter(s => s.percentage < 60).length}
                    </p>
                    <p className="text-xs text-muted-foreground">{viewMode === 'register' ? 'Needs Attention' : 'At Risk (<60%)'}</p>
                </Card>
            </div>

            {/* Content based on view mode */}
            {isLoadingData ? (
                <div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
            ) : viewMode === 'register' ? (
                // Register View - History grouped by date
                groupedByDate.length > 0 ? (
                    <div className="space-y-6">
                        {groupedByDate.map(([date, records]) => (
                            <div key={date}>
                                <div className="flex items-center gap-3 mb-3">
                                    <Calendar size={16} className="text-muted-foreground" />
                                    <h3 className="text-sm font-semibold text-foreground">{formatDate(date)}</h3>
                                    <Badge variant="outline">{records.length} records</Badge>
                                </div>
                                <div className="space-y-2">
                                    {records.map((record, i) => (
                                        <motion.div key={record.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                            <Card className={`p-4 hover:shadow-sm transition-shadow ${record.rate >= 95 ? 'border-l-4 border-l-success' : record.rate >= 85 ? 'border-l-4 border-l-warning' : 'border-l-4 border-l-error'}`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                                            <Building2 size={20} className="text-primary" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-medium">{record.className} - Section {record.section}</p>
                                                                {record.isLocked && <Badge variant="outline" className="text-xs">Locked</Badge>}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">Marked by {record.markedByName || record.markedBy} at {record.markedAt}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="grid grid-cols-4 gap-4 text-center">
                                                            <div><p className="text-sm font-bold text-success">{record.present}</p><p className="text-xs text-muted-foreground">Present</p></div>
                                                            <div><p className="text-sm font-bold text-error">{record.absent}</p><p className="text-xs text-muted-foreground">Absent</p></div>
                                                            <div><p className="text-sm font-bold text-warning">{record.late}</p><p className="text-xs text-muted-foreground">Late</p></div>
                                                            <div><p className="text-sm font-bold text-muted-foreground">{record.total}</p><p className="text-xs text-muted-foreground">Total</p></div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`text-xl font-bold ${record.rate >= 95 ? 'text-success' : record.rate >= 85 ? 'text-warning' : 'text-error'}`}>{record.rate}%</p>
                                                        </div>
                                                        <Button variant="ghost" size="sm"><Eye size={14} /></Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <Card className="p-12 text-center">
                        <AlertCircle size={48} className="mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">No attendance records found</p>
                        <p className="text-xs text-muted-foreground mt-2">Select a class and section to view attendance history</p>
                    </Card>
                )
            ) : (
                // Student Summary View
                filteredSummaries.length > 0 ? (
                    <Card className="p-0 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/40 border-b border-border">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Student</th>
                                        <th className="text-center px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Present</th>
                                        <th className="text-center px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Absent</th>
                                        <th className="text-center px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Late</th>
                                        <th className="text-center px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Leave</th>
                                        <th className="text-center px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Total Days</th>
                                        <th className="text-center px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Attendance %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredSummaries.map((student, i) => (
                                        <motion.tr 
                                            key={student.studentId} 
                                            initial={{ opacity: 0, y: 8 }} 
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`${student.percentage < 75 ? 'bg-red-50/40' : 'hover:bg-muted/20'}`}
                                        >
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-sm">{student.studentName}</p>
                                                {student.rollNumber && (
                                                    <p className="text-xs text-muted-foreground">{student.rollNumber}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center text-sm text-success font-medium">{student.present}</td>
                                            <td className="px-4 py-3 text-center text-sm text-error font-medium">{student.absent}</td>
                                            <td className="px-4 py-3 text-center text-sm text-warning font-medium">{student.late}</td>
                                            <td className="px-4 py-3 text-center text-sm text-muted-foreground">{student.leave}</td>
                                            <td className="px-4 py-3 text-center text-sm">{student.totalDays}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-sm font-bold px-2 py-1 rounded ${
                                                    student.percentage >= 75 
                                                        ? 'text-success bg-success/10' 
                                                        : student.percentage >= 60 
                                                            ? 'text-warning bg-warning/10' 
                                                            : 'text-error bg-error/10'
                                                }`}>
                                                    {student.percentage.toFixed(1)}%
                                                </span>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                ) : (
                    <Card className="p-12 text-center">
                        <AlertCircle size={48} className="mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">No student summaries found</p>
                        <p className="text-xs text-muted-foreground mt-2">Select a class and section to view student attendance summary</p>
                    </Card>
                )
            )}
        </div>
    );
}
