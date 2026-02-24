// ============================================================================
// Teacher Admissions Page - Dashboard for staff recruitment & onboarding
// ============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    UserPlus,
    Calendar,
    Briefcase,
    FileText,
    CheckCircle2,
    ArrowLeft,
    Search,
    Mail,
    Phone,
    MapPin,
    Zap,
    ClipboardCheck,
    Contact2
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

export default function TeacherAdmissionsPage() {
    const navigate = useNavigate();

    const RECRUITMENT_MODULES = [
        {
            title: 'New Recruitment',
            description: 'Create individual teacher profile and onboarding journey',
            icon: UserPlus,
            path: ADMIN_ROUTES.USERS.TEACHERS.CREATE,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-500/10',
            gradient: 'from-emerald-500/10 to-transparent',
            borderColor: 'border-emerald-500/20',
            stats: { label: 'This Week', value: '+3' },
        },
        {
            title: 'Vacancy Manager',
            description: 'Manage open positions by subject and department',
            icon: Briefcase,
            path: '#',
            color: 'text-primary',
            bgColor: 'bg-primary/10',
            gradient: 'from-primary/10 to-transparent',
            borderColor: 'border-primary/20',
            stats: { label: 'Open Roles', value: '4' },
        },
        {
            title: 'Interview Panels',
            description: 'Schedule interviews and track candidate feedback',
            icon: Calendar,
            path: '#',
            color: 'text-amber-600',
            bgColor: 'bg-amber-500/10',
            gradient: 'from-amber-500/10 to-transparent',
            borderColor: 'border-amber-500/20',
            stats: { label: 'Interviews', value: '7' },
        },
        {
            title: 'Documents & KYC',
            description: 'Degrees, certifications and background verification',
            icon: ClipboardCheck,
            path: '#',
            color: 'text-purple-600',
            bgColor: 'bg-purple-500/10',
            gradient: 'from-purple-500/10 to-transparent',
            borderColor: 'border-purple-500/20',
            stats: { label: 'Pending', value: '9' },
        },
        {
            title: 'Offer Letters',
            description: 'Generate and send offer letters with digital sign',
            icon: FileText,
            path: '#',
            color: 'text-rose-600',
            bgColor: 'bg-rose-500/10',
            gradient: 'from-rose-500/10 to-transparent',
            borderColor: 'border-rose-500/20',
            stats: { label: 'Issued', value: '5' },
        },
        {
            title: 'Onboarding Status',
            description: 'Track orientation progress and resource allocation',
            icon: CheckCircle2,
            path: '#',
            color: 'text-cyan-600',
            bgColor: 'bg-cyan-500/10',
            gradient: 'from-cyan-500/10 to-transparent',
            borderColor: 'border-cyan-500/20',
            stats: { label: 'In Progress', value: '6' },
        },
    ];

    const QUICK_ACTIONS = [
        { label: 'Register Teacher', icon: UserPlus, color: 'text-emerald-600', bgColor: 'bg-emerald-500/10', path: ADMIN_ROUTES.USERS.TEACHERS.CREATE },
        { label: 'New Vacancy', icon: Briefcase, color: 'text-primary', bgColor: 'bg-primary/10', path: '#' },
        { label: 'Interview', icon: Calendar, color: 'text-amber-600', bgColor: 'bg-amber-500/10', path: '#' },
        { label: 'Job Portal', icon: Search, color: 'text-info', bgColor: 'bg-info/10', path: '#' },
        { label: 'Email Batch', icon: Mail, color: 'text-warning', bgColor: 'bg-warning/10', path: '#' },
        { label: 'Guidelines', icon: FileText, color: 'text-rose-600', bgColor: 'bg-rose-500/10', path: '#' },
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
                            className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20"
                        >
                            <Users className="w-7 h-7 text-emerald-600" />
                        </motion.div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Teacher Onboarding</h1>
                            <p className="text-sm text-muted-foreground font-medium">
                                Manage faculty recruitment and induction pipeline
                            </p>
                        </div>
                    </div>
                </div>
            </FadeIn>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <StatProgressCard
                    title="Active Vacancies"
                    value={4}
                    maxValue={10}
                    icon={Briefcase}
                    variant="primary"
                    showProgress
                />
                <StatProgressCard
                    title="Total Applicants"
                    value={156}
                    maxValue={200}
                    icon={Contact2}
                    variant="success"
                    trend={{ value: 8, label: 'new today' }}
                    showProgress
                />
                <StatProgressCard
                    title="Interviews Set"
                    value={7}
                    maxValue={12}
                    icon={Calendar}
                    variant="warning"
                    showProgress
                />
                <Card className="p-4 bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20 flex items-center justify-center">
                    <ProgressRing
                        value={92}
                        size="lg"
                        color="stroke-emerald-600"
                        label="Join Rate"
                    />
                </Card>
            </div>

            {/* Modules Grid */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] px-1">Recruitment Pipeline</h3>
                <StaggerContainer staggerDelay={0.06}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {RECRUITMENT_MODULES.map((module) => (
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
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] px-1">Onboarding Tools</h3>
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

            {/* Recent Applicants Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Contact2 size={18} className="text-emerald-600" />
                            <h3 className="font-bold">Recent Shortlisted Faculty</h3>
                        </div>
                        <Button variant="ghost" size="sm" className="text-emerald-600">View Pipeline</Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { name: 'Dr. Sarah Wilson', subject: 'Physics', experience: '8 Years', location: 'London', status: 'Ready to Join' },
                            { name: 'Robert Fox', subject: 'Mathematics', experience: '5 Years', location: 'Remote', status: 'Interviewing' },
                            { name: 'Jenny Wilson', subject: 'History', experience: '12 Years', location: 'New York', status: 'Offer Issued' },
                            { name: 'Guy Hawkins', subject: 'Chemistry', experience: '3 Years', location: 'Texas', status: 'Shortlisted' },
                        ].map((candidate, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-4 bg-muted/30 rounded-2xl hover:bg-muted transition-all border border-transparent hover:border-emerald-500/20 group cursor-pointer"
                            >
                                <div className="space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center font-bold text-emerald-600">
                                            {candidate.name.split(' ')[0][0]}{candidate.name.split(' ')[1][0]}
                                        </div>
                                        <Badge variant={candidate.status === 'Ready to Join' ? 'success' : 'outline'} size="sm">
                                            {candidate.status}
                                        </Badge>
                                    </div>
                                    <div>
                                        <p className="font-bold group-hover:text-emerald-600 transition-colors">{candidate.name}</p>
                                        <p className="text-xs text-muted-foreground font-medium">{candidate.subject} Faculty</p>
                                    </div>
                                    <div className="flex items-center gap-3 pt-1 border-t border-border/50">
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold">
                                            <Briefcase size={10} /> {candidate.experience} Exp
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold">
                                            <MapPin size={10} /> {candidate.location}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <Button variant="secondary" size="icon" className="w-8 h-8 rounded-lg"><Mail size={12} /></Button>
                                        <Button variant="secondary" size="icon" className="w-8 h-8 rounded-lg"><Phone size={12} /></Button>
                                        <Button variant="outline" size="sm" className="flex-1 text-[10px] h-8 font-bold">Details</Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card className="p-5 bg-emerald-500/5 border-emerald-500/20 space-y-4">
                        <div className="flex items-center gap-2 text-emerald-600">
                            <Zap size={18} className="fill-emerald-600" />
                            <h3 className="font-bold text-sm uppercase tracking-wide">Onboarding Checklist</h3>
                        </div>
                        <div className="space-y-3">
                            {[
                                { label: 'Collect Degree Certificates', done: true },
                                { label: 'Assign Work Email', done: true },
                                { label: 'Schedule Orientation', done: false },
                                { label: 'Allocate Workstation', done: false },
                                { label: 'Bank Details Verification', done: false },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${item.done ? 'bg-emerald-500 border-emerald-500' : 'border-emerald-500/30'}`}>
                                        {item.done && <CheckCircle2 size={10} className="text-white" />}
                                    </div>
                                    <span className={`text-xs font-medium ${item.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 rounded-xl text-white font-bold gap-2 mt-4 shadow-lg shadow-emerald-500/20">
                            <UserPlus size={18} />
                            Onboard New Faculty
                        </Button>
                    </Card>

                    <Card className="p-5 space-y-4">
                        <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Departmental Gaps</h3>
                        <div className="space-y-4">
                            {[
                                { dept: 'Science', filled: 12, total: 15, color: 'bg-emerald-500' },
                                { dept: 'Maths', filled: 8, total: 8, color: 'bg-primary' },
                                { dept: 'Arts', filled: 3, total: 5, color: 'bg-amber-500' },
                            ].map((item, i) => (
                                <div key={i} className="space-y-1.5">
                                    <div className="flex justify-between text-[11px] font-bold">
                                        <span>{item.dept}</span>
                                        <span>{item.filled}/{item.total}</span>
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(item.filled / item.total) * 100}%` }}
                                            className={`h-full ${item.color}`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
