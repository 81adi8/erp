import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    GraduationCap,
    Eye,
    Edit2,
    Trash2,
    Search as SearchIcon,
    Calendar,
    Phone,
    Mail,
    RefreshCw,
    Download,
    LayoutGrid,
    LayoutList,
    School,
    Users,
    UserPlus,
    Hash,
    X,
    ChevronRight,
    Filter,
    SlidersHorizontal,
} from 'lucide-react';
import {
    Card,
    Button,
    Input,
    Badge,
    Avatar,
    PageHeader,
    Skeleton,
    ClassSelect,
} from '@erp/common';
import { useGetStudentsQuery } from '@core/api/endpoints/studentsApi';
import { useGetClassesQuery, useGetAcademicSessionsQuery } from '@core/api/endpoints/academicsApi';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// Types
// ============================================================================

interface StudentEnrollment {
    id: string;
    class_id: string;
    section_id: string;
    academic_year_id: string;
    roll_number?: string;
    status: string;
    createdAt?: string;
    created_at?: string;
}

interface StudentRecord {
    id: string;
    admission_number: string;
    roll_number?: string;
    admission_date: string;
    gender?: string;
    is_active: boolean;
    phone?: string;
    email?: string;
    user?: {
        first_name: string;
        last_name: string;
        email: string;
        phone?: string;
    };
    enrollments?: StudentEnrollment[];
}

// ============================================================================
// Constants
// ============================================================================

const SEARCH_FIELDS = [
    { key: 'name', label: 'Name', icon: Users },
    { key: 'email', label: 'Email', icon: Mail },
    { key: 'roll', label: 'Roll No', icon: Hash },
    { key: 'admission', label: 'Adm No', icon: GraduationCap },
    { key: 'mobile', label: 'Mobile', icon: Phone },
] as const;

type SearchFieldKey = typeof SEARCH_FIELDS[number]['key'];

// ============================================================================
// Helper Functions
// ============================================================================

function getLatestEnrollment(student: StudentRecord): StudentEnrollment | null {
    if (!student.enrollments || student.enrollments.length === 0) return null;
    return [...student.enrollments].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.created_at || 0).getTime();
        const dateB = new Date(b.createdAt || b.created_at || 0).getTime();
        return dateB - dateA;
    })[0];
}

function matchesSearch(student: StudentRecord, term: string, field: SearchFieldKey): boolean {
    if (!term) return true;
    const lowerTerm = term.toLowerCase();

    switch (field) {
        case 'name': {
            const fullName = `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.toLowerCase();
            return fullName.includes(lowerTerm);
        }
        case 'email':
            return (student.user?.email || '').toLowerCase().includes(lowerTerm);
        case 'roll':
            return (student.roll_number || '').toLowerCase().includes(lowerTerm);
        case 'admission':
            return (student.admission_number || '').toLowerCase().includes(lowerTerm);
        case 'mobile':
            return (student.user?.phone || '').toLowerCase().includes(lowerTerm);
        default:
            return true;
    }
}

// ============================================================================
// StudentsPage Component
// ============================================================================

export default function StudentsPage() {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSearchField, setActiveSearchField] = useState<SearchFieldKey>('name');
    const [classFilter, setClassFilter] = useState<string | number>('');
    const [showFilters, setShowFilters] = useState(false);

    // API Queries
    const { data: academicYears } = useGetAcademicSessionsQuery({});
    const { data: classesData } = useGetClassesQuery({});
    const {
        data: studentsData,
        isLoading,
        isFetching,
        refetch,
    } = useGetStudentsQuery({
        classId: classFilter ? String(classFilter) : undefined,
        search: searchTerm || undefined,
    });

    const students: StudentRecord[] = studentsData?.data || [];
    const classes = classesData?.data || [];

    // Client-side search filter
    const filteredStudents = useMemo(() => {
        if (!searchTerm) return students;
        return students.filter(s => matchesSearch(s, searchTerm, activeSearchField));
    }, [students, searchTerm, activeSearchField]);

    // Stats
    const stats = useMemo(() => ({
        total: students.length,
        active: students.filter(s => s.is_active).length,
        newThisMonth: students.filter(s => {
            const date = new Date(s.admission_date);
            const now = new Date();
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).length,
        filtered: filteredStudents.length,
    }), [students, filteredStudents]);

    const handleClearFilters = useCallback(() => {
        setSearchTerm('');
        setClassFilter('');
        setActiveSearchField('name');
    }, []);

    const hasActiveFilters = searchTerm || classFilter;

    // Class options for ClassSelect
    const classSelectOptions = useMemo(() =>
        classes.map(cls => ({
            id: cls.id,
            name: cls.name,
            sectionCount: cls.sections?.length,
            category: cls.category || undefined,
        })),
    [classes]);

    return (
        <div className="space-y-6">
            {/* ── Page Header ── */}
            <PageHeader
                icon={GraduationCap}
                iconColor="text-emerald-500"
                iconBg="bg-emerald-500/10"
                title="Students Directory"
                description="Central directory of all students — search, filter, and manage."
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isFetching}
                        >
                            <RefreshCw size={16} className={`mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm">
                            <Download size={16} className="mr-2" />
                            Export
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('bulk-import')}
                        >
                            <UserPlus size={16} className="mr-2" />
                            Bulk Import
                        </Button>
                        <Button
                            onClick={() => navigate('admission')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <Plus size={16} className="mr-2" />
                            New Admission
                        </Button>
                    </div>
                }
            />

            {/* ── Stats Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsBlock
                    icon={<Users size={22} />}
                    iconBg="bg-emerald-500/10"
                    iconColor="text-emerald-600"
                    label="Total Students"
                    value={stats.total}
                />
                <StatsBlock
                    icon={<School size={22} />}
                    iconBg="bg-blue-500/10"
                    iconColor="text-blue-600"
                    label="Active Enrolled"
                    value={stats.active}
                />
                <StatsBlock
                    icon={<Calendar size={22} />}
                    iconBg="bg-purple-500/10"
                    iconColor="text-purple-600"
                    label="New This Month"
                    value={stats.newThisMonth}
                />
                <StatsBlock
                    icon={<Filter size={22} />}
                    iconBg="bg-amber-500/10"
                    iconColor="text-amber-600"
                    label="Showing Results"
                    value={stats.filtered}
                />
            </div>

            {/* ── Search & Filters ── */}
            <Card className="p-4 space-y-4">
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                    {/* Search Input */}
                    <div className="flex-1 w-full lg:max-w-xl">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={`Search by ${SEARCH_FIELDS.find(f => f.key === activeSearchField)?.label || 'name'}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-10"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        {/* Search Field Chips */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {SEARCH_FIELDS.map(field => {
                                const Icon = field.icon;
                                return (
                                    <button
                                        key={field.key}
                                        onClick={() => setActiveSearchField(field.key)}
                                        className={`
                                            inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all duration-200
                                            ${activeSearchField === field.key
                                                ? 'bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30 shadow-sm'
                                                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                                            }
                                        `}
                                    >
                                        <Icon size={12} />
                                        {field.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        {/* Toggle Filters */}
                        <Button
                            variant={showFilters ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                            className="gap-2"
                        >
                            <SlidersHorizontal size={14} />
                            Filters
                            {hasActiveFilters && (
                                <span className="ml-1 w-2 h-2 bg-emerald-500 rounded-full" />
                            )}
                        </Button>

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearFilters}
                                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 gap-1.5"
                            >
                                <X size={14} />
                                Clear
                            </Button>
                        )}

                        {/* View Mode Toggle */}
                        <div className="flex items-center bg-muted rounded-lg p-1 ml-auto lg:ml-0">
                            <Button
                                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setViewMode('list')}
                            >
                                <LayoutList size={16} />
                            </Button>
                            <Button
                                variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setViewMode('grid')}
                            >
                                <LayoutGrid size={16} />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Expandable Filter Row */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-3 border-t border-border/50">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <ClassSelect
                                        value={classFilter}
                                        onChange={(val) => setClassFilter(val as string | number)}
                                        classes={classSelectOptions}
                                        label="Filter by Class"
                                        placeholder="All Classes"
                                        showAllOption
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>

            {/* ── Student Content ── */}
            {isLoading ? (
                <LoadingSkeleton viewMode={viewMode} />
            ) : filteredStudents.length === 0 ? (
                <EmptyState
                    hasFilters={!!hasActiveFilters}
                    onClear={handleClearFilters}
                    onAdmit={() => navigate('admission')}
                />
            ) : viewMode === 'list' ? (
                <StudentTable
                    students={filteredStudents}
                    classes={classes}
                    academicYears={academicYears?.data || []}
                    onView={(id) => navigate(id)}
                    onEnroll={(id) => navigate(`enrollment?studentId=${id}`)}
                />
            ) : (
                <StudentGrid
                    students={filteredStudents}
                    classes={classes}
                    onView={(id) => navigate(id)}
                />
            )}
        </div>
    );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface StatsBlockProps {
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    value: number;
}

function StatsBlock({ icon, iconBg, iconColor, label, value }: StatsBlockProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            <Card className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className={`p-3 rounded-xl ${iconBg} ${iconColor}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <h3 className="text-2xl font-bold">{value}</h3>
                </div>
            </Card>
        </motion.div>
    );
}

// ── Student Table (List View) ──

interface StudentTableProps {
    students: StudentRecord[];
    classes: Array<{ id: string; name: string; sections?: Array<{ id: string; name: string }> }>;
    academicYears: Array<{ id: string; name: string }>;
    onView: (id: string) => void;
    onEnroll: (id: string) => void;
}

function StudentTable({ students, classes, academicYears, onView, onEnroll }: StudentTableProps) {
    return (
        <Card className="overflow-hidden border-none shadow-premium bg-background/50 backdrop-blur-sm" padding="none">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-muted/30 border-b border-border/50">
                            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Adm No</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Roll No</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Class / Section</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence mode="popLayout">
                            {students.map((student, idx) => {
                                const enrollment = getLatestEnrollment(student);
                                const cls = classes.find(c => c.id === enrollment?.class_id);
                                const section = cls?.sections?.find(s => s.id === enrollment?.section_id);
                                const academicYear = academicYears.find(y => y.id === enrollment?.academic_year_id);

                                return (
                                    <motion.tr
                                        key={student.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2, delay: idx * 0.02 }}
                                        className="group hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0 cursor-pointer"
                                        onClick={() => onView(student.id)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    name={`${student.user?.first_name} ${student.user?.last_name}`}
                                                    className="h-10 w-10 border-2 border-background shadow-sm"
                                                />
                                                <div>
                                                    <div className="text-sm font-semibold group-hover:text-primary transition-colors">
                                                        {student.user?.first_name} {student.user?.last_name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground capitalize">{student.gender}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge variant="outline" className="font-mono text-xs">
                                                {student.admission_number}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-medium bg-primary/5 px-2 py-0.5 rounded">
                                                {enrollment?.roll_number || student.roll_number || '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {enrollment ? (
                                                <div>
                                                    <div className="text-sm font-medium">{cls?.name || 'N/A'}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {section?.name ? `Section ${section.name}` : '—'}
                                                        {academicYear && <span className="ml-2 text-primary/70">• {academicYear.name}</span>}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">Not Enrolled</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="space-y-0.5">
                                                {student.user?.email && (
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Mail size={12} className="shrink-0" />
                                                        <span className="truncate max-w-[150px]">{student.user.email}</span>
                                                    </div>
                                                )}
                                                {student.user?.phone && (
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Phone size={12} className="shrink-0" />
                                                        <span>{student.user.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge variant={student.is_active ? 'success' : 'outline'}>
                                                {student.is_active ? 'Active' : 'Alumni'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View Profile" onClick={() => onView(student.id)}>
                                                    <Eye size={15} />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="New Enrollment" onClick={() => onEnroll(student.id)}>
                                                    <UserPlus size={15} />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit">
                                                    <Edit2 size={15} />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50" title="Archive">
                                                    <Trash2 size={15} />
                                                </Button>
                                            </div>
                                            <div className="group-hover:hidden">
                                                <ChevronRight size={16} className="text-muted-foreground" />
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

// ── Student Grid (Card View) ──

interface StudentGridProps {
    students: StudentRecord[];
    classes: Array<{ id: string; name: string; sections?: Array<{ id: string; name: string }> }>;
    onView: (id: string) => void;
}

function StudentGrid({ students, classes, onView }: StudentGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
                {students.map((student, idx) => {
                    const enrollment = getLatestEnrollment(student);
                    const cls = classes.find(c => c.id === enrollment?.class_id);
                    const sec = cls?.sections?.find(s => s.id === enrollment?.section_id);

                    return (
                        <motion.div
                            key={student.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2, delay: idx * 0.04 }}
                        >
                            <Card
                                className="group p-5 hover:shadow-xl transition-all duration-300 border-none bg-gradient-to-br from-card to-muted/20 cursor-pointer relative overflow-hidden"
                                onClick={() => onView(student.id)}
                            >
                                {/* Top decorative gradient */}
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar
                                            name={`${student.user?.first_name} ${student.user?.last_name}`}
                                            className="h-14 w-14 ring-4 ring-background shadow-lg"
                                        />
                                        <div>
                                            <h4 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                                                {student.user?.first_name} {student.user?.last_name}
                                            </h4>
                                            <p className="text-sm text-emerald-600 font-medium">
                                                Adm: {student.admission_number}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant={student.is_active ? 'success' : 'outline'} className="rounded-full px-2.5">
                                        {student.is_active ? 'Active' : 'Alumni'}
                                    </Badge>
                                </div>

                                <div className="space-y-2.5 pt-2">
                                    {/* Class / Section */}
                                    <div className="flex items-center justify-between text-sm py-2 px-3 bg-background/50 rounded-lg">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <School size={14} /> Class
                                        </span>
                                        <span className="font-semibold text-blue-600">
                                            {enrollment ? `${cls?.name || 'N/A'}${sec ? ` - ${sec.name}` : ''}` : 'Not Enrolled'}
                                        </span>
                                    </div>

                                    {/* Roll Number */}
                                    <div className="flex items-center justify-between text-sm py-2 px-3 bg-background/50 rounded-lg">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <Hash size={14} /> Roll No
                                        </span>
                                        <span className="font-semibold">
                                            {enrollment?.roll_number || student.roll_number || '—'}
                                        </span>
                                    </div>

                                    {/* Contact Info */}
                                    <div className="flex flex-col gap-1.5 pt-1">
                                        {student.user?.email && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Mail size={14} className="text-primary/70 shrink-0" />
                                                <span className="truncate">{student.user.email}</span>
                                            </div>
                                        )}
                                        {student.user?.phone && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Phone size={14} className="text-primary/70 shrink-0" />
                                                {student.user.phone}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="mt-5 flex items-center justify-end border-t border-border/50 pt-4">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-xs font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-all gap-1.5"
                                        onClick={(e) => { e.stopPropagation(); onView(student.id); }}
                                    >
                                        View Profile
                                        <ChevronRight size={14} />
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}

// ── Loading Skeleton ──

function LoadingSkeleton({ viewMode }: { viewMode: 'list' | 'grid' }) {
    if (viewMode === 'list') {
        return (
            <Card className="overflow-hidden" padding="none">
                <div className="divide-y divide-border/50">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-6 py-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                    ))}
                </div>
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="p-5 space-y-4">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-14 w-14 rounded-full" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                    </div>
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-8 w-full rounded-lg" />
                </Card>
            ))}
        </div>
    );
}

// ── Empty State ──

interface EmptyStateProps {
    hasFilters: boolean;
    onClear: () => void;
    onAdmit: () => void;
}

function EmptyState({ hasFilters, onClear, onAdmit }: EmptyStateProps) {
    return (
        <Card className="p-12 flex flex-col items-center justify-center text-center">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4 }}
            >
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-4 mx-auto">
                    <GraduationCap size={40} className="text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No Students Found</h3>
                <p className="text-muted-foreground max-w-xs mb-6 mx-auto mt-2">
                    {hasFilters
                        ? 'No students match your filter criteria. Try adjusting your search or filters.'
                        : 'Get started by admitting your first student to the school.'}
                </p>
                {hasFilters ? (
                    <Button variant="outline" onClick={onClear}>
                        <X size={16} className="mr-2" /> Clear Filters
                    </Button>
                ) : (
                    <Button onClick={onAdmit}>
                        <Plus size={16} className="mr-2" /> Start Admission
                    </Button>
                )}
            </motion.div>
        </Card>
    );
}
