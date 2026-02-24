import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Save,
    Check,
    Loader2,
    CreditCard,
    Package,
    Shield,
    ChevronDown,
    ChevronRight,
    DollarSign,
    ToggleLeft,
    ToggleRight,
    Search,
    Boxes,
    Info,
    Sparkles,
} from 'lucide-react';
import {
    Modal,
    ModalFooter,
    Button,
    Input,
    Badge,
} from '@erp/common';
import {
    useCreatePlanMutation,
    useUpdatePlanMutation,
    useGetModulesQuery,
    useGetPermissionsQuery,
    useGetFeaturesQuery,
} from '../services/endpoints';
import {
    useGetAccessBundlesQuery,
    type AccessBundle,
} from '../services/endpoints/access-bundles';
import type { Module, Feature, Plan } from '../services/types';

interface PlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan?: Plan;
}

// Tab type for navigation
type TabType = 'details' | 'modules' | 'permissions';

// Module Card with expandable permissions
const ModuleCard: React.FC<{
    module: Module;
    features: Feature[];
    selectedModules: string[];
    selectedPermissions: string[];
    onToggleModule: (moduleId: string) => void;
    onTogglePermission: (permId: string) => void;
    depth?: number;
}> = ({
    module,
    features,
    selectedModules,
    selectedPermissions,
    onToggleModule,
    onTogglePermission,
    depth = 0
}) => {
        const [isExpanded, setIsExpanded] = useState(false);
        const isSelected = selectedModules.includes(module.id);

        const moduleFeatures = useMemo(() =>
            features.filter(f => f.module_id === module.id),
            [features, module.id]
        );

        const directPermissions = useMemo(() =>
            moduleFeatures.flatMap(f => f.permissions || []),
            [moduleFeatures]
        );

        const selectedDirect = directPermissions.filter(p => selectedPermissions.includes(p.id)).length;

        // Calculate totals for the entire branch
        const getBranchStats = (mod: Module): { total: number; selected: number } => {
            let total = (features.filter(f => f.module_id === mod.id).flatMap(f => f.permissions || [])).length;
            let selected = (features.filter(f => f.module_id === mod.id).flatMap(f => f.permissions || [])).filter(p => selectedPermissions.includes(p.id)).length;

            mod.children?.forEach(child => {
                const stats = getBranchStats(child);
                total += stats.total;
                selected += stats.selected;
            });
            return { total, selected };
        };

        const branchStats = useMemo(() => getBranchStats(module), [module, features, selectedPermissions]);

        return (
            <motion.div
                layout
                className={`
                rounded-xl border-2 transition-all overflow-hidden mb-2
                ${isSelected
                        ? 'border-primary/40 bg-primary/5 shadow-md shadow-primary/10'
                        : 'border-border/50 bg-card hover:border-border'}
            `}
                style={{ marginLeft: `${depth * 1.5}rem` }}
            >
                <div
                    className="p-3 cursor-pointer flex items-center justify-between gap-3"
                    onClick={() => onToggleModule(module.id)}
                >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`
                        w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all
                        ${isSelected ? 'bg-primary text-white' : 'bg-muted/50 text-muted-foreground'}
                    `}>
                            {isSelected ? <Check size={12} /> : null}
                        </div>
                        <div className={`
                        p-2 rounded-lg shrink-0 transition-colors
                        ${isSelected ? 'bg-primary/15 text-primary' : 'bg-muted/30 text-muted-foreground'}
                    `}>
                            <Package size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {module.name}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {isSelected && (directPermissions.length > 0 || (module.children && module.children.length > 0)) && (
                            <>
                                <Badge variant="success" className="text-[9px] px-1.5 h-4">
                                    {branchStats.selected}/{branchStats.total}
                                </Badge>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsExpanded(!isExpanded);
                                    }}
                                    className="p-1 rounded hover:bg-muted/50 text-muted-foreground"
                                >
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {isSelected && isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="px-3 pb-3 pt-1 border-t border-border/50 bg-muted/5 overflow-y-auto max-h-[400px]">
                                {/* Direct Permissions */}
                                {directPermissions.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1 uppercase tracking-wider font-semibold">
                                            <Shield size={10} />
                                            Direct Permissions ({selectedDirect}/{directPermissions.length})
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                            {directPermissions.map(perm => (
                                                <button
                                                    key={perm.id}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onTogglePermission(perm.id);
                                                    }}
                                                    className={`
                                                    flex items-center gap-2 p-2 rounded-lg text-[11px] text-left transition-all border
                                                    ${selectedPermissions.includes(perm.id)
                                                            ? 'bg-primary/10 border-primary/20 text-primary'
                                                            : 'bg-background border-border/50 text-muted-foreground hover:border-border'}
                                                `}
                                                >
                                                    <div className={`
                                                    w-3.5 h-3.5 rounded flex items-center justify-center shrink-0
                                                    ${selectedPermissions.includes(perm.id) ? 'bg-primary text-white' : 'bg-muted/50'}
                                                `}>
                                                        {selectedPermissions.includes(perm.id) && <Check size={8} />}
                                                    </div>
                                                    <span className="truncate font-medium">{perm.action || perm.key}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Child Modules */}
                                {module.children && module.children.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1 uppercase tracking-wider font-semibold">
                                            <Boxes size={10} />
                                            Sub-Modules
                                        </p>
                                        {module.children.map(child => (
                                            <ModuleCard
                                                key={child.id}
                                                module={child}
                                                features={features}
                                                selectedModules={selectedModules}
                                                selectedPermissions={selectedPermissions}
                                                onToggleModule={onToggleModule}
                                                onTogglePermission={onTogglePermission}
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

export const PlanModal: React.FC<PlanModalProps> = ({ isOpen, onClose, plan }) => {
    const isEdit = !!plan;
    const [activeTab, setActiveTab] = useState<TabType>('details');
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [priceMonthly, setPriceMonthly] = useState('0');
    const [priceYearly, setPriceYearly] = useState('0');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [selectedModules, setSelectedModules] = useState<string[]>([]);
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [selectedBundles, setSelectedBundles] = useState<string[]>([]);
    const [moduleSearch, setModuleSearch] = useState('');
    const [permissionSearch, setPermissionSearch] = useState('');

    const [createPlan, { isLoading: isCreating }] = useCreatePlanMutation();
    const [updatePlan, { isLoading: isUpdating }] = useUpdatePlanMutation();
    const { data: modulesData } = useGetModulesQuery();
    const { data: permissionsData } = useGetPermissionsQuery();
    const { data: featuresData } = useGetFeaturesQuery();
    const { data: accessBundlesData } = useGetAccessBundlesQuery();

    const modules = modulesData?.data || [];
    const permissions = permissionsData?.data || [];
    const features = featuresData?.data || [];
    const accessBundles = accessBundlesData?.data?.filter(b => b.is_active) || [];

    // Filter modules and permissions
    const filteredModules = useMemo(() => {
        if (!moduleSearch) return modules;

        const filterRecursive = (mods: Module[]): Module[] => {
            return mods.filter(m => {
                const matches = m.name.toLowerCase().includes(moduleSearch.toLowerCase());
                const childrenMatch = m.children && filterRecursive(m.children).length > 0;
                return matches || childrenMatch;
            });
        };

        return filterRecursive(modules);
    }, [modules, moduleSearch]);

    const filteredPermissions = useMemo(() => {
        if (!permissionSearch) return permissions;
        return permissions.filter(p =>
            p.key.toLowerCase().includes(permissionSearch.toLowerCase()) ||
            p.action?.toLowerCase().includes(permissionSearch.toLowerCase())
        );
    }, [permissions, permissionSearch]);

    useEffect(() => {
        if (isOpen) {
            if (plan) {
                setName(plan.name);
                setSlug(plan.slug);
                setPriceMonthly(String(plan.price_monthly));
                setPriceYearly(String(plan.price_yearly));
                setDescription(plan.description);
                setIsActive(plan.is_active);
                setSelectedModules(plan.modules?.map(m => m.id) || []);
                setSelectedPermissions(plan.permissions?.map(p => p.id) || []);
            } else {
                setName('');
                setSlug('');
                setPriceMonthly('0');
                setPriceYearly('0');
                setDescription('');
                setIsActive(true);
                setSelectedModules([]);
                setSelectedPermissions([]);
            }
            setActiveTab('details');
            setModuleSearch('');
            setPermissionSearch('');
            setSelectedBundles([]);
        }
    }, [plan, isOpen]);

    // Auto-generate slug from name
    useEffect(() => {
        if (!isEdit && name) {
            setSlug(name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
        }
    }, [name, isEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            name,
            slug,
            price_monthly: Number(priceMonthly),
            price_yearly: Number(priceYearly),
            description,
            is_active: isActive,
            module_ids: selectedModules,
            permission_ids: selectedPermissions,
        };

        try {
            if (isEdit && plan) {
                await updatePlan({ id: plan.id, data: payload }).unwrap();
            } else {
                await createPlan(payload).unwrap();
            }
            onClose();
        } catch (err) {
            console.error('Failed to save plan:', err);
        }
    };

    const toggleModule = useCallback((id: string) => {
        setSelectedModules(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    }, []);

    const togglePermission = useCallback((id: string) => {
        setSelectedPermissions(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    }, []);

    const toggleBundle = useCallback((bundle: AccessBundle) => {
        const isSelected = selectedBundles.includes(bundle.id);

        if (isSelected) {
            // Remove bundle and its modules/permissions
            setSelectedBundles(prev => prev.filter(id => id !== bundle.id));
            if (bundle.module_ids?.length) {
                setSelectedModules(prev => prev.filter(id => !bundle.module_ids.includes(id)));
            }
            if (bundle.permission_ids?.length) {
                setSelectedPermissions(prev => prev.filter(id => !bundle.permission_ids.includes(id)));
            }
        } else {
            // Add bundle and its modules/permissions
            setSelectedBundles(prev => [...prev, bundle.id]);
            if (bundle.module_ids?.length) {
                setSelectedModules(prev => Array.from(new Set([...prev, ...bundle.module_ids])));
            }
            if (bundle.permission_ids?.length) {
                setSelectedPermissions(prev => Array.from(new Set([...prev, ...bundle.permission_ids])));
            }
        }
    }, [selectedBundles]);

    const selectAllModules = useCallback(() => {
        const allIds: string[] = [];
        const collectRecursive = (mods: Module[]) => {
            mods.forEach(m => {
                allIds.push(m.id);
                if (m.children) collectRecursive(m.children);
            });
        };
        collectRecursive(modules);
        setSelectedModules(allIds);
    }, [modules]);

    const clearAllModules = useCallback(() => setSelectedModules([]), []);
    const selectAllPermissions = useCallback(() => setSelectedPermissions(permissions.map(p => p.id)), [permissions]);
    const clearAllPermissions = useCallback(() => setSelectedPermissions([]), []);

    const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
        { id: 'details', label: 'Details', icon: <CreditCard size={16} /> },
        { id: 'modules', label: 'Modules', icon: <Package size={16} /> },
        { id: 'permissions', label: 'Permissions', icon: <Shield size={16} /> },
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title=""
            size="4xl"
            closeOnOutsideClick={false}
            closeOnEscape={false}
            preventNavigation={true}
            preventReload={true}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20 p-5">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/15 rounded-2xl text-primary shadow-lg shadow-primary/20">
                                <CreditCard size={28} />
                            </div>
                            <div>
                                <h2 className="font-bold text-xl text-foreground">
                                    {isEdit ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
                                </h2>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Configure pricing, modules, and permissions
                                </p>
                            </div>
                        </div>
                        {/* Summary Badges */}
                        <div className="flex items-center gap-2">
                            <Badge variant="default" className="px-2.5 py-1">
                                <Package size={12} className="mr-1" />
                                {selectedModules.length} Modules
                            </Badge>
                            <Badge variant="info" className="px-2.5 py-1">
                                <Shield size={12} className="mr-1" />
                                {selectedPermissions.length} Permissions
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-xl border border-border/50">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                                ${activeTab === tab.id
                                    ? 'bg-background text-primary shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'}
                            `}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {/* Details Tab */}
                        {activeTab === 'details' && (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                            >
                                {/* Basic Info */}
                                <div className="space-y-4 bg-card rounded-2xl border border-border/50 p-5">
                                    <h3 className="font-semibold text-sm flex items-center gap-2">
                                        <Info size={16} className="text-primary" />
                                        Basic Information
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Plan Name *</label>
                                            <Input
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="e.g. Pro Plan, Enterprise"
                                                required
                                                className="h-11"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Slug *</label>
                                            <Input
                                                value={slug}
                                                onChange={(e) => setSlug(e.target.value)}
                                                placeholder="e.g. pro-plan"
                                                required
                                                className="h-11 font-mono text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Description</label>
                                            <textarea
                                                className="w-full h-28 rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Describe what this plan offers..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Pricing & Status */}
                                <div className="space-y-4">
                                    <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
                                        <h3 className="font-semibold text-sm flex items-center gap-2">
                                            <DollarSign size={16} className="text-success" />
                                            Pricing
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Monthly ($)</label>
                                                <div className="relative">
                                                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                    <Input
                                                        type="number"
                                                        value={priceMonthly}
                                                        onChange={(e) => setPriceMonthly(e.target.value)}
                                                        className="h-11 pl-8"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Yearly ($)</label>
                                                <div className="relative">
                                                    <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                    <Input
                                                        type="number"
                                                        value={priceYearly}
                                                        onChange={(e) => setPriceYearly(e.target.value)}
                                                        className="h-11 pl-8"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        {Number(priceYearly) > 0 && Number(priceMonthly) > 0 && (
                                            <div className="flex items-center gap-2 p-2 bg-success/10 border border-success/20 rounded-lg">
                                                <Sparkles size={14} className="text-success" />
                                                <span className="text-xs text-success font-medium">
                                                    {Math.round((1 - Number(priceYearly) / (Number(priceMonthly) * 12)) * 100)}% yearly savings
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-card rounded-2xl border border-border/50 p-5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {isActive ? (
                                                    <ToggleRight size={24} className="text-success" />
                                                ) : (
                                                    <ToggleLeft size={24} className="text-muted-foreground" />
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium">Active Status</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {isActive ? 'Available for new subscriptions' : 'Hidden from new signups'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setIsActive(!isActive)}
                                                className={`
                                                    w-12 h-6 rounded-full transition-all relative
                                                    ${isActive ? 'bg-success' : 'bg-muted'}
                                                `}
                                            >
                                                <div className={`
                                                    absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all
                                                    ${isActive ? 'left-[26px]' : 'left-0.5'}
                                                `} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Quick Apply Bundles */}
                                    {accessBundles.length > 0 && (
                                        <div className="bg-gradient-to-br from-primary/5 to-transparent rounded-2xl border border-primary/20 p-5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Boxes size={16} className="text-primary" />
                                                    <span className="text-sm font-semibold">Quick Apply Bundles</span>
                                                    <Badge variant="info" className="text-[9px] px-1.5 h-4">
                                                        {selectedBundles.length}/{accessBundles.length}
                                                    </Badge>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Click to toggle
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {accessBundles.map(bundle => {
                                                    const isSelected = selectedBundles.includes(bundle.id);
                                                    return (
                                                        <button
                                                            key={bundle.id}
                                                            type="button"
                                                            onClick={() => toggleBundle(bundle)}
                                                            className={`
                                                                px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5
                                                                ${isSelected
                                                                    ? 'bg-primary text-white border border-primary shadow-md shadow-primary/30'
                                                                    : 'bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 hover:border-primary/50'}
                                                            `}
                                                        >
                                                            {isSelected ? <Check size={12} /> : <Boxes size={12} />}
                                                            {bundle.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Modules Tab */}
                        {activeTab === 'modules' && (
                            <motion.div
                                key="modules"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-4"
                            >
                                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                        <Input
                                            value={moduleSearch}
                                            onChange={(e) => setModuleSearch(e.target.value)}
                                            placeholder="Search modules..."
                                            className="pl-9 h-10"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={selectAllModules}>
                                            Select All
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" onClick={clearAllModules}>
                                            Clear All
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto pr-1">
                                    {filteredModules.map(module => (
                                        <ModuleCard
                                            key={module.id}
                                            module={module}
                                            features={features}
                                            selectedModules={selectedModules}
                                            selectedPermissions={selectedPermissions}
                                            onToggleModule={toggleModule}
                                            onTogglePermission={togglePermission}
                                        />
                                    ))}
                                    {filteredModules.length === 0 && (
                                        <div className="col-span-full text-center py-12 text-muted-foreground">
                                            <Package size={32} className="mx-auto mb-2 opacity-30" />
                                            <p>No modules found</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Permissions Tab */}
                        {activeTab === 'permissions' && (
                            <motion.div
                                key="permissions"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="space-y-4"
                            >
                                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                        <Input
                                            value={permissionSearch}
                                            onChange={(e) => setPermissionSearch(e.target.value)}
                                            placeholder="Search permissions..."
                                            className="pl-9 h-10"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={selectAllPermissions}>
                                            Select All
                                        </Button>
                                        <Button type="button" variant="outline" size="sm" onClick={clearAllPermissions}>
                                            Clear All
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                    {filteredPermissions.map(perm => (
                                        <button
                                            key={perm.id}
                                            type="button"
                                            onClick={() => togglePermission(perm.id)}
                                            className={`
                                                flex items-center gap-2 p-3 rounded-xl text-left transition-all border-2
                                                ${selectedPermissions.includes(perm.id)
                                                    ? 'bg-primary/10 border-primary/30 text-primary'
                                                    : 'bg-card border-border/50 text-muted-foreground hover:border-border'}
                                            `}
                                        >
                                            <div className={`
                                                w-4 h-4 rounded flex items-center justify-center shrink-0
                                                ${selectedPermissions.includes(perm.id) ? 'bg-primary text-white' : 'bg-muted/50'}
                                            `}>
                                                {selectedPermissions.includes(perm.id) && <Check size={10} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium truncate">{perm.action || perm.key}</p>
                                                <p className="text-[10px] opacity-60 truncate">{perm.key}</p>
                                            </div>
                                        </button>
                                    ))}
                                    {filteredPermissions.length === 0 && (
                                        <div className="col-span-full text-center py-12 text-muted-foreground">
                                            <Shield size={32} className="mx-auto mb-2 opacity-30" />
                                            <p>No permissions found</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>


                <ModalFooter className="justify-between">
                    <p className="text-xs text-muted-foreground hidden sm:block">
                        {name ? `Creating "${name}" with ${selectedModules.length} modules` : 'Enter plan details to continue'}
                    </p>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Button variant="ghost" type="button" onClick={onClose} className="flex-1 sm:flex-none">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isCreating || isUpdating || !name.trim() || !slug.trim()}
                            className="gap-2 flex-1 sm:flex-none min-w-[140px]"
                        >
                            {(isCreating || isUpdating) ? (
                                <Loader2 className="animate-spin" size={18} />
                            ) : (
                                <Save size={18} />
                            )}
                            {isEdit ? 'Update Plan' : 'Create Plan'}
                        </Button>
                    </div>
                </ModalFooter>
            </form>
        </Modal>
    );
};
