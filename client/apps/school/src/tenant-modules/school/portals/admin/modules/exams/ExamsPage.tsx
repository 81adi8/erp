import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GraduationCap,
    Plus,
    Edit2,
    Trash2,
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    Search,
    RefreshCw,
    Filter,
    FileText,
    Play,
    Pause,
    Check,
    X,
    ClipboardList,
    ChevronRight,
    BarChart3,
    Target,
    Award,
} from 'lucide-react';
import {
    Button,
    Input,
    Badge,
    Modal,
    ConfirmDialog,
    Select,
    Card,
    Skeleton,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from '@erp/common';
import {
    useGetExamsQuery,
    useCreateExamMutation,
    useUpdateExamMutation,
    useDeleteExamMutation,
    useUpdateExamStatusMutation,
    useGetExamStatsQuery,
    ExamType,
    ExamStatus,
} from '@core/api/endpoints/examinationApi';
import { useGetCurrentAcademicSessionQuery } from '@core/api/endpoints/academicsApi';
import type { Exam } from '@core/api/endpoints/examinationApi';

const EXAM_TYPE_CONFIG: Record<ExamType, { label: string; color: string; bg: string }> = {
    [ExamType.MID_TERM]: { label: 'Mid-Term', color: 'text-primary', bg: 'bg-primary/10' },
    [ExamType.FINAL]: { label: 'Final', color: 'text-destructive', bg: 'bg-destructive/10' },
    [ExamType.UNIT_TEST]: { label: 'Unit Test', color: 'text-warning', bg: 'bg-warning/10' },
    [ExamType.QUIZ]: { label: 'Quiz', color: 'text-success', bg: 'bg-success/10' },
    [ExamType.PRACTICAL]: { label: 'Practical', color: 'text-purple-600', bg: 'bg-purple-100' },
    [ExamType.ASSIGNMENT]: { label: 'Assignment', color: 'text-blue-600', bg: 'bg-blue-100' },
};

const EXAM_STATUS_CONFIG: Record<ExamStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    [ExamStatus.DRAFT]: { label: 'Draft', color: 'text-muted-foreground', bg: 'bg-muted', icon: FileText },
    [ExamStatus.SCHEDULED]: { label: 'Scheduled', color: 'text-primary', bg: 'bg-primary/10', icon: Calendar },
    [ExamStatus.ONGOING]: { label: 'Ongoing', color: 'text-warning', bg: 'bg-warning/10', icon: Play },
    [ExamStatus.COMPLETED]: { label: 'Completed', color: 'text-success', bg: 'bg-success/10', icon: CheckCircle2 },
    [ExamStatus.CANCELLED]: { label: 'Cancelled', color: 'text-destructive', bg: 'bg-destructive/10', icon: X },
};

interface ExamFormData {
    name: string;
    code: string;
    type: ExamType;
    start_date: string;
    end_date: string;
}

const initialFormData: ExamFormData = {
    name: '',
    code: '',
    type: ExamType.UNIT_TEST,
    start_date: '',
    end_date: '',
};

export default function ExamsPage() {
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [formData, setFormData] = useState<ExamFormData>(initialFormData);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const { data: sessionRes } = useGetCurrentAcademicSessionQuery();
    const currentSession = sessionRes?.data;

    const { data: examsRes, isLoading, isFetching, refetch } = useGetExamsQuery(
        { sessionId: currentSession?.id },
        { skip: !currentSession?.id }
    );
    const { data: statsRes } = useGetExamStatsQuery(
        { sessionId: currentSession?.id },
        { skip: !currentSession?.id }
    );

    const [createExam, { isLoading: isCreating }] = useCreateExamMutation();
    const [updateExam, { isLoading: isUpdating }] = useUpdateExamMutation();
    const [deleteExam] = useDeleteExamMutation();
    const [updateStatus] = useUpdateExamStatusMutation();

    const exams = examsRes?.data || [];
    const stats = statsRes?.data;

    const filteredExams = exams.filter(exam => {
        const matchesSearch = exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            exam.code?.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (activeTab === 'all') return matchesSearch;
        return matchesSearch && exam.status === activeTab;
    });

    const handleOpenModal = (exam?: Exam) => {
        if (exam) {
            setEditingExam(exam);
            setFormData({
                name: exam.name,
                code: exam.code || '',
                type: exam.type,
                start_date: exam.start_date || '',
                end_date: exam.end_date || '',
            });
        } else {
            setEditingExam(null);
            setFormData(initialFormData);
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!currentSession) return;

        try {
            if (editingExam) {
                await updateExam({ id: editingExam.id, data: formData }).unwrap();
            } else {
                await createExam({
                    ...formData,
                    academic_year_id: currentSession.id,
                }).unwrap();
            }
            setIsModalOpen(false);
            refetch();
        } catch (error) {
            console.error('Failed to save exam:', error);
        }
    };

    const handleStatusChange = async (exam: Exam, newStatus: ExamStatus) => {
        try {
            await updateStatus({ id: exam.id, status: newStatus }).unwrap();
            refetch();
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        try {
            await deleteExam(deleteConfirm).unwrap();
            setDeleteConfirm(null);
            refetch();
        } catch (error) {
            console.error('Failed to delete exam:', error);
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 lg:p-6">
            <div className="max-w-[1600px] mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-primary/10 rounded-lg shadow-sm">
                                <GraduationCap className="w-5 h-5 text-primary" />
                            </div>
                            <h1 className="text-xl font-black text-foreground tracking-tight uppercase">Examination Center</h1>
                        </div>
                        <p className="text-muted-foreground text-xs font-medium">Manage exams, schedules, and results.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search exams..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 w-60 h-10"
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => refetch()}
                            className="border-border h-10"
                        >
                            <RefreshCw size={14} className={`mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button onClick={() => handleOpenModal()} className="bg-primary text-primary-foreground h-10">
                            <Plus size={14} className="mr-1.5" />
                            New Exam
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="p-4 bg-surface border-border rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary/10 rounded-xl">
                                    <ClipboardList size={20} className="text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black">{stats.totalExams}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Exams</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-4 bg-warning/5 border-warning/20 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-warning/10 rounded-xl">
                                    <Calendar size={20} className="text-warning" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-warning">{stats.upcomingExams}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Upcoming</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-4 bg-primary/5 border-primary/20 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary/10 rounded-xl">
                                    <Play size={20} className="text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-primary">{stats.ongoingExams}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Ongoing</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-4 bg-success/5 border-success/20 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-success/10 rounded-xl">
                                    <CheckCircle2 size={20} className="text-success" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-success">{stats.completedExams}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Completed</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Tabs & Exams List */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-muted/30 p-1 rounded-xl">
                        <TabsTrigger value="all" className="rounded-lg text-xs font-bold">All Exams</TabsTrigger>
                        <TabsTrigger value={ExamStatus.DRAFT} className="rounded-lg text-xs font-bold">Draft</TabsTrigger>
                        <TabsTrigger value={ExamStatus.SCHEDULED} className="rounded-lg text-xs font-bold">Scheduled</TabsTrigger>
                        <TabsTrigger value={ExamStatus.ONGOING} className="rounded-lg text-xs font-bold">Ongoing</TabsTrigger>
                        <TabsTrigger value={ExamStatus.COMPLETED} className="rounded-lg text-xs font-bold">Completed</TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab} className="mt-4">
                        {isLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
                            </div>
                        ) : filteredExams.length === 0 ? (
                            <Card className="p-12 flex flex-col items-center justify-center text-center space-y-4 bg-surface border-border rounded-3xl">
                                <div className="p-4 bg-muted/30 rounded-2xl">
                                    <ClipboardList size={40} className="text-muted-foreground/50" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground">No Exams Found</p>
                                    <p className="text-xs text-muted-foreground">Create your first exam to get started.</p>
                                </div>
                                <Button onClick={() => handleOpenModal()} className="bg-primary text-primary-foreground">
                                    <Plus size={14} className="mr-1.5" />
                                    Create Exam
                                </Button>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <AnimatePresence mode="popLayout">
                                    {filteredExams.map((exam) => {
                                        const typeConfig = EXAM_TYPE_CONFIG[exam.type];
                                        const statusConfig = EXAM_STATUS_CONFIG[exam.status];
                                        const StatusIcon = statusConfig.icon;

                                        return (
                                            <motion.div
                                                key={exam.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                            >
                                                <Card className="p-5 bg-surface border-border rounded-2xl hover:shadow-lg hover:border-primary/20 transition-all group">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <Badge className={`${typeConfig.bg} ${typeConfig.color} border-0 text-[9px] font-black uppercase`}>
                                                            {typeConfig.label}
                                                        </Badge>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleOpenModal(exam)}
                                                                className="h-7 w-7 p-0"
                                                            >
                                                                <Edit2 size={12} />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setDeleteConfirm(exam.id)}
                                                                className="h-7 w-7 p-0 text-destructive"
                                                            >
                                                                <Trash2 size={12} />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <h3 className="text-sm font-black text-foreground mb-1 uppercase">{exam.name}</h3>
                                                    {exam.code && (
                                                        <p className="text-[10px] text-muted-foreground font-bold mb-3">Code: {exam.code}</p>
                                                    )}

                                                    <div className="flex items-center gap-2 mb-4">
                                                        <div className={`p-1.5 rounded-lg ${statusConfig.bg}`}>
                                                            <StatusIcon size={12} className={statusConfig.color} />
                                                        </div>
                                                        <span className={`text-xs font-bold ${statusConfig.color}`}>{statusConfig.label}</span>
                                                    </div>

                                                    {(exam.start_date || exam.end_date) && (
                                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium mb-4">
                                                            <Calendar size={12} />
                                                            {exam.start_date && new Date(exam.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                            {exam.end_date && ` - ${new Date(exam.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                                                        </div>
                                                    )}

                                                    <div className="pt-4 border-t border-border flex items-center justify-between">
                                                        <Select
                                                            value={exam.status}
                                                            onChange={(e) => handleStatusChange(exam, e.target.value as ExamStatus)}
                                                            options={Object.entries(EXAM_STATUS_CONFIG).map(([value, cfg]) => ({
                                                                value,
                                                                label: cfg.label,
                                                            }))}
                                                            className="h-8 text-xs w-28"
                                                        />
                                                        <Button variant="ghost" size="sm" className="text-xs">
                                                            View Schedules <ChevronRight size={12} className="ml-1" />
                                                        </Button>
                                                    </div>
                                                </Card>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingExam ? 'Edit Exam' : 'Create New Exam'}
                size="md"
            >
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Exam Name *</label>
                        <Input
                            placeholder="e.g., Mid-Term Examination 2024"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="h-10"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Code</label>
                            <Input
                                placeholder="e.g., MID-24"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="h-10"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Type *</label>
                            <Select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as ExamType })}
                                options={Object.entries(EXAM_TYPE_CONFIG).map(([value, cfg]) => ({
                                    value,
                                    label: cfg.label,
                                }))}
                                className="h-10"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Start Date</label>
                            <Input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="h-10"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">End Date</label>
                            <Input
                                type="date"
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                className="h-10"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-4 border-t border-border">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!formData.name || isCreating || isUpdating}
                            className="bg-primary text-primary-foreground"
                        >
                            {(isCreating || isUpdating) ? 'Saving...' : editingExam ? 'Update Exam' : 'Create Exam'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={handleDelete}
                title="Delete Exam"
                message="Are you sure you want to delete this exam? This action cannot be undone and will remove all associated schedules and marks."
                confirmText="Delete"
                type="danger"
            />
        </div>
    );
}
