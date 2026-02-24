import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Plus,
    Edit2,
    Trash2,
    CheckCircle2,
    Clock,
    AlertCircle,
    XCircle,
    Filter,
    Search,
    ChevronLeft,
    ChevronRight,
    User as UserIcon,
    BookOpen,
    ClipboardList,
    RefreshCw,
    History,
    type LucideIcon
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
    useAlert
} from '@erp/common';
import {
    useGetLessonPlansQuery,
    useGetClassesQuery,
    useGetSectionsByClassIdQuery,
    useGetSubjectsQuery,
    useGetChaptersQuery,
    useGetTopicsQuery,
    useCreateLessonPlanMutation,
    useUpdateLessonPlanMutation,
    useDeleteLessonPlanMutation,
    useGetCurrentAcademicSessionQuery,
} from '@core/api/endpoints/academicsApi';
import { useGetUsersQuery } from '@core/api/endpoints/usersApi';
import type { LessonPlan } from '@core/api/endpoints/academicsApi';
import { formatApiError } from '@/common/services/apiHelpers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { lessonPlanSchema, type LessonPlanFormData as LessonPlanFormValues } from '@/core/validation/schemas';

const STATUS_CONFIG: Record<string, { label: string, color: string, bg: string, icon: LucideIcon }> = {
    'PLANNED': { label: 'Planned', color: 'text-primary', bg: 'bg-primary/10', icon: Clock },
    'ONGOING': { label: 'Ongoing', color: 'text-warning', bg: 'bg-warning/10', icon: AlertCircle },
    'COMPLETED': { label: 'Completed', color: 'text-success', bg: 'bg-success/10', icon: CheckCircle2 },
    'CANCELLED': { label: 'Cancelled', color: 'text-destructive', bg: 'bg-destructive/10', icon: XCircle },
};

export default function LessonPlansPage() {
    const [page, setPage] = useState(1);
    const { success, showAlert } = useAlert();
    const { data: currentSessionRes } = useGetCurrentAcademicSessionQuery();
    const currentSessionId = currentSessionRes?.data?.id;
    const [filters, setFilters] = useState({
        classId: '',
        sectionId: '',
        status: '',
        teacherId: ''
    });

    const { data: plansRes, isLoading: loading, isFetching, refetch } = useGetLessonPlansQuery({ ...filters, page, limit: 12 });
    const { data: classesRes } = useGetClassesQuery({ limit: 100 });
    const { data: sectionsRes } = useGetSectionsByClassIdQuery(filters.classId, { skip: !filters.classId });
    const { data: teachersRes } = useGetUsersQuery({ role: 'teacher', limit: 100 });

    const [modalClassId, setModalClassId] = useState('');
    const [modalSubjectId, setModalSubjectId] = useState('');
    const [modalChapterId, setModalChapterId] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('targeting');
    const { data: modalSubjectsRes } = useGetSubjectsQuery({ limit: 100 }, { skip: !isModalOpen });
    const { data: modalChaptersRes } = useGetChaptersQuery(modalSubjectId, { skip: !modalSubjectId });
    const { data: modalTopicsRes } = useGetTopicsQuery(modalChapterId, { skip: !modalChapterId });

    const [createLessonPlan] = useCreateLessonPlanMutation();
    const [updateLessonPlan] = useUpdateLessonPlanMutation();
    const [deleteLessonPlan] = useDeleteLessonPlanMutation();

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);

    const defaultFormData: LessonPlanFormValues = {
        topic_id: '',
        class_id: '',
        section_id: '',
        subject_id: '',
        teacher_id: '',
        planned_date: '',
        completion_date: '',
        status: 'PLANNED',
        remarks: '',
        aims_objectives: '',
        teaching_aids: '',
        homework_assignment: '',
        student_feedback: '',
        coordinator_remarks: '',
        attachment_urls: '',
        academic_year_id: '',
    };
    const {
        handleSubmit: handleFormSubmit,
        watch,
        setValue,
        getValues,
        reset,
        formState: { errors: formErrors, isSubmitting },
    } = useForm<LessonPlanFormValues>({
        resolver: zodResolver(lessonPlanSchema),
        defaultValues: defaultFormData,
    });
    const formData = watch();
    const setFormData = (nextState: LessonPlanFormValues | ((prevState: LessonPlanFormValues) => LessonPlanFormValues)) => {
        const next = typeof nextState === 'function' ? nextState(getValues()) : nextState;
        (Object.keys(next) as Array<keyof LessonPlanFormValues>).forEach((key) => {
            setValue(key, next[key], { shouldValidate: true });
        });
    };

    const handleOpenCreate = () => {
        setSelectedPlan(null);
        reset({
            ...defaultFormData,
            class_id: filters.classId,
            section_id: filters.sectionId,
            planned_date: new Date().toISOString().split('T')[0],
            academic_year_id: currentSessionId || ''
        });
        setActiveTab('targeting');
        setIsModalOpen(true);
    };

    const handleOpenEdit = (plan: LessonPlan) => {
        setSelectedPlan(plan);
        setModalClassId(plan.class_id);
        setModalSubjectId(plan.subject_id);
        setModalChapterId(plan.topic?.chapter_id || '');
        reset({
            topic_id: plan.topic_id,
            class_id: plan.class_id,
            section_id: plan.section_id,
            subject_id: plan.subject_id,
            teacher_id: plan.teacher_id,
            planned_date: plan.planned_date.split('T')[0],
            completion_date: plan.completion_date?.split('T')[0] || '',
            status: plan.status,
            remarks: plan.remarks || '',
            aims_objectives: plan.aims_objectives || '',
            teaching_aids: plan.teaching_aids?.join('\n') || '',
            homework_assignment: plan.homework_assignment || '',
            student_feedback: plan.student_feedback || '',
            coordinator_remarks: plan.coordinator_remarks || '',
            attachment_urls: plan.attachment_urls?.join('\n') || '',
            academic_year_id: plan.academic_year_id || ''
        });
        setActiveTab('targeting');
        setIsModalOpen(true);
    };

    const onSubmit = async (data: LessonPlanFormValues) => {
        try {
            const payload: Partial<LessonPlan> = {
                ...data,
                teaching_aids: data.teaching_aids.split('\n').filter(s => s.trim() !== ''),
                attachment_urls: data.attachment_urls.split('\n').filter(s => s.trim() !== ''),
                academic_year_id: currentSessionId || data.academic_year_id,
                status: data.status,
            };
            if (selectedPlan) {
                await updateLessonPlan({ id: selectedPlan.id, data: payload }).unwrap();
                success('Schedule Updated', 'Tactical maneuver has been recalibrated.');
            } else {
                await createLessonPlan(payload).unwrap();
                success('Schedule Created', 'New pedagogical maneuver has been initialized.');
            }
            setIsModalOpen(false);
        } catch (error) {
            showAlert({
                title: 'Operation Failed',
                description: formatApiError(error),
                variant: 'error'
            });
            console.error('Lesson plan operation failed:', error);
        }
    };

    const teacherOptions = [
        { value: '', label: 'Allocate Instructor' },
        ...(teachersRes?.data.map(t => ({ value: t.id, label: `${t.firstName} ${t.lastName}` })) || [])
    ];

    return (
        <div className="min-h-screen bg-background p-4 lg:p-6">
            <div className="max-w-[1400px] mx-auto space-y-4">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-surface border border-border rounded-xl shadow-sm text-primary">
                            <ClipboardList size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground tracking-tight">Lesson Engineering</h1>
                            <p className="text-muted-foreground text-xs font-medium">Schedule pedagogical maneuvers and tracking.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => refetch()} className="bg-surface border-border text-muted-foreground hover:bg-muted hover:text-foreground">
                            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                            Refresh
                        </Button>
                        <Button
                            onClick={handleOpenCreate}
                            size="sm"
                            className="bg-primary text-primary-foreground border-0 shadow-sm hover:bg-primary/90"
                        >
                            <Plus size={16} className="mr-1" />
                            Schedule Session
                        </Button>
                    </div>
                </div>

                {/* Tactical Filtering Matrix */}
                <Card className="p-4 bg-surface border-border shadow-sm rounded-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-0.5">Grade Vector</label>
                            <div className="bg-muted/30 border border-border rounded-lg px-2">
                                <Select
                                    value={filters.classId}
                                    onChange={(e) => setFilters({ ...filters, classId: e.target.value, sectionId: '' })}
                                    options={[{ value: '', label: 'All Grades' }, ...(classesRes?.data.map(c => ({ value: c.id, label: c.name })) || [])]}
                                    className="border-0 bg-transparent text-[11px] font-bold h-9 w-full outline-none text-foreground"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-0.5">Section Division</label>
                            <div className="bg-muted/30 border border-border rounded-lg px-2">
                                <Select
                                    value={filters.sectionId}
                                    onChange={(e) => setFilters({ ...filters, sectionId: e.target.value })}
                                    options={[{ value: '', label: 'All Divisions' }, ...(sectionsRes?.data.map(s => ({ value: s.id, label: s.name })) || [])]}
                                    disabled={!filters.classId}
                                    className="border-0 bg-transparent text-[11px] font-bold h-9 w-full outline-none text-foreground"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-0.5">Lifecycle State</label>
                            <div className="bg-muted/30 border border-border rounded-lg px-2">
                                <Select
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    options={[
                                        { value: '', label: 'All States' },
                                        { value: 'PLANNED', label: 'Planned' },
                                        { value: 'ONGOING', label: 'Ongoing' },
                                        { value: 'COMPLETED', label: 'Completed' },
                                        { value: 'CANCELLED', label: 'Cancelled' },
                                    ]}
                                    className="border-0 bg-transparent text-[11px] font-bold h-9 w-full outline-none text-foreground"
                                />
                            </div>
                        </div>
                        <div className="flex items-end">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 w-full border-border text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg text-[10px] font-bold uppercase"
                                onClick={() => setFilters({ classId: '', sectionId: '', status: '', teacherId: '' })}
                            >
                                Reset Matrix
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {loading ? (
                        [...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 rounded-3xl" />)
                    ) : (plansRes?.data || []).length === 0 ? (
                        <div className="col-span-full py-24 border border-border border-dashed rounded-3xl bg-surface flex flex-col items-center justify-center text-center space-y-4">
                            <ClipboardList size={40} className="text-muted-foreground/50" />
                            <p className="text-muted-foreground text-sm font-medium">No tactical maneuvers logged.</p>
                        </div>
                    ) : (
                        plansRes?.data.map((plan) => (
                            <Card key={plan.id} className="group p-5 bg-surface border-border rounded-2xl transition-all hover:shadow-md hover:border-primary/20">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="p-2.5 bg-muted/30 border border-border rounded-xl flex flex-col items-center justify-center min-w-[50px]">
                                            <span className="text-[9px] font-bold text-muted-foreground uppercase">{new Date(plan.planned_date).toLocaleDateString(undefined, { month: 'short' })}</span>
                                            <span className="text-lg font-bold text-foreground leading-none mt-0.5">{new Date(plan.planned_date).getDate()}</span>
                                        </div>
                                        <Badge className={`${STATUS_CONFIG[plan.status].bg} ${STATUS_CONFIG[plan.status].color} border-0 rounded-lg text-[9px] font-bold px-2 py-0.5`}>
                                            {STATUS_CONFIG[plan.status].label}
                                        </Badge>
                                    </div>

                                    <div>
                                        <p className="text-[9px] font-bold text-primary uppercase tracking-widest">{plan.class?.name} • DIVISION_{plan.section?.name}</p>
                                        <h3 className="text-sm font-bold text-foreground uppercase tracking-tight group-hover:text-primary transition-colors line-clamp-2 min-h-[40px] mt-0.5">{plan.topic?.name}</h3>
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
                                            <BookOpen size={10} className="text-primary/70" />
                                            {plan.subject?.name}
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-border flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                                <UserIcon size={14} />
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-bold text-muted-foreground uppercase">Instructor</p>
                                                <p className="text-[10px] font-bold text-foreground uppercase truncate max-w-[80px]">{plan.teacher?.name.split(' ')[0]}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => handleOpenEdit(plan)} className="p-1.5 hover:bg-muted text-muted-foreground hover:text-primary rounded-lg transition-colors">
                                                <Edit2 size={12} />
                                            </button>
                                            <button onClick={() => { setSelectedPlan(plan); setIsConfirmOpen(true); }} className="p-1.5 hover:bg-muted text-muted-foreground hover:text-destructive rounded-lg transition-colors">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {plansRes?.meta && plansRes.meta.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 py-4">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="bg-surface border-border text-muted-foreground hover:text-foreground"><ChevronLeft size={14} /></Button>
                        <span className="text-xs font-bold text-muted-foreground">{page} / {plansRes.meta.totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(plansRes.meta.totalPages, p + 1))} disabled={page === plansRes.meta.totalPages} className="bg-surface border-border text-muted-foreground hover:text-foreground"><ChevronRight size={14} /></Button>
                    </div>
                )}
            </div>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedPlan ? 'Edit Schedule' : 'Schedule Session'}
                size="lg"
            >
                <form onSubmit={handleFormSubmit(onSubmit)} className="space-y-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-10 p-1 bg-muted/50 rounded-lg">
                            <TabsTrigger value="targeting" className="text-[10px] font-bold uppercase tracking-wide rounded-md">Targeting</TabsTrigger>
                            <TabsTrigger value="operational" className="text-[10px] font-bold uppercase tracking-wide rounded-md">Operational</TabsTrigger>
                            <TabsTrigger value="pedagogy" className="text-[10px] font-bold uppercase tracking-wide rounded-md">Pedagogy</TabsTrigger>
                        </TabsList>

                        <div className="mt-4 min-h-[300px]">
                            <TabsContent value="targeting" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Academic Grade *</label>
                                        <Select
                                            value={formData.class_id}
                                            onChange={e => { setFormData({ ...formData, class_id: e.target.value, section_id: '' }); setModalClassId(e.target.value); }}
                                            options={classesRes?.data.map(c => ({ value: c.id, label: c.name })) || []}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                        {formErrors.class_id && <p className="text-xs text-red-500">{formErrors.class_id.message}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Division Unit *</label>
                                        <Select
                                            value={formData.section_id}
                                            onChange={e => setFormData({ ...formData, section_id: e.target.value })}
                                            options={sectionsRes?.data.map(s => ({ value: s.id, label: s.name })) || []}
                                            disabled={!formData.class_id}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                        {formErrors.section_id && <p className="text-xs text-red-500">{formErrors.section_id.message}</p>}
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Assigned Instructor *</label>
                                        <Select
                                            value={formData.teacher_id}
                                            onChange={e => setFormData({ ...formData, teacher_id: e.target.value })}
                                            options={teacherOptions}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                        {formErrors.teacher_id && <p className="text-xs text-red-500">{formErrors.teacher_id.message}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Subject Entity *</label>
                                        <Select
                                            value={formData.subject_id}
                                            onChange={e => { setFormData({ ...formData, subject_id: e.target.value }); setModalSubjectId(e.target.value); }}
                                            options={modalSubjectsRes?.data.map(s => ({ value: s.id, label: s.name.toUpperCase() })) || []}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                        {formErrors.subject_id && <p className="text-xs text-red-500">{formErrors.subject_id.message}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Structural Node *</label>
                                        <Select
                                            value={formData.topic_id}
                                            onChange={e => setFormData({ ...formData, topic_id: e.target.value })}
                                            options={modalTopicsRes?.data.map(t => ({ value: t.id, label: t.name.toUpperCase() })) || []}
                                            disabled={!modalSubjectId}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                        {formErrors.topic_id && <p className="text-xs text-red-500">{formErrors.topic_id.message}</p>}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="operational" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Planned Date *</label>
                                        <Input type="date" value={formData.planned_date} onChange={e => setFormData({ ...formData, planned_date: e.target.value })} className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20" error={formErrors.planned_date?.message} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Completion Date</label>
                                        <Input type="date" value={formData.completion_date} onChange={e => setFormData({ ...formData, completion_date: e.target.value })} className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Lifecycle Status</label>
                                        <Select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} options={Object.keys(STATUS_CONFIG).map(s => ({ value: s, label: STATUS_CONFIG[s].label }))} className="h-10 rounded-lg capitalize bg-surface border-border text-foreground focus:ring-primary/20" />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="pedagogy" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Strategic Aims</label>
                                        <textarea className="w-full min-h-[80px] p-3 text-sm bg-muted/30 border border-border rounded-xl outline-none focus:bg-surface focus:ring-2 focus:ring-primary/20 text-foreground" placeholder="..." value={formData.aims_objectives} onChange={e => setFormData({ ...formData, aims_objectives: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Pedagogical Aids</label>
                                        <textarea className="w-full min-h-[80px] p-3 text-[11px] font-bold font-mono bg-muted/30 border border-border rounded-xl outline-none focus:bg-surface focus:ring-2 focus:ring-primary/20 text-foreground" placeholder="Aids..." value={formData.teaching_aids} onChange={e => setFormData({ ...formData, teaching_aids: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Assignments</label>
                                        <textarea className="w-full min-h-[80px] p-3 text-sm bg-muted/30 border border-border rounded-xl outline-none focus:bg-surface focus:ring-2 focus:ring-primary/20 text-foreground" value={formData.homework_assignment} onChange={e => setFormData({ ...formData, homework_assignment: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Session Feedback</label>
                                        <textarea className="w-full min-h-[80px] p-3 text-sm italic bg-muted/30 border border-border rounded-xl outline-none focus:bg-surface focus:ring-2 focus:ring-primary/20 text-foreground" value={formData.student_feedback} onChange={e => setFormData({ ...formData, student_feedback: e.target.value })} />
                                    </div>
                                </div>
                            </TabsContent>
                        </div>

                        <div className="flex gap-2 justify-end pt-4 border-t border-border">
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-primary text-primary-foreground font-bold hover:bg-primary/90">
                                {isSubmitting ? 'Saving...' : 'Execute Schedule'}
                            </Button>
                        </div>
                    </Tabs>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={async () => {
                    if (selectedPlan) {
                        try {
                            await deleteLessonPlan(selectedPlan.id).unwrap();
                            setIsConfirmOpen(false);
                            success('Schedule Deconstructed', 'Pedagogical record has been permanently excised.');
                        } catch (error) {
                            showAlert({
                                title: 'Purge Failed',
                                description: formatApiError(error),
                                variant: 'error'
                            });
                        }
                    }
                }}
                title="Deconstruct Schedule?"
                description="This will permanently excise the session record. Continue?"
                confirmLabel="Confirm Delete"
                variant="danger"
            />
        </div>
    );
}
