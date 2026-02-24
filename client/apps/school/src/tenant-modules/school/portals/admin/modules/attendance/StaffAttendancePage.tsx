// ============================================================================
// Staff Attendance Page - Manage staff attendance
// ============================================================================

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, Search, Save, Lock, Unlock, Download, AlertCircle,
    ChevronLeft, ChevronRight, Check, X, Clock, Timer, Briefcase, Building2
} from 'lucide-react';
import { Card, Badge, Button, Input, Skeleton, FadeIn } from '@erp/common';
import { ProgressRing, type AttendanceStatus } from '@erp/common';
import { ATTENDANCE_ROUTES } from '../../constants/routes';

// ============================================================================
// TYPES
// ============================================================================

interface StaffMember {
    id: string;
    name: string;
    employeeId: string;
    department: string;
    designation: string;
    status: AttendanceStatus;
    checkIn?: string;
    checkOut?: string;
    type: 'teaching' | 'non-teaching' | 'admin';
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_STAFF: StaffMember[] = [
    { id: '1', name: 'Mr. Rajesh Kumar', employeeId: 'EMP001', department: 'Administration', designation: 'Principal', status: 'present', checkIn: '08:45', type: 'admin' },
    { id: '2', name: 'Mrs. Sunita Sharma', employeeId: 'EMP002', department: 'Accounts', designation: 'Accountant', status: 'present', checkIn: '09:00', type: 'non-teaching' },
    { id: '3', name: 'Mr. Vikram Singh', employeeId: 'EMP003', department: 'HR', designation: 'HR Manager', status: 'late', checkIn: '09:45', type: 'non-teaching' },
    { id: '4', name: 'Mrs. Meena Patel', employeeId: 'EMP004', department: 'Library', designation: 'Librarian', status: 'present', checkIn: '08:50', type: 'non-teaching' },
    { id: '5', name: 'Mr. Suresh Nair', employeeId: 'EMP005', department: 'IT', designation: 'IT Admin', status: 'absent', type: 'non-teaching' },
    { id: '6', name: 'Mrs. Kavita Reddy', employeeId: 'EMP006', department: 'Office', designation: 'Office Manager', status: 'excused', type: 'admin' },
];

const DEPARTMENTS = ['All', 'Administration', 'Accounts', 'HR', 'Library', 'IT', 'Office', 'Maintenance'];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StaffAttendancePage() {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedDepartment, setSelectedDepartment] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [staffList, setStaffList] = useState<StaffMember[]>(MOCK_STAFF);
    const isLoading = false;

    const filteredStaff = useMemo(() => {
        return staffList.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  s.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDept = selectedDepartment === 'All' || s.department === selectedDepartment;
            return matchesSearch && matchesDept;
        });
    }, [staffList, searchQuery, selectedDepartment]);

    const stats = useMemo(() => {
        const present = filteredStaff.filter(s => s.status === 'present').length;
        const absent = filteredStaff.filter(s => s.status === 'absent').length;
        const late = filteredStaff.filter(s => s.status === 'late').length;
        const total = filteredStaff.length;
        const rate = total > 0 ? ((present + late) / total) * 100 : 0;
        return { present, absent, late, total, rate };
    }, [filteredStaff]);

    const handleStatusChange = (staffId: string, status: AttendanceStatus) => {
        setStaffList(prev => prev.map(s => s.id === staffId ? { ...s, status } : s));
    };

    const navigateDate = (days: number) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + days);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <FadeIn>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-2xl border border-purple-500/20">
                            <Briefcase className="w-7 h-7 text-purple-600" />
                        </motion.div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Staff Attendance</h1>
                            <p className="text-sm text-muted-foreground">Manage non-teaching staff attendance</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(ATTENDANCE_ROUTES.ROOT)}>
                            <ChevronLeft size={14} className="mr-1" />Back
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setIsLocked(!isLocked)}>
                            {isLocked ? <Unlock size={14} className="mr-1" /> : <Lock size={14} className="mr-1" />}
                            {isLocked ? 'Unlock' : 'Lock'}
                        </Button>
                        <Button size="sm" disabled={isLocked}><Save size={14} className="mr-1" />Save</Button>
                    </div>
                </div>
            </FadeIn>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigateDate(-1)}><ChevronLeft size={16} /></Button>
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
                            <Calendar size={16} className="text-muted-foreground" />
                            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                                className="border-0 bg-transparent p-0 h-auto text-sm font-medium" />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => navigateDate(1)}><ChevronRight size={16} /></Button>
                    </div>
                    <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="h-10 px-3 rounded-lg border border-border bg-background text-sm">
                        {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                    <div className="flex-1 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                    </div>
                </div>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="p-4 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></Card>
                <Card className="p-4 text-center bg-success/5 border-success/20"><p className="text-2xl font-bold text-success">{stats.present}</p><p className="text-xs text-muted-foreground">Present</p></Card>
                <Card className="p-4 text-center bg-error/5 border-error/20"><p className="text-2xl font-bold text-error">{stats.absent}</p><p className="text-xs text-muted-foreground">Absent</p></Card>
                <Card className="p-4 text-center bg-warning/5 border-warning/20"><p className="text-2xl font-bold text-warning">{stats.late}</p><p className="text-xs text-muted-foreground">Late</p></Card>
                <Card className="p-4 flex items-center justify-center gap-3">
                    <ProgressRing value={stats.rate} size="md" color="stroke-success" />
                    <div><p className="text-lg font-bold">{stats.rate.toFixed(1)}%</p><p className="text-xs text-muted-foreground">Rate</p></div>
                </Card>
            </div>

            {/* Staff List */}
            <Card className="p-4">
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {isLoading ? [...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) :
                    filteredStaff.length > 0 ? filteredStaff.map((staff, index) => (
                        <motion.div key={staff.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                            className={`flex items-center justify-between p-4 rounded-xl ${
                                staff.status === 'present' ? 'bg-success/5 border border-success/20' :
                                staff.status === 'absent' ? 'bg-error/5 border border-error/20' :
                                staff.status === 'late' ? 'bg-warning/5 border border-warning/20' : 'bg-muted/30'}`}>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-bold text-primary">{staff.name.split(' ').map(n => n[0]).join('')}</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium">{staff.name}</p>
                                        <Badge variant="outline" className="text-xs">{staff.employeeId}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{staff.designation} • {staff.department}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map(status => (
                                    <motion.button key={status} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                        onClick={() => !isLocked && handleStatusChange(staff.id, status)}
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border ${
                                            staff.status === status ? 
                                            status === 'present' ? 'bg-success/20 text-success border-success/30' :
                                            status === 'absent' ? 'bg-error/20 text-error border-error/30' :
                                            status === 'late' ? 'bg-warning/20 text-warning border-warning/30' : 'bg-info/20 text-info border-info/30'
                                            : 'bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50'}`}>
                                        {status === 'present' && <Check size={14} />}
                                        {status === 'absent' && <X size={14} />}
                                        {status === 'late' && <Clock size={14} />}
                                        {status === 'excused' && <Timer size={14} />}
                                    </motion.button>
                                ))}
                            </div>
                        </motion.div>
                    )) : (
                        <div className="py-12 text-center"><AlertCircle size={40} className="mx-auto text-muted-foreground/50 mb-3" /><p className="text-muted-foreground">No staff found</p></div>
                    )}
                </div>
            </Card>

            {/* Bottom */}
            <FadeIn delay={0.2}>
                <Card className="p-4 bg-gradient-to-r from-purple-500/5 to-transparent">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{stats.present + stats.late} of {stats.total} staff present</p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm"><Download size={14} className="mr-1" />Export</Button>
                            <Button size="sm" disabled={isLocked}><Save size={14} className="mr-1" />Save</Button>
                        </div>
                    </div>
                </Card>
            </FadeIn>
        </div>
    );
}
