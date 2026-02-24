// ============================================================================
// Student Admissions Page - Dashboard for student intake management
// ============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    UserPlus,
    Users,
    FileCheck,
    Upload,
    BarChart3,
    ArrowLeft,
    CheckCircle2,
    Users2,
    School,
    UserMinus,
    Search,
    ShieldCheck,
    Zap,
    Download
} from 'lucide-react';
import {
    Card,
    Badge,
    Button,
    FadeIn,
    StaggerContainer,
    StaggerItem,
    ModuleDashboardCard,
    StatProgressCard,
    QuickActionCard,
    ProgressRing
} from '@erp/common';
import { ADMIN_ROUTES } from '../../constants/routes';

export default function StudentAdmissionsPage() {
    const navigate = useNavigate();

    const STUDENT_MODULES = [
        {
            title: 'Individual Admission',
            description: 'Step-by-step registration for a new student',
            icon: UserPlus,
            path: ADMIN_ROUTES.USERS.STUDENTS.ADMISSION,
            color: 'text-primary',
            bgColor: 'bg-primary/10',
            gradient: 'from-primary/10 to-transparent',
            borderColor: 'border-primary/20',
            stats: { label: 'Today', value: '+5' },
        },
        {
            title: 'Bulk Import',
            description: 'Import registration data from Excel/CSV templates',
            icon: Upload,
            path: ADMIN_ROUTES.USERS.STUDENTS.BULK_IMPORT,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-500/10',
            gradient: 'from-emerald-500/10 to-transparent',
            borderColor: 'border-emerald-500/20',
            stats: { label: 'Last Import', value: '2 days ago' },
        },
        {
            title: 'Academic Enrollment',
            description: 'Assign class, section and roll numbers to admitted students',
            icon: School,
            path: ADMIN_ROUTES.USERS.STUDENTS.ENROLLMENT,
            color: 'text-purple-600',
            bgColor: 'bg-purple-500/10',
            gradient: 'from-purple-500/10 to-transparent',
            borderColor: 'border-purple-500/20',
            stats: { label: 'To Enroll', value: '24' },
        },
        {
            title: 'Doc Verification',
            description: 'Review and approve uploaded documents',
            icon: FileCheck,
            path: '#',
            color: 'text-amber-600',
            bgColor: 'bg-amber-500/10',
            gradient: 'from-amber-500/10 to-transparent',
            borderColor: 'border-amber-500/20',
            stats: { label: 'Pending', value: '18' },
        },
        {
            title: 'Withdrawals',
            description: 'Process Transfer Certificates and withdrawals',
            icon: UserMinus,
            path: '#',
            color: 'text-rose-600',
            bgColor: 'bg-rose-500/10',
            gradient: 'from-rose-500/10 to-transparent',
            borderColor: 'border-rose-500/20',
            stats: { label: 'This Month', value: '2' },
        },
        {
            title: 'Entrance Tests',
            description: 'Manage results and rankings of admission tests',
            icon: BarChart3,
            path: '#',
            color: 'text-cyan-600',
            bgColor: 'bg-cyan-500/10',
            gradient: 'from-cyan-500/10 to-transparent',
            borderColor: 'border-cyan-500/20',
            stats: { label: 'Next Test', value: 'Tomorrow' },
        },
    ];

    const QUICK_ACTIONS = [
        { label: 'New Admission', icon: UserPlus, color: 'text-primary', bgColor: 'bg-primary/10', path: ADMIN_ROUTES.USERS.STUDENTS.ADMISSION },
        { label: 'Bulk Import', icon: Upload, color: 'text-emerald-600', bgColor: 'bg-emerald-500/10', path: ADMIN_ROUTES.USERS.STUDENTS.BULK_IMPORT },
        { label: 'Enrollment', icon: School, color: 'text-purple-600', bgColor: 'bg-purple-500/10', path: ADMIN_ROUTES.USERS.STUDENTS.ENROLLMENT },
        { label: 'Search Portal', icon: Search, color: 'text-info', bgColor: 'bg-info/10', path: '#' },
        { label: 'Id Cards', icon: ShieldCheck, color: 'text-warning', bgColor: 'bg-warning/10', path: '#' },
        { label: 'Guidelines', icon: Download, color: 'text-rose-600', bgColor: 'bg-rose-500/10', path: '#' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <FadeIn>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(ADMIN_ROUTES.ADMISSIONS.DASHBOARD)}
                            className="rounded-full hover:bg-muted"
                        >
                            <ArrowLeft size={20} />
                        </Button>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="p-3 bg-primary/10 rounded-2xl border border-primary/20"
                        >
                            <Users2 className="w-7 h-7 text-primary" />
                        </motion.div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Student Admissions</h1>
                            <p className="text-sm text-muted-foreground font-medium">
                                Lifecycle management for student intake and enrollments
                            </p>
                        </div>
                    </div>
                </div>
            </FadeIn>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <StatProgressCard
                    title="Total Applications"
                    value={382}
                    maxValue={500}
                    icon={Users}
                    variant="primary"
                    trend={{ value: 15, label: 'this week' }}
                    showProgress
                />
                <StatProgressCard
                    title="Doc Verified"
                    value={312}
                    maxValue={382}
                    icon={CheckCircle2}
                    variant="success"
                    showProgress
                />
                <StatProgressCard
                    title="Pending Enrollment"
                    value={24}
                    maxValue={100}
                    icon={School}
                    variant="warning"
                    showProgress
                />
                <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent border-primary/20 flex items-center justify-center">
                    <ProgressRing
                        value={81}
                        size="lg"
                        color="stroke-primary"
                        label="Conversion"
                    />
                </Card>
            </div>

            {/* Modules Grid */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] px-1">Intake Workflows</h3>
                <StaggerContainer staggerDelay={0.06}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {STUDENT_MODULES.map((module) => (
                            <StaggerItem key={module.title}>
                                <ModuleDashboardCard
                                    {...module}
                                    onClick={() => module.path !== '#' && navigate(module.path)}
                                />
                            </StaggerItem>
                        ))}
                    </div>
                </StaggerContainer>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] px-1">Registration Shortcuts</h3>
                <StaggerContainer staggerDelay={0.04}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {QUICK_ACTIONS.map((action) => (
                            <StaggerItem key={action.label}>
                                <QuickActionCard
                                    {...action}
                                    onClick={() => action.path !== '#' && navigate(action.path)}
                                />
                            </StaggerItem>
                        ))}
                    </div>
                </StaggerContainer>
            </div>

            {/* Admission Funnel / Visual Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-6 space-y-6 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Users2 size={200} />
                    </div>
                    
                    <div className="flex items-center justify-between relative z-10">
                        <div className="space-y-1">
                            <h3 className="font-bold text-lg">Class-wise Admission Status</h3>
                            <p className="text-xs text-muted-foreground">Current intake distribution across grades</p>
                        </div>
                        <Button variant="outline" size="sm">Download Chart</Button>
                    </div>

                    <div className="space-y-5 relative z-10">
                        {[
                            { class: 'Grade 1', applied: 85, intake: 100, color: 'bg-primary' },
                            { class: 'Grade 2', applied: 42, intake: 50, color: 'bg-emerald-500' },
                            { class: 'Grade 3', applied: 68, intake: 75, color: 'bg-amber-500' },
                            { class: 'Grade 4', applied: 92, intake: 100, color: 'bg-rose-500' },
                            { class: 'Grade 5', applied: 25, intake: 40, color: 'bg-purple-500' },
                        ].map((item, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between text-xs font-bold">
                                    <span className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${item.color}`} />
                                        {item.class}
                                    </span>
                                    <span className="text-muted-foreground">{item.applied} / {item.intake} Students</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full group overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(item.applied / item.target || item.intake) * 100}%` }}
                                        transition={{ duration: 1, delay: i * 0.1 }}
                                        className={`h-full ${item.color} rounded-full`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card className="p-5 bg-primary/5 border-primary/20 space-y-4">
                        <div className="flex items-center gap-2 text-primary">
                            <Zap size={18} className="fill-primary" />
                            <h3 className="font-bold text-sm">Admission Tips</h3>
                        </div>
                        <ul className="space-y-3">
                            {[
                                'Verify Aadhar number before final submission.',
                                'Ensure parent email is correct for communication.',
                                'Collect medical certificates for Grade 1.',
                                'Check for sibling discounts if applicable.'
                            ].map((tip, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1 flex-shrink-0" />
                                    {tip}
                                </li>
                            ))}
                        </ul>
                    </Card>

                    <Button className="w-full h-14 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-bold gap-2">
                        <UserPlus size={20} />
                        Start New Admission Form
                    </Button>
                </div>
            </div>
        </div>
    );
}
