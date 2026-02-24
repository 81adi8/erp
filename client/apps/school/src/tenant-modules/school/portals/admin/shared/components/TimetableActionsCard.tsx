import React from 'react';
import { Settings, RefreshCw, Lock, Unlock, Zap, Copy, FileText, AlertTriangle } from 'lucide-react';
import { Card, Button, Tooltip, Badge, cn } from '@erp/common';

interface TimetableActionsCardProps {
    isLocked: boolean;
    onToggleLock: () => void;
    onRefresh: () => void;
    isRefreshing: boolean;
    onAutoGenerate?: () => void;
    onCopyFromOther?: () => void;
    onViewConflicts?: () => void;
    statusLabel?: string;
    className?: string;
}

export const TimetableActionsCard: React.FC<TimetableActionsCardProps> = ({
    isLocked,
    onToggleLock,
    onRefresh,
    isRefreshing,
    onAutoGenerate,
    onCopyFromOther,
    onViewConflicts,
    statusLabel = "Draft Mode",
    className
}) => {
    return (
        <Card className={cn("p-5 border-border shadow-sm bg-surface overflow-hidden relative", className)}>
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-start gap-4">
                    <div className={cn(
                        "p-3 rounded-2xl shadow-sm transition-colors duration-300",
                        isLocked ? "bg-error/10 text-error" : "bg-primary/10 text-primary"
                    )}>
                        {isLocked ? <Lock size={24} /> : <Settings size={24} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-foreground uppercase tracking-tight">Control Panel</h3>
                            <Badge variant={isLocked ? "danger" : "info"} className="text-[10px] font-black uppercase py-0 px-2 h-5">
                                {isLocked ? "Finalized" : statusLabel}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm font-medium">
                            {isLocked
                                ? "The timetable is currently locked for this section. Unlock to make modifications."
                                : "Manage period distributions, resolve conflicts, and publish the final schedule."}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Tooltip content="Refresh all data">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className="bg-background border-border hover:bg-muted h-10 px-4 rounded-xl"
                        >
                            <RefreshCw size={14} className={cn("mr-2", isRefreshing && "animate-spin")} />
                            <span className="text-xs font-bold uppercase tracking-wider">Sync</span>
                        </Button>
                    </Tooltip>

                    {!isLocked && onAutoGenerate && (
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={onAutoGenerate}
                            disabled={isRefreshing}
                            className="bg-primary text-primary-foreground h-10 px-4 rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                            <Zap size={14} className="mr-2 fill-current" />
                            <span className="text-xs font-bold uppercase tracking-wider">Auto-Gen</span>
                        </Button>
                    )}

                    <Button
                        variant={isLocked ? "destructive" : "outline"}
                        size="sm"
                        onClick={onToggleLock}
                        className={cn(
                            "h-10 px-4 rounded-xl shadow-sm transition-all duration-300",
                            !isLocked && "bg-background border-border hover:bg-muted"
                        )}
                    >
                        {isLocked ? <Unlock size={14} className="mr-2" /> : <Lock size={14} className="mr-2" />}
                        <span className="text-xs font-bold uppercase tracking-wider">
                            {isLocked ? "Unfreeze" : "Freeze"}
                        </span>
                    </Button>
                </div>
            </div>

            {/* Quick Utility Links */}
            {!isLocked && (
                <div className="mt-5 pt-4 border-t border-border flex flex-wrap gap-4">
                    {onCopyFromOther && (
                        <button
                            onClick={onCopyFromOther}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest"
                        >
                            <Copy size={12} />
                            Clone from Section
                        </button>
                    )}
                    {onViewConflicts && (
                        <button
                            onClick={onViewConflicts}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-warning transition-colors uppercase tracking-widest"
                        >
                            <AlertTriangle size={12} />
                            Check Conflicts
                        </button>
                    )}
                    <button className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest ml-auto">
                        <FileText size={12} />
                        Export PDF
                    </button>
                </div>
            )}
        </Card>
    );
};
