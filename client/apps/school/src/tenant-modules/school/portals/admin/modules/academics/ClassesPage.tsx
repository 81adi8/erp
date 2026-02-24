import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    School,
    Plus,
    Edit2,
    Trash2,
    Search,
    RefreshCw,
    Filter,
    ChevronLeft,
    ChevronRight,
    Users,
    Layers,
    LayoutGrid,
    List,
    Languages,
    History,
    FileText,
    Check,
    BookCopy
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
import { useNavigate } from 'react-router-dom';
import {
    useGetClassesQuery,
    useCreateClassMutation,
    useUpdateClassMutation,
    useDeleteClassMutation,
    useCreateSectionMutation,
} from '@core/api/endpoints/academicsApi';
import type { ClassModel } from '@core/api/endpoints/academicsApi';
import { formatApiError } from '@/common/services/apiHelpers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { classSchema, type ClassFormData } from '@/core/validation/schemas';

const CATEGORY_TAGS: Record<string, { label: string, color: string, bg: string }> = {
    'PRE_PRIMARY': { label: 'Pre-Primary', color: 'text-destructive', bg: 'bg-destructive/10' },
    'PRIMARY': { label: 'Primary', color: 'text-success', bg: 'bg-success/10' },
    'MIDDLE': { label: 'Middle', color: 'text-warning', bg: 'bg-warning/10' },
    'SECONDARY': { label: 'Secondary', color: 'text-primary', bg: 'bg-primary/10' },
    'HIGHER_SECONDARY': { label: 'Higher Secondary', color: 'text-accent-foreground', bg: 'bg-accent' },
};

export default function ClassesPage() {
    const navigate = useNavigate();
    const { success, showAlert } = useAlert();
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const { data: classesRes, isLoading: loading, isFetching, refetch } = useGetClassesQuery({ page, limit: 12 });

    const [createClass] = useCreateClassMutation();
    const [updateClass] = useUpdateClassMutation();
    const [deleteClass] = useDeleteClassMutation();
    const [createSection] = useCreateSectionMutation();

    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState<ClassModel | null>(null);
    const [activeTab, setActiveTab] = useState('basic');
    const {
        handleSubmit: handleClassFormSubmit,
        reset: resetClassForm,
        watch: watchClassForm,
        setValue: setClassValue,
        formState: { errors: classFormErrors, isSubmitting: isClassSubmitting },
    } = useForm<ClassFormData>({
        resolver: zodResolver(classSchema),
        defaultValues: {
            name: '',
            code: '',
            numeric_grade: 0,
            category: 'PRIMARY',
            language_of_instruction: 'English',
            display_order: 0,
            description: '',
            is_active: true,
            next_class_id: '',
            is_terminal_class: false,
            min_passing_percentage: 40,
        },
    });
    const classFormData = watchClassForm();

    const classSectionSchema = z.object({
        name: z.string().min(1, 'Division name is required'),
        capacity: z.coerce.number().min(0).optional(),
    });
    type ClassSectionFormData = z.infer<typeof classSectionSchema>;
    const {
        register: registerSection,
        handleSubmit: handleSectionFormSubmit,
        reset: resetSectionForm,
        watch: watchSectionForm,
        setValue: setSectionValue,
        formState: { errors: sectionFormErrors, isSubmitting: isSectionSubmitting },
    } = useForm<ClassSectionFormData>({
        resolver: zodResolver(classSectionSchema),
        defaultValues: {
            name: '',
            capacity: 0,
        },
    });
    const sectionFormData = watchSectionForm();

    const classes = classesRes?.data || [];
    const filteredClasses = classes.filter(cls =>
        cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenCreateClass = () => {
        setSelectedClass(null);
        resetClassForm({
            name: '',
            code: '',
            numeric_grade: 0,
            category: 'PRIMARY',
            language_of_instruction: 'English',
            display_order: classes.length + 1,
            description: '',
            is_active: true,
            next_class_id: '',
            is_terminal_class: false,
            min_passing_percentage: 40,
        });
        setActiveTab('basic');
        setIsClassModalOpen(true);
    };

    const handleOpenEditClass = (cls: ClassModel) => {
        setSelectedClass(cls);
        resetClassForm({
            name: cls.name,
            code: cls.code || '',
            numeric_grade: cls.numeric_grade || 0,
            category: cls.category || 'PRIMARY',
            language_of_instruction: cls.language_of_instruction || 'English',
            display_order: cls.display_order || 0,
            description: cls.description || '',
            is_active: cls.is_active ?? true,
            next_class_id: cls.next_class_id || '',
            is_terminal_class: cls.is_terminal_class,
            min_passing_percentage: cls.min_passing_percentage || 40,
        });
        setActiveTab('basic');
        setIsClassModalOpen(true);
    };

    const handleClassSubmit = async (data: ClassFormData) => {
        try {
            const payload = {
                ...data,
                next_class_id: data.next_class_id || null,
            };
            if (selectedClass) {
                await updateClass({ id: selectedClass.id, data: payload }).unwrap();
                success('Grade Updated', 'Academic vertical has been synchronized.');
            } else {
                await createClass(payload).unwrap();
                success('Grade Registered', 'New academic vertical has been initialized.');
            }
            setIsClassModalOpen(false);
        } catch (error) {
            showAlert({
                title: 'Operation Failed',
                description: formatApiError(error),
                variant: 'error'
            });
            console.error('Class operation failed:', error);
        }
    };

    const handleSectionSubmit = async (data: ClassSectionFormData) => {
        if (!selectedClass) return;
        try {
            await createSection({
                classId: selectedClass.id,
                data: {
                    ...data,
                    capacity: data.capacity || 0,
                }
            }).unwrap();
            setIsSectionModalOpen(false);
            resetSectionForm({ name: '', capacity: 0 });
            success('Division Allocated', 'New section context has been registered.');
        } catch (error) {
            showAlert({
                title: 'Allocation Failed',
                description: formatApiError(error),
                variant: 'error'
            });
            console.error('Section creation failed:', error);
        }
    };

    const handleDeleteClass = async () => {
        if (!selectedClass) return;
        try {
            await deleteClass(selectedClass.id).unwrap();
            setIsConfirmOpen(false);
            success('Grade Deconstructed', 'Academic vertical has been permanently excised.');
        } catch (error) {
            showAlert({
                title: 'Deconstruction Failed',
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
                            <School size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground tracking-tight">Grade Spectrum</h1>
                            <p className="text-muted-foreground text-xs font-medium">Define academic verticals and organizations.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex bg-surface p-1 rounded-lg border border-border">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <List size={16} />
                            </button>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => refetch()} className="bg-surface border-border text-foreground hover:bg-muted">
                            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                        </Button>
                        <Button
                            onClick={handleOpenCreateClass}
                            size="sm"
                            className="bg-primary text-primary-foreground border-0 shadow-sm hover:bg-primary/90"
                        >
                            <Plus size={16} className="mr-1" />
                            Add Class
                        </Button>
                    </div>
                </div>

                {/* Filter Matrix */}
                <Card className="p-3 bg-surface border-border shadow-sm rounded-xl">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="relative flex-1 group w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search classes..."
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
                            <div className="px-3 py-1.5 bg-muted/50 border border-border rounded-lg font-bold text-[10px] text-muted-foreground">
                                {classes.length} Entities
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Content */}
                <AnimatePresence mode="wait">
                    {viewMode === 'grid' ? (
                        <motion.div
                            key="grid"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                        >
                            {loading ? (
                                [...Array(8)].map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)
                            ) : filteredClasses.map((cls) => {
                                const tag = CATEGORY_TAGS[cls.category || 'PRIMARY'] || CATEGORY_TAGS['PRIMARY'];
                                return (
                                    <Card key={cls.id} className="group p-4 bg-surface border-border rounded-2xl transition-all hover:shadow-md hover:border-primary/20">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="p-2.5 bg-muted/50 rounded-xl text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                    <School size={20} />
                                                </div>
                                                <Badge className={`${tag.bg} ${tag.color} border-0 rounded-lg text-[9px] font-bold px-2 py-0.5`}>
                                                    {tag.label}
                                                </Badge>
                                            </div>

                                            <div>
                                                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors uppercase truncate">{cls.name}</h3>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{cls.code || 'NO CODE'} • RANK {cls.numeric_grade || 0}</p>
                                            </div>

                                            <div className="flex flex-wrap gap-1 min-h-[24px]">
                                                {cls.sections?.map(s => (
                                                    <span key={s.id} className="inline-flex items-center px-2 py-0.5 rounded-lg bg-muted/50 border border-border text-[9px] font-bold text-muted-foreground">
                                                        {s.name}
                                                    </span>
                                                ))}
                                                <button
                                                    onClick={() => { setSelectedClass(cls); resetSectionForm({ name: '', capacity: 0 }); setIsSectionModalOpen(true); }}
                                                    className="w-5 h-5 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                                                >
                                                    <Plus size={10} strokeWidth={4} />
                                                </button>
                                            </div>

                                            <div className="pt-3 border-t border-border flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Users size={14} />
                                                    <span className="text-[10px] font-bold">0 Pupils</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => navigate(`/admin/academics/classes/${cls.id}/subjects`)}
                                                        className="p-1.5 hover:bg-muted text-muted-foreground hover:text-primary rounded-lg transition-colors"
                                                        title="Subject Matrix"
                                                    >
                                                        <BookCopy size={12} />
                                                    </button>
                                                    <button onClick={() => handleOpenEditClass(cls)} className="p-1.5 hover:bg-muted text-muted-foreground hover:text-primary rounded-lg transition-colors">
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button onClick={() => { setSelectedClass(cls); setIsConfirmOpen(true); }} className="p-1.5 hover:bg-muted text-muted-foreground hover:text-destructive rounded-lg transition-colors">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm"
                        >
                            <table className="w-full text-left">
                                <thead className="bg-muted/50 border-b border-border">
                                    <tr>
                                        <th className="px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Designation</th>
                                        <th className="px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Vertical</th>
                                        <th className="px-5 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Divisions</th>
                                        <th className="px-5 py-3 text-right text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredClasses.map((cls) => (
                                        <tr key={cls.id} className="hover:bg-muted/30 transition-colors group">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 bg-muted rounded-lg text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                        <School size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-foreground uppercase tracking-tight">{cls.name}</div>
                                                        <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{cls.code || 'NULL'} • RANK {cls.numeric_grade}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <Badge className={`${CATEGORY_TAGS[cls.category || 'PRIMARY']?.bg} ${CATEGORY_TAGS[cls.category || 'PRIMARY']?.color} border-0 rounded-lg text-[9px] font-bold px-2 py-0.5`}>
                                                    {CATEGORY_TAGS[cls.category || 'PRIMARY']?.label}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-1">
                                                    {cls.sections?.map(s => <span key={s.id} className="text-[10px] font-bold text-muted-foreground">[{s.name}]</span>)}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => navigate(`/admin/academics/classes/${cls.id}/subjects`)}
                                                        className="p-1.5 hover:bg-muted text-muted-foreground hover:text-primary rounded-lg transition-colors"
                                                        title="Subject Matrix"
                                                    >
                                                        <BookCopy size={12} />
                                                    </button>
                                                    <button onClick={() => handleOpenEditClass(cls)} className="p-1.5 hover:bg-muted text-muted-foreground hover:text-primary rounded-lg transition-colors">
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button onClick={() => { setSelectedClass(cls); setIsConfirmOpen(true); }} className="p-1.5 hover:bg-muted text-muted-foreground hover:text-destructive rounded-lg transition-colors">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Class Modal */}
            <Modal
                isOpen={isClassModalOpen}
                onClose={() => setIsClassModalOpen(false)}
                title={selectedClass ? 'Modify Class' : 'New Class'}
                size="lg"
            >
                <form onSubmit={handleClassFormSubmit(handleClassSubmit)} className="space-y-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-10 p-1 bg-muted/50 rounded-lg">
                            <TabsTrigger value="basic" className="text-[10px] font-bold uppercase tracking-wide rounded-md">Basic Info</TabsTrigger>
                            <TabsTrigger value="taxonomy" className="text-[10px] font-bold uppercase tracking-wide rounded-md">Taxonomy</TabsTrigger>
                            <TabsTrigger value="advanced" className="text-[10px] font-bold uppercase tracking-wide rounded-md">Advanced</TabsTrigger>
                        </TabsList>

                        <div className="mt-4 min-h-[280px]">
                            <TabsContent value="basic" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground ml-0.5">Class Designation *</label>
                                    <Input
                                        placeholder="Grade 10 - Science"
                                        value={classFormData.name || ''}
                                        onChange={e => setClassValue('name', e.target.value, { shouldValidate: true })}
                                        className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                        error={classFormErrors.name?.message}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Registry Code</label>
                                        <Input
                                            placeholder="G10"
                                            value={classFormData.code || ''}
                                            onChange={e => setClassValue('code', e.target.value)}
                                            className="h-10 rounded-lg uppercase bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Numeric Rank</label>
                                        <Input
                                            type="number"
                                            value={classFormData.numeric_grade ?? 0}
                                            onChange={e => setClassValue('numeric_grade', parseInt(e.target.value, 10) || 0)}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="taxonomy" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Pedagogical Vertical</label>
                                        <Select
                                            value={classFormData.category || 'PRIMARY'}
                                            onChange={e => setClassValue('category', e.target.value, { shouldValidate: true })}
                                            options={[
                                                { value: 'PRE_PRIMARY', label: 'Pre-Primary' },
                                                { value: 'PRIMARY', label: 'Primary' },
                                                { value: 'MIDDLE', label: 'Middle' },
                                                { value: 'SECONDARY', label: 'Secondary' },
                                                { value: 'HIGHER_SECONDARY', label: 'Higher Secondary' }
                                            ]}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                        {classFormErrors.category && <p className="text-xs text-red-500">{classFormErrors.category.message}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Linguistic Medium</label>
                                        <Select
                                            value={classFormData.language_of_instruction || ''}
                                            onChange={e => setClassValue('language_of_instruction', e.target.value)}
                                            options={[
                                                { value: 'English', label: 'English' },
                                                { value: 'Hindi', label: 'Hindi' }
                                            ]}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="advanced" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground ml-0.5">Detailed Description</label>
                                    <textarea
                                        className="w-full min-h-[100px] p-3 text-sm bg-muted/30 border border-border rounded-xl outline-none focus:bg-surface focus:ring-2 focus:ring-primary/20 text-foreground"
                                        value={classFormData.description || ''}
                                        onChange={e => setClassValue('description', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Successor Grade (Promotion Path)</label>
                                        <Select
                                            value={classFormData.next_class_id || ''}
                                            onChange={e => setClassValue('next_class_id', e.target.value)}
                                            options={[
                                                { value: '', label: 'None (Manual Override)' },
                                                ...classes.filter(c => c.id !== selectedClass?.id).map(c => ({ value: c.id, label: c.name }))
                                            ]}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Min Promotion Criteria (%)</label>
                                        <Input
                                            type="number"
                                            value={classFormData.min_passing_percentage ?? 40}
                                            onChange={e => setClassValue('min_passing_percentage', parseFloat(e.target.value) || 0)}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                            error={classFormErrors.min_passing_percentage?.message}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3 pt-6">
                                        <div
                                            onClick={() => setClassValue('is_terminal_class', !classFormData.is_terminal_class)}
                                            className={`w-9 h-5 rounded-full p-1 cursor-pointer transition-colors ${classFormData.is_terminal_class ? 'bg-primary' : 'bg-muted'}`}
                                        >
                                            <div className={`w-3 h-3 bg-surface rounded-full transition-transform ${classFormData.is_terminal_class ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-xs font-bold text-muted-foreground uppercase">Terminal Grade</span>
                                    </div>
                                    <div className="flex items-center gap-3 pt-6">
                                        <div
                                            onClick={() => setClassValue('is_active', !classFormData.is_active)}
                                            className={`w-9 h-5 rounded-full p-1 cursor-pointer transition-colors ${classFormData.is_active ? 'bg-primary' : 'bg-muted'}`}
                                        >
                                            <div className={`w-3 h-3 bg-surface rounded-full transition-transform ${classFormData.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-xs font-bold text-muted-foreground uppercase">Active Registry</span>
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>

                    <div className="flex gap-2 justify-end pt-4 border-t border-border">
                        <Button type="button" variant="outline" size="sm" onClick={() => setIsClassModalOpen(false)}>Cancel</Button>
                        <Button type="submit" size="sm" disabled={isClassSubmitting} className="bg-primary text-primary-foreground font-bold hover:bg-primary/90">
                            {isClassSubmitting ? 'Saving...' : 'Save Class'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Section Modal */}
            <Modal
                isOpen={isSectionModalOpen}
                onClose={() => setIsSectionModalOpen(false)}
                title={`New Section: ${selectedClass?.name}`}
                size="md"
            >
                <form onSubmit={handleSectionFormSubmit(handleSectionSubmit)} className="space-y-4 pt-1">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground ml-0.5">Division Name *</label>
                        <Input
                            placeholder="Section A"
                            {...registerSection('name')}
                            className="h-10 rounded-lg font-bold bg-surface border-border text-foreground focus:ring-primary/20"
                            error={sectionFormErrors.name?.message}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground ml-0.5">Max Occupancy</label>
                        <Input
                            type="number"
                            placeholder="40"
                            value={sectionFormData.capacity ?? 0}
                            onChange={e => setSectionValue('capacity', parseInt(e.target.value, 10) || 0, { shouldValidate: true })}
                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                            error={sectionFormErrors.capacity?.message}
                        />
                    </div>
                    <div className="flex gap-2 justify-end pt-4">
                        <Button type="button" variant="outline" size="sm" onClick={() => setIsSectionModalOpen(false)}>Cancel</Button>
                        <Button type="submit" size="sm" disabled={isSectionSubmitting} className="bg-primary text-primary-foreground font-bold hover:bg-primary/90">
                            {isSectionSubmitting ? 'Saving...' : 'Allocate Section'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleDeleteClass}
                title="Deconstruct Class?"
                description="This will remove the class and all associated divisions. Continue?"
                confirmLabel="Finalize Delete"
                variant="danger"
            />
        </div>
    );
}
