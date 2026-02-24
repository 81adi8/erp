import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    Plus,
    Search,
    ChevronDown,
    Edit2,
    Trash2,
    AlertCircle,
    Layers,
    Layout,
    Package,
    RefreshCw,
    Database,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import {
    useGetModulesQuery,
    useDeleteModuleMutation,
    useUpdateModuleMutation,
    useDeleteFeatureMutation,
    useUpdateFeatureMutation,
    useDeletePermissionMutation,
    useUpdatePermissionMutation,
    useRefreshPermissionsMutation,
    useGetPermissionStatsQuery
} from '../services/endpoints';
import { Button, Card, Badge, Input, useIsDarkMode, Skeleton, DynamicIcon } from '@erp/common';
import { AccessControlModals } from '../components/AccessControlModals';
import type { Module, Feature, Permission } from '../services/types';

type ModalPayload = Partial<Module> & Partial<Feature> & Partial<Permission>;

export const PermissionsPage: React.FC = () => {
    const isDark = useIsDarkMode();
    const { data: modulesResponse, isLoading } = useGetModulesQuery();
    const { data: statsResponse } = useGetPermissionStatsQuery();
    const [deleteModule] = useDeleteModuleMutation();
    const [updateModule] = useUpdateModuleMutation();
    const [deleteFeature] = useDeleteFeatureMutation();
    const [updateFeature] = useUpdateFeatureMutation();
    const [deletePermission] = useDeletePermissionMutation();
    const [updatePermission] = useUpdatePermissionMutation();
    const [refreshPermissions, { isLoading: isRefreshing }] = useRefreshPermissionsMutation();

    const [searchTerm, setSearchTerm] = useState('');
    const [expandedModules, setExpandedModules] = useState<string[]>([]);
    const [expandedFeatures, setExpandedFeatures] = useState<string[]>([]);
    const [refreshResult, setRefreshResult] = useState<{ 
        success: boolean; 
        message: string;
        stats?: Record<string, number> 
    } | null>(null);

    const [modalState, setModalState] = useState<{
        type: 'module' | 'feature' | 'permission';
        mode: 'create' | 'edit';
        data?: ModalPayload;
        isOpen: boolean;
    }>({
        type: 'module',
        mode: 'create',
        isOpen: false
    });

    // Handle refresh permissions
    const handleRefreshPermissions = async () => {
        if (isRefreshing) return;
        
        try {
            const result = await refreshPermissions().unwrap();
            setRefreshResult({ 
                success: true, 
                message: `Sync complete! Created: ${result.stats.modulesCreated} modules, ${result.stats.featuresCreated} features, ${result.stats.permissionsCreated} permissions. Updated: ${result.stats.modulesUpdated} modules, ${result.stats.featuresUpdated} features, ${result.stats.permissionsUpdated} permissions.`,
                stats: result.stats 
            });
            
            // Auto-hide after 8 seconds
            setTimeout(() => setRefreshResult(null), 8000);
        } catch (error) {
            setRefreshResult({ 
                success: false, 
                message: 'Failed to refresh permissions. Please try again.' 
            });
            setTimeout(() => setRefreshResult(null), 5000);
        }
    };

    const modules = useMemo(() => modulesResponse?.data || [], [modulesResponse]);

    // Flatten modules for the Modal dropdown parent selection
    const flatModules = useMemo(() => {
        const list: Module[] = [];
        const traverse = (items: Module[]) => {
            items.forEach(item => {
                list.push(item);
                if (item.children) traverse(item.children);
            });
        };
        traverse(modules);
        return list;
    }, [modules]);

    const toggleModule = useCallback((id: string) => {
        setExpandedModules(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    }, []);

    const toggleFeature = useCallback((id: string) => {
        setExpandedFeatures(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    }, []);

    const filteredModules = useMemo(() => {
        if (!searchTerm) return modules;
        const search = searchTerm.toLowerCase();

        const filterRecursive = (items: Module[]): Module[] => {
            return items.reduce((acc, item) => {
                const matchesSelf =
                    item.name.toLowerCase().includes(search) ||
                    item.slug.toLowerCase().includes(search) ||
                    (item.route_name && item.route_name.toLowerCase().includes(search));

                const matchesFeatures = item.features?.some((f: Feature) =>
                    f.name.toLowerCase().includes(search) ||
                    f.slug.toLowerCase().includes(search) ||
                    (f.route_name && f.route_name.toLowerCase().includes(search)) ||
                    f.permissions?.some((p: Permission) =>
                        p.key.toLowerCase().includes(search) ||
                        p.action.toLowerCase().includes(search)
                    )
                );

                const filteredChildren = item.children ? filterRecursive(item.children) : [];

                if (matchesSelf || matchesFeatures || filteredChildren.length > 0) {
                    acc.push({
                        ...item,
                        children: filteredChildren
                    });
                }
                return acc;
            }, [] as Module[]);
        };

        return filterRecursive(modules);
    }, [modules, searchTerm]);

    const openModal = useCallback((type: 'module' | 'feature' | 'permission', mode: 'create' | 'edit', data?: ModalPayload) => {
        setModalState({ type, mode, data, isOpen: true });
    }, []);

    const renderModule = (module: Module, index: number, level: number = 0) => {
        const isExpanded = expandedModules.includes(module.id);
        const hasChildren = module.children && module.children.length > 0;
        const hasFeatures = module.features && module.features.length > 0;

        return (
            <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                layout
                className={level > 0 ? "mt-4" : ""}
            >
                <Card className={`overflow-hidden border-2 transition-all duration-300 ${level > 0
                    ? 'border-border/30 bg-muted/5 shadow-none'
                    : 'border-transparent hover:border-primary/10'
                    }`}>
                    {/* Module Header */}
                    <div className={`p-4 flex items-center justify-between ${level > 0
                        ? (isDark ? 'bg-muted/10' : 'bg-muted/5')
                        : (isDark ? 'bg-surface-elevated/50' : 'bg-surface-hover/30')
                        }`}>
                        <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => toggleModule(module.id)}>
                            <div className={`p-2 rounded-xl border transition-colors ${level > 0
                                ? 'bg-muted/20 border-border text-muted-foreground'
                                : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                                }`}>
                                <DynamicIcon name={module.icon || (level > 0 ? 'Layers' : 'Package')} size={level > 0 ? 18 : 22} />
                            </div>
                            <div>
                                <h3 className={`${level > 0 ? 'text-base' : 'text-lg'} font-semibold flex items-center gap-2`}>
                                    {module.name}
                                    {!module.is_active && (
                                        <Badge variant="error" className="text-[10px] px-1.5 py-0">Inactive</Badge>
                                    )}
                                    {!module.route_active && (
                                        <Badge variant="warning" className="text-[10px] px-1.5 py-0">Route Hidden</Badge>
                                    )}
                                    {module.route_title && (
                                        <span className="text-[10px] bg-primary/5 text-primary border border-primary/10 px-1.5 py-0 rounded italic">
                                            "{module.route_title}"
                                        </span>
                                    )}
                                    {module.route_name && (
                                        <span className="text-[10px] font-mono opacity-40 font-normal ml-2 hidden md:inline">
                                            {module.route_name}
                                        </span>
                                    )}
                                </h3>
                                <p className="text-sm text-text-muted font-mono">{module.slug}</p>
                            </div>
                            <motion.div
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                className="ml-auto p-1.5 hover:bg-muted rounded-lg transition-colors mr-2 text-muted-foreground"
                            >
                                <ChevronDown size={level > 0 ? 16 : 20} />
                            </motion.div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                            <div className="flex items-center mr-2 px-2 py-1 bg-muted/30 rounded-lg border border-border/50">
                                <span className="text-[10px] font-medium mr-2 uppercase tracking-tighter opacity-70">Active</span>
                                <input
                                    type="checkbox"
                                    checked={module.is_active}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Are you sure you want to ${module.is_active ? 'DISABLE' : 'ENABLE'} this module?`)) {
                                            updateModule({ id: module.id, data: { is_active: !module.is_active } });
                                        }
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                />
                            </div>
                            <div className="flex items-center px-2 py-1 bg-muted/30 rounded-lg border border-border/50">
                                <span className="text-[10px] font-medium mr-2 uppercase tracking-tighter opacity-70">Route</span>
                                <input
                                    type="checkbox"
                                    checked={module.route_active}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        updateModule({ id: module.id, data: { route_active: !module.route_active } });
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                title="Add Sub-Module"
                                className="h-8 w-8 p-0"
                                onClick={(e) => { e.stopPropagation(); openModal('module', 'create', { parent_id: module.id }); }}
                            >
                                <Layers className="w-3.5 h-3.5 text-orange-500" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                title="Add Feature"
                                className="h-8 w-8 p-0"
                                onClick={(e) => { e.stopPropagation(); openModal('feature', 'create', { module_id: module.id, module_slug: module.slug }); }}
                            >
                                <Plus className="w-4 h-4 text-primary" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => { e.stopPropagation(); openModal('module', 'edit', module); }}
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                variant="danger"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-50 hover:opacity-100"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Are you sure you want to delete this module and ALL its content?')) {
                                        deleteModule(module.id);
                                    }
                                }}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>

                    {/* Features & Children List */}
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t border-border/50"
                            >
                                <div className="p-4 bg-muted/20 space-y-6">
                                    {/* Sub-Modules Section */}
                                    {hasChildren && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                                                    Sub Modules ({module.children.length})
                                                </span>
                                                <div className="h-px flex-1 bg-border/30" />
                                            </div>
                                            <div className="pl-4 sm:pl-8 border-l border-border/50">
                                                {module.children.map((child: Module, idx: number) => renderModule(child, idx, level + 1))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Features Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                                                Features ({module.features?.length || 0})
                                            </span>
                                            <div className="h-px flex-1 bg-border/30" />
                                        </div>

                                        <div className="space-y-4 relative pl-4 sm:pl-8 border-l border-border/50">
                                            {module.features?.map((feature: Feature) => (
                                                <div
                                                    key={feature.id}
                                                    className={`rounded-xl border border-border shadow-sm overflow-hidden ${isDark ? 'bg-surface-elevated/20' : 'bg-white'}`}
                                                >
                                                    <div className="p-3 flex items-center justify-between border-b border-border/50 relative">
                                                        <div className="flex items-center gap-3 cursor-pointer flex-1 pl-4" onClick={() => toggleFeature(feature.id)}>
                                                            <div className="absolute left-0 top-1/2 w-4 h-px bg-border/50" />
                                                            <div className="p-1.5 bg-muted rounded-lg text-muted-foreground">
                                                                <DynamicIcon name={feature.icon || 'Layout'} size={16} />
                                                            </div>
                                                            <div>
                                                                <span className="font-semibold text-sm">{feature.name}</span>
                                                                <span className="ml-2 text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border/50">{feature.slug}</span>
                                                                {!feature.is_active && <Badge variant="error" className="ml-2 text-[8px] h-4">Inactive</Badge>}
                                                                {!feature.route_active && <Badge variant="warning" className="ml-2 text-[8px] h-4">Hidden</Badge>}
                                                                {feature.route_title && (
                                                                    <span className="ml-2 text-[9px] text-primary italic border-l border-border pl-2 border-dashed">"{feature.route_title}"</span>
                                                                )}
                                                                {feature.route_name && (
                                                                    <span className="ml-2 text-[10px] opacity-40 font-mono hidden sm:inline">{feature.route_name}</span>
                                                                )}
                                                            </div>
                                                            <motion.div
                                                                animate={{ rotate: expandedFeatures.includes(feature.id) ? 180 : 0 }}
                                                                className="p-1 hover:bg-muted rounded-md"
                                                            >
                                                                <ChevronDown size={14} className="text-muted-foreground" />
                                                            </motion.div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center mr-2 px-1.5 py-0.5 bg-muted/30 rounded border border-border/50">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={feature.is_active}
                                                                    onChange={(e) => {
                                                                        e.stopPropagation();
                                                                        if (window.confirm(`Are you sure you want to ${feature.is_active ? 'DISABLE' : 'ENABLE'} this feature?`)) {
                                                                            updateFeature({ id: feature.id, data: { is_active: !feature.is_active } });
                                                                        }
                                                                    }}
                                                                    className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                                />
                                                            </div>
                                                            <div className="flex items-center px-1.5 py-0.5 bg-muted/30 rounded border border-border/50">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={feature.route_active}
                                                                    onChange={(e) => {
                                                                        e.stopPropagation();
                                                                        updateFeature({ id: feature.id, data: { route_active: !feature.route_active } });
                                                                    }}
                                                                    className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                                />
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 px-2 text-[10px] gap-1"
                                                                onClick={() => openModal('permission', 'create', {
                                                                    feature_id: feature.id,
                                                                    module_id: module.id,
                                                                    module_slug: module.slug,
                                                                    feature_slug: feature.slug
                                                                })}
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                                Permission
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 w-7 p-0"
                                                                onClick={() => openModal('feature', 'edit', feature)}
                                                            >
                                                                <Edit2 className="w-3 h-3" />
                                                            </Button>
                                                            <Button
                                                                variant="danger"
                                                                size="sm"
                                                                className="h-7 w-7 p-0 opacity-50 hover:opacity-100"
                                                                onClick={() => {
                                                                    if (window.confirm('Delete this feature?')) {
                                                                        deleteFeature(feature.id);
                                                                    }
                                                                }}
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <AnimatePresence>
                                                        {expandedFeatures.includes(feature.id) && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-muted/5">
                                                                    {feature.permissions?.map((perm: Permission) => (
                                                                        <motion.div
                                                                            key={perm.id}
                                                                            whileHover={{ scale: 1.01 }}
                                                                            className="p-3 rounded-lg border border-border bg-surface flex flex-col gap-2 group relative"
                                                                        >
                                                                            <div className="flex items-start justify-between">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="p-1.5 bg-muted rounded-md text-muted-foreground">
                                                                                        <DynamicIcon name={perm.icon || 'Shield'} size={12} />
                                                                                    </div>
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-[10px] font-bold text-primary uppercase tracking-tight">{perm.action}</span>
                                                                                        <span className="text-xs font-semibold">{perm.key}</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                    <button
                                                                                        onClick={() => openModal('permission', 'edit', perm)}
                                                                                        className="p-1 text-text-muted hover:text-primary"
                                                                                    >
                                                                                        <Edit2 className="w-3 h-3" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => deletePermission(perm.id)}
                                                                                        className="p-1 text-text-muted hover:text-error"
                                                                                    >
                                                                                        <Trash2 className="w-3 h-3" />
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                            {perm.route_name && (
                                                                                <div className="flex flex-col gap-1 mt-1">
                                                                                    {perm.route_title && (
                                                                                        <span className="text-[9px] text-primary italic">"{perm.route_title}"</span>
                                                                                    )}
                                                                                    <span className="text-[9px] font-mono opacity-50 truncate">{perm.route_name}</span>
                                                                                </div>
                                                                            )}
                                                                            <div className="mt-auto flex items-center justify-between pt-2 border-t border-border/30">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={perm.is_active}
                                                                                        onChange={(e) => {
                                                                                            e.stopPropagation();
                                                                                            if (window.confirm(`Are you sure you want to ${perm.is_active ? 'DISABLE' : 'ENABLE'} this permission?`)) {
                                                                                                updatePermission({ id: perm.id, data: { is_active: !perm.is_active } });
                                                                                            }
                                                                                        }}
                                                                                        className="w-3 h-3 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                                                    />
                                                                                    <span className="text-[8px] font-bold uppercase tracking-tight text-muted-foreground">Active</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        checked={perm.route_active}
                                                                                        onChange={(e) => {
                                                                                            e.stopPropagation();
                                                                                            updatePermission({ id: perm.id, data: { route_active: !perm.route_active } });
                                                                                        }}
                                                                                        className="w-3 h-3 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                                                                    />
                                                                                    <span className="text-[8px] font-bold uppercase tracking-tight text-muted-foreground">Route</span>
                                                                                </div>
                                                                                {!perm.route_active && (
                                                                                    <Badge variant="warning" className="text-[8px] px-1 h-3.5">Hidden</Badge>
                                                                                )}
                                                                            </div>
                                                                        </motion.div>
                                                                    ))}
                                                                    {(!feature.permissions || feature.permissions.length === 0) && (
                                                                        <div className="col-span-full py-2 text-center text-[10px] text-text-muted italic">
                                                                            No permissions defined
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            ))}

                                            {!hasFeatures && !hasChildren && (
                                                <div className="py-6 text-center bg-surface-hover/20 rounded-xl border border-dashed border-border flex flex-col items-center gap-2">
                                                    <AlertCircle className="w-4 h-4 text-text-muted" />
                                                    <span className="text-xs text-text-muted">Empty module</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            </motion.div>
        );
    };

    if (isLoading) {
        return (
            <div className="p-8 space-y-8 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-64 rounded-xl" />
                        <Skeleton className="h-4 w-96 rounded-lg" />
                    </div>
                    <div className="flex gap-3">
                        <Skeleton className="h-11 w-64 rounded-xl" />
                        <Skeleton className="h-11 w-32 rounded-xl" />
                    </div>
                </div>
                <div className="space-y-6">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-1"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-sm border border-primary/20">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Access Control</h1>
                            <p className="text-muted-foreground text-sm">Manage system modules, features and granular permissions.</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-3 w-full md:w-auto"
                >
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <Input
                            placeholder="Search permissions..."
                            className="pl-11 bg-background/50 border-border/50 focus:border-primary/50 transition-all h-11 rounded-xl"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="outline"
                        onClick={handleRefreshPermissions}
                        disabled={isRefreshing}
                        className="gap-2 h-11 px-4 border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    >
                        <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                        {isRefreshing ? 'Syncing...' : 'Sync Permissions'}
                    </Button>
                    <Button onClick={() => openModal('module', 'create')} className="gap-2 shadow-lg shadow-primary/20 h-11 px-6">
                        <Plus size={18} />
                        Add Module
                    </Button>
                </motion.div>
            </div>

            {/* Refresh Result Notification */}
            <AnimatePresence>
                {refreshResult && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className={`p-4 rounded-xl border flex items-start gap-3 ${
                            refreshResult.success 
                                ? 'bg-success/10 border-success/30 text-success' 
                                : 'bg-error/10 border-error/30 text-error'
                        }`}
                    >
                        {refreshResult.success ? (
                            <CheckCircle2 size={20} className="mt-0.5 flex-shrink-0" />
                        ) : (
                            <XCircle size={20} className="mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                            <p className="font-medium text-sm">{refreshResult.success ? 'Sync Complete' : 'Sync Failed'}</p>
                            <p className="text-xs opacity-80 mt-0.5">{refreshResult.message}</p>
                        </div>
                        <button 
                            onClick={() => setRefreshResult(null)}
                            className="p-1 hover:bg-black/10 rounded-md transition-colors"
                        >
                            <XCircle size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 gap-6">
                <AnimatePresence mode="popLayout">
                    {filteredModules.map((module, index) => renderModule(module, index))}
                </AnimatePresence>

                {filteredModules.length === 0 && (
                    <div className="py-20 text-center space-y-4">
                        <div className="p-4 bg-muted/20 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                            <Search className="text-muted-foreground" size={32} />
                        </div>
                        <h3 className="text-xl font-semibold">No results found</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                            No modules or features match your search term "{searchTerm}".
                        </p>
                        <Button variant="outline" onClick={() => setSearchTerm('')}>Clear Search</Button>
                    </div>
                )}
            </div>

            <AccessControlModals
                isOpen={modalState.isOpen}
                onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
                type={modalState.type}
                mode={modalState.mode}
                data={modalState.data}
                modules={flatModules}
            />
        </div>
    );
};
