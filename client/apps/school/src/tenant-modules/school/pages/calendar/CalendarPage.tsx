import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
    ChevronLeft, 
    ChevronRight, 
    Calendar as CalendarIcon, 
    Plus,
    Trash2,
    Save,
    Info,
    Gift,
    CalendarDays,
    AlertTriangle,
} from 'lucide-react';
import { 
    Card, 
    Button, 
    Badge, 
    FadeIn, 
    Modal, 
    Input,
    Select
} from '@erp/common';
import { useGetCalendarRangeQuery, type DayDetail } from '../../api/academicCalendarApi';
import { 
    useAddSessionHolidayMutation, 
    useUpdateSessionHolidayMutation, 
    useDeleteSessionHolidayMutation,
    useAddMasterHolidayMutation,
    useUpdateMasterHolidayMutation,
    useDeleteMasterHolidayMutation,
    useSyncMasterHolidaysMutation,
    useGetMasterHolidaysQuery
} from '@core/api/endpoints/academicsApi';
import { useAppSelector } from '@store';
import { selectSelectedSessionId } from '@store/slices/sessionSlice';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGetAcademicSessionByIdQuery } from '@core/api/endpoints/academicsApi';
import { calendarHolidaySchema, type CalendarHolidayFormData } from '@/core/validation/schemas';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const DayStatusColors: Record<string, string> = {
    WORKING: 'bg-green-500/10 text-green-600 border-green-200',
    HOLIDAY: 'bg-red-500/10 text-red-600 border-red-200',
    WEEKLY_OFF: 'bg-blue-500/10 text-blue-600 border-blue-200',
    NON_SESSION: 'bg-slate-500/10 text-slate-600 border-slate-200',
    EXAM: 'bg-purple-500/10 text-purple-600 border-purple-200',
    EVENT: 'bg-orange-500/10 text-orange-600 border-orange-200',
};

const HOLIDAY_TYPES = [
    { label: 'National/Gazetted', value: 'NATIONAL' },
    { label: 'Regional/Restricted', value: 'REGIONAL' },
    { label: 'School Specific', value: 'SCHOOL' },
    { label: 'Other', value: 'OTHER' },
];

export default function AcademicCalendarPage() {
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentHolidayId, setCurrentHolidayId] = useState<string | null>(null);
    
    const selectedSessionId = useAppSelector(selectSelectedSessionId);
    const { data: sessionResponse } = useGetAcademicSessionByIdQuery(selectedSessionId || '', { skip: !selectedSessionId });
    const session = sessionResponse?.data;
    
    const startDate = useMemo(() => {
        const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
        return d.toISOString().split('T')[0];
    }, [viewDate]);

    const endDate = useMemo(() => {
        const d = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
        return d.toISOString().split('T')[0];
    }, [viewDate]);

    const { data: calendarData, isLoading, refetch } = useGetCalendarRangeQuery({
        startDate,
        endDate,
        sessionId: selectedSessionId || undefined
    });

    const [addHoliday] = useAddSessionHolidayMutation();
    const [updateHoliday] = useUpdateSessionHolidayMutation();
    const [deleteHoliday] = useDeleteSessionHolidayMutation();

    const [addMasterHoliday] = useAddMasterHolidayMutation();
    const [updateMasterHoliday] = useUpdateMasterHolidayMutation();
    const [deleteMasterHoliday] = useDeleteMasterHolidayMutation();
    const [syncMasterHolidays] = useSyncMasterHolidaysMutation();



    const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<CalendarHolidayFormData>({
        resolver: zodResolver(calendarHolidaySchema),
        defaultValues: {
            name: '',
            holiday_type: 'SCHOOL',
            description: '',
            is_gazetted: false,
            start_date: '',
            end_date: '',
            is_recurring: false,
        },
    });

    const prevMonth = () => {
        if (!session) {
            setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
            return;
        }

        const current = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
        const start = new Date(session.start_date);
        start.setDate(1); // Compare month-to-month
        start.setHours(0,0,0,0);

        if (current > start) {
            setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
        }
    };

    const nextMonth = () => {
        if (!session) {
            setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
            return;
        }

        const current = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
        const end = new Date(session.end_date);
        end.setDate(1); // Compare month-to-month
        end.setHours(0,0,0,0);

        if (current < end) {
            setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
        }
    };

    const isPrevDisabled = useMemo(() => {
        if (!session) return false;
        const current = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
        const start = new Date(session.start_date);
        start.setDate(1);
        start.setHours(0,0,0,0);
        return current <= start;
    }, [session, viewDate]);

    const isNextDisabled = useMemo(() => {
        if (!session) return false;
        const current = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
        const end = new Date(session.end_date);
        end.setDate(1);
        end.setHours(0,0,0,0);
        return current >= end;
    }, [session, viewDate]);

    const years = useMemo(() => {
        if (!session) return [viewDate.getFullYear()];
        const startY = new Date(session.start_date).getFullYear();
        const endY = new Date(session.end_date).getFullYear();
        const range = [];
        for (let y = startY; y <= endY; y++) range.push(y);
        return range;
    }, [session]);

    const allowedMonths = useMemo(() => {
        if (!session) return MONTHS.map((name, index) => ({ label: name, value: index.toString() }));
        
        const start = new Date(session.start_date);
        const end = new Date(session.end_date);
        
        return MONTHS.map((name, index) => {
            const date = new Date(viewDate.getFullYear(), index, 1);
            // Month is allowed if any part of it is within the session
            // A month is valid if it's not strictly before the start month OR strictly after the end month
            const monthStart = new Date(viewDate.getFullYear(), index, 1);
            const monthEnd = new Date(viewDate.getFullYear(), index + 1, 0);
            
            const disabled = monthEnd < start || monthStart > end;
            return { label: name, value: index.toString(), disabled };
        }).filter(m => !m.disabled);
    }, [session, viewDate.getFullYear()]);

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setViewDate(new Date(viewDate.getFullYear(), parseInt(e.target.value), 1));
    };

    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newYear = parseInt(e.target.value);
        let newMonth = viewDate.getMonth();
        
        if (session) {
            const start = new Date(session.start_date);
            const end = new Date(session.end_date);
            
            // If the current month is not available in the new year, pick the closest one
            const monthStart = new Date(newYear, newMonth, 1);
            const monthEnd = new Date(newYear, newMonth + 1, 0);
            
            if (monthEnd < start) newMonth = start.getMonth();
            if (monthStart > end) newMonth = end.getMonth();
        }
        
        setViewDate(new Date(newYear, newMonth, 1));
    };

    const handleDayClick = (dateStr: string, detail?: DayDetail) => {
        setSelectedDate(dateStr);
        setCurrentHolidayId(detail?.id || null);
        if (detail?.status === 'HOLIDAY' || detail?.status === 'WORKING') {
            reset({
                name: detail?.name || '',
                holiday_type: detail?.holidayType || 'SCHOOL',
                description: detail?.description || '',
                is_gazetted: detail?.isGazetted || false,
                start_date: dateStr,
                end_date: dateStr,
                is_recurring: !!detail?.isRecurring
            });
            setIsModalOpen(true);
        }
    };

    const onSaveHoliday = async (data: CalendarHolidayFormData) => {
        if (!selectedSessionId) return;

        try {
            if (data.is_recurring) {
                const date = new Date(selectedDate!);
                const masterData = {
                    name: data.name,
                    month: date.getMonth() + 1,
                    day: date.getDate(),
                    description: data.description,
                    is_gazetted: data.is_gazetted,
                    holiday_type: data.holiday_type
                };
                
                if (currentHolidayId) {
                    await updateMasterHoliday({
                        holidayId: currentHolidayId,
                        data: masterData
                    }).unwrap();
                } else {
                    await addMasterHoliday(masterData).unwrap();
                }
            } else {
                const holidayData = {
                    name: data.name,
                    start_date: data.start_date,
                    end_date: data.end_date,
                    description: data.description,
                    is_gazetted: data.is_gazetted,
                    holiday_type: data.holiday_type
                };

                if (currentHolidayId) {
                    await updateHoliday({
                        id: currentHolidayId,
                        data: { ...holidayData, session_id: selectedSessionId }
                    }).unwrap();
                } else {
                    await addHoliday({
                        ...holidayData,
                        session_id: selectedSessionId
                    }).unwrap();
                }
            }
            
            setIsModalOpen(false);
            reset();
            refetch();
        } catch (error) {
            console.error('Failed to save holiday:', error);
        }
    };

    const onDeleteHoliday = async () => {
        if (!currentHolidayId || !selectedSessionId) return;

        if (!confirm('Are you sure you want to remove this holiday?')) return;

        // Use the flag from the form state
        const isRecurring = watch('is_recurring');

        try {
            const detail = calendarData?.[selectedDate!];
            if (detail?.isRecurring) {
                await deleteMasterHoliday(currentHolidayId).unwrap();
            } else {
                await deleteHoliday(currentHolidayId).unwrap();
            }
            
            setIsModalOpen(false);
            refetch();
        } catch (error) {
            console.error('Failed to delete holiday:', error);
        }
    };

    const onSyncHolidays = async () => {
        if (!selectedSessionId) return;
        if (!confirm('This will import standard national and religious holidays. These will automatically adjust dates every year. Continue?')) return;
        try {
            await syncMasterHolidays(selectedSessionId).unwrap();
            refetch();
        } catch (error) {
            console.error('Failed to sync holidays:', error);
        }
    };

    const calendarDays = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            days.push({
                day: i,
                date: dateStr,
                detail: calendarData?.[dateStr]
            });
        }
        return days;
    }, [viewDate, calendarData]);

    const monthHolidays = useMemo(() => {
        if (!calendarData) return [];
        return Object.entries(calendarData)
            .filter(([_, detail]) => detail.status === 'HOLIDAY')
            .map(([dateStr, detail]) => ({ ...detail, date: dateStr }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [calendarData]);

    return (
        <div className="space-y-6">
            <FadeIn>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Academic Calendar</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage holidays and academic events for {MONTHS[viewDate.getMonth()]}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-card border border-border p-1 rounded-xl shadow-sm">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={prevMonth} 
                            disabled={isPrevDisabled}
                            className={`transition-opacity ${isPrevDisabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-primary/10'}`}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        
                        <div className="flex items-center gap-1 px-1 border-x border-border/50">
                            <div className="w-[140px]">
                                <Select
                                    value={viewDate.getMonth().toString()}
                                    onChange={handleMonthChange}
                                    className="!py-1 !px-2 border-none shadow-none focus:ring-0 bg-transparent font-semibold text-base"
                                    options={allowedMonths}
                                />
                            </div>
                            <div className="w-[100px]">
                                <Select
                                    value={viewDate.getFullYear().toString()}
                                    onChange={handleYearChange}
                                    className="!py-1 !px-2 border-none shadow-none focus:ring-0 bg-transparent font-semibold text-base"
                                    options={years.map(y => ({ 
                                        label: y.toString(), 
                                        value: y.toString() 
                                    }))}
                                />
                            </div>
                        </div>

                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={nextMonth} 
                            disabled={isNextDisabled}
                            className={`transition-opacity ${isNextDisabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-primary/10'}`}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                         <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={onSyncHolidays}
                            className="bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                        >
                            <CalendarDays className="w-4 h-4 mr-2" />
                            Sync Smart Holidays
                        </Button>
                    </div>
                </div>
            </FadeIn>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <Card className={`lg:col-span-3 p-6 shadow-sm border-border/50 relative overflow-hidden ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-card/50 z-10 backdrop-blur-[1px]">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                        </div>
                    )}
                    <div className="grid grid-cols-7 gap-2 mb-6">
                        {DAYS.map(day => (
                            <div key={day} className="text-center text-xs font-bold text-muted-foreground uppercase tracking-widest pb-2 border-b border-border/30">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-3">
                        {calendarDays.map((day, idx) => {
                            if (!day) return <div key={`empty-${idx}`} className="aspect-square bg-slate-50/30 rounded-xl" />;
                            
                            const status = day.detail?.status || 'WORKING';
                            const bgColor = DayStatusColors[status] || 'bg-slate-50';
                            const isToday = new Date().toISOString().split('T')[0] === day.date;
                            
                            // Check if date is outside session
                            let isOutsideSession = false;
                            if (session) {
                                const d = new Date(day.date);
                                const start = new Date(session.start_date);
                                const end = new Date(session.end_date);
                                // Set hours to 0 to compare only dates
                                d.setHours(0,0,0,0);
                                start.setHours(0,0,0,0);
                                end.setHours(0,0,0,0);
                                isOutsideSession = d < start || d > end;
                            }
                            
                            return (
                                <motion.div
                                    key={day.date}
                                    whileHover={!isOutsideSession ? { scale: 1.02, y: -2 } : {}}
                                    onClick={() => !isOutsideSession && handleDayClick(day.date, day.detail)}
                                    className={`aspect-square p-2.5 rounded-xl border flex flex-col justify-between transition-all relative overflow-hidden group 
                                        ${isOutsideSession ? 'bg-slate-100/50 border-slate-200 cursor-not-allowed opacity-60' : `${bgColor} cursor-pointer hover:shadow-md`} 
                                        ${isToday ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                                >
                                    {isOutsideSession && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[1px] z-[1]">
                                            <AlertTriangle className="w-4 h-4 text-slate-400 mb-1" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Session Over</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start">
                                        <span className={`text-sm font-bold ${isToday ? 'text-primary' : 'opacity-70'}`}>
                                            {day.day}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {day.detail?.isRecurring && (
                                                <div title="Master Holiday (Applied to all academic years)">
                                                    <CalendarDays className="w-3 h-3 text-primary/70" />
                                                </div>
                                            )}
                                            {day.detail?.isGazetted && (
                                                <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" title="Gazetted Holiday" />
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="mt-1 min-h-[20px]">
                                        {day.detail?.name ? (
                                            <p className="text-[10px] font-semibold leading-tight line-clamp-2 uppercase tracking-tight">
                                                {day.detail.name}
                                            </p>
                                        ) : status === 'WORKING' ? (
                                            <Plus className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity ml-auto" />
                                        ) : null}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card className="p-6 bg-gradient-to-br from-card to-muted/30 border-border/50">
                        <h3 className="text-lg font-semibold mb-5 flex items-center gap-2">
                             <Info className="w-5 h-5 text-primary" /> Key Metadata
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <span className="text-sm font-medium">Holidays</span>
                                </div>
                                <Badge variant="outline">{Object.values(calendarData || {}).filter(d => d.status === 'HOLIDAY').length}</Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                    <span className="text-sm font-medium">Weekly Off</span>
                                </div>
                                <Badge variant="outline">{Object.values(calendarData || {}).filter(d => d.status === 'WEEKLY_OFF').length}</Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span className="text-sm font-medium">Working Days</span>
                                </div>
                                <Badge variant="outline">{Object.values(calendarData || {}).filter(d => d.status === 'WORKING').length}</Badge>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 border-border/50 bg-card overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Gift className="w-5 h-5 text-red-500" /> {MONTHS[viewDate.getMonth()]} Holidays
                            </h3>
                            <Badge className="bg-red-500/10 text-red-600 border-red-200">
                                {monthHolidays.length}
                            </Badge>
                        </div>
                        
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {monthHolidays.length === 0 ? (
                                <div className="text-center py-8 opacity-50">
                                    <CalendarDays className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                                    <p className="text-xs font-medium">No holidays this month</p>
                                </div>
                            ) : (
                                monthHolidays.map((holiday) => (
                                    <motion.div
                                        key={holiday.date}
                                        whileHover={{ x: 4 }}
                                        onClick={() => handleDayClick(holiday.date, holiday)}
                                        className="p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-red-500/5 hover:border-red-200 transition-all cursor-pointer group"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-red-600">
                                                {new Date(holiday.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                            </span>
                                            {holiday.isGazetted && (
                                                <Badge className="text-[8px] px-1 py-0 h-4 bg-red-100 text-red-700 border-red-200 uppercase tracking-tighter">Gazetted</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm font-bold text-foreground leading-tight group-hover:text-red-700 transition-colors">
                                            {holiday.name}
                                        </p>
                                        {holiday.description && (
                                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1 italic">
                                                {holiday.description}
                                            </p>
                                        )}
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </Card>

                    <Card className="p-6 border-dashed border-2 border-primary/20 bg-primary/5">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-primary mb-2">Pro Tip</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Click on any working day to mark it as a holiday. You can add detailed metadata like descriptions and gazetted status for better reporting.
                        </p>
                    </Card>
                </div>
            </div>

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                title={watch('name') ? `Holiday Details: ${watch('name')}` : `Add Holiday for ${selectedDate}`}
                size="lg"
            >
                <form onSubmit={handleSubmit(onSaveHoliday)} className="space-y-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Holiday Name</label>
                            <Input 
                                {...register('name')} 
                                placeholder="e.g., Independence Day"
                                error={errors.name?.message}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Holiday Type</label>
                            <Select 
                                value={watch('holiday_type')}
                                onChange={(e) => setValue('holiday_type', e.target.value)}
                                options={HOLIDAY_TYPES}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Start Date</label>
                            <Input type="date" {...register('start_date')} />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">End Date</label>
                            <Input type="date" {...register('end_date')} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-foreground">Description</label>
                        <textarea 
                            {...register('description')}
                            className="w-full min-h-[100px] p-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                            placeholder="Provide details about why this is a holiday..."
                        />
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl border border-border/50">
                            <input 
                                type="checkbox" 
                                id="is_gazetted" 
                                {...register('is_gazetted')}
                                className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                            />
                            <label htmlFor="is_gazetted" className="text-sm font-medium cursor-pointer">
                                Mark as Gazetted Holiday (Mandatory Off)
                            </label>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                <input 
                                    type="checkbox" 
                                    id="is_recurring" 
                                    {...register('is_recurring')}
                                    className="h-5 w-5 rounded border-primary/30 text-primary focus:ring-primary"
                                />
                                <div className="space-y-0.5">
                                    <label htmlFor="is_recurring" className="text-sm font-semibold cursor-pointer text-primary">
                                        Recurring Holiday (Master)
                                    </label>
                                    <p className="text-xs text-primary/70">
                                        This holiday will automatically repeat every year on this date.
                                    </p>
                                </div>
                            </div>
                            
                            {watch('is_recurring') && (
                                <FadeIn>
                                    <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-200 rounded-lg">
                                        <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                        <p className="text-[11px] text-amber-700 leading-relaxed">
                                            Tip: For festivals like Diwali or Holi that change dates annually, 
                                            use the <strong>"Sync Smart Holidays"</strong> button on the main calendar to pull automated rules.
                                        </p>
                                    </div>
                                </FadeIn>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between pt-4 border-t border-border">
                        <div>
                            {currentHolidayId && (
                                <Button 
                                    variant="ghost" 
                                    type="button" 
                                    onClick={onDeleteHoliday}
                                    className="text-red-500 hover:bg-red-50 gap-2"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete Holiday
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary" className="gap-2" disabled={isSubmitting}>
                                <Save className="w-4 h-4" /> {currentHolidayId ? 'Update' : 'Save'} Holiday
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
