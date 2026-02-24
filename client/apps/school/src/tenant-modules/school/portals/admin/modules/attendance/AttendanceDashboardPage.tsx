// ============================================================================
// Attendance Dashboard Page - Modern animated attendance management dashboard
// ============================================================================

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardCheck, Users, Calendar, Clock, TrendingUp,
    CalendarDays, FileText, BarChart3, UserCheck, AlertCircle,
    Timer, CheckCircle2, Zap, Building2, Download, Bell
} from 'lucide-react';
import { Card, Badge, Button, Skeleton, FadeIn, StaggerContainer, StaggerItem } from '@erp/common';
import {
    ModuleDashboardCard,
    ProgressRing,
    StatProgressCard,
    QuickActionCard,
    AttendanceStatusBadge
} from '@erp/common';
import { ATTENDANCE_ROUTES } from '../../constants/routes';
import { 
    useGetAttendanceDashboardStatsQuery, 
    useGetAttendanceRecentActivityQuery, 
    useGetAttendanceClassSummaryQuery 
} from '../../../../api/attendanceApi';

// ============================================================================
// MODULE DASHBOARDS
// ============================================================================

const MODULE_DASHBOARDS = [
    {
        title: 'Student Attendance',
        description: 'Mark, view and manage daily student attendance records',
        icon: UserCheck,
        path: ATTENDANCE_ROUTES.STUDENT,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        gradient: 'from-primary/10 to-transparent',
        borderColor: 'border-primary/20',
        stats: { label: 'Avg. Attendance', value: '...' },
    },
    {
        title: 'Teacher Attendance',
        description: 'Track and manage teaching staff attendance',
        icon: Users,
        path: ATTENDANCE_ROUTES.TEACHER,
        color: 'text-success',
        bgColor: 'bg-success/10',
        gradient: 'from-success/10 to-transparent',
        borderColor: 'border-success/20',
        stats: { label: 'Teachers Present', value: '...' },
    },
    {
        title: 'Staff Attendance',
        description: 'Manage non-teaching staff attendance',
        icon: Building2,
        path: ATTENDANCE_ROUTES.STAFF,
        color: 'text-purple-600',
        bgColor: 'bg-purple-500/10',
        gradient: 'from-purple-500/10 to-transparent',
        borderColor: 'border-purple-500/20',
        stats: { label: 'Staff Present', value: '...' },
    },
    {
        title: 'Class Summary',
        description: 'View class-wise attendance summary and analytics',
        icon: BarChart3,
        path: ATTENDANCE_ROUTES.CLASS,
        color: 'text-info',
        bgColor: 'bg-info/10',
        gradient: 'from-info/10 to-transparent',
        borderColor: 'border-info/20',
        stats: { label: 'Classes Today', value: '...' },
    },
    {
        title: 'Reports & Analytics',
        description: 'Generate detailed attendance reports and analytics',
        icon: FileText,
        path: ATTENDANCE_ROUTES.REPORTS,
        color: 'text-warning',
        bgColor: 'bg-warning/10',
        gradient: 'from-warning/10 to-transparent',
        borderColor: 'border-warning/20',
        stats: { label: 'Monthly Reports', value: '...' },
    },
    {
        title: 'Leave Management',
        description: 'Approve and track student leave applications',
        icon: Calendar,
        path: ATTENDANCE_ROUTES.LEAVES,
        color: 'text-cyan-600',
        bgColor: 'bg-cyan-500/10',
        gradient: 'from-cyan-500/10 to-transparent',
        borderColor: 'border-cyan-500/20',
        stats: { label: 'Pending Leaves', value: '...' },
    },
];

// ============================================================================
// QUICK ACTIONS
// ============================================================================

const QUICK_ACTIONS = [
    { label: 'Mark Students', icon: ClipboardCheck, color: 'text-primary', bgColor: 'bg-primary/10', path: ATTENDANCE_ROUTES.STUDENT },
    { label: 'Mark Teachers', icon: Users, color: 'text-success', bgColor: 'bg-success/10', path: ATTENDANCE_ROUTES.TEACHER },
    { label: 'View History', icon: Clock, color: 'text-info', bgColor: 'bg-info/10', path: ATTENDANCE_ROUTES.HISTORY },
    { label: 'Reports', icon: FileText, color: 'text-warning', bgColor: 'bg-warning/10', path: ATTENDANCE_ROUTES.REPORTS },
    { label: 'Manage Leaves', icon: Calendar, color: 'text-cyan-600', bgColor: 'bg-cyan-500/10', path: ATTENDANCE_ROUTES.LEAVES },
    { label: 'Notifications', icon: Bell, color: 'text-orange-600', bgColor: 'bg-orange-500/10', path: ATTENDANCE_ROUTES.SETTINGS },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AttendanceDashboardPage() {
    const navigate = useNavigate();
    
    // API Data
    const { data: statsResponse, isLoading: statsLoading } = useGetAttendanceDashboardStatsQuery({});
    const { data: activityResponse, isLoading: activityLoading } = useGetAttendanceRecentActivityQuery({ limit: 4 });
    const { data: classSummaryResponse, isLoading: classSummaryLoading } = useGetAttendanceClassSummaryQuery({});

    const isLoading = statsLoading || activityLoading || classSummaryLoading;

    const todayStats = statsResponse?.data || {
        totalStudents: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        attendanceRate: 0,
        previousRate: 0,
    };

    const recentActivity = activityResponse?.data || [];
    const classSummary = classSummaryResponse?.data || [];

    const attendanceTrend = todayStats.attendanceRate - todayStats.previousRate;
    const trendDirection = attendanceTrend > 0 ? 'up' : attendanceTrend < 0 ? 'down' : 'neutral';

    return (
        <div className="space-y-6">
            {/* ================================================================ */}
            {/* Header Section */}
            {/* ================================================================ */}
            <FadeIn>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/20"
                        >
                            <ClipboardCheck className="w-7 h-7 text-primary" />
                        </motion.div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Attendance Dashboard</h1>
                            <p className="text-sm text-muted-foreground">
                                Real-time attendance tracking and management
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(ATTENDANCE_ROUTES.HISTORY)}>
                            <Clock size={14} className="mr-1.5" />View History
                        </Button>
                        <Button size="sm" onClick={() => navigate(ATTENDANCE_ROUTES.MARKING)}>
                            <ClipboardCheck size={14} className="mr-1.5" />Mark Attendance
                        </Button>
                    </div>
                </div>
            </FadeIn>

            {/* ================================================================ */}
            {/* Today's Overview Banner */}
            {/* ================================================================ */}
            <FadeIn delay={0.1}>
                <Card className="p-6 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-primary/20 overflow-hidden relative">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-success/5 rounded-full blur-2xl translate-y-1/2" />
                    
                    <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <Badge variant="default" className="text-xs">
                                <Zap size={10} className="mr-1" />Today's Overview
                            </Badge>
                            <h2 className="text-xl font-semibold text-foreground">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </h2>
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <Users size={14} />
                                {todayStats.totalStudents.toLocaleString()} students enrolled
                            </p>
                        </div>

                        <div className="flex items-center gap-6">
                            {/* Attendance Ring */}
                            <ProgressRing
                                value={todayStats.attendanceRate}
                                size="xl"
                                color="stroke-success"
                                label="Today's Rate"
                            />

                            {/* Quick Stats */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="text-center p-3 bg-success/10 rounded-xl border border-success/20">
                                    <p className="text-2xl font-bold text-success">{todayStats.present}</p>
                                    <p className="text-xs text-muted-foreground">Present</p>
                                </div>
                                <div className="text-center p-3 bg-error/10 rounded-xl border border-error/20">
                                    <p className="text-2xl font-bold text-error">{todayStats.absent}</p>
                                    <p className="text-xs text-muted-foreground">Absent</p>
                                </div>
                                <div className="text-center p-3 bg-warning/10 rounded-xl border border-warning/20">
                                    <p className="text-2xl font-bold text-warning">{todayStats.late}</p>
                                    <p className="text-xs text-muted-foreground">Late</p>
                                </div>
                                <div className="text-center p-3 bg-info/10 rounded-xl border border-info/20">
                                    <p className="text-2xl font-bold text-info">{todayStats.excused}</p>
                                    <p className="text-xs text-muted-foreground">Excused</p>
                                </div>
                            </div>

                            {/* Trend Badge */}
                            <div className="hidden xl:flex flex-col items-center gap-2">
                                <div className={`p-3 rounded-xl ${trendDirection === 'up' ? 'bg-success/10' : trendDirection === 'down' ? 'bg-error/10' : 'bg-muted'}`}>
                                    <TrendingUp size={24} className={trendDirection === 'up' ? 'text-success' : trendDirection === 'down' ? 'text-error rotate-180' : 'text-muted-foreground'} />
                                </div>
                                <span className={`text-sm font-semibold ${trendDirection === 'up' ? 'text-success' : trendDirection === 'down' ? 'text-error' : 'text-muted-foreground'}`}>
                                    {attendanceTrend > 0 ? '+' : ''}{attendanceTrend.toFixed(1)}%
                                </span>
                                <span className="text-xs text-muted-foreground">vs yesterday</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </FadeIn>

            {/* ================================================================ */}
            {/* Module Dashboards Grid */}
            {/* ================================================================ */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        Attendance Modules
                    </h3>
                    <Badge variant="outline" className="text-xs">{MODULE_DASHBOARDS.length} Modules</Badge>
                </div>
                <StaggerContainer staggerDelay={0.08}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {MODULE_DASHBOARDS.map((module, index) => (
                            <StaggerItem key={module.title}>
                                <ModuleDashboardCard
                                    title={module.title}
                                    description={module.description}
                                    icon={module.icon}
                                    onClick={() => navigate(module.path)}
                                    color={module.color}
                                    bgColor={module.bgColor}
                                    gradient={module.gradient}
                                    borderColor={module.borderColor}
                                    stats={module.stats}
                                />
                            </StaggerItem>
                        ))}
                    </div>
                </StaggerContainer>
            </div>

            {/* ================================================================ */}
            {/* Stats Cards Row */}
            {/* ================================================================ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {isLoading ? (
                    [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
                ) : (
                    <>
                        <StatProgressCard
                            title="Weekly Average"
                            value={92.8}
                            suffix="%"
                            maxValue={100}
                            icon={BarChart3}
                            variant="primary"
                            trend={{ value: 2.3, label: 'vs last week' }}
                        />
                        <StatProgressCard
                            title="Monthly Average"
                            value={91.5}
                            suffix="%"
                            maxValue={100}
                            icon={CalendarDays}
                            variant="success"
                            trend={{ value: 1.8, label: 'vs last month' }}
                        />
                        <StatProgressCard
                            title="Classes Marked"
                            value={42}
                            maxValue={45}
                            icon={CheckCircle2}
                            variant="warning"
                            showProgress={true}
                        />
                        <StatProgressCard
                            title="Pending Leaves"
                            value={8}
                            maxValue={20}
                            icon={Clock}
                            variant="error"
                            showProgress={true}
                        />
                    </>
                )}
            </div>

            {/* ================================================================ */}
            {/* Main Content Grid */}
            {/* ================================================================ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <Card className="lg:col-span-2 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Timer size={18} className="text-muted-foreground" />
                            <h3 className="text-base font-semibold text-foreground">Recent Activity</h3>
                        </div>
                        <Button variant="ghost" size="sm">View All</Button>
                    </div>
                    <div className="space-y-3">
                        {isLoading ? (
                            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
                        ) : (
                            recentActivity.map((activity, index) => (
                                <motion.div
                                    key={activity.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ x: 4 }}
                                    className="flex items-center justify-between p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer border-l-2 border-primary/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${
                                            activity.type === 'marking' ? 'bg-success/10' :
                                            activity.type === 'leave' ? 'bg-info/10' :
                                            'bg-warning/10'
                                        }`}>
                                            {activity.type === 'marking' ? (
                                                <UserCheck size={16} className="text-success" />
                                            ) : activity.type === 'leave' ? (
                                                <Calendar size={16} className="text-info" />
                                            ) : (
                                                <AlertCircle size={16} className="text-warning" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{activity.title}</p>
                                            <p className="text-xs text-muted-foreground">{activity.subtitle}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <AttendanceStatusBadge status={activity.status} size="sm" showLabel={false} />
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </Card>

                {/* Class-wise Summary */}
                <Card className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Building2 size={18} className="text-muted-foreground" />
                            <h3 className="text-base font-semibold text-foreground">Class Summary</h3>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => navigate(ATTENDANCE_ROUTES.CLASS)}>
                            All Classes
                        </Button>
                    </div>
                    <div className="space-y-2 max-h-[320px] overflow-y-auto">
                        {isLoading ? (
                            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
                        ) : (
                            classSummary.map((cls, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ x: 3 }}
                                    className="p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                                <span className="text-xs font-bold text-primary">
                                                    {cls.className.split(' ')[1]}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{cls.className}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {cls.present}/{cls.total} present
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-bold ${
                                                cls.rate >= 95 ? 'text-success' :
                                                cls.rate >= 85 ? 'text-warning' :
                                                'text-error'
                                            }`}>
                                                {cls.rate.toFixed(1)}%
                                            </p>
                                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${cls.rate}%` }}
                                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                                    className={`h-full rounded-full ${
                                                        cls.rate >= 95 ? 'bg-success' :
                                                        cls.rate >= 85 ? 'bg-warning' :
                                                        'bg-error'
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </Card>
            </div>

            {/* ================================================================ */}
            {/* Quick Actions */}
            {/* ================================================================ */}
            <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                    Quick Actions
                </h3>
                <StaggerContainer staggerDelay={0.05}>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {QUICK_ACTIONS.map((action, index) => (
                            <StaggerItem key={action.label}>
                                <QuickActionCard
                                    label={action.label}
                                    icon={action.icon}
                                    color={action.color}
                                    bgColor={action.bgColor}
                                    onClick={() => navigate(action.path)}
                                />
                            </StaggerItem>
                        ))}
                    </div>
                </StaggerContainer>
            </div>

            {/* ================================================================ */}
            {/* Bottom Action Bar */}
            {/* ================================================================ */}
            <FadeIn delay={0.3}>
                <Card className="p-4 bg-gradient-to-r from-muted/50 to-transparent">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Download size={18} className="text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground">Export Attendance Data</p>
                                <p className="text-xs text-muted-foreground">Download reports in Excel or PDF format</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                                <FileText size={14} className="mr-1.5" />Export PDF
                            </Button>
                            <Button variant="outline" size="sm">
                                <Download size={14} className="mr-1.5" />Export Excel
                            </Button>
                        </div>
                    </div>
                </Card>
            </FadeIn>
        </div>
    );
}
