// ============================================================================
// Attendance Settings Page - Configure attendance rules, policies & settings
// ============================================================================

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Settings, ChevronLeft, Save, Clock, Users, Calendar, Bell, Shield,
    AlertTriangle, CheckCircle, Edit, Trash2, Plus, Lock, Eye, FileText,
    Timer, UserCheck, Building2, GraduationCap, Info
} from 'lucide-react';
import { Card, Badge, Button, Input, FadeIn, Tabs, TabsList, TabsTrigger, TabsContent, Skeleton } from '@erp/common';
import { ATTENDANCE_ROUTES } from '../../constants/routes';
import { useGetAttendanceSettingsQuery, useSaveAttendanceSettingsMutation } from '../../../../api/attendanceApi';

// ============================================================================
// TYPES
// ============================================================================

interface AttendanceStatus {
    id: string;
    name: string;
    code: string;
    color: string;
    countValue: number; // 1, 0.5, 0
    isDefault: boolean;
    isActive: boolean;
}

interface TimeRule {
    id: string;
    name: string;
    scope: 'STUDENT' | 'TEACHER' | 'STAFF';
    lateAfterMinutes: number;
    halfDayAfterMinutes: number;
    absentAfterMinutes: number;
    isActive: boolean;
}

interface LockRule {
    id: string;
    scope: 'STUDENT' | 'TEACHER' | 'STAFF';
    lockAfterHours: number;
    editWindowHours: number;
    requireApprovalForEdit: boolean;
    isActive: boolean;
}

interface NotificationRule {
    id: string;
    event: string;
    recipients: string[];
    channels: ('sms' | 'email' | 'push')[];
    isActive: boolean;
}

interface ClassConfig {
    id: string;
    className: string;
    section: string;
    grade: string;
    startTime: string;
    endTime: string;
    lateThresholdMinutes: number;
    halfDayThresholdMinutes: number;
    minimumAttendancePercent: number;
    classTeacher: string;
    attendanceMode: 'DAILY' | 'PERIOD';
    periodsPerDay: number;
    allowParentView: boolean;
    autoNotifyParent: boolean;
    leaveApprovalRequired: boolean;
    isActive: boolean;
}

interface GeneralSettings {
    attendanceMode: 'DAILY' | 'PERIOD';
    defaultStartTime: string;
    workingDaysInWeek: number;
    minimumAttendancePercent: number;
    allowBackdatedMarking: boolean;
    backdatedDaysLimit: number;
    showAttendanceToParents: boolean;
    showAttendanceToStudents: boolean;
    requireReasonForAbsent: boolean;
    autoMarkLeaveAsExcused: boolean;
}

const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
    attendanceMode: 'DAILY',
    defaultStartTime: '08:00',
    workingDaysInWeek: 6,
    minimumAttendancePercent: 75,
    allowBackdatedMarking: false,
    backdatedDaysLimit: 3,
    showAttendanceToParents: true,
    showAttendanceToStudents: true,
    requireReasonForAbsent: false,
    autoMarkLeaveAsExcused: true,
};

const normalizeGeneralSettings = (config: unknown): GeneralSettings => {
    if (!config || typeof config !== 'object') {
        return DEFAULT_GENERAL_SETTINGS;
    }

    const source = config as Record<string, unknown>;
    return {
        attendanceMode: source.attendanceMode === 'PERIOD' ? 'PERIOD' : 'DAILY',
        defaultStartTime: typeof source.defaultStartTime === 'string' ? source.defaultStartTime : DEFAULT_GENERAL_SETTINGS.defaultStartTime,
        workingDaysInWeek: typeof source.workingDaysInWeek === 'number' ? source.workingDaysInWeek : DEFAULT_GENERAL_SETTINGS.workingDaysInWeek,
        minimumAttendancePercent: typeof source.minimumAttendancePercent === 'number' ? source.minimumAttendancePercent : DEFAULT_GENERAL_SETTINGS.minimumAttendancePercent,
        allowBackdatedMarking: typeof source.allowBackdatedMarking === 'boolean' ? source.allowBackdatedMarking : DEFAULT_GENERAL_SETTINGS.allowBackdatedMarking,
        backdatedDaysLimit: typeof source.backdatedDaysLimit === 'number' ? source.backdatedDaysLimit : DEFAULT_GENERAL_SETTINGS.backdatedDaysLimit,
        showAttendanceToParents: typeof source.showAttendanceToParents === 'boolean' ? source.showAttendanceToParents : DEFAULT_GENERAL_SETTINGS.showAttendanceToParents,
        showAttendanceToStudents: typeof source.showAttendanceToStudents === 'boolean' ? source.showAttendanceToStudents : DEFAULT_GENERAL_SETTINGS.showAttendanceToStudents,
        requireReasonForAbsent: typeof source.requireReasonForAbsent === 'boolean' ? source.requireReasonForAbsent : DEFAULT_GENERAL_SETTINGS.requireReasonForAbsent,
        autoMarkLeaveAsExcused: typeof source.autoMarkLeaveAsExcused === 'boolean' ? source.autoMarkLeaveAsExcused : DEFAULT_GENERAL_SETTINGS.autoMarkLeaveAsExcused,
    };
};

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_STATUSES: AttendanceStatus[] = [
    { id: '1', name: 'Present', code: 'P', color: '#10b981', countValue: 1, isDefault: true, isActive: true },
    { id: '2', name: 'Absent', code: 'A', color: '#ef4444', countValue: 0, isDefault: false, isActive: true },
    { id: '3', name: 'Late', code: 'L', color: '#f59e0b', countValue: 0.75, isDefault: false, isActive: true },
    { id: '4', name: 'Half Day', code: 'HD', color: '#3b82f6', countValue: 0.5, isDefault: false, isActive: true },
    { id: '5', name: 'Leave', code: 'LV', color: '#8b5cf6', countValue: 0, isDefault: false, isActive: true },
    { id: '6', name: 'Excused', code: 'EX', color: '#06b6d4', countValue: 1, isDefault: false, isActive: true },
];

const MOCK_TIME_RULES: TimeRule[] = [
    { id: '1', name: 'Student Time Rules', scope: 'student', lateAfterMinutes: 15, halfDayAfterMinutes: 90, absentAfterMinutes: 180, isActive: true },
    { id: '2', name: 'Teacher Time Rules', scope: 'teacher', lateAfterMinutes: 10, halfDayAfterMinutes: 60, absentAfterMinutes: 120, isActive: true },
    { id: '3', name: 'Staff Time Rules', scope: 'staff', lateAfterMinutes: 15, halfDayAfterMinutes: 120, absentAfterMinutes: 240, isActive: true },
];

const MOCK_LOCK_RULES: LockRule[] = [
    { id: '1', scope: 'student', lockAfterHours: 24, editWindowHours: 2, requireApprovalForEdit: true, isActive: true },
    { id: '2', scope: 'teacher', lockAfterHours: 48, editWindowHours: 4, requireApprovalForEdit: true, isActive: true },
    { id: '3', scope: 'staff', lockAfterHours: 48, editWindowHours: 4, requireApprovalForEdit: false, isActive: true },
];

const MOCK_NOTIFICATIONS: NotificationRule[] = [
    { id: '1', event: 'Student Absent', recipients: ['parent'], channels: ['sms', 'push'], isActive: true },
    { id: '2', event: 'Low Attendance Warning (< 75%)', recipients: ['parent', 'class_teacher'], channels: ['email', 'sms'], isActive: true },
    { id: '3', event: 'Attendance Not Marked', recipients: ['admin', 'principal'], channels: ['push'], isActive: true },
    { id: '4', event: 'Leave Approved', recipients: ['parent', 'student'], channels: ['sms', 'push'], isActive: true },
];

const MOCK_CLASS_CONFIGS: ClassConfig[] = [
    { id: '1', className: 'Class 10', section: 'A', grade: '10', startTime: '08:00', endTime: '14:30', lateThresholdMinutes: 15, halfDayThresholdMinutes: 90, minimumAttendancePercent: 75, classTeacher: 'Mr. Sharma', attendanceMode: 'daily', periodsPerDay: 8, allowParentView: true, autoNotifyParent: true, leaveApprovalRequired: true, isActive: true },
    { id: '2', className: 'Class 10', section: 'B', grade: '10', startTime: '08:00', endTime: '14:30', lateThresholdMinutes: 15, halfDayThresholdMinutes: 90, minimumAttendancePercent: 75, classTeacher: 'Mrs. Gupta', attendanceMode: 'daily', periodsPerDay: 8, allowParentView: true, autoNotifyParent: true, leaveApprovalRequired: true, isActive: true },
    { id: '3', className: 'Class 9', section: 'A', grade: '9', startTime: '08:15', endTime: '14:15', lateThresholdMinutes: 10, halfDayThresholdMinutes: 60, minimumAttendancePercent: 75, classTeacher: 'Mr. Kumar', attendanceMode: 'daily', periodsPerDay: 8, allowParentView: true, autoNotifyParent: true, leaveApprovalRequired: true, isActive: true },
    { id: '4', className: 'Class 9', section: 'B', grade: '9', startTime: '08:15', endTime: '14:15', lateThresholdMinutes: 10, halfDayThresholdMinutes: 60, minimumAttendancePercent: 75, classTeacher: 'Mrs. Singh', attendanceMode: 'period', periodsPerDay: 8, allowParentView: true, autoNotifyParent: false, leaveApprovalRequired: true, isActive: true },
    { id: '5', className: 'Class 8', section: 'A', grade: '8', startTime: '08:30', endTime: '14:00', lateThresholdMinutes: 15, halfDayThresholdMinutes: 90, minimumAttendancePercent: 80, classTeacher: 'Mr. Patel', attendanceMode: 'daily', periodsPerDay: 7, allowParentView: true, autoNotifyParent: true, leaveApprovalRequired: false, isActive: true },
    { id: '6', className: 'Class 8', section: 'B', grade: '8', startTime: '08:30', endTime: '14:00', lateThresholdMinutes: 15, halfDayThresholdMinutes: 90, minimumAttendancePercent: 80, classTeacher: 'Mrs. Verma', attendanceMode: 'daily', periodsPerDay: 7, allowParentView: true, autoNotifyParent: true, leaveApprovalRequired: false, isActive: true },
    { id: '7', className: 'Class 7', section: 'A', grade: '7', startTime: '08:45', endTime: '13:45', lateThresholdMinutes: 20, halfDayThresholdMinutes: 90, minimumAttendancePercent: 70, classTeacher: 'Mr. Nair', attendanceMode: 'daily', periodsPerDay: 7, allowParentView: true, autoNotifyParent: true, leaveApprovalRequired: false, isActive: true },
    { id: '8', className: 'Class 6', section: 'A', grade: '6', startTime: '09:00', endTime: '13:30', lateThresholdMinutes: 20, halfDayThresholdMinutes: 120, minimumAttendancePercent: 70, classTeacher: 'Mrs. Reddy', attendanceMode: 'daily', periodsPerDay: 6, allowParentView: true, autoNotifyParent: true, leaveApprovalRequired: false, isActive: true },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatusCard({ status, onEdit, onToggle }: { status: AttendanceStatus; onEdit: () => void; onToggle: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border ${status.isActive ? 'bg-card' : 'bg-muted/30 opacity-60'}`}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: status.color }}>
                        {status.code}
                    </div>
                    <div>
                        <p className="font-medium">{status.name}</p>
                        <p className="text-xs text-muted-foreground">Count: {status.countValue}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {status.isDefault && <Badge variant="outline" className="text-xs">Default</Badge>}
                    <Button variant="ghost" size="sm" onClick={onEdit}><Edit size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={onToggle}>
                        {status.isActive ? <Eye size={14} /> : <Eye size={14} className="opacity-50" />}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}

function TimeRuleCard({ rule, onEdit }: { rule: TimeRule; onEdit: () => void }) {
    const scopeConfig = {
        student: { icon: UserCheck, color: 'text-primary', bg: 'bg-primary/10' },
        teacher: { icon: GraduationCap, color: 'text-success', bg: 'bg-success/10' },
        staff: { icon: Building2, color: 'text-purple-600', bg: 'bg-purple-500/10' },
    };
    const config = scopeConfig[rule.scope];
    const Icon = config.icon;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-xl border ${rule.isActive ? 'bg-card' : 'bg-muted/30 opacity-60'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.bg}`}>
                        <Icon size={20} className={config.color} />
                    </div>
                    <div>
                        <p className="font-medium">{rule.name}</p>
                        <Badge variant="outline" className="text-xs capitalize">{rule.scope}</Badge>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onEdit}><Edit size={14} /></Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-warning/10 rounded-lg text-center">
                    <p className="text-lg font-bold text-warning">{rule.lateAfterMinutes}m</p>
                    <p className="text-xs text-muted-foreground">Late After</p>
                </div>
                <div className="p-3 bg-info/10 rounded-lg text-center">
                    <p className="text-lg font-bold text-info">{rule.halfDayAfterMinutes}m</p>
                    <p className="text-xs text-muted-foreground">Half-Day After</p>
                </div>
                <div className="p-3 bg-error/10 rounded-lg text-center">
                    <p className="text-lg font-bold text-error">{rule.absentAfterMinutes}m</p>
                    <p className="text-xs text-muted-foreground">Absent After</p>
                </div>
            </div>
        </motion.div>
    );
}

function LockRuleCard({ rule, onEdit }: { rule: LockRule; onEdit: () => void }) {
    const scopeConfig = {
        student: { icon: UserCheck, label: 'Student', color: 'text-primary' },
        teacher: { icon: GraduationCap, label: 'Teacher', color: 'text-success' },
        staff: { icon: Building2, label: 'Staff', color: 'text-purple-600' },
    };
    const config = scopeConfig[rule.scope];
    const Icon = config.icon;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-xl border bg-card">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Icon size={20} className={config.color} />
                    <p className="font-medium">{config.label} Lock Rules</p>
                </div>
                <Button variant="ghost" size="sm" onClick={onEdit}><Edit size={14} /></Button>
            </div>
            <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                        <Lock size={14} className="text-muted-foreground" />
                        <span className="text-sm">Auto-lock after</span>
                    </div>
                    <span className="font-medium">{rule.lockAfterHours} hours</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                        <Timer size={14} className="text-muted-foreground" />
                        <span className="text-sm">Edit window</span>
                    </div>
                    <span className="font-medium">{rule.editWindowHours} hours</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                        <Shield size={14} className="text-muted-foreground" />
                        <span className="text-sm">Require approval for edit</span>
                    </div>
                    <Badge variant={rule.requireApprovalForEdit ? 'success' : 'outline'}>
                        {rule.requireApprovalForEdit ? 'Yes' : 'No'}
                    </Badge>
                </div>
            </div>
        </motion.div>
    );
}

function NotificationCard({ rule, onToggle }: { rule: NotificationRule; onToggle: () => void }) {
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border ${rule.isActive ? 'bg-card' : 'bg-muted/30 opacity-60'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Bell size={18} className="text-warning" />
                    <div>
                        <p className="font-medium text-sm">{rule.event}</p>
                        <div className="flex items-center gap-2 mt-1">
                            {rule.channels.map(ch => (
                                <Badge key={ch} variant="outline" className="text-xs capitalize">{ch}</Badge>
                            ))}
                        </div>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onToggle}>
                    {rule.isActive ? <CheckCircle size={16} className="text-success" /> : <AlertTriangle size={16} className="text-muted-foreground" />}
                </Button>
            </div>
        </motion.div>
    );
}

function ClassConfigCard({ config, onEdit }: { config: ClassConfig; onEdit: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            className={`p-5 rounded-xl border ${config.isActive ? 'bg-card' : 'bg-muted/30 opacity-60'} hover:shadow-md transition-all`}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">{config.grade}{config.section}</span>
                    </div>
                    <div>
                        <p className="font-semibold">{config.className} - {config.section}</p>
                        <p className="text-xs text-muted-foreground">{config.classTeacher}</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onEdit}><Edit size={14} /></Button>
            </div>

            {/* Time Settings */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="p-2 bg-muted/30 rounded-lg text-center">
                    <p className="text-sm font-medium">{config.startTime}</p>
                    <p className="text-xs text-muted-foreground">Start Time</p>
                </div>
                <div className="p-2 bg-muted/30 rounded-lg text-center">
                    <p className="text-sm font-medium">{config.endTime}</p>
                    <p className="text-xs text-muted-foreground">End Time</p>
                </div>
            </div>

            {/* Rules */}
            <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Late Threshold</span>
                    <Badge variant="outline" className="text-warning border-warning/30">{config.lateThresholdMinutes} min</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Half-Day Threshold</span>
                    <Badge variant="outline" className="text-info border-info/30">{config.halfDayThresholdMinutes} min</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Min Attendance</span>
                    <Badge variant="outline" className="text-success border-success/30">{config.minimumAttendancePercent}%</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Periods/Day</span>
                    <span className="font-medium">{config.periodsPerDay}</span>
                </div>
            </div>

            {/* Mode & Features */}
            <div className="flex flex-wrap gap-2">
                <Badge variant={config.attendanceMode === 'period' ? 'default' : 'outline'} className="text-xs">
                    {config.attendanceMode === 'period' ? 'Period-wise' : 'Daily'}
                </Badge>
                {config.allowParentView && <Badge variant="success" className="text-xs">Parent View</Badge>}
                {config.autoNotifyParent && <Badge variant="warning" className="text-xs">Auto Notify</Badge>}
                {config.leaveApprovalRequired && <Badge variant="outline" className="text-xs">Leave Approval</Badge>}
            </div>
        </motion.div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AttendanceSettingsPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('general');
    
    // API Data
    const { data: response, isLoading } = useGetAttendanceSettingsQuery({});
    const [saveSettings] = useSaveAttendanceSettingsMutation();

    const [generalSettings, setGeneralSettings] = useState<GeneralSettings | null>(null);

    // Update settings when data is loaded
    useEffect(() => {
        if (response?.data?.config) {
            setGeneralSettings(normalizeGeneralSettings(response.data.config));
        }
    }, [response]);

    const statuses: AttendanceStatus[] = response?.data?.statuses || [];
    const timeRules: TimeRule[] = response?.data?.timeRules || [];
    const lockRules: LockRule[] = response?.data?.lockRules || [];
    const notifications: NotificationRule[] = []; // Not implemented in current API
    const classConfigs: ClassConfig[] = response?.data?.classConfigs || [];
    const [selectedGrade, setSelectedGrade] = useState('all');

    const handleStatusToggle = (id: string) => {
        // Implementation
    };

    const handleNotificationToggle = (id: string) => {
        // Implementation
    };

    const handleSave = async () => {
        try {
            await saveSettings(generalSettings).unwrap();
            alert('Settings updated successfully');
        } catch (err) {
            alert('Failed to update settings');
        }
    };

    const filteredClassConfigs = selectedGrade === 'all' 
        ? classConfigs 
        : classConfigs.filter(c => c.grade === selectedGrade);

    const uniqueGrades = [...new Set(classConfigs.map(c => c.grade))].sort((a, b) => parseInt(b) - parseInt(a));

    if (isLoading || !generalSettings) {
        return <div className="p-8"><Skeleton className="h-64 rounded-xl" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <FadeIn>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="p-3 bg-gradient-to-br from-slate-500/20 to-slate-500/5 rounded-2xl border border-slate-500/20">
                            <Settings className="w-7 h-7 text-slate-600" />
                        </motion.div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Attendance Settings</h1>
                            <p className="text-sm text-muted-foreground">Configure rules, policies and preferences</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(ATTENDANCE_ROUTES.ROOT)}>
                            <ChevronLeft size={14} className="mr-1" />Back
                        </Button>
                        <Button size="sm" onClick={handleSave}><Save size={14} className="mr-1" />Save Changes</Button>
                    </div>
                </div>
            </FadeIn>

            {/* Settings Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="flex-wrap">
                    <TabsTrigger value="general"><Settings size={14} className="mr-1" />General</TabsTrigger>
                    <TabsTrigger value="class-config"><Building2 size={14} className="mr-1" />Class Config</TabsTrigger>
                    <TabsTrigger value="statuses"><CheckCircle size={14} className="mr-1" />Statuses</TabsTrigger>
                    <TabsTrigger value="time-rules"><Clock size={14} className="mr-1" />Time Rules</TabsTrigger>
                    <TabsTrigger value="lock-rules"><Lock size={14} className="mr-1" />Lock & Edit</TabsTrigger>
                    <TabsTrigger value="notifications"><Bell size={14} className="mr-1" />Notifications</TabsTrigger>
                    <TabsTrigger value="permissions"><Shield size={14} className="mr-1" />Permissions</TabsTrigger>
                </TabsList>

                {/* GENERAL SETTINGS */}
                <TabsContent value="general" className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Attendance Mode */}
                        <Card className="p-5">
                            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                                <Calendar size={18} className="text-primary" />
                                Attendance Mode
                            </h3>
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30">
                                    <input type="radio" name="mode" value="DAILY" checked={generalSettings.attendanceMode === 'DAILY'}
                                        onChange={() => setGeneralSettings((p) => (p ? { ...p, attendanceMode: 'DAILY' } : p))}
                                        className="w-4 h-4 text-primary" />
                                    <div>
                                        <p className="font-medium">Daily Attendance</p>
                                        <p className="text-xs text-muted-foreground">One attendance per student per day</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30">
                                    <input type="radio" name="mode" value="PERIOD" checked={generalSettings.attendanceMode === 'PERIOD'}
                                        onChange={() => setGeneralSettings((p) => (p ? { ...p, attendanceMode: 'PERIOD' } : p))}
                                        className="w-4 h-4 text-primary" />
                                    <div>
                                        <p className="font-medium">Period-wise Attendance</p>
                                        <p className="text-xs text-muted-foreground">Attendance for each period/subject</p>
                                    </div>
                                </label>
                            </div>
                        </Card>

                        {/* Academic Settings */}
                        <Card className="p-5">
                            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                                <FileText size={18} className="text-success" />
                                Academic Settings
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-muted-foreground mb-1 block">Default Start Time</label>
                                    <Input type="time" value={generalSettings.defaultStartTime}
                                        onChange={(e) => setGeneralSettings(p => ({ ...p, defaultStartTime: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground mb-1 block">Working Days in Week</label>
                                    <Input type="number" min={1} max={7} value={generalSettings.workingDaysInWeek}
                                        onChange={(e) => setGeneralSettings(p => ({ ...p, workingDaysInWeek: parseInt(e.target.value) }))} />
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground mb-1 block">Minimum Attendance %</label>
                                    <Input type="number" min={0} max={100} value={generalSettings.minimumAttendancePercent}
                                        onChange={(e) => setGeneralSettings(p => ({ ...p, minimumAttendancePercent: parseInt(e.target.value) }))} />
                                </div>
                            </div>
                        </Card>

                        {/* Backdated Marking */}
                        <Card className="p-5">
                            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                                <Clock size={18} className="text-warning" />
                                Backdated Marking
                            </h3>
                            <div className="space-y-4">
                                <label className="flex items-center justify-between p-3 rounded-lg border">
                                    <span className="text-sm">Allow backdated marking</span>
                                    <input type="checkbox" checked={generalSettings.allowBackdatedMarking}
                                        onChange={(e) => setGeneralSettings(p => ({ ...p, allowBackdatedMarking: e.target.checked }))}
                                        className="w-5 h-5 rounded text-primary" />
                                </label>
                                {generalSettings.allowBackdatedMarking && (
                                    <div>
                                        <label className="text-sm text-muted-foreground mb-1 block">Days limit</label>
                                        <Input type="number" min={1} max={30} value={generalSettings.backdatedDaysLimit}
                                            onChange={(e) => setGeneralSettings(p => ({ ...p, backdatedDaysLimit: parseInt(e.target.value) }))} />
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Visibility */}
                        <Card className="p-5">
                            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                                <Eye size={18} className="text-info" />
                                Visibility Settings
                            </h3>
                            <div className="space-y-3">
                                <label className="flex items-center justify-between p-3 rounded-lg border">
                                    <span className="text-sm">Show attendance to parents</span>
                                    <input type="checkbox" checked={generalSettings.showAttendanceToParents}
                                        onChange={(e) => setGeneralSettings(p => ({ ...p, showAttendanceToParents: e.target.checked }))}
                                        className="w-5 h-5 rounded text-primary" />
                                </label>
                                <label className="flex items-center justify-between p-3 rounded-lg border">
                                    <span className="text-sm">Show attendance to students</span>
                                    <input type="checkbox" checked={generalSettings.showAttendanceToStudents}
                                        onChange={(e) => setGeneralSettings(p => ({ ...p, showAttendanceToStudents: e.target.checked }))}
                                        className="w-5 h-5 rounded text-primary" />
                                </label>
                                <label className="flex items-center justify-between p-3 rounded-lg border">
                                    <span className="text-sm">Require reason for absent</span>
                                    <input type="checkbox" checked={generalSettings.requireReasonForAbsent}
                                        onChange={(e) => setGeneralSettings(p => ({ ...p, requireReasonForAbsent: e.target.checked }))}
                                        className="w-5 h-5 rounded text-primary" />
                                </label>
                            </div>
                        </Card>

                        {/* Leave Integration */}
                        <Card className="p-5 lg:col-span-2">
                            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                                <Calendar size={18} className="text-purple-600" />
                                Leave Integration
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="flex items-center justify-between p-3 rounded-lg border">
                                    <div>
                                        <p className="text-sm font-medium">Auto-mark approved leave as Excused</p>
                                        <p className="text-xs text-muted-foreground">Approved leaves won't count as absent</p>
                                    </div>
                                    <input type="checkbox" checked={generalSettings.autoMarkLeaveAsExcused}
                                        onChange={(e) => setGeneralSettings(p => ({ ...p, autoMarkLeaveAsExcused: e.target.checked }))}
                                        className="w-5 h-5 rounded text-primary" />
                                </label>
                                <div className="p-3 rounded-lg bg-info/10 border border-info/20">
                                    <div className="flex items-start gap-2">
                                        <Info size={16} className="text-info mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-info">Leave affects attendance %</p>
                                            <p className="text-xs text-muted-foreground">As per school policy, approved leaves may or may not affect attendance percentage</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </TabsContent>

                {/* CLASS CONFIGURATION */}
                <TabsContent value="class-config" className="mt-6 space-y-6">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 text-center">
                            <p className="text-2xl font-bold text-primary">{classConfigs.length}</p>
                            <p className="text-xs text-muted-foreground">Total Classes</p>
                        </Card>
                        <Card className="p-4 text-center">
                            <p className="text-2xl font-bold text-success">{uniqueGrades.length}</p>
                            <p className="text-xs text-muted-foreground">Grades</p>
                        </Card>
                        <Card className="p-4 text-center">
                            <p className="text-2xl font-bold text-warning">{classConfigs.filter(c => c.attendanceMode === 'period').length}</p>
                            <p className="text-xs text-muted-foreground">Period-wise</p>
                        </Card>
                        <Card className="p-4 text-center">
                            <p className="text-2xl font-bold text-info">{classConfigs.filter(c => c.autoNotifyParent).length}</p>
                            <p className="text-xs text-muted-foreground">Auto Notify</p>
                        </Card>
                    </div>

                    {/* Grade-wise Default Settings */}
                    <Card className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-semibold flex items-center gap-2">
                                    <GraduationCap size={18} className="text-primary" />
                                    Grade-wise Default Settings
                                </h3>
                                <p className="text-sm text-muted-foreground">Apply settings to all classes in a grade</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {uniqueGrades.map(grade => {
                                const gradeClasses = classConfigs.filter(c => c.grade === grade);
                                const avgMinAttendance = Math.round(gradeClasses.reduce((acc, c) => acc + c.minimumAttendancePercent, 0) / gradeClasses.length);
                                return (
                                    <motion.div key={grade} whileHover={{ scale: 1.02 }}
                                        className="p-4 rounded-xl border bg-gradient-to-br from-primary/5 to-transparent hover:shadow-md cursor-pointer">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                                <span className="font-bold text-primary">{grade}</span>
                                            </div>
                                            <Badge variant="outline">{gradeClasses.length} sections</Badge>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Start Time</span>
                                                <span className="font-medium">{gradeClasses[0]?.startTime}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Min Attendance</span>
                                                <Badge variant="success" className="text-xs">{avgMinAttendance}%</Badge>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Periods</span>
                                                <span className="font-medium">{gradeClasses[0]?.periodsPerDay}</span>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" className="w-full mt-3 text-xs">
                                            <Edit size={12} className="mr-1" />Edit Grade Settings
                                        </Button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Class-wise Configuration */}
                    <Card className="p-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-base font-semibold flex items-center gap-2">
                                    <Building2 size={18} className="text-success" />
                                    Class-wise Configuration
                                </h3>
                                <p className="text-sm text-muted-foreground">Override settings for individual classes</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)}
                                    className="h-9 px-3 rounded-lg border border-border bg-background text-sm">
                                    <option value="all">All Grades</option>
                                    {uniqueGrades.map(g => (
                                        <option key={g} value={g}>Class {g}</option>
                                    ))}
                                </select>
                                <Button size="sm"><Plus size={14} className="mr-1" />Add Class</Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredClassConfigs.map(config => (
                                <ClassConfigCard key={config.id} config={config} onEdit={() => console.log('Edit', config)} />
                            ))}
                        </div>
                    </Card>

                    {/* Bulk Actions */}
                    <Card className="p-5">
                        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                            <Settings size={18} className="text-warning" />
                            Bulk Actions
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Button variant="outline" className="justify-start h-auto py-3">
                                <div className="flex items-center gap-3">
                                    <Clock size={18} className="text-primary" />
                                    <div className="text-left">
                                        <p className="text-sm font-medium">Update Time Rules</p>
                                        <p className="text-xs text-muted-foreground">For selected classes</p>
                                    </div>
                                </div>
                            </Button>
                            <Button variant="outline" className="justify-start h-auto py-3">
                                <div className="flex items-center gap-3">
                                    <Bell size={18} className="text-warning" />
                                    <div className="text-left">
                                        <p className="text-sm font-medium">Toggle Notifications</p>
                                        <p className="text-xs text-muted-foreground">Parent auto-notify</p>
                                    </div>
                                </div>
                            </Button>
                            <Button variant="outline" className="justify-start h-auto py-3">
                                <div className="flex items-center gap-3">
                                    <Eye size={18} className="text-info" />
                                    <div className="text-left">
                                        <p className="text-sm font-medium">Parent Visibility</p>
                                        <p className="text-xs text-muted-foreground">Enable/disable view</p>
                                    </div>
                                </div>
                            </Button>
                            <Button variant="outline" className="justify-start h-auto py-3">
                                <div className="flex items-center gap-3">
                                    <Calendar size={18} className="text-purple-600" />
                                    <div className="text-left">
                                        <p className="text-sm font-medium">Attendance Mode</p>
                                        <p className="text-xs text-muted-foreground">Daily / Period-wise</p>
                                    </div>
                                </div>
                            </Button>
                        </div>
                    </Card>

                    {/* Info Panel */}
                    <div className="p-4 bg-info/10 rounded-lg border border-info/20">
                        <div className="flex items-start gap-2">
                            <Info size={16} className="text-info mt-0.5" />
                            <div>
                                <p className="text-sm font-medium">Class Configuration Hierarchy</p>
                                <ul className="text-xs text-muted-foreground list-disc ml-4 mt-1 space-y-1">
                                    <li><strong>Global Settings</strong> - Apply to all classes by default</li>
                                    <li><strong>Grade-wise Settings</strong> - Override global for specific grades</li>
                                    <li><strong>Class-wise Settings</strong> - Override grade for specific sections</li>
                                    <li>Each class can have unique time rules, thresholds, and notification preferences</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* STATUSES */}
                <TabsContent value="statuses" className="mt-6">
                    <Card className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-semibold">Attendance Statuses</h3>
                                <p className="text-sm text-muted-foreground">Configure available attendance status options</p>
                            </div>
                            <Button size="sm"><Plus size={14} className="mr-1" />Add Status</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {statuses.map(status => (
                                <StatusCard key={status.id} status={status}
                                    onEdit={() => console.log('Edit', status)}
                                    onToggle={() => handleStatusToggle(status.id)} />
                            ))}
                        </div>
                        <div className="mt-4 p-4 bg-warning/10 rounded-lg border border-warning/20">
                            <div className="flex items-start gap-2">
                                <AlertTriangle size={16} className="text-warning mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">Count Value Explanation</p>
                                    <p className="text-xs text-muted-foreground">
                                        Count value determines how each status contributes to attendance percentage.
                                        Present = 1 (full day), Half-Day = 0.5, Absent = 0
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                {/* TIME RULES */}
                <TabsContent value="time-rules" className="mt-6">
                    <Card className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-semibold">Time-Based Rules</h3>
                                <p className="text-sm text-muted-foreground">Configure late, half-day, and absent thresholds</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {timeRules.map(rule => (
                                <TimeRuleCard key={rule.id} rule={rule} onEdit={() => console.log('Edit', rule)} />
                            ))}
                        </div>
                        <div className="mt-4 p-4 bg-info/10 rounded-lg border border-info/20">
                            <div className="flex items-start gap-2">
                                <Info size={16} className="text-info mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">How Time Rules Work</p>
                                    <p className="text-xs text-muted-foreground">
                                        These rules are calculated from the school's default start time.
                                        Example: If school starts at 9:00 AM and late threshold is 15 minutes,
                                        students arriving after 9:15 AM will be marked as "Late".
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                {/* LOCK RULES */}
                <TabsContent value="lock-rules" className="mt-6">
                    <Card className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-semibold">Lock & Edit Rules</h3>
                                <p className="text-sm text-muted-foreground">Configure when attendance locks and edit permissions</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {lockRules.map(rule => (
                                <LockRuleCard key={rule.id} rule={rule} onEdit={() => console.log('Edit', rule)} />
                            ))}
                        </div>
                        <div className="mt-4 p-4 bg-error/10 rounded-lg border border-error/20">
                            <div className="flex items-start gap-2">
                                <Shield size={16} className="text-error mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium">Data Integrity Rules</p>
                                    <ul className="text-xs text-muted-foreground list-disc ml-4 mt-1 space-y-1">
                                        <li>One attendance per student per day (no duplicates)</li>
                                        <li>Historical data becomes immutable after lock period</li>
                                        <li>All edits are logged with user, timestamp, and reason</li>
                                        <li>Soft delete only - data is never permanently removed</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </Card>
                </TabsContent>

                {/* NOTIFICATIONS */}
                <TabsContent value="notifications" className="mt-6">
                    <Card className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-semibold">Notification Rules</h3>
                                <p className="text-sm text-muted-foreground">Configure automated alerts and notifications</p>
                            </div>
                            <Button size="sm"><Plus size={14} className="mr-1" />Add Rule</Button>
                        </div>
                        <div className="space-y-3">
                            {notifications.map(rule => (
                                <NotificationCard key={rule.id} rule={rule} onToggle={() => handleNotificationToggle(rule.id)} />
                            ))}
                        </div>
                    </Card>
                </TabsContent>

                {/* PERMISSIONS */}
                <TabsContent value="permissions" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="p-5">
                            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                                <UserCheck size={18} className="text-primary" />
                                Who Can Mark Attendance
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { label: 'Class Teacher', desc: 'For their assigned class', checked: true },
                                    { label: 'Subject Teacher', desc: 'For their subject periods', checked: true },
                                    { label: 'Admin', desc: 'For all classes', checked: true },
                                    { label: 'Principal', desc: 'For all classes', checked: true },
                                ].map((item, i) => (
                                    <label key={i} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30">
                                        <div>
                                            <p className="text-sm font-medium">{item.label}</p>
                                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                                        </div>
                                        <input type="checkbox" defaultChecked={item.checked} className="w-5 h-5 rounded text-primary" />
                                    </label>
                                ))}
                            </div>
                        </Card>
                        <Card className="p-5">
                            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                                <Edit size={18} className="text-warning" />
                                Who Can Edit Attendance
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { label: 'Class Teacher', desc: 'Within edit window only', checked: true },
                                    { label: 'Admin', desc: 'Any time with audit log', checked: true },
                                    { label: 'Principal', desc: 'Any time with audit log', checked: true },
                                ].map((item, i) => (
                                    <label key={i} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30">
                                        <div>
                                            <p className="text-sm font-medium">{item.label}</p>
                                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                                        </div>
                                        <input type="checkbox" defaultChecked={item.checked} className="w-5 h-5 rounded text-primary" />
                                    </label>
                                ))}
                            </div>
                        </Card>
                        <Card className="p-5 lg:col-span-2">
                            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                                <FileText size={18} className="text-info" />
                                Audit Requirements
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-muted/30 rounded-lg">
                                    <p className="text-sm font-medium mb-2">Logged Information</p>
                                    <ul className="text-xs text-muted-foreground space-y-1">
                                        <li>• Who marked/edited</li>
                                        <li>• When (timestamp)</li>
                                        <li>• What was changed</li>
                                        <li>• Previous value</li>
                                        <li>• Reason for edit</li>
                                    </ul>
                                </div>
                                <div className="p-4 bg-muted/30 rounded-lg">
                                    <p className="text-sm font-medium mb-2">Retention Period</p>
                                    <p className="text-xs text-muted-foreground">Audit logs are retained for the entire academic year plus 2 additional years for compliance.</p>
                                </div>
                                <div className="p-4 bg-muted/30 rounded-lg">
                                    <p className="text-sm font-medium mb-2">Access Control</p>
                                    <p className="text-xs text-muted-foreground">Only Admin and Principal can view full audit logs. Teachers can view their own action history.</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
