import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Shield,
    Users,
    GraduationCap,
    UserCheck,
    Briefcase,
    BookOpen,
    Settings,
    ChevronRight,
    RefreshCw,
    Crown,
    CheckCircle2,
    Database,
    Globe,
    Lock,
    ArrowRight,
    Info,
    AlertTriangle,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import {
    Card,
    Button,
    Badge,
    Modal,
    ModalFooter,
    LoadingSpinner,
    Tooltip,
} from '@erp/common';
import { rbacApi, type RoleConfig, type RoleWithCacheInfo } from '../../../../api/rbacApi';

// ============================================================================
// Types & Config
// ============================================================================

const USER_TYPE_CONFIG: Record<string, {
    label: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    gradient: string;
    description: string;
}> = {
    admin: {
        label: 'Admin',
        icon: Crown,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
        gradient: 'from-purple-600 via-indigo-500 to-violet-400',
        description: 'Full system access for institution administrators'
    },
    teacher: {
        label: 'Teacher',
        icon: GraduationCap,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        gradient: 'from-blue-600 via-blue-500 to-cyan-400',
        description: 'Teaching staff with classroom management access'
    },
    student: {
        label: 'Student',
        icon: BookOpen,
        color: 'text-emerald-500',
        bgColor: 'bg-emerald-500/10',
        gradient: 'from-emerald-600 via-emerald-500 to-teal-400',
        description: 'Students with academic content access'
    },
    staff: {
        label: 'Staff',
        icon: Briefcase,
        color: 'text-amber-500',
        bgColor: 'bg-amber-500/10',
        gradient: 'from-amber-600 via-orange-500 to-yellow-400',
        description: 'Non-teaching staff with administrative access'
    },
    parent: {
        label: 'Parent',
        icon: UserCheck,
        color: 'text-pink-500',
        bgColor: 'bg-pink-500/10',
        gradient: 'from-pink-600 via-rose-500 to-red-400',
        description: 'Parents with child monitoring access'
    },
};

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Role Config Card - Shows current default role for a user type
 */
const RoleConfigCard: React.FC<{
    config: RoleConfig;
    onEdit: () => void;
    onMigrate?: () => void;
}> = ({ config, onEdit, onMigrate }) => {
    const typeConfig = USER_TYPE_CONFIG[config.user_type] || {
        label: config.user_type,
        icon: Users,
        color: 'text-slate-500',
        bgColor: 'bg-slate-500/10',
        gradient: 'from-slate-600 via-slate-500 to-gray-400',
        description: 'Custom user type'
    };
    const Icon = typeConfig.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative overflow-hidden rounded-2xl border border-border/30 bg-card hover:border-primary/30 hover:shadow-xl transition-all duration-300"
        >
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${typeConfig.bgColor} opacity-30`} />

            {/* Header */}
            <div className={`relative p-4 bg-gradient-to-r ${typeConfig.gradient} text-white`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                            <Icon size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">{typeConfig.label}</h3>
                            <p className="text-xs text-white/80">{typeConfig.description}</p>
                        </div>
                    </div>
                    <Badge
                        variant={config.is_system_role ? 'default' : 'outline'}
                        className={`text-[10px] ${config.is_system_role ? 'bg-white/20 text-white border-white/30' : 'bg-purple-500/20 text-white border-purple-300/50'}`}
                    >
                        {config.is_system_role ? (
                            <><Globe size={10} className="mr-1" /> System Role</>
                        ) : (
                            <><Lock size={10} className="mr-1" /> Custom Role</>
                        )}
                    </Badge>
                </div>
            </div>

            {/* Content */}
            <div className="relative p-5 space-y-4">
                {/* Current Default Role */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${typeConfig.bgColor}`}>
                            <Shield size={16} className={typeConfig.color} />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current Default</p>
                            <p className="font-bold text-sm">{config.defaultRole?.name || 'Not set'}</p>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                </div>

                {/* Cache Strategy Info */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <Database size={14} className="text-primary flex-shrink-0" />
                    <p className="text-xs text-primary">
                        {config.is_system_role
                            ? 'Permissions cached globally (shared across all tenants with same plan)'
                            : 'Permissions cached per-tenant (isolated for this institution only)'
                        }
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onEdit}
                        className="flex-1 gap-2"
                        leftIcon={<Settings size={14} />}
                    >
                        Change Default
                    </Button>
                    {config.previous_role_id && onMigrate && (
                        <Tooltip content="Migrate users from previous default role to current">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onMigrate}
                                className="gap-2 text-amber-600 hover:bg-amber-500/10"
                                leftIcon={<ArrowRight size={14} />}
                            >
                                Migrate
                            </Button>
                        </Tooltip>
                    )}
                </div>

                {/* Last Changed */}
                {config.last_changed_at && (
                    <p className="text-[10px] text-muted-foreground text-center">
                        Last updated: {new Date(config.last_changed_at).toLocaleDateString()}
                    </p>
                )}
            </div>
        </motion.div>
    );
};

/**
 * Change Default Role Modal
 */
const ChangeDefaultRoleModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    config: RoleConfig | null;
    availableRoles: RoleWithCacheInfo[];
    onSave: (roleId: string, migrateUsers: boolean) => Promise<void>;
    isSaving: boolean;
}> = ({ isOpen, onClose, config, availableRoles, onSave, isSaving }) => {
    const [selectedRoleId, setSelectedRoleId] = useState<string>('');
    const [migrateUsers, setMigrateUsers] = useState(false);

    useEffect(() => {
        if (config) {
            setSelectedRoleId(config.default_role_id);
            setMigrateUsers(false);
        }
    }, [config]);

    const isChangingRole = selectedRoleId !== config?.default_role_id;

    const handleSave = async () => {
        await onSave(selectedRoleId, migrateUsers);
        onClose();
    };

    const typeConfig = config ? (USER_TYPE_CONFIG[config.user_type] || { label: config.user_type, icon: Users }) : null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Change Default Role for ${typeConfig?.label || 'User Type'}`}
            size="lg"
        >
            <div className="space-y-6">
                {/* Info Banner */}
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-start gap-3">
                        <Info size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                Important: Role Change Behavior
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                When you change the default role, <strong>existing users will keep their current role</strong>.
                                Only new users will be assigned the new default. You can optionally migrate existing users.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Role Selection */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold">Select Default Role</label>
                    <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2">
                        {availableRoles.map(role => {
                            const isSelected = role.id === selectedRoleId;
                            const isCurrent = role.id === config?.default_role_id;
                            const isSystem = role.cacheStrategy === 'plan-scoped';

                            return (
                                <motion.button
                                    key={role.id}
                                    onClick={() => setSelectedRoleId(role.id)}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    className={`
                                        relative p-4 rounded-xl border-2 text-left transition-all duration-200
                                        ${isSelected
                                            ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                                            : 'border-border/50 hover:border-primary/30 hover:bg-muted/30'
                                        }
                                    `}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`
                                                p-2.5 rounded-lg transition-colors
                                                ${isSelected ? 'bg-primary text-white' : 'bg-muted/50'}
                                            `}>
                                                <Shield size={18} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold">{role.name}</h4>
                                                    {isCurrent && (
                                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                                            Current
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {role.description || `Permissions for ${role.name.toLowerCase()} users`}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Cache Strategy Badge */}
                                        <div className="flex flex-col items-end gap-1">
                                            <Badge
                                                variant="outline"
                                                className={`text-[9px] ${isSystem ? 'border-green-500/50 text-green-600' : 'border-purple-500/50 text-purple-600'}`}
                                            >
                                                {isSystem ? (
                                                    <><Globe size={9} className="mr-1" /> Global Cache</>
                                                ) : (
                                                    <><Lock size={9} className="mr-1" /> Tenant Cache</>
                                                )}
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground">
                                                {role.permissions?.length || 0} permissions
                                            </span>
                                        </div>
                                    </div>

                                    {/* Selection indicator */}
                                    {isSelected && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute top-2 right-2"
                                        >
                                            <div className="p-1 rounded-full bg-primary text-white">
                                                <CheckCircle2 size={14} />
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                {/* Migration Option */}
                {isChangingRole && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
                    >
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={migrateUsers}
                                onChange={(e) => setMigrateUsers(e.target.checked)}
                                className="mt-1 w-4 h-4 rounded border-amber-500/50 text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={14} className="text-amber-600" />
                                    <span className="font-medium text-amber-700 dark:text-amber-300 text-sm">
                                        Also migrate existing users
                                    </span>
                                </div>
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                    Check this to update all existing users who were auto-assigned the previous default role.
                                    Users with explicitly assigned roles will not be affected.
                                </p>
                            </div>
                        </label>
                    </motion.div>
                )}
            </div>

            <ModalFooter>
                <Button variant="ghost" onClick={onClose} disabled={isSaving}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={!isChangingRole || isSaving}
                    className="min-w-[120px] shadow-lg shadow-primary/20"
                    leftIcon={isSaving ? <LoadingSpinner size="sm" /> : <CheckCircle2 size={16} />}
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </ModalFooter>
        </Modal>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export default function RoleConfigurationPage() {
    const [roleConfigs, setRoleConfigs] = useState<RoleConfig[]>([]);
    const [availableRoles, setAvailableRoles] = useState<RoleWithCacheInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingConfig, setEditingConfig] = useState<RoleConfig | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Fetch data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [configsRes, rolesRes] = await Promise.all([
                rbacApi.getAllRoleConfigs(),
                rbacApi.listRoles(true)
            ]);

            setRoleConfigs(configsRes.data);
            setAvailableRoles(rolesRes.data.map(role => ({
                ...role,
                cacheStrategy: role.asset_type === 'custom' ? 'tenant-scoped' : 'plan-scoped',
                cacheDescription: role.asset_type === 'custom'
                    ? 'Permissions cached per-tenant (isolated)'
                    : 'Permissions cached globally per-plan (shared)'
            })));
        } catch (err) {
            console.error('Failed to fetch role configurations:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Initialize configs if empty
    const handleInitialize = async () => {
        setLoading(true);
        try {
            await rbacApi.initializeRoleConfigs();
            await fetchData();
        } catch (err) {
            console.error('Failed to initialize role configs:', err);
        } finally {
            setLoading(false);
        }
    };

    // Edit config
    const handleEdit = (config: RoleConfig) => {
        setEditingConfig(config);
        setIsEditModalOpen(true);
    };

    // Save config
    const handleSave = async (roleId: string, migrateUsers: boolean) => {
        if (!editingConfig) return;

        setIsSaving(true);
        try {
            await rbacApi.setDefaultRole(editingConfig.user_type, roleId, migrateUsers);
            await fetchData();
        } catch (err) {
            console.error('Failed to save role config:', err);
            throw err;
        } finally {
            setIsSaving(false);
        }
    };

    // Migrate users
    const handleMigrate = async (config: RoleConfig) => {
        if (!config.previous_role_id) return;

        if (!window.confirm(
            `Are you sure you want to migrate all users from the previous default role to "${config.defaultRole?.name}"?\n\n` +
            `This will update the role assignment for all users who were auto-assigned the previous role.`
        )) {
            return;
        }

        setLoading(true);
        try {
            const result = await rbacApi.migrateUsersToRole(
                config.user_type,
                config.previous_role_id,
                config.default_role_id
            );
            alert(`Successfully migrated ${result.data.migratedCount} users.`);
            await fetchData();
        } catch (err) {
            console.error('Failed to migrate users:', err);
            alert('Failed to migrate users. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Loading State
    if (loading && roleConfigs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
                    <div className="relative p-6 rounded-full bg-card border border-border/50 shadow-xl">
                        <LoadingSpinner size="lg" />
                    </div>
                </div>
                <p className="mt-6 text-muted-foreground font-medium animate-pulse">
                    Loading role configurations...
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">

                {/* Hero Header */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-border/30 p-6 sm:p-8">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                    <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                        <div className="space-y-3">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider"
                            >
                                <Zap size={14} />
                                Role Assignment Settings
                            </motion.div>
                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-bold tracking-tight"
                            >
                                Default Role Configuration
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-muted-foreground max-w-xl text-sm sm:text-base leading-relaxed"
                            >
                                Configure which role is assigned by default to each user type.
                                When you change a default, <strong>existing users keep their roles</strong> – only new users get the updated default.
                            </motion.p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {roleConfigs.length === 0 && (
                                <Button
                                    onClick={handleInitialize}
                                    className="gap-2 shadow-lg shadow-primary/25"
                                    leftIcon={<RefreshCw size={16} />}
                                    disabled={loading}
                                >
                                    Initialize Configs
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                onClick={fetchData}
                                className="gap-2"
                                leftIcon={<RefreshCw size={16} />}
                                disabled={loading}
                            >
                                Refresh
                            </Button>
                        </div>
                    </div>

                    {/* Info Cards */}
                    <div className="relative mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="p-4 rounded-xl bg-green-500/10 border border-green-500/20"
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-green-500/20">
                                    <Globe size={18} className="text-green-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-green-700 dark:text-green-300">System Roles (Plan-Scoped)</h4>
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                        Permissions are cached globally and shared across all tenants with the same subscription plan.
                                        More efficient but cannot be customized.
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                            className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/20">
                                    <Lock size={18} className="text-purple-600" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-purple-700 dark:text-purple-300">Custom Roles (Tenant-Scoped)</h4>
                                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                        Permissions are cached separately for your institution only.
                                        Fully customizable but isolated from other tenants.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Role Config Grid */}
                {roleConfigs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {roleConfigs.map((config, idx) => (
                            <motion.div
                                key={config.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <RoleConfigCard
                                    config={config}
                                    onEdit={() => handleEdit(config)}
                                    onMigrate={config.previous_role_id ? () => handleMigrate(config) : undefined}
                                />
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <Card className="py-16 flex flex-col items-center justify-center text-center border-dashed border-2">
                        <div className="p-4 rounded-full bg-muted/50 mb-4">
                            <Settings size={32} className="text-muted-foreground" />
                        </div>
                        <h4 className="font-bold text-lg">No Role Configurations</h4>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                            Initialize default role configurations to manage which role is assigned to each user type.
                        </p>
                        <Button
                            className="mt-6"
                            onClick={handleInitialize}
                            leftIcon={<RefreshCw size={16} />}
                        >
                            Initialize Now
                        </Button>
                    </Card>
                )}

                {/* Edit Modal */}
                <ChangeDefaultRoleModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    config={editingConfig}
                    availableRoles={availableRoles}
                    onSave={handleSave}
                    isSaving={isSaving}
                />
            </div>
        </div>
    );
}
