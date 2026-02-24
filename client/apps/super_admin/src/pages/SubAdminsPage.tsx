import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Search,
    LayoutGrid,
    LayoutList,
    UserPlus,
    Users,
    UserCog,
    Shield,
    Edit,
    Trash2,
    Eye,
    Calendar,
    Mail,
    Clock,
    X,
    Check,
    AlertCircle,
} from 'lucide-react';
import {
    Button,
    Input,
    AnimatedInput,
    Badge,
    Card,
    Table,
    Modal,
    ModalFooter,
    Select,
    Tooltip,
    Avatar,
    type Column,
} from '@erp/common';
import { StatsCard } from '@erp/common';
import {
    type SubAdmin,
    type SubAdminType,
    type CreateSubAdminRequest,
    PERMISSION_CATEGORIES,
} from '../services';

type ViewMode = 'table' | 'card';

// Mock data for development
const mockSubAdmins: SubAdmin[] = [
    {
        id: '1',
        name: 'Rahul Sharma',
        email: 'rahul.sharma@schoolerp.com',
        type: 'sub_admin',
        role: 'Manager',
        status: 'active',
        permissions: { view_users: true, create_users: true, edit_users: true, view_institutions: true },
        valid_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'admin',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        last_login_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: '2',
        name: 'Priya Patel',
        email: 'priya.patel@schoolerp.com',
        type: 'staff',
        role: 'Support',
        status: 'active',
        permissions: { view_users: true, view_institutions: true, view_reports: true },
        valid_at: null,
        valid_until: null,
        created_by: 'admin',
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '3',
        name: 'Amit Kumar',
        email: 'amit.kumar@schoolerp.com',
        type: 'team',
        role: 'Developer',
        status: 'inactive',
        permissions: { view_settings: true, edit_settings: true },
        valid_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        valid_until: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'admin',
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '4',
        name: 'Sneha Gupta',
        email: 'sneha.gupta@schoolerp.com',
        type: 'sub_admin',
        role: 'Operations',
        status: 'expired',
        permissions: { view_billing: true, manage_billing: true, view_reports: true },
        valid_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        valid_until: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'admin',
        created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
    },
];

const typeLabels: Record<SubAdminType, string> = {
    sub_admin: 'Sub Admin',
    staff: 'Staff',
    team: 'Team',
};

const typeIcons: Record<SubAdminType, React.ReactNode> = {
    sub_admin: <UserCog className="w-4 h-4" />,
    staff: <Users className="w-4 h-4" />,
    team: <Shield className="w-4 h-4" />,
};

const statusVariants: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    active: 'success',
    inactive: 'warning',
    expired: 'error',
};

// User Card Component
const UserCard: React.FC<{
    user: SubAdmin;
    onEdit: (user: SubAdmin) => void;
    onDelete: (user: SubAdmin) => void;
    onViewPolicy: (user: SubAdmin) => void;
}> = ({ user, onEdit, onDelete, onViewPolicy }) => (
    <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
    >
        <Card hover className="h-full">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Avatar name={user.name} size="lg" status={user.status === 'active' ? 'online' : 'offline'} />
                    <div>
                        <h3 className="font-semibold text-text">{user.name}</h3>
                        <p className="text-sm text-text-muted flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                        </p>
                    </div>
                </div>
                <Badge variant={statusVariants[user.status] || 'default'}>
                    {user.status}
                </Badge>
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                        {typeIcons[user.type]}
                        {typeLabels[user.type]}
                    </Badge>
                    <Badge variant="info">{user.role}</Badge>
                </div>

                {user.valid_until && (
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <Calendar className="w-4 h-4" />
                        Valid until {new Date(user.valid_until).toLocaleDateString()}
                    </div>
                )}

                <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Clock className="w-4 h-4" />
                    {user.last_login_at
                        ? `Last login: ${new Date(user.last_login_at).toLocaleDateString()}`
                        : 'Never logged in'
                    }
                </div>
            </div>

            <Tooltip
                content={
                    <div className="max-w-xs">
                        <p className="font-medium mb-1">Permissions ({Object.keys(user.permissions).length})</p>
                        <div className="flex flex-wrap gap-1">
                            {Object.entries(user.permissions)
                                .filter(([, v]) => v)
                                .map(([key]) => (
                                    <span key={key} className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                                        {key.replace(/_/g, ' ')}
                                    </span>
                                ))
                            }
                        </div>
                    </div>
                }
                position="top"
            >
                <Badge variant="outline" className="cursor-help mb-4">
                    {Object.values(user.permissions).filter(Boolean).length} permissions
                </Badge>
            </Tooltip>

            <div className="flex items-center gap-2 pt-4 border-t border-border-light">
                <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    leftIcon={<Eye className="w-4 h-4" />}
                    onClick={() => onViewPolicy(user)}
                >
                    Policy
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(user)}
                >
                    <Edit className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(user)}
                >
                    <Trash2 className="w-4 h-4 text-error" />
                </Button>
            </div>
        </Card>
    </motion.div>
);

// Create/Edit Form Component
const UserFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    user?: SubAdmin | null;
    onSubmit: (data: CreateSubAdminRequest) => void;
    isLoading?: boolean;
}> = ({ isOpen, onClose, user, onSubmit, isLoading }) => {
    const [formData, setFormData] = useState<CreateSubAdminRequest>({
        name: user?.name || '',
        email: user?.email || '',
        password: '',
        type: user?.type || 'staff',
        role: user?.role || '',
        permissions: user?.permissions || {},
        valid_at: user?.valid_at ? user.valid_at.split('T')[0] : '',
        valid_until: user?.valid_until ? user.valid_until.split('T')[0] : '',
    });
    const [useDefaultPassword, setUseDefaultPassword] = useState(!user);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const submitData = { ...formData };
        if (useDefaultPassword && !user) {
            const firstName = formData.name.split(' ')[0];
            submitData.password = `${firstName}@123`;
        }
        onSubmit(submitData);
    };

    const togglePermission = (permission: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [permission]: !prev.permissions?.[permission],
            },
        }));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={user ? 'Edit User' : 'Create New User'}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* User Info Section */}
                <div className="space-y-4">
                    <h4 className="font-medium text-text flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-primary" />
                        User Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AnimatedInput
                            label="Full Name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter full name"
                            required
                        />
                        <AnimatedInput
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="Enter email address"
                            required
                        />
                    </div>

                    {!user && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="useDefaultPassword"
                                    checked={useDefaultPassword}
                                    onChange={(e) => setUseDefaultPassword(e.target.checked)}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                />
                                <label htmlFor="useDefaultPassword" className="text-sm text-text-secondary">
                                    Use default password (FirstName@123)
                                </label>
                            </div>
                            {!useDefaultPassword && (
                                <AnimatedInput
                                    label="Password"
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                    placeholder="Enter password"
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Role Section */}
                <div className="space-y-4">
                    <h4 className="font-medium text-text flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        Role & Type
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text mb-1.5">User Type</label>
                            <div className="flex gap-2">
                                {(['sub_admin', 'staff', 'team'] as SubAdminType[]).map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, type }))}
                                        className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${formData.type === type
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border bg-surface text-text-secondary hover:border-primary/50'
                                            }`}
                                    >
                                        <span className="flex items-center justify-center gap-1">
                                            {typeIcons[type]}
                                            {typeLabels[type]}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <AnimatedInput
                            label="Role Name"
                            value={formData.role || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                            placeholder="e.g., Manager, Support"
                        />
                    </div>
                </div>

                {/* Validity Section */}
                <div className="space-y-4">
                    <h4 className="font-medium text-text flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        Validity Period
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AnimatedInput
                            label="Valid From"
                            type="date"
                            value={formData.valid_at || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, valid_at: e.target.value }))}
                        />
                        <AnimatedInput
                            label="Valid Until"
                            type="date"
                            value={formData.valid_until || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                        />
                    </div>
                    <p className="text-xs text-text-muted">Leave empty for unlimited access</p>
                </div>

                {/* Permissions Section */}
                <div className="space-y-4">
                    <h4 className="font-medium text-text flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        Permissions
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto pr-2">
                        {Object.entries(PERMISSION_CATEGORIES).map(([category, { label, permissions }]) => (
                            <Card key={category} padding="sm" variant="default" className="space-y-2">
                                <h5 className="text-sm font-medium text-text">{label}</h5>
                                <div className="space-y-1">
                                    {permissions.map((permission) => (
                                        <label
                                            key={permission}
                                            className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-surface-hover transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={!!formData.permissions?.[permission]}
                                                onChange={() => togglePermission(permission)}
                                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm text-text-secondary">
                                                {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                <ModalFooter>
                    <Button variant="ghost" onClick={onClose} type="button">
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isLoading}>
                        {user ? 'Update User' : 'Create User'}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
};

// View Policy Modal
const ViewPolicyModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    user: SubAdmin | null;
}> = ({ isOpen, onClose, user }) => {
    if (!user) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Access Policy - ${user.name}`}
            size="md"
        >
            <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                    <Avatar name={user.name} size="md" />
                    <div>
                        <p className="font-medium text-text">{user.name}</p>
                        <p className="text-sm text-text-muted">{user.email}</p>
                    </div>
                    <Badge variant={statusVariants[user.status]} className="ml-auto">
                        {user.status}
                    </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-surface rounded-lg">
                        <p className="text-text-muted">Type</p>
                        <p className="font-medium text-text">{typeLabels[user.type]}</p>
                    </div>
                    <div className="p-3 bg-surface rounded-lg">
                        <p className="text-text-muted">Role</p>
                        <p className="font-medium text-text">{user.role}</p>
                    </div>
                    <div className="p-3 bg-surface rounded-lg">
                        <p className="text-text-muted">Valid From</p>
                        <p className="font-medium text-text">
                            {user.valid_at ? new Date(user.valid_at).toLocaleDateString() : 'No start date'}
                        </p>
                    </div>
                    <div className="p-3 bg-surface rounded-lg">
                        <p className="text-text-muted">Valid Until</p>
                        <p className="font-medium text-text">
                            {user.valid_until ? new Date(user.valid_until).toLocaleDateString() : 'Unlimited'}
                        </p>
                    </div>
                </div>

                <div>
                    <h4 className="font-medium text-text mb-3">Permissions</h4>
                    <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                        {Object.entries(PERMISSION_CATEGORIES).map(([category, { label, permissions }]) => {
                            const granted = permissions.filter(p => user.permissions[p]);
                            if (granted.length === 0) return null;

                            return (
                                <div key={category} className="p-3 bg-surface rounded-lg">
                                    <p className="text-sm font-medium text-text mb-2">{label}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {permissions.map((permission) => (
                                            <span
                                                key={permission}
                                                className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${user.permissions[permission]
                                                    ? 'bg-success/20 text-success'
                                                    : 'bg-error/20 text-error'
                                                    }`}
                                            >
                                                {user.permissions[permission] ? (
                                                    <Check className="w-3 h-3" />
                                                ) : (
                                                    <X className="w-3 h-3" />
                                                )}
                                                {permission.replace(/_/g, ' ')}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <ModalFooter>
                <Button onClick={onClose}>Close</Button>
            </ModalFooter>
        </Modal>
    );
};

// Main Page Component
export const SubAdminsPage: React.FC = () => {
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<SubAdminType | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Modal states
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editUser, setEditUser] = useState<SubAdmin | null>(null);
    const [deleteUser, setDeleteUser] = useState<SubAdmin | null>(null);
    const [viewPolicyUser, setViewPolicyUser] = useState<SubAdmin | null>(null);

    // API hooks (using mock data for now)
    // const { data, isLoading } = useGetAdminsQuery({ page: 1, limit: 50 });
    // const [createAdmin, { isLoading: isCreating }] = useCreateAdminMutation();
    // const [deleteAdmin, { isLoading: isDeleting }] = useDeleteAdminMutation();

    const users = mockSubAdmins;
    const isLoading = false;
    const isCreating = false;
    const isDeleting = false;

    // Stats
    const stats = {
        total: users.length,
        subAdmins: users.filter(u => u.type === 'sub_admin').length,
        staff: users.filter(u => u.type === 'staff').length,
        team: users.filter(u => u.type === 'team').length,
        active: users.filter(u => u.status === 'active').length,
    };

    // Filtered users
    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.role.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === 'all' || user.type === typeFilter;
        const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
        return matchesSearch && matchesType && matchesStatus;
    });

    const handleCreate = async (data: CreateSubAdminRequest) => {
        console.log('Creating user:', data);
        // await createAdmin(data);
        setCreateModalOpen(false);
    };

    const handleEdit = async (data: CreateSubAdminRequest) => {
        if (!editUser) return;
        console.log('Updating user:', editUser.id, data);
        setEditUser(null);
    };

    const handleDelete = async () => {
        if (!deleteUser) return;
        console.log('Deleting user:', deleteUser.id);
        // await deleteAdmin(deleteUser.id);
        setDeleteUser(null);
    };

    // Table columns
    const columns: Column<SubAdmin>[] = [
        {
            key: 'name',
            header: 'User',
            sortable: true,
            render: (user) => (
                <div className="flex items-center gap-3">
                    <Avatar name={user.name} size="md" status={user.status === 'active' ? 'online' : 'offline'} />
                    <div>
                        <p className="font-medium text-text">{user.name}</p>
                        <p className="text-xs text-text-muted">{user.email}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'type',
            header: 'Type',
            render: (user) => (
                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                    {typeIcons[user.type]}
                    {typeLabels[user.type]}
                </Badge>
            ),
        },
        {
            key: 'role',
            header: 'Role',
            sortable: true,
            render: (user) => <Badge variant="info">{user.role}</Badge>,
        },
        {
            key: 'permissions',
            header: 'Policy',
            render: (user) => (
                <Tooltip
                    content={
                        <div className="max-w-xs">
                            <p className="font-medium mb-1">Granted Permissions</p>
                            <div className="flex flex-wrap gap-1">
                                {Object.entries(user.permissions)
                                    .filter(([, v]) => v)
                                    .slice(0, 5)
                                    .map(([key]) => (
                                        <span key={key} className="text-xs bg-white/20 px-1.5 py-0.5 rounded">
                                            {key.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                {Object.values(user.permissions).filter(Boolean).length > 5 && (
                                    <span className="text-xs">+{Object.values(user.permissions).filter(Boolean).length - 5} more</span>
                                )}
                            </div>
                        </div>
                    }
                >
                    <Badge variant="outline" className="cursor-help">
                        {Object.values(user.permissions).filter(Boolean).length} permissions
                    </Badge>
                </Tooltip>
            ),
        },
        {
            key: 'valid_until',
            header: 'Validity',
            sortable: true,
            render: (user) => (
                <span className="text-sm text-text-secondary">
                    {user.valid_until
                        ? new Date(user.valid_until).toLocaleDateString()
                        : 'Unlimited'
                    }
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (user) => (
                <Badge variant={statusVariants[user.status] || 'default'}>
                    {user.status}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: '',
            width: '120px',
            render: (user) => (
                <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setViewPolicyUser(user)}>
                        <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditUser(user)}>
                        <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteUser(user)}>
                        <Trash2 className="w-4 h-4 text-error" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Sub Admins</h1>
                    <p className="text-muted-foreground mt-1">Manage sub-root users, staff, and team members</p>
                </div>
                <Button
                    leftIcon={<Plus className="w-4 h-4" />}
                    onClick={() => setCreateModalOpen(true)}
                >
                    Create New User
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Users"
                    value={stats.total}
                    icon={<Users className="w-5 h-5" />}
                    trend={{ value: 12, label: 'vs last month' }}
                    variant="primary"
                />
                <StatsCard
                    title="Sub Admins"
                    value={stats.subAdmins}
                    icon={<UserCog className="w-5 h-5" />}
                    variant="primary"
                />
                <StatsCard
                    title="Staff"
                    value={stats.staff}
                    icon={<Users className="w-5 h-5" />}
                    variant="warning"
                />
                <StatsCard
                    title="Active"
                    value={stats.active}
                    icon={<Check className="w-5 h-5" />}
                    variant="success"
                />
            </div>

            {/* Filters */}
            <Card variant="default" padding="md">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftIcon={<Search className="w-4 h-4" />}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as SubAdminType | 'all')}
                            className="w-36"
                            options={[
                                { value: 'all', label: 'All Types' },
                                { value: 'sub_admin', label: 'Sub Admin' },
                                { value: 'staff', label: 'Staff' },
                                { value: 'team', label: 'Team' },
                            ]}
                        />
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-36"
                            options={[
                                { value: 'all', label: 'All Status' },
                                { value: 'active', label: 'Active' },
                                { value: 'inactive', label: 'Inactive' },
                                { value: 'expired', label: 'Expired' },
                            ]}
                        />
                        <div className="flex items-center border border-border rounded-lg overflow-hidden">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2 transition-colors ${viewMode === 'table'
                                    ? 'bg-primary text-white'
                                    : 'bg-surface text-text-muted hover:bg-surface-hover'
                                    }`}
                            >
                                <LayoutList className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('card')}
                                className={`p-2 transition-colors ${viewMode === 'card'
                                    ? 'bg-primary text-white'
                                    : 'bg-surface text-text-muted hover:bg-surface-hover'
                                    }`}
                            >
                                <LayoutGrid className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Content */}
            <AnimatePresence mode="wait">
                {viewMode === 'table' ? (
                    <motion.div
                        key="table"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <Table
                            data={filteredUsers}
                            columns={columns}
                            keyExtractor={(user) => user.id}
                            loading={isLoading}
                            emptyMessage="No users found"
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="cards"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                        {filteredUsers.map((user, index) => (
                            <motion.div
                                key={user.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <UserCard
                                    user={user}
                                    onEdit={setEditUser}
                                    onDelete={setDeleteUser}
                                    onViewPolicy={setViewPolicyUser}
                                />
                            </motion.div>
                        ))}
                        {filteredUsers.length === 0 && !isLoading && (
                            <div className="col-span-full text-center py-12 text-text-muted">
                                No users found
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Modal */}
            <UserFormModal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onSubmit={handleCreate}
                isLoading={isCreating}
            />

            {/* Edit Modal */}
            <UserFormModal
                isOpen={!!editUser}
                onClose={() => setEditUser(null)}
                user={editUser}
                onSubmit={handleEdit}
            />

            {/* View Policy Modal */}
            <ViewPolicyModal
                isOpen={!!viewPolicyUser}
                onClose={() => setViewPolicyUser(null)}
                user={viewPolicyUser}
            />

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteUser}
                onClose={() => setDeleteUser(null)}
                title="Delete User"
                description="This action cannot be undone."
                size="sm"
            >
                <div className="flex items-start gap-3 p-4 bg-error/10 rounded-lg mb-4">
                    <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-text">
                            Are you sure you want to delete <strong>{deleteUser?.name}</strong>?
                        </p>
                        <p className="text-sm text-text-muted mt-1">
                            This will remove all associated permissions and access.
                        </p>
                    </div>
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setDeleteUser(null)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
                        Delete User
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};
