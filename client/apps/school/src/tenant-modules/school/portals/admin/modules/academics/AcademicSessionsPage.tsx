import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CalendarDays,
    Plus,
    Edit2,
    Trash2,
    Calendar,
    Clock,
    CheckCircle2,
    Search,
    RefreshCw,
    Filter,
    ChevronLeft,
    ChevronRight,
    Info,
    Settings2,
    FileText,
    ShieldCheck,
    Check,
    Lock,
    Unlock,
    ArrowRightCircle
} from 'lucide-react';
import {
    Button,
    Input,
    Badge,
    Modal,
    ConfirmDialog,
    Card,
    Skeleton,
    Select,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    useAlert
} from '@erp/common';
import {
    useGetAcademicSessionsQuery,
    useCreateAcademicSessionMutation,
    useUpdateAcademicSessionMutation,
    useDeleteAcademicSessionMutation,
    useSetCurrentSessionMutation,
    useLockSessionMutation,
    useUnlockSessionMutation,
    useGetSessionLockStatusQuery,
} from '@core/api/endpoints/academicsApi';
import { useNavigate } from 'react-router-dom';
import type { AcademicSession } from '@core/api/endpoints/academicsApi';
import { AcademicSessionStatus } from '@core/api/endpoints/academicsApi';
import { formatApiError } from '@/common/services/apiHelpers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { academicSessionSchema, type AcademicSessionFormData } from '@/core/validation/schemas';

const STATUS_COLORS: Record<string, string> = {
    [AcademicSessionStatus.DRAFT]: 'bg-muted/50 text-muted-foreground border-border',
    [AcademicSessionStatus.ACTIVE]: 'bg-success/10 text-success border-success/20',
    [AcademicSessionStatus.COMPLETED]: 'bg-primary/10 text-primary border-primary/20',
    [AcademicSessionStatus.ARCHIVED]: 'bg-warning/10 text-warning border-warning/20',
};

const WEEKDAYS = [
    { label: 'Sun', value: 0 },
    { label: 'Mon', value: 1 },
    { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 4 },
    { label: 'Fri', value: 5 },
    { label: 'Sat', value: 6 },
];

export default function AcademicSessionsPage() {
    const navigate = useNavigate();
    const { success, showAlert } = useAlert();
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const { data: sessionsRes, isLoading: loading, isFetching, refetch } = useGetAcademicSessionsQuery({ page, limit: 10 });

    const [createSession] = useCreateAcademicSessionMutation();
    const [updateSession] = useUpdateAcademicSessionMutation();
    const [deleteSession] = useDeleteAcademicSessionMutation();
    const [setCurrentSession] = useSetCurrentSessionMutation();
    const [lockSession] = useLockSessionMutation();
    const [unlockSession] = useUnlockSessionMutation();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<AcademicSession | null>(null);
    const [activeTab, setActiveTab] = useState('basic');
    const {
        handleSubmit: handleFormSubmit,
        reset,
        watch,
        setValue,
        getValues,
        formState: { errors: formErrors, isSubmitting },
    } = useForm<AcademicSessionFormData>({
        resolver: zodResolver(academicSessionSchema),
        defaultValues: {
            name: '',
            code: '',
            start_date: '',
            end_date: '',
            admission_start_date: '',
            admission_end_date: '',
            status: AcademicSessionStatus.DRAFT,
            weekly_off_days: [0],
            attendance_backdate_days: 0,
            marks_lock_days: 7,
            notes: '',
            is_attendance_locked: false,
            is_marks_locked: false,
            is_fees_locked: false,
            is_enrollment_locked: false,
        },
    });
    const formData = watch();

    const handleLock = async (id: string, lock: boolean) => {
        try {
            if (lock) {
                await lockSession({ id, data: { lock_all: true } }).unwrap();
                success('Session Locked', 'All academic operations have been halted for this matrix.');
            } else {
                await unlockSession({ id, data: { unlock_all: true } }).unwrap();
                success('Session Unlocked', 'Academic operations have been resumed.');
            }
            refetch();
        } catch (error) {
            showAlert({
                title: 'Security Sync Failed',
                description: formatApiError(error),
                variant: 'error'
            });
            console.error('Lock operation failed:', error);
        }
    };

    const sessions = sessionsRes?.data || [];
    const filteredSessions = sessions.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.code?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenCreate = () => {
        setSelectedSession(null);
        reset({
            name: '',
            code: '',
            start_date: '',
            end_date: '',
            admission_start_date: '',
            admission_end_date: '',
            status: AcademicSessionStatus.DRAFT,
            weekly_off_days: [0],
            attendance_backdate_days: 0,
            marks_lock_days: 7,
            notes: '',
            is_attendance_locked: false,
            is_marks_locked: false,
            is_fees_locked: false,
            is_enrollment_locked: false,
        });
        setActiveTab('basic');
        setIsModalOpen(true);
    };

    const handleOpenEdit = (session: AcademicSession) => {
        setSelectedSession(session);
        reset({
            ...session,
            start_date: session.start_date?.split('T')[0] || '',
            end_date: session.end_date?.split('T')[0] || '',
            admission_start_date: session.admission_start_date?.split('T')[0] || '',
            admission_end_date: session.admission_end_date?.split('T')[0] || '',
        });
        setActiveTab('basic');
        setIsModalOpen(true);
    };

    const onSubmit = async (data: AcademicSessionFormData) => {
        try {
            if (selectedSession) {
                await updateSession({ id: selectedSession.id, data }).unwrap();
                success('Session Updated', 'Academic lifecycle parameters have been synchronized.');
            } else {
                await createSession(data).unwrap();
                success('Session Initialized', 'A new epoch has been registered in the institution registry.');
            }
            setIsModalOpen(false);
        } catch (error) {
            showAlert({
                title: 'Operation Failed',
                description: formatApiError(error),
                variant: 'error'
            });
            console.error('Session operation failed:', error);
        }
    };

    const handleDelete = async () => {
        if (!selectedSession) return;
        try {
            await deleteSession(selectedSession.id).unwrap();
            setIsConfirmOpen(false);
            success('Session Excised', 'The academic epoch has been purged from history.');
        } catch (error) {
            showAlert({
                title: 'Excision Failed',
                description: formatApiError(error),
                variant: 'error'
            });
            console.error('Delete failed:', error);
        }
    };

    const toggleWeekday = (val: number) => {
        const current = getValues('weekly_off_days') || [];
        if (current.includes(val)) {
            setValue('weekly_off_days', current.filter((d) => d !== val), { shouldValidate: true });
        } else {
            setValue('weekly_off_days', [...current, val], { shouldValidate: true });
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-[1400px] mx-auto space-y-4">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-primary/10 rounded-lg shadow-sm">
                                <CalendarDays className="w-5 h-5 text-primary" />
                            </div>
                            <h1 className="text-xl font-bold text-foreground tracking-tight">Academic Sessions</h1>
                        </div>
                        <p className="text-muted-foreground text-xs font-medium">Manage institutional lifecycles and admission windows.</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-surface border border-border rounded-full text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                            <div className="w-1 h-1 bg-success rounded-full animate-pulse" />
                            Live Sync
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => refetch()}
                            size="sm"
                            className="bg-surface border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                            <RefreshCw size={14} className={`mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button
                            onClick={() => navigate('/admin/academics/sessions/promotion')}
                            size="sm"
                            variant="outline"
                            className="bg-surface border-primary/20 text-primary hover:bg-primary/5"
                        >
                            <ArrowRightCircle size={16} className="mr-1.5" />
                            Bulk Promotion
                        </Button>
                        <Button
                            onClick={handleOpenCreate}
                            size="sm"
                            className="bg-primary text-primary-foreground shadow-sm border-0 hover:bg-primary/90"
                        >
                            <Plus size={16} className="mr-1" />
                            New Session
                        </Button>
                    </div>
                </div>

                {/* Filter Matrix */}
                <Card className="p-3 bg-surface border-border shadow-sm rounded-xl">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="relative flex-1 group w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search sessions..."
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
                            <div className="px-3 py-1.5 bg-muted/50 border border-border rounded-lg text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                                {filteredSessions.length} Total
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Sessions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {loading ? (
                        [...Array(8)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)
                    ) : filteredSessions.length === 0 ? (
                        <div className="col-span-full py-20 bg-surface rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center space-y-4">
                            <CalendarDays size={40} className="text-muted-foreground/50" />
                            <p className="text-muted-foreground text-sm font-medium">No sessions identified in the current spectrum.</p>
                        </div>
                    ) : (
                        filteredSessions.map((session) => (
                            <Card
                                key={session.id}
                                className={`group p-4 bg-surface border-border rounded-2xl transition-all hover:shadow-md hover:border-primary/20 ${session.is_current ? 'border-primary shadow-primary/10' : ''
                                    }`}
                            >
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className={`p-2 rounded-xl ${session.is_current ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground'}`}>
                                            <CalendarDays size={20} />
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {session.is_current && (
                                                <Badge className="bg-success/10 text-success border-0 rounded-lg text-[9px] font-bold px-2 py-0.5">
                                                    Current
                                                </Badge>
                                            )}
                                            <Badge className={`${STATUS_COLORS[session.status]} rounded-lg text-[9px] font-bold px-2 py-0.5 border`}>
                                                {session.status.toLowerCase()}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">{session.name}</h3>
                                        <p className="text-[10px] font-bold text-muted-foreground tracking-wider">CODE: {session.code || 'NA'}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 bg-muted/30 rounded-xl border border-border">
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Start</p>
                                            <p className="text-[10px] font-bold text-foreground">{new Date(session.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                        </div>
                                        <div className="p-2 bg-muted/30 rounded-xl border border-border">
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">End</p>
                                            <p className="text-[10px] font-bold text-foreground">{new Date(session.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 pt-1">
                                        {!session.is_current ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={async () => {
                                                    try {
                                                        await setCurrentSession(session.id).unwrap();
                                                        success('Active Shift', `${session.name} is now the primary institutional context.`);
                                                    } catch (error) {
                                                        showAlert({
                                                            title: 'Activation Failed',
                                                            description: formatApiError(error),
                                                            variant: 'error'
                                                        });
                                                    }
                                                }}
                                                className="flex-1 h-8 text-[10px] font-bold rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                                            >
                                                Set Active
                                            </Button>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center gap-1.5 h-8 bg-primary/10 text-primary text-[10px] font-bold rounded-lg">
                                                <Check size={12} strokeWidth={3} />
                                                Active Session
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleLock(session.id, !session.is_locked)}
                                                className={`h-8 w-8 p-0 border-border ${session.is_locked ? 'text-destructive' : 'text-success'}`}
                                                title={session.is_locked ? "Unlock Session" : "Lock Session"}
                                            >
                                                {session.is_locked ? <Lock size={12} /> : <Unlock size={12} />}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleOpenEdit(session)}
                                                className="h-8 w-8 p-0 border-border text-muted-foreground hover:bg-muted hover:text-primary"
                                            >
                                                <Edit2 size={12} />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedSession(session);
                                                    setIsConfirmOpen(true);
                                                }}
                                                className="h-8 w-8 p-0 border-border text-muted-foreground hover:bg-muted hover:text-destructive"
                                            >
                                                <Trash2 size={12} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {sessionsRes?.meta && sessionsRes.meta.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 py-4">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="bg-surface border-border text-muted-foreground hover:text-foreground">
                            <ChevronLeft size={14} />
                        </Button>
                        <span className="text-xs font-bold text-muted-foreground">{page} / {sessionsRes.meta.totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(sessionsRes.meta.totalPages, p + 1))} disabled={page === sessionsRes.meta.totalPages} className="bg-surface border-border text-muted-foreground hover:text-foreground">
                            <ChevronRight size={14} />
                        </Button>
                    </div>
                )}
            </div>

            {/* Tabbed Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedSession ? 'Configure Session' : 'New Session'}
                size="lg"
            >
                <form onSubmit={handleFormSubmit(onSubmit)} className="space-y-4">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 h-10 p-1 bg-muted/50 rounded-lg">
                            <TabsTrigger value="basic" className="text-[10px] font-bold uppercase tracking-wide rounded-md">Basic Info</TabsTrigger>
                            <TabsTrigger value="policy" className="text-[10px] font-bold uppercase tracking-wide rounded-md">Operational</TabsTrigger>
                            <TabsTrigger value="admission" className="text-[10px] font-bold uppercase tracking-wide rounded-md">Admission</TabsTrigger>
                        </TabsList>

                        <div className="mt-4 min-h-[320px]">
                            <TabsContent value="basic" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Session Name *</label>
                                        <Input
                                            placeholder="Academic Year 2025-26"
                                            value={formData.name || ''}
                                            onChange={e => setValue('name', e.target.value, { shouldValidate: true })}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                            error={formErrors.name?.message}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Code</label>
                                        <Input
                                            placeholder="AS2526"
                                            value={formData.code || ''}
                                            onChange={e => setValue('code', e.target.value)}
                                            className="h-10 rounded-lg uppercase bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Start Date *</label>
                                        <Input
                                            type="date"
                                            value={formData.start_date || ''}
                                            onChange={e => setValue('start_date', e.target.value, { shouldValidate: true })}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                            error={formErrors.start_date?.message}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">End Date *</label>
                                        <Input
                                            type="date"
                                            value={formData.end_date || ''}
                                            onChange={e => setValue('end_date', e.target.value, { shouldValidate: true })}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                            error={formErrors.end_date?.message}
                                        />
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="policy" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Registry Status</label>
                                        <Select
                                            value={formData.status || AcademicSessionStatus.DRAFT}
                                            onChange={e => setValue('status', e.target.value as AcademicSessionStatus)}
                                            options={Object.values(AcademicSessionStatus).map(s => ({ value: s, label: s.toLowerCase() }))}
                                            className="h-10 rounded-lg capitalize bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Attendance Backdate (Days)</label>
                                        <Input
                                            type="number"
                                            value={formData.attendance_backdate_days ?? 0}
                                            onChange={e => setValue('attendance_backdate_days', parseInt(e.target.value, 10) || 0)}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Marks Lock Duration (Days)</label>
                                        <Input
                                            type="number"
                                            value={formData.marks_lock_days ?? 0}
                                            onChange={e => setValue('marks_lock_days', parseInt(e.target.value, 10) || 0)}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-foreground ml-0.5">Weekly Holidays</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {WEEKDAYS.map(day => (
                                            <button
                                                key={day.value}
                                                type="button"
                                                onClick={() => toggleWeekday(day.value)}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${formData.weekly_off_days?.includes(day.value)
                                                    ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                                                    : 'bg-surface border-border text-muted-foreground hover:border-foreground/20'
                                                    }`}
                                            >
                                                {day.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3 pt-4 border-t border-border/50">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-0.5">Operational Security Locks</label>
                                    <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border">
                                        <div
                                            onClick={() => setValue('is_attendance_locked', !formData.is_attendance_locked)}
                                            className="flex items-center gap-3 cursor-pointer group"
                                        >
                                            <div className={`w-9 h-5 rounded-full p-1 transition-colors ${formData.is_attendance_locked ? 'bg-destructive' : 'bg-muted'}`}>
                                                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${formData.is_attendance_locked ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </div>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Lock Attendance</span>
                                        </div>
                                        <div
                                            onClick={() => setValue('is_marks_locked', !formData.is_marks_locked)}
                                            className="flex items-center gap-3 cursor-pointer group"
                                        >
                                            <div className={`w-9 h-5 rounded-full p-1 transition-colors ${formData.is_marks_locked ? 'bg-destructive' : 'bg-muted'}`}>
                                                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${formData.is_marks_locked ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </div>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Lock Marks</span>
                                        </div>
                                        <div
                                            onClick={() => setValue('is_fees_locked', !formData.is_fees_locked)}
                                            className="flex items-center gap-3 cursor-pointer group"
                                        >
                                            <div className={`w-9 h-5 rounded-full p-1 transition-colors ${formData.is_fees_locked ? 'bg-destructive' : 'bg-muted'}`}>
                                                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${formData.is_fees_locked ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </div>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Lock Fees</span>
                                        </div>
                                        <div
                                            onClick={() => setValue('is_enrollment_locked', !formData.is_enrollment_locked)}
                                            className="flex items-center gap-3 cursor-pointer group"
                                        >
                                            <div className={`w-9 h-5 rounded-full p-1 transition-colors ${formData.is_enrollment_locked ? 'bg-destructive' : 'bg-muted'}`}>
                                                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${formData.is_enrollment_locked ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </div>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Lock Enroll</span>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="admission" className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Admission Starts</label>
                                        <Input
                                            type="date"
                                            value={formData.admission_start_date || ''}
                                            onChange={e => setValue('admission_start_date', e.target.value)}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-foreground ml-0.5">Admission Ends</label>
                                        <Input
                                            type="date"
                                            value={formData.admission_end_date || ''}
                                            onChange={e => setValue('admission_end_date', e.target.value)}
                                            className="h-10 rounded-lg bg-surface border-border text-foreground focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground ml-0.5">Internal Notes</label>
                                    <textarea
                                        className="w-full min-h-[120px] p-3 text-sm bg-muted/30 border border-border rounded-xl outline-none focus:bg-surface focus:border-primary transition-all text-foreground"
                                        placeholder="Add private session-specific directives..."
                                        value={formData.notes || ''}
                                        onChange={e => setValue('notes', e.target.value)}
                                    />
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>

                    <div className="flex gap-2 justify-end pt-4 border-t border-border">
                        <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)} className="h-9 px-4 font-bold border-border text-muted-foreground hover:text-foreground">
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={isSubmitting} className="h-9 px-6 bg-primary text-primary-foreground font-bold hover:bg-primary/90">
                            {isSubmitting ? 'Saving...' : selectedSession ? 'Save Changes' : 'Initialize Session'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleDelete}
                title="Delete Session?"
                description="This will permanently excise the academic matrix and all attached logs. Continue?"
                confirmLabel="Confirm Delete"
                variant="danger"
            />
        </div>
    );
}
