// ============================================================================
// User Management Page - Admin Portal
// Modern UI with animations, lazy loading, and theme integration
// ============================================================================

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, UserPlus, GraduationCap, BookOpen, Briefcase,
    UserCheck, Search, Filter, MoreVertical, Eye,
    UserX, Shield, RefreshCw,
    ChevronDown, Check, AlertCircle
} from 'lucide-react';
import {
    Card,
    CardContent,
    Button,
    Modal,
    ModalFooter,
    Table,
    Badge,
    Avatar,
    Tooltip,
} from '@erp/common';
import type { Column } from '@erp/common';
import {
    userManagementApi,
    USER_TYPES,
    type User,
    type UserType,
    type CreateUserData
} from '../../../../api/userManagementApi';
import { formatApiError } from '@/common/services/apiHelpers';

// ============================================================================
// Animation Variants
// ============================================================================

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
};

const slideInVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
};

// ============================================================================
// User Type Configuration
// ============================================================================

const USER_TYPE_CONFIG: Record<UserType, {
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    description: string;
}> = {
    [USER_TYPES.ADMIN]: {
        label: 'Admin',
        icon: Shield,
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        description: 'Full system access'
    },
    [USER_TYPES.TEACHER]: {
        label: 'Teacher',
        icon: GraduationCap,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        description: 'Manage classes & students'
    },
    [USER_TYPES.STUDENT]: {
        label: 'Student',
        icon: BookOpen,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        description: 'Access courses & grades'
    },
    [USER_TYPES.STAFF]: {
        label: 'Staff',
        icon: Briefcase,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        description: 'Administrative tasks'
    },
    [USER_TYPES.PARENT]: {
        label: 'Parent',
        icon: UserCheck,
        color: 'text-pink-600 dark:text-pink-400',
        bgColor: 'bg-pink-100 dark:bg-pink-900/30',
        description: 'Monitor student progress'
    }
};

// ============================================================================
// Components
// ============================================================================

// User Type Selector Card
function UserTypeCard({
    type,
    selected,
    onClick
}: {
    type: UserType;
    selected: boolean;
    onClick: () => void;
}) {
    const config = USER_TYPE_CONFIG[type];
    const Icon = config.icon;

    return (
        <motion.button
            onClick={onClick}
            className={`
                relative p-4 rounded-xl border-2 transition-all duration-200 text-left w-full
                ${selected
                    ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                    : 'border-border hover:border-primary/50 hover:bg-surface-hover'
                }
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            {selected && (
                <motion.div
                    className="absolute top-2 right-2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                >
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                    </div>
                </motion.div>
            )}
            <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <h3 className="font-semibold text-text">{config.label}</h3>
            <p className="text-xs text-text-muted mt-1">{config.description}</p>
        </motion.button>
    );
}

// Stats Card
function StatsCard({
    icon: Icon,
    label,
    value,
    color,
    trend
}: {
    icon: React.ElementType;
    label: string;
    value: number;
    color: string;
    trend?: { value: number; positive: boolean };
}) {
    return (
        <motion.div variants={itemVariants}>
            <Card variant="elevated" hover className="relative overflow-hidden">
                <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm text-text-muted">{label}</p>
                            <motion.p
                                className="text-2xl font-bold text-text mt-1"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={value}
                            >
                                {value.toLocaleString()}
                            </motion.p>
                            {trend && (
                                <p className={`text-xs mt-1 ${trend.positive ? 'text-success' : 'text-error'}`}>
                                    {trend.positive ? '+' : ''}{trend.value}% this month
                                </p>
                            )}
                        </div>
                        <div className={`w-12 h-12 rounded-xl ${color} bg-opacity-10 flex items-center justify-center`}>
                            <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
                        </div>
                    </div>
                    {/* Decorative gradient */}
                    <div className={`absolute bottom-0 left-0 right-0 h-1 ${color}`} />
                </CardContent>
            </Card>
        </motion.div>
    );
}

// Create User Modal
function CreateUserModal({
    isOpen,
    onClose,
    onSuccess
}: {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [step, setStep] = useState(1);
    const [selectedType, setSelectedType] = useState<UserType | null>(null);
    const [formData, setFormData] = useState<CreateUserData>({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<{ email: string; message?: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!selectedType) return;

        setIsSubmitting(true);
        setError(null);

        try {
            let response;
            switch (selectedType) {
                case 'teacher':
                    response = await userManagementApi.createTeacher(formData);
                    break;
                case 'student':
                    response = await userManagementApi.createStudent(formData);
                    break;
                case 'staff':
                    response = await userManagementApi.createStaff(formData);
                    break;
                case 'parent':
                    response = await userManagementApi.createParent(formData);
                    break;
                default:
                    throw new Error('Invalid user type');
            }

            setResult({
                email: response.data.user.email,
                message: response.data.message,
            });
            setStep(3);
            onSuccess();
        } catch (err) {
            setError(formatApiError(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setSelectedType(null);
        setFormData({ email: '', firstName: '', lastName: '', phone: '' });
        setResult(null);
        setError(null);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={step === 3 ? "User Created Successfully" : "Create New User"}
            description={step === 1 ? "Select the type of user to create" : step === 2 ? "Enter user details" : undefined}
            size="lg"
        >
            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={containerVariants}
                        className="grid grid-cols-2 gap-3"
                    >
                        {(['teacher', 'student', 'staff', 'parent'] as UserType[]).map((type) => (
                            <motion.div key={type} variants={itemVariants}>
                                <UserTypeCard
                                    type={type}
                                    selected={selectedType === type}
                                    onClick={() => setSelectedType(type)}
                                />
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div
                        key="step2"
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={containerVariants}
                        className="space-y-4"
                    >
                        {/* Selected type indicator */}
                        {selectedType && (
                            <motion.div variants={itemVariants} className="flex items-center gap-2 p-3 rounded-lg bg-surface-hover">
                                {(() => {
                                    const config = USER_TYPE_CONFIG[selectedType];
                                    const Icon = config.icon;
                                    return (
                                        <>
                                            <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                                                <Icon className={`w-4 h-4 ${config.color}`} />
                                            </div>
                                            <span className="text-sm font-medium text-text">Creating {config.label}</span>
                                        </>
                                    );
                                })()}
                            </motion.div>
                        )}

                        {error && (
                            <motion.div
                                variants={itemVariants}
                                className="flex items-center gap-2 p-3 rounded-lg bg-error/10 text-error"
                            >
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-sm">{error}</span>
                            </motion.div>
                        )}

                        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text mb-1.5">First Name</label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    placeholder="John"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text mb-1.5">Last Name</label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                    placeholder="Doe"
                                />
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <label className="block text-sm font-medium text-text mb-1.5">Email Address</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                placeholder="john.doe@school.edu"
                            />
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <label className="block text-sm font-medium text-text mb-1.5">Phone (Optional)</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                placeholder="+1 (555) 000-0000"
                            />
                        </motion.div>
                    </motion.div>
                )}

                {step === 3 && result && (
                    <motion.div
                        key="step3"
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                        className="text-center space-y-4"
                    >
                        <motion.div
                            variants={itemVariants}
                            className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto"
                        >
                            <Check className="w-8 h-8 text-success" />
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <p className="text-text-muted mb-4">
                                User has been created successfully.
                            </p>

                            <div className="bg-surface-hover rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-text-muted">Email:</span>
                                    <span className="text-sm font-medium text-text">{result.email}</span>
                                </div>
                            </div>

                            <p className="text-xs text-warning mt-3 flex items-center justify-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Credentials are handled through secure identity flow. Ask user to complete sign-in setup.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <ModalFooter>
                {step === 1 && (
                    <>
                        <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                        <Button
                            onClick={() => setStep(2)}
                            disabled={!selectedType}
                            rightIcon={<ChevronDown className="w-4 h-4 rotate-[-90deg]" />}
                        >
                            Continue
                        </Button>
                    </>
                )}
                {step === 2 && (
                    <>
                        <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                        <Button
                            onClick={handleSubmit}
                            isLoading={isSubmitting}
                            disabled={!formData.email || !formData.firstName || !formData.lastName}
                            leftIcon={<UserPlus className="w-4 h-4" />}
                        >
                            Create User
                        </Button>
                    </>
                )}
                {step === 3 && (
                    <Button onClick={handleClose}>Done</Button>
                )}
            </ModalFooter>
        </Modal>
    );
}

// User Table Row Actions
function UserRowActions({
    user,
    onDeactivate,
    onViewDetails
}: {
    user: User;
    onDeactivate: (user: User) => void;
    onViewDetails: (user: User) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="!p-1.5"
            >
                <MoreVertical className="w-4 h-4" />
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-0 top-8 z-20 w-48 bg-surface border border-border rounded-lg shadow-lg overflow-hidden"
                        >
                            <button
                                className="w-full px-4 py-2.5 text-left text-sm text-text hover:bg-surface-hover flex items-center gap-2 transition-colors"
                                onClick={() => { onViewDetails(user); setIsOpen(false); }}
                            >
                                <Eye className="w-4 h-4" />
                                View Details
                            </button>
                            <button
                                className="w-full px-4 py-2.5 text-left text-sm text-error hover:bg-error/10 flex items-center gap-2 transition-colors"
                                onClick={() => { onDeactivate(user); setIsOpen(false); }}
                            >
                                <UserX className="w-4 h-4" />
                                Deactivate
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export default function UsersPage() {
    // State
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<UserType | 'all'>('all');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

    // Fetch users
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await userManagementApi.listUsers({
                userType: filterType !== 'all' ? filterType : undefined,
                page: pagination.page,
                limit: pagination.limit,
            });
            setUsers(response.data);
            setPagination(prev => ({ ...prev, ...response.pagination }));
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    }, [filterType, pagination.page, pagination.limit]);

    // Initial fetch
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Filter users by search
    const filteredUsers = useMemo(() => {
        if (!searchQuery) return users;
        const query = searchQuery.toLowerCase();
        return users.filter(user =>
            user.email.toLowerCase().includes(query) ||
            user.first_name.toLowerCase().includes(query) ||
            user.last_name.toLowerCase().includes(query)
        );
    }, [users, searchQuery]);

    // Table columns
    const columns: Column<User>[] = useMemo(() => [
        {
            key: 'name',
            header: 'User',
            render: (user) => (
                <div className="flex items-center gap-3">
                    <Avatar
                        name={`${user.first_name} ${user.last_name}`}
                        size="sm"
                    />
                    <div>
                        <p className="font-medium text-text">{user.first_name} {user.last_name}</p>
                        <p className="text-xs text-text-muted">{user.email}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'user_type',
            header: 'Role',
            sortable: true,
            render: (user) => {
                const config = USER_TYPE_CONFIG[user.user_type];
                const Icon = config?.icon || Users;
                return (
                    <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded ${config?.bgColor || 'bg-gray-100'} flex items-center justify-center`}>
                            <Icon className={`w-3.5 h-3.5 ${config?.color || 'text-gray-500'}`} />
                        </div>
                        <span className="text-sm capitalize">{user.user_type}</span>
                    </div>
                );
            }
        },
        {
            key: 'is_active',
            header: 'Status',
            render: (user) => (
                <Badge variant={user.is_active ? 'success' : 'danger'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
            )
        },
        {
            key: 'created_at',
            header: 'Created',
            sortable: true,
            render: (user) => (
                <span className="text-sm text-text-muted">
                    {new Date(user.created_at).toLocaleDateString()}
                </span>
            )
        },
        {
            key: 'actions',
            header: '',
            width: '60px',
            render: (user) => (
                <UserRowActions
                    user={user}
                    onViewDetails={(u) => console.log('View', u)}
                    onDeactivate={(u) => console.log('Deactivate', u)}
                />
            )
        }
    ], []);

    // Stats
    const stats = useMemo(() => {
        const byType = users.reduce((acc, user) => {
            acc[user.user_type] = (acc[user.user_type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            total: users.length,
            teachers: byType.teacher || 0,
            students: byType.student || 0,
            staff: byType.staff || 0,
        };
    }, [users]);

    return (
        <motion.div
            className="space-y-6"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            {/* Header */}
            <motion.div
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                variants={itemVariants}
            >
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
                        <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text">User Management</h1>
                        <p className="text-sm text-text-muted">Manage teachers, students, and staff accounts</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Tooltip content="Refresh list">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchUsers}
                            leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
                        >
                            Refresh
                        </Button>
                    </Tooltip>
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        leftIcon={<UserPlus className="w-4 h-4" />}
                    >
                        Add User
                    </Button>
                </div>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                variants={containerVariants}
            >
                <StatsCard icon={Users} label="Total Users" value={stats.total} color="bg-primary" />
                <StatsCard icon={GraduationCap} label="Teachers" value={stats.teachers} color="bg-blue-500" />
                <StatsCard icon={BookOpen} label="Students" value={stats.students} color="bg-green-500" />
                <StatsCard icon={Briefcase} label="Staff" value={stats.staff} color="bg-orange-500" />
            </motion.div>

            {/* Filters */}
            <motion.div variants={itemVariants}>
                <Card variant="default">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input
                                    type="text"
                                    placeholder="Search users by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                />
                            </div>

                            {/* Type Filter */}
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value as UserType | 'all')}
                                    className="pl-10 pr-10 py-2.5 rounded-lg border border-border bg-surface text-text appearance-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all cursor-pointer"
                                >
                                    <option value="all">All Types</option>
                                    <option value="teacher">Teachers</option>
                                    <option value="student">Students</option>
                                    <option value="staff">Staff</option>
                                    <option value="parent">Parents</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Users Table */}
            <motion.div variants={itemVariants}>
                <Table<User>
                    data={filteredUsers}
                    columns={columns}
                    keyExtractor={(user) => user.id}
                    loading={loading}
                    emptyMessage="No users found. Click 'Add User' to create one."
                />
            </motion.div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <motion.div
                    variants={itemVariants}
                    className="flex items-center justify-between text-sm text-text-muted"
                >
                    <span>
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={pagination.page === 1}
                            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={pagination.page === pagination.totalPages}
                            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                        >
                            Next
                        </Button>
                    </div>
                </motion.div>
            )}

            {/* Create User Modal */}
            <CreateUserModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchUsers}
            />
        </motion.div>
    );
}
