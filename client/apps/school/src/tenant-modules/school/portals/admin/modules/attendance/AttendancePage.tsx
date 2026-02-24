import { motion } from 'framer-motion';
import { ClipboardCheck, Calendar, Users, CheckCircle, XCircle, Clock, Search, Filter, ChevronDown } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import { Card, Button, Input, Badge, Skeleton } from '@erp/common';
import { useGetAttendanceDashboardStatsQuery, useGetAttendanceRecentActivityQuery } from '../../../../api/attendanceApi';
import { useGetClassesQuery } from '../../../../api/classesApi';

interface ClassOption {
    id: string;
    name: string;
    section?: string;
}

interface AttendanceActivity {
    id?: string;
    title: string;
    subtitle?: string;
    time: string;
}

export default function AttendancePage() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedClass, setSelectedClass] = useState('');

    const { data: statsResponse, isLoading: statsLoading } = useGetAttendanceDashboardStatsQuery({ date: selectedDate });
    const { data: activityResponse, isLoading: activityLoading } = useGetAttendanceRecentActivityQuery({ limit: 5 });
    const { data: classesResponse } = useGetClassesQuery({});

    const classes: ClassOption[] = classesResponse?.data || [];
    const todayStats = statsResponse?.data || {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        attendanceRate: 0,
    };

    const stats = [
        { label: 'Present Today', value: todayStats.present.toLocaleString(), icon: CheckCircle, color: 'success', change: 'Live data' },
        { label: 'Absent Today', value: todayStats.absent.toLocaleString(), icon: XCircle, color: 'error', change: 'Live data' },
        { label: 'On Leave', value: todayStats.excused.toLocaleString(), icon: Clock, color: 'warning', change: 'Live data' },
        { label: 'Attendance Rate', value: `${todayStats.attendanceRate}%`, icon: ClipboardCheck, color: 'primary', change: 'Live data' },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
                        <ClipboardCheck size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text">Attendance</h1>
                        <p className="text-sm text-text-muted">Record and track student attendance</p>
                    </div>
                </div>
                <Button className="bg-primary hover:bg-primary-dark text-white">
                    <ClipboardCheck size={16} className="mr-2" />
                    Mark Attendance
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Card className="p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div className={`p-2.5 rounded-xl bg-${stat.color}/10 text-${stat.color}`}>
                                    <stat.icon size={20} />
                                </div>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-text">{stat.value}</p>
                                <p className="text-sm font-medium text-text-muted">{stat.label}</p>
                                <p className="text-xs text-text-muted mt-1">{stat.change}</p>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <Calendar size={18} className="text-text-muted" />
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setSelectedDate(e.target.value)}
                            className="max-w-xs"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <Filter size={18} className="text-text-muted" />
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="h-10 px-4 rounded-lg border border-border bg-background text-sm min-w-[180px]"
                        >
                            <option value="">All Classes</option>
                            {classes.map((cls) => (
                                <option key={cls.id} value={cls.id}>{cls.name} - {cls.section}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Main Content Placeholder */}
            <Card className="p-12 flex flex-col items-center justify-center text-center">
                <div className="p-4 rounded-full bg-amber-100 mb-4">
                    <ClipboardCheck size={40} className="text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-text mb-2">Ready to Mark Attendance</h3>
                <p className="text-text-muted max-w-md mb-6">
                    Select a class and date above to start marking attendance. You can also view past attendance records.
                </p>
                <div className="flex gap-3">
                    <Button variant="outline">View Reports</Button>
                    <Button>Start Marking</Button>
                </div>
            </Card>

            {/* Recent Activity */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold text-text mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-text-muted" />
                    Recent Attendance Activity
                </h3>
                <div className="space-y-3">
                    {activityLoading ? (
                        [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)
                    ) : (
                        (activityResponse?.data as AttendanceActivity[] | undefined)?.map((item, i: number) => (
                            <div key={item.id || i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-success" />
                                    <div>
                                        <p className="text-sm font-medium text-text">{item.title}</p>
                                        <p className="text-xs text-text-muted">{item.subtitle}</p>
                                    </div>
                                </div>
                                <span className="text-xs text-text-muted">
                                    {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))
                    )}
                    {activityResponse?.data?.length === 0 && !activityLoading && (
                        <p className="text-sm text-center text-text-muted py-4">No recent activity</p>
                    )}
                </div>
            </Card>
        </div>
    );
}
