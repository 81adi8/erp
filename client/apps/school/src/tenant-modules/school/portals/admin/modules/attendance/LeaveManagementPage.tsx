// ============================================================================
// Leave Management Page - Manage student leave applications
// ============================================================================

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, ChevronLeft, Search, Check, X, Clock, Eye, FileText,
    AlertCircle, Filter, User, MessageSquare
} from 'lucide-react';
import { Card, Badge, Button, Input, Skeleton, FadeIn, Tabs, TabsList, TabsTrigger, TabsContent } from '@erp/common';
import { ATTENDANCE_ROUTES } from '../../constants/routes';
import { 
    useGetLeavesQuery, 
    useApproveLeaveMutation, 
    useRejectLeaveMutation 
} from '../../../../api/attendanceApi';

// ============================================================================
// TYPES
// ============================================================================

interface LeaveApplication {
    id: string;
    entityName: string;
    className?: string;
    sectionName?: string;
    leaveType: 'SICK' | 'CASUAL' | 'EMERGENCY' | 'PLANNED' | 'OTHER';
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    appliedById: string;
    appliedAt: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    approvedBy?: string;
}

const LEAVE_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    SICK: { label: 'Sick Leave', color: 'text-error', bg: 'bg-error/10' },
    CASUAL: { label: 'Casual Leave', color: 'text-info', bg: 'bg-info/10' },
    EMERGENCY: { label: 'Emergency', color: 'text-warning', bg: 'bg-warning/10' },
    PLANNED: { label: 'Planned', color: 'text-primary', bg: 'bg-primary/10' },
    OTHER: { label: 'Other', color: 'text-muted-foreground', bg: 'bg-muted' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LeaveManagementPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('PENDING');
    const [searchQuery, setSearchQuery] = useState('');
    
    // API Data
    const { data: response, isLoading } = useGetLeavesQuery({});
    const [approveLeave] = useApproveLeaveMutation();
    const [rejectLeave] = useRejectLeaveMutation();

    const leaves: LeaveApplication[] = response?.data || [];

    const filteredLeaves = useMemo(() => {
        return leaves.filter(l => {
            const matchesSearch = l.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  (l.className || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesTab = activeTab === 'all' || l.status === activeTab;
            return matchesSearch && matchesTab;
        });
    }, [leaves, searchQuery, activeTab]);

    const stats = useMemo(() => ({
        pending: leaves.filter(l => l.status === 'PENDING').length,
        approved: leaves.filter(l => l.status === 'APPROVED').length,
        rejected: leaves.filter(l => l.status === 'REJECTED').length,
    }), [leaves]);

    const handleApprove = async (id: string) => {
        if (confirm('Are you sure you want to approve this leave?')) {
            await approveLeave({ id, markAsExcused: true });
        }
    };

    const handleReject = async (id: string) => {
        const reason = prompt('Please enter rejection reason:');
        if (reason) {
            await rejectLeave({ id, rejectionReason: reason });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <FadeIn>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-2xl border border-purple-500/20">
                            <Calendar className="w-7 h-7 text-purple-600" />
                        </motion.div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Leave Management</h1>
                            <p className="text-sm text-muted-foreground">Manage student leave applications</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(ATTENDANCE_ROUTES.ROOT)}>
                        <ChevronLeft size={14} className="mr-1" />Back
                    </Button>
                </div>
            </FadeIn>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 text-center bg-warning/5 border-warning/20">
                    <p className="text-2xl font-bold text-warning">{stats.pending}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                </Card>
                <Card className="p-4 text-center bg-success/5 border-success/20">
                    <p className="text-2xl font-bold text-success">{stats.approved}</p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                </Card>
                <Card className="p-4 text-center bg-error/5 border-error/20">
                    <p className="text-2xl font-bold text-error">{stats.rejected}</p>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                </Card>
            </div>

            {/* Search */}
            <Card className="p-4">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search by student name or class..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="PENDING"><Clock size={14} className="mr-1" />Pending ({stats.pending})</TabsTrigger>
                    <TabsTrigger value="APPROVED"><Check size={14} className="mr-1" />Approved ({stats.approved})</TabsTrigger>
                    <TabsTrigger value="REJECTED"><X size={14} className="mr-1" />Rejected ({stats.rejected})</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    <div className="space-y-3">
                        {isLoading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />) :
                        filteredLeaves.length > 0 ? filteredLeaves.map((leave, i) => (
                            <motion.div key={leave.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                                <Card className={`p-4 border-l-4 ${leave.status === 'PENDING' ? 'border-l-warning' : leave.status === 'APPROVED' ? 'border-l-success' : 'border-l-error'}`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                                <User size={20} className="text-primary" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-medium">{leave.entityName}</p>
                                                    <Badge variant="outline" className="text-xs">{leave.className} - {leave.sectionName}</Badge>
                                                    <Badge className={`text-xs ${LEAVE_TYPE_CONFIG[leave.leaveType]?.bg} ${LEAVE_TYPE_CONFIG[leave.leaveType]?.color}`}>
                                                        {LEAVE_TYPE_CONFIG[leave.leaveType]?.label}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    <Calendar size={12} className="inline mr-1" />
                                                    {new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()} ({leave.totalDays} day{leave.totalDays > 1 ? 's' : ''})
                                                </p>
                                                <div className="flex items-start gap-1 mt-2">
                                                    <MessageSquare size={12} className="text-muted-foreground mt-0.5" />
                                                    <p className="text-sm text-muted-foreground">{leave.reason}</p>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-2">Applied on {new Date(leave.appliedAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <Badge variant={leave.status === 'PENDING' ? 'warning' : leave.status === 'APPROVED' ? 'success' : 'error'}>
                                                {leave.status}
                                            </Badge>
                                            {leave.status === 'PENDING' && (
                                                <div className="flex items-center gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleReject(leave.id)}>
                                                        <X size={14} className="mr-1" />Reject
                                                    </Button>
                                                    <Button size="sm" onClick={() => handleApprove(leave.id)}>
                                                        <Check size={14} className="mr-1" />Approve
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )) : (
                            <Card className="p-12 text-center">
                                <AlertCircle size={48} className="mx-auto text-muted-foreground/50 mb-4" />
                                <p className="text-muted-foreground">No leave applications found</p>
                            </Card>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
