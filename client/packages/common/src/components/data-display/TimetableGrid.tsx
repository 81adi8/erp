import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock,
    RefreshCw,
    Lock,
    Unlock,
    Plus,
    Calendar,
    ArrowRightLeft,
    Trash2,
    CalendarDays
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Tooltip } from '../ui/Tooltip';
import { Skeleton } from '../ui/Skeleton';
import { cn } from '../../utils/cn';

export interface TimetableSlotDisplay {
    id: string;
    dayOfWeek: number;
    slotNumber: number;
    title: string;
    subtitle?: string;
    type: string;
    startTime: string;
    endTime: string;
    color?: string;
    icon?: React.ReactNode;
    isLocked?: boolean;
    metadata?: { room?: string } & Record<string, unknown>;
}

export interface TimetableGridProps {
    days: { value: number; label: string; shortLabel: string }[];
    timeSlots: { number: number; start: string; end: string; label?: string }[];
    slots: TimetableSlotDisplay[];
    onSlotClick?: (day: number, slotNumber: number, existingSlot?: TimetableSlotDisplay) => void;
    onSlotShift?: (slotId: string, toDay: number, toSlot: number) => void;
    onDeleteSlot?: (slotId: string) => void;
    onRefresh?: () => void;
    isRefreshing?: boolean;
    isLoading?: boolean;
    isLocked?: boolean;
    onToggleLock?: () => void;
    title?: string;
    subtitle?: string;
    slotTypeConfig?: Record<string, { bg: string; text: string; icon: React.ElementType }>;
    className?: string;
}

const DEFAULT_SLOT_CONFIG: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
    REGULAR: { bg: 'bg-primary/10', text: 'text-primary', icon: Calendar },
    BREAK: { bg: 'bg-warning/10', text: 'text-warning', icon: Clock },
};

export const TimetableGrid: React.FC<TimetableGridProps> = ({
    days,
    timeSlots,
    slots,
    onSlotClick,
    onSlotShift,
    onDeleteSlot,
    onRefresh,
    isRefreshing = false,
    isLoading = false,
    isLocked = false,
    onToggleLock,
    title,
    subtitle,
    slotTypeConfig = DEFAULT_SLOT_CONFIG,
    className
}) => {
    const slotMap = useMemo(() => {
        const map = new Map<string, TimetableSlotDisplay>();
        slots.forEach(slot => {
            map.set(`${slot.dayOfWeek}-${slot.slotNumber}`, slot);
        });
        return map;
    }, [slots]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid gap-2" style={{ gridTemplateColumns: `100px repeat(${days.length}, 1fr)` }}>
                    {[...Array((timeSlots.length + 1) * (days.length + 1))].map((_, i) => (
                        <Skeleton key={i} className="h-20 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col space-y-4", className)}>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    {title && (
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black text-foreground tracking-tight uppercase">{title}</h2>
                            {isLocked && <Badge variant="danger" className="border-0 py-0 h-5"><Lock size={10} className="mr-1" /> Locked</Badge>}
                        </div>
                    )}
                    {subtitle && <p className="text-xs text-muted-foreground font-medium">{subtitle}</p>}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 border-r border-border pr-3">
                        {onRefresh && (
                            <button
                                onClick={onRefresh}
                                disabled={isRefreshing}
                                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 uppercase disabled:opacity-50"
                            >
                                <RefreshCw size={10} className={cn(isRefreshing && "animate-spin")} />
                                Refresh Grid
                            </button>
                        )}
                    </div>

                    {onToggleLock && (
                        <Button
                            variant={isLocked ? "destructive" : "outline"}
                            size="sm"
                            onClick={onToggleLock}
                            className={cn("h-9 rounded-xl", !isLocked && "border-border hover:bg-muted")}
                        >
                            {isLocked ? <Lock size={14} className="mr-1.5" /> : <Unlock size={14} className="mr-1.5" />}
                            <span className="text-xs">{isLocked ? "Unlock Grid" : "Lock Grid"}</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Grid Container */}
            <Card className="p-4 bg-surface border-border rounded-3xl overflow-x-auto shadow-sm">
                <div className="min-w-[800px]">
                    {/* Header Row */}
                    <div className="grid gap-2" style={{ gridTemplateColumns: `100px repeat(${days.length}, 1fr)` }}>
                        <div className="flex items-center justify-center p-3 bg-muted/50 rounded-xl">
                            <CalendarDays size={16} className="text-muted-foreground/50" />
                        </div>
                        {days.map((day) => (
                            <div key={day.value} className="p-3 bg-primary/5 rounded-xl text-center border border-primary/10">
                                <span className="text-xs font-black text-primary uppercase tracking-wider">{day.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Time Rows */}
                    <div className="mt-3 space-y-2">
                        {timeSlots.map((timeSlot) => (
                            <div key={timeSlot.number} className="grid gap-2" style={{ gridTemplateColumns: `100px repeat(${days.length}, 1fr)` }}>
                                {/* Time Cell */}
                                <div className="p-3 bg-muted/30 rounded-xl flex flex-col items-center justify-center border border-border/50">
                                    <span className="text-[10px] font-bold text-foreground">{timeSlot.start}</span>
                                    <div className="h-px w-4 bg-border my-1" />
                                    <span className="text-[10px] font-bold text-foreground">{timeSlot.end}</span>
                                    {timeSlot.label && <span className="text-[8px] text-muted-foreground mt-1 uppercase font-black">{timeSlot.label}</span>}
                                </div>

                                {/* Day Cells */}
                                {days.map((day) => {
                                    const slot = slotMap.get(`${day.value}-${timeSlot.number}`);
                                    const config = slot ? (slotTypeConfig[slot.type] || DEFAULT_SLOT_CONFIG.REGULAR) : null;
                                    const Icon = config?.icon || Calendar;

                                    return (
                                        <motion.div
                                            key={`${day.value}-${timeSlot.number}`}
                                            className={cn(
                                                "relative min-h-[90px] rounded-xl border-2 transition-all p-2 group",
                                                slot
                                                    ? `${config?.bg} border-transparent shadow-sm`
                                                    : "border-dashed border-border hover:border-primary/30 hover:bg-primary/5 cursor-pointer",
                                                isLocked && slot && "cursor-default opacity-90",
                                                !isLocked && "hover:shadow-md"
                                            )}
                                            onClick={() => !isLocked && onSlotClick?.(day.value, timeSlot.number, slot)}
                                            whileHover={!isLocked ? { scale: 1.01 } : {}}
                                            whileTap={!isLocked ? { scale: 0.98 } : {}}
                                        >
                                            <AnimatePresence mode="wait">
                                                {slot ? (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        className="h-full flex flex-col"
                                                    >
                                                        <div className="flex items-start justify-between mb-1">
                                                            <div className={cn("p-1.5 rounded-lg", config?.bg, config?.text)}>
                                                                <Icon size={14} />
                                                            </div>
                                                            {!isLocked && (
                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    {onSlotShift && (
                                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Shift/Swap">
                                                                            <ArrowRightLeft size={12} className="text-muted-foreground" />
                                                                        </Button>
                                                                    )}
                                                                    {onDeleteSlot && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-6 w-6 p-0 hover:bg-destructive/10"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onDeleteSlot(slot.id);
                                                                            }}
                                                                        >
                                                                            <Trash2 size={12} className="text-destructive" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {isLocked && <Lock size={10} className="text-muted-foreground/40 mt-1" />}
                                                        </div>

                                                        <div className="mt-auto">
                                                            <p className={cn("text-xs font-black uppercase line-clamp-1", config?.text)}>
                                                                {slot.title}
                                                            </p>
                                                            {slot.subtitle && (
                                                                <p className="text-[9px] text-muted-foreground font-bold flex items-center gap-1 mt-0.5 max-w-full">
                                                                    <span className="truncate">{slot.subtitle}</span>
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Slot metadata hints if needed */}
                                                        {slot.metadata?.room && (
                                                            <div className="absolute bottom-1.5 right-1.5">
                                                                <Badge variant="default" className="bg-background/50 backdrop-blur-sm text-[8px] px-1 py-0 h-3 border-0">
                                                                    R: {slot.metadata.room}
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                ) : (
                                                    <motion.div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                                                        <div className="p-2 bg-primary/10 rounded-full">
                                                            <Plus size={20} className="text-primary" />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Footer / Legend */}
            <div className="flex flex-wrap items-center justify-between gap-4 px-2">
                <div className="flex flex-wrap gap-2">
                    {Object.entries(slotTypeConfig).map(([type, config]) => (
                        <div key={type} className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border", config.bg, config.text, "border-current/10")}>
                            <div className="w-1.5 h-1.5 rounded-full bg-current" />
                            {type}
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded border border-dashed border-border bg-primary/5" />
                        <span>Empty Slot</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded bg-primary/20" />
                        <span>Occupied</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
