import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Layers,
    Plus,
    Edit2,
    Trash2,
    Search,
    RefreshCw,
    Filter,
    ChevronLeft,
    ChevronRight,
    Users,
    MapPin,
    School,
    User,
    Activity,
    Shield,
    FileText
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
    SearchableSelect,
    useAlert
} from '@erp/common';
import {
    useGetSectionsQuery,
    useGetClassesQuery,
    useUpdateSectionMutation,
    useDeleteSectionMutation,
    useCreateSectionMutation,
} from '@core/api/endpoints/academicsApi';
import { useGetUsersQuery } from '@core/api/endpoints/usersApi';
import type { Section } from '@core/api/endpoints/academicsApi';
import { formatApiError } from '@/common/services/apiHelpers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sectionSchema, type SectionFormData } from '@/core/validation/schemas';

export default function SectionsPage() {
    const [page, setPage] = useState(1);
    const { success, showAlert } = useAlert();
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    const { data: sectionsRes, isLoading: loading, isFetching, refetch } = useGetSectionsQuery({
        classId: selectedClassId || undefined,
        limit: 12,
        page
    });
    const { data: classesRes } = useGetClassesQuery({ limit: 100 });
    const { data: teachersRes } = useGetUsersQuery({ role: 'teacher', limit: 100 });

    const [createSection] = useCreateSectionMutation();
    const [updateSection] = useUpdateSectionMutation();
    const [deleteSection] = useDeleteSectionMutation();

    const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedSection, setSelectedSection] = useState<Section | null>(null);
    const [activeTab, setActiveTab] = useState('identity');
    const {
        handleSubmit: handleFormSubmit,
        watch,
        reset,
        setValue,
        formState: { errors: formErrors, isSubmitting },
    } = useForm<SectionFormData>({
        resolver: zodResolver(sectionSchema),
        defaultValues: {
            name: '',
            capacity: 0,
            class_id: '',
            class_teacher_id: '',
            room_number: '',
            floor: '',
            wing: '',
            attendance_mode: 'DAILY',
            is_active: true,
        },
    });
    const formData = watch();

    const sections = sectionsRes?.data || [];
    const filteredSections = sections.filter(sec =>
        sec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sec.class?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenCreate = () => {
        setSelectedSection(null);
        reset({
            name: '',
            capacity: 0,
            class_id: selectedClassId,
            class_teacher_id: '',
            room_number: '',
            floor: '',
            wing: '',
            attendance_mode: 'DAILY',
            is_active: true
        });
        setActiveTab('identity');
        setIsSectionModalOpen(true);
    };

    const handleOpenEdit = (section: Section) => {
        setSelectedSection(section);
        reset({
            name: section.name,
            capacity: section.capacity || 0,
            class_id: section.class_id,
            class_teacher_id: section.class_teacher_id || '',
            room_number: section.room_number || '',
            floor: section.floor || '',
            wing: section.wing || '',
            attendance_mode: section.attendance_mode || 'DAILY',
            is_active: section.is_active ?? true
        });
        setActiveTab('identity');
        setIsSectionModalOpen(true);
    };

    const onSubmit = async (data: SectionFormData) => {
        try {
            if (selectedSection) {
                await updateSection({ id: selectedSection.id, data }).unwrap();
                success('Section Updated', 'Division registry has been synchronized.');
            } else {
                await createSection({ classId: data.class_id, data }).unwrap();
                success('Section Allocated', 'New division unit has been registered.');
            }
            setIsSectionModalOpen(false);
        } catch (error) {
            showAlert({
                title: 'Operation Failed',
                description: formatApiError(error),
                variant: 'error'
            });
            console.error('Section operation failed:', error);
        }
    };

    const handleDelete = async () => {
        if (!selectedSection) return;
        try {
            await deleteSection(selectedSection.id).unwrap();
            setIsConfirmOpen(false);
            success('Section Purged', 'Division unit has been permanently excised.');
        } catch (error) {
            showAlert({
                title: 'Purge Failed',
                description: formatApiError(error),
                variant: 'error'
            });
            console.error('Delete failed:', error);
        }
    };

    const classOptions = [
        { value: '', label: 'All Grades' },
        ...(classesRes?.data.map(c => ({ value: c.id, label: c.name })) || [])
    ];

    const teacherOptions = [
        { value: '', label: 'Select Teacher' },
        ...(teachersRes?.data.map(t => ({ value: t.id, label: `${t.firstName} ${t.lastName}` })) || [])
    ];

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-[1400px] mx-auto space-y-4">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-surface border border-border rounded-xl shadow-sm text-primary">
                            <Layers size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-foreground tracking-tight">Division Registry</h1>
                            <p className="text-muted-foreground text-xs font-medium">Manage localized sections and faculty assignments.</p>
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
                            Allocate Section
                        </Button>
                    </div>
                </div>

                {/* Filtering Bar */}
                <Card className="p-3 bg-surface border-border shadow-sm rounded-xl">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="relative flex-1 group w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search sections..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 h-9 bg-muted/50 border-border rounded-lg text-sm focus:ring-primary/20"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-2 py-0.5">
                                <School size={14} className="text-muted-foreground ml-1" />
                                <SearchableSelect
                                    value={selectedClassId}
                                    onChange={(val) => setSelectedClassId(val)}
                                    options={classOptions}
                                    className="border-0 bg-transparent min-w-[140px]"
                                    placeholder="All Grades"
                                />
                            </div>
                            <div className="px-3 py-1.5 bg-muted/50 border border-border rounded-lg text-[10px] font-bold text-muted-foreground">
                                {sectionsRes?.meta?.total || 0} Total
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {loading ? (
                        [...Array(8)].map((_, i) => <Skeleton key={i} className="h-60 rounded-2xl" />)
                    ) : filteredSections.map((section) => (
                        <Card key={section.id} className="group p-5 bg-surface border-border rounded-2xl transition-all hover:shadow-md hover:border-primary/20">
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="p-2.5 bg-muted/50 rounded-xl text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                        <Layers size={22} />
                                    </div>
                                    <Badge className="bg-muted text-muted-foreground border-0 rounded-lg text-[10px] font-bold px-2 py-0.5">
                                        {section.class?.name || 'Generic'}
                                    </Badge>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">Section {section.name}</h3>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        <span>PARENT: {section.class?.code || 'NA'}</span>
                                    </div>
                                </div>

                                <div className="space-y-2 p-3 bg-muted/30 rounded-xl border border-border">
                                    <div className="flex items-center justify-between text-[11px] font-bold">
                                        <span className="text-muted-foreground">ROOM</span>
                                        <span className="text-foreground">{section.room_number || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] font-bold">
                                        <span className="text-muted-foreground">CAPACITY</span>
                                        <span className="text-foreground">{section.capacity || 0} Max</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] font-bold">
                                        <span className="text-muted-foreground">TEACHER</span>
                                        <span className="text-foreground truncate max-w-[100px] text-right">{section.classTeacher?.name.split(' ')[0] || 'Vacant'}</span>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-border flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                                        <Shield size={12} className={section.attendance_mode === 'DAILY' ? 'text-success' : 'text-info'} />
                                        {section.attendance_mode.replace('_', ' ')}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => handleOpenEdit(section)} className="p-1.5 hover:bg-muted text-muted-foreground hover:text-primary rounded-lg transition-colors">
                                            <Edit2 size={12} />
                                        </button>
                                        <button onClick={() => { setSelectedSection(section); setIsConfirmOpen(true); }} className="p-1.5 hover:bg-muted text-muted-foreground hover:text-destructive rounded-lg transition-colors">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Pagination */}
                {sectionsRes?.meta && sectionsRes.meta.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 py-4">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="bg-surface border-border text-muted-foreground hover:text-foreground">
                            <ChevronLeft size={14} />
                        </Button>
                        <span className="text-xs font-bold text-muted-foreground">{page} / {sectionsRes.meta.totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(sectionsRes.meta.totalPages, p + 1))} disabled={page === sectionsRes.meta.totalPages} className="bg-surface border-border text-muted-foreground hover:text-foreground">
                            <ChevronRight size={14} />
                        </Button>
                    </div>
                )}
            </div>

            {/* Modal */}
            <Modal
                isOpen={isSectionModalOpen}
                onClose={() => setIsSectionModalOpen(false)}
                title={selectedSection ? 'Edit Section' : 'Add Section'}
                size="lg"
            >
                <form onSubmit={handleFormSubmit(onSubmit)} className="space-y-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-10 p-1 bg-muted/50 rounded-lg">
                            <TabsTrigger value="identity" className="text-[10px] font-bold uppercase tracking-wide rounded-md">Identity</TabsTrigger>
                            <TabsTrigger value="spatial" className="text-[10px] font-bold uppercase tracking-wide rounded-md">Spatial</TabsTrigger>
                            <TabsTrigger value="logic" className="text-[10px] font-bold uppercase tracking-wide rounded-md">Logic</TabsTrigger>
                        </TabsList>

                        <div className="mt-4 min-h-[280px]">
                            <TabsContent value="identity" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <SearchableSelect
                                            label="Parent Grade *"
                                            value={formData.class_id || ''}
                                            onChange={val => setValue('class_id', val, { shouldValidate: true })}
                                            options={classesRes?.data.map(c => ({ value: c.id, label: c.name })) || []}
                                        />
                                        {formErrors.class_id && <p className="text-xs text-red-500">{formErrors.class_id.message}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Section Name *</label>
                                        <Input
                                            placeholder="Section A"
                                            value={formData.name || ''}
                                            onChange={e => setValue('name', e.target.value, { shouldValidate: true })}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                            error={formErrors.name?.message}
                                        />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <SearchableSelect
                                            label="Class Teacher"
                                            value={formData.class_teacher_id || ''}
                                            onChange={val => setValue('class_teacher_id', val)}
                                            options={teacherOptions}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Max Capacity</label>
                                        <Input
                                            type="number"
                                            value={formData.capacity ?? 0}
                                            onChange={e => setValue('capacity', parseInt(e.target.value, 10) || 0, { shouldValidate: true })}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                            error={formErrors.capacity?.message}
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="spatial" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Room</label>
                                        <Input
                                            placeholder="101"
                                            value={formData.room_number || ''}
                                            onChange={e => setValue('room_number', e.target.value)}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Floor</label>
                                        <Input
                                            placeholder="G"
                                            value={formData.floor || ''}
                                            onChange={e => setValue('floor', e.target.value)}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Wing</label>
                                        <Input
                                            placeholder="West"
                                            value={formData.wing || ''}
                                            onChange={e => setValue('wing', e.target.value)}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="logic" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground ml-0.5">Attendance Protocol</label>
                                    <Select
                                        value={formData.attendance_mode || 'DAILY'}
                                        onChange={e => setValue('attendance_mode', e.target.value as 'DAILY' | 'PERIOD_WISE')}
                                        options={[
                                            { value: 'DAILY', label: 'Once Per Day' },
                                            { value: 'PERIOD_WISE', label: 'Every Period' }
                                        ]}
                                        className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                    />
                                </div>
                                <div className="flex items-center gap-3 pt-4">
                                    <div
                                        onClick={() => setValue('is_active', !formData.is_active)}
                                        className={`w-9 h-5 rounded-full p-1 cursor-pointer transition-colors ${formData.is_active ? 'bg-success' : 'bg-muted'}`}
                                    >
                                        <div className={`w-3 h-3 bg-surface rounded-full transition-transform ${formData.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </div>
                                    <span className="text-xs font-bold text-muted-foreground">Active Registry</span>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>

                    <div className="flex gap-2 justify-end pt-4 border-t border-border">
                        <Button type="button" variant="outline" size="sm" onClick={() => setIsSectionModalOpen(false)}>Cancel</Button>
                        <Button type="submit" size="sm" disabled={isSubmitting} className="bg-primary text-primary-foreground font-bold hover:bg-primary/90">
                            {isSubmitting ? 'Saving...' : 'Save Section'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleDelete}
                title="Purge Section?"
                description="This will excise the section and all historical records. Continue?"
                confirmLabel="Finalize Purge"
                variant="danger"
            />
        </div>
    );
}
