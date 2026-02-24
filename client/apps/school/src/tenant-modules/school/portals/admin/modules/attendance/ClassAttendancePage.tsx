// ============================================================================
// Class Attendance Page - View class-wise attendance summary
// ============================================================================

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Building2, Calendar, ChevronLeft, Search, Download, Eye, Users,
    TrendingUp, TrendingDown, BarChart3, ArrowRight
} from 'lucide-react';
import { Card, Badge, Button, Input, Skeleton, FadeIn, StaggerContainer, StaggerItem } from '@erp/common';
import { ProgressRing } from '@erp/common';
import { ATTENDANCE_ROUTES } from '../../constants/routes';
import { useGetAttendanceClassSummaryQuery } from '../../../../api/attendanceApi';

// ============================================================================
// TYPES
// ============================================================================

interface ClassSummary {
    id: string;
    name: string;
    section: string;
    totalStudents: number;
    avgRate: number;
    todayRate: number;
    trend: number;
    classTeacher: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ClassAttendancePage() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('all');
    
    // API Data
    const { data: response, isLoading } = useGetAttendanceClassSummaryQuery({});
    const classData: ClassSummary[] = response?.data || [];

    const filteredClasses = useMemo(() => {
        return classData.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  c.classTeacher.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesGrade = selectedGrade === 'all' || c.name.includes(selectedGrade);
            return matchesSearch && matchesGrade;
        });
    }, [classData, searchQuery, selectedGrade]);

    const stats = useMemo(() => {
        const totalStudents = filteredClasses.reduce((acc, c) => acc + c.totalStudents, 0);
        const avgRate = filteredClasses.reduce((acc, c) => acc + c.avgRate, 0) / filteredClasses.length || 0;
        const excellent = filteredClasses.filter(c => c.avgRate >= 95).length;
        const needsAttention = filteredClasses.filter(c => c.avgRate < 90).length;
        return { totalStudents, avgRate, excellent, needsAttention };
    }, [filteredClasses]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <FadeIn>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="p-3 bg-gradient-to-br from-success/20 to-success/5 rounded-2xl border border-success/20">
                            <Building2 className="w-7 h-7 text-success" />
                        </motion.div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Class Attendance</h1>
                            <p className="text-sm text-muted-foreground">View class-wise attendance summary</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(ATTENDANCE_ROUTES.ROOT)}>
                            <ChevronLeft size={14} className="mr-1" />Back
                        </Button>
                        <Button variant="outline" size="sm"><Download size={14} className="mr-1" />Export</Button>
                    </div>
                </div>
            </FadeIn>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}
                        className="h-10 px-3 rounded-lg border border-border bg-background text-sm">
                        <option value="all">All Grades</option>
                        <option value="10">Class 10</option>
                        <option value="9">Class 9</option>
                        <option value="8">Class 8</option>
                        <option value="7">Class 7</option>
                    </select>
                    <div className="flex-1 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Search class or teacher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                    </div>
                </div>
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-2xl font-bold">{filteredClasses.length}</p>
                            <p className="text-sm text-muted-foreground">Classes</p>
                        </div>
                        <Building2 size={28} className="text-muted-foreground/30" />
                    </div>
                </Card>
                <Card className="p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-2xl font-bold">{stats.totalStudents}</p>
                            <p className="text-sm text-muted-foreground">Students</p>
                        </div>
                        <Users size={28} className="text-muted-foreground/30" />
                    </div>
                </Card>
                <Card className="p-5 bg-success/5 border-success/20">
                    <div className="flex items-center gap-3">
                        <ProgressRing value={stats.avgRate} size="md" color="stroke-success" />
                        <div>
                            <p className="text-xl font-bold text-success">{stats.avgRate.toFixed(1)}%</p>
                            <p className="text-xs text-muted-foreground">Avg Rate</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-5 bg-error/5 border-error/20">
                    <div>
                        <p className="text-2xl font-bold text-error">{stats.needsAttention}</p>
                        <p className="text-sm text-muted-foreground">Need Attention (&lt;90%)</p>
                    </div>
                </Card>
            </div>

            {/* Class Grid */}
            <StaggerContainer staggerDelay={0.05}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? [...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />) :
                    filteredClasses.map((cls) => (
                        <StaggerItem key={cls.id}>
                            <motion.div whileHover={{ y: -4, scale: 1.01 }} className="cursor-pointer">
                                <Card className={`p-5 h-full border-l-4 ${cls.avgRate >= 95 ? 'border-l-success' : cls.avgRate >= 90 ? 'border-l-warning' : 'border-l-error'}`}>
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-semibold">{cls.name} - {cls.section}</h3>
                                                <Badge variant={cls.trend > 0 ? 'success' : cls.trend < 0 ? 'error' : 'default'} className="text-xs">
                                                    {cls.trend > 0 ? <TrendingUp size={10} className="mr-1" /> : <TrendingDown size={10} className="mr-1" />}
                                                    {cls.trend > 0 ? '+' : ''}{cls.trend}%
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{cls.classTeacher}</p>
                                        </div>
                                        <ProgressRing value={cls.avgRate} size="md" color={cls.avgRate >= 95 ? 'stroke-success' : cls.avgRate >= 90 ? 'stroke-warning' : 'stroke-error'} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        <div className="text-center p-2 bg-muted/30 rounded-lg">
                                            <p className="text-sm font-bold">{cls.totalStudents}</p>
                                            <p className="text-xs text-muted-foreground">Students</p>
                                        </div>
                                        <div className="text-center p-2 bg-success/10 rounded-lg">
                                            <p className="text-sm font-bold text-success">{cls.todayRate}%</p>
                                            <p className="text-xs text-muted-foreground">Today</p>
                                        </div>
                                        <div className="text-center p-2 bg-primary/10 rounded-lg">
                                            <p className="text-sm font-bold text-primary">{cls.avgRate}%</p>
                                            <p className="text-xs text-muted-foreground">Average</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" className="w-full">
                                        View Details <ArrowRight size={14} className="ml-1" />
                                    </Button>
                                </Card>
                            </motion.div>
                        </StaggerItem>
                    ))}
                </div>
            </StaggerContainer>

            {filteredClasses.length === 0 && !isLoading && (
                <Card className="p-12 text-center">
                    <Building2 size={48} className="mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No classes found</p>
                </Card>
            )}
        </div>
    );
}
