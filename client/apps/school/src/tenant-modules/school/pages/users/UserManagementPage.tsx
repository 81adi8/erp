import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Search,
    Plus,
    Filter,
    Edit3,
    Trash2,
    Mail,
    Phone,
    UserCheck,
    UserX,
    Users,
    TrendingUp,
    X,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Eye,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
    Card,
    Button,
    Input,
    Badge,
    Modal,
    ModalFooter,
    LoadingSpinner,
    PageHeader,
    StatsCard,
    Skeleton,
    Avatar,
    useDebounce,
} from '@erp/common';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePermissions } from '../../../../core/hooks/usePermissions';
import { userManagementApi, USER_TYPES, type User, type UserType, type CreateUserData } from '../../api/userManagementApi';
import { rbacApi, type Role } from '../../api/rbacApi';
import { formatApiError } from '@/common/services/apiHelpers';
import { createUserSchema, type CreateUserFormData } from '@/core/validation/schemas';

// ============================================================================
// Types
// ============================================================================

export interface UserManagementPageProps {
    userType: UserType;
    title: string;
    description: string;
    icon: LucideIcon;
    iconColor?: string;
    iconBg?: string;
    permissionPrefix: string;
    customFields?: React.ReactNode;
    onUserCreated?: (user: User) => void;
}

interface UserStats {
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
}

// ============================================================================
// Helper Components
// ============================================================================

const TableSkeleton: React.FC = () => (
    <>
        {[...Array(5)].map((_, i) => (
            <tr key={i} className="border-b border-border/50">
                <td className="p-4"><Skeleton className="h-10 w-10 rounded-full" /></td>
                <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                <td className="p-4"><Skeleton className="h-4 w-40" /></td>
                <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                <td className="p-4"><Skeleton className="h-6 w-16" /></td>
                <td className="p-4"><Skeleton className="h-8 w-20" /></td>
            </tr>
        ))}
    </>
);

const EmptyState: React.FC<{ userType: string; onAdd?: () => void }> = ({ userType, onAdd }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
    >
        <div className="p-4 rounded-full bg-muted/50 mb-4">
            <Users size={40} className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No {userType}s Found</h3>
        <p className="text-muted-foreground text-sm mb-4 max-w-sm">
            Get started by adding your first {userType.toLowerCase()}.
        </p>
        {onAdd && (
            <Button onClick={onAdd}>
                <Plus size={16} className="mr-2" />
                Add {userType}
            </Button>
        )}
    </motion.div>
);

// ============================================================================
// Main Component
// ============================================================================

export const UserManagementPage: React.FC<UserManagementPageProps> = ({
    userType,
    title,
    description,
    icon,
    iconColor = 'text-primary',
    iconBg = 'bg-primary/10',
    permissionPrefix,
    customFields,
    onUserCreated,
}) => {
    // Permissions
    const { hasPermission, isAdmin } = usePermissions();
    const canView = isAdmin || hasPermission(`${permissionPrefix}.view`);
    const canCreate = isAdmin || hasPermission(`${permissionPrefix}.create`);
    const canEdit = isAdmin || hasPermission(`${permissionPrefix}.edit`);
    const canDelete = isAdmin || hasPermission(`${permissionPrefix}.delete`);

    // State
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const searchTerm = useDebounce(searchInput, 300);
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [stats, setStats] = useState<UserStats>({ total: 0, active: 0, inactive: 0, byRole: {} });

    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdUserResult, setCreatedUserResult] = useState<{ email: string; message?: string } | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors: formErrors, isSubmitting: isFormSubmitting },
    } = useForm<CreateUserFormData>({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            email: '',
            firstName: '',
            lastName: '',
            phone: '',
            roleId: '',
        },
    });

    // Roles state
    const [roles, setRoles] = useState<Role[]>([]);
    const [loadingRoles, setLoadingRoles] = useState(false);

    // Fetch roles when modal opens
    useEffect(() => {
        if (isCreateModalOpen && roles.length === 0) {
            setLoadingRoles(true);
            rbacApi.listRoles(true)
                .then(response => {
                    if (response.success) {
                        setRoles(response.data);
                    }
                })
                .catch(err => console.error('Failed to fetch roles:', err))
                .finally(() => setLoadingRoles(false));
        }
    }, [isCreateModalOpen, roles.length]);

    // Fetch users
    const fetchUsers = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const [listResponse, statsResponse] = await Promise.all([
                userManagementApi.listUsers({
                    userType,
                    search: searchTerm || undefined,
                    status: statusFilter,
                    page,
                    limit: 10,
                }),
                userManagementApi.getUserStats({ userType }),
            ]);

            setUsers(listResponse.data);
            setTotalPages(listResponse.pagination.totalPages);
            setStats({
                total: statsResponse.data.total,
                active: statsResponse.data.active,
                inactive: statsResponse.data.inactive,
                byRole: statsResponse.data.byRole || {},
            });
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userType, statusFilter, searchTerm, page]);

    useEffect(() => {
        if (canView) {
            fetchUsers();
        }
    }, [canView, fetchUsers]);

    // Handlers
    const handleCreateUser = async (newUser: CreateUserFormData) => {
        setIsSubmitting(true);

        try {
            let response;
            const payload: CreateUserData = {
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                phone: newUser.phone || undefined,
                roleId: newUser.roleId || undefined,
            };
            switch (userType) {
                case USER_TYPES.TEACHER:
                    response = await userManagementApi.createTeacher(payload);
                    break;
                case USER_TYPES.STUDENT:
                    response = await userManagementApi.createStudent(payload);
                    break;
                case USER_TYPES.STAFF:
                    response = await userManagementApi.createStaff(payload);
                    break;
                case USER_TYPES.PARENT:
                    response = await userManagementApi.createParent(payload);
                    break;
                default:
                    throw new Error('Invalid user type');
            }

            setCreatedUserResult({
                email: response.data.user.email,
                message: response.data.message,
            });
            reset({
                email: '',
                firstName: '',
                lastName: '',
                phone: '',
                roleId: '',
            });
            fetchUsers(true);
            onUserCreated?.(response.data.user as unknown as User);
        } catch (error) {
            console.error('Failed to create user:', error);
            alert(formatApiError(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeactivateUser = async (userId: string) => {
        if (!window.confirm('Are you sure you want to deactivate this user?')) return;

        try {
            await userManagementApi.deactivateUser(userId);
            fetchUsers(true);
        } catch (error) {
            console.error('Failed to deactivate user:', error);
        }
    };

    // Permission denied
    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="p-4 rounded-full bg-rose-500/10 mb-4">
                    <UserX size={40} className="text-rose-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
                <p className="text-muted-foreground">You don't have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <PageHeader
                icon={icon}
                iconColor={iconColor}
                iconBg={iconBg}
                title={title}
                description={description}
                actions={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchUsers(true)}
                            disabled={refreshing}
                            title="Refresh"
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        </Button>
                        {canCreate && (
                            <Button onClick={() => setIsCreateModalOpen(true)}>
                                <Plus size={16} className="mr-2" />
                                Add {title.replace(/s$/, '')}
                            </Button>
                        )}
                    </div>
                }
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard
                    icon={<Users size={20} />}
                    title={`Total ${title}`}
                    value={stats.total}
                    variant="primary"
                />
                <StatsCard
                    icon={<UserCheck size={20} />}
                    title="Active"
                    value={stats.active}
                    variant="success"
                />
                <StatsCard
                    icon={<UserX size={20} />}
                    title="Inactive"
                    value={stats.inactive}
                    variant="warning"
                />
                <StatsCard
                    icon={<TrendingUp size={20} />}
                    title="Role Types"
                    value={Object.keys(stats.byRole).length}
                    variant="primary"
                />
            </div>

            {/* Search and Filters */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <Input
                            placeholder={`Search ${title.toLowerCase()}...`}
                            value={searchInput}
                            onChange={(e) => {
                                setSearchInput(e.target.value);
                                setPage(1);
                            }}
                            className="pl-10"
                        />
                        {searchInput && (
                            <button
                                onClick={() => {
                                    setSearchInput('');
                                    setPage(1);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
                            >
                                <X size={14} className="text-muted-foreground" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-muted-foreground" />
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value as 'all' | 'active' | 'inactive');
                                setPage(1);
                            }}
                            className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Users Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/30 border-b border-border">
                            <tr>
                                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider w-12"></th>
                                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Name</th>
                                {(userType === USER_TYPES.TEACHER || userType === USER_TYPES.STAFF) && (
                                    <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Code</th>
                                )}
                                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Email</th>
                                {(userType === USER_TYPES.TEACHER || userType === USER_TYPES.STAFF) && (
                                    <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Designation</th>
                                )}
                                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Phone</th>
                                <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                                <th className="p-4 text-right text-xs font-semibold uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton />
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6}>
                                        <EmptyState
                                            userType={title.replace(/s$/, '')}
                                            onAdd={canCreate ? () => setIsCreateModalOpen(true) : undefined}
                                        />
                                    </td>
                                </tr>
                            ) : (
                                users.map((user, index) => (
                                    <motion.tr
                                        key={user.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                                    >
                                        <td className="p-4">
                                            <Avatar
                                                name={`${user.first_name} ${user.last_name}`}
                                                size="sm"
                                            />
                                        </td>
                                        <td className="p-4 font-medium">
                                            {user.first_name} {user.last_name}
                                        </td>
                                        {(userType === USER_TYPES.TEACHER || userType === USER_TYPES.STAFF) && (
                                            <td className="p-4">
                                                <Badge variant="outline" className="font-mono text-[10px]">
                                                    {String(user.metadata?.employeeId || user.metadata?.employee_code || '—')}
                                                </Badge>
                                            </td>
                                        )}
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Mail size={14} />
                                                <span className="truncate max-w-[150px]">{user.email}</span>
                                            </div>
                                        </td>
                                        {(userType === USER_TYPES.TEACHER || userType === USER_TYPES.STAFF) && (
                                            <td className="p-4">
                                                <span className="text-sm font-medium">
                                                    {String(user.metadata?.designation || (userType === USER_TYPES.TEACHER ? 'Teacher' : 'Staff'))}
                                                </span>
                                            </td>
                                        )}
                                        <td className="p-4 hidden md:table-cell">
                                            {user.phone ? (
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Phone size={14} />
                                                    {user.phone}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground/50">—</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <Badge variant={user.is_active ? 'default' : 'outline'}>
                                                {user.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="sm" title="View">
                                                    <Eye size={16} />
                                                </Button>
                                                {canEdit && (
                                                    <Button variant="ghost" size="sm" title="Edit">
                                                        <Edit3 size={16} />
                                                    </Button>
                                                )}
                                                {canDelete && user.is_active && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        title="Deactivate"
                                                        onClick={() => handleDeactivateUser(user.id)}
                                                    >
                                                        <Trash2 size={16} className="text-rose-500" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                        <span className="text-sm text-muted-foreground">
                            Page {page} of {totalPages}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft size={16} className="mr-1" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                Next
                                <ChevronRight size={16} className="ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Create User Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setCreatedUserResult(null);
                }}
                title={createdUserResult ? 'User Created Successfully' : `Add New ${title.replace(/s$/, '')}`}
                size="md"
            >
                {createdUserResult ? (
                    <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-2">
                                User has been created successfully.
                            </p>
                            <div className="bg-background p-3 rounded-md font-mono text-sm">
                                <p><strong>Email:</strong> {createdUserResult.email}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Credentials are managed through secure identity flow. Ask user to complete password setup/sign-in via approved auth path.
                            </p>
                        </div>
                        <ModalFooter>
                            <Button onClick={() => {
                                setIsCreateModalOpen(false);
                                setCreatedUserResult(null);
                            }}>
                                Done
                            </Button>
                        </ModalFooter>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(handleCreateUser)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">First Name *</label>
                                <Input
                                    {...register('firstName')}
                                    placeholder="John"
                                    error={formErrors.firstName?.message}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Last Name *</label>
                                <Input
                                    {...register('lastName')}
                                    placeholder="Doe"
                                    error={formErrors.lastName?.message}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Email *</label>
                            <Input
                                type="email"
                                {...register('email')}
                                placeholder="john.doe@example.com"
                                error={formErrors.email?.message}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Phone</label>
                            <Input
                                type="tel"
                                {...register('phone')}
                                placeholder="+91 9876543210"
                                error={formErrors.phone?.message}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Assign Role
                                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                            </label>
                            <select
                                {...register('roleId')}
                                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                                disabled={loadingRoles}
                            >
                                <option value="">No role assigned</option>
                                {roles.map(role => (
                                    <option key={role.id} value={role.id}>
                                        {role.name} ({role.permissions?.length || 0} permissions)
                                    </option>
                                ))}
                            </select>
                            {watch('roleId') && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    User will inherit all permissions from this role
                                </p>
                            )}
                        </div>
                        {customFields}
                        <ModalFooter>
                            <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting || isFormSubmitting || isLoading}>
                                {isSubmitting || isFormSubmitting || isLoading ? (
                                    <>
                                        <LoadingSpinner size="sm" className="mr-2" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={16} className="mr-2" />
                                        Create {title.replace(/s$/, '')}
                                    </>
                                )}
                            </Button>
                        </ModalFooter>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default UserManagementPage;
