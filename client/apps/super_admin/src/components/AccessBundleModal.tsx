import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Save,
    Check,
    Loader2,
    Boxes,
    Package,
    ChevronDown,
    ChevronRight,
    Shield,
    Settings,
    ToggleLeft,
    ToggleRight,
    Search,
    CheckCircle2,
    Circle,
    Tag,
    Link,
    Building2,
    Lock,
} from 'lucide-react';
import {
    Modal,
    ModalFooter,
    Button,
    Input,
    Badge,
} from '@erp/common';
import {
    useCreateAccessBundleMutation,
    useUpdateAccessBundleMutation,
    type AccessBundle,
    type ModulePermissionConfig,
} from '../services/endpoints/access-bundles';
import { useGetModulesQuery, useGetFeaturesQuery } from '../services/endpoints/access-control';
import type { Module, Feature } from '../services/types';

interface AccessBundleModalProps {
    isOpen: boolean;
    onClose: () => void;
    bundle?: AccessBundle;
}

// Type for tracking module configuration
interface ModuleConfig {
    moduleId: string;
    selected: boolean;
    allPermissions: boolean;
    selectedPermissions: string[];
}

// Collapsible Module Card Component (Recursive)
const ModuleCard: React.FC<{
    module: Module;
    features: Feature[];
    config: ModuleConfig;
    moduleConfigs: Map<string, ModuleConfig>;
    onToggleModule: (id: string) => void;
    onToggleAllPermissions: (id: string) => void;
    onTogglePermission: (moduleId: string, permId: string) => void;
    depth?: number;
}> = ({ module, features, config, moduleConfigs, onToggleModule, onToggleAllPermissions, onTogglePermission, depth = 0 }) => {
    const [isExpanded, setIsExpanded] = useState(depth === 0); // Expand top-level by default

    const allPermissions = useMemo(() => {
        return features
            .filter(f => f.module_id === module.id)
            .flatMap(f => f.permissions || []);
    }, [features, module.id]);

    const moduleFeatures = useMemo(() => {
        return features.filter(f => f.module_id === module.id);
    }, [features, module.id]);

    const selectedCount = config.allPermissions
        ? allPermissions.length
        : config.selectedPermissions.length;

    // Calculate total permissions selected in this branch (self + children)
    const totalSelectedInBranch = useMemo(() => {
        let count = selectedCount;
        const countChildren = (m: Module) => {
            if (m.children) {
                m.children.forEach(child => {
                    const childConfig = moduleConfigs.get(child.id);
                    if (childConfig?.selected) {
                        const childPerms = features.filter(f => f.module_id === child.id).flatMap(f => f.permissions || []);
                        count += childConfig.allPermissions ? childPerms.length : childConfig.selectedPermissions.length;
                    }
                    countChildren(child);
                });
            }
        };
        countChildren(module);
        return count;
    }, [module, moduleConfigs, selectedCount, features]);

    const hasChildren = module.children && module.children.length > 0;
    const hasContent = allPermissions.length > 0 || hasChildren;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`
                rounded-2xl border-2 transition-all overflow-hidden mb-3
                ${config.selected
                    ? 'border-primary/40 bg-primary/5 shadow-lg shadow-primary/10'
                    : 'border-border/50 bg-card hover:border-border'}
            `}
            style={{ marginLeft: depth > 0 ? `${depth * 12}px` : '0' }}
        >
            <div className="p-4 cursor-pointer" onClick={() => onToggleModule(module.id)}>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`
                            w-6 h-6 rounded-lg flex items-center justify-center transition-all shrink-0
                            ${config.selected ? 'bg-primary text-white' : 'bg-muted/50 text-muted-foreground'}
                        `}>
                            {config.selected ? <Check size={14} /> : <Circle size={14} />}
                        </div>
                        <div className={`
                            p-2.5 rounded-xl shrink-0 transition-colors
                            ${config.selected ? 'bg-primary/15 text-primary' : 'bg-muted/50 text-muted-foreground'}
                        `}>
                            <Package size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className={`font-semibold text-sm truncate ${config.selected ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {module.name}
                            </h4>
                            {module.description && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                    {module.description}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {config.selected && totalSelectedInBranch > 0 && (
                            <Badge variant="success" className="text-[10px] px-2 h-5">
                                {totalSelectedInBranch} perm{totalSelectedInBranch !== 1 ? 's' : ''}
                            </Badge>
                        )}
                        {hasContent && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsExpanded(!isExpanded);
                                }}
                                className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 pt-2 border-t border-border/50 space-y-4 bg-muted/5">
                            {config.selected && (
                                <>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/30 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <Shield size={14} className="text-primary" />
                                            <span className="text-xs font-semibold">Permission Mode</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!config.allPermissions) onToggleAllPermissions(module.id);
                                                }}
                                                className={`
                                                    px-3 py-1.5 text-xs font-medium rounded-lg transition-all
                                                    ${config.allPermissions
                                                        ? 'bg-primary text-white'
                                                        : 'bg-background border border-border hover:bg-muted'}
                                                `}
                                            >
                                                All Permissions
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (config.allPermissions) onToggleAllPermissions(module.id);
                                                }}
                                                className={`
                                                    px-3 py-1.5 text-xs font-medium rounded-lg transition-all
                                                    ${!config.allPermissions
                                                        ? 'bg-primary text-white'
                                                        : 'bg-background border border-border hover:bg-muted'}
                                                `}
                                            >
                                                Custom
                                            </button>
                                        </div>
                                    </div>

                                    {!config.allPermissions && (
                                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                            {moduleFeatures.map(feature => (
                                                <div key={feature.id} className="space-y-2">
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                        <Settings size={12} />
                                                        {feature.name}
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-4">
                                                        {(feature.permissions || []).map(perm => (
                                                            <button
                                                                key={perm.id}
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onTogglePermission(module.id, perm.id);
                                                                }}
                                                                className={`
                                                                    flex items-center gap-2 p-2 rounded-lg text-xs text-left transition-all
                                                                    ${config.selectedPermissions.includes(perm.id)
                                                                        ? 'bg-primary/10 text-primary border border-primary/30'
                                                                        : 'bg-muted/30 text-muted-foreground border border-transparent hover:bg-muted/50'}
                                                                `}
                                                            >
                                                                {config.selectedPermissions.includes(perm.id)
                                                                    ? <CheckCircle2 size={14} />
                                                                    : <Circle size={14} />}
                                                                <span className="truncate">{perm.action || perm.key}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            {moduleFeatures.length === 0 && !hasChildren && (
                                                <p className="text-xs text-muted-foreground text-center py-4">
                                                    No features found for this module.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {config.allPermissions && allPermissions.length > 0 && (
                                        <p className="text-xs text-muted-foreground text-center py-2 italic">
                                            ✓ All {allPermissions.length} permissions from this module will be included.
                                        </p>
                                    )}
                                </>
                            )}

                            {/* Self Features & Children Modules */}
                            {hasChildren && (
                                <div className="space-y-1">
                                    {module.children!.map(child => {
                                        const childConfig = moduleConfigs.get(child.id);
                                        if (!childConfig) return null;
                                        return (
                                            <ModuleCard
                                                key={child.id}
                                                module={child}
                                                features={features}
                                                config={childConfig}
                                                moduleConfigs={moduleConfigs}
                                                onToggleModule={onToggleModule}
                                                onToggleAllPermissions={onToggleAllPermissions}
                                                onTogglePermission={onTogglePermission}
                                                depth={depth + 1}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export const AccessBundleModal: React.FC<AccessBundleModalProps> = ({ isOpen, onClose, bundle }) => {
    const isEdit = !!bundle;
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [parentTitle, setParentTitle] = useState('');
    const [parentSlug, setParentSlug] = useState('');
    const [parentIcon, setParentIcon] = useState('');
    const [tenantType, setTenantType] = useState<string>('all');
    const [assetType, setAssetType] = useState<string>('public');
    const [targetModel, setTargetModel] = useState<string>('');
    const [targetId, setTargetId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [moduleConfigs, setModuleConfigs] = useState<Map<string, ModuleConfig>>(new Map());

    const [createBundle, { isLoading: isCreating }] = useCreateAccessBundleMutation();
    const [updateBundle, { isLoading: isUpdating }] = useUpdateAccessBundleMutation();
    const { data: modulesData } = useGetModulesQuery();
    const { data: featuresData } = useGetFeaturesQuery();

    const modules = modulesData?.data || [];
    const features = featuresData?.data || [];

    const filteredModules = useMemo(() => {
        if (!searchQuery) return modules;
        const query = searchQuery.toLowerCase();

        const filterRecursive = (mods: Module[]): Module[] => {
            return mods.filter(m => {
                const matchesSelf = m.name.toLowerCase().includes(query) ||
                    m.description?.toLowerCase().includes(query) ||
                    m.slug.toLowerCase().includes(query);

                const matchingChildren = m.children ? filterRecursive(m.children) : [];

                // If this module matches, or any of its children match, include it
                if (matchesSelf || matchingChildren.length > 0) {
                    return true;
                }
                return false;
            });
        };

        return filterRecursive(modules);
    }, [modules, searchQuery]);

    useEffect(() => {
        if (isOpen) {
            const configs = new Map<string, ModuleConfig>();

            const initializeConfigs = (mods: Module[]) => {
                mods.forEach(m => {
                    const isSelected = bundle?.module_ids?.includes(m.id) || false;
                    const savedConfig = bundle?.module_permissions?.[m.id];
                    configs.set(m.id, {
                        moduleId: m.id,
                        selected: isSelected,
                        allPermissions: savedConfig ? savedConfig.allPermissions : true,
                        selectedPermissions: savedConfig?.permissionIds || [],
                    });
                    if (m.children) initializeConfigs(m.children);
                });
            };

            initializeConfigs(modules);
            setModuleConfigs(configs);

            if (bundle) {
                setName(bundle.name);
                setDescription(bundle.description || '');
                setIsActive(bundle.is_active);
                setParentTitle(bundle.parent_title || '');
                setParentSlug(bundle.parent_slug || '');
                setParentIcon(bundle.parent_icon || '');
                setTenantType(bundle.tenant_type || 'all');
                setAssetType(bundle.asset_type || 'public');
                setTargetModel(bundle.target_model || '');
                setTargetId(bundle.target_id || '');
            } else {
                setName('');
                setDescription('');
                setIsActive(true);
                setParentTitle('');
                setParentSlug('');
                setParentIcon('');
                setTenantType('all');
                setAssetType('public');
                setTargetModel('');
                setTargetId('');
            }
            setSearchQuery('');
        }
    }, [bundle, isOpen, modules]);

    const toggleModule = useCallback((moduleId: string) => {
        setModuleConfigs(prev => {
            const newConfigs = new Map(prev);
            const current = newConfigs.get(moduleId);
            if (current) {
                newConfigs.set(moduleId, { ...current, selected: !current.selected });
            }
            return newConfigs;
        });
    }, []);

    const toggleAllPermissions = useCallback((moduleId: string) => {
        setModuleConfigs(prev => {
            const newConfigs = new Map(prev);
            const current = newConfigs.get(moduleId);
            if (current) {
                newConfigs.set(moduleId, {
                    ...current,
                    allPermissions: !current.allPermissions,
                    selectedPermissions: current.allPermissions
                        ? features.filter(f => f.module_id === moduleId).flatMap(f => f.permissions || []).map(p => p.id)
                        : [],
                });
            }
            return newConfigs;
        });
    }, [features]);

    const togglePermission = useCallback((moduleId: string, permId: string) => {
        setModuleConfigs(prev => {
            const newConfigs = new Map(prev);
            const current = newConfigs.get(moduleId);
            if (current) {
                const newSelected = current.selectedPermissions.includes(permId)
                    ? current.selectedPermissions.filter(p => p !== permId)
                    : [...current.selectedPermissions, permId];
                newConfigs.set(moduleId, { ...current, selectedPermissions: newSelected });
            }
            return newConfigs;
        });
    }, []);

    const selectedModuleIds = useMemo(() => {
        return Array.from(moduleConfigs.values()).filter(c => c.selected).map(c => c.moduleId);
    }, [moduleConfigs]);

    const selectAllModules = useCallback(() => {
        setModuleConfigs(prev => {
            const newConfigs = new Map(prev);
            const updateRecursive = (mods: Module[]) => {
                mods.forEach(m => {
                    const current = newConfigs.get(m.id);
                    if (current) newConfigs.set(m.id, { ...current, selected: true });
                    if (m.children) updateRecursive(m.children);
                });
            };
            updateRecursive(modules);
            return newConfigs;
        });
    }, [modules]);

    const clearAllModules = useCallback(() => {
        setModuleConfigs(prev => {
            const newConfigs = new Map(prev);
            const updateRecursive = (mods: Module[]) => {
                mods.forEach(m => {
                    const current = newConfigs.get(m.id);
                    if (current) newConfigs.set(m.id, { ...current, selected: false });
                    if (m.children) updateRecursive(m.children);
                });
            };
            updateRecursive(modules);
            return newConfigs;
        });
    }, [modules]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const modulePermissions: Record<string, ModulePermissionConfig> = {};
        const allPermissionIds: string[] = [];

        Array.from(moduleConfigs.values())
            .filter(c => c.selected)
            .forEach(config => {
                modulePermissions[config.moduleId] = {
                    allPermissions: config.allPermissions,
                    permissionIds: config.selectedPermissions,
                };
                if (config.allPermissions) {
                    const modulePerms = features.filter(f => f.module_id === config.moduleId).flatMap(f => f.permissions || []).map(p => p.id);
                    allPermissionIds.push(...modulePerms);
                } else {
                    allPermissionIds.push(...config.selectedPermissions);
                }
            });

        const payload = {
            name,
            description,
            is_active: isActive,
            parent_title: parentTitle,
            parent_slug: parentSlug,
            parent_icon: parentIcon,
            tenant_type: tenantType,
            asset_type: assetType,
            target_model: targetModel || undefined,
            target_id: targetId || undefined,
            module_ids: selectedModuleIds,
            permission_ids: [...new Set(allPermissionIds)],
            module_permissions: modulePermissions,
        };

        try {
            if (isEdit && bundle) {
                await updateBundle({ id: bundle.id, data: payload }).unwrap();
            } else {
                await createBundle(payload).unwrap();
            }
            onClose();
        } catch (err) {
            console.error('Failed to save access bundle:', err);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? 'Edit Access Bundle' : 'Create Access Bundle'}
            size="4xl"
            closeOnOutsideClick={false}
            closeOnEscape={false}
            preventNavigation={true}
            preventReload={true}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative flex items-start gap-4">
                        <div className="p-3 bg-primary/15 rounded-2xl text-primary shadow-lg shadow-primary/20">
                            <Boxes size={28} />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-lg text-foreground">Access Bundle</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Create a collection of modules/permissions that can be linked to Plans or Roles.
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
                                Bundle Details
                            </h4>

                            <div>
                                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Bundle Name *</label>
                                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Basic Education Bundle" required className="h-11" />
                            </div>

                            <div>
                                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Description</label>
                                <textarea
                                    className="w-full h-20 rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe what this bundle includes..."
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                                <div className="flex items-center gap-2">
                                    {isActive ? <ToggleRight size={20} className="text-success" /> : <ToggleLeft size={20} className="text-muted-foreground" />}
                                    <span className="text-sm font-medium">Active Status</span>
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

                        {/* UI Metadata */}
                        <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
                            <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                                <Tag size={16} className="text-primary" />
                                UI Metadata
                            </h4>
                            <div>
                                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Parent Title *</label>
                                <Input value={parentTitle} onChange={(e) => setParentTitle(e.target.value)} placeholder="e.g. Education" required className="h-10" />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Parent Slug *</label>
                                <Input value={parentSlug} onChange={(e) => setParentSlug(e.target.value)} placeholder="e.g. education" required className="h-10" />
                            </div>
                            <div>
                                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Parent Icon *</label>
                                <Input value={parentIcon} onChange={(e) => setParentIcon(e.target.value)} placeholder="e.g. book" required className="h-10" />
                            </div>
                        </div>

                        {/* Tenant Type */}
                        <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
                            <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                                <Building2 size={16} className="text-primary" />
                                Tenant Type
                            </h4>
                            <div>
                                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Applicable To *</label>
                                <select
                                    value={tenantType}
                                    onChange={(e) => setTenantType(e.target.value)}
                                    className="w-full h-10 rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="all">All Tenant Types</option>
                                    <option value="school">School</option>
                                    <option value="university">University</option>
                                    <option value="coaching">Coaching</option>
                                </select>
                                <p className="text-[10px] text-muted-foreground mt-1.5">Select which tenant type this bundle applies to.</p>
                            </div>
                        </div>

                        {/* Asset Type */}
                        <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
                            <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                                <Lock size={16} className="text-primary" />
                                Asset Type
                            </h4>
                            <div>
                                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Bundle Classification *</label>
                                <select
                                    value={assetType}
                                    onChange={(e) => setAssetType(e.target.value)}
                                    className="w-full h-10 rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="public">Public (Template)</option>
                                    <option value="readonly">Read-only (System)</option>
                                    <option value="custom">Custom (Tenant Copy)</option>
                                </select>
                                <p className="text-[10px] text-muted-foreground mt-1.5">Public bundles serve as templates, readonly are system bundles, custom are tenant-specific copies.</p>
                            </div>
                        </div>

                        {/* Target Association */}
                        <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
                            <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                                <Link size={16} className="text-primary" />
                                Target Association (Optional)
                            </h4>
                            <div>
                                <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Target Model</label>
                                <select
                                    value={targetModel}
                                    onChange={(e) => setTargetModel(e.target.value)}
                                    className="w-full h-10 rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="">None (Global)</option>
                                    <option value="Plan">Plan</option>
                                    <option value="Role">Role</option>
                                </select>
                            </div>
                            {targetModel && (
                                <div>
                                    <label className="text-xs font-medium mb-1.5 block text-muted-foreground">Target ID</label>
                                    <Input value={targetId} onChange={(e) => setTargetId(e.target.value)} placeholder="UUID of the target entity" className="h-10" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Module Selection */}
                    <div className="lg:col-span-3 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search modules..." className="pl-9 h-10" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={selectAllModules} className="text-xs h-10">Select All</Button>
                                <Button type="button" variant="outline" size="sm" onClick={clearAllModules} className="text-xs h-10">Clear All</Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <AnimatePresence mode="popLayout">
                                {filteredModules.length > 0 ? (
                                    filteredModules.map(module => {
                                        const config = moduleConfigs.get(module.id);
                                        if (!config) return null;
                                        return (
                                            <ModuleCard
                                                key={module.id}
                                                module={module}
                                                features={features}
                                                config={config}
                                                moduleConfigs={moduleConfigs}
                                                onToggleModule={toggleModule}
                                                onToggleAllPermissions={toggleAllPermissions}
                                                onTogglePermission={togglePermission}
                                            />
                                        );
                                    })
                                ) : (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-muted-foreground">
                                        <Package size={40} className="mx-auto mb-3 opacity-30" />
                                        <p className="font-medium">No modules found</p>
                                        <p className="text-xs mt-1">Try a different search term or create modules first.</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>


                <ModalFooter className="justify-between">
                    <p className="text-xs text-muted-foreground hidden sm:block">
                        {selectedModuleIds.length > 0
                            ? `${selectedModuleIds.length} module${selectedModuleIds.length > 1 ? 's' : ''} selected.`
                            : 'Select at least one module to create the bundle.'}
                    </p>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Button variant="ghost" type="button" onClick={onClose} className="flex-1 sm:flex-none">Cancel</Button>
                        <Button
                            type="submit"
                            disabled={isCreating || isUpdating || !name.trim() || !parentTitle.trim() || !parentSlug.trim() || !parentIcon.trim() || selectedModuleIds.length === 0}
                            className="gap-2 flex-1 sm:flex-none min-w-[160px]"
                        >
                            {(isCreating || isUpdating) ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {isEdit ? 'Update Bundle' : 'Create Bundle'}
                        </Button>
                    </div>
                </ModalFooter>
            </form>
        </Modal>
    );
};

export default AccessBundleModal;
