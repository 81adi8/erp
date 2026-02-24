import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Clock, Calendar, Timer, Users, ChevronRight, Plus, RefreshCw, Grid3X3, Zap, AlertCircle, Layout, Layers, School, CheckCircle2 } from 'lucide-react';
import { Card, Badge, Button, Skeleton } from '@erp/common';
import { useGetAcademicStatsQuery, useGetClassesQuery } from '@core/api/endpoints/academicsApi';
import { ACADEMIC_ROUTES } from '../../constants/routes';

const TIMETABLE_FEATURES = [
    { title: 'Timetable Grid', description: 'View and manage weekly schedules', icon: Grid3X3, path: ACADEMIC_ROUTES.TIMETABLE.ROOT, color: 'text-primary', bg: 'bg-primary/10', gradient: 'from-primary/10 to-transparent', borderColor: 'border-primary/20' },
    { title: 'Period Settings', description: 'Configure periods and time slots', icon: Timer, path: ACADEMIC_ROUTES.TIMETABLE.ROOT, color: 'text-success', bg: 'bg-success/10', gradient: 'from-success/10 to-transparent', borderColor: 'border-success/20' },
    { title: 'Teacher Schedule', description: 'View teacher-wise timetables', icon: Users, path: ACADEMIC_ROUTES.TIMETABLE.ROOT, color: 'text-warning', bg: 'bg-warning/10', gradient: 'from-warning/10 to-transparent', borderColor: 'border-warning/20' },
    { title: 'Template Builder', description: 'Create reusable timetable templates', icon: Layout, path: ACADEMIC_ROUTES.TIMETABLE.ROOT, color: 'text-cyan-600', bg: 'bg-cyan-50', gradient: 'from-cyan-50 to-transparent', borderColor: 'border-cyan-200' },
];

const QUICK_ACTIONS = [
    { label: 'Generate Timetable', icon: Zap, path: ACADEMIC_ROUTES.TIMETABLE.ROOT },
    { label: 'Configure Periods', icon: Timer, path: ACADEMIC_ROUTES.TIMETABLE.ROOT },
    { label: 'Assign Teachers', icon: Users, path: ACADEMIC_ROUTES.TIMETABLE.ROOT },
    { label: 'View Conflicts', icon: AlertCircle, path: ACADEMIC_ROUTES.TIMETABLE.ROOT },
];

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const todaySchedule = [
    { time: '08:00 - 08:45', subject: 'Mathematics', class: 'Grade 10-A', teacher: 'Mr. Sharma' },
    { time: '08:45 - 09:30', subject: 'Physics', class: 'Grade 10-A', teacher: 'Mrs. Gupta' },
    { time: '09:45 - 10:30', subject: 'English', class: 'Grade 10-B', teacher: 'Mr. Singh' },
    { time: '10:30 - 11:15', subject: 'Chemistry', class: 'Grade 10-A', teacher: 'Dr. Das' },
];

export default function TimetableDashboardPage() {
    const navigate = useNavigate();
    const { data: statsRes, isLoading: statsLoading, refetch } = useGetAcademicStatsQuery();
    const { data: classesRes, isLoading: classesLoading } = useGetClassesQuery({ page: 1, limit: 10 });
    const stats = statsRes?.data;
    const classes = classesRes?.data || [];

    const primaryStats = [
        { label: 'Total Classes', value: stats?.classes || 0, icon: School, color: 'text-primary', bg: 'bg-primary/10' },
        { label: 'Total Sections', value: stats?.sections || 0, icon: Layers, color: 'text-success', bg: 'bg-success/10' },
        { label: 'Class Mappings', value: stats?.classSubjectMappings || 0, icon: Grid3X3, color: 'text-warning', bg: 'bg-warning/10' },
        { label: 'Active Subjects', value: stats?.subjects || 0, icon: Layout, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-cyan-100 rounded-xl"><Clock className="w-6 h-6 text-cyan-600" /></div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Timetable Management</h1>
                        <p className="text-sm text-muted-foreground">Schedule periods, manage allocations & track teaching loads</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw size={14} className="mr-1.5" />Refresh</Button>
                    <Button size="sm" onClick={() => navigate(ACADEMIC_ROUTES.TIMETABLE.ROOT)} className="bg-cyan-600 hover:bg-cyan-700"><Plus size={14} className="mr-1.5" />Generate Timetable</Button>
                </div>
            </div>

            {/* Today's Schedule Banner */}
            <Card className="p-5 bg-gradient-to-r from-cyan-50 to-transparent border-cyan-200">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <Badge className="bg-cyan-600 text-white text-xs"><Calendar size={10} className="mr-1" />{new Date().toLocaleDateString(undefined, { weekday: 'long' })}</Badge>
                        <h2 className="text-lg font-semibold text-foreground">Today's Schedule Overview</h2>
                        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <div className="flex gap-2">
                        {DAYS_OF_WEEK.map((day, i) => {
                            const isToday = new Date().getDay() === i + 1;
                            return (
                                <div key={day} className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${isToday ? 'bg-cyan-600 text-white' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}>{day}</div>
                            );
                        })}
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
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Timetable Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {TIMETABLE_FEATURES.map((feature, i) => (
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
                            <div className="flex items-center gap-2"><Timer size={16} className="text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Today's Periods</h3></div>
                            <Button variant="ghost" size="sm" onClick={() => navigate(ACADEMIC_ROUTES.TIMETABLE.ROOT)}>Full Schedule</Button>
                        </div>
                        <div className="space-y-2">
                            {todaySchedule.map((period, i) => (
                                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} whileHover={{ x: 2 }} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="w-24 text-center"><p className="text-xs text-muted-foreground">{period.time}</p></div>
                                        <div className="h-8 w-px bg-border" />
                                        <div><p className="text-sm font-medium text-foreground">{period.subject}</p><p className="text-xs text-muted-foreground">{period.class} • {period.teacher}</p></div>
                                    </div>
                                    <Badge variant="success" className="text-xs"><CheckCircle2 size={10} className="mr-1" />Active</Badge>
                                </motion.div>
                            ))}
                        </div>
                        <div className="mt-5 pt-5 border-t border-border">
                            <h4 className="text-xs font-medium text-muted-foreground mb-3">Quick Class Access</h4>
                            <div className="flex flex-wrap gap-2">
                                {classesLoading ? <Skeleton className="h-8 w-24" /> : classes.slice(0, 8).map((cls) => (
                                    <motion.button key={cls.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => navigate(ACADEMIC_ROUTES.TIMETABLE.ROOT)} className="px-3 py-1.5 bg-muted/50 border rounded-md text-xs font-medium text-muted-foreground hover:bg-cyan-50 hover:text-cyan-600 hover:border-cyan-200 transition-all">{cls.name}</motion.button>
                                ))}
                            </div>
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
                    <Card className="p-3 bg-cyan-50 border-cyan-200">
                        <div className="flex items-start gap-2"><AlertCircle size={14} className="text-cyan-600 mt-0.5" /><div><p className="text-xs font-medium text-foreground">Pro Tip</p><p className="text-xs text-muted-foreground mt-0.5">Ensure all class-subject mappings are complete before generating timetables.</p></div></div>
                    </Card>
                    <Card className="p-3 bg-success/5 border-success/20">
                        <div className="flex items-start gap-2"><CheckCircle2 size={14} className="text-success mt-0.5" /><div><p className="text-xs font-medium text-foreground">System Status</p><p className="text-xs text-muted-foreground mt-0.5">Timetable generator ready. All prerequisites configured.</p></div></div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
