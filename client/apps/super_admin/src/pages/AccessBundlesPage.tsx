import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Search,
    Boxes,
    LayoutGrid,
    List,
    Edit2,
    Trash2,
    Package,
    FolderOpen,
    ChevronDown,
    ChevronRight,
    Building2,
} from 'lucide-react';
import {
    Button,
    Input,
    Badge,
    Skeleton,
    Modal,
    ModalFooter,
} from '@erp/common';
import {
    useGetAccessBundlesQuery,
    useDeleteAccessBundleMutation,
    type AccessBundle,
} from '../services/endpoints/access-bundles';
import { AccessBundleModal } from '../components/AccessBundleModal';

type ViewMode = 'grid' | 'list';

// Group bundles by parent_slug
interface BundleSection {
    slug: string;
    title: string;
    icon?: string;
    bundles: AccessBundle[];
}

// Mock data when API is not available
const mockAccessBundles: AccessBundle[] = [
    {
        id: '1',
        name: 'Basic Education Bundle',
        description: 'Core modules for basic education management',
        parent_title: 'Education',
        parent_slug: 'education',
        parent_icon: 'book',
        tenant_type: 'school',
        target_model: 'Plan',
        module_ids: ['m1', 'm2'],
        permission_ids: [],
        module_permissions: {},
        modules: [],
        is_active: true,
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '2',
        name: 'Advanced Education Bundle',
        description: 'Advanced modules for education',
        parent_title: 'Education',
        parent_slug: 'education',
        parent_icon: 'book',
        tenant_type: 'university',
        target_model: 'Plan',
        module_ids: ['m1', 'm2', 'm3'],
        permission_ids: [],
        module_permissions: {},
        modules: [],
        is_active: true,
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '3',
        name: 'HR Management Bundle',
        description: 'Extended modules for HR management',
        parent_title: 'Management',
        parent_slug: 'management',
        parent_icon: 'settings',
        tenant_type: 'all',
        target_model: 'Plan',
        module_ids: ['m4'],
        permission_ids: [],
        module_permissions: {},
        modules: [],
        is_active: true,
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: '4',
        name: 'Premium Analytics Bundle',
        description: 'Full analytics and reporting suite',
        parent_title: 'Analytics',
        parent_slug: 'analytics',
        parent_icon: 'chart',
        tenant_type: 'coaching',
        target_model: 'Plan',
        module_ids: ['m5', 'm6'],
        permission_ids: [],
        module_permissions: {},
        modules: [],
        is_active: false,
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
    },
];

// Access Bundle Card Component (Compact for sections)
const AccessBundleCard: React.FC<{
    bundle: AccessBundle;
    onEdit: (b: AccessBundle) => void;
    onDelete: (b: AccessBundle) => void;
    compact?: boolean;
}> = ({ bundle, onEdit, onDelete, compact }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -2 }}
            className={`bg-card border border-border rounded-xl ${compact ? 'p-4' : 'p-5'} hover:shadow-md hover:shadow-primary/5 transition-all group`}
        >
            <div className="flex items-start justify-between mb-3">
                <div className={`${compact ? 'p-2' : 'p-2.5'} bg-primary/10 rounded-lg text-primary`}>
                    <Boxes size={compact ? 18 : 20} />
                </div>
                <div className="flex items-center gap-1.5">
                    {bundle.target_model && (
                        <Badge variant="outline" className="text-[10px] px-1.5 h-5">
                            {bundle.target_model}
                        </Badge>
                    )}
                    <Badge variant={bundle.is_active ? 'success' : 'default'} className="text-[10px] px-1.5 h-5">
                        {bundle.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                </div>
            </div>

            <h3 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-foreground mb-1 line-clamp-1`}>{bundle.name}</h3>
            <p className={`${compact ? 'text-xs' : 'text-sm'} text-muted-foreground line-clamp-2 mb-3`}>
                {bundle.description || 'No description provided'}
            </p>

            <div className="flex items-center gap-2 mb-3">
                <Package size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                    {bundle.module_ids?.length || 0} modules
                </span>
                {bundle.tenant_type && bundle.tenant_type !== 'all' && (
                    <>
                        <span className="text-muted-foreground">•</span>
                        <Badge variant="info" className="text-[9px] px-1.5 h-4 gap-1">
                            <Building2 size={10} />
                            {bundle.tenant_type}
                        </Badge>
                    </>
                )}
                {bundle.asset_type && bundle.asset_type !== 'public' && (
                    <>
                        <span className="text-muted-foreground">•</span>
                        <Badge
                            variant={bundle.asset_type === 'readonly' ? 'warning' : 'default'}
                            className="text-[9px] px-1.5 h-4"
                        >
                            {bundle.asset_type}
                        </Badge>
                    </>
                )}
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(bundle)}
                    className="flex-1 gap-1.5 h-8 text-xs"
                >
                    <Edit2 size={12} />
                    Edit
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(bundle)}
                    className="h-8 w-8 !p-0 text-error hover:bg-error/10"
                >
                    <Trash2 size={12} />
                </Button>
            </div>
        </motion.div>
    );
};

// Section Component for grouped bundles
const BundleSectionComponent: React.FC<{
    section: BundleSection;
    viewMode: ViewMode;
    onEdit: (b: AccessBundle) => void;
    onDelete: (b: AccessBundle) => void;
    defaultExpanded?: boolean;
}> = ({ section, viewMode, onEdit, onDelete, defaultExpanded = true }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/30 rounded-2xl border border-border/50 overflow-hidden"
        >
            {/* Section Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <FolderOpen size={18} />
                    </div>
                    <div className="text-left">
                        <h2 className="font-semibold text-foreground">{section.title}</h2>
                        <p className="text-xs text-muted-foreground">{section.bundles.length} bundle{section.bundles.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="info" className="text-xs">
                        {section.slug}
                    </Badge>
                    {isExpanded ? <ChevronDown size={18} className="text-muted-foreground" /> : <ChevronRight size={18} className="text-muted-foreground" />}
                </div>
            </button>

            {/* Section Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className={`p-4 pt-0 ${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}`}>
                            {section.bundles.map((bundle) => (
                                viewMode === 'grid' ? (
                                    <AccessBundleCard
                                        key={bundle.id}
                                        bundle={bundle}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        compact
                                    />
                                ) : (
                                    <motion.div
                                        key={bundle.id}
                                        layout
                                        className="bg-background hover:bg-muted/30 border border-border/50 p-3 rounded-xl flex items-center justify-between group transition-all"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="p-1.5 bg-primary/5 rounded-lg text-primary">
                                                <Boxes size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-sm truncate">{bundle.name}</h3>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>{bundle.module_ids?.length || 0} modules</span>
                                                    <span>•</span>
                                                    <span className="truncate">{bundle.description || 'No description'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {bundle.target_model && (
                                                <Badge variant="outline" className="text-[10px] h-5">
                                                    {bundle.target_model}
                                                </Badge>
                                            )}
                                            <Badge variant={bundle.is_active ? 'success' : 'default'} className="text-[10px] h-5">
                                                {bundle.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                            <Button variant="ghost" size="sm" onClick={() => onEdit(bundle)} className="h-7 w-7 !p-0">
                                                <Edit2 size={12} />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => onDelete(bundle)} className="h-7 w-7 !p-0 text-error hover:bg-error/10">
                                                <Trash2 size={12} />
                                            </Button>
                                        </div>
                                    </motion.div>
                                )
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export const AccessBundlesPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBundle, setSelectedBundle] = useState<AccessBundle | undefined>(undefined);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [bundleToDelete, setBundleToDelete] = useState<AccessBundle | null>(null);

    const { data, isLoading, isError } = useGetAccessBundlesQuery();
    const [deleteBundle, { isLoading: isDeleting }] = useDeleteAccessBundleMutation();

    // Use API data or fall back to mock data
    const accessBundles = data?.data || (isError ? mockAccessBundles : []);

    // Filter bundles based on search
    const filteredBundles = useMemo(() => {
        return accessBundles.filter(b =>
            b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.parent_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.parent_slug?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [accessBundles, searchQuery]);

    // Group bundles by parent_slug
    const groupedSections = useMemo(() => {
        const sectionMap = new Map<string, BundleSection>();

        filteredBundles.forEach(bundle => {
            const slug = bundle.parent_slug || 'uncategorized';
            const title = bundle.parent_title || 'Uncategorized';
            const icon = bundle.parent_icon;

            if (!sectionMap.has(slug)) {
                sectionMap.set(slug, {
                    slug,
                    title,
                    icon,
                    bundles: [],
                });
            }
            sectionMap.get(slug)!.bundles.push(bundle);
        });

        // Sort sections alphabetically by title
        return Array.from(sectionMap.values()).sort((a, b) =>
            a.title.localeCompare(b.title)
        );
    }, [filteredBundles]);

    const handleCreate = useCallback(() => {
        setSelectedBundle(undefined);
        setIsModalOpen(true);
    }, []);

    const handleEdit = useCallback((b: AccessBundle) => {
        setSelectedBundle(b);
        setIsModalOpen(true);
    }, []);

    const handleDeleteClick = useCallback((b: AccessBundle) => {
        setBundleToDelete(b);
        setDeleteConfirmOpen(true);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (bundleToDelete) {
            try {
                await deleteBundle(bundleToDelete.id).unwrap();
                setDeleteConfirmOpen(false);
                setBundleToDelete(null);
            } catch (err) {
                console.error('Failed to delete access bundle:', err);
            }
        }
    }, [bundleToDelete, deleteBundle]);

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-1"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-sm">
                            <Boxes size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Access Bundles</h1>
                            <p className="text-muted-foreground text-sm">Manage module bundles organized by category.</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-3 w-full md:w-auto"
                >
                    <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/50">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <List size={16} />
                        </button>
                    </div>
                    <Button onClick={handleCreate} className="flex-1 md:flex-none gap-2 shadow-lg shadow-primary/20 h-10 px-5">
                        <Plus size={16} />
                        Create Bundle
                    </Button>
                </motion.div>
            </div>

            {/* Search & Stats */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex flex-col sm:flex-row gap-4 items-center"
            >
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input
                        placeholder="Search bundles by name, category, or description..."
                        className="pl-9 bg-card border-border/50 focus:border-primary/50 transition-all h-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                    <Badge variant="default" className="px-2 py-0.5">{groupedSections.length} sections</Badge>
                    <span>•</span>
                    <Badge variant="info" className="px-2 py-0.5">{filteredBundles.length} bundles</Badge>
                </div>
            </motion.div>

            {/* Sections */}
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {isLoading ? (
                        Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="h-40">
                                <Skeleton className="w-full h-full rounded-2xl" />
                            </div>
                        ))
                    ) : groupedSections.length > 0 ? (
                        groupedSections.map((section, index) => (
                            <BundleSectionComponent
                                key={section.slug}
                                section={section}
                                viewMode={viewMode}
                                onEdit={handleEdit}
                                onDelete={handleDeleteClick}
                                defaultExpanded={index < 3} // Auto-expand first 3 sections
                            />
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-16 text-center bg-card/30 rounded-2xl border border-dashed border-border"
                        >
                            <div className="bg-muted/30 inline-flex p-5 rounded-full mb-4">
                                <Boxes size={36} className="text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No access bundles found</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto mb-5 text-sm">
                                Create your first access bundle to organize modules for different plans or roles.
                            </p>
                            <Button onClick={handleCreate} className="gap-2">
                                <Plus size={16} />
                                Create Access Bundle
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Create/Edit Modal */}
            <AccessBundleModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                bundle={selectedBundle}
            />

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                title="Delete Access Bundle"
                size="sm"
            >
                <div className="py-4">
                    <p className="text-muted-foreground">
                        Are you sure you want to delete <span className="font-semibold text-foreground">{bundleToDelete?.name}</span>?
                        This action cannot be undone.
                    </p>
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDeleteConfirm}
                        disabled={isDeleting}
                        className="gap-2"
                    >
                        <Trash2 size={14} />
                        Delete
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default AccessBundlesPage;
