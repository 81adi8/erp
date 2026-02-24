import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    User,
    BookOpen,
    CreditCard,
    FileText,
    Calendar,
    Edit,
    BadgeCheck,
    Mail,
    Phone,
    MapPin,
    ArrowLeft,
    Clock,
    Activity,
    Shield,
    Users,
    TrendingUp,
    TrendingDown,
    Award,
    MessageSquare,
    BarChart3,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Star,
    Download,
    Printer,
    ChevronRight,
    GraduationCap,
    Hash,
    Minus,
} from 'lucide-react';
import {
    Card,
    Button,
    Badge,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    LoadingSpinner,
    ProgressRing,
} from '@erp/common';
import { useGetStudentByIdQuery } from '@core/api/endpoints/studentsApi';
import { useGetClassesQuery, useGetAcademicSessionsQuery } from '@core/api/endpoints/academicsApi';

// ============================================================================
// Types
// ============================================================================

interface TabConfig {
    id: string;
    label: string;
    icon: React.ReactNode;
}

// ============================================================================
// Constants
// ============================================================================

const TABS: TabConfig[] = [
    { id: 'profile', label: 'Profile', icon: <User size={16} /> },
    { id: 'academic', label: 'Academic', icon: <BookOpen size={16} /> },
    { id: 'attendance', label: 'Attendance', icon: <Calendar size={16} /> },
    { id: 'performance', label: 'Performance', icon: <BarChart3 size={16} /> },
    { id: 'feedback', label: 'Feedback', icon: <MessageSquare size={16} /> },
    { id: 'report', label: 'Report Card', icon: <FileText size={16} /> },
];

// ============================================================================
// Main Component
// ============================================================================

export default function StudentDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: studentRes, isLoading, error } = useGetStudentByIdQuery(id!);
    const { data: classesData } = useGetClassesQuery({});
    const { data: sessionsData } = useGetAcademicSessionsQuery({});

    const [activeTab, setActiveTab] = useState('profile');

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <LoadingSpinner size="lg" />
                <p className="text-muted-foreground text-sm animate-pulse">Loading student profile...</p>
            </div>
        );
    }

    if (error || !studentRes) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="h-20 w-20 bg-rose-100 rounded-full flex items-center justify-center">
                    <XCircle size={40} className="text-rose-500" />
                </div>
                <h3 className="text-lg font-semibold">Student Not Found</h3>
                <p className="text-muted-foreground text-sm">The requested student profile could not be loaded.</p>
                <Button variant="outline" onClick={() => navigate(-1)} className="gap-2 mt-2">
                    <ArrowLeft size={16} /> Go Back
                </Button>
            </div>
        );
    }

    const student = studentRes.data;
    const classes = classesData?.data || [];
    const sessions = sessionsData?.data || [];
    const currentEnrollment = student.enrollments?.find(e => e.status === 'active');
    const currentClass = classes.find(c => c.id === currentEnrollment?.class_id);
    const currentSection = currentClass?.sections?.find(s => s.id === currentEnrollment?.section_id);
    const currentSession = sessions.find(s => s.id === currentEnrollment?.academic_year_id);

    return (
        <div className="space-y-6">
            {/* ── Header Actions ── */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="gap-2">
                    <ArrowLeft size={16} /> Back to Directory
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Edit size={16} /> Edit Profile
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Download size={16} /> Export
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                        <Printer size={16} /> Print
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" size="sm">
                        <Award size={16} /> Issue Certificate
                    </Button>
                </div>
            </motion.div>

            {/* ── Profile Hero Card ── */}
            <ProfileHeroCard
                student={student}
                currentClass={currentClass}
                currentSection={currentSection}
                currentSession={currentSession}
                currentEnrollment={currentEnrollment}
            />

            {/* ── Quick Stats Row ── */}
            <QuickStatsRow />

            {/* ── Tabs ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-transparent">
                <TabsList className="bg-surface/80 backdrop-blur-sm border p-1 rounded-xl w-full overflow-x-auto justify-start">
                    {TABS.map(tab => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className="gap-2 px-5 py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white whitespace-nowrap"
                        >
                            {tab.icon} {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <div className="mt-6">
                    <TabsContent value="profile" className="mt-0">
                        <ProfileTab student={student} />
                    </TabsContent>

                    <TabsContent value="academic" className="mt-0">
                        <AcademicTab
                            student={student}
                            classes={classes}
                            sessions={sessions}
                        />
                    </TabsContent>

                    <TabsContent value="attendance" className="mt-0">
                        <AttendanceTab />
                    </TabsContent>

                    <TabsContent value="performance" className="mt-0">
                        <PerformanceTab />
                    </TabsContent>

                    <TabsContent value="feedback" className="mt-0">
                        <FeedbackTab />
                    </TabsContent>

                    <TabsContent value="report" className="mt-0">
                        <ReportCardTab student={student} currentClass={currentClass} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

// ============================================================================
// Profile Hero Card
// ============================================================================

interface ProfileHeroCardProps {
    student: Record<string, unknown>;
    currentClass?: Record<string, unknown>;
    currentSection?: Record<string, unknown>;
    currentSession?: Record<string, unknown>;
    currentEnrollment?: Record<string, unknown>;
}

function ProfileHeroCard({ student, currentClass, currentSection, currentSession, currentEnrollment }: ProfileHeroCardProps) {
    const user = student.user as { first_name?: string; last_name?: string; email?: string; phone?: string } | undefined;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="overflow-hidden border-none shadow-xl relative">
                {/* Decorative gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-blue-500/5 to-purple-500/5" />
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full -mr-40 -mt-40 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-60 h-60 bg-emerald-500/5 rounded-full -ml-30 -mb-30 blur-3xl" />

                <div className="p-8 flex flex-col md:flex-row gap-8 relative z-10">
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-2xl flex items-center justify-center border-4 border-background shadow-xl overflow-hidden">
                            <User size={56} className="text-primary/40" />
                        </div>
                        <Badge
                            variant={(student.is_active as boolean) ? 'success' : 'outline'}
                            className="px-4 py-1 text-sm"
                        >
                            {(student.is_active as boolean) ? '● Active' : '○ Inactive'}
                        </Badge>
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-4">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold tracking-tight">
                                {user?.first_name} {user?.last_name}
                            </h1>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                                <InfoChip icon={<BadgeCheck size={15} className="text-emerald-500" />}>
                                    Adm No: {student.admission_number as string}
                                </InfoChip>
                                {currentEnrollment && (
                                    <InfoChip icon={<BookOpen size={15} className="text-blue-500" />}>
                                        {(currentClass as { name?: string })?.name || 'N/A'}
                                        {currentSection && ` - ${(currentSection as { name?: string })?.name}`}
                                    </InfoChip>
                                )}
                                <InfoChip icon={<Hash size={15} className="text-purple-500" />}>
                                    Roll: {(currentEnrollment as { roll_number?: string })?.roll_number || (student.roll_number as string) || 'N/A'}
                                </InfoChip>
                                {currentSession && (
                                    <InfoChip icon={<Calendar size={15} className="text-amber-500" />}>
                                        {(currentSession as { name?: string })?.name}
                                    </InfoChip>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-8 pt-4 border-t border-border/50">
                            <ContactItem icon={<Mail size={15} />} value={user?.email || 'No email'} />
                            <ContactItem icon={<Phone size={15} />} value={user?.phone || 'No phone'} />
                            <ContactItem icon={<MapPin size={15} />} value={(student.current_address as string) || 'No address'} truncate />
                            <ContactItem icon={<Clock size={15} />} value={`Joined: ${student.admission_date ? new Date(student.admission_date as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}`} />
                            <ContactItem icon={<Activity size={15} />} value={`Blood: ${(student.blood_group as string) || 'Unknown'}`} />
                            <ContactItem icon={<GraduationCap size={15} />} value={`Gender: ${(student.gender as string)?.charAt(0).toUpperCase()}${(student.gender as string)?.slice(1) || 'N/A'}`} />
                        </div>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}

function InfoChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1 rounded-full text-xs font-medium">
            {icon} {children}
        </span>
    );
}

function ContactItem({ icon, value, truncate }: { icon: React.ReactNode; value: string; truncate?: boolean }) {
    return (
        <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{icon}</span>
            <span className={truncate ? 'truncate max-w-[200px]' : ''}>{value}</span>
        </div>
    );
}

// ============================================================================
// Quick Stats Row
// ============================================================================

function QuickStatsRow() {
    const quickStats = [
        { label: 'Attendance', value: 92, color: 'stroke-emerald-500', icon: Calendar, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600' },
        { label: 'Performance', value: 85, color: 'stroke-blue-500', icon: TrendingUp, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-600' },
        { label: 'Assignments', value: 78, color: 'stroke-purple-500', icon: FileText, iconBg: 'bg-purple-500/10', iconColor: 'text-purple-600' },
        { label: 'Behavior', value: 95, color: 'stroke-amber-500', icon: Star, iconBg: 'bg-amber-500/10', iconColor: 'text-amber-600' },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickStats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08, duration: 0.4 }}
                    >
                        <Card className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                            <ProgressRing value={stat.value} size="md" color={stat.color} />
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                                <p className="text-xl font-bold">{stat.value}%</p>
                            </div>
                        </Card>
                    </motion.div>
                );
            })}
        </div>
    );
}

// ============================================================================
// Profile Tab
// ============================================================================

function ProfileTab({ student }: { student: Record<string, unknown> }) {
    const familyDetails = student.family_details as Record<string, string> | undefined;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
            {/* Personal Details */}
            <Card className="p-6 space-y-4">
                <SectionTitle icon={<User size={18} className="text-primary" />} title="Personal Details" />
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <DetailField label="Date of Birth" value={student.date_of_birth ? new Date(student.date_of_birth as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'} />
                    <DetailField label="Gender" value={(student.gender as string) || 'N/A'} capitalize />
                    <DetailField label="Religion" value={(student.religion as string) || 'N/A'} />
                    <DetailField label="Caste / Category" value={`${(student.caste as string) || 'N/A'} (${(student.category as string) || 'GEN'})`} />
                    <DetailField label="Mother Tongue" value={(student.mother_tongue as string) || 'N/A'} />
                    <DetailField label="Aadhar Number" value={(student.aadhar_number as string) || 'N/A'} />
                    <DetailField label="Current Address" value={(student.current_address as string) || 'N/A'} span={2} />
                    <DetailField label="Permanent Address" value={(student.permanent_address as string) || 'Same as current'} span={2} />
                </div>
            </Card>

            {/* Family Details */}
            <Card className="p-6 space-y-4">
                <SectionTitle icon={<Users size={18} className="text-primary" />} title="Family Details" />
                <div className="space-y-4 text-sm">
                    {familyDetails?.father_name && (
                        <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                <User size={14} className="text-blue-500" /> Father&apos;s Information
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <DetailField label="Name" value={familyDetails.father_name} />
                                <DetailField label="Occupation" value={familyDetails.father_occupation || 'N/A'} />
                                <DetailField label="Phone" value={familyDetails.father_phone || 'N/A'} />
                                <DetailField label="Email" value={familyDetails.father_email || 'N/A'} />
                            </div>
                        </div>
                    )}
                    {familyDetails?.mother_name && (
                        <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                <User size={14} className="text-rose-500" /> Mother&apos;s Information
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <DetailField label="Name" value={familyDetails.mother_name} />
                                <DetailField label="Occupation" value={familyDetails.mother_occupation || 'N/A'} />
                                <DetailField label="Phone" value={familyDetails.mother_phone || 'N/A'} />
                                <DetailField label="Email" value={familyDetails.mother_email || 'N/A'} />
                            </div>
                        </div>
                    )}
                    <div className="p-4 bg-rose-50/50 border border-rose-200/50 rounded-xl space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2 text-rose-700">
                            <AlertCircle size={14} /> Emergency Contact
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <DetailField label="Name" value={(student.emergency_contact_name as string) || 'N/A'} />
                            <DetailField label="Relation" value={(student.emergency_contact_relation as string) || 'N/A'} />
                            <DetailField label="Phone" value={(student.emergency_contact_phone as string) || 'N/A'} highlight />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Medical Info */}
            <Card className="p-6 space-y-4">
                <SectionTitle icon={<Activity size={18} className="text-primary" />} title="Medical Information" />
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <DetailField label="Blood Group" value={(student.blood_group as string) || 'Unknown'} />
                    <DetailField label="Transport Required" value={(student.is_transport_required as boolean) ? 'Yes' : 'No'} />
                    <DetailField label="Hostel Required" value={(student.is_hostel_required as boolean) ? 'Yes' : 'No'} />
                    <DetailField label="Medical History" value={(student.medical_history as string) || 'None'} span={2} />
                </div>
            </Card>

            {/* Previous School Details */}
            <Card className="p-6 space-y-4">
                <SectionTitle icon={<GraduationCap size={18} className="text-primary" />} title="Previous School" />
                {student.previous_school_details ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <DetailField label="School Name" value={(student.previous_school_details as Record<string, string>)?.school_name || 'N/A'} span={2} />
                        <DetailField label="Board" value={(student.previous_school_details as Record<string, string>)?.board || 'N/A'} />
                        <DetailField label="Last Class" value={(student.previous_school_details as Record<string, string>)?.last_class || 'N/A'} />
                        <DetailField label="Percentage" value={(student.previous_school_details as Record<string, string>)?.percentage || 'N/A'} />
                        <DetailField label="Year of Passing" value={(student.previous_school_details as Record<string, string>)?.year || 'N/A'} />
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground italic py-4">No previous school information available.</p>
                )}
            </Card>
        </motion.div>
    );
}

// ============================================================================
// Academic Tab
// ============================================================================

interface AcademicTabProps {
    student: Record<string, unknown>;
    classes: Array<Record<string, unknown>>;
    sessions: Array<Record<string, unknown>>;
}

function AcademicTab({ student, classes, sessions }: AcademicTabProps) {
    const enrollments = (student.enrollments as Array<Record<string, unknown>>) || [];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <Card className="p-6">
                <SectionTitle icon={<BookOpen size={18} className="text-primary" />} title="Enrollment History" />
                {enrollments.length > 0 ? (
                    <div className="space-y-4 mt-4">
                        {enrollments.map((en, idx) => {
                            const cls = classes.find(c => (c.id as string) === (en.class_id as string));
                            const sec = (cls as { sections?: Array<Record<string, unknown>> })?.sections?.find(
                                s => (s.id as string) === (en.section_id as string)
                            );
                            const session = sessions.find(s => (s.id as string) === (en.academic_year_id as string));
                            const isActive = en.status === 'active';

                            return (
                                <motion.div
                                    key={en.id as string}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={`
                                        flex items-center gap-4 p-5 rounded-xl border relative overflow-hidden transition-all
                                        ${isActive
                                            ? 'bg-emerald-50/50 border-emerald-200/60 shadow-sm'
                                            : 'bg-muted/20 border-border/50 hover:bg-muted/30'
                                        }
                                    `}
                                >
                                    {/* Timeline connector */}
                                    {idx < enrollments.length - 1 && (
                                        <div className="absolute left-[39px] top-[60px] w-0.5 h-8 bg-border/50" />
                                    )}

                                    {isActive && (
                                        <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-bl-lg">
                                            Current
                                        </div>
                                    )}

                                    <div className={`
                                        w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0
                                        ${isActive ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}
                                    `}>
                                        {idx + 1}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-base">
                                            {(session as { name?: string })?.name || `Year ${en.academic_year_id as string}`}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            {(cls as { name?: string })?.name || 'Unknown Class'}
                                            {sec && ` — Section ${(sec as { name?: string }).name}`}
                                        </p>
                                    </div>

                                    <div className="text-right shrink-0 space-y-1">
                                        <p className="text-xs font-medium">
                                            Roll: {(en.roll_number as string) || 'N/A'}
                                        </p>
                                        <Badge variant={isActive ? 'success' : 'default'} size="sm">
                                            {(en.status as string)?.charAt(0).toUpperCase()}{(en.status as string)?.slice(1)}
                                        </Badge>
                                        {(en.is_repeater as boolean) && (
                                            <Badge variant="warning" size="sm" className="ml-1">Repeater</Badge>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground italic">
                        <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                        No enrollment history found.
                    </div>
                )}
            </Card>
        </motion.div>
    );
}

// ============================================================================
// Attendance Tab
// ============================================================================

function AttendanceTab() {
    // Mock attendance data for display
    const monthlyData = [
        { month: 'Apr', present: 22, absent: 2, late: 1, total: 25 },
        { month: 'May', present: 20, absent: 3, late: 2, total: 25 },
        { month: 'Jun', present: 18, absent: 1, late: 1, total: 20 },
        { month: 'Jul', present: 23, absent: 1, late: 0, total: 24 },
        { month: 'Aug', present: 21, absent: 2, late: 1, total: 24 },
        { month: 'Sep', present: 22, absent: 0, late: 1, total: 23 },
        { month: 'Oct', present: 20, absent: 3, late: 0, total: 23 },
        { month: 'Nov', present: 19, absent: 2, late: 1, total: 22 },
        { month: 'Dec', present: 16, absent: 1, late: 0, total: 17 },
        { month: 'Jan', present: 22, absent: 1, late: 1, total: 24 },
    ];

    const totalPresent = monthlyData.reduce((sum, m) => sum + m.present, 0);
    const totalAbsent = monthlyData.reduce((sum, m) => sum + m.absent, 0);
    const totalLate = monthlyData.reduce((sum, m) => sum + m.late, 0);
    const totalDays = monthlyData.reduce((sum, m) => sum + m.total, 0);
    const overallPercent = Math.round((totalPresent / totalDays) * 100);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Overall Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <AttendanceStatCard label="Present" value={totalPresent} total={totalDays} color="text-emerald-600" bgColor="bg-emerald-500/10" icon={<CheckCircle2 size={20} />} />
                <AttendanceStatCard label="Absent" value={totalAbsent} total={totalDays} color="text-rose-600" bgColor="bg-rose-500/10" icon={<XCircle size={20} />} />
                <AttendanceStatCard label="Late" value={totalLate} total={totalDays} color="text-amber-600" bgColor="bg-amber-500/10" icon={<Clock size={20} />} />
                <Card className="p-4 flex items-center gap-4">
                    <ProgressRing value={overallPercent} size="lg" color={overallPercent >= 90 ? 'stroke-emerald-500' : overallPercent >= 75 ? 'stroke-amber-500' : 'stroke-rose-500'} />
                    <div>
                        <p className="text-xs text-muted-foreground font-medium">Overall</p>
                        <p className="text-2xl font-bold">{overallPercent}%</p>
                    </div>
                </Card>
            </div>

            {/* Monthly Breakdown */}
            <Card className="p-6">
                <SectionTitle icon={<BarChart3 size={18} className="text-primary" />} title="Monthly Attendance Breakdown" />
                <div className="mt-4 space-y-3">
                    {monthlyData.map((month, idx) => {
                        const percent = Math.round((month.present / month.total) * 100);
                        return (
                            <motion.div
                                key={month.month}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                            >
                                <span className="w-10 text-sm font-bold text-muted-foreground">{month.month}</span>
                                <div className="flex-1">
                                    <div className="w-full bg-muted/50 rounded-full h-3 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percent}%` }}
                                            transition={{ duration: 0.8, delay: idx * 0.05 }}
                                            className={`h-full rounded-full ${
                                                percent >= 90 ? 'bg-emerald-500' :
                                                percent >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                                            }`}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs shrink-0">
                                    <span className="text-emerald-600 font-medium w-10 text-right">{month.present}P</span>
                                    <span className="text-rose-500 font-medium w-8">{month.absent}A</span>
                                    <span className="text-amber-500 font-medium w-8">{month.late}L</span>
                                    <Badge
                                        variant={percent >= 90 ? 'success' : percent >= 75 ? 'warning' : 'error'}
                                        size="sm"
                                        className="w-14 justify-center"
                                    >
                                        {percent}%
                                    </Badge>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </Card>
        </motion.div>
    );
}

function AttendanceStatCard({ label, value, total, color, bgColor, icon }: {
    label: string;
    value: number;
    total: number;
    color: string;
    bgColor: string;
    icon: React.ReactNode;
}) {
    return (
        <Card className="p-4 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${bgColor} ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
                <p className="text-2xl font-bold">{value} <span className="text-sm font-normal text-muted-foreground">/ {total}</span></p>
            </div>
        </Card>
    );
}

// ============================================================================
// Performance Tab
// ============================================================================

function PerformanceTab() {
    const subjects = [
        { name: 'Mathematics', score: 92, maxScore: 100, grade: 'A+', trend: 'up' as const, delta: '+5' },
        { name: 'Science', score: 88, maxScore: 100, grade: 'A', trend: 'up' as const, delta: '+3' },
        { name: 'English', score: 75, maxScore: 100, grade: 'B+', trend: 'down' as const, delta: '-2' },
        { name: 'Hindi', score: 82, maxScore: 100, grade: 'A', trend: 'up' as const, delta: '+4' },
        { name: 'Social Studies', score: 70, maxScore: 100, grade: 'B', trend: 'neutral' as const, delta: '0' },
        { name: 'Computer Science', score: 95, maxScore: 100, grade: 'A+', trend: 'up' as const, delta: '+8' },
        { name: 'Physical Education', score: 90, maxScore: 100, grade: 'A+', trend: 'neutral' as const, delta: '0' },
    ];

    const avgScore = Math.round(subjects.reduce((s, sub) => s + sub.score, 0) / subjects.length);
    const bestSubject = [...subjects].sort((a, b) => b.score - a.score)[0];
    const weakestSubject = [...subjects].sort((a, b) => a.score - b.score)[0];

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-5 text-center space-y-2 bg-gradient-to-br from-blue-50/50 to-transparent border-blue-200/30">
                    <ProgressRing value={avgScore} size="lg" color="stroke-blue-500" />
                    <p className="text-sm font-medium text-muted-foreground mt-2">Average Score</p>
                    <p className="text-xs text-blue-600 font-medium">Overall Performance</p>
                </Card>
                <Card className="p-5 space-y-3 bg-gradient-to-br from-emerald-50/50 to-transparent border-emerald-200/30">
                    <div className="p-3 w-fit rounded-xl bg-emerald-500/10">
                        <TrendingUp size={20} className="text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground font-medium">Best Subject</p>
                        <p className="text-lg font-bold">{bestSubject.name}</p>
                        <p className="text-sm text-emerald-600 font-medium">{bestSubject.score}/{bestSubject.maxScore}</p>
                    </div>
                </Card>
                <Card className="p-5 space-y-3 bg-gradient-to-br from-amber-50/50 to-transparent border-amber-200/30">
                    <div className="p-3 w-fit rounded-xl bg-amber-500/10">
                        <AlertCircle size={20} className="text-amber-600" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground font-medium">Needs Improvement</p>
                        <p className="text-lg font-bold">{weakestSubject.name}</p>
                        <p className="text-sm text-amber-600 font-medium">{weakestSubject.score}/{weakestSubject.maxScore}</p>
                    </div>
                </Card>
            </div>

            {/* Subject Wise Performance */}
            <Card className="p-6">
                <SectionTitle icon={<BarChart3 size={18} className="text-primary" />} title="Subject-wise Performance" />
                <div className="mt-4 space-y-3">
                    {subjects.map((sub, idx) => {
                        const percent = Math.round((sub.score / sub.maxScore) * 100);
                        const TrendIcon = sub.trend === 'up' ? TrendingUp : sub.trend === 'down' ? TrendingDown : Minus;
                        const trendColor = sub.trend === 'up' ? 'text-emerald-600' : sub.trend === 'down' ? 'text-rose-500' : 'text-muted-foreground';

                        return (
                            <motion.div
                                key={sub.name}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.06 }}
                                className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors"
                            >
                                <div className="w-32 sm:w-40 shrink-0">
                                    <p className="text-sm font-semibold">{sub.name}</p>
                                </div>
                                <div className="flex-1">
                                    <div className="w-full bg-muted/50 rounded-full h-2.5 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percent}%` }}
                                            transition={{ duration: 0.8, delay: idx * 0.06 }}
                                            className={`h-full rounded-full ${
                                                percent >= 90 ? 'bg-emerald-500' :
                                                percent >= 75 ? 'bg-blue-500' :
                                                percent >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                            }`}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-sm font-bold w-16 text-right">{sub.score}/{sub.maxScore}</span>
                                    <Badge
                                        variant={percent >= 90 ? 'success' : percent >= 75 ? 'info' : percent >= 60 ? 'warning' : 'error'}
                                        className="w-10 justify-center font-bold"
                                    >
                                        {sub.grade}
                                    </Badge>
                                    <span className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
                                        <TrendIcon size={12} /> {sub.delta}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </Card>
        </motion.div>
    );
}

// ============================================================================
// Teacher Feedback Tab
// ============================================================================

function FeedbackTab() {
    const feedbackItems = [
        {
            id: '1',
            teacher: 'Mrs. Sharma',
            subject: 'Mathematics',
            date: '2026-02-08',
            rating: 5,
            type: 'positive' as const,
            comment: 'Excellent problem-solving skills. Consistently performs well in class tests and actively participates in discussions.',
        },
        {
            id: '2',
            teacher: 'Mr. Verma',
            subject: 'Science',
            date: '2026-02-05',
            rating: 4,
            type: 'positive' as const,
            comment: 'Good understanding of concepts. Shows curiosity during practicals. Could improve on submitting lab reports on time.',
        },
        {
            id: '3',
            teacher: 'Ms. Gupta',
            subject: 'English',
            date: '2026-01-28',
            rating: 3,
            type: 'improvement' as const,
            comment: 'Needs to focus more on grammar and creative writing. Reading comprehension has improved since last term.',
        },
        {
            id: '4',
            teacher: 'Mr. Kumar',
            subject: 'Hindi',
            date: '2026-01-22',
            rating: 4,
            type: 'positive' as const,
            comment: 'Very good in literature analysis. Writing skills are commendable. Participates actively in class debates.',
        },
        {
            id: '5',
            teacher: 'Mrs. Patel',
            subject: 'Social Studies',
            date: '2026-01-15',
            rating: 3,
            type: 'improvement' as const,
            comment: 'Needs to improve map work and diagram labeling. Good conceptual understanding but should work on presentation skills.',
        },
    ];

    const positiveCount = feedbackItems.filter(f => f.type === 'positive').length;
    const improvementCount = feedbackItems.filter(f => f.type === 'improvement').length;
    const avgRating = (feedbackItems.reduce((s, f) => s + f.rating, 0) / feedbackItems.length).toFixed(1);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
                        <Star size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Avg Rating</p>
                        <p className="text-2xl font-bold">{avgRating} <span className="text-sm font-normal text-muted-foreground">/ 5</span></p>
                    </div>
                </Card>
                <Card className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Positive</p>
                        <p className="text-2xl font-bold">{positiveCount}</p>
                    </div>
                </Card>
                <Card className="p-4 flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600">
                        <TrendingUp size={22} />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Improvement Areas</p>
                        <p className="text-2xl font-bold">{improvementCount}</p>
                    </div>
                </Card>
            </div>

            {/* Feedback List */}
            <Card className="p-6">
                <SectionTitle icon={<MessageSquare size={18} className="text-primary" />} title="Recent Teacher Feedback" />
                <div className="mt-4 space-y-4">
                    {feedbackItems.map((feedback, idx) => (
                        <motion.div
                            key={feedback.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.08 }}
                            className={`
                                p-5 rounded-xl border transition-all hover:shadow-sm
                                ${feedback.type === 'positive'
                                    ? 'bg-emerald-50/30 border-emerald-200/50'
                                    : 'bg-blue-50/30 border-blue-200/50'
                                }
                            `}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`
                                        w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm
                                        ${feedback.type === 'positive'
                                            ? 'bg-emerald-500/15 text-emerald-700'
                                            : 'bg-blue-500/15 text-blue-700'
                                        }
                                    `}>
                                        {feedback.teacher.charAt(0)}{feedback.teacher.split(' ')[1]?.charAt(0) || ''}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">{feedback.teacher}</p>
                                        <p className="text-xs text-muted-foreground">{feedback.subject}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-0.5">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star
                                                key={i}
                                                size={14}
                                                className={i < feedback.rating ? 'text-amber-400 fill-amber-400' : 'text-muted/30'}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-xs text-muted-foreground ml-2">
                                        {new Date(feedback.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    </span>
                                </div>
                            </div>
                            <p className="text-sm text-foreground/80 leading-relaxed pl-[52px]">
                                {feedback.comment}
                            </p>
                            <div className="mt-3 pl-[52px]">
                                <Badge
                                    variant={feedback.type === 'positive' ? 'success' : 'info'}
                                    size="sm"
                                >
                                    {feedback.type === 'positive' ? '✓ Positive' : '↑ Needs Improvement'}
                                </Badge>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </Card>
        </motion.div>
    );
}

// ============================================================================
// Report Card Tab
// ============================================================================

interface ReportCardTabProps {
    student: Record<string, unknown>;
    currentClass?: Record<string, unknown>;
}

function ReportCardTab({ student, currentClass }: ReportCardTabProps) {
    const user = student.user as { first_name?: string; last_name?: string } | undefined;

    const reportData = [
        { subject: 'Mathematics', term1: 45, term2: 47, maxMarks: 50, grade: 'A+' },
        { subject: 'Science', term1: 42, term2: 44, maxMarks: 50, grade: 'A' },
        { subject: 'English', term1: 38, term2: 37, maxMarks: 50, grade: 'B+' },
        { subject: 'Hindi', term1: 40, term2: 42, maxMarks: 50, grade: 'A' },
        { subject: 'Social Studies', term1: 35, term2: 35, maxMarks: 50, grade: 'B' },
        { subject: 'Computer Science', term1: 48, term2: 47, maxMarks: 50, grade: 'A+' },
        { subject: 'Physical Education', term1: 44, term2: 46, maxMarks: 50, grade: 'A+' },
    ];

    const totalTerm1 = reportData.reduce((s, r) => s + r.term1, 0);
    const totalTerm2 = reportData.reduce((s, r) => s + r.term2, 0);
    const totalMax = reportData.reduce((s, r) => s + r.maxMarks, 0);
    const overallPercent = Math.round(((totalTerm1 + totalTerm2) / (totalMax * 2)) * 100);

    const getGradeBg = (grade: string): string => {
        if (grade === 'A+') return 'bg-emerald-500/15 text-emerald-700';
        if (grade === 'A') return 'bg-blue-500/15 text-blue-700';
        if (grade === 'B+') return 'bg-purple-500/15 text-purple-700';
        if (grade === 'B') return 'bg-amber-500/15 text-amber-700';
        return 'bg-rose-500/15 text-rose-700';
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Report Card Header */}
            <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-primary/10 via-blue-500/10 to-purple-500/10 p-6 border-b border-border/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <FileText size={20} className="text-primary" />
                                Academic Report Card
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {user?.first_name} {user?.last_name} • {(currentClass as { name?: string })?.name || 'N/A'} • Session 2025-26
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="gap-2">
                                <Download size={14} /> Download PDF
                            </Button>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Printer size={14} /> Print
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Marks Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-muted/30">
                                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Subject</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Term 1</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Term 2</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Percentage</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((row, idx) => {
                                const total = row.term1 + row.term2;
                                const maxTotal = row.maxMarks * 2;
                                const percent = Math.round((total / maxTotal) * 100);

                                return (
                                    <motion.tr
                                        key={row.subject}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                                    >
                                        <td className="px-6 py-4 text-sm font-medium">{row.subject}</td>
                                        <td className="px-6 py-4 text-center text-sm">
                                            <span className="font-semibold">{row.term1}</span>
                                            <span className="text-muted-foreground">/{row.maxMarks}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm">
                                            <span className="font-semibold">{row.term2}</span>
                                            <span className="text-muted-foreground">/{row.maxMarks}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm font-bold">{total}/{maxTotal}</td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge
                                                variant={percent >= 90 ? 'success' : percent >= 75 ? 'info' : percent >= 60 ? 'warning' : 'error'}
                                                size="sm"
                                            >
                                                {percent}%
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center justify-center w-10 h-7 rounded-md text-xs font-bold ${getGradeBg(row.grade)}`}>
                                                {row.grade}
                                            </span>
                                        </td>
                                    </motion.tr>
                                );
                            })}

                            {/* Totals Row */}
                            <tr className="bg-primary/5 font-bold border-t-2 border-primary/20">
                                <td className="px-6 py-4 text-sm">Grand Total</td>
                                <td className="px-6 py-4 text-center text-sm">{totalTerm1}/{totalMax}</td>
                                <td className="px-6 py-4 text-center text-sm">{totalTerm2}/{totalMax}</td>
                                <td className="px-6 py-4 text-center text-sm">{totalTerm1 + totalTerm2}/{totalMax * 2}</td>
                                <td className="px-6 py-4 text-center">
                                    <Badge variant={overallPercent >= 75 ? 'success' : 'warning'} size="md" className="font-bold">
                                        {overallPercent}%
                                    </Badge>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center justify-center w-10 h-7 rounded-md text-xs font-bold ${getGradeBg(overallPercent >= 90 ? 'A+' : overallPercent >= 80 ? 'A' : overallPercent >= 70 ? 'B+' : 'B')}`}>
                                        {overallPercent >= 90 ? 'A+' : overallPercent >= 80 ? 'A' : overallPercent >= 70 ? 'B+' : 'B'}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Result Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5 text-center bg-gradient-to-br from-emerald-50/50 to-transparent">
                    <Award size={32} className="text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Overall Result</p>
                    <p className="text-lg font-bold text-emerald-600 mt-1">PASS</p>
                </Card>
                <Card className="p-5 text-center bg-gradient-to-br from-blue-50/50 to-transparent">
                    <BarChart3 size={32} className="text-blue-500 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Class Rank</p>
                    <p className="text-lg font-bold text-blue-600 mt-1">5th / 42</p>
                </Card>
                <Card className="p-5 text-center bg-gradient-to-br from-purple-50/50 to-transparent">
                    <GraduationCap size={32} className="text-purple-500 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Promotion Status</p>
                    <p className="text-lg font-bold text-purple-600 mt-1">Promoted</p>
                </Card>
            </div>
        </motion.div>
    );
}

// ============================================================================
// Shared Utility Components
// ============================================================================

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
    return (
        <h3 className="font-bold border-b border-border/50 pb-3 flex items-center gap-2 text-base">
            {icon} {title}
        </h3>
    );
}

interface DetailFieldProps {
    label: string;
    value: string;
    span?: number;
    capitalize?: boolean;
    highlight?: boolean;
}

function DetailField({ label, value, span, capitalize, highlight }: DetailFieldProps) {
    return (
        <div className={`space-y-1 ${span === 2 ? 'col-span-2' : ''}`}>
            <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-wider">{label}</p>
            <p className={`
                text-sm
                ${capitalize ? 'capitalize' : ''}
                ${highlight ? 'text-primary font-semibold' : ''}
            `}>
                {value}
            </p>
        </div>
    );
}
