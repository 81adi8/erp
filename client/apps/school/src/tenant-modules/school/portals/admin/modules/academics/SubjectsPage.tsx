import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen,
    Plus,
    Edit2,
    Trash2,
    Search,
    RefreshCw,
    Filter,
    ChevronLeft,
    ChevronRight,
    Languages,
    FlaskConical,
    GraduationCap,
    Clock,
    CheckCircle2,
    XCircle,
    Activity,
    FileText,
    BrainCircuit,
    Palette,
    Tags,
    Star,
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
    useGetSubjectsQuery,
    useCreateSubjectMutation,
    useUpdateSubjectMutation,
    useDeleteSubjectMutation,
} from '@core/api/endpoints/academicsApi';
import type { Subject } from '@core/api/endpoints/academicsApi';
import { formatApiError } from '@/common/services/apiHelpers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { subjectSchema, type SubjectFormData } from '@/core/validation/schemas';

const TYPE_CONFIG: Record<string, { color: string, bg: string, icon: LucideIcon, label: string }> = {
    'CORE': { label: 'Core Discipline', color: 'text-primary', bg: 'bg-primary/10', icon: BrainCircuit },
    'ELECTIVE': { label: 'Elective Branch', color: 'text-purple-600', bg: 'bg-purple-50', icon: GraduationCap },
    'LANGUAGE': { label: 'Linguistic Study', color: 'text-success', bg: 'bg-success/10', icon: Languages },
    'VOCATIONAL': { label: 'Vocational Train', color: 'text-warning', bg: 'bg-warning/10', icon: Star },
};

const PRESET_COLORS = [
    { name: 'Indigo', value: '#4f46e5' },
    { name: 'Blue', value: '#2563eb' },
    { name: 'Sky', value: '#0ea5e9' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Slate', value: '#475569' },
];

export default function SubjectsPage() {
    const [page, setPage] = useState(1);
    const { success, showAlert } = useAlert();
    const [searchTerm, setSearchTerm] = useState('');
    const { data: subjectsRes, isLoading: loading, isFetching, refetch } = useGetSubjectsQuery({ page, limit: 12 });

    const [createSubject] = useCreateSubjectMutation();
    const [updateSubject] = useUpdateSubjectMutation();
    const [deleteSubject] = useDeleteSubjectMutation();

    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [activeTab, setActiveTab] = useState('core');
    const {
        handleSubmit: handleFormSubmit,
        watch,
        reset,
        setValue,
        formState: { errors: formErrors, isSubmitting },
    } = useForm<SubjectFormData>({
        resolver: zodResolver(subjectSchema),
        defaultValues: {
            name: '',
            code: '',
            description: '',
            subject_type: 'CORE',
            is_practical: false,
            is_active: true,
            credit_hours: 0,
            color_code: '#4f46e5',
            is_compulsory: true,
            assessment_weights: { theory: 100, practical: 0 },
        },
    });
    const formData = watch();

    const subjects = subjectsRes?.data || [];
    const filteredSubjects = subjects.filter(sub =>
        (sub.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sub.code || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenCreate = () => {
        setSelectedSubject(null);
        reset({
            name: '',
            code: '',
            description: '',
            subject_type: 'CORE',
            is_practical: false,
            is_active: true,
            credit_hours: 0,
            color_code: '#4f46e5',
            is_compulsory: true,
            assessment_weights: { theory: 100, practical: 0 },
        });
        setActiveTab('core');
        setIsSubjectModalOpen(true);
    };

    const handleOpenEdit = (subject: Subject) => {
        setSelectedSubject(subject);
        reset({
            name: subject.name,
            code: subject.code || '',
            description: subject.description || '',
            subject_type: subject.subject_type || 'CORE',
            is_practical: subject.is_practical,
            is_active: subject.is_active ?? true,
            credit_hours: subject.credit_hours || 0,
            color_code: subject.color_code || '#4f46e5',
            is_compulsory: subject.is_compulsory,
            assessment_weights: {
                theory: subject.assessment_weights?.theory || 100,
                practical: subject.assessment_weights?.practical || 0,
            }
        });
        setActiveTab('core');
        setIsSubjectModalOpen(true);
    };

    const onSubmit = async (data: SubjectFormData) => {
        try {
            if (selectedSubject) {
                await updateSubject({ id: selectedSubject.id, data }).unwrap();
                success('Subject Updated', 'Discipline registry has been synchronized.');
            } else {
                await createSubject(data).unwrap();
                success('Subject Defined', 'New academic discipline has been registered.');
            }
            setIsSubjectModalOpen(false);
        } catch (error) {
            showAlert({
                title: 'Operation Failed',
                description: formatApiError(error),
                variant: 'error'
            });
            console.error('Subject operation failed:', error);
        }
    };

    const handleDelete = async () => {
        if (!selectedSubject) return;
        try {
            await deleteSubject(selectedSubject.id).unwrap();
            setIsConfirmOpen(false);
            success('Subject Purged', 'Academic discipline has been permanently excised.');
        } catch (error) {
            showAlert({
                title: 'Purge Failed',
                description: formatApiError(error),
                variant: 'error'
            });
            console.error('Delete failed:', error);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-[1400px] mx-auto space-y-4">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-surface border border-border rounded-xl shadow-sm text-primary">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground tracking-tight">Academic Disciplines</h1>
                            <p className="text-muted-foreground text-xs font-medium">Manage subject registries and credit frameworks.</p>
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
                            Define Subject
                        </Button>
                    </div>
                </div>

                {/* Filtering Bar */}
                <Card className="p-3 bg-surface border-border shadow-sm rounded-xl">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="relative flex-1 group w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search disciplines..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-9 bg-muted/50 border-border rounded-lg text-sm focus:ring-primary/20"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-9 border-border text-muted-foreground hover:text-foreground">
                                <Filter size={14} className="mr-1.5" />
                                Filters
                            </Button>
                            <div className="px-3 py-1.5 bg-muted/50 border border-border rounded-lg text-[10px] font-bold text-muted-foreground">
                                {subjects.length} Total
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {loading ? (
                        [...Array(8)].map((_, i) => <Skeleton key={i} className="h-60 rounded-2xl" />)
                    ) : filteredSubjects.map((subject) => {
                        const config = TYPE_CONFIG[subject.subject_type] || TYPE_CONFIG['CORE'];
                        const Icon = config.icon;
                        return (
                            <Card key={subject.id} className="group p-5 bg-surface border-border rounded-2xl transition-all hover:shadow-md hover:border-primary/20 overflow-hidden relative">
                                <div
                                    className="absolute top-0 right-0 w-16 h-16 opacity-[0.03] rounded-bl-full"
                                    style={{ backgroundColor: subject.color_code || '#4f46e5' }}
                                />

                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div
                                            className="p-3 rounded-xl shadow-sm"
                                            style={{ backgroundColor: `${subject.color_code}10`, color: subject.color_code }}
                                        >
                                            <Icon size={20} />
                                        </div>
                                        <Badge className={`${config.bg} ${config.color} border-0 rounded-lg text-[9px] font-bold px-2 py-0.5`}>
                                            {config.label}
                                        </Badge>
                                    </div>

                                    <div>
                                        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors uppercase truncate tracking-tight">{subject.name}</h3>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            <span style={{ color: subject.color_code }}>{subject.code || 'NA'}</span>
                                            <span>•</span>
                                            <span>{subject.credit_hours} Credits</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-1 min-h-[22px]">
                                        {subject.is_practical && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded-lg text-[9px] font-bold uppercase tracking-tight">
                                                <FlaskConical size={10} />
                                                Practical
                                            </span>
                                        )}
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-tight ${subject.is_compulsory ? 'bg-muted/50 text-muted-foreground' : 'bg-success/10 text-success'
                                            }`}>
                                            {subject.is_compulsory ? 'Mandatory' : 'Optional'}
                                        </span>
                                    </div>

                                    <div className="pt-3 border-t border-border flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{subject.assessment_weights?.theory || 100}% Theory</span>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => handleOpenEdit(subject)} className="p-1.5 hover:bg-muted text-muted-foreground hover:text-primary rounded-lg transition-colors">
                                                <Edit2 size={12} />
                                            </button>
                                            <button onClick={() => { setSelectedSubject(subject); setIsConfirmOpen(true); }} className="p-1.5 hover:bg-muted text-muted-foreground hover:text-destructive rounded-lg transition-colors">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {/* Pagination */}
                {subjectsRes?.meta && subjectsRes.meta.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 py-4">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="bg-surface border-border text-muted-foreground hover:text-foreground">
                            <ChevronLeft size={14} />
                        </Button>
                        <span className="text-xs font-bold text-muted-foreground">{page} / {subjectsRes.meta.totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(subjectsRes.meta.totalPages, p + 1))} disabled={page === subjectsRes.meta.totalPages} className="bg-surface border-border text-muted-foreground hover:text-foreground">
                            <ChevronRight size={14} />
                        </Button>
                    </div>
                )}
            </div>

            {/* Modal */}
            <Modal
                isOpen={isSubjectModalOpen}
                onClose={() => setIsSubjectModalOpen(false)}
                title={selectedSubject ? 'Edit Subject' : 'Add Subject'}
                size="lg"
            >
                <form onSubmit={handleFormSubmit(onSubmit)} className="space-y-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-10 p-1 bg-muted/50 rounded-lg">
                            <TabsTrigger value="core" className="text-[10px] font-bold uppercase tracking-wide rounded-md">Core Info</TabsTrigger>
                            <TabsTrigger value="logic" className="text-[10px] font-bold uppercase tracking-wide rounded-md">Logic</TabsTrigger>
                            <TabsTrigger value="assessment" className="text-[10px] font-bold uppercase tracking-wide rounded-md">Assessment</TabsTrigger>
                        </TabsList>

                        <div className="mt-4 min-h-[280px]">
                            <TabsContent value="core" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Subject Name *</label>
                                        <Input
                                            placeholder="Mathematics"
                                            value={formData.name || ''}
                                            onChange={e => setValue('name', e.target.value, { shouldValidate: true })}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                            error={formErrors.name?.message}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Code</label>
                                        <Input
                                            placeholder="MATH"
                                            value={formData.code || ''}
                                            onChange={e => setValue('code', e.target.value)}
                                            className="h-10 rounded-lg uppercase bg-surface border-border text-foreground focus:ring-primary/20"
                                            error={formErrors.code?.message}
                                        />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Taxonomy Vertical</label>
                                        <Select
                                            value={formData.subject_type || 'CORE'}
                                            onChange={e => setValue('subject_type', e.target.value as 'CORE' | 'ELECTIVE' | 'LANGUAGE' | 'VOCATIONAL', { shouldValidate: true })}
                                            options={[
                                                { value: 'CORE', label: 'Core Discipline' },
                                                { value: 'ELECTIVE', label: 'Elective Branch' },
                                                { value: 'LANGUAGE', label: 'Linguistic Study' },
                                                { value: 'VOCATIONAL', label: 'Vocational Training' }
                                            ]}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                        {formErrors.subject_type && <p className="text-xs text-red-500">{formErrors.subject_type.message}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Credit Weight</label>
                                        <Input
                                            type="number"
                                            value={formData.credit_hours ?? 0}
                                            onChange={e => setValue('credit_hours', parseInt(e.target.value, 10) || 0)}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="logic" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-4 rounded-xl border border-border">
                                    <div
                                        onClick={() => setValue('is_compulsory', !formData.is_compulsory)}
                                        className="flex items-center gap-3 cursor-pointer group"
                                    >
                                        <div className={`w-9 h-5 rounded-full p-1 transition-colors ${formData.is_compulsory ? 'bg-primary' : 'bg-muted'}`}>
                                            <div className={`w-3 h-3 bg-surface rounded-full transition-transform ${formData.is_compulsory ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-xs font-bold text-muted-foreground uppercase">Compulsory</span>
                                    </div>
                                    <div
                                        onClick={() => setValue('is_practical', !formData.is_practical)}
                                        className="flex items-center gap-3 cursor-pointer group"
                                    >
                                        <div className={`w-9 h-5 rounded-full p-1 transition-colors ${formData.is_practical ? 'bg-primary' : 'bg-muted'}`}>
                                            <div className={`w-3 h-3 bg-surface rounded-full transition-transform ${formData.is_practical ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-xs font-bold text-muted-foreground uppercase">Practical</span>
                                    </div>
                                    <div
                                        onClick={() => setValue('is_active', !formData.is_active)}
                                        className="flex items-center gap-3 cursor-pointer group"
                                    >
                                        <div className={`w-9 h-5 rounded-full p-1 transition-colors ${formData.is_active ? 'bg-primary' : 'bg-muted'}`}>
                                            <div className={`w-3 h-3 bg-surface rounded-full transition-transform ${formData.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-xs font-bold text-muted-foreground uppercase">Active</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground ml-0.5">Description</label>
                                    <textarea
                                        className="w-full min-h-[100px] p-3 text-sm bg-muted/30 border border-border rounded-xl outline-none focus:bg-surface focus:ring-2 focus:ring-primary/20 text-foreground"
                                        value={formData.description || ''}
                                        onChange={e => setValue('description', e.target.value)}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="assessment" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-foreground ml-0.5">Marker Color</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {PRESET_COLORS.map(c => (
                                            <button
                                                key={c.value}
                                                type="button"
                                                onClick={() => setValue('color_code', c.value)}
                                                className={`w-7 h-7 rounded-lg border-2 transition-all ${formData.color_code === c.value ? 'border-foreground scale-110 shadow-sm' : 'border-transparent hover:scale-105'}`}
                                                style={{ backgroundColor: c.value }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Theory Weight (%)</label>
                                        <Input
                                            type="number"
                                            value={formData.assessment_weights?.theory ?? 0}
                                            onChange={e => setValue('assessment_weights', { ...formData.assessment_weights, theory: parseInt(e.target.value, 10) || 0 }, { shouldValidate: true })}
                                            className="h-10 rounded-lg text-center font-bold bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Practical Weight (%)</label>
                                        <Input
                                            type="number"
                                            value={formData.assessment_weights?.practical ?? 0}
                                            onChange={e => setValue('assessment_weights', { ...formData.assessment_weights, practical: parseInt(e.target.value, 10) || 0 }, { shouldValidate: true })}
                                            className="h-10 rounded-lg text-center font-bold bg-surface border-border text-foreground focus:ring-primary/20"
                                            error={formErrors.assessment_weights?.practical?.message}
                                        />
                                    </div>
                                </div>
                            </TabsContent>
                        </div>

                        <div className="flex gap-2 justify-end pt-4 border-t border-border">
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsSubjectModalOpen(false)}>Cancel</Button>
                            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-primary text-primary-foreground font-bold hover:bg-primary/90">
                                {isSubmitting ? 'Saving...' : 'Save Subject'}
                            </Button>
                        </div>
                    </Tabs>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleDelete}
                title="Purge Discipline?"
                description="This will permanently excise the subject and historical assessments. Continue?"
                confirmLabel="Confirm Purge"
                variant="danger"
            />
        </div>
    );
}
