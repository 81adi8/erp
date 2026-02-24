import { useState, type ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    BarChart3, Calendar, Download, FileText, ChevronLeft, Filter, Users,
    TrendingUp, TrendingDown, Printer, Mail, Building2, GraduationCap, type LucideIcon
} from 'lucide-react';
import { Card, Badge, Button, Input, Skeleton, FadeIn, StaggerContainer, StaggerItem } from '@erp/common';
import { ProgressRing } from '@erp/common';
import { ATTENDANCE_ROUTES } from '../../constants/routes';
import { 
    useGetAttendanceDashboardStatsQuery, 
    useGetAttendanceClassSummaryQuery, 
    useGetAttendanceHistoryQuery 
} from '../../../../api/attendanceApi';
import { useGetClassesQuery } from '../../../../api/classesApi';

// ============================================================================
// TYPES
// ============================================================================

interface ReportType {
    id: string;
    name: string;
    icon: LucideIcon;
    desc: string;
}

interface ClassOption {
    id: string;
    name: string;
    section?: string;
}

interface AttendanceHistoryPoint {
    month?: string;
    rate?: number;
    attendancePercentage?: number;
    presentCount?: number;
    present?: number;
    totalCount?: number;
    total?: number;
}

interface AttendanceClassSummary {
    classId?: string;
    name?: string;
    className?: string;
    trend?: number;
    rate?: number;
    attendancePercentage?: number;
}

const REPORT_TYPES: ReportType[] = [
    { id: 'daily', name: 'Daily Report', icon: Calendar, desc: 'Single day attendance' },
    { id: 'weekly', name: 'Weekly Report', icon: BarChart3, desc: 'Week-wise summary' },
    { id: 'monthly', name: 'Monthly Report', icon: FileText, desc: 'Monthly analysis' },
    { id: 'student', name: 'Student Report', icon: Users, desc: 'Individual student' },
    { id: 'class', name: 'Class Report', icon: Building2, desc: 'Class-wise report' },
    { id: 'teacher', name: 'Teacher Report', icon: GraduationCap, desc: 'Teacher attendance' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AttendanceReportsPage() {
    const navigate = useNavigate();
    const [dateRange, setDateRange] = useState({ from: '', to: '' });
    const [selectedClassId, setSelectedClassId] = useState('all');
    const [selectedReport, setSelectedReport] = useState('monthly');

    const { data: statsResponse, isLoading: statsLoading } = useGetAttendanceDashboardStatsQuery({});
    const { data: classSummaryResponse, isLoading: classSummaryLoading } = useGetAttendanceClassSummaryQuery({});
    const { data: historyResponse, isLoading: historyLoading } = useGetAttendanceHistoryQuery({});
    const { data: classesResponse } = useGetClassesQuery({});

    const classes: ClassOption[] = classesResponse?.data || [];
    const stats = statsResponse?.data || { attendanceRate: 0, totalStudents: 0, totalClasses: 0, trend: 0 };
    const classSummary: AttendanceClassSummary[] = classSummaryResponse?.data || [];
    const historyData: AttendanceHistoryPoint[] = historyResponse?.data || [];

    const isLoading = statsLoading || classSummaryLoading || historyLoading;

    return (
        <div className="space-y-6">
            {/* Header */}
            <FadeIn>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="p-3 bg-gradient-to-br from-warning/20 to-warning/5 rounded-2xl border border-warning/20">
                            <BarChart3 className="w-7 h-7 text-warning" />
                        </motion.div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Attendance Reports</h1>
                            <p className="text-sm text-muted-foreground">Generate and analyze attendance reports</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(ATTENDANCE_ROUTES.ROOT)}>
                            <ChevronLeft size={14} className="mr-1" />Back
                        </Button>
                        <Button variant="outline" size="sm"><Printer size={14} className="mr-1" />Print</Button>
                        <Button size="sm"><Download size={14} className="mr-1" />Export</Button>
                    </div>
                </div>
            </FadeIn>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">From:</span>
                        <Input type="date" value={dateRange.from} onChange={(e: ChangeEvent<HTMLInputElement>) => setDateRange(p => ({ ...p, from: e.target.value }))} className="w-40" />
                        <span className="text-sm text-muted-foreground">To:</span>
                        <Input type="date" value={dateRange.to} onChange={(e: ChangeEvent<HTMLInputElement>) => setDateRange(p => ({ ...p, to: e.target.value }))} className="w-40" />
                    </div>
                    <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}
                        className="h-10 px-3 rounded-lg border border-border bg-background text-sm">
                        <option value="all">All Classes</option>
                        {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>{cls.name} - {cls.section}</option>
                        ))}
                    </select>
                    <Button variant="outline" size="sm" disabled={isLoading}><Filter size={14} className="mr-1" />Apply Filters</Button>
                </div>
            </Card>

            {/* Overview Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-2xl font-bold text-foreground">{stats.attendanceRate.toFixed(1)}%</p>
                            <p className="text-sm text-muted-foreground">Overall Rate</p>
                        </div>
                        <ProgressRing value={stats.attendanceRate} size="lg" color="stroke-success" />
                    </div>
                </Card>
                <Card className="p-5 bg-success/5 border-success/20">
                    <div className="flex items-center gap-2">
                        <TrendingUp size={20} className="text-success" />
                        <div>
                            <p className="text-2xl font-bold text-success">+{stats.trend || 0}%</p>
                            <p className="text-sm text-muted-foreground">Trend</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5">
                    <p className="text-2xl font-bold text-foreground">{stats.totalStudents || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                </Card>
                <Card className="p-5">
                    <p className="text-2xl font-bold text-foreground">{stats.totalClasses || 0}</p>
                    <p className="text-sm text-muted-foreground">Classes</p>
                </Card>
            </div>

            {/* Report Types */}
            <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-4">Report Types</h3>
                <StaggerContainer staggerDelay={0.05}>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {REPORT_TYPES.map(report => (
                            <StaggerItem key={report.id}>
                                <motion.div
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedReport(report.id)}
                                    className={`p-4 rounded-xl cursor-pointer transition-all border ${
                                        selectedReport === report.id ? 'bg-primary/10 border-primary/30' : 'bg-muted/30 border-transparent hover:bg-muted/50'
                                    }`}
                                >
                                    <report.icon size={24} className={selectedReport === report.id ? 'text-primary' : 'text-muted-foreground'} />
                                    <p className="text-sm font-medium mt-2">{report.name}</p>
                                    <p className="text-xs text-muted-foreground">{report.desc}</p>
                                </motion.div>
                            </StaggerItem>
                        ))}
                    </div>
                </StaggerContainer>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monthly Trend */}
                <Card className="lg:col-span-2 p-5">
                    <h3 className="text-base font-semibold mb-4">Monthly Attendance Trend</h3>
                    <div className="space-y-3">
                        {historyData.map((month, i: number) => (
                            <motion.div key={month.month || i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                                className="flex items-center gap-4">
                                <span className="w-12 text-sm font-medium">{month.month || `Month ${i+1}`}</span>
                                <div className="flex-1 h-8 bg-muted/30 rounded-lg overflow-hidden relative">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${month.rate || month.attendancePercentage || 0}%` }} transition={{ duration: 0.6, delay: i * 0.1 }}
                                        className={`h-full rounded-lg ${(month.rate || month.attendancePercentage) >= 93 ? 'bg-success' : (month.rate || month.attendancePercentage) >= 90 ? 'bg-warning' : 'bg-error'}`} />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium">{month.rate || month.attendancePercentage || 0}%</span>
                                </div>
                                <div className="w-20 text-right">
                                    <span className="text-xs text-muted-foreground">{month.presentCount || month.present || 0}/{month.totalCount || month.total || 0}</span>
                                </div>
                            </motion.div>
                        ))}
                        {historyData.length === 0 && <p className="text-center text-muted-foreground py-8">No history data available</p>}
                    </div>
                </Card>

                {/* Class Summary */}
                <Card className="p-5">
                    <h3 className="text-base font-semibold mb-4">Class-wise Summary</h3>
                    <div className="space-y-3">
                        {classSummary.map((cls, i: number) => (
                            <motion.div key={cls.name || cls.classId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                                <div>
                                    <p className="text-sm font-medium">{cls.name || cls.className}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                        {(cls.trend || 0) > 0 ? <TrendingUp size={12} className="text-success" /> : <TrendingDown size={12} className="text-error" />}
                                        <span className={`text-xs ${(cls.trend || 0) > 0 ? 'text-success' : 'text-error'}`}>{(cls.trend || 0) > 0 ? '+' : ''}{cls.trend || 0}%</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-lg font-bold ${(cls.rate || cls.attendancePercentage || 0) >= 93 ? 'text-success' : (cls.rate || cls.attendancePercentage || 0) >= 90 ? 'text-warning' : 'text-error'}`}>{cls.rate || cls.attendancePercentage || 0}%</p>
                                </div>
                            </motion.div>
                        ))}
                        {classSummary.length === 0 && <p className="text-center text-muted-foreground py-8">No class summary available</p>}
                    </div>
                </Card>
            </div>

            {/* Export Actions */}
            <FadeIn delay={0.3}>
                <Card className="p-4 bg-gradient-to-r from-warning/5 to-transparent">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium">Export Report</p>
                            <p className="text-xs text-muted-foreground">Download in your preferred format</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm"><FileText size={14} className="mr-1" />PDF</Button>
                            <Button variant="outline" size="sm"><Download size={14} className="mr-1" />Excel</Button>
                            <Button variant="outline" size="sm"><Mail size={14} className="mr-1" />Email</Button>
                        </div>
                    </div>
                </Card>
            </FadeIn>
        </div>
    );
}
