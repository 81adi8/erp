import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookCopy, BookOpen, FileText, Target, ChevronRight, Plus, RefreshCw, BarChart3, Clock, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, Badge, Button, Skeleton } from '@erp/common';
import { useGetAcademicStatsQuery, useGetUpcomingLessonPlansQuery } from '@core/api/endpoints/academicsApi';
import { ACADEMIC_ROUTES } from '../../constants/routes';

const CURRICULUM_FEATURES = [
    { title: 'Curriculum Builder', description: 'Design and structure academic curriculum', icon: BookCopy, path: ACADEMIC_ROUTES.CURRICULUM.ROOT, color: 'text-primary', bg: 'bg-primary/10', gradient: 'from-primary/10 to-transparent', borderColor: 'border-primary/20' },
    { title: 'Lesson Plans', description: 'Create and manage lesson schedules', icon: FileText, path: ACADEMIC_ROUTES.LESSON_PLANS.ROOT, color: 'text-success', bg: 'bg-success/10', gradient: 'from-success/10 to-transparent', borderColor: 'border-success/20' },
    { title: 'Subject Library', description: 'Manage subjects and syllabus', icon: BookOpen, path: ACADEMIC_ROUTES.SUBJECTS.ROOT, color: 'text-warning', bg: 'bg-warning/10', gradient: 'from-warning/10 to-transparent', borderColor: 'border-warning/20' },
    { title: 'Learning Objectives', description: 'Define topics and learning goals', icon: Target, path: ACADEMIC_ROUTES.CURRICULUM.ROOT, color: 'text-purple-600', bg: 'bg-purple-50', gradient: 'from-purple-50 to-transparent', borderColor: 'border-purple-200' },
];

const QUICK_ACTIONS = [
    { label: 'Add Chapter', icon: Plus, path: ACADEMIC_ROUTES.CURRICULUM.ROOT },
    { label: 'Create Lesson Plan', icon: FileText, path: ACADEMIC_ROUTES.LESSON_PLANS.ROOT },
    { label: 'Add Subject', icon: BookOpen, path: ACADEMIC_ROUTES.SUBJECTS.ROOT },
    { label: 'View Reports', icon: BarChart3, path: ACADEMIC_ROUTES.CURRICULUM.ROOT },
];

export default function CurriculumDashboardPage() {
    const navigate = useNavigate();
    const { data: statsRes, isLoading: statsLoading, refetch } = useGetAcademicStatsQuery();
    const { data: upcomingPlansRes, isLoading: plansLoading } = useGetUpcomingLessonPlansQuery({ days: 7 });
    const stats = statsRes?.data;
    const upcomingPlans = upcomingPlansRes?.data || [];

    const primaryStats = [
        { label: 'Total Chapters', value: stats?.chapters || 0, icon: BookCopy, color: 'text-primary', bg: 'bg-primary/10' },
        { label: 'Total Topics', value: stats?.topics || 0, icon: Target, color: 'text-success', bg: 'bg-success/10' },
        { label: 'Lesson Plans', value: stats?.lessonPlans?.total || 0, icon: FileText, color: 'text-warning', bg: 'bg-warning/10' },
        { label: 'Active Subjects', value: stats?.subjects || 0, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50' },
    ];

    const lessonPlanStats = [
        { label: 'Planned', value: stats?.lessonPlans?.planned || 0, color: 'text-primary' },
        { label: 'In Progress', value: stats?.lessonPlans?.ongoing || 0, color: 'text-warning' },
        { label: 'Completed', value: stats?.lessonPlans?.completed || 0, color: 'text-success' },
    ];

    const completionRate = stats?.lessonPlans?.completionRate || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-100 rounded-xl"><BookCopy className="w-6 h-6 text-purple-600" /></div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Curriculum Management</h1>
                        <p className="text-sm text-muted-foreground">Design syllabus, manage lesson plans & track learning objectives</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw size={14} className="mr-1.5" />Refresh</Button>
                    <Button size="sm" onClick={() => navigate(ACADEMIC_ROUTES.CURRICULUM.ROOT)} className="bg-purple-600 hover:bg-purple-700"><Plus size={14} className="mr-1.5" />New Chapter</Button>
                </div>
            </div>

            {/* Progress Banner */}
            <Card className="p-5 bg-gradient-to-r from-purple-50 to-transparent border-purple-200">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-3">
                        <Badge className="bg-purple-600 text-white text-xs"><FileText size={10} className="mr-1" />Curriculum Progress</Badge>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Lesson Plan Completion</h2>
                            <p className="text-sm text-muted-foreground">Track your curriculum delivery progress</p>
                        </div>
                        <div className="flex gap-6">
                            {lessonPlanStats.map((stat, i) => (
                                <div key={i} className="text-center">
                                    <p className={`text-xl font-semibold ${stat.color}`}>{stat.value}</p>
                                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="relative w-24 h-24 mx-auto">
                            <svg className="w-24 h-24 -rotate-90">
                                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/30" />
                                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={`${2 * Math.PI * 40}`} strokeDashoffset={`${2 * Math.PI * 40 * (1 - completionRate / 100)}`} className="text-purple-600" strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center"><span className="text-xl font-semibold text-purple-600">{completionRate}%</span></div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Overall Progress</p>
                    </div>
                </div>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statsLoading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : primaryStats.map((stat, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -2 }}>
                        <Card className="p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                                    <p className="text-2xl font-semibold text-foreground mt-1">{stat.value.toLocaleString()}</p>
                                </div>
                                <div className={`p-2 rounded-lg ${stat.bg}`}><stat.icon size={18} className={stat.color} /></div>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Feature Cards */}
            <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Curriculum Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {CURRICULUM_FEATURES.map((feature, i) => (
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
                            <div className="flex items-center gap-2"><Clock size={16} className="text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Upcoming Lessons</h3><Badge variant="secondary" className="text-xs">Next 7 Days</Badge></div>
                            <Button variant="ghost" size="sm" onClick={() => navigate(ACADEMIC_ROUTES.LESSON_PLANS.ROOT)}>View All</Button>
                        </div>
                        <div className="space-y-2">
                            {plansLoading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />) : upcomingPlans.length > 0 ? upcomingPlans.slice(0, 6).map((plan) => (
                                <motion.div key={plan.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ x: 2 }} className="flex items-center justify-between p-3 bg-muted/30 border-l-2 border-purple-600 rounded-lg rounded-l-none hover:bg-muted/50 cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 bg-purple-50 rounded-md text-purple-600"><FileText size={14} /></div>
                                        <div><p className="text-sm font-medium text-foreground">{plan.topic?.name}</p><p className="text-xs text-muted-foreground">{plan.class?.name} • {plan.subject?.name}</p></div>
                                    </div>
                                    <div className="text-right"><p className="text-xs font-medium text-purple-600">{new Date(plan.planned_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p><Badge variant="secondary" className="text-xs mt-1">{plan.status || 'planned'}</Badge></div>
                                </motion.div>
                            )) : (<div className="py-10 text-center"><CheckCircle2 size={32} className="mx-auto text-success/50 mb-2" /><p className="text-sm font-medium text-muted-foreground">All Clear!</p><p className="text-xs text-muted-foreground">No upcoming lessons in the next 7 days.</p></div>)}
                        </div>
                    </Card>
                </div>
                <div className="space-y-6">
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
                    </Card>
                    <Card className="p-3 bg-purple-50 border-purple-200">
                        <div className="flex items-start gap-2"><AlertCircle size={14} className="text-purple-600 mt-0.5" /><div><p className="text-xs font-medium text-foreground">Pro Tip</p><p className="text-xs text-muted-foreground mt-0.5">Structure your curriculum with chapters and topics first, then create lesson plans for systematic tracking.</p></div></div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
