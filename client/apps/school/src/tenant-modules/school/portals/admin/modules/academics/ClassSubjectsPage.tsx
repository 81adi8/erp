import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookCopy,
    Plus,
    Trash2,
    Search,
    RefreshCw,
    User,
    Clock,
    Trophy,
    Save,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    BookOpen,
    Filter,
    Calendar,
    Settings2,
    Layers,
    Target,
    Shuffle,
    FlaskConical,
    Monitor,
    Dumbbell,
    Info,
    Zap
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
    useFeedback
} from '@erp/common';
import {
    useGetClassesQuery,
    useGetSubjectsQuery,
    useGetClassSubjectsQuery,
    useAssignSubjectToClassMutation,
    useUpdateClassSubjectMutation,
    useRemoveSubjectFromClassMutation,
    type ClassSubject
} from '@core/api/endpoints/academicsApi';
import { useGetEmployeesQuery } from '@core/api/endpoints/employeeApi';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { classSubjectSchema, type ClassSubjectFormData } from '@/core/validation/schemas';

// Day names for display
const DAYS_OF_WEEK = [
    { value: 0, label: 'Sunday', short: 'Sun' },
    { value: 1, label: 'Monday', short: 'Mon' },
    { value: 2, label: 'Tuesday', short: 'Tue' },
    { value: 3, label: 'Wednesday', short: 'Wed' },
    { value: 4, label: 'Thursday', short: 'Thu' },
    { value: 5, label: 'Friday', short: 'Fri' },
    { value: 6, label: 'Saturday', short: 'Sat' }
];

// Slot preference options
const SLOT_PREFERENCES = [
    { value: 'first', label: 'First Periods (1-2)', icon: '🌅' },
    { value: 'morning', label: 'Morning (Before Lunch)', icon: '☀️' },
    { value: 'afternoon', label: 'Afternoon (After Lunch)', icon: '🌤️' },
    { value: 'last', label: 'Last Periods', icon: '🌆' }
];

// Special room types
const ROOM_TYPES = [
    { value: '', label: 'Regular Classroom' },
    { value: 'science_lab', label: 'Science Lab', icon: FlaskConical },
    { value: 'computer_lab', label: 'Computer Lab', icon: Monitor },
    { value: 'sports_ground', label: 'Sports Ground', icon: Dumbbell },
    { value: 'music_room', label: 'Music Room' },
    { value: 'art_room', label: 'Art Room' }
];

interface SchedulingPreferences {
    preferred_days?: number[];
    avoid_days?: number[];
    preferred_slots?: (string | number)[];
    avoid_slots?: number[];
    prefer_consecutive?: boolean;
    min_gap_same_day?: number;
    priority?: number;
    fixed_slots?: Array<{ day: number; slot: number }>;
    spread_evenly?: boolean;
}

type FormData = ClassSubjectFormData & { schedulingPreferences: SchedulingPreferences };

export default function ClassSubjectsPage() {
    const navigate = useNavigate();
    const { classId } = useParams<{ classId: string }>();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<ClassSubject | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');

    // Form State with enhanced scheduling
    const defaultFormData: FormData = {
        subjectId: '',
        teacherId: '',
        periodsPerWeek: 6,
        maxPeriodsPerDay: 2,
        isElective: false,
        maxMarks: 100,
        passingMarks: 33,
        requiresSpecialRoom: false,
        specialRoomType: '',
        schedulingPreferences: {
            preferred_days: [],
            avoid_days: [],
            preferred_slots: [],
            avoid_slots: [],
            prefer_consecutive: false,
            spread_evenly: true,
            priority: 5,
            min_gap_same_day: 0
        }
    };
    const {
        handleSubmit: handleFormSubmit,
        watch,
        setValue,
        getValues,
        reset,
        formState: { errors: formErrors, isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(classSubjectSchema),
        defaultValues: defaultFormData,
    });
    const formData = watch();
    const setFormData = (nextState: FormData | ((prevState: FormData) => FormData)) => {
        const next = typeof nextState === 'function' ? nextState(getValues()) : nextState;
        (Object.keys(next) as Array<keyof FormData>).forEach((key) => {
            setValue(key, next[key], { shouldValidate: true });
        });
    };

    // Queries
    const { data: classesRes } = useGetClassesQuery({});
    const { data: assignmentsRes, isLoading: loading, refetch } = useGetClassSubjectsQuery(classId || '', { skip: !classId });
    const { data: subjectsRes } = useGetSubjectsQuery({ limit: 100 });
    const { data: teachersRes } = useGetEmployeesQuery({ role: 'Teacher' });

    // Mutations
    const [assignSubject, { isLoading: isAssigning }] = useAssignSubjectToClassMutation();
    const [updateAssignment, { isLoading: isUpdating }] = useUpdateClassSubjectMutation();
    const [removeAssignment, { isLoading: isRemoving }] = useRemoveSubjectFromClassMutation();

    // Feedback hook for notifications
    const { success, error: showError } = useFeedback();

    const selectedClass = useMemo(() =>
        classesRes?.data.find(c => c.id === classId),
        [classesRes, classId]);

    const assignments = assignmentsRes?.data || [];
    const filteredAssignments = assignments.filter(a =>
        (a.subject?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.teacher?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenAssign = () => {
        reset(defaultFormData);
        setSelectedAssignment(null);
        setActiveTab('basic');
        setIsAssignModalOpen(true);
    };

    const handleOpenEdit = (assignment: ClassSubject) => {
        setSelectedAssignment(assignment);
        const prefs = assignment.scheduling_preferences || {};
        reset({
            subjectId: assignment.subject_id,
            teacherId: assignment.teacher_id || '',
            periodsPerWeek: assignment.periods_per_week || 6,
            maxPeriodsPerDay: assignment.max_periods_per_day || 2,
            isElective: assignment.is_elective || false,
            maxMarks: assignment.max_marks || 100,
            passingMarks: assignment.passing_marks || 33,
            requiresSpecialRoom: assignment.requires_special_room || false,
            specialRoomType: assignment.special_room_type || '',
            schedulingPreferences: {
                preferred_days: prefs.preferred_days || [],
                avoid_days: prefs.avoid_days || [],
                preferred_slots: prefs.preferred_slots || [],
                avoid_slots: prefs.avoid_slots || [],
                prefer_consecutive: prefs.prefer_consecutive || false,
                spread_evenly: prefs.spread_evenly ?? true,
                priority: prefs.priority || 5,
                min_gap_same_day: prefs.min_gap_same_day || 0
            }
        });
        setActiveTab('basic');
        setIsAssignModalOpen(true);
    };

    const onSubmit = async (data: FormData) => {
        if (!classId) return;

        const payload = {
            subject_id: data.subjectId,
            teacher_id: data.teacherId || null,
            periods_per_week: data.periodsPerWeek,
            max_periods_per_day: data.maxPeriodsPerDay,
            is_elective: data.isElective,
            max_marks: data.maxMarks,
            passing_marks: data.passingMarks,
            requires_special_room: data.requiresSpecialRoom,
            special_room_type: data.specialRoomType || null,
            scheduling_preferences: data.schedulingPreferences
        };

        try {
            if (selectedAssignment) {
                await updateAssignment({
                    classId,
                    subjectId: selectedAssignment.subject_id,
                    data: payload
                }).unwrap();
                success('Subject Updated', 'Subject assignment has been updated successfully.');
            } else {
                await assignSubject({
                    classId,
                    data: payload
                }).unwrap();
                success('Subject Assigned', 'Subject has been assigned to the class successfully.');
            }
            setIsAssignModalOpen(false);
        } catch (err: unknown) {
            const errorMessage = (err as { data?: { message?: string } })?.data?.message || 'Operation failed';
            showError('Error', errorMessage);
        }
    };

    const handleDelete = async () => {
        if (!classId || !selectedAssignment) return;
        try {
            await removeAssignment({
                classId,
                subjectId: selectedAssignment.subject_id
            }).unwrap();
            success('Subject Removed', 'Subject has been removed from the class.');
            setIsConfirmOpen(false);
        } catch (err: unknown) {
            const errorMessage = (err as { data?: { message?: string } })?.data?.message || 'Failed to remove subject';
            showError('Error', errorMessage);
        }
    };

    // Toggle day in array
    const toggleDay = (field: 'preferred_days' | 'avoid_days', day: number) => {
        const current = getValues('schedulingPreferences')?.[field] || [];
        const updated = current.includes(day)
            ? current.filter(d => d !== day)
            : [...current, day];
        setValue('schedulingPreferences', {
            ...(getValues('schedulingPreferences') || {}),
            [field]: updated
        }, { shouldValidate: true });
    };

    // Toggle slot preference
    const toggleSlotPreference = (value: string) => {
        const current = getValues('schedulingPreferences')?.preferred_slots || [];
        const updated = current.includes(value)
            ? current.filter(s => s !== value)
            : [...current, value];
        setValue('schedulingPreferences', {
            ...(getValues('schedulingPreferences') || {}),
            preferred_slots: updated
        }, { shouldValidate: true });
    };

    if (!classId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <AlertCircle size={48} className="text-muted-foreground" />
                <h2 className="text-xl font-bold">No Class Selected</h2>
                <Button onClick={() => navigate('/admin/academics/classes')}>Go back to Classes</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/admin/academics/classes')}
                        className="p-2 h-10 w-10 rounded-xl"
                    >
                        <ArrowLeft size={20} />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            Subject Matrix <span className="text-primary">|</span> {selectedClass?.name}
                        </h1>
                        <p className="text-muted-foreground text-sm">Configure subjects, assignments and academic weights for this class.</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="h-10 bg-surface border-border">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </Button>
                    <Button
                        onClick={handleOpenAssign}
                        className="h-10 bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:bg-primary/90"
                    >
                        <Plus size={18} className="mr-2" />
                        Map Subject
                    </Button>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4 bg-primary/5 border-primary/20 flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase">Subjects</p>
                        <h3 className="text-2xl font-black">{assignments.length}</h3>
                    </div>
                </Card>
                <Card className="p-4 bg-accent/5 border-accent/20 flex items-center gap-4">
                    <div className="p-3 bg-accent/10 rounded-2xl text-accent-foreground">
                        <User size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase">Faculty</p>
                        <h3 className="text-2xl font-black">{new Set(assignments.map(a => a.teacher_id).filter(Boolean)).size}</h3>
                    </div>
                </Card>
                <Card className="p-4 bg-success/5 border-success/20 flex items-center gap-4">
                    <div className="p-3 bg-success/10 rounded-2xl text-success">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase">Weekly Periods</p>
                        <h3 className="text-2xl font-black">{assignments.reduce((sum, a) => sum + (a.periods_per_week || 0), 0)}</h3>
                    </div>
                </Card>
            </div>

            {/* Filter & Search */}
            <Card className="p-3 bg-surface border-border shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 group w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Filter mapped subjects or teachers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-muted/50 border-border h-10"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-10 px-4 border-border text-muted-foreground">
                        <Filter size={16} className="mr-2" />
                        Filters
                    </Button>
                </div>
            </Card>

            {/* Assignment List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {loading ? (
                    [...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-3xl" />)
                ) : filteredAssignments.length === 0 ? (
                    <Card className="col-span-full p-12 flex flex-col items-center justify-center text-center space-y-4 border-dashed border-2">
                        <div className="p-4 bg-muted rounded-full text-muted-foreground">
                            <BookCopy size={40} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">No Subjects Mapped</h3>
                            <p className="text-muted-foreground max-w-xs mx-auto">Start by mapping subjects to this class to define the curriculum and assign teachers.</p>
                        </div>
                        <Button onClick={handleOpenAssign}>Map Your First Subject</Button>
                    </Card>
                ) : filteredAssignments.map((assignment) => (
                    <Card key={assignment.id} className="group p-5 bg-surface border-border hover:border-primary/30 transition-all rounded-[2rem] overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                            <BookOpen size={120} />
                        </div>

                        <div className="relative z-10 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black uppercase tracking-tight group-hover:text-primary transition-colors">
                                        {assignment.subject?.name}
                                    </h3>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge className="bg-muted text-muted-foreground border-border text-[9px] font-bold">
                                            {assignment.subject?.code}
                                        </Badge>
                                        <Badge className={`${assignment.subject?.subject_type === 'CORE' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'} border-0 text-[9px] font-bold uppercase`}>
                                            {assignment.subject?.subject_type}
                                        </Badge>
                                        {assignment.is_elective && (
                                            <Badge className="bg-amber-100 text-amber-700 border-0 text-[9px] font-bold uppercase">ELECTIVE</Badge>
                                        )}
                                        {assignment.requires_special_room && (
                                            <Badge className="bg-violet-100 text-violet-700 border-0 text-[9px] font-bold uppercase">
                                                {assignment.special_room_type?.replace('_', ' ')}
                                            </Badge>
                                        )}
                                        {assignment.scheduling_preferences?.preferred_days?.length > 0 && (
                                            <Badge className="bg-blue-100 text-blue-700 border-0 text-[9px] font-bold">
                                                <Calendar size={10} className="mr-1" />
                                                Scheduled
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleOpenEdit(assignment)}
                                        className="p-2 hover:bg-muted text-muted-foreground hover:text-primary rounded-xl transition-all"
                                    >
                                        <Save size={18} />
                                    </button>
                                    <button
                                        onClick={() => { setSelectedAssignment(assignment); setIsConfirmOpen(true); }}
                                        className="p-2 hover:bg-muted text-muted-foreground hover:text-destructive rounded-xl transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-muted/30 rounded-2xl flex items-center gap-3 border border-transparent hover:border-border transition-colors">
                                    <div className="p-2 bg-surface rounded-xl text-primary shadow-sm border border-border">
                                        <User size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">Faculty</p>
                                        <p className="text-xs font-bold truncate">{assignment.teacher?.name || 'Unassigned'}</p>
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-2xl flex items-center gap-3 border border-transparent hover:border-border transition-colors">
                                    <div className="p-2 bg-surface rounded-xl text-accent-foreground shadow-sm border border-border">
                                        <Clock size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">Frequency</p>
                                        <p className="text-xs font-bold">{assignment.periods_per_week || 0} / Week</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground px-1 uppercase tracking-widest">
                                <div className="flex items-center gap-1.5">
                                    <Trophy size={14} className="text-amber-500" />
                                    <span>MAX: {assignment.max_marks || 0}</span>
                                </div>
                                <div className="flex items-center gap-1.5 border-l border-border pl-4">
                                    <CheckCircle2 size={14} className="text-success" />
                                    <span>PASS: {assignment.passing_marks || 0}</span>
                                </div>
                                {assignment.scheduling_preferences?.priority && assignment.scheduling_preferences.priority !== 5 && (
                                    <div className="flex items-center gap-1.5 border-l border-border pl-4">
                                        <Target size={14} className="text-blue-500" />
                                        <span>Priority: {assignment.scheduling_preferences.priority}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Tab-Based Mapping Modal */}
            <Modal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                title={selectedAssignment ? 'Edit Subject Mapping' : 'Map Subject to Class'}
                size="xl"
            >
                <form onSubmit={handleFormSubmit(onSubmit)} className="space-y-6">
                    {/* Tab Navigation */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="w-full grid grid-cols-3 bg-muted/50 p-1 rounded-2xl">
                            <TabsTrigger value="basic" className="rounded-xl data-[state=active]:bg-surface data-[state=active]:shadow-sm">
                                <Info size={16} className="mr-2" />
                                Basic Info
                            </TabsTrigger>
                            <TabsTrigger value="schedule" className="rounded-xl data-[state=active]:bg-surface data-[state=active]:shadow-sm">
                                <Calendar size={16} className="mr-2" />
                                Schedule
                            </TabsTrigger>
                            <TabsTrigger value="advanced" className="rounded-xl data-[state=active]:bg-surface data-[state=active]:shadow-sm">
                                <Settings2 size={16} className="mr-2" />
                                Advanced
                            </TabsTrigger>
                        </TabsList>

                        {/* Tab 1: Basic Information */}
                        <TabsContent value="basic" className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground">Select Subject *</label>
                                    <Select
                                        value={formData.subjectId}
                                        onChange={e => setFormData({ ...formData, subjectId: e.target.value })}
                                        disabled={!!selectedAssignment}
                                        options={subjectsRes?.data.map(s => ({ value: s.id, label: `${s.name} (${s.code})` })) || []}
                                        className="h-11 rounded-2xl"
                                        placeholder="Choose a subject..."
                                    />
                                    {formErrors.subjectId && <p className="text-xs text-red-500">{formErrors.subjectId.message}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground">Assigned Teacher</label>
                                    <Select
                                        value={formData.teacherId}
                                        onChange={e => setFormData({ ...formData, teacherId: e.target.value })}
                                        options={teachersRes?.data.map((t) => ({ value: t.id, label: `${t.first_name} ${t.last_name}` })) || []}
                                        className="h-11 rounded-2xl"
                                        placeholder="Select faculty member..."
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground">Periods per Week</label>
                                    <div className="relative">
                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            type="number"
                                            min={1}
                                            max={12}
                                            value={formData.periodsPerWeek}
                                            onChange={e => setFormData({ ...formData, periodsPerWeek: parseInt(e.target.value) || 1 })}
                                            className="pl-10 h-11 rounded-2xl bg-muted/30 focus:bg-surface transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground">Max Periods per Day</label>
                                    <div className="relative">
                                        <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            type="number"
                                            min={1}
                                            max={4}
                                            value={formData.maxPeriodsPerDay}
                                            onChange={e => setFormData({ ...formData, maxPeriodsPerDay: parseInt(e.target.value) || 1 })}
                                            className="pl-10 h-11 rounded-2xl bg-muted/30 focus:bg-surface transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground">Maximum Marks</label>
                                    <div className="relative">
                                        <Trophy className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                                        <Input
                                            type="number"
                                            value={formData.maxMarks}
                                            onChange={e => setFormData({ ...formData, maxMarks: parseInt(e.target.value) })}
                                            className="pl-10 h-11 rounded-2xl bg-muted/30 focus:bg-surface transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-foreground">Passing Marks</label>
                                    <div className="relative">
                                        <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success" />
                                        <Input
                                            type="number"
                                            value={formData.passingMarks}
                                            onChange={e => setFormData({ ...formData, passingMarks: parseInt(e.target.value) })}
                                            className="pl-10 h-11 rounded-2xl bg-muted/30 focus:bg-surface transition-all"
                                        />
                                        {formErrors.passingMarks && <p className="text-xs text-red-500 mt-1">{formErrors.passingMarks.message}</p>}
                                    </div>
                                </div>

                                <div className="col-span-full flex items-center gap-3 p-4 bg-muted/30 rounded-2xl">
                                    <div
                                        onClick={() => setFormData({ ...formData, isElective: !formData.isElective })}
                                        className={`w-12 h-7 rounded-full p-1 cursor-pointer transition-colors ${formData.isElective ? 'bg-amber-500' : 'bg-muted'}`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${formData.isElective ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold">Elective Subject</span>
                                        <p className="text-xs text-muted-foreground">Mark this subject as optional for students</p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Tab 2: Scheduling Preferences */}
                        <TabsContent value="schedule" className="pt-6 space-y-6">
                            {/* Preferred Days */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-green-500/10 rounded-lg">
                                        <Calendar size={16} className="text-green-500" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-foreground">Preferred Days</label>
                                        <p className="text-xs text-muted-foreground">Subject will be scheduled on these days first</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {DAYS_OF_WEEK.map(day => (
                                        <button
                                            key={day.value}
                                            type="button"
                                            onClick={() => toggleDay('preferred_days', day.value)}
                                            disabled={formData.schedulingPreferences.avoid_days?.includes(day.value)}
                                            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                                formData.schedulingPreferences.preferred_days?.includes(day.value)
                                                    ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            } ${formData.schedulingPreferences.avoid_days?.includes(day.value) ? 'opacity-30 cursor-not-allowed' : ''}`}
                                        >
                                            {day.short}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Avoid Days */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-red-500/10 rounded-lg">
                                        <AlertCircle size={16} className="text-red-500" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-foreground">Avoid Days</label>
                                        <p className="text-xs text-muted-foreground">Subject will NOT be scheduled on these days</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {DAYS_OF_WEEK.map(day => (
                                        <button
                                            key={day.value}
                                            type="button"
                                            onClick={() => toggleDay('avoid_days', day.value)}
                                            disabled={formData.schedulingPreferences.preferred_days?.includes(day.value)}
                                            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                                formData.schedulingPreferences.avoid_days?.includes(day.value)
                                                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            } ${formData.schedulingPreferences.preferred_days?.includes(day.value) ? 'opacity-30 cursor-not-allowed' : ''}`}
                                        >
                                            {day.short}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Preferred Time Slots */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <Clock size={16} className="text-blue-500" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-foreground">Preferred Time Slots</label>
                                        <p className="text-xs text-muted-foreground">When during the day should this subject be scheduled</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {SLOT_PREFERENCES.map(slot => (
                                        <button
                                            key={slot.value}
                                            type="button"
                                            onClick={() => toggleSlotPreference(slot.value)}
                                            className={`p-4 rounded-2xl text-sm font-bold transition-all flex flex-col items-center gap-2 ${
                                                formData.schedulingPreferences.preferred_slots?.includes(slot.value)
                                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                        >
                                            <span className="text-2xl">{slot.icon}</span>
                                            <span className="text-xs text-center">{slot.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </TabsContent>

                        {/* Tab 3: Advanced Settings */}
                        <TabsContent value="advanced" className="pt-6 space-y-6">
                            {/* Special Room */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-violet-500/10 rounded-lg">
                                        <FlaskConical size={16} className="text-violet-500" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-foreground">Special Room Required</label>
                                        <p className="text-xs text-muted-foreground">Does this subject need a lab or special facility?</p>
                                    </div>
                                </div>
                                <Select
                                    value={formData.specialRoomType}
                                    onChange={e => setFormData({
                                        ...formData,
                                        specialRoomType: e.target.value,
                                        requiresSpecialRoom: !!e.target.value
                                    })}
                                    options={ROOM_TYPES.map(r => ({ value: r.value, label: r.label }))}
                                    className="h-11 rounded-2xl"
                                    placeholder="Regular Classroom"
                                />
                            </div>

                            {/* Priority */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-orange-500/10 rounded-lg">
                                        <Target size={16} className="text-orange-500" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-foreground">Priority Level</label>
                                        <p className="text-xs text-muted-foreground">Higher priority subjects get their preferences first</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl">
                                    <span className="text-xs font-bold text-muted-foreground">Low</span>
                                    <input
                                        type="range"
                                        min={1}
                                        max={10}
                                        value={formData.schedulingPreferences.priority || 5}
                                        onChange={e => setFormData({
                                            ...formData,
                                            schedulingPreferences: {
                                                ...formData.schedulingPreferences,
                                                priority: parseInt(e.target.value)
                                            }
                                        })}
                                        className="flex-1 accent-primary h-2"
                                    />
                                    <span className="text-xs font-bold text-muted-foreground">High</span>
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                        <span className="text-xl font-black text-primary">{formData.schedulingPreferences.priority}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Min Gap Same Day */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-cyan-500/10 rounded-lg">
                                        <Shuffle size={16} className="text-cyan-500" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-bold text-foreground">Minimum Gap Same Day</label>
                                        <p className="text-xs text-muted-foreground">If scheduled twice on the same day, how much gap?</p>
                                    </div>
                                </div>
                                <Select
                                    value={String(formData.schedulingPreferences.min_gap_same_day || 0)}
                                    onChange={e => setFormData({
                                        ...formData,
                                        schedulingPreferences: {
                                            ...formData.schedulingPreferences,
                                            min_gap_same_day: parseInt(e.target.value)
                                        }
                                    })}
                                    options={[
                                        { value: '0', label: 'No gap required' },
                                        { value: '1', label: '1 period gap' },
                                        { value: '2', label: '2 periods gap' },
                                        { value: '3', label: '3 periods gap' }
                                    ]}
                                    className="h-11 rounded-2xl"
                                />
                            </div>

                            {/* Toggle Options */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div
                                    onClick={() => setFormData({
                                        ...formData,
                                        schedulingPreferences: {
                                            ...formData.schedulingPreferences,
                                            prefer_consecutive: !formData.schedulingPreferences.prefer_consecutive
                                        }
                                    })}
                                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                                        formData.schedulingPreferences.prefer_consecutive
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/30'
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 ${formData.schedulingPreferences.prefer_consecutive ? 'bg-primary' : 'bg-muted'}`}>
                                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${formData.schedulingPreferences.prefer_consecutive ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-bold flex items-center gap-2">
                                                <Zap size={16} className="text-amber-500" />
                                                Double Periods
                                            </h5>
                                            <p className="text-xs text-muted-foreground mt-1">Schedule back-to-back periods (great for labs)</p>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    onClick={() => setFormData({
                                        ...formData,
                                        schedulingPreferences: {
                                            ...formData.schedulingPreferences,
                                            spread_evenly: !formData.schedulingPreferences.spread_evenly
                                        }
                                    })}
                                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                                        formData.schedulingPreferences.spread_evenly
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/30'
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 ${formData.schedulingPreferences.spread_evenly ? 'bg-primary' : 'bg-muted'}`}>
                                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${formData.schedulingPreferences.spread_evenly ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-bold flex items-center gap-2">
                                                <Shuffle size={16} className="text-blue-500" />
                                                Spread Evenly
                                            </h5>
                                            <p className="text-xs text-muted-foreground mt-1">Distribute across the week (avoid clustering)</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Footer Buttons */}
                    <div className="flex gap-3 justify-between pt-6 border-t border-border">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Info size={14} />
                            <span>Scheduling preferences optimize automatic timetable generation</span>
                        </div>
                        <div className="flex gap-3">
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsAssignModalOpen(false)} className="h-10 px-6 rounded-xl">
                                Cancel
                            </Button>
                            <Button type="submit" size="sm" disabled={isSubmitting || isAssigning || isUpdating} className="h-10 px-8 bg-primary text-primary-foreground font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20">
                                {isSubmitting || isAssigning || isUpdating ? 'Saving...' : selectedAssignment ? 'Save Changes' : 'Map Subject'}
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleDelete}
                title="Remove Mapping?"
                description={`This will dissociate ${selectedAssignment?.subject?.name} from ${selectedClass?.name}. Academic data for this mapping may be archived. Continue?`}
                confirmLabel="Confirm Removal"
                variant="danger"
            />
        </div>
    );
}
