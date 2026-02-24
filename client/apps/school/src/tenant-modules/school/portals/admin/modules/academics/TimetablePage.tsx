import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Clock,
    Plus,
    Save,
    RefreshCw,
    Users,
    BookOpen,
    Coffee,
    Utensils,
    Zap,
    Grid3x3,
    Lock,
    Unlock,
    Settings2,
    CalendarDays,
    AlertCircle,
    Layers,
    Sliders,
    Timer,
    Sun,
    Moon,
    Check,
    Info,
    ChevronRight,
    Sparkles,
    ShieldCheck,
} from 'lucide-react';
import {
    Button,
    Input,
    Badge,
    Modal,
    SearchableSelect,
    type SearchableSelectOption,
    Card,
    Skeleton,
    TimetableGrid,
    type TimetableSlotDisplay,
    cn,
    useFeedback,
} from '@erp/common';

import {
    useGetSectionTimetableQuery,
    useGetSectionsQuery,
    useGetClassesQuery,
    useCreateSectionMutation,
    useGetCurrentAcademicSessionQuery,
    useGetSubjectsQuery,
    useCreateTimetableSlotMutation,
    useUpdateTimetableSlotMutation,
    useDeleteTimetableSlotMutation,
    useGenerateTimetableMutation,
    useGetTimetableTemplatesQuery,
    useCreateTimetableTemplateMutation,
    useUpdateTimetableTemplateMutation,
    TimetableSlotType,
} from '@core/api/endpoints/academicsApi';
import type { TimetableSlot } from '@core/api/endpoints/academicsApi';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_CONFIG = [
    { value: 1, label: 'Monday', shortLabel: 'Mon' },
    { value: 2, label: 'Tuesday', shortLabel: 'Tue' },
    { value: 3, label: 'Wednesday', shortLabel: 'Wed' },
    { value: 4, label: 'Thursday', shortLabel: 'Thu' },
    { value: 5, label: 'Friday', shortLabel: 'Fri' },
    { value: 6, label: 'Saturday', shortLabel: 'Sat' },
];

const SLOT_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
    [TimetableSlotType.REGULAR]: { icon: BookOpen, color: 'text-primary', bg: 'bg-primary/10', label: 'Class' },
    [TimetableSlotType.BREAK]: { icon: Coffee, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10', label: 'Break' },
    [TimetableSlotType.ASSEMBLY]: { icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10', label: 'Assembly' },
    [TimetableSlotType.LUNCH]: { icon: Utensils, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-500/10', label: 'Lunch' },
    [TimetableSlotType.SPECIAL]: { icon: Zap, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-500/10', label: 'Special' },
};

type TabType = 'timetable' | 'config';

interface SlotFormData {
    subject_id: string;
    teacher_id: string;
    slot_type: TimetableSlotType;
    start_time: string;
    end_time: string;
    room_number: string;
    notes: string;
}

interface TemplateFormData {
    name: string;
    total_slots_per_day: number;
    start_time: string;
    slot_duration_minutes: number;
    break_slots: number[];
    lunch_slot: number;
    generation_rules: {
        max_consecutive_hours_teacher: number;
        max_periods_per_subject_per_day: number;
        max_periods_per_teacher_per_day: number;
        allow_double_periods: boolean;
        balance_subject_distribution: boolean;
    };
}

export default function TimetablePage() {
    const [activeTab, setActiveTab] = useState<TabType>('timetable');
    const [selectedSectionId, setSelectedSectionId] = useState<string>('');
    const [isLocked, setIsLocked] = useState(false);
    const [editingSlot, setEditingSlot] = useState<{ day: number; slot: number; data?: TimetableSlot } | null>(null);
    const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);

    // Template configuration state
    const [isEditingTemplate, setIsEditingTemplate] = useState(false);
    const [templateForm, setTemplateForm] = useState<TemplateFormData>({
        name: 'Default Template',
        total_slots_per_day: 8,
        start_time: '08:00',
        slot_duration_minutes: 45,
        break_slots: [4],
        lunch_slot: 5,
        generation_rules: {
            max_consecutive_hours_teacher: 3,
            max_periods_per_subject_per_day: 2,
            max_periods_per_teacher_per_day: 6,
            allow_double_periods: false,
            balance_subject_distribution: true,
        }
    });

    const { data: sectionsRes, isLoading: sectionsLoading } = useGetSectionsQuery({ limit: 100 });
    const { data: classesRes, isLoading: classesLoading } = useGetClassesQuery({ limit: 100 });
    const { data: sessionRes } = useGetCurrentAcademicSessionQuery();
    const { data: subjectsRes } = useGetSubjectsQuery({ limit: 100 });
    const { data: templatesRes, refetch: refetchTemplates } = useGetTimetableTemplatesQuery();

    const currentSession = sessionRes?.data;
    const sections = sectionsRes?.data || [];
    const classes = classesRes?.data || [];
    const subjects = subjectsRes?.data || [];
    const templates = templatesRes?.data || [];
    const activeTemplate = templates[0];

    const isVirtualSelection = String(selectedSectionId || '').startsWith('VIRTUAL:');
    const virtualClassId = isVirtualSelection ? selectedSectionId.split(':')[1] : null;

    const { data: timetableRes, isLoading: timetableLoading, isFetching, refetch } = useGetSectionTimetableQuery(
        { sectionId: selectedSectionId, sessionId: currentSession?.id || '' },
        { skip: !selectedSectionId || isVirtualSelection || !currentSession?.id }
    );

    const [createSlot] = useCreateTimetableSlotMutation();
    const [updateSlot] = useUpdateTimetableSlotMutation();
    const [deleteSlot] = useDeleteTimetableSlotMutation();
    const [generateTimetable, { isLoading: isGenerating }] = useGenerateTimetableMutation();
    const [createSection, { isLoading: isInitializingSection }] = useCreateSectionMutation();
    const [createTemplate, { isLoading: isCreatingTemplate }] = useCreateTimetableTemplateMutation();
    const [updateTemplate, { isLoading: isUpdatingTemplate }] = useUpdateTimetableTemplateMutation();

    // Feedback hook for notifications
    const { success, error: showError, warning } = useFeedback();

    const timetableData = timetableRes?.data;

    // Initialize template form when template loads
    React.useEffect(() => {
        if (activeTemplate) {
            setTemplateForm({
                name: activeTemplate.name || 'Default Template',
                total_slots_per_day: activeTemplate.total_slots_per_day || 8,
                start_time: activeTemplate.start_time || '08:00',
                slot_duration_minutes: activeTemplate.slot_duration_minutes || 45,
                break_slots: activeTemplate.break_slots || [4],
                lunch_slot: activeTemplate.lunch_slot || 5,
                generation_rules: {
                    max_consecutive_hours_teacher: activeTemplate.generation_rules?.max_consecutive_hours_teacher || 3,
                    max_periods_per_subject_per_day: activeTemplate.generation_rules?.max_periods_per_subject_per_day || 2,
                    max_periods_per_teacher_per_day: activeTemplate.generation_rules?.max_periods_per_teacher_per_day || 6,
                    allow_double_periods: activeTemplate.generation_rules?.allow_double_periods || false,
                    balance_subject_distribution: activeTemplate.generation_rules?.balance_subject_distribution || true,
                }
            });
        }
    }, [activeTemplate]);

    const sectionSelectOptions: SearchableSelectOption[] = useMemo(() => {
        const options: SearchableSelectOption[] = [];
        const sortedClasses = [...classes].sort((a, b) =>
            (a.display_order || 0) - (b.display_order || 0) || a.name.localeCompare(b.name)
        );

        sortedClasses.forEach(cls => {
            const classSections = sections.filter(s => s.class_id === cls.id);
            if (classSections.length > 0) {
                classSections.forEach(s => {
                    options.push({ value: s.id, label: `${cls.name} - ${s.name}` });
                });
            } else {
                options.push({ value: `VIRTUAL:${cls.id}`, label: `${cls.name} (Setup Required)`, description: 'No sections created yet' });
            }
        });
        return options;
    }, [sections, classes]);

    const handleInitializeSection = async () => {
        if (!virtualClassId) return;
        try {
            const res = await createSection({
                classId: virtualClassId,
                data: { name: 'Initial', attendance_mode: 'PERIOD_WISE' }
            }).unwrap();
            if (res.success && res.data) {
                setSelectedSectionId(res.data.id);
                success('Section Created', 'Initial section has been created successfully.');
            }
        } catch (err: unknown) {
            const errorMessage = (err as { data?: { message?: string } })?.data?.message || 'Failed to initialize section';
            showError('Error', errorMessage);
        }
    };

    const handleAutoGenerate = async () => {
        if (!selectedSectionId || !currentSession?.id) return;
        if (templates.length === 0) {
            warning('Template Required', 'Please configure a template first before generating timetable.');
            setActiveTab('config');
            return;
        }
        try {
            const res = await generateTimetable({
                sectionId: selectedSectionId,
                sessionId: currentSession.id,
                templateId: templates[0]?.id
            }).unwrap();
            
            success('Timetable Generated', 'Auto-generated timetable has been created successfully.');
            
            if (res.warnings && res.warnings.length > 0) {
                // Show each warning as a distinct tip
                res.warnings.forEach(msg => warning('Calendar Optimization Tip', msg));
            }
            
            refetch();
        } catch (err: unknown) {
            const errorMessage = (err as { data?: { message?: string } })?.data?.message || 'Failed to generate timetable';
            showError('Generation Failed', errorMessage);
        }
    };

    const handleCreateDefaultTemplate = async () => {
        try {
            await createTemplate({
                name: templateForm.name,
                code: 'DEFAULT',
                total_slots_per_day: templateForm.total_slots_per_day,
                start_time: templateForm.start_time,
                slot_duration_minutes: templateForm.slot_duration_minutes,
                break_slots: templateForm.break_slots,
                lunch_slot: templateForm.lunch_slot,
                generation_rules: templateForm.generation_rules,
                is_default: true,
                is_active: true
            }).unwrap();
            success('Template Created', 'Default template has been created successfully.');
            refetchTemplates();
        } catch (err: unknown) {
            const errorMessage = (err as { data?: { message?: string } })?.data?.message || 'Failed to create template';
            showError('Error', errorMessage);
        }
    };

    const handleUpdateTemplate = async () => {
        if (!activeTemplate?.id) return;
        try {
            await updateTemplate({
                id: activeTemplate.id,
                data: {
                    name: templateForm.name,
                    total_slots_per_day: templateForm.total_slots_per_day,
                    start_time: templateForm.start_time,
                    slot_duration_minutes: templateForm.slot_duration_minutes,
                    break_slots: templateForm.break_slots,
                    lunch_slot: templateForm.lunch_slot,
                    generation_rules: templateForm.generation_rules,
                }
            }).unwrap();
            success('Template Updated', 'Template settings have been saved.');
            setIsEditingTemplate(false);
            refetchTemplates();
        } catch (err: unknown) {
            const errorMessage = (err as { data?: { message?: string } })?.data?.message || 'Failed to update template';
            showError('Error', errorMessage);
        }
    };

    const [formData, setFormData] = useState<SlotFormData>({
        subject_id: '',
        teacher_id: '',
        slot_type: TimetableSlotType.REGULAR,
        start_time: '08:00',
        end_time: '08:45',
        room_number: '',
        notes: '',
    });

    const workingDays = useMemo(() => {
        if (!currentSession?.weekly_off_days) return DAY_CONFIG;
        return DAY_CONFIG.filter(d => !currentSession.weekly_off_days.includes(d.value));
    }, [currentSession]);

    const timeSlots = useMemo(() => {
        const template = activeTemplate;
        if (!template) return [];
        const slots = [];
        let currentTime = template.start_time;
        for (let i = 1; i <= template.total_slots_per_day; i++) {
            const isBreak = template.break_slots?.includes(i);
            const isLunch = template.lunch_slot === i;
            const [h, m] = currentTime.split(':').map(Number);
            const totalMins = h * 60 + m + template.slot_duration_minutes;
            const endH = Math.floor(totalMins / 60) % 24;
            const endM = totalMins % 60;
            const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
            slots.push({
                number: i,
                start: currentTime,
                end: endTime,
                label: isLunch ? 'Lunch' : isBreak ? 'Break' : `P${i}`
            });
            currentTime = endTime;
        }
        return slots;
    }, [activeTemplate]);

    const transformedSlots = useMemo((): TimetableSlotDisplay[] => {
        if (!timetableData) return [];
        const result: TimetableSlotDisplay[] = [];
        timetableData.days.forEach(day => {
            day.slots.forEach(slot => {
                // Determine title based on slot type
                let title: string;
                let subtitle: string | undefined;

                if (slot.slot_type === TimetableSlotType.REGULAR) {
                    // For regular academic slots, show subject name or indicate it's unassigned
                    title = slot.subject?.name || 'Unassigned';
                    // Show teacher name if available (now directly available as teacher.name)
                    if (slot.teacher?.name) {
                        subtitle = slot.teacher.name;
                    } else if (slot.subject?.name) {
                        subtitle = 'No teacher assigned';
                    }
                } else {
                    // For non-regular slots (breaks, lunch, etc.), show the activity type
                    title = SLOT_TYPE_CONFIG[slot.slot_type]?.label || 'Activity';
                }

                result.push({
                    id: slot.id,
                    dayOfWeek: day.dayOfWeek,
                    slotNumber: slot.slot_number,
                    title,
                    subtitle,
                    type: slot.slot_type,
                    startTime: slot.start_time,
                    endTime: slot.end_time,
                    metadata: { 
                        room: slot.room_number,
                        subjectId: slot.subject_id,
                        teacherId: slot.teacher_id
                    }
                });
            });
        });
        return result;
    }, [timetableData]);

    const handleOpenSlotModal = (day: number, slotNumber: number, existingSlot?: TimetableSlotDisplay) => {
        const fullSlot = timetableData?.days.find(d => d.dayOfWeek === day)?.slots.find(s => s.id === existingSlot?.id);
        setEditingSlot({ day, slot: slotNumber, data: fullSlot });
        if (fullSlot) {
            setFormData({
                subject_id: fullSlot.subject_id || '',
                teacher_id: fullSlot.teacher_id || '',
                slot_type: fullSlot.slot_type,
                start_time: fullSlot.start_time,
                end_time: fullSlot.end_time,
                room_number: fullSlot.room_number || '',
                notes: fullSlot.notes || '',
            });
        } else {
            const timeConfig = timeSlots.find(t => t.number === slotNumber);
            setFormData({
                subject_id: '',
                teacher_id: '',
                slot_type: TimetableSlotType.REGULAR,
                start_time: timeConfig?.start || '08:00',
                end_time: timeConfig?.end || '08:45',
                room_number: '',
                notes: '',
            });
        }
        setIsSlotModalOpen(true);
    };

    const handleSaveSlot = async () => {
        if (!editingSlot || !currentSession || !selectedSectionId) return;
        const selectedSection = sections.find(s => s.id === selectedSectionId);
        if (!selectedSection) return;
        try {
            const slotData = {
                class_id: selectedSection.class_id,
                section_id: selectedSectionId,
                session_id: currentSession.id,
                day_of_week: editingSlot.day,
                slot_number: editingSlot.slot,
                ...formData,
            };
            if (editingSlot.data) {
                await updateSlot({ id: editingSlot.data.id, data: slotData }).unwrap();
                success('Slot Updated', 'Timetable slot has been updated.');
            } else {
                await createSlot(slotData).unwrap();
                success('Slot Created', 'New timetable slot has been added.');
            }
            setIsSlotModalOpen(false);
            refetch();
        } catch (err: unknown) {
            const errorMessage = (err as { data?: { message?: string } })?.data?.message || 'Failed to save slot';
            showError('Error', errorMessage);
        }
    };

    const handleDeleteSlot = async (slotId: string) => {
        try {
            await deleteSlot(slotId).unwrap();
            success('Slot Deleted', 'Timetable slot has been removed.');
            refetch();
        } catch (err: unknown) {
            const errorMessage = (err as { data?: { message?: string } })?.data?.message || 'Failed to delete slot';
            showError('Error', errorMessage);
        }
    };

    const handleShiftSlot = async (slotId: string, toDay: number, toSlot: number) => {
        try {
            await updateSlot({ id: slotId, data: { day_of_week: toDay, slot_number: toSlot } }).unwrap();
            success('Slot Moved', 'Timetable slot has been rescheduled.');
            refetch();
        } catch (err: unknown) {
            const errorMessage = (err as { data?: { message?: string } })?.data?.message || 'Failed to move slot';
            showError('Error', errorMessage);
        }
    };

    // Tab navigation items
    const tabs = [
        { id: 'timetable' as TabType, label: 'Schedule', icon: CalendarDays },
        { id: 'config' as TabType, label: 'Configuration', icon: Sliders },
    ];

    const fadeIn = {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            <div className="max-mjw-[1600px] mjx-auto">
                {/* Header */}
                <motion.div {...fadeIn} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 blur-xl rounded-full" />
                            <div className="relative p-3 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-lg shadow-primary/20">
                                <CalendarDays className="w-7 h-7 text-primary-foreground" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground tracking-tight">
                                Timetable Manager
                            </h1>
                            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 rounded-full text-primary text-xs font-medium">
                                    <Clock size={12} />
                                    {currentSession?.name || 'No Session'}
                                </span>
                                {selectedSectionId && !isVirtualSelection && (() => {
                                    const s = sections.find(sec => sec.id === selectedSectionId);
                                    const c = classes.find(cls => cls.id === s?.class_id);
                                    return s && c ? (
                                        <span className="text-foreground font-medium">
                                            {c.name} - {s.name}
                                        </span>
                                    ) : null;
                                })()}
                            </p>
                        </div>
                    </div>

                    {/* Section Selector */}
                    <div className="flex items-center gap-3">
                        <SearchableSelect
                            className="min-w-[280px]"
                            options={sectionSelectOptions}
                            value={selectedSectionId}
                            onChange={(val) => setSelectedSectionId(val as string)}
                            placeholder="Select Class Section"
                            searchPlaceholder="Search sections..."
                        />
                    </div>
                </motion.div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-2 p-1.5 bg-muted/50 rounded-2xl w-fit backdrop-blur-sm border border-border/50 mb-4">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300",
                                activeTab === tab.id
                                    ? "text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                            )}
                        >
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-gradient-to-r from-primary to-primary/90 rounded-xl shadow-lg shadow-primary/25"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                            <tab.icon size={16} className="relative z-10" />
                            <span className="relative z-10">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <AnimatePresence mode="wait">
                    {activeTab === 'timetable' ? (
                        <motion.div
                            key="timetable"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            {/* Template Warning */}
                            {templates.length === 0 && templatesRes && (
                                <div>
                                    <Card className="p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20 backdrop-blur-sm">
                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className="p-2.5 bg-amber-500/20 rounded-xl">
                                                    <AlertCircle className="text-amber-600 h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-foreground">Template Configuration Required</h4>
                                                    <p className="text-xs text-muted-foreground mt-1 max-w-md">
                                                        Define your school's period structure, break times, and schedule rules before generating timetables.
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setActiveTab('config')}
                                                className="border-amber-500/30 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                            >
                                                <Settings2 size={14} className="mr-2" />
                                                Configure Now
                                            </Button>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {/* Action Bar */}
                            {selectedSectionId && !isVirtualSelection && (
                                <div>
                                    <Card className="p-4 bg-surface/80 backdrop-blur-sm border-border/50 shadow-sm">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "p-2.5 rounded-xl transition-all duration-300",
                                                    isLocked
                                                        ? "bg-rose-500/10 text-rose-600"
                                                        : "bg-emerald-500/10 text-emerald-600"
                                                )}>
                                                    {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-foreground">
                                                            {isLocked ? 'Published Schedule' : 'Draft Mode'}
                                                        </span>
                                                        <Badge
                                                            variant={isLocked ? "danger" : "success"}
                                                            className="text-[10px] py-0 h-5"
                                                        >
                                                            {isLocked ? 'Locked' : 'Editable'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {isLocked ? 'Unlock to make changes' : 'Click slots to edit or use auto-generate'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={refetch}
                                                    disabled={isFetching}
                                                    className="h-10 px-4 rounded-xl border-border hover:bg-muted"
                                                >
                                                    <RefreshCw size={14} className={cn("mr-2", isFetching && "animate-spin")} />
                                                    Refresh
                                                </Button>

                                                {!isLocked && templates.length > 0 && (
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={handleAutoGenerate}
                                                        disabled={isGenerating}
                                                        className="h-10 px-5 rounded-xl bg-gradient-to-r from-primary to-primary/90 shadow-md hover:shadow-lg transition-all"
                                                    >
                                                        <Sparkles size={14} className="mr-2" />
                                                        Auto Generate
                                                    </Button>
                                                )}

                                                <Button
                                                    variant={isLocked ? "destructive" : "outline"}
                                                    size="sm"
                                                    onClick={() => setIsLocked(!isLocked)}
                                                    className="h-10 px-4 rounded-xl"
                                                >
                                                    {isLocked ? <Unlock size={14} className="mr-2" /> : <Lock size={14} className="mr-2" />}
                                                    {isLocked ? 'Unlock' : 'Publish'}
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            {/* Main Grid Area */}
                            {!selectedSectionId ? (
                                <div>
                                    <Card className="p-16 flex flex-col items-center justify-center text-center bg-gradient-to-br from-surface to-muted/20 border-border/50 rounded-3xl overflow-hidden relative">
                                        <div className="absolute top-0 left-0 w-full h-full">
                                            <div className="absolute top-10 right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                                            <div className="absolute bottom-10 left-10 w-40 h-40 bg-violet-500/5 rounded-full blur-3xl" />
                                        </div>
                                        <div className="relative z-10 space-y-6">
                                            <div className="relative mx-auto w-fit">
                                                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                                                <div className="relative p-6 bg-gradient-to-br from-muted to-muted/50 rounded-3xl border border-border/50">
                                                    <Grid3x3 size={48} className="text-primary/40" />
                                                </div>
                                            </div>
                                            <div className="max-w-sm space-y-3">
                                                <h3 className="text-xl font-bold text-foreground">Select a Section</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    Choose a class section from the dropdown above to view and manage their weekly schedule.
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            ) : isVirtualSelection ? (
                                <div>
                                    <Card className="p-16 flex flex-col items-center justify-center text-center bg-gradient-to-br from-amber-500/5 via-surface to-surface border-amber-500/20 rounded-3xl overflow-hidden relative">
                                        <div className="relative z-10 space-y-8">
                                            <div className="relative mx-auto w-fit">
                                                <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full animate-pulse" />
                                                <div className="relative p-6 bg-amber-500/10 rounded-3xl border border-amber-500/20">
                                                    <Settings2 size={48} className="text-amber-600" />
                                                </div>
                                            </div>
                                            <div className="max-w-md space-y-4">
                                                <h3 className="text-2xl font-bold text-foreground">Initialize Section</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    This class doesn't have any sections yet. Create an initial section to start building the timetable.
                                                </p>
                                                <Button
                                                    variant="primary"
                                                    size="lg"
                                                    onClick={handleInitializeSection}
                                                    isLoading={isInitializingSection}
                                                    className="h-12 px-8 rounded-2xl shadow-lg hover:shadow-primary/20 transition-all"
                                                >
                                                    <Plus size={18} className="mr-2" />
                                                    Create Initial Section
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            ) : (
                                <div>
                                    <TimetableGrid
                                        days={workingDays}
                                        timeSlots={timeSlots}
                                        slots={transformedSlots}
                                        isLoading={timetableLoading}
                                        isRefreshing={isFetching}
                                        onRefresh={refetch}
                                        isLocked={isLocked}
                                        onToggleLock={() => setIsLocked(!isLocked)}
                                        onSlotClick={handleOpenSlotModal}
                                        onDeleteSlot={handleDeleteSlot}
                                        onSlotShift={handleShiftSlot}
                                        slotTypeConfig={SLOT_TYPE_CONFIG}
                                        title="Weekly Schedule"
                                        subtitle={(() => {
                                            const s = sections.find(sec => sec.id === selectedSectionId);
                                            const c = classes.find(cls => cls.id === s?.class_id);
                                            return s && c ? `${c.name} - ${s.name}` : '';
                                        })()}
                                    />
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="config"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            {/* Configuration Content */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Template Settings */}
                                <div className="lg:col-span-2">
                                    <Card className="p-6 bg-surface/80 backdrop-blur-sm border-border/50">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-primary/10 rounded-xl">
                                                    <Layers size={20} className="text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-foreground">Period Structure</h3>
                                                    <p className="text-xs text-muted-foreground">Configure daily schedule template</p>
                                                </div>
                                            </div>
                                            {activeTemplate && !isEditingTemplate && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setIsEditingTemplate(true)}
                                                    className="rounded-xl"
                                                >
                                                    <Settings2 size={14} className="mr-2" />
                                                    Edit
                                                </Button>
                                            )}
                                        </div>

                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                        Template Name
                                                    </label>
                                                    <Input
                                                        value={templateForm.name}
                                                        onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                                                        disabled={!isEditingTemplate && !!activeTemplate}
                                                        className="h-11 rounded-xl"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                                                        <Timer size={12} />
                                                        Start Time
                                                    </label>
                                                    <Input
                                                        type="time"
                                                        value={templateForm.start_time}
                                                        onChange={(e) => setTemplateForm({ ...templateForm, start_time: e.target.value })}
                                                        disabled={!isEditingTemplate && !!activeTemplate}
                                                        className="h-11 rounded-xl"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                        Periods/Day
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        min={4}
                                                        max={12}
                                                        value={templateForm.total_slots_per_day}
                                                        onChange={(e) => setTemplateForm({ ...templateForm, total_slots_per_day: parseInt(e.target.value) || 8 })}
                                                        disabled={!isEditingTemplate && !!activeTemplate}
                                                        className="h-11 rounded-xl"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                        Duration (mins)
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        min={30}
                                                        max={60}
                                                        value={templateForm.slot_duration_minutes}
                                                        onChange={(e) => setTemplateForm({ ...templateForm, slot_duration_minutes: parseInt(e.target.value) || 45 })}
                                                        disabled={!isEditingTemplate && !!activeTemplate}
                                                        className="h-11 rounded-xl"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                        Lunch Slot #
                                                    </label>
                                                    <Input
                                                        type="number"
                                                        min={1}
                                                        max={templateForm.total_slots_per_day}
                                                        value={templateForm.lunch_slot}
                                                        onChange={(e) => setTemplateForm({ ...templateForm, lunch_slot: parseInt(e.target.value) || 5 })}
                                                        disabled={!isEditingTemplate && !!activeTemplate}
                                                        className="h-11 rounded-xl"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-3 p-4 bg-muted/30 rounded-2xl border border-border/50">
                                                <label className="text-sm font-bold text-foreground flex items-center gap-2">
                                                    <ShieldCheck size={16} className="text-primary" />
                                                    Generation Rules & Policies
                                                </label>
                                                <p className="text-xs text-muted-foreground">These rules automatically govern how the timetable is generated.</p>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Teacher Workload</label>
                                                            <div className="space-y-3 p-3 bg-muted/20 rounded-xl border border-border/50">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-xs flex-1">Max consecutive periods</span>
                                                                    <Input
                                                                        type="number"
                                                                        className="w-16 h-8 text-center text-xs px-1"
                                                                        value={templateForm.generation_rules.max_consecutive_hours_teacher}
                                                                        onChange={(e) => setTemplateForm({
                                                                            ...templateForm,
                                                                            generation_rules: { ...templateForm.generation_rules, max_consecutive_hours_teacher: parseInt(e.target.value) || 3 }
                                                                        })}
                                                                        disabled={!isEditingTemplate && !!activeTemplate}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-xs flex-1">Max periods per day</span>
                                                                    <Input
                                                                        type="number"
                                                                        className="w-16 h-8 text-center text-xs px-1"
                                                                        value={templateForm.generation_rules.max_periods_per_teacher_per_day}
                                                                        onChange={(e) => setTemplateForm({
                                                                            ...templateForm,
                                                                            generation_rules: { ...templateForm.generation_rules, max_periods_per_teacher_per_day: parseInt(e.target.value) || 6 }
                                                                        })}
                                                                        disabled={!isEditingTemplate && !!activeTemplate}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Subject Policies</label>
                                                            <div className="space-y-3 p-3 bg-muted/20 rounded-xl border border-border/50">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-xs flex-1">Max periods/subject/day</span>
                                                                    <Input
                                                                        type="number"
                                                                        className="w-16 h-8 text-center text-xs px-1"
                                                                        value={templateForm.generation_rules.max_periods_per_subject_per_day}
                                                                        onChange={(e) => setTemplateForm({
                                                                            ...templateForm,
                                                                            generation_rules: { ...templateForm.generation_rules, max_periods_per_subject_per_day: parseInt(e.target.value) || 2 }
                                                                        })}
                                                                        disabled={!isEditingTemplate && !!activeTemplate}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        id="balance_distribution"
                                                                        checked={templateForm.generation_rules.balance_subject_distribution}
                                                                        onChange={(e) => setTemplateForm({
                                                                            ...templateForm,
                                                                            generation_rules: { ...templateForm.generation_rules, balance_subject_distribution: e.target.checked }
                                                                        })}
                                                                        className="rounded border-border text-primary focus:ring-primary"
                                                                        disabled={!isEditingTemplate && !!activeTemplate}
                                                                    />
                                                                    <label htmlFor="balance_distribution" className="text-xs cursor-pointer">Balance throughout week</label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2 pt-2">
                                                    <button
                                                        onClick={() => setTemplateForm({
                                                            ...templateForm,
                                                            generation_rules: { ...templateForm.generation_rules, allow_double_periods: !templateForm.generation_rules.allow_double_periods }
                                                        })}
                                                        disabled={!isEditingTemplate && !!activeTemplate}
                                                        className={cn(
                                                            "flex items-center justify-between p-3 rounded-xl border transition-all",
                                                            templateForm.generation_rules.allow_double_periods 
                                                                ? "bg-primary/5 border-primary/30 text-primary" 
                                                                : "bg-background border-border text-muted-foreground"
                                                        )}
                                                    >
                                                        <span className="text-xs font-medium">Allow double periods (consecutive)</span>
                                                        <div className={cn(
                                                            "w-8 h-4 rounded-full relative transition-all",
                                                            templateForm.generation_rules.allow_double_periods ? "bg-primary" : "bg-muted"
                                                        )}>
                                                            <div className={cn(
                                                                "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                                                                templateForm.generation_rules.allow_double_periods ? "left-4.5" : "left-0.5"
                                                            )} />
                                                        </div>
                                                    </button>

                                                    <button
                                                        onClick={() => setTemplateForm({
                                                            ...templateForm,
                                                            generation_rules: { ...templateForm.generation_rules, balance_subject_distribution: !templateForm.generation_rules.balance_subject_distribution }
                                                        })}
                                                        disabled={!isEditingTemplate && !!activeTemplate}
                                                        className={cn(
                                                            "flex items-center justify-between p-3 rounded-xl border transition-all",
                                                            templateForm.generation_rules.balance_subject_distribution 
                                                                ? "bg-primary/5 border-primary/30 text-primary" 
                                                                : "bg-background border-border text-muted-foreground"
                                                        )}
                                                    >
                                                        <span className="text-xs font-medium">Balance subject distribution</span>
                                                        <div className={cn(
                                                            "w-8 h-4 rounded-full relative transition-all",
                                                            templateForm.generation_rules.balance_subject_distribution ? "bg-primary" : "bg-muted"
                                                        )}>
                                                            <div className={cn(
                                                                "absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all",
                                                                templateForm.generation_rules.balance_subject_distribution ? "left-4.5" : "left-0.5"
                                                            )} />
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-sm font-bold text-foreground flex items-center gap-2">
                                                    <Clock size={16} className="text-amber-500" />
                                                    Schedule Sequence
                                                </label>
                                                <p className="text-xs text-muted-foreground">Select slots to mark them as breaks or lunch.</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {Array.from({ length: templateForm.total_slots_per_day }, (_, i) => i + 1).map((num) => {
                                                        const isBreak = templateForm.break_slots.includes(num);
                                                        const isLunch = templateForm.lunch_slot === num;
                                                        return (
                                                            <button
                                                                key={num}
                                                                disabled={!isEditingTemplate && !!activeTemplate}
                                                                onClick={() => {
                                                                    // Simple cycle: regular -> break -> lunch -> regular
                                                                    if (isLunch) {
                                                                        setTemplateForm({ ...templateForm, lunch_slot: 0 });
                                                                    } else if (isBreak) {
                                                                        setTemplateForm({ ...templateForm, lunch_slot: num, break_slots: templateForm.break_slots.filter(s => s !== num) });
                                                                    } else {
                                                                        setTemplateForm({ ...templateForm, break_slots: [...templateForm.break_slots, num] });
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    "group relative w-12 h-12 rounded-2xl text-sm font-bold transition-all flex items-center justify-center",
                                                                    isLunch
                                                                        ? "bg-rose-500/20 text-rose-600 border-2 border-rose-500/40 shadow-lg shadow-rose-500/10"
                                                                        : isBreak
                                                                            ? "bg-amber-500/20 text-amber-600 border-2 border-amber-500/40 shadow-lg shadow-amber-500/10"
                                                                            : "bg-muted/50 text-muted-foreground hover:bg-muted border border-border",
                                                                    (!isEditingTemplate && activeTemplate) && "opacity-60"
                                                                )}
                                                            >
                                                                <span className="relative z-10">{num}</span>
                                                                {isLunch && <Utensils size={10} className="absolute top-1 right-1 opacity-60" />}
                                                                {isBreak && <Coffee size={10} className="absolute top-1 right-1 opacity-60" />}
                                                                <div className="absolute inset-0 rounded-2xl group-hover:bg-white/10 transition-colors pointer-events-none" />
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                                                        <div className="w-2.5 h-2.5 rounded bg-muted/50 border border-border" /> Regular
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 uppercase tracking-tight">
                                                        <div className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/40" /> Short Break
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600 uppercase tracking-tight">
                                                        <div className="w-2.5 h-2.5 rounded bg-rose-500/20 border border-rose-500/40" /> Lunch Break
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Save Buttons */}
                                            {!activeTemplate ? (
                                                <div className="pt-4 border-t border-border">
                                                    <Button
                                                        variant="primary"
                                                        onClick={handleCreateDefaultTemplate}
                                                        isLoading={isCreatingTemplate}
                                                        className="h-11 px-6 rounded-xl"
                                                    >
                                                        <Check size={16} className="mr-2" />
                                                        Create Template
                                                    </Button>
                                                </div>
                                            ) : isEditingTemplate && (
                                                <div className="pt-4 border-t border-border flex items-center gap-3">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => setIsEditingTemplate(false)}
                                                        className="h-11 px-6 rounded-xl"
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        variant="primary"
                                                        onClick={handleUpdateTemplate}
                                                        isLoading={isUpdatingTemplate}
                                                        className="h-11 px-6 rounded-xl"
                                                    >
                                                        <Save size={16} className="mr-2" />
                                                        Save Changes
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                </div>

                                {/* Quick Info Sidebar */}
                                <div className="space-y-4">
                                    <Card className="p-5 bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg">
                                                <Info size={16} className="text-primary" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-foreground">About Templates</h4>
                                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                                    Templates define the daily period structure for all classes. Changes affect how timetables are generated.
                                                </p>
                                            </div>
                                        </div>
                                    </Card>

                                    <Card className="p-5 bg-surface/80 border-border/50">
                                        <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                                            <Sun size={14} className="text-amber-500" />
                                            Preview Schedule
                                        </h4>
                                        <div className="space-y-2">
                                            {Array.from({ length: Math.min(templateForm.total_slots_per_day, 6) }, (_, i) => {
                                                const num = i + 1;
                                                const isBreak = templateForm.break_slots.includes(num);
                                                const isLunch = templateForm.lunch_slot === num;
                                                const [h, m] = templateForm.start_time.split(':').map(Number);
                                                const startMins = h * 60 + m + (i * templateForm.slot_duration_minutes);
                                                const endMins = startMins + templateForm.slot_duration_minutes;
                                                const start = `${String(Math.floor(startMins / 60) % 24).padStart(2, '0')}:${String(startMins % 60).padStart(2, '0')}`;
                                                const end = `${String(Math.floor(endMins / 60) % 24).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;

                                                return (
                                                    <div
                                                        key={num}
                                                        className={cn(
                                                            "flex items-center justify-between p-2.5 rounded-lg text-xs",
                                                            isLunch
                                                                ? "bg-rose-500/10 text-rose-600"
                                                                : isBreak
                                                                    ? "bg-amber-500/10 text-amber-600"
                                                                    : "bg-muted/50 text-foreground"
                                                        )}
                                                    >
                                                        <span className="font-semibold">
                                                            {isLunch ? 'Lunch' : isBreak ? 'Break' : `Period ${num}`}
                                                        </span>
                                                        <span className="font-mono text-muted-foreground">{start} - {end}</span>
                                                    </div>
                                                );
                                            })}
                                            {templateForm.total_slots_per_day > 6 && (
                                                <p className="text-xs text-muted-foreground text-center py-1">
                                                    +{templateForm.total_slots_per_day - 6} more periods...
                                                </p>
                                            )}
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Slot Modal */}
            <Modal
                isOpen={isSlotModalOpen}
                onClose={() => setIsSlotModalOpen(false)}
                title={editingSlot?.data ? 'Edit Time Slot' : 'Add New Slot'}
                size="md"
            >
                <div className="space-y-6">
                    <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl border border-border">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Clock size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Selected Slot</p>
                            <p className="text-sm font-bold text-foreground">
                                {editingSlot && `${DAY_NAMES[editingSlot.day]} • ${timeSlots.find(t => t.number === editingSlot.slot)?.label || `Slot ${editingSlot.slot}`}`}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activity Type</label>
                            <SearchableSelect
                                value={formData.slot_type}
                                onChange={(val) => setFormData({ ...formData, slot_type: val as TimetableSlotType })}
                                options={Object.entries(SLOT_TYPE_CONFIG).map(([type, cfg]) => ({
                                    value: type,
                                    label: cfg.label,
                                }))}
                                placeholder="Select activity type"
                                searchPlaceholder="Search..."
                            />
                        </div>

                        {formData.slot_type === TimetableSlotType.REGULAR && (
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subject</label>
                                <SearchableSelect
                                    value={formData.subject_id}
                                    onChange={(val) => setFormData({ ...formData, subject_id: val as string })}
                                    options={subjects.map(s => ({ value: s.id, label: s.name, description: s.code }))}
                                    placeholder="Select Subject"
                                    searchPlaceholder="Search subjects..."
                                    noOptionsMessage="No subjects found"
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Start Time</label>
                                <Input
                                    type="time"
                                    value={formData.start_time}
                                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                    className="h-11 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">End Time</label>
                                <Input
                                    type="time"
                                    value={formData.end_time}
                                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                    className="h-11 rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Room / Location</label>
                            <Input
                                placeholder="e.g. Room 101, Lab A"
                                value={formData.room_number}
                                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                                className="h-11 rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-5 border-t border-border">
                        <Button variant="ghost" onClick={() => setIsSlotModalOpen(false)} className="rounded-xl h-11 px-6">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveSlot} className="bg-primary text-primary-foreground rounded-xl h-11 px-8 shadow-md hover:shadow-lg transition-all">
                            <Save size={16} className="mr-2" />
                            {editingSlot?.data ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
