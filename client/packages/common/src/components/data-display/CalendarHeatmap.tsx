// ============================================================================
// Calendar Heatmap - Visual attendance/activity calendar
// ============================================================================

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Tooltip } from '../ui/Tooltip';

export interface CalendarHeatmapDay {
    date: string; // YYYY-MM-DD format
    value: number;
    label?: string;
}

export interface CalendarHeatmapProps {
    data: CalendarHeatmapDay[];
    startDate?: Date;
    endDate?: Date;
    colorScale?: string[];
    maxValue?: number;
    showMonthLabels?: boolean;
    showDayLabels?: boolean;
    cellSize?: number;
    cellGap?: number;
    className?: string;
}

const DEFAULT_COLORS = [
    'bg-muted',        // 0% - No data
    'bg-success/20',   // 1-25%
    'bg-success/40',   // 26-50%
    'bg-success/60',   // 51-75%
    'bg-success/80',   // 76-99%
    'bg-success',      // 100%
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = memo(({
    data,
    startDate: propStartDate,
    endDate: propEndDate,
    colorScale = DEFAULT_COLORS,
    maxValue = 100,
    showMonthLabels = true,
    showDayLabels = true,
    cellSize = 14,
    cellGap = 3,
    className = '',
}) => {
    // Calculate date range
    const { startDate, endDate, weeks } = useMemo(() => {
        const now = new Date();
        const end = propEndDate || now;
        const start = propStartDate || new Date(now.getFullYear(), now.getMonth() - 2, 1);
        
        // Create a map for quick lookups
        const dataMap = new Map<string, CalendarHeatmapDay>();
        data.forEach(d => dataMap.set(d.date, d));

        // Generate weeks array
        const weeksArray: Array<Array<{ date: Date; value: number; label?: string }>> = [];
        const current = new Date(start);
        current.setDate(current.getDate() - current.getDay()); // Start from Sunday

        while (current <= end) {
            const week: Array<{ date: Date; value: number; label?: string }> = [];
            for (let i = 0; i < 7; i++) {
                const dateStr = current.toISOString().split('T')[0];
                const dayData = dataMap.get(dateStr);
                week.push({
                    date: new Date(current),
                    value: dayData?.value ?? -1,
                    label: dayData?.label,
                });
                current.setDate(current.getDate() + 1);
            }
            weeksArray.push(week);
        }

        return { startDate: start, endDate: end, weeks: weeksArray };
    }, [data, propStartDate, propEndDate]);

    // Get color based on value
    const getColor = (value: number): string => {
        if (value < 0) return 'bg-transparent';
        if (value === 0) return colorScale[0];
        
        const percentage = (value / maxValue) * 100;
        if (percentage <= 25) return colorScale[1];
        if (percentage <= 50) return colorScale[2];
        if (percentage <= 75) return colorScale[3];
        if (percentage < 100) return colorScale[4];
        return colorScale[5];
    };

    // Get month labels positions
    const monthLabels = useMemo(() => {
        const labels: Array<{ month: string; index: number }> = [];
        let lastMonth = -1;

        weeks.forEach((week, weekIndex) => {
            const firstDayOfWeek = week[0].date;
            const month = firstDayOfWeek.getMonth();
            if (month !== lastMonth && firstDayOfWeek >= startDate) {
                labels.push({ month: MONTHS[month], index: weekIndex });
                lastMonth = month;
            }
        });

        return labels;
    }, [weeks, startDate]);

    return (
        <div className={`overflow-x-auto ${className}`}>
            <div className="inline-flex flex-col gap-1">
                {/* Month labels */}
                {showMonthLabels && (
                    <div className="flex ml-8" style={{ gap: cellGap }}>
                        {monthLabels.map((label, i) => (
                            <div
                                key={i}
                                className="text-xs text-muted-foreground"
                                style={{
                                    marginLeft: i === 0 ? 0 : (label.index - (monthLabels[i - 1]?.index || 0) - 1) * (cellSize + cellGap),
                                    width: cellSize,
                                }}
                            >
                                {label.month}
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex">
                    {/* Day labels */}
                    {showDayLabels && (
                        <div className="flex flex-col mr-2" style={{ gap: cellGap }}>
                            {WEEKDAYS.map((day, i) => (
                                <div
                                    key={day}
                                    className="text-xs text-muted-foreground text-right"
                                    style={{ height: cellSize, lineHeight: `${cellSize}px` }}
                                >
                                    {i % 2 === 1 ? day : ''}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Calendar grid */}
                    <div className="flex" style={{ gap: cellGap }}>
                        {weeks.map((week, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col" style={{ gap: cellGap }}>
                                {week.map((day, dayIndex) => {
                                    const isOutOfRange = day.date < startDate || day.date > endDate;
                                    const tooltipContent = day.value >= 0
                                        ? `${day.date.toLocaleDateString()}: ${day.label || `${day.value}%`}`
                                        : '';

                                    return (
                                        <Tooltip key={dayIndex} content={tooltipContent} disabled={isOutOfRange || day.value < 0}>
                                            <motion.div
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{
                                                    delay: (weekIndex * 7 + dayIndex) * 0.005,
                                                    duration: 0.2,
                                                }}
                                                whileHover={!isOutOfRange && day.value >= 0 ? { scale: 1.2 } : undefined}
                                                className={`
                                                    rounded-sm transition-colors
                                                    ${getColor(isOutOfRange ? -1 : day.value)}
                                                    ${!isOutOfRange && day.value >= 0 ? 'cursor-pointer' : ''}
                                                `}
                                                style={{
                                                    width: cellSize,
                                                    height: cellSize,
                                                }}
                                            />
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-2 mt-2 ml-8">
                    <span className="text-xs text-muted-foreground">Less</span>
                    {colorScale.map((color, i) => (
                        <div
                            key={i}
                            className={`rounded-sm ${color}`}
                            style={{ width: cellSize - 2, height: cellSize - 2 }}
                        />
                    ))}
                    <span className="text-xs text-muted-foreground">More</span>
                </div>
            </div>
        </div>
    );
});

CalendarHeatmap.displayName = 'CalendarHeatmap';
