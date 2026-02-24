// ============================================================================
// Staff Admissions Page - Dashboard for non-teaching staff intake & management
// ============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Briefcase,
    UserPlus,
    IdCard,
    FileText,
    ShieldCheck,
    ArrowLeft,
    Users,
    HardHat,
    Hammer,
    Truck,
    Coffee,
    Search,
    Download,
    CheckCircle2,
    Clock,
    Zap,
    Building2
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

export default function StaffAdmissionsPage() {
    const navigate = useNavigate();

    const STAFF_MODULES = [
        {
            title: 'Staff Intake',
            description: 'Register and onboard new support or administrative staff',
            icon: UserPlus,
            path: ADMIN_ROUTES.USERS.STAFF.CREATE,
            color: 'text-purple-600',
            bgColor: 'bg-purple-500/10',
            gradient: 'from-purple-500/10 to-transparent',
            borderColor: 'border-purple-500/20',
            stats: { label: 'New This Month', value: '+8' },
        },
        {
            title: 'Role Allocation',
            description: 'Manage staff roles, shifts and department assignments',
            icon: Building2,
            path: '#',
            color: 'text-primary',
            bgColor: 'bg-primary/10',
            gradient: 'from-primary/10 to-transparent',
            borderColor: 'border-primary/20',
            stats: { label: 'Total Staff', value: '42' },
        },
        {
            title: 'ID & Asset Prep',
            description: 'Generate ID cards and track uniform/asset issuance',
            icon: IdCard,
            path: '#',
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-500/10',
            gradient: 'from-emerald-500/10 to-transparent',
            borderColor: 'border-emerald-500/20',
            stats: { label: 'IDs Pending', value: '5' },
        },
        {
            title: 'Document Center',
            description: 'Contracts, background checks and medical clearance',
            icon: ShieldCheck,
            path: '#',
            color: 'text-amber-600',
            bgColor: 'bg-amber-500/10',
            gradient: 'from-amber-500/10 to-transparent',
            borderColor: 'border-amber-500/20',
            stats: { label: 'Verification', value: '12' },
        },
        {
            title: 'Contract Mgmt',
            description: 'Handle outsourced or fixed-term staff agreements',
            icon: FileText,
            path: '#',
            color: 'text-rose-600',
            bgColor: 'bg-rose-500/10',
            gradient: 'from-rose-500/10 to-transparent',
            borderColor: 'border-rose-500/20',
            stats: { label: 'Expiring', value: '3' },
        },
        {
            title: 'Staff Directory',
            description: 'Searchable employee records and department charts',
            icon: Users,
            path: '#',
            color: 'text-cyan-600',
            bgColor: 'bg-cyan-500/10',
            gradient: 'from-cyan-500/10 to-transparent',
            borderColor: 'border-cyan-500/20',
            stats: { label: 'Departments', value: '6' },
        },
    ];

    const QUICK_ACTIONS = [
        { label: 'Register Staff', icon: UserPlus, color: 'text-purple-600', bgColor: 'bg-purple-500/10', path: ADMIN_ROUTES.USERS.STAFF.CREATE },
        { label: 'Asset Issues', icon: Hammer, color: 'text-primary', bgColor: 'bg-primary/10', path: '#' },
        { label: 'Print IDs', icon: IdCard, color: 'text-warning', bgColor: 'bg-warning/10', path: '#' },
        { label: 'Job Search', icon: Search, color: 'text-info', bgColor: 'bg-info/10', path: '#' },
        { label: 'Regulations', icon: ShieldCheck, color: 'text-emerald-600', bgColor: 'bg-emerald-500/10', path: '#' },
        { label: 'Contracts', icon: FileText, color: 'text-rose-600', bgColor: 'bg-rose-500/10', path: '#' },
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
                            initial={{ scale: 0, scaleY: 0.5 }}
                            animate={{ scale: 1, scaleY: 1 }}
                            className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20 shadow-sm"
                        >
                            <Briefcase className="w-7 h-7 text-purple-600" />
                        </motion.div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Staff Onboarding</h1>
                            <p className="text-sm text-muted-foreground font-medium">
                                Intake lifecycle for administrative and support personnel
                            </p>
                        </div>
                    </div>
                </div>
            </FadeIn>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <StatProgressCard
                    title="Active Staff"
                    value={42}
                    maxValue={50}
                    icon={Users}
                    variant="primary"
                    showProgress
                />
                <StatProgressCard
                    title="New Joinees"
                    value={8}
                    maxValue={15}
                    icon={UserPlus}
                    variant="success"
                    trend={{ value: 2, label: 'this week' }}
                    showProgress
                />
                <StatProgressCard
                    title="IDs Pending"
                    value={5}
                    maxValue={10}
                    icon={IdCard}
                    variant="warning"
                    showProgress
                />
                <Card className="p-4 bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/20 flex items-center justify-center">
                    <ProgressRing
                        value={88}
                        size="lg"
                        color="stroke-purple-600"
                        label="Success"
                    />
                </Card>
            </div>

            {/* Modules Grid */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] px-1">Intake Workflows</h3>
                <StaggerContainer staggerDelay={0.06}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {STAFF_MODULES.map((module) => (
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
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] px-1">Staff Access Tools</h3>
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

            {/* Department Split & Pipeline */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Building2 size={18} className="text-purple-600" />
                            <h3 className="font-bold">Staff Onboarding by Department</h3>
                        </div>
                        <Badge variant="outline">2024-25 Intake</Badge>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { name: 'Admin', count: 12, icon: Building2, color: 'text-primary' },
                            { name: 'Security', count: 8, icon: ShieldCheck, color: 'text-rose-500' },
                            { name: 'Transport', count: 10, icon: Truck, color: 'text-amber-600' },
                            { name: 'Maintenance', count: 6, icon: HardHat, color: 'text-purple-600' },
                        ].map((dept, i) => (
                            <motion.div
                                key={i}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-4 bg-muted/30 rounded-2xl border border-transparent hover:border-purple-500/20 text-center space-y-2 hover:bg-muted transition-all cursor-pointer group"
                            >
                                <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-background shadow-sm group-hover:shadow-md transition-shadow ${dept.color}`}>
                                    <dept.icon size={24} />
                                </div>
                                <p className="font-bold text-xl">{dept.count}</p>
                                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{dept.name}</p>
                            </motion.div>
                        ))}
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/50">
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-purple-600" />
                            <h4 className="font-bold text-sm">Recent Intake Steps</h4>
                        </div>
                        <div className="space-y-3">
                            {[
                                { user: 'Rajesh Kumar', info: 'Transport (Bus Driver)', status: 'Contract Signed', time: '1 hour ago' },
                                { user: 'Sumit Singh', info: 'Security (Guard)', status: 'Documents Verified', time: '4 hours ago' },
                                { user: 'Priya Verma', info: 'Admin (Receptionist)', status: 'Asset Issued', time: 'Yesterday' },
                            ].map((step, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center font-bold text-xs text-purple-600">
                                            {step.user[0]}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold">{step.user}</p>
                                            <p className="text-[10px] text-muted-foreground">{step.info}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{step.status}</Badge>
                                        <p className="text-[9px] text-muted-foreground mt-1 uppercase font-bold tracking-tighter">{step.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card className="p-5 bg-purple-500/5 border-purple-500/20 space-y-4">
                        <div className="flex items-center gap-2 text-purple-600">
                            <Zap size={18} className="fill-purple-600" />
                            <h3 className="font-bold text-sm uppercase tracking-wide">Intake Alerts</h3>
                        </div>
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-1">
                                <Clock size={10} /> Urgency: Medium
                            </p>
                            <p className="text-xs text-foreground font-medium italic leading-relaxed">
                                "3 bus driver contracts are expiring in the next 15 days. Initiate renewal or new hiring process immediately."
                            </p>
                        </div>
                        <Button className="w-full bg-purple-600 hover:bg-purple-700 h-14 rounded-2xl text-white font-bold gap-2 mt-2 shadow-lg shadow-purple-500/20">
                            <UserPlus size={18} />
                            Start New Staff Intake
                        </Button>
                    </Card>

                    <Card className="p-5 space-y-4">
                        <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Coffee size={14} /> Staff Satisfaction
                        </h3>
                        <div className="flex items-center justify-center py-4">
                            <ProgressRing
                                value={76}
                                size="lg"
                                color="stroke-purple-600"
                                label="Retention"
                            />
                        </div>
                        <p className="text-[10px] text-center text-muted-foreground font-medium px-4">
                            Retention rate has increased by <strong>4.2%</strong> since last quarter due to improved onboarding.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
}
