import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    Users,
    GraduationCap,
    UserCheck,
    Briefcase,
    BookOpen,
    Search,
    Plus,
    Check,
    Settings,
    ChevronRight,
    ChevronDown,
    Unlock,
    Sparkles,
    Trash2,
    RefreshCw,
    ShieldCheck,
    Package,
    Layout,
    Eye,
    Edit3,
    Zap,
    ToggleLeft,
    ToggleRight,
    Filter,
    X,
    Crown,
    Star,
    CheckCircle2,
    AlertCircle,
    Layers,
    Lock,
    RefreshCcw,
    Database,
    Globe,
    ArrowRight,
    Info,
    AlertTriangle,
    type LucideIcon,
} from 'lucide-react';
import {
    Card,
    Button,
    Input,
    Badge,
    Modal,
    ModalFooter,
    LoadingSpinner,
    Tooltip,
    ReadOnlyOverlay,
} from '@erp/common';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { rbacApi, type Role, type ModuleAbilities, type RoleConfig, type RoleWithCacheInfo } from '../../../../api/rbacApi';
import { assignPermissionSchema, createRoleSchema, type CreateRoleFormData } from '@/core/validation/schemas';

// ============================================================================
// Types & Config
// ============================================================================

const ROLE_PRESETS: Record<string, { label: string; icon: LucideIcon; color: string; bgColor: string; gradient: string; headerGradient: string }> = {
    Teacher: { label: 'Teacher', icon: GraduationCap, color: 'text-blue-500', bgColor: 'bg-blue-500/10', gradient: 'from-blue-500/20 to-blue-600/5', headerGradient: 'from-blue-600 via-blue-500 to-cyan-400' },
    Student: { label: 'Student', icon: BookOpen, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', gradient: 'from-emerald-500/20 to-emerald-600/5', headerGradient: 'from-emerald-600 via-emerald-500 to-teal-400' },
    Staff: { label: 'Staff', icon: Briefcase, color: 'text-amber-500', bgColor: 'bg-amber-500/10', gradient: 'from-amber-500/20 to-amber-600/5', headerGradient: 'from-amber-600 via-orange-500 to-yellow-400' },
    Parent: { label: 'Parent', icon: UserCheck, color: 'text-pink-500', bgColor: 'bg-pink-500/10', gradient: 'from-pink-500/20 to-pink-600/5', headerGradient: 'from-pink-600 via-rose-500 to-red-400' },
    Admin: { label: 'Admin', icon: Crown, color: 'text-purple-500', bgColor: 'bg-purple-500/10', gradient: 'from-purple-500/20 to-purple-600/5', headerGradient: 'from-purple-600 via-indigo-500 to-violet-400' },
};

const ACTION_ICONS: Record<string, LucideIcon> = {
    view: Eye,
    create: Plus,
    update: Edit3,
    edit: Edit3,
    delete: Trash2,
    manage: Settings,
    mark: CheckCircle2,
    export: Zap,
};

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Stats Card Component
 */
const StatCard: React.FC<{
    label: string;
    value: number | string;
    icon: LucideIcon;
    color: string;
    delay?: number;
}> = ({ label, value, icon: Icon, color, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay, type: 'spring', stiffness: 200 }}
        className="relative overflow-hidden"
    >
        <div className={`p-4 rounded-2xl bg-gradient-to-br ${color} border border-white/10 backdrop-blur-sm`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold mt-1">{value}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/10">
                    <Icon size={20} className="opacity-80" />
                </div>
            </div>
        </div>
    </motion.div>
);

/**
 * Role Card - Premium Glassmorphism Design
 */
const RoleCard: React.FC<{
    role: Role;
    isSelected: boolean;
    onClick: () => void;
    onDelete: (e: React.MouseEvent) => void;
}> = ({ role, isSelected, onClick, onDelete }) => {
    const preset = ROLE_PRESETS[role.name] || {
        label: role.name,
        icon: Shield,
        color: 'text-slate-500',
        bgColor: 'bg-slate-500/10',
        gradient: 'from-slate-500/20 to-slate-600/5',
        headerGradient: 'from-slate-600 via-slate-500 to-gray-400'
    };
    const Icon = preset.icon;
    const isDefault = ['Admin', 'Teacher', 'Student', 'Staff', 'Parent'].includes(role.name);

    return (
        <motion.div
            layout
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`
                relative cursor-pointer group rounded-2xl border-2 transition-all duration-300
                ${isSelected
                    ? 'border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-2xl shadow-primary/20 ring-4 ring-primary/10'
                    : 'border-border/30 bg-card/80 backdrop-blur-sm hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10'}
            `}
        >
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${preset.gradient} opacity-50 rounded-2xl overflow-hidden`} />

            {/* Content */}
            <div className="relative p-5">
                <div className="flex items-start justify-between">
                    {/* Icon with gradient */}
                    <div className={`
                        p-3 rounded-xl transition-all duration-300 shadow-lg
                        ${isSelected
                            ? `bg-gradient-to-br ${preset.headerGradient} text-white shadow-lg`
                            : `${preset.bgColor} ${preset.color} group-hover:scale-110`}
                    `}>
                        <Icon size={22} />
                    </div>

                    <div className="flex items-center gap-1">
                        {/* Asset Type Badge with Tooltip */}
                        {role.asset_type === 'readonly' && (
                            <Tooltip content="System role - view only, cannot be modified" position="top">
                                <div className="p-1.5 rounded-lg bg-red-500/10 cursor-help">
                                    <Lock size={12} className="text-red-500" />
                                </div>
                            </Tooltip>
                        )}
                        {role.asset_type === 'custom' && (
                            <Tooltip content="Custom role - tenant-specific" position="top">
                                <div className="p-1.5 rounded-lg bg-purple-500/10 cursor-help">
                                    <Edit3 size={12} className="text-purple-500" />
                                </div>
                            </Tooltip>
                        )}
                        {isDefault && (
                            <Tooltip content="Default system role" position="top">
                                <div className="p-1.5 rounded-lg bg-amber-500/10 cursor-help">
                                    <Star size={12} className="text-amber-500" />
                                </div>
                            </Tooltip>
                        )}
                        {!isDefault && role.asset_type !== 'readonly' && (
                            <button
                                onClick={onDelete}
                                className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-3 sm:mt-4 space-y-1">
                    <h3 className="font-bold text-sm sm:text-base md:text-lg tracking-tight">{role.name}</h3>
                    <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 leading-relaxed min-h-[28px] sm:min-h-[32px]">
                        {role.description || `Manage permissions for ${role.name.toLowerCase()} users`}
                    </p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Badge
                            variant={isSelected ? 'default' : 'outline'}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                        >
                            {role.permissions?.length || 0} permissions
                        </Badge>
                    </div>
                    <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                        ${isSelected
                            ? 'bg-primary text-white rotate-90'
                            : 'bg-muted/50 text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'}
                    `}>
                        <ChevronRight size={16} />
                    </div>
                </div>
            </div>

            {/* Selection Indicator */}
            {isSelected && (
                <motion.div
                    layoutId="roleIndicator"
                    className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-primary"
                />
            )}
        </motion.div>
    );
};

/**
 * Module Accordion Component - Enhanced with smooth animations
 */
const ModuleAccordion: React.FC<{
    module: ModuleAbilities;
    selectedPermIds: Set<string>;
    onTogglePermission: (permId: string) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    defaultExpanded?: boolean;
    isReadonly?: boolean;
}> = ({ module, selectedPermIds, onTogglePermission, onSelectAll, onDeselectAll, defaultExpanded = false, isReadonly = false }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const allPermissionIds = useMemo(() =>
        module.features?.flatMap(f => f.permissions?.map(p => p.id) || []) || [],
        [module.features]
    );

    const selectedCount = useMemo(() =>
        allPermissionIds.filter(id => selectedPermIds.has(id)).length,
        [allPermissionIds, selectedPermIds]
    );

    const isAllSelected = selectedCount === allPermissionIds.length && allPermissionIds.length > 0;
    const isSomeSelected = selectedCount > 0 && selectedCount < allPermissionIds.length;
    const progress = allPermissionIds.length > 0 ? (selectedCount / allPermissionIds.length) * 100 : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
        >
            {/* Module Header */}
            <div
                role="button"
                tabIndex={0}
                onClick={() => setIsExpanded(!isExpanded)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsExpanded(!isExpanded); }}
                className="w-full flex items-center justify-between p-5 hover:bg-muted/20 transition-all duration-200 group cursor-pointer"
            >
                <div className="flex items-center gap-4">
                    <div className={`
                        p-3 rounded-xl transition-all duration-300
                        ${isExpanded ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-primary/10 text-primary group-hover:bg-primary/20'}
                    `}>
                        <Package size={20} />
                    </div>
                    <div className="text-left">
                        <h4 className="font-bold text-sm sm:text-base tracking-tight">{module.name}</h4>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                            {module.features?.length || 0} features • {allPermissionIds.length} permissions
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Progress indicator */}
                    <div className="hidden sm:flex items-center gap-3">
                        <div className="w-24 h-2 rounded-full bg-muted/50 overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                            />
                        </div>
                        <span className={`text-xs font-semibold min-w-[40px] ${selectedCount > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                            {selectedCount}/{allPermissionIds.length}
                        </span>
                    </div>

                    {/* Toggle all button */}
                    <Button
                        variant={isAllSelected ? 'primary' : isSomeSelected ? 'outline' : 'ghost'}
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isReadonly) {
                                isAllSelected ? onDeselectAll() : onSelectAll();
                            }
                        }}
                        className={`h-9 w-9 ${isAllSelected ? '' : isSomeSelected ? 'border-primary/40 text-primary' : ''} ${isReadonly ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isReadonly ? 'Readonly role - cannot modify' : isAllSelected ? 'Deselect all' : 'Select all'}
                        disabled={isReadonly}
                    >
                        {isAllSelected ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </Button>

                    {/* Expand icon */}
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        className="text-muted-foreground"
                    >
                        <ChevronDown size={20} />
                    </motion.div>
                </div>
            </div>

            {/* Features & Permissions - Smooth dropdown */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{
                            height: 'auto',
                            opacity: 1,
                            transition: {
                                height: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
                                opacity: { duration: 0.25, delay: 0.1 }
                            }
                        }}
                        exit={{
                            height: 0,
                            opacity: 0,
                            transition: {
                                height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                                opacity: { duration: 0.2 }
                            }
                        }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 space-y-4 border-t border-border/30 pt-4">
                            {module.features?.map((feature, featureIdx) => (
                                <motion.div
                                    key={feature.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: featureIdx * 0.05 }}
                                    className="rounded-xl border border-border/40 bg-gradient-to-br from-background to-muted/10 overflow-hidden"
                                >
                                    {/* Feature Header */}
                                    <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border/30">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-background shadow-sm">
                                                <Layout size={14} className="text-primary" />
                                            </div>
                                            <div>
                                                <h5 className="font-semibold text-xs sm:text-sm">{feature.name}</h5>
                                                <p className="text-[9px] sm:text-[10px] text-muted-foreground font-mono opacity-70">/{feature.slug}</p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                                            {feature.permissions?.length || 0} actions
                                        </Badge>
                                    </div>

                                    {/* Permissions Grid - Cleaner design */}
                                    <div className="p-4">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                                            {feature.permissions?.map((perm, permIdx) => {
                                                const isChecked = selectedPermIds.has(perm.id);
                                                const actionName = perm.action?.toLowerCase() || perm.key.split('.').pop() || 'action';
                                                const ActionIcon = ACTION_ICONS[actionName] || Settings;

                                                return (
                                                    <motion.button
                                                        key={perm.id}
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: permIdx * 0.02 }}
                                                        onClick={() => !isReadonly && onTogglePermission(perm.id)}
                                                        disabled={isReadonly}
                                                        className={`
                                                            relative flex items-center gap-2.5 p-3 rounded-xl transition-all duration-200 text-left group
                                                            ${isChecked
                                                                ? 'bg-primary/10 border-2 border-primary/40 shadow-sm'
                                                                : 'bg-muted/20 border-2 border-transparent hover:bg-muted/40 hover:border-border/50'}
                                                            ${isReadonly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                                                        `}
                                                        title={isReadonly ? 'Readonly role - view only' : perm.key}
                                                    >
                                                        <div className={`
                                                            w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 flex-shrink-0
                                                            ${isChecked
                                                                ? 'bg-primary text-white shadow-md'
                                                                : 'bg-background border-2 border-border/60 group-hover:border-primary/40'}
                                                        `}>
                                                            <AnimatePresence mode="wait">
                                                                {isChecked && (
                                                                    <motion.div
                                                                        initial={{ scale: 0 }}
                                                                        animate={{ scale: 1 }}
                                                                        exit={{ scale: 0 }}
                                                                        transition={{ duration: 0.15 }}
                                                                    >
                                                                        <Check size={11} strokeWidth={3} />
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                            <ActionIcon
                                                                size={12}
                                                                className={`flex-shrink-0 ${isChecked ? 'text-primary' : 'text-muted-foreground'}`}
                                                            />
                                                            <span className={`font-medium text-[10px] sm:text-xs truncate capitalize ${isChecked ? 'text-primary' : 'text-foreground/80'}`}>
                                                                {perm.action || perm.key.split('.').pop()}
                                                            </span>
                                                        </div>
                                                        {isChecked && (
                                                            <Unlock size={10} className="text-primary/60 flex-shrink-0" />
                                                        )}
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

type TabType = 'permissions' | 'defaults';

export default function RolesPermissionsPage() {
    // Active Tab
    const [activeTab, setActiveTab] = useState<TabType>('permissions');

    // Roles & Permissions State
    const [roles, setRoles] = useState<Role[]>([]);
    const [abilityRange, setAbilityRange] = useState<ModuleAbilities[]>([]);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors: roleFormErrors, isSubmitting: isRoleSubmitting },
    } = useForm<CreateRoleFormData>({
        resolver: zodResolver(createRoleSchema),
        defaultValues: {
            name: '',
            description: '',
        },
    });
    const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Role Configuration State (for Defaults tab)
    const [roleConfigs, setRoleConfigs] = useState<RoleConfig[]>([]);
    const [configLoading, setConfigLoading] = useState(false);
    const [editingConfig, setEditingConfig] = useState<RoleConfig | null>(null);
    const [isEditConfigModalOpen, setIsEditConfigModalOpen] = useState(false);
    const [configSaving, setConfigSaving] = useState(false);

    const selectedRole = useMemo(() => roles.find(r => r.id === selectedRoleId), [roles, selectedRoleId]);

    // Stats
    const stats = useMemo(() => ({
        totalRoles: roles.length,
        totalPermissions: abilityRange.flatMap(m => m.features?.flatMap(f => f.permissions || []) || []).length,
        selectedPermissions: selectedPermIds.size,
        totalModules: abilityRange.length,
    }), [roles, abilityRange, selectedPermIds]);

    // Data fetching
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [rolesRes, rangeRes] = await Promise.all([
                rbacApi.listRoles(true),
                rbacApi.getAdminRange()
            ]);

            // Debug logging
            console.log('[RolesPermissionsPage] API Response - rangeRes.data:', rangeRes.data);
            console.log('[RolesPermissionsPage] Modules count:', rangeRes.data?.length);
            rangeRes.data?.forEach((mod: ModuleAbilities) => {
                console.log(`[RolesPermissionsPage] Module: ${mod.name}, Features: ${mod.features?.length || 0}`);
                mod.features?.forEach((feat) => {
                    console.log(`  Feature: ${feat.name}, Permissions: ${feat.permissions?.length || 0}`);
                });
            });

            setRoles(rolesRes.data);
            setAbilityRange(rangeRes.data);
            if (rolesRes.data.length > 0 && !selectedRoleId) {
                setSelectedRoleId(rolesRes.data[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch Roles/Permissions:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedRoleId]);

    // Fetch role configurations
    const fetchRoleConfigs = useCallback(async () => {
        setConfigLoading(true);
        try {
            const response = await rbacApi.getAllRoleConfigs();
            setRoleConfigs(response.data);
        } catch (err) {
            console.error('Failed to fetch role configs:', err);
        } finally {
            setConfigLoading(false);
        }
    }, []);

    // Initialize role configs
    const initializeRoleConfigs = async () => {
        setConfigLoading(true);
        try {
            await rbacApi.initializeRoleConfigs();
            await fetchRoleConfigs();
        } catch (err) {
            console.error('Failed to initialize role configs:', err);
        } finally {
            setConfigLoading(false);
        }
    };

    // Save role config
    const handleSaveRoleConfig = async (roleId: string, migrateUsers: boolean) => {
        if (!editingConfig) return;
        setConfigSaving(true);
        try {
            await rbacApi.setDefaultRole(editingConfig.user_type, roleId, migrateUsers);
            await fetchRoleConfigs();
            setIsEditConfigModalOpen(false);
        } catch (err) {
            console.error('Failed to save role config:', err);
            throw err;
        } finally {
            setConfigSaving(false);
        }
    };

    // Migrate users
    const handleMigrateUsers = async (config: RoleConfig) => {
        if (!config.previous_role_id) return;
        if (!window.confirm(
            `Are you sure you want to migrate all users from the previous default role to "${config.defaultRole?.name}"?`
        )) return;

        setConfigLoading(true);
        try {
            const result = await rbacApi.migrateUsersToRole(
                config.user_type,
                config.previous_role_id,
                config.default_role_id
            );
            alert(`Successfully migrated ${result.data.migratedCount} users.`);
            await fetchRoleConfigs();
        } catch (err) {
            console.error('Failed to migrate users:', err);
            alert('Failed to migrate users. Please try again.');
        } finally {
            setConfigLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => {
        if (activeTab === 'defaults') {
            fetchRoleConfigs();
        }
    }, [activeTab, fetchRoleConfigs]);

    // Update permission selection when role changes
    useEffect(() => {
        if (selectedRole) {
            const permIds = new Set(selectedRole.permissions?.map((p) => p.id) || []);
            setSelectedPermIds(permIds);
            setHasUnsavedChanges(false);
        }
    }, [selectedRole]);

    // Role Actions
    const handleInitializeDefaults = async () => {
        setLoading(true);
        try {
            const defaults = ['Teacher', 'Student', 'Staff', 'Parent'];
            await Promise.all(defaults.map(name => {
                if (!roles.find(r => r.name === name)) {
                    return rbacApi.createRole({ name, description: `Default role for ${name.toLowerCase()}s` });
                }
                return Promise.resolve();
            }));
            await fetchData();
        } catch (err) {
            console.error('Failed to initialize default roles:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshFromTemplates = async () => {
        setLoading(true);
        try {
            const result = await rbacApi.refreshFromTemplates();
            console.log('[RolesPermissionsPage] Refresh result:', result);
            await fetchData();
            const { created, refreshed, skipped, errors } = result.data;
            alert(`Created ${created} new roles. Refreshed ${refreshed} existing roles. Skipped ${skipped} custom roles.${errors.length > 0 ? '\nErrors: ' + errors.join(', ') : ''}`);
        } catch (err) {
            console.error('Failed to refresh roles from templates:', err);
            alert('Failed to refresh roles from templates');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRole = async (newRole: CreateRoleFormData) => {
        try {
            await rbacApi.createRole(newRole);
            reset({ name: '', description: '' });
            setIsCreateModalOpen(false);
            fetchData();
        } catch (err) {
            console.error('Failed to create role:', err);
        }
    };

    const handleDeleteRole = async (roleId: string) => {
        if (window.confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
            try {
                await rbacApi.deleteRole(roleId);
                if (selectedRoleId === roleId) setSelectedRoleId(roles[0]?.id || null);
                fetchData();
            } catch (err) {
                console.error('Failed to delete role:', err);
            }
        }
    };

    const togglePermission = (permId: string) => {
        // Prevent changes on readonly roles
        if (selectedRole?.asset_type === 'readonly') return;

        setSelectedPermIds(prev => {
            const next = new Set(prev);
            if (next.has(permId)) next.delete(permId);
            else next.add(permId);
            return next;
        });
        setHasUnsavedChanges(true);
    };

    const handleSavePermissions = async () => {
        if (!selectedRoleId) return;
        const validation = assignPermissionSchema.safeParse({
            roleId: selectedRoleId,
            permissionIds: Array.from(selectedPermIds),
        });
        if (!validation.success) {
            alert(validation.error.issues[0]?.message || 'Invalid permission assignment');
            return;
        }
        setIsSaving(true);
        try {
            await rbacApi.assignPermissions(selectedRoleId, Array.from(selectedPermIds));
            const rolesRes = await rbacApi.listRoles(true);
            setRoles(rolesRes.data);
            setHasUnsavedChanges(false);
        } catch (err) {
            console.error('Failed to save permissions:', err);
        } finally {
            setIsSaving(false);
        }
    };

    // Bulk actions for modules
    const selectAllInModule = (module: ModuleAbilities) => {
        if (selectedRole?.asset_type === 'readonly') return;
        const allIds = module.features?.flatMap(f => f.permissions?.map(p => p.id) || []) || [];
        setSelectedPermIds(prev => {
            const next = new Set(prev);
            allIds.forEach(id => next.add(id));
            return next;
        });
        setHasUnsavedChanges(true);
    };

    const deselectAllInModule = (module: ModuleAbilities) => {
        if (selectedRole?.asset_type === 'readonly') return;
        const allIds = module.features?.flatMap(f => f.permissions?.map(p => p.id) || []) || [];
        setSelectedPermIds(prev => {
            const next = new Set(prev);
            allIds.forEach(id => next.delete(id));
            return next;
        });
        setHasUnsavedChanges(true);
    };

    // Get all unique action types from abilities
    const uniqueActions = useMemo(() => {
        const actions = new Set<string>();
        abilityRange.forEach(mod => {
            mod.features?.forEach(feat => {
                feat.permissions?.forEach(perm => {
                    const action = perm.action || perm.key.split('.').pop() || '';
                    if (action) actions.add(action.toLowerCase());
                });
            });
        });
        return Array.from(actions).sort();
    }, [abilityRange]);

    // Get permission IDs by action type
    const getPermissionIdsByAction = useCallback((action: string): string[] => {
        const ids: string[] = [];
        abilityRange.forEach(mod => {
            mod.features?.forEach(feat => {
                feat.permissions?.forEach(perm => {
                    const permAction = (perm.action || perm.key.split('.').pop() || '').toLowerCase();
                    if (permAction === action.toLowerCase()) {
                        ids.push(perm.id);
                    }
                });
            });
        });
        return ids;
    }, [abilityRange]);

    // Check if all permissions of an action type are selected
    const isActionFullySelected = useCallback((action: string): boolean => {
        const ids = getPermissionIdsByAction(action);
        return ids.length > 0 && ids.every(id => selectedPermIds.has(id));
    }, [getPermissionIdsByAction, selectedPermIds]);

    // Check if some permissions of an action type are selected
    const isActionPartiallySelected = useCallback((action: string): boolean => {
        const ids = getPermissionIdsByAction(action);
        const selectedCount = ids.filter(id => selectedPermIds.has(id)).length;
        return selectedCount > 0 && selectedCount < ids.length;
    }, [getPermissionIdsByAction, selectedPermIds]);

    // Toggle all permissions of a specific action type
    const toggleActionType = (action: string) => {
        if (selectedRole?.asset_type === 'readonly') return;
        const ids = getPermissionIdsByAction(action);
        const isFullySelected = isActionFullySelected(action);

        setSelectedPermIds(prev => {
            const next = new Set(prev);
            if (isFullySelected) {
                ids.forEach(id => next.delete(id));
            } else {
                ids.forEach(id => next.add(id));
            }
            return next;
        });
        setHasUnsavedChanges(true);
    };

    // Filter functionality
    const filteredAbilities = useMemo(() => {
        if (!searchTerm) return abilityRange;
        const term = searchTerm.toLowerCase();
        return abilityRange.map(mod => ({
            ...mod,
            features: mod.features?.map((feat) => ({
                ...feat,
                permissions: feat.permissions?.filter((p) =>
                    p.key.toLowerCase().includes(term) ||
                    p.action?.toLowerCase().includes(term) ||
                    mod.name.toLowerCase().includes(term) ||
                    feat.name.toLowerCase().includes(term)
                )
            })).filter((feat) => feat.permissions && feat.permissions.length > 0)
        })).filter(mod => mod.features && mod.features.length > 0);
    }, [abilityRange, searchTerm]);

    // Loading State
    if (loading && roles.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
                    <div className="relative p-6 rounded-full bg-card border border-border/50 shadow-xl">
                        <LoadingSpinner size="lg" />
                    </div>
                </div>
                <p className="mt-6 text-muted-foreground font-medium animate-pulse">
                    Loading security configuration...
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
                                <ShieldCheck size={14} />
                                Access Control Management
                            </motion.div>
                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-bold tracking-tight"
                            >
                                Roles & Permissions
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-muted-foreground max-w-xl text-sm sm:text-base leading-relaxed"
                            >
                                Define granular access levels for your school community. Control exactly what teachers, students, staff, and parents can access.
                            </motion.p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                variant="ghost"
                                onClick={handleRefreshFromTemplates}
                                className="gap-2 hover:bg-primary/5"
                                leftIcon={<RefreshCcw size={16} />}
                                disabled={loading}
                                title="Sync public roles from super admin templates"
                            >
                                Refresh Roles
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleInitializeDefaults}
                                className="gap-2 border-primary/30 hover:border-primary/60 hover:bg-primary/5"
                                leftIcon={<RefreshCw size={16} />}
                                disabled={loading}
                            >
                                Initialize Defaults
                            </Button>
                            <Button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40"
                                leftIcon={<Plus size={18} />}
                            >
                                Create Role
                            </Button>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="relative mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <StatCard label="Total Roles" value={stats.totalRoles} icon={Users} color="from-blue-500/10 to-blue-600/5" delay={0.1} />
                        <StatCard label="Modules" value={stats.totalModules} icon={Layers} color="from-purple-500/10 to-purple-600/5" delay={0.15} />
                        <StatCard label="Total Perms" value={stats.totalPermissions} icon={Shield} color="from-emerald-500/10 to-emerald-600/5" delay={0.2} />
                        <StatCard label="Selected" value={stats.selectedPermissions} icon={CheckCircle2} color="from-amber-500/10 to-amber-600/5" delay={0.25} />
                    </div>
                </div>

                {/* ============================================================================ */}
                {/* TABS: Role Permissions | Default Role Configuration */}
                {/* ============================================================================ */}
                <div className="relative">
                    {/* Beautiful Tab Navigation */}
                    <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/50 border border-border/30 backdrop-blur-sm w-fit">
                        <button
                            onClick={() => setActiveTab('permissions')}
                            className={`
                                relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2
                                ${activeTab === 'permissions'
                                    ? 'bg-card text-primary shadow-lg shadow-primary/10'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}
                            `}
                        >
                            <Shield size={16} />
                            <span>Role Permissions</span>
                            {activeTab === 'permissions' && (
                                <motion.div
                                    layoutId="activeTabIndicator"
                                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/20"
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('defaults')}
                            className={`
                                relative px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center gap-2
                                ${activeTab === 'defaults'
                                    ? 'bg-card text-primary shadow-lg shadow-primary/10'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}
                            `}
                        >
                            <Zap size={16} />
                            <span>Default Role Config</span>
                            {roleConfigs.length > 0 && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                                    {roleConfigs.length}
                                </Badge>
                            )}
                            {activeTab === 'defaults' && (
                                <motion.div
                                    layoutId="activeTabIndicator"
                                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border border-primary/20"
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </button>
                    </div>

                    {/* Tab info text */}
                    <motion.p
                        key={activeTab}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 text-xs text-muted-foreground"
                    >
                        {activeTab === 'permissions'
                            ? 'Configure which permissions each role has access to.'
                            : 'Set which role is assigned by default to each user type. When you change a default, existing users keep their current role.'}
                    </motion.p>
                </div>

                {/* ============================================================================ */}
                {/* TAB CONTENT: Role Permissions */}
                {/* ============================================================================ */}
                <AnimatePresence mode="wait">
                    {activeTab === 'permissions' && (
                        <motion.div
                            key="permissions-tab"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Roles Selection */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                                        <Users size={22} className="text-primary" />
                                        Select Role
                                    </h2>
                                    <Badge variant="outline" className="text-xs">
                                        {roles.length} available
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                    <AnimatePresence mode="popLayout">
                                        {roles.map((role, idx) => (
                                            <motion.div
                                                key={role.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                            >
                                                <RoleCard
                                                    role={role}
                                                    isSelected={selectedRoleId === role.id}
                                                    onClick={() => setSelectedRoleId(role.id)}
                                                    onDelete={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteRole(role.id);
                                                    }}
                                                />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Permissions Workspace */}
                            <AnimatePresence mode="wait">
                                {selectedRoleId && selectedRole && (
                                    <motion.div
                                        key={selectedRoleId}
                                        initial={{ opacity: 0, y: 30 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 30 }}
                                        className="space-y-6"
                                    >
                                        {/* Workspace Header */}
                                        <div className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-2xl border border-border/30`}>
                                            {/* Gradient Background */}
                                            <div className={`absolute inset-0 bg-gradient-to-r ${ROLE_PRESETS[selectedRole.name]?.headerGradient || 'from-slate-600 via-slate-500 to-gray-400'} opacity-10`} />
                                            <div className="absolute inset-0 bg-card/80 backdrop-blur-sm" />

                                            <div className="relative flex items-center gap-4">
                                                <div className={`
                                        p-4 rounded-2xl shadow-lg bg-gradient-to-br
                                        ${ROLE_PRESETS[selectedRole.name]?.headerGradient || 'from-slate-600 via-slate-500 to-gray-400'}
                                        text-white
                                    `}>
                                                    {React.createElement(ROLE_PRESETS[selectedRole.name]?.icon || Shield, { size: 28 })}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold">{selectedRole.name} Permissions</h2>
                                                        {selectedRole.asset_type === 'readonly' && (
                                                            <Badge variant="danger" className="gap-1 text-xs">
                                                                <Lock size={10} />
                                                                Readonly
                                                            </Badge>
                                                        )}
                                                        {selectedRole.asset_type === 'custom' && (
                                                            <Badge variant="default" className="gap-1 text-xs bg-purple-500/20 text-purple-600">
                                                                <Edit3 size={10} />
                                                                Custom
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                                        {selectedRole.asset_type === 'readonly'
                                                            ? 'View-only system role - cannot be modified'
                                                            : `Configure what ${selectedRole.name.toLowerCase()} users can access`
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="relative flex items-center gap-3 z-50">
                                                {hasUnsavedChanges && selectedRole.asset_type !== 'readonly' && (
                                                    <Badge variant="warning" className="gap-1.5 text-amber-600 bg-amber-500/10">
                                                        <AlertCircle size={12} />
                                                        Unsaved changes
                                                    </Badge>
                                                )}
                                                {selectedRole.asset_type === 'readonly' ? (
                                                    <Tooltip content="System role - cannot be modified" position="bottom">
                                                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-muted/50 text-muted-foreground border border-border/50 cursor-not-allowed min-w-[140px] justify-center">
                                                            <Lock size={16} />
                                                            <span className="font-medium">View Only</span>
                                                        </div>
                                                    </Tooltip>
                                                ) : (
                                                    <Button
                                                        onClick={handleSavePermissions}
                                                        isLoading={isSaving}
                                                        disabled={!hasUnsavedChanges}
                                                        className="gap-2 shadow-lg shadow-primary/20 min-w-[140px]"
                                                        leftIcon={<ShieldCheck size={18} />}
                                                    >
                                                        Save Changes
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Search & Filter */}
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                                <Input
                                                    placeholder="Search permissions, modules, or features..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="pl-12 h-10 sm:h-12 text-sm sm:text-base bg-card/50 border-border/30"
                                                />
                                                {searchTerm && (
                                                    <button
                                                        onClick={() => setSearchTerm('')}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                                                    >
                                                        <X size={16} className="text-muted-foreground" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Filter size={16} />
                                                <span>{filteredAbilities.length} modules shown</span>
                                            </div>
                                        </div>

                                        {/* Action Type Quick Toggles */}
                                        {uniqueActions.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="relative p-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 border border-border/30 overflow-hidden"
                                            >
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="p-2 rounded-lg bg-primary/10">
                                                        <Zap size={16} className="text-primary" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-sm">Quick Action Toggles</h4>
                                                        <p className="text-xs text-muted-foreground">Select all permissions by action type</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {uniqueActions.map(action => {
                                                        const ActionIcon = ACTION_ICONS[action] || Settings;
                                                        const isFullySelected = isActionFullySelected(action);
                                                        const isPartiallySelected = isActionPartiallySelected(action);
                                                        const count = getPermissionIdsByAction(action).length;
                                                        const selectedCount = getPermissionIdsByAction(action).filter(id => selectedPermIds.has(id)).length;

                                                        return (
                                                            <motion.button
                                                                key={action}
                                                                whileHover={selectedRole?.asset_type !== 'readonly' ? { scale: 1.02 } : undefined}
                                                                whileTap={selectedRole?.asset_type !== 'readonly' ? { scale: 0.98 } : undefined}
                                                                onClick={() => toggleActionType(action)}
                                                                disabled={selectedRole?.asset_type === 'readonly'}
                                                                className={`
                                                        flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200
                                                        border text-sm font-medium capitalize
                                                        ${isFullySelected
                                                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                                                        : isPartiallySelected
                                                                            ? 'bg-primary/20 text-primary border-primary/40'
                                                                            : 'bg-card/80 text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground'}
                                                        ${selectedRole?.asset_type === 'readonly' ? 'opacity-50 cursor-not-allowed' : ''}
                                                    `}
                                                                title={selectedRole?.asset_type === 'readonly' ? 'Readonly role - cannot modify' : `Toggle all ${action} permissions`}
                                                            >
                                                                <ActionIcon size={14} />
                                                                <span>{action}</span>
                                                                <Badge
                                                                    variant={isFullySelected ? 'default' : 'outline'}
                                                                    className={`text-[10px] px-1.5 py-0 ${isFullySelected ? 'bg-white/20 text-white' : ''}`}
                                                                >
                                                                    {selectedCount}/{count}
                                                                </Badge>
                                                            </motion.button>
                                                        );
                                                    })}
                                                </div>

                                                {/* ReadOnly Overlay for Quick Toggles */}
                                                <ReadOnlyOverlay
                                                    visible={selectedRole?.asset_type === 'readonly'}
                                                    text="View Only"
                                                    variant="subtle"
                                                    overlayOpacity={0.3}
                                                />
                                            </motion.div>
                                        )}

                                        {/* Modules Grid */}
                                        <div className="space-y-4">
                                            {filteredAbilities.length > 0 ? (
                                                filteredAbilities.map((module, idx) => (
                                                    <ModuleAccordion
                                                        key={module.id}
                                                        module={module}
                                                        selectedPermIds={selectedPermIds}
                                                        onTogglePermission={togglePermission}
                                                        onSelectAll={() => selectAllInModule(module)}
                                                        onDeselectAll={() => deselectAllInModule(module)}
                                                        defaultExpanded={idx < 2}
                                                    />
                                                ))
                                            ) : (
                                                <Card className="py-16 flex flex-col items-center justify-center text-center border-dashed border-2">
                                                    <div className="p-4 rounded-full bg-muted/50 mb-4">
                                                        <Search size={32} className="text-muted-foreground" />
                                                    </div>
                                                    <h4 className="font-bold text-lg">No permissions found</h4>
                                                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                                        Try a different search term or clear your filters.
                                                    </p>
                                                    <Button
                                                        variant="ghost"
                                                        className="mt-4"
                                                        onClick={() => setSearchTerm('')}
                                                        leftIcon={<X size={16} />}
                                                    >
                                                        Clear search
                                                    </Button>
                                                </Card>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Create Role Modal */}
                            <Modal
                                isOpen={isCreateModalOpen}
                                onClose={() => {
                                    setIsCreateModalOpen(false);
                                    reset({ name: '', description: '' });
                                }}
                                title="Create Custom Role"
                                size="md"
                            >
                                <form onSubmit={handleSubmit(handleCreateRole)} className="space-y-5">
                                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                                        <div className="flex items-center gap-3 text-primary">
                                            <Sparkles size={20} />
                                            <p className="text-sm font-medium">
                                                Create a custom role to define specific access levels for unique user groups.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-semibold text-foreground mb-2 block">
                                                Role Name <span className="text-red-500">*</span>
                                            </label>
                                            <Input
                                                placeholder="e.g. Lab Assistant, Librarian, Registrar"
                                                {...register('name')}
                                                className="h-12"
                                                error={roleFormErrors.name?.message}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-foreground mb-2 block">
                                                Description
                                            </label>
                                            <textarea
                                                className="w-full h-28 rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                                                {...register('description')}
                                                placeholder="Describe what this role is responsible for..."
                                            />
                                            {roleFormErrors.description && (
                                                <p className="text-xs text-red-500 mt-1">{roleFormErrors.description.message}</p>
                                            )}
                                        </div>
                                    </div>

                                    <ModalFooter>
                                        <Button variant="ghost" type="button" onClick={() => setIsCreateModalOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={isRoleSubmitting}
                                            className="shadow-lg shadow-primary/20 min-w-[120px]"
                                            leftIcon={<Plus size={18} />}
                                        >
                                            Create Role
                                        </Button>
                                    </ModalFooter>
                                </form>
                            </Modal>
                        </motion.div>
                    )}

                    {/* ============================================================================ */}
                    {/* TAB CONTENT: Default Role Configuration */}
                    {/* ============================================================================ */}
                    {activeTab === 'defaults' && (
                        <motion.div
                            key="defaults-tab"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            {/* Info Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-green-500/20">
                                            <Globe size={18} className="text-green-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-green-700 dark:text-green-300">System Roles (Plan-Scoped)</h4>
                                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                                Permissions cached globally and shared across tenants with the same plan.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-purple-500/20">
                                            <Lock size={18} className="text-purple-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-purple-700 dark:text-purple-300">Custom Roles (Tenant-Scoped)</h4>
                                            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                                Permissions cached separately for your institution only.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Role Config Grid */}
                            {configLoading ? (
                                <div className="flex items-center justify-center py-16">
                                    <LoadingSpinner size="lg" />
                                </div>
                            ) : roleConfigs.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {roleConfigs.map((config, idx) => {
                                        const userTypePreset = ROLE_PRESETS[config.defaultRole?.name || ''] || {
                                            icon: Users,
                                            color: 'text-slate-500',
                                            bgColor: 'bg-slate-500/10',
                                            gradient: 'from-slate-500/20 to-slate-600/5',
                                            headerGradient: 'from-slate-600 via-slate-500 to-gray-400'
                                        };
                                        const Icon = userTypePreset.icon;

                                        return (
                                            <motion.div
                                                key={config.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className="group relative overflow-hidden rounded-2xl border border-border/30 bg-card hover:border-primary/30 hover:shadow-xl transition-all duration-300"
                                            >
                                                {/* Header */}
                                                <div className={`relative p-4 bg-gradient-to-r ${userTypePreset.headerGradient} text-white`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                                                                <Icon size={20} />
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-lg capitalize">{config.user_type}</h3>
                                                                <p className="text-xs text-white/80">Default role assignment</p>
                                                            </div>
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] ${config.is_system_role ? 'bg-white/20 text-white border-white/30' : 'bg-purple-500/20 text-white border-purple-300/50'}`}
                                                        >
                                                            {config.is_system_role ? (
                                                                <><Globe size={10} className="mr-1" /> System</>
                                                            ) : (
                                                                <><Lock size={10} className="mr-1" /> Custom</>
                                                            )}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className="p-5 space-y-4">
                                                    {/* Current Default Role */}
                                                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg ${userTypePreset.bgColor}`}>
                                                                <Shield size={16} className={userTypePreset.color} />
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
                                                                ? 'Cached globally (shared)'
                                                                : 'Cached per-tenant (isolated)'}
                                                        </p>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex gap-2 pt-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingConfig(config);
                                                                setIsEditConfigModalOpen(true);
                                                            }}
                                                            className="flex-1 gap-2"
                                                            leftIcon={<Settings size={14} />}
                                                        >
                                                            Change
                                                        </Button>
                                                        {config.previous_role_id && (
                                                            <Tooltip content="Migrate users from previous role">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleMigrateUsers(config)}
                                                                    className="gap-2 text-amber-600 hover:bg-amber-500/10"
                                                                    leftIcon={<ArrowRight size={14} />}
                                                                >
                                                                    Migrate
                                                                </Button>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <Card className="py-16 flex flex-col items-center justify-center text-center border-dashed border-2">
                                    <div className="p-4 rounded-full bg-muted/50 mb-4">
                                        <Settings size={32} className="text-muted-foreground" />
                                    </div>
                                    <h4 className="font-bold text-lg">No Role Configurations</h4>
                                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                        Initialize default role configurations to manage role assignments.
                                    </p>
                                    <Button
                                        className="mt-6"
                                        onClick={initializeRoleConfigs}
                                        leftIcon={<RefreshCw size={16} />}
                                    >
                                        Initialize Now
                                    </Button>
                                </Card>
                            )}

                            {/* Edit Role Config Modal */}
                            <Modal
                                isOpen={isEditConfigModalOpen}
                                onClose={() => setIsEditConfigModalOpen(false)}
                                title={`Change Default Role for ${editingConfig?.user_type || 'User Type'}`}
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
                                                    When you change the default role, <strong>existing users keep their current role</strong>.
                                                    Only new users will be assigned the new default.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Role Selection */}
                                    <div className="space-y-3">
                                        <label className="text-sm font-semibold">Select Default Role</label>
                                        <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-2">
                                            {roles.map(role => {
                                                const isSelected = role.id === editingConfig?.default_role_id;
                                                const isSystem = role.asset_type !== 'custom';
                                                const preset = ROLE_PRESETS[role.name] || { icon: Shield };

                                                return (
                                                    <button
                                                        key={role.id}
                                                        onClick={() => {
                                                            if (editingConfig) {
                                                                handleSaveRoleConfig(role.id, false);
                                                            }
                                                        }}
                                                        className={`
                                                            relative p-4 rounded-xl border-2 text-left transition-all duration-200
                                                            ${isSelected
                                                                ? 'border-primary bg-primary/5 shadow-lg'
                                                                : 'border-border/50 hover:border-primary/30 hover:bg-muted/30'}
                                                        `}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-2.5 rounded-lg ${isSelected ? 'bg-primary text-white' : 'bg-muted/50'}`}>
                                                                    <Shield size={18} />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <h4 className="font-bold">{role.name}</h4>
                                                                        {isSelected && (
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
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[9px] ${isSystem ? 'border-green-500/50 text-green-600' : 'border-purple-500/50 text-purple-600'}`}
                                                            >
                                                                {isSystem ? 'Global' : 'Tenant'}
                                                            </Badge>
                                                        </div>

                                                        {isSelected && (
                                                            <div className="absolute top-2 right-2">
                                                                <div className="p-1 rounded-full bg-primary text-white">
                                                                    <CheckCircle2 size={14} />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <ModalFooter>
                                    <Button variant="ghost" onClick={() => setIsEditConfigModalOpen(false)} disabled={configSaving}>
                                        Close
                                    </Button>
                                </ModalFooter>
                            </Modal>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
