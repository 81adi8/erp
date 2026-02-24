import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen,
    Plus,
    RefreshCw,
    ChevronRight,
    BarChart3,
    Zap,
    AlertCircle,
    TrendingUp,
    Layers,
    Languages,
    GraduationCap,
    BrainCircuit,
    Star,
    FileText,
    Settings,
    type LucideIcon
} from 'lucide-react';
import { Card, Badge, Button, Skeleton } from '@erp/common';
import { useGetSubjectsQuery, useGetAcademicStatsQuery } from '@core/api/endpoints/academicsApi';
import { ACADEMIC_ROUTES } from '../../constants/routes';

const SUBJECT_FEATURES = [
    {
        title: 'Subject Registry',
        description: 'Global repository of all academic disciplines',
        icon: BookOpen,
        path: ACADEMIC_ROUTES.SUBJECTS.ROOT,
        color: 'text-primary',
        bg: 'bg-primary/10',
        gradient: 'from-primary/10 to-transparent',
        borderColor: 'border-primary/20'
    },
    {
        title: 'Class Mapping',
        description: 'Assign and organize subjects across grades',
        icon: Layers,
        path: ACADEMIC_ROUTES.CLASSES.ROOT,
        color: 'text-success',
        bg: 'bg-success/10',
        gradient: 'from-success/10 to-transparent',
        borderColor: 'border-success/20'
    },
    {
        title: 'Curriculum Design',
        description: 'Define chapters, topics and syllabus',
        icon: FileText,
        path: ACADEMIC_ROUTES.CURRICULUM.ROOT,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        gradient: 'from-purple-50 to-transparent',
        borderColor: 'border-purple-200'
    },
    {
        title: 'Evaluation Rules',
        description: 'Set theory vs practical weightage policies',
        icon: Settings,
        path: ACADEMIC_ROUTES.SUBJECTS.ROOT,
        color: 'text-warning',
        bg: 'bg-warning/10',
        gradient: 'from-warning/10 to-transparent',
        borderColor: 'border-warning/20'
    },
];

const QUICK_ACTIONS = [
    { label: 'Define Subject', icon: Plus, path: ACADEMIC_ROUTES.SUBJECTS.ROOT },
    { label: 'Map to Class', icon: Layers, path: ACADEMIC_ROUTES.CLASSES.ROOT },
    { label: 'Export Catalog', icon: FileText, path: ACADEMIC_ROUTES.SUBJECTS.ROOT },
];

const TYPE_ICONS: Record<string, LucideIcon> = {
    'CORE': BrainCircuit,
    'ELECTIVE': GraduationCap,
    'LANGUAGE': Languages,
    'VOCATIONAL': Star,
    'DEFAULT': BookOpen
};

const TYPE_COLORS: Record<string, string> = {
    'CORE': 'text-primary bg-primary/10 border-primary/20',
    'ELECTIVE': 'text-purple-600 bg-purple-50 border-purple-200',
    'LANGUAGE': 'text-success bg-success/10 border-success/20',
    'VOCATIONAL': 'text-warning bg-warning/10 border-warning/20',
    'DEFAULT': 'text-muted-foreground bg-muted border-border'
};

export default function SubjectDashboardPage() {
    const navigate = useNavigate();
    const { data: subjectsRes, isLoading: subjectsLoading, refetch } = useGetSubjectsQuery({ page: 1, limit: 5 });
    const { data: statsRes, isLoading: statsLoading } = useGetAcademicStatsQuery();

    const subjects = subjectsRes?.data || [];
    const stats = statsRes?.data;
    const distribution = stats?.subjectDistribution || [];

    const primaryStats = [
        {
            label: 'Total Subjects',
            value: stats?.subjects || 0,
            icon: BookOpen,
            color: 'text-primary',
            bg: 'bg-primary/10',
            change: 'Active Registry'
        },
        {
            label: 'Class Mappings',
            value: stats?.classSubjectMappings || 0,
            icon: Layers,
            color: 'text-success',
            bg: 'bg-success/10',
            change: 'Course Assignments'
        },
        {
            label: 'Total Topics',
            value: stats?.topics || 0,
            icon: FileText,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            change: 'Granular Content'
        },
        {
            label: 'Language Streams',
            value: distribution.find(d => d.type === 'LANGUAGE')?.count || 0,
            icon: Languages,
            color: 'text-warning',
            bg: 'bg-warning/10',
            change: 'Linguistic Study'
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                        <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">Subject Intelligence</h1>
                        <p className="text-sm text-muted-foreground">Orchestrate academic disciplines, faculty mapping & curriculum scales</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCw size={14} className={(subjectsLoading || statsLoading) ? 'animate-spin' : 'mr-1.5'} />
                        Sync Data
                    </Button>
                    <Button size="sm" onClick={() => navigate(ACADEMIC_ROUTES.SUBJECTS.ROOT)}>
                        <Plus size={14} className="mr-1.5" />
                        New Subject
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statsLoading ? (
                    [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
                ) : (
                    primaryStats.map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ y: -2 }}
                        >
                            <Card className="p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                                        <p className="text-2xl font-semibold text-foreground mt-1">{stat.value.toLocaleString()}</p>
                                        <p className="text-xs text-success flex items-center mt-1 font-medium">
                                            <TrendingUp size={10} className="mr-0.5" />
                                            {stat.change}
                                        </p>
                                    </div>
                                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                                        <stat.icon size={18} className={stat.color} />
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Feature Cards */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground">Management Modules</h3>
                    <Badge variant="outline" className="text-xs font-medium">Active Controls</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {SUBJECT_FEATURES.map((feature, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ y: -2, scale: 1.01 }}
                        >
                            <Card
                                className={`p-5 cursor-pointer hover:shadow-md transition-all bg-gradient-to-br ${feature.gradient} border ${feature.borderColor} group h-full flex flex-col`}
                                onClick={() => navigate(feature.path)}
                            >
                                <div className={`w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                                    <feature.icon size={20} className={feature.color} />
                                </div>
                                <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{feature.title}</h4>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{feature.description}</p>
                                <div className="mt-4 flex items-center text-xs font-medium text-muted-foreground group-hover:text-primary transition-all">
                                    Open Module <ChevronRight size={12} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Recently Defined Subjects */}
                    <Card className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={16} className="text-muted-foreground" />
                                <h3 className="text-sm font-semibold text-foreground">Recently Cataloged</h3>
                            </div>
                            <Button variant="ghost" size="sm" className="text-xs font-medium" onClick={() => navigate(ACADEMIC_ROUTES.SUBJECTS.ROOT)}>
                                View All <ChevronRight size={14} className="ml-1" />
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {subjectsLoading ? (
                                [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
                            ) : subjects.length > 0 ? (
                                subjects.map((sub) => {
                                    const Icon = TYPE_ICONS[sub.subject_type] || TYPE_ICONS.DEFAULT;
                                    const colors = TYPE_COLORS[sub.subject_type] || TYPE_COLORS.DEFAULT;
                                    return (
                                        <motion.div
                                            key={sub.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            whileHover={{ x: 2 }}
                                            className="flex items-center justify-between p-3 bg-muted/30 border border-transparent hover:border-border hover:bg-muted/50 rounded-xl transition-all cursor-pointer group"
                                            onClick={() => navigate(ACADEMIC_ROUTES.SUBJECTS.DETAIL(sub.id))}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${colors}`}>
                                                    <Icon size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{sub.name}</p>
                                                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                                                        <span className="text-primary font-medium">{sub.code || 'NO-CODE'}</span>
                                                        <span>•</span>
                                                        <span>{sub.credit_hours} Credits</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className={`capitalize text-[10px] font-medium ${colors}`}>
                                                {(sub.subject_type || '').toLowerCase()}
                                            </Badge>
                                        </motion.div>
                                    );
                                })
                            ) : (
                                <div className="py-10 text-center">
                                    <BookOpen size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                                    <p className="text-sm text-muted-foreground font-medium">No subjects found</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Subject Distribution */}
                    <Card className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <BarChart3 size={16} className="text-muted-foreground" />
                                <h3 className="text-sm font-semibold text-foreground">Curriculum Distribution</h3>
                            </div>
                            <Badge variant="outline" className="text-xs font-medium">Taxonomy Analysis</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {distribution.map((cat, i) => {
                                const Icon = TYPE_ICONS[cat.type] || TYPE_ICONS.DEFAULT;
                                const colors = TYPE_COLORS[cat.type] || TYPE_COLORS.DEFAULT;
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.05 }}
                                        className={`p-3 rounded-xl border text-center transition-all ${colors}`}
                                    >
                                        <div className="mx-auto w-7 h-7 rounded-lg flex items-center justify-center bg-white/40 mb-2">
                                            <Icon size={14} />
                                        </div>
                                        <p className="text-lg font-semibold">{cat.count}</p>
                                        <p className="text-[10px] font-medium uppercase tracking-tight opacity-70 mt-0.5">{cat.type}</p>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </Card>
                </div>

                {/* Sidebar Actions */}
                <div className="space-y-6">
                    <Card className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Zap size={16} className="text-warning fill-warning" />
                            <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
                        </div>
                        <div className="space-y-2">
                            {QUICK_ACTIONS.map((action, i) => (
                                <motion.button
                                    key={i}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    whileHover={{ x: 3 }}
                                    onClick={() => navigate(action.path)}
                                    className="w-full flex items-center gap-3 p-3 bg-muted/30 hover:bg-muted/50 rounded-lg transition-all text-left group"
                                >
                                    <div className="p-1.5 bg-background rounded-md border text-muted-foreground group-hover:text-primary transition-colors">
                                        <action.icon size={14} />
                                    </div>
                                    <span className="text-sm font-medium text-foreground">{action.label}</span>
                                    <ChevronRight size={14} className="ml-auto text-muted-foreground" />
                                </motion.button>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-4 bg-primary/5 border-primary/20">
                        <div className="flex items-start gap-3">
                            <AlertCircle size={16} className="text-primary mt-0.5" />
                            <div>
                                <p className="text-xs font-semibold text-primary">Strategic Insight</p>
                                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                                    Mapping subjects early enables automated timetable generation and better faculty load balance.
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-4 bg-warning/5 border-warning/20">
                        <div className="flex items-start gap-3">
                            <BrainCircuit size={16} className="text-warning mt-0.5" />
                            <div>
                                <p className="text-xs font-semibold text-warning">Pro Tip</p>
                                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed italic">
                                    "Practical weightings here direct the automated generation of examination grade scales."
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
