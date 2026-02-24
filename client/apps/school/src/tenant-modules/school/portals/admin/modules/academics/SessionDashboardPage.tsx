import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    CalendarDays, Calendar, CheckCircle2, Clock, Lock, Plus, RefreshCw,
    ChevronRight, Settings2, ArrowRight, Zap, History, AlertCircle
} from 'lucide-react';
import { Card, Badge, Button, Skeleton } from '@erp/common';
import { useGetAcademicSessionsQuery, useGetCurrentAcademicSessionQuery, useGetSessionLockStatusQuery } from '@core/api/endpoints/academicsApi';
import { ACADEMIC_ROUTES } from '../../constants/routes';

const SESSION_FEATURES = [
    { title: 'Session Overview', description: 'View and manage all academic sessions', icon: CalendarDays, path: ACADEMIC_ROUTES.SESSIONS.ROOT, color: 'text-primary', bg: 'bg-primary/10', gradient: 'from-primary/10 to-transparent', borderColor: 'border-primary/20' },
    { title: 'Session Promotion', description: 'Bulk promote students to next session', icon: ArrowRight, path: ACADEMIC_ROUTES.SESSIONS.PROMOTION, color: 'text-success', bg: 'bg-success/10', gradient: 'from-success/10 to-transparent', borderColor: 'border-success/20' },
    { title: 'Session Locking', description: 'Lock/unlock session data access', icon: Lock, path: ACADEMIC_ROUTES.SESSIONS.ROOT, color: 'text-warning', bg: 'bg-warning/10', gradient: 'from-warning/10 to-transparent', borderColor: 'border-warning/20' },
    { title: 'Session Settings', description: 'Configure session policies & rules', icon: Settings2, path: ACADEMIC_ROUTES.SESSIONS.ROOT, color: 'text-purple-600', bg: 'bg-purple-50', gradient: 'from-purple-50 to-transparent', borderColor: 'border-purple-200' },
];

const QUICK_ACTIONS = [
    { label: 'Create Session', icon: Plus, path: ACADEMIC_ROUTES.SESSIONS.ROOT },
    { label: 'Lock Session', icon: Lock, path: ACADEMIC_ROUTES.SESSIONS.ROOT },
    { label: 'Promote Students', icon: ArrowRight, path: ACADEMIC_ROUTES.SESSIONS.PROMOTION },
    { label: 'View History', icon: History, path: ACADEMIC_ROUTES.SESSIONS.ROOT },
];

export default function SessionDashboardPage() {
    const navigate = useNavigate();
    const { data: sessionsRes, isLoading: loading, refetch } = useGetAcademicSessionsQuery({ page: 1, limit: 50 });
    const { data: currentSessionRes } = useGetCurrentAcademicSessionQuery();
    const { data: lockStatusRes } = useGetSessionLockStatusQuery(currentSessionRes?.data?.id || '', { skip: !currentSessionRes?.data?.id });

    const sessions = sessionsRes?.data || [];
    const currentSession = currentSessionRes?.data;
    const lockStatus = lockStatusRes?.data;

    const sessionStats = {
        total: sessions.length,
        active: sessions.filter((s) => s.status === 'active').length,
        draft: sessions.filter((s) => s.status === 'draft').length,
        locked: sessions.filter((s) => s.is_locked).length,
    };

    const calculateProgress = () => {
        if (!currentSession) return { percent: 0, daysRemaining: 0 };
        const start = new Date(currentSession.start_date);
        const end = new Date(currentSession.end_date);
        const now = new Date();
        const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return { percent: Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100))), daysRemaining: Math.max(0, totalDays - elapsed) };
    };

    const progress = calculateProgress();

    const primaryStats = [
        { label: 'Total Sessions', value: sessionStats.total, icon: CalendarDays, color: 'text-primary', bg: 'bg-primary/10' },
        { label: 'Active Sessions', value: sessionStats.active, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
        { label: 'Draft Sessions', value: sessionStats.draft, icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
        { label: 'Locked Sessions', value: sessionStats.locked, icon: Lock, color: 'text-destructive', bg: 'bg-destructive/10' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl"><CalendarDays className="w-6 h-6 text-primary" /></div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Session Management</h1>
                        <p className="text-sm text-muted-foreground">Manage academic lifecycles, promotions & session policies</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw size={14} className="mr-1.5" />Refresh</Button>
                    <Button size="sm" onClick={() => navigate(ACADEMIC_ROUTES.SESSIONS.ROOT)}><Plus size={14} className="mr-1.5" />New Session</Button>
                </div>
            </div>

            {/* Current Session Banner */}
            {currentSession && (
                <Card className="p-5 bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Badge variant="default" className="text-xs"><Zap size={10} className="mr-1" />Current Session</Badge>
                                {lockStatus?.is_locked && <Badge variant="destructive" className="text-xs"><Lock size={10} className="mr-1" />Locked</Badge>}
                            </div>
                            <h2 className="text-lg font-semibold text-foreground">{currentSession.name}</h2>
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                                <Calendar size={12} />{new Date(currentSession.start_date).toLocaleDateString()} → {new Date(currentSession.end_date).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-center"><p className="text-2xl font-semibold text-primary">{progress.daysRemaining}</p><p className="text-xs text-muted-foreground">Days Left</p></div>
                            <div className="w-24">
                                <p className="text-xs text-muted-foreground mb-1">Progress</p>
                                <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress.percent}%` }} /></div>
                                <p className="text-xs font-medium mt-1">{progress.percent}%</p>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {loading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : primaryStats.map((stat, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -2 }}>
                        <Card className="p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                                    <p className="text-2xl font-semibold text-foreground mt-1">{stat.value}</p>
                                </div>
                                <div className={`p-2 rounded-lg ${stat.bg}`}><stat.icon size={18} className={stat.color} /></div>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Feature Cards */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Session Features</h3>
                    <Button variant="ghost" size="sm" onClick={() => navigate(ACADEMIC_ROUTES.SESSIONS.ROOT)}>View All <ChevronRight size={14} className="ml-1" /></Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {SESSION_FEATURES.map((feature, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -2 }}>
                            <Card className={`p-4 cursor-pointer hover:shadow-md transition-all bg-gradient-to-br ${feature.gradient} border ${feature.borderColor}`} onClick={() => navigate(feature.path)}>
                                <div className={`w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center mb-3`}><feature.icon size={20} className={feature.color} /></div>
                                <h4 className="text-sm font-semibold text-foreground">{feature.title}</h4>
                                <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                                <p className="text-xs text-muted-foreground mt-3 flex items-center">Open <ChevronRight size={12} className="ml-1" /></p>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card className="p-5 h-full">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2"><History size={16} className="text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Recent Sessions</h3></div>
                            <Button variant="ghost" size="sm" onClick={() => navigate(ACADEMIC_ROUTES.SESSIONS.ROOT)}>View All</Button>
                        </div>
                        <div className="space-y-2">
                            {loading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />) : sessions.length > 0 ? sessions.slice(0, 5).map((session) => (
                                <motion.div key={session.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ x: 2 }} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(ACADEMIC_ROUTES.SESSIONS.ROOT)}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-md ${session.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}><CalendarDays size={14} /></div>
                                        <div><p className="text-sm font-medium text-foreground">{session.name}</p><p className="text-xs text-muted-foreground">{new Date(session.start_date).toLocaleDateString()} - {new Date(session.end_date).toLocaleDateString()}</p></div>
                                    </div>
                                    {session.status === 'active' && <Badge variant="success" className="text-xs">Active</Badge>}
                                </motion.div>
                            )) : (<div className="py-8 text-center"><CalendarDays size={32} className="mx-auto text-muted-foreground/30 mb-2" /><p className="text-sm text-muted-foreground">No sessions found</p></div>)}
                        </div>
                    </Card>
                </div>
                <Card className="p-5">
                    <div className="flex items-center gap-2 mb-4"><Zap size={16} className="text-warning" /><h3 className="text-sm font-semibold text-foreground">Quick Actions</h3></div>
                    <div className="space-y-2">
                        {QUICK_ACTIONS.map((action, i) => (
                            <motion.button key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} whileHover={{ x: 2 }} onClick={() => navigate(action.path)} className="w-full flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors text-left">
                                <div className="p-1.5 bg-background rounded-md border"><action.icon size={14} className="text-muted-foreground" /></div>
                                <span className="text-sm font-medium text-foreground">{action.label}</span>
                                <ChevronRight size={14} className="ml-auto text-muted-foreground" />
                            </motion.button>
                        ))}
                    </div>
                    <Card className="p-3 mt-4 bg-primary/5 border-primary/20">
                        <div className="flex items-start gap-2"><AlertCircle size={14} className="text-primary mt-0.5" /><div><p className="text-xs font-medium text-foreground">Pro Tip</p><p className="text-xs text-muted-foreground mt-0.5">Lock sessions before running promotion to prevent data modifications.</p></div></div>
                    </Card>
                </Card>
            </div>
        </div>
    );
}
