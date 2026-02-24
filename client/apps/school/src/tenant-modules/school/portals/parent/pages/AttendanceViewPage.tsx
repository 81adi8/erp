/**
 * Attendance View Page
 * Shows child's attendance history
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useParent } from '../context/ParentContext';
import { useGetChildAttendanceQuery } from '../../../api/parentPortalApi';
import { LoadingSpinner } from '@erp/common';

export default function AttendanceViewPage() {
    const { selectedChild } = useParent();
    const childId = selectedChild?.id || '';
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const { data: attendanceData, isLoading, isError } = useGetChildAttendanceQuery(childId, { skip: !childId });

    const attendance = attendanceData?.data || [];

    // Calculate stats
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const absentCount = attendance.filter(a => a.status === 'absent').length;
    const leaveCount = attendance.filter(a => a.status === 'leave').length;
    const totalDays = attendance.length;
    const attendancePercent = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;

    // Get days in month
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { daysInMonth, firstDay };
    };

    const { daysInMonth, firstDay } = getDaysInMonth(currentMonth);

    // Get attendance for a specific date
    const getAttendanceForDate = (day: number) => {
        const year = currentMonth.getFullYear();
        const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
        const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
        return attendance.find(a => a.date === dateStr);
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
            return newDate;
        });
    };

    if (!selectedChild) {
        return <div className="text-center py-8 text-muted-foreground">No child selected</div>;
    }

    if (isLoading) {
        return <div className="flex items-center justify-center py-12"><LoadingSpinner size="lg" /></div>;
    }

    if (isError) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-center">
                Failed to load attendance data
            </div>
        );
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];

    return (
        <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-emerald-700">{presentCount}</p>
                    <p className="text-[10px] text-emerald-600">Present</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-red-700">{absentCount}</p>
                    <p className="text-[10px] text-red-600">Absent</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-amber-700">{leaveCount}</p>
                    <p className="text-[10px] text-amber-600">Leave</p>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-primary">{attendancePercent}%</p>
                    <p className="text-[10px] text-primary">Rate</p>
                </div>
            </div>

            {/* Calendar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-4"
            >
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => navigateMonth('prev')} className="p-2 hover:bg-muted rounded-lg">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className="font-semibold text-foreground">
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h3>
                    <button onClick={() => navigateMonth('next')} className="p-2 hover:bg-muted rounded-lg">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <div key={i} className="text-center text-xs text-muted-foreground py-2">{d}</div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for days before first of month */}
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="aspect-square" />
                    ))}
                    
                    {/* Days of month */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const att = getAttendanceForDate(day);
                        const isToday = new Date().getDate() === day && 
                                       new Date().getMonth() === currentMonth.getMonth() &&
                                       new Date().getFullYear() === currentMonth.getFullYear();
                        
                        return (
                            <div
                                key={day}
                                className={`aspect-square flex items-center justify-center text-sm rounded-lg relative
                                    ${isToday ? 'ring-2 ring-primary' : ''}
                                    ${att?.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 
                                      att?.status === 'absent' ? 'bg-red-100 text-red-700' : 
                                      att?.status === 'leave' ? 'bg-amber-100 text-amber-700' : 
                                      'bg-muted/50 text-muted-foreground'}`}
                            >
                                {day}
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-emerald-100" />
                        <span className="text-xs text-muted-foreground">Present</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-red-100" />
                        <span className="text-xs text-muted-foreground">Absent</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-amber-100" />
                        <span className="text-xs text-muted-foreground">Leave</span>
                    </div>
                </div>
            </motion.div>

            {/* Recent Attendance List */}
            {attendance.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-card border border-border rounded-xl overflow-hidden"
                >
                    <div className="p-4 border-b border-border">
                        <h3 className="font-semibold text-foreground">Recent Records</h3>
                    </div>
                    <div className="divide-y divide-border max-h-60 overflow-y-auto">
                        {attendance.slice(0, 10).map((a) => (
                            <div key={a.date} className="flex items-center justify-between p-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center
                                        ${a.status === 'present' ? 'bg-emerald-100' : 
                                          a.status === 'absent' ? 'bg-red-100' : 'bg-amber-100'}`}>
                                        {a.status === 'present' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> :
                                         a.status === 'absent' ? <XCircle className="w-4 h-4 text-red-600" /> :
                                         <Clock className="w-4 h-4 text-amber-600" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {new Date(a.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                                        </p>
                                        {a.remarks && <p className="text-xs text-muted-foreground">{a.remarks}</p>}
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full capitalize
                                    ${a.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 
                                      a.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {a.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
