import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Save,
    Loader2,
    Users,
    Shield,
    Settings,
    ToggleLeft,
    ToggleRight,
    Search,
    CheckCircle2,
    Circle,
    Building2,
    ChevronDown,
    ChevronRight,
    Plus,
    Eye,
    Edit3,
    Trash2,
    Package,
    Zap,
    RotateCcw,
    CheckSquare,
    Square,
    Lock,
    Boxes
} from 'lucide-react';
import {
    Modal,
    ModalFooter,
    Button,
    Input,
    Badge,
    SearchableSelect,
    InstitutionTypeSelect,
    SystemRoleSelect,
} from '@erp/common';
import {
    useCreateRoleTemplateMutation,
    useUpdateRoleTemplateMutation,
    type RoleTemplate,
} from '../services/endpoints/role-templates';
import { useGetSystemConfigQuery } from '../services/endpoints/system-config';
import { useGetFeaturesQuery, useGetModulesQuery } from '../services/endpoints/access-control';
import { useGetPlansQuery, useGetPlanQuery } from '../services/endpoints/plans';
import type { Module, Feature, Permission } from '../services/types';

interface RoleTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    template?: RoleTemplate;
}

// Action types for quick selection
const ACTION_TYPES = [
    { key: 'view', label: 'View', icon: Eye, color: 'text-blue-500' },
    { key: 'create', label: 'Create', icon: Plus, color: 'text-green-500' },
    { key: 'update', label: 'Update', icon: Edit3, color: 'text-amber-500' },
    { key: 'delete', label: 'Delete', icon: Trash2, color: 'text-red-500' },
    { key: 'manage', label: 'Manage', icon: Settings, color: 'text-purple-500' },
];

// Module Card with permissions
const ModuleCard: React.FC<{
    module: Module;
    features: Feature[];
    selectedPermissions: Set<string>;
    availablePermissionIds?: Set<string>;
    onTogglePermission: (permId: string) => void;
    onSelectAllInModule: (moduleId: string) => void;
    onClearAllInModule: (moduleId: string) => void;
    depth?: number;
}> = ({
    module,
    features,
    selectedPermissions,
    availablePermissionIds,
    onTogglePermission,
    onSelectAllInModule,
    onClearAllInModule,
    depth = 0
}) => {
        const [isExpanded, setIsExpanded] = useState(false);

        const moduleFeatures = useMemo(() => features.filter(f => f.module_id === module.id), [features, module.id]);

        const directPermissions = useMemo(() => {
            let perms = moduleFeatures.flatMap(f => f.permissions || []);
            if (availablePermissionIds) {
                perms = perms.filter(p => availablePermissionIds.has(p.id));
            }
            return perms;
        }, [moduleFeatures, availablePermissionIds]);

        // Calculate totals for the entire branch
        const getBranchStats = (mod: Module): { total: number; selected: number } => {
            let perms = features.filter(f => f.module_id === mod.id).flatMap(f => f.permissions || []);
            if (availablePermissionIds) {
                perms = perms.filter(p => availablePermissionIds.has(p.id));
            }

            let total = perms.length;
            let selected = perms.filter(p => selectedPermissions.has(p.id)).length;

            mod.children?.forEach(child => {
                const stats = getBranchStats(child);
                total += stats.total;
                selected += stats.selected;
            });
            return { total, selected };
        };

        const branchStats = useMemo(() => getBranchStats(module), [module, features, selectedPermissions, availablePermissionIds]);

        if (branchStats.total === 0 && (!module.children || module.children.length === 0)) return null;

        return (
            <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`
                rounded-2xl border-2 transition-all overflow-hidden mb-3
                ${branchStats.selected > 0
                        ? 'border-primary/40 bg-primary/5 shadow-lg shadow-primary/10'
                        : 'border-border/50 bg-card hover:border-border'}
            `}
                style={{ marginLeft: `${depth * 1.5}rem` }}
            >
                {/* Module Header */}
                <div
                    className="p-4 cursor-pointer flex items-center justify-between gap-4"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`
                        p-2.5 rounded-xl shrink-0 transition-colors
                        ${branchStats.selected > 0 ? 'bg-primary/15 text-primary' : 'bg-muted/50 text-muted-foreground'}
                    `}>
                            <Package size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className={`font-semibold text-sm truncate ${branchStats.selected > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {module.name}
                            </h4>
                            <p className="text-xs text-muted-foreground truncate">{moduleFeatures.length} direct features</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {branchStats.total > 0 && (
                            <Badge variant="success" className="text-[10px] px-2 h-5">
                                {branchStats.selected}/{branchStats.total}
                            </Badge>
                        )}
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 pb-4 space-y-4 bg-muted/5 border-t border-border/50 pt-4">
                                {/* Quick Actions */}
                                <div className="flex items-center gap-2 p-2 bg-background/50 rounded-xl border border-border/50">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onSelectAllInModule(module.id); }}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                                    >
                                        <CheckSquare size={12} />
                                        Select Module
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onClearAllInModule(module.id); }}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                                    >
                                        <RotateCcw size={12} />
                                        Clear
                                    </button>
                                </div>

                                {/* Features */}
                                {moduleFeatures.map(feature => {
                                    let perms = feature.permissions || [];
                                    if (availablePermissionIds) {
                                        perms = perms.filter(p => availablePermissionIds.has(p.id));
                                    }
                                    if (perms.length === 0) return null;

                                    return (
                                        <div key={feature.id} className="space-y-2">
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                <Settings size={12} />
                                                {feature.name}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                                {perms.map(perm => (
                                                    <button
                                                        key={perm.id}
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); onTogglePermission(perm.id); }}
                                                        className={`
                                                        flex items-center gap-2 p-2.5 rounded-xl text-xs text-left transition-all border
                                                        ${selectedPermissions.has(perm.id)
                                                                ? 'bg-primary/10 text-primary border-primary/30'
                                                                : 'bg-background text-muted-foreground border-border/50 hover:border-border'}
                                                    `}
                                                    >
                                                        {selectedPermissions.has(perm.id)
                                                            ? <CheckCircle2 size={14} className="text-primary" />
                                                            : <Circle size={14} className="opacity-40" />}
                                                        <span className="truncate">{perm.action || perm.key}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Child Modules */}
                                {module.children && module.children.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <Boxes size={12} />
                                            Sub-Modules
                                        </p>
                                        {module.children.map(child => (
                                            <ModuleCard
                                                key={child.id}
                                                module={child}
                                                features={features}
                                                selectedPermissions={selectedPermissions}
                                                availablePermissionIds={availablePermissionIds}
                                                onTogglePermission={onTogglePermission}
                                                onSelectAllInModule={onSelectAllInModule}
                                                onClearAllInModule={onClearAllInModule}
                                                depth={depth + 1}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    };

export const RoleTemplateModal: React.FC<RoleTemplateModalProps> = ({ isOpen, onClose, template }) => {
    const isEdit = !!template;

    // Form state
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [tenantType, setTenantType] = useState<string>('all');
    const [assetType, setAssetType] = useState<string>('public');
    const [planId, setPlanId] = useState<string>('');
    const [roleType, setRoleType] = useState<string>('');
    const [isActive, setIsActive] = useState(true);
    const [sortOrder, setSortOrder] = useState(0);
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    // API hooks
    const [createTemplate, { isLoading: isCreating }] = useCreateRoleTemplateMutation();
    const [updateTemplate, { isLoading: isUpdating }] = useUpdateRoleTemplateMutation();
    const { data: featuresData } = useGetFeaturesQuery();
    const { data: modulesData } = useGetModulesQuery();
    const { data: plansData } = useGetPlansQuery();
    const { data: selectedPlanData, isFetching: isPlanLoading } = useGetPlanQuery(planId, { skip: !planId });

    const features = featuresData?.data || [];
    const modules = modulesData?.data || [];
    const plans = plansData?.data || [];
    const selectedPlan = selectedPlanData?.data;

    // Get available permission IDs based on selected plan
    const availablePermissionIds = useMemo(() => {
        if (!planId || !selectedPlan) return undefined; // undefined = all permissions available
        // Plan should have permission_ids or permissions array
        const planPermIds = selectedPlan.permission_ids || selectedPlan.permissions?.map((p: Permission) => p.id) || [];
        return new Set<string>(planPermIds);
    }, [planId, selectedPlan]);

    // All permissions (for action-based selection)
    const allPermissions = useMemo(() => {
        let perms = features.flatMap(f => f.permissions || []);
        if (availablePermissionIds) {
            perms = perms.filter(p => availablePermissionIds.has(p.id));
        }
        return perms;
    }, [features, availablePermissionIds]);

    // Dynamic config data
    const { data: configData } = useGetSystemConfigQuery(undefined);
    const config = configData?.data;

    // Filter modules based on search
    const filteredModules = useMemo(() => {
        if (!searchQuery) return modules;
        const query = searchQuery.toLowerCase();

        const filterRecursive = (mods: Module[]): Module[] => {
            return mods.filter(m => {
                const matches = m.name.toLowerCase().includes(query) ||
                    m.description?.toLowerCase().includes(query) ||
                    features.some(f =>
                        f.module_id === m.id && (
                            f.name.toLowerCase().includes(query) ||
                            f.permissions?.some(p => p.action?.toLowerCase().includes(query) || p.key?.toLowerCase().includes(query))
                        )
                    );
                const childrenMatch = m.children && filterRecursive(m.children).length > 0;
                return matches || childrenMatch;
            });
        };

        return filterRecursive(modules);
    }, [modules, features, searchQuery]);

    // Initialize form when modal opens
    useEffect(() => {
        if (isOpen) {
            if (template) {
                setName(template.name);
                setSlug(template.slug);
                setDescription(template.description || '');
                setTenantType(template.tenant_type || 'all');
                setAssetType(template.asset_type || 'public');
                setPlanId(template.plan_id || '');
                setRoleType(template.role_type || '');
                setIsActive(template.is_active);
                setSortOrder(template.sort_order || 0);
                setSelectedPermissions(new Set(template.permission_ids || []));
            } else {
                setName('');
                setSlug('');
                setDescription('');
                setTenantType('all');
                setAssetType('public');
                setPlanId('');
                setRoleType('');
                setIsActive(true);
                setSortOrder(0);
                setSelectedPermissions(new Set());
            }
            setSearchQuery('');
        }
    }, [template, isOpen]);

    // Auto-generate slug from name
    useEffect(() => {
        if (!isEdit && name) {
            setSlug(name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
        }
    }, [name, isEdit]);

    const togglePermission = useCallback((permId: string) => {
        setSelectedPermissions(prev => {
            const next = new Set(prev);
            if (next.has(permId)) {
                next.delete(permId);
            } else {
                next.add(permId);
            }
            return next;
        });
    }, []);

    const selectAllInModule = useCallback((moduleId: string) => {
        const findModuleRecursive = (mods: Module[], id: string): Module | undefined => {
            for (const m of mods) {
                if (m.id === id) return m;
                if (m.children) {
                    const found = findModuleRecursive(m.children, id);
                    if (found) return found;
                }
            }
            return undefined;
        };

        const targetModule = findModuleRecursive(modules, moduleId);
        if (!targetModule) return;

        const allPermIds: string[] = [];
        const collectRecursive = (mod: Module) => {
            const moduleFeatures = features.filter(f => f.module_id === mod.id);
            let perms = moduleFeatures.flatMap(f => f.permissions || []).map(p => p.id);
            if (availablePermissionIds) {
                perms = perms.filter(id => availablePermissionIds.has(id));
            }
            allPermIds.push(...perms);
            if (mod.children) {
                mod.children.forEach(collectRecursive);
            }
        };

        collectRecursive(targetModule);

        setSelectedPermissions(prev => {
            const next = new Set(prev);
            allPermIds.forEach(id => next.add(id));
            return next;
        });
    }, [modules, features, availablePermissionIds]);

    const clearAllInModule = useCallback((moduleId: string) => {
        const findModuleRecursive = (mods: Module[], id: string): Module | undefined => {
            for (const m of mods) {
                if (m.id === id) return m;
                if (m.children) {
                    const found = findModuleRecursive(m.children, id);
                    if (found) return found;
                }
            }
            return undefined;
        };

        const targetModule = findModuleRecursive(modules, moduleId);
        if (!targetModule) return;

        const allPermIds: string[] = [];
        const collectRecursive = (mod: Module) => {
            const moduleFeatures = features.filter(f => f.module_id === mod.id);
            const perms = moduleFeatures.flatMap(f => f.permissions || []).map(p => p.id);
            allPermIds.push(...perms);
            if (mod.children) {
                mod.children.forEach(collectRecursive);
            }
        };

        collectRecursive(targetModule);

        setSelectedPermissions(prev => {
            const next = new Set(prev);
            allPermIds.forEach(id => next.delete(id));
            return next;
        });
    }, [modules, features]);

    // Bulk action handlers
    const selectAllPermissions = useCallback(() => {
        const permIds = allPermissions.map(p => p.id);
        setSelectedPermissions(new Set(permIds));
    }, [allPermissions]);

    const clearAllPermissions = useCallback(() => {
        setSelectedPermissions(new Set());
    }, []);

    const selectByAction = useCallback((actionKeyword: string) => {
        const matchingPerms = allPermissions.filter(p =>
            p.action?.toLowerCase().includes(actionKeyword) ||
            p.key?.toLowerCase().includes(actionKeyword)
        );
        setSelectedPermissions(prev => {
            const next = new Set(prev);
            matchingPerms.forEach(p => next.add(p.id));
            return next;
        });
    }, [allPermissions]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload = {
            name,
            slug,
            description,
            tenant_type: tenantType,
            asset_type: assetType,
            plan_id: planId || undefined,
            role_type: roleType || undefined,
            is_active: isActive,
            sort_order: sortOrder,
            permission_ids: Array.from(selectedPermissions),
        };

        try {
            if (isEdit && template) {
                await updateTemplate({ id: template.id, data: payload }).unwrap();
            } else {
                await createTemplate(payload).unwrap();
            }
            onClose();
        } catch (err) {
            console.error('Failed to save role template:', err);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Edit Role Template' : 'Create Role Template'}
            size="5xl"
            closeOnOutsideClick={false}
            closeOnEscape={false}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative flex items-start gap-4">
                        <div className="p-3 bg-primary/15 rounded-2xl text-primary shadow-lg shadow-primary/20">
                            <Users size={28} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-foreground">Role Template</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Define a role with default permissions that will be applied when new tenants are created.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Left Column - Basic Info */}
                    <div className="lg:col-span-2 space-y-5">
                        <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
                            <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                                <Settings size={16} className="text-primary" />
                                Template Details
                            </h4>

                            <div>
                                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Role Name *</label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Teacher, Student, Admin" required className="h-11" />
                            </div>

                            <div>
                                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Slug *</label>
                                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. teacher, student" required className="h-10" />
                            </div>

                            <div>
                                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Description</label>
                                <textarea
                                    className="w-full h-16 rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe this role..."
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                                <div className="flex items-center gap-2">
                                    {isActive ? <ToggleRight size={20} className="text-success" /> : <ToggleLeft size={20} className="text-muted-foreground" />}
                                    <span className="text-sm font-medium">Active</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsActive(!isActive)}
                                    className={`w-12 h-6 rounded-full transition-all relative ${isActive ? 'bg-success' : 'bg-muted'}`}
                                >
                                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isActive ? 'left-[26px]' : 'left-0.5'}`} />
                                </button>
                            </div>
                        </div>

                        {/* Tenant Type & Plan */}
                        <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
                            <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                                <Building2 size={16} className="text-primary" />
                                Targeting
                            </h4>
                            <div>
                                <InstitutionTypeSelect
                                    value={tenantType}
                                    onChange={(val) => setTenantType(val)}
                                    institutionTypes={config?.institutionTypes}
                                />
                            </div>
                            <div>
                                <SystemRoleSelect
                                    value={roleType}
                                    onChange={(val) => setRoleType(val)}
                                    tenantType={tenantType}
                                    roleTypes={config?.roleTypes}
                                    institutionRoles={config?.institutionRoles}
                                />
                            </div>
                            <div>
                                <SearchableSelect
                                    label="Asset Type"
                                    value={assetType}
                                    onChange={(val) => setAssetType(val)}
                                    options={[
                                        { value: 'public', label: 'Public (Template)' },
                                        { value: 'readonly', label: 'Read-only (System)' },
                                        { value: 'custom', label: 'Custom (Tenant)' },
                                    ]}
                                />
                                <p className="text-[10px] text-muted-foreground mt-1">Public roles are cached globally per-plan. Custom roles are cached per-tenant.</p>
                            </div>
                            <div>
                                <SearchableSelect
                                    label="Link to Plan"
                                    value={planId}
                                    onChange={(val) => setPlanId(val)}
                                    placeholder="All Plans (Show All Permissions)"
                                    options={plans.map(plan => ({
                                        value: plan.id,
                                        label: plan.name,
                                        description: plan.description
                                    }))}
                                />
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    {planId ? 'Only permissions available in this plan will be shown.' : 'Shows all available permissions.'}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Sort Order</label>
                                <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} className="h-10" />
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Permission Selection */}
                    <div className="lg:col-span-3 space-y-4">
                        {/* Bulk Actions Header */}
                        <div className="bg-gradient-to-r from-primary/5 to-transparent rounded-2xl border border-primary/20 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Zap size={16} className="text-primary" />
                                    <span className="text-sm font-semibold">Quick Actions</span>
                                    <Badge variant="info" className="text-[10px] h-5">
                                        {selectedPermissions.size} selected
                                    </Badge>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={selectAllPermissions}
                                        className="px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearAllPermissions}
                                        className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>

                            {/* Action Type Buttons */}
                            <div className="flex flex-wrap gap-2">
                                {ACTION_TYPES.map(action => {
                                    const Icon = action.icon;
                                    const count = allPermissions.filter(p =>
                                        p.action?.toLowerCase().includes(action.key) ||
                                        p.key?.toLowerCase().includes(action.key)
                                    ).length;

                                    return (
                                        <button
                                            key={action.key}
                                            type="button"
                                            onClick={() => selectByAction(action.key)}
                                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-background border border-border rounded-lg hover:bg-muted/50 hover:border-primary/30 transition-all group"
                                        >
                                            <Icon size={14} className={action.color} />
                                            <span>All {action.label}</span>
                                            <Badge variant="default" className="text-[10px] h-4 px-1">
                                                {count}
                                            </Badge>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search modules, features, or permissions..."
                                className="pl-9 h-10"
                            />
                        </div>

                        {/* Modules List */}
                        <div className="space-y-3">
                            {isPlanLoading ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Loader2 size={32} className="mx-auto mb-3 animate-spin opacity-50" />
                                    <p className="text-sm">Loading plan permissions...</p>
                                </div>
                            ) : filteredModules.length > 0 ? (
                                filteredModules.map(module => (
                                    <ModuleCard
                                        key={module.id}
                                        module={module}
                                        features={features}
                                        selectedPermissions={selectedPermissions}
                                        availablePermissionIds={availablePermissionIds}
                                        onTogglePermission={togglePermission}
                                        onSelectAllInModule={selectAllInModule}
                                        onClearAllInModule={clearAllInModule}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Shield size={40} className="mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">No modules found</p>
                                    <p className="text-xs mt-1">Try a different search term.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>


                <ModalFooter className="justify-between">
                    <p className="text-xs text-muted-foreground hidden sm:block">
                        {selectedPermissions.size > 0
                            ? `${selectedPermissions.size} permission${selectedPermissions.size > 1 ? 's' : ''} will be assigned to this role.`
                            : 'Select permissions to assign to this role template.'}
                    </p>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Button variant="ghost" type="button" onClick={onClose} className="flex-1 sm:flex-none">Cancel</Button>
                        <Button
                            type="submit"
                            disabled={isCreating || isUpdating || !name.trim() || !slug.trim()}
                            className="gap-2 flex-1 sm:flex-none min-w-[160px]"
                        >
                            {(isCreating || isUpdating) ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {isEdit ? 'Update Template' : 'Create Template'}
                        </Button>
                    </div>
                </ModalFooter>
            </form>
        </Modal>
    );
};

export default RoleTemplateModal;
