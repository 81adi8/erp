import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    School, Calendar, CheckCircle2, Clock, TrendingUp, GraduationCap, Users, ChevronRight, Plus, BookOpen, Layers,
    FileText, ArrowRight, BarChart3, CalendarDays, BookCopy, Timer, AlertCircle, Zap, ArrowUpRight
} from 'lucide-react';
import { Card, Badge, Button, Skeleton } from '@erp/common';
import { useGetAcademicStatsQuery, useGetUpcomingLessonPlansQuery, useGetCurrentAcademicSessionQuery } from '@core/api/endpoints/academicsApi';
import { ACADEMIC_ROUTES } from '../../constants/routes';

const MODULE_DASHBOARDS = [
    { title: 'Session Management', description: 'Manage academic sessions, promotions & lifecycle policies', icon: CalendarDays, path: ACADEMIC_ROUTES.DASHBOARD.SESSIONS, color: 'text-primary', bg: 'bg-primary/10', gradient: 'from-primary/10 to-transparent', borderColor: 'border-primary/20' },
    { title: 'Class Management', description: 'Organize grades, sections & subject mappings', icon: School, path: ACADEMIC_ROUTES.DASHBOARD.CLASSES, color: 'text-success', bg: 'bg-success/10', gradient: 'from-success/10 to-transparent', borderColor: 'border-success/20' },
    { title: 'Subject Intelligence', description: 'Manage registry, faculty mapping & evaluations', icon: BookOpen, path: ACADEMIC_ROUTES.DASHBOARD.SUBJECTS, color: 'text-warning', bg: 'bg-warning/10', gradient: 'from-warning/10 to-transparent', borderColor: 'border-warning/20' },
    { title: 'Curriculum & Lesson Plans', description: 'Design syllabus, chapters & track delivery progress', icon: BookCopy, path: ACADEMIC_ROUTES.DASHBOARD.CURRICULUM, color: 'text-purple-600', bg: 'bg-purple-50', gradient: 'from-purple-50 to-transparent', borderColor: 'border-purple-200' },
    { title: 'Timetable Management', description: 'Schedule periods, allocate teachers & manage loads', icon: Clock, path: ACADEMIC_ROUTES.DASHBOARD.TIMETABLE, color: 'text-cyan-600', bg: 'bg-cyan-50', gradient: 'from-cyan-50 to-transparent', borderColor: 'border-cyan-200' },
];

const QUICK_LINKS = [
    { label: 'Sessions', icon: CalendarDays, path: ACADEMIC_ROUTES.SESSIONS.ROOT, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Classes', icon: School, path: ACADEMIC_ROUTES.CLASSES.ROOT, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Subjects', icon: BookOpen, path: ACADEMIC_ROUTES.SUBJECTS.ROOT, color: 'text-accent-foreground', bg: 'bg-accent' },
    { label: 'Sections', icon: Layers, path: ACADEMIC_ROUTES.SECTIONS.ROOT, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Curriculum', icon: BookCopy, path: ACADEMIC_ROUTES.CURRICULUM.ROOT, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Lesson Plans', icon: FileText, path: ACADEMIC_ROUTES.LESSON_PLANS.ROOT, color: 'text-pink-600', bg: 'bg-pink-50' },
    { label: 'Timetable', icon: Clock, path: ACADEMIC_ROUTES.TIMETABLE.ROOT, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Promotion', icon: ArrowRight, path: ACADEMIC_ROUTES.SESSIONS.PROMOTION, color: 'text-orange-600', bg: 'bg-orange-50' },
];

export default function AcademicDashboardPage() {
    const navigate = useNavigate();
    const { data: statsRes, isLoading: statsLoading } = useGetAcademicStatsQuery();
    const { data: upcomingPlansRes, isLoading: plansLoading } = useGetUpcomingLessonPlansQuery({ days: 7 });
    const { data: sessionRes } = useGetCurrentAcademicSessionQuery();
    const stats = statsRes?.data;
    const currentSession = stats?.currentSession || sessionRes?.data;
    const upcomingPlans = upcomingPlansRes?.data || [];

    const calculateProgress = () => {
        if (!currentSession) return { percent: 0, daysRemaining: 0 };
        const start = new Date('startDate' in currentSession ? currentSession.startDate : currentSession.start_date);
        const end = new Date('endDate' in currentSession ? currentSession.endDate : currentSession.end_date);
        const now = new Date();
        const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const elapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return { percent: Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100))), daysRemaining: Math.max(0, totalDays - elapsed) };
    };

    const progress = calculateProgress();

    const primaryStats = [
        { label: 'Total Classes', value: stats?.classes || 0, icon: School, color: 'text-primary', bg: 'bg-primary/10', change: '+2 this month' },
        { label: 'Total Sections', value: stats?.sections || 0, icon: Layers, color: 'text-success', bg: 'bg-success/10', change: '+5 this month' },
        { label: 'Active Subjects', value: stats?.subjects || 0, icon: BookOpen, color: 'text-accent-foreground', bg: 'bg-accent', change: '+1 this month' },
        { label: 'Enrolled Students', value: stats?.totalEnrollments || 0, icon: Users, color: 'text-warning', bg: 'bg-warning/10', change: '+24 this month' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl"><GraduationCap className="w-6 h-6 text-primary" /></div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Academic Dashboard</h1>
                        <p className="text-sm text-muted-foreground">Real-time academic metrics and operational insights</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(ACADEMIC_ROUTES.SESSIONS.PROMOTION)}><ArrowRight size={14} className="mr-1.5" />Session Promotion</Button>
                    <Button size="sm" onClick={() => navigate(ACADEMIC_ROUTES.CLASSES.ROOT)}><Plus size={14} className="mr-1.5" />Add Class</Button>
                </div>
            </div>

            {/* Current Session Banner */}
            {currentSession && (
                <Card className="p-5 bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <Badge variant="default" className="text-xs"><Zap size={10} className="mr-1" />Active Session</Badge>
                            <h2 className="text-lg font-semibold text-foreground">{currentSession.name}</h2>
                            <p className="text-xs text-muted-foreground flex items-center gap-2">
                                <Calendar size={12} />
                                {new Date('startDate' in currentSession ? currentSession.startDate : currentSession.start_date).toLocaleDateString()} → {new Date('endDate' in currentSession ? currentSession.endDate : currentSession.end_date).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-center"><p className="text-2xl font-semibold text-primary">{progress.daysRemaining}</p><p className="text-xs text-muted-foreground">Days Left</p></div>
                            <div className="w-28">
                                <p className="text-xs text-muted-foreground mb-1">Session Progress</p>
                                <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress.percent}%` }} /></div>
                                <p className="text-xs font-medium mt-1">{progress.percent}%</p>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Primary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statsLoading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : primaryStats.map((stat, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -2 }}>
                        <Card className="p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                                    <p className="text-2xl font-semibold text-foreground mt-1">{stat.value.toLocaleString()}</p>
                                    <p className="text-xs text-success flex items-center mt-1"><TrendingUp size={10} className="mr-0.5" />{stat.change}</p>
                                </div>
                                <div className={`p-2 rounded-lg ${stat.bg}`}><stat.icon size={18} className={stat.color} /></div>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Module Dashboards */}
            <div>
                <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-medium text-muted-foreground">Module Dashboards</h3><Badge variant="outline" className="text-xs">4 Modules</Badge></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {MODULE_DASHBOARDS.map((module, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -2, scale: 1.01 }}>
                            <Card className={`p-4 cursor-pointer hover:shadow-md transition-all bg-gradient-to-br ${module.gradient} border ${module.borderColor}`} onClick={() => navigate(module.path)}>
                                <div className={`w-10 h-10 rounded-lg ${module.bg} flex items-center justify-center mb-3`}><module.icon size={20} className={module.color} /></div>
                                <h4 className="text-sm font-semibold text-foreground">{module.title}</h4>
                                <p className="text-xs text-muted-foreground mt-1">{module.description}</p>
                                <p className="text-xs text-muted-foreground mt-3 flex items-center justify-between">
                                    <span className="flex items-center">Open Dashboard <ChevronRight size={12} className="ml-1" /></span>
                                    <ArrowUpRight size={12} />
                                </p>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Lesson Plan Analytics & Curriculum */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card className="p-5 space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><FileText size={16} className="text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Lesson Plan Analytics</h3></div>
                            <Button variant="ghost" size="sm" onClick={() => navigate(ACADEMIC_ROUTES.LESSON_PLANS.ROOT)}>View All</Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="p-3 bg-muted/30 rounded-lg text-center"><p className="text-xl font-semibold">{stats?.lessonPlans?.total || 0}</p><p className="text-xs text-muted-foreground mt-1">Total Plans</p></div>
                            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-center"><p className="text-xl font-semibold text-primary">{stats?.lessonPlans?.planned || 0}</p><p className="text-xs text-muted-foreground mt-1">Scheduled</p></div>
                            <div className="p-3 bg-warning/5 rounded-lg border border-warning/20 text-center"><p className="text-xl font-semibold text-warning">{stats?.lessonPlans?.ongoing || 0}</p><p className="text-xs text-muted-foreground mt-1">In Progress</p></div>
                            <div className="p-3 bg-success/5 rounded-lg border border-success/20 text-center"><p className="text-xl font-semibold text-success">{stats?.lessonPlans?.completed || 0}</p><p className="text-xs text-muted-foreground mt-1">Delivered</p></div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Curriculum Completion</span><span>{stats?.lessonPlans?.completionRate || 0}%</span></div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-success to-primary rounded-full transition-all" style={{ width: `${stats?.lessonPlans?.completionRate || 0}%` }} /></div>
                        </div>
                    </Card>
                </div>
                <Card className="p-5 space-y-4">
                    <div className="flex items-center gap-2"><BarChart3 size={16} className="text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Curriculum Overview</h3></div>
                    <div className="space-y-3">
                        {[{ label: 'Chapters', value: stats?.chapters || 0, icon: BookCopy }, { label: 'Topics', value: stats?.topics || 0, icon: Timer }, { label: 'Class Mappings', value: stats?.classSubjectMappings || 0, icon: Layers }].map((item, i) => (
                            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ x: 2 }} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-2"><div className="p-1.5 bg-background rounded-md border"><item.icon size={14} className="text-muted-foreground" /></div><span className="text-sm font-medium">{item.label}</span></div>
                                <span className="text-lg font-semibold">{item.value}</span>
                            </motion.div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Upcoming Lessons & Class Enrollment */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-5 space-y-4">
                    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Timer size={16} className="text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Upcoming Lessons</h3></div><Badge variant="outline" className="text-xs">Next 7 Days</Badge></div>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto">
                        {plansLoading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />) : upcomingPlans.length > 0 ? upcomingPlans.map((plan) => (
                            <motion.div key={plan.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ x: 2 }} className="p-3 bg-muted/30 border-l-2 border-primary rounded-lg rounded-l-none hover:bg-muted/50 cursor-pointer">
                                <div className="flex items-center justify-between">
                                    <div><p className="text-sm font-medium text-foreground">{plan.topic?.name}</p><p className="text-xs text-muted-foreground">{plan.class?.name} • {plan.subject?.name}</p></div>
                                    <p className="text-xs font-medium text-primary">{new Date(plan.planned_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                </div>
                            </motion.div>
                        )) : (<div className="py-8 text-center"><CheckCircle2 size={32} className="mx-auto text-success/50 mb-2" /><p className="text-sm text-muted-foreground">All Clear! No upcoming lessons.</p></div>)}
                    </div>
                </Card>
                <Card className="p-5 space-y-4">
                    <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Users size={16} className="text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Class Enrollment</h3></div><Button variant="ghost" size="sm" onClick={() => navigate(ACADEMIC_ROUTES.CLASSES.ROOT)}>Manage</Button></div>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto">
                        {statsLoading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />) : (stats?.classWiseEnrollment || []).length > 0 ? stats?.classWiseEnrollment?.map((cls) => (
                            <motion.div key={cls.classId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ x: 2 }} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => navigate(ACADEMIC_ROUTES.CLASSES.SUBJECTS(cls.classId))}>
                                <div className="flex items-center gap-2"><div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-xs font-semibold">{cls.className?.slice(0, 2).toUpperCase()}</div><div><p className="text-sm font-medium">{cls.className}</p><p className="text-xs text-muted-foreground">{cls.sectionCount} Sections</p></div></div>
                                <div className="text-right"><p className="text-lg font-semibold">{cls.studentCount}</p><p className="text-xs text-muted-foreground">Students</p></div>
                            </motion.div>
                        )) : (<div className="py-8 text-center"><AlertCircle size={32} className="mx-auto text-muted-foreground/50 mb-2" /><p className="text-sm text-muted-foreground">No class data available.</p></div>)}
                    </div>
                </Card>
            </div>

            {/* Quick Access */}
            <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Access</h3>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {QUICK_LINKS.map((link, i) => (
                        <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} whileHover={{ y: -2 }} onClick={() => navigate(link.path)} className="p-3 bg-surface border rounded-xl flex flex-col items-center gap-2 hover:shadow-sm hover:border-primary/20 transition-all">
                            <div className={`w-9 h-9 rounded-lg ${link.bg} flex items-center justify-center`}><link.icon size={18} className={link.color} /></div>
                            <span className="text-xs font-medium text-foreground">{link.label}</span>
                        </motion.button>
                    ))}
                </div>
            </div>
        </div>
    );
}
