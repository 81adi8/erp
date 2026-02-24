import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { School, Users, Layers, BookOpen, Plus, RefreshCw, ChevronRight, BarChart3, Zap, AlertCircle, TrendingUp } from 'lucide-react';
import { Card, Badge, Button, Skeleton } from '@erp/common';
import { useGetClassesQuery, useGetAcademicStatsQuery } from '@core/api/endpoints/academicsApi';
import { ACADEMIC_ROUTES } from '../../constants/routes';

const CLASS_FEATURES = [
    { title: 'Class Directory', description: 'View, create and manage all grade levels', icon: School, path: ACADEMIC_ROUTES.CLASSES.ROOT, color: 'text-primary', bg: 'bg-primary/10', gradient: 'from-primary/10 to-transparent', borderColor: 'border-primary/20' },
    { title: 'Section Management', description: 'Organize class divisions & capacities', icon: Layers, path: ACADEMIC_ROUTES.SECTIONS.ROOT, color: 'text-success', bg: 'bg-success/10', gradient: 'from-success/10 to-transparent', borderColor: 'border-success/20' },
    { title: 'Subject Intelligence', description: 'Assign subjects to classes and manage registry', icon: BookOpen, path: ACADEMIC_ROUTES.DASHBOARD.SUBJECTS, color: 'text-warning', bg: 'bg-warning/10', gradient: 'from-warning/10 to-transparent', borderColor: 'border-warning/20' },
    { title: 'Class Analytics', description: 'Enrollment stats & performance', icon: BarChart3, path: ACADEMIC_ROUTES.CLASSES.ROOT, color: 'text-purple-600', bg: 'bg-purple-50', gradient: 'from-purple-50 to-transparent', borderColor: 'border-purple-200' },
];

const QUICK_ACTIONS = [
    { label: 'Create Class', icon: Plus, path: ACADEMIC_ROUTES.CLASSES.ROOT },
    { label: 'Add Section', icon: Layers, path: ACADEMIC_ROUTES.SECTIONS.ROOT },
    { label: 'Map Subjects', icon: BookOpen, path: ACADEMIC_ROUTES.SUBJECTS.ROOT },
    { label: 'View Reports', icon: BarChart3, path: ACADEMIC_ROUTES.CLASSES.ROOT },
];

const CLASS_CATEGORIES = [
    { name: 'Pre-Primary', color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
    { name: 'Primary', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
    { name: 'Middle', color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
    { name: 'Secondary', color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
    { name: 'Higher Secondary', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
];

export default function ClassDashboardPage() {
    const navigate = useNavigate();
    const { data: classesRes, isLoading: loading, refetch } = useGetClassesQuery({ page: 1, limit: 100 });
    const { data: statsRes, isLoading: statsLoading } = useGetAcademicStatsQuery();
    const classes = classesRes?.data || [];
    const stats = statsRes?.data;

    const getCategoryCount = (categoryName: string) => classes.filter((cls) => cls.category?.toLowerCase() === categoryName.toLowerCase()).length;

    const primaryStats = [
        { label: 'Total Classes', value: stats?.classes || classes.length, icon: School, color: 'text-primary', bg: 'bg-primary/10', change: '+2 this month' },
        { label: 'Total Sections', value: stats?.sections || 0, icon: Layers, color: 'text-success', bg: 'bg-success/10', change: '+5 this month' },
        { label: 'Enrolled Students', value: stats?.totalEnrollments || 0, icon: Users, color: 'text-warning', bg: 'bg-warning/10', change: '+24 this month' },
        { label: 'Academic Assets', value: (stats?.subjects || 0) + (stats?.chapters || 0), icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50', change: 'Content Scale' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-success/10 rounded-xl"><School className="w-6 h-6 text-success" /></div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Class Management</h1>
                        <p className="text-sm text-muted-foreground">Manage grade structures, sections & subject mappings</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw size={14} className="mr-1.5" />Refresh</Button>
                    <Button size="sm" onClick={() => navigate(ACADEMIC_ROUTES.CLASSES.ROOT)}><Plus size={14} className="mr-1.5" />New Class</Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statsLoading || loading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : primaryStats.map((stat, i) => (
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

            {/* Feature Cards */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Class Features</h3>
                    <Button variant="ghost" size="sm" onClick={() => navigate(ACADEMIC_ROUTES.CLASSES.ROOT)}>View All <ChevronRight size={14} className="ml-1" /></Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {CLASS_FEATURES.map((feature, i) => (
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
                <div className="lg:col-span-2 space-y-6">
                    {/* Class Distribution */}
                    <Card className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2"><BarChart3 size={16} className="text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Class Distribution</h3></div>
                            <Badge variant="outline" className="text-xs">By Category</Badge>
                        </div>
                        <div className="grid grid-cols-5 gap-3">
                            {CLASS_CATEGORIES.map((cat, i) => (
                                <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className={`p-3 rounded-lg ${cat.bg} border ${cat.border} text-center`}>
                                    <p className={`text-xl font-semibold ${cat.color}`}>{getCategoryCount(cat.name)}</p>
                                    <p className={`text-xs ${cat.color} mt-1`}>{cat.name}</p>
                                </motion.div>
                            ))}
                        </div>
                    </Card>
                    {/* Recent Classes */}
                    <Card className="p-5">
                        <h3 className="text-sm font-semibold text-foreground mb-4">Recent Classes</h3>
                        <div className="space-y-2">
                            {loading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />) : classes.length > 0 ? classes.slice(0, 5).map((cls) => (
                                <motion.div key={cls.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ x: 2 }} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(ACADEMIC_ROUTES.CLASSES.SUBJECTS(cls.id))}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-success/10 rounded-lg flex items-center justify-center text-success text-xs font-semibold">{cls.name?.slice(0, 2).toUpperCase()}</div>
                                        <div><p className="text-sm font-medium text-foreground">{cls.name}</p><p className="text-xs text-muted-foreground">{cls.code} • {cls.sections?.length || 0} Sections</p></div>
                                    </div>
                                    <Badge variant="outline" className="text-xs capitalize">{cls.category || 'Primary'}</Badge>
                                </motion.div>
                            )) : (<div className="py-8 text-center"><School size={32} className="mx-auto text-muted-foreground/30 mb-2" /><p className="text-sm text-muted-foreground">No classes found</p></div>)}
                        </div>
                    </Card>
                </div>
                {/* Quick Actions */}
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
                    <Card className="p-3 bg-success/5 border-success/20">
                        <div className="flex items-start gap-2"><Layers size={14} className="text-success mt-0.5" /><div><p className="text-xs font-medium text-foreground">Class Insights</p><p className="text-xs text-muted-foreground mt-0.5">Your institution has <span className="font-medium text-success">{classes.length} classes</span> with <span className="font-medium text-success">{stats?.sections || 0} sections</span>.</p></div></div>
                    </Card>
                    <Card className="p-3 bg-warning/5 border-warning/20">
                        <div className="flex items-start gap-2"><AlertCircle size={14} className="text-warning mt-0.5" /><div><p className="text-xs font-medium text-foreground">Pro Tip</p><p className="text-xs text-muted-foreground mt-0.5">Map subjects to classes early to enable timetable generation.</p></div></div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
