// ============================================================================
// Admissions Dashboard Page
// ============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    UserPlus,
    Users,
    Building2,
    FileText,
    TrendingUp,
    Clock,
    CheckCircle2,
    Zap,
    Download,
    BarChart3,
    Briefcase,
    LayoutDashboard,
    ArrowRight
} from 'lucide-react';
import {
    Card,
    Badge,
    Button,
    FadeIn,
    StaggerContainer,
    StaggerItem,
    ModuleDashboardCard,
    ProgressRing,
    StatProgressCard,
    QuickActionCard
} from '@erp/common';
import { ADMIN_ROUTES } from '../../constants/routes';

export default function AdmissionsDashboardPage() {
    const navigate = useNavigate();

    // Mock stats for admissions
    const stats = {
        totalApplied: 450,
        confirmed: 320,
        pending: 85,
        rejected: 45,
        admissionRate: 71.1,
        previousRate: 68.5,
    };

    const ADMISSION_MODULES = [
        {
            title: 'Student Admissions',
            description: 'New student registrations, document verification and approvals',
            icon: UserPlus,
            path: ADMIN_ROUTES.ADMISSIONS.STUDENT,
            color: 'text-primary',
            bgColor: 'bg-primary/10',
            gradient: 'from-primary/10 to-transparent',
            borderColor: 'border-primary/20',
            stats: { label: 'Active Applications', value: '124' },
        },
        {
            title: 'Teacher Onboarding',
            description: 'Teacher recruitment, interview tracking and portal setup',
            icon: Users,
            path: ADMIN_ROUTES.ADMISSIONS.TEACHER,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-500/10',
            gradient: 'from-emerald-500/10 to-transparent',
            borderColor: 'border-emerald-500/20',
            stats: { label: 'New Onboardings', value: '12' },
        },
        {
            title: 'Staff Onboarding',
            description: 'Non-teaching staff hiring and profile management',
            icon: Briefcase,
            path: ADMIN_ROUTES.ADMISSIONS.STAFF,
            color: 'text-purple-600',
            bgColor: 'bg-purple-500/10',
            gradient: 'from-purple-500/10 to-transparent',
            borderColor: 'border-purple-500/20',
            stats: { label: 'Open Positions', value: '8' },
        },
        {
            title: 'Admission Reports',
            description: 'Demographic analysis, source tracking and conversion stats',
            icon: BarChart3,
            path: ADMIN_ROUTES.ADMISSIONS.REPORTS,
            color: 'text-amber-600',
            bgColor: 'bg-amber-500/10',
            gradient: 'from-amber-500/10 to-transparent',
            borderColor: 'border-amber-500/20',
            stats: { label: 'Reports Ready', value: '15+' },
        },
    ];

    const QUICK_ACTIONS = [
        { label: 'Register Student', icon: UserPlus, color: 'text-primary', bgColor: 'bg-primary/10', path: ADMIN_ROUTES.ADMISSIONS.STUDENT },
        { label: 'Add Teacher', icon: Users, color: 'text-emerald-600', bgColor: 'bg-emerald-500/10', path: ADMIN_ROUTES.ADMISSIONS.TEACHER },
        { label: 'Add Staff', icon: Briefcase, color: 'text-purple-600', bgColor: 'bg-purple-500/10', path: ADMIN_ROUTES.ADMISSIONS.STAFF },
        { label: 'View Reports', icon: BarChart3, color: 'text-amber-600', bgColor: 'bg-amber-500/10', path: ADMIN_ROUTES.ADMISSIONS.REPORTS },
        { label: 'Pending Docs', icon: FileText, color: 'text-rose-600', bgColor: 'bg-rose-500/10', path: '#' },
        { label: 'Export Data', icon: Download, color: 'text-cyan-600', bgColor: 'bg-cyan-500/10', path: '#' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <FadeIn>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <motion.div
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/20 shadow-sm"
                        >
                            <UserPlus className="w-7 h-7 text-primary" />
                        </motion.div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Admissions Dashboard</h1>
                            <p className="text-sm text-muted-foreground font-medium">
                                Manage registrations and onboarding across the institution
                            </p>
                        </div>
                    </div>
                </div>
            </FadeIn>

            {/* Stats Overview */}
            <FadeIn delay={0.1}>
                <Card className="p-6 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent border-primary/15 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 group-hover:bg-primary/15 transition-colors duration-500" />
                    
                    <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="space-y-3 shrink-0">
                            <Badge variant="default" className="text-xs px-2 py-0.5 bg-primary/20 text-primary border-primary/20">
                                <Zap size={10} className="mr-1 fill-primary" /> Current Session: 2024-25
                            </Badge>
                            <h2 className="text-xl font-semibold">Admission Cycle Stats</h2>
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <Users size={14} className="text-primary" />
                                <strong>{stats.totalApplied}</strong> Total candidates applied so far
                            </p>
                        </div>

                        <div className="flex flex-wrap md:flex-nowrap items-center gap-8 md:gap-12">
                            <ProgressRing
                                value={stats.admissionRate}
                                size="xl"
                                color="stroke-primary"
                                label="Conv. Rate"
                            />

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="text-center space-y-1">
                                    <p className="text-2xl font-bold text-primary">{stats.confirmed}</p>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Confirmed</p>
                                </div>
                                <div className="text-center space-y-1">
                                    <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Pending</p>
                                </div>
                                <div className="text-center space-y-1">
                                    <p className="text-2xl font-bold text-rose-500">{stats.rejected}</p>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Rejected</p>
                                </div>
                                <div className="text-center space-y-1 hidden lg:block">
                                    <div className="flex items-center justify-center gap-1 text-emerald-600">
                                        <TrendingUp size={16} />
                                        <p className="text-2xl font-bold ">{(stats.admissionRate - stats.previousRate).toFixed(1)}%</p>
                                    </div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Growth</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </FadeIn>

            {/* Module Grid */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Admissions Modules</h3>
                    <div className="h-px flex-1 bg-border mx-4" />
                </div>
                <StaggerContainer staggerDelay={0.08}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {ADMISSION_MODULES.map((module) => (
                            <StaggerItem key={module.title}>
                                <ModuleDashboardCard
                                    {...module}
                                    onClick={() => navigate(module.path)}
                                />
                            </StaggerItem>
                        ))}
                    </div>
                </StaggerContainer>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Quick Actions</h3>
                <StaggerContainer staggerDelay={0.05}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {QUICK_ACTIONS.map((action) => (
                            <StaggerItem key={action.label}>
                                <QuickActionCard
                                    {...action}
                                    onClick={() => navigate(action.path)}
                                />
                            </StaggerItem>
                        ))}
                    </div>
                </StaggerContainer>
            </div>

            {/* Recent Items & Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-5 space-y-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock size={18} className="text-primary" />
                            <h3 className="font-semibold">Recent Registrations</h3>
                        </div>
                        <Button variant="ghost" size="sm" className="group">
                            View all <ArrowRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                    
                    <div className="space-y-3">
                        {[
                            { name: 'Aarav Sharma', type: 'Student', status: 'Pending', date: '2 mins ago', color: 'bg-primary/10 text-primary' },
                            { name: 'Dr. Sarah Wilson', type: 'Teacher', status: 'Confirmed', date: '45 mins ago', color: 'bg-emerald-500/10 text-emerald-600' },
                            { name: 'Elena Gilbert', type: 'Student', status: 'Pending', date: '3 hours ago', color: 'bg-primary/10 text-primary' },
                            { name: 'Michael Scott', type: 'Staff', status: 'Rejected', date: '5 hours ago', color: 'bg-rose-500/10 text-rose-600' },
                        ].map((item, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-center justify-between p-4 bg-muted/40 rounded-xl hover:bg-muted/70 transition-colors border border-transparent hover:border-border cursor-pointer group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${item.color}`}>
                                        {item.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{item.name}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-border" />
                                            {item.type} Admission
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right space-y-1">
                                    <Badge variant={item.status === 'Confirmed' ? 'success' : item.status === 'Pending' ? 'warning' : 'destructive'} size="sm">
                                        {item.status}
                                    </Badge>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{item.date}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </Card>

                <div className="space-y-6">
                    <StatProgressCard
                        title="Today's Applications"
                        value={18}
                        maxValue={25}
                        icon={Zap}
                        variant="primary"
                        showProgress
                        trend={{ value: 12, label: 'vs yesterday' }}
                    />
                    
                    <Card className="p-5 space-y-4">
                        <div className="flex items-center gap-2">
                            <BarChart3 size={18} className="text-primary" />
                            <h3 className="font-semibold text-sm">Target vs Actual</h3>
                        </div>
                        <div className="space-y-4">
                            {[
                                { label: 'Students', current: 320, target: 500, color: 'bg-primary' },
                                { label: 'Teachers', current: 12, target: 15, color: 'bg-emerald-500' },
                                { label: 'Staff', current: 5, target: 10, color: 'bg-purple-500' },
                            ].map((item, i) => (
                                <div key={i} className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-semibold">
                                        <span>{item.label}</span>
                                        <span className="text-muted-foreground">{item.current} / {item.target}</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(item.current / item.target) * 100}%` }}
                                            transition={{ duration: 1, delay: i * 0.2 }}
                                            className={`h-full ${item.color}`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Button variant="outline" className="w-full justify-between h-12 rounded-xl border-dashed border-2 hover:border-solid hover:bg-primary/5 group">
                        <div className="flex items-center gap-2">
                            <FileText size={18} className="text-primary" />
                            <span className="font-semibold text-sm">Download Admission Policy</span>
                        </div>
                        <Download size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
