/**
 * Parent Dashboard
 * Shows overview of selected child's data
 */
import { motion } from 'framer-motion';
import { Calendar, FileText, IndianRupee, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useParent } from '../context/ParentContext';
import { useGetChildAttendanceQuery, useGetChildFeesQuery, useGetChildMarksQuery } from '../../../api/parentPortalApi';
import { LoadingSpinner } from '@erp/common';

export default function ParentDashboard() {
    const { selectedChild } = useParent();
    const childId = selectedChild?.id || '';

    const { data: attendanceData, isLoading: attendanceLoading } = useGetChildAttendanceQuery(childId, { skip: !childId });
    const { data: feesData, isLoading: feesLoading } = useGetChildFeesQuery(childId, { skip: !childId });
    const { data: marksData, isLoading: marksLoading } = useGetChildMarksQuery(childId, { skip: !childId });

    const attendance = attendanceData?.data || [];
    const fees = feesData?.data || [];
    const marks = marksData?.data || [];

    // Calculate stats
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = attendance.find(a => a.date === today);
    
    const totalFees = fees.reduce((sum, f) => sum + (f.amount_paid || 0), 0);
    const pendingFees = fees.filter(f => f.status === 'pending').reduce((sum, f) => sum + (f.amount_paid || 0), 0);
    
    const latestMarks = marks.slice(0, 3);
    const avgPercentage = marks.length > 0 
        ? Math.round(marks.reduce((sum, m) => sum + ((m.marks_obtained / m.max_marks) * 100), 0) / marks.length)
        : 0;

    const isLoading = attendanceLoading || feesLoading || marksLoading;

    if (!selectedChild) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No child selected
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    const stats = [
        {
            label: "Today's Attendance",
            value: todayAttendance?.status || 'Not Marked',
            icon: Calendar,
            color: todayAttendance?.status === 'present' ? 'text-emerald-600 bg-emerald-50' : 
                   todayAttendance?.status === 'absent' ? 'text-red-600 bg-red-50' : 'text-muted-foreground bg-muted'
        },
        {
            label: 'Average Score',
            value: `${avgPercentage}%`,
            icon: TrendingUp,
            color: 'text-primary bg-primary/10'
        },
        {
            label: 'Total Fees Paid',
            value: `₹${totalFees.toLocaleString()}`,
            icon: IndianRupee,
            color: 'text-success bg-emerald-50'
        },
        {
            label: 'Pending Dues',
            value: pendingFees > 0 ? `₹${pendingFees.toLocaleString()}` : 'None',
            icon: pendingFees > 0 ? AlertCircle : CheckCircle,
            color: pendingFees > 0 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'
        },
    ];

    return (
        <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-card border border-border rounded-xl p-4"
                    >
                        <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
                            <stat.icon className="w-5 h-5" />
                        </div>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <p className="text-lg font-semibold text-foreground capitalize">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Latest Marks */}
            {latestMarks.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-card border border-border rounded-xl p-4"
                >
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-foreground">Latest Marks</h3>
                        <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                        {latestMarks.map((mark) => (
                            <div key={mark.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                <div>
                                    <p className="font-medium text-foreground text-sm">{mark.subject_name || 'Subject'}</p>
                                    <p className="text-xs text-muted-foreground">{mark.exam_name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-foreground">{mark.marks_obtained}/{mark.max_marks}</p>
                                    {mark.grade && <p className="text-xs text-primary">{mark.grade}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Recent Attendance */}
            {attendance.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-card border border-border rounded-xl p-4"
                >
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-foreground">Recent Attendance</h3>
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {attendance.slice(0, 7).map((a) => (
                            <div key={a.date} className="flex flex-col items-center min-w-[40px]">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                                    ${a.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 
                                      a.status === 'absent' ? 'bg-red-100 text-red-700' : 
                                      a.status === 'leave' ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground'}`}>
                                    {a.status === 'present' ? 'P' : a.status === 'absent' ? 'A' : a.status === 'leave' ? 'L' : 'H'}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    {new Date(a.date).getDate()}
                                </p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Empty State */}
            {attendance.length === 0 && fees.length === 0 && marks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No data available yet</p>
                </div>
            )}
        </div>
    );
}
