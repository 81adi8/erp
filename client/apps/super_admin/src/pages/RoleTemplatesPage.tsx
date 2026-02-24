import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Search,
    Users,
    Edit2,
    Trash2,
    Copy,
    Shield,
    Building2,
    ChevronDown,
    ChevronRight,
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
    useGetRoleTemplatesQuery,
    useDeleteRoleTemplateMutation,
    useDuplicateRoleTemplateMutation,
    type RoleTemplate,
} from '../services/endpoints/role-templates';
import { RoleTemplateModal } from '../components/RoleTemplateModal';

// Group templates by tenant_type
interface TemplateGroup {
    type: string;
    label: string;
    templates: RoleTemplate[];
}

const TENANT_TYPE_LABELS: Record<string, string> = {
    all: 'Universal',
    school: 'School',
    university: 'University',
    coaching: 'Coaching',
};

// Template Card Component
const RoleTemplateCard: React.FC<{
    template: RoleTemplate;
    onEdit: (t: RoleTemplate) => void;
    onDelete: (t: RoleTemplate) => void;
    onDuplicate: (t: RoleTemplate) => void;
}> = ({ template, onEdit, onDelete, onDuplicate }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            whileHover={{ y: -2 }}
            className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:shadow-primary/5 transition-all group"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Users size={18} />
                </div>
                <div className="flex items-center gap-1.5">
                    {template.is_system && (
                        <Badge variant="warning" className="text-[10px] px-1.5 h-5">
                            System
                        </Badge>
                    )}
                    <Badge variant={template.is_active ? 'success' : 'default'} className="text-[10px] px-1.5 h-5">
                        {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {template.role_type && (
                        <Badge variant="info" className="text-[10px] px-1.5 h-5 uppercase">
                            {template.role_type}
                        </Badge>
                    )}
                </div>
            </div>

            <h3 className="text-sm font-semibold text-foreground mb-1 line-clamp-1">{template.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {template.description || 'No description provided'}
            </p>

            <div className="flex items-center gap-2 mb-3">
                <Shield size={12} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                    {template.permission_ids?.length || 0} permissions
                </span>
                {template.plan && (
                    <>
                        <span className="text-muted-foreground">•</span>
                        <Badge variant="info" className="text-[9px] px-1.5 h-4">
                            {template.plan.name}
                        </Badge>
                    </>
                )}
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(template)}
                    className="flex-1 gap-1.5 h-8 text-xs"
                >
                    <Edit2 size={12} />
                    Edit
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDuplicate(template)}
                    className="h-8 w-8 !p-0 text-muted-foreground hover:text-foreground"
                    title="Duplicate"
                >
                    <Copy size={12} />
                </Button>
                {!template.is_system && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(template)}
                        className="h-8 w-8 !p-0 text-error hover:bg-error/10"
                    >
                        <Trash2 size={12} />
                    </Button>
                )}
            </div>
        </motion.div>
    );
};

// Group Section Component
const TemplateGroupSection: React.FC<{
    group: TemplateGroup;
    onEdit: (t: RoleTemplate) => void;
    onDelete: (t: RoleTemplate) => void;
    onDuplicate: (t: RoleTemplate) => void;
    defaultExpanded?: boolean;
}> = ({ group, onEdit, onDelete, onDuplicate, defaultExpanded = true }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card/30 rounded-2xl border border-border/50 overflow-hidden"
        >
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Building2 size={18} />
                    </div>
                    <div className="text-left">
                        <h2 className="font-semibold text-foreground">{group.label}</h2>
                        <p className="text-xs text-muted-foreground">
                            {group.templates.length} template{group.templates.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="info" className="text-xs">{group.type}</Badge>
                    {isExpanded ? <ChevronDown size={18} className="text-muted-foreground" /> : <ChevronRight size={18} className="text-muted-foreground" />}
                </div>
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {group.templates.map((template) => (
                                <RoleTemplateCard
                                    key={template.id}
                                    template={template}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onDuplicate={onDuplicate}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export const RoleTemplatesPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<RoleTemplate | undefined>(undefined);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<RoleTemplate | null>(null);
    const [duplicateSlug, setDuplicateSlug] = useState('');
    const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
    const [templateToDuplicate, setTemplateToDuplicate] = useState<RoleTemplate | null>(null);

    const { data, isLoading } = useGetRoleTemplatesQuery();
    const [deleteTemplate, { isLoading: isDeleting }] = useDeleteRoleTemplateMutation();
    const [duplicateTemplate, { isLoading: isDuplicating }] = useDuplicateRoleTemplateMutation();

    const roleTemplates = data?.data || [];

    // Filter templates
    const filteredTemplates = useMemo(() => {
        return roleTemplates.filter(t =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.role_type?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [roleTemplates, searchQuery]);

    // Group by tenant_type
    const groupedTemplates = useMemo(() => {
        const groups = new Map<string, TemplateGroup>();
        const order = ['all', 'school', 'university', 'coaching'];

        filteredTemplates.forEach(template => {
            const type = template.tenant_type || 'all';
            if (!groups.has(type)) {
                groups.set(type, {
                    type,
                    label: TENANT_TYPE_LABELS[type] || type,
                    templates: [],
                });
            }
            groups.get(type)!.templates.push(template);
        });

        return order
            .filter(type => groups.has(type))
            .map(type => groups.get(type)!);
    }, [filteredTemplates]);

    const handleCreate = useCallback(() => {
        setSelectedTemplate(undefined);
        setIsModalOpen(true);
    }, []);

    const handleEdit = useCallback((t: RoleTemplate) => {
        setSelectedTemplate(t);
        setIsModalOpen(true);
    }, []);

    const handleDeleteClick = useCallback((t: RoleTemplate) => {
        setTemplateToDelete(t);
        setDeleteConfirmOpen(true);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (templateToDelete) {
            try {
                await deleteTemplate(templateToDelete.id).unwrap();
                setDeleteConfirmOpen(false);
                setTemplateToDelete(null);
            } catch (err) {
                console.error('Failed to delete role template:', err);
            }
        }
    }, [templateToDelete, deleteTemplate]);

    const handleDuplicateClick = useCallback((t: RoleTemplate) => {
        setTemplateToDuplicate(t);
        setDuplicateSlug(`${t.slug}-copy`);
        setDuplicateModalOpen(true);
    }, []);

    const handleDuplicateConfirm = useCallback(async () => {
        if (templateToDuplicate && duplicateSlug) {
            try {
                await duplicateTemplate({ id: templateToDuplicate.id, newSlug: duplicateSlug }).unwrap();
                setDuplicateModalOpen(false);
                setTemplateToDuplicate(null);
                setDuplicateSlug('');
            } catch (err) {
                console.error('Failed to duplicate role template:', err);
            }
        }
    }, [templateToDuplicate, duplicateSlug, duplicateTemplate]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-1"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-sm">
                            <Users size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Role Templates</h1>
                            <p className="text-muted-foreground text-sm">Define default roles with permissions for tenant provisioning.</p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Button onClick={handleCreate} className="gap-2 shadow-lg shadow-primary/20 h-10 px-5">
                        <Plus size={16} />
                        Create Template
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
                        placeholder="Search templates by name or slug..."
                        className="pl-9 bg-card border-border/50 focus:border-primary/50 transition-all h-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                    <Badge variant="default" className="px-2 py-0.5">{groupedTemplates.length} groups</Badge>
                    <span>•</span>
                    <Badge variant="info" className="px-2 py-0.5">{filteredTemplates.length} templates</Badge>
                </div>
            </motion.div>

            {/* Template Groups */}
            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {isLoading ? (
                        Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="h-40">
                                <Skeleton className="w-full h-full rounded-2xl" />
                            </div>
                        ))
                    ) : groupedTemplates.length > 0 ? (
                        groupedTemplates.map((group, index) => (
                            <TemplateGroupSection
                                key={group.type}
                                group={group}
                                onEdit={handleEdit}
                                onDelete={handleDeleteClick}
                                onDuplicate={handleDuplicateClick}
                                defaultExpanded={index < 2}
                            />
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-16 text-center bg-card/30 rounded-2xl border border-dashed border-border"
                        >
                            <div className="bg-muted/30 inline-flex p-5 rounded-full mb-4">
                                <Users size={36} className="text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No role templates found</h3>
                            <p className="text-muted-foreground max-w-sm mx-auto mb-5 text-sm">
                                Create your first role template to define default permissions for tenant roles.
                            </p>
                            <Button onClick={handleCreate} className="gap-2">
                                <Plus size={16} />
                                Create Role Template
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Create/Edit Modal */}
            <RoleTemplateModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                template={selectedTemplate}
            />

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                title="Delete Role Template"
                size="sm"
            >
                <div className="py-4">
                    <p className="text-muted-foreground">
                        Are you sure you want to delete <span className="font-semibold text-foreground">{templateToDelete?.name}</span>?
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

            {/* Duplicate Modal */}
            <Modal
                isOpen={duplicateModalOpen}
                onClose={() => setDuplicateModalOpen(false)}
                title="Duplicate Role Template"
                size="sm"
            >
                <div className="py-4 space-y-4">
                    <p className="text-muted-foreground">
                        Enter a unique slug for the duplicated template:
                    </p>
                    <Input
                        placeholder="new-template-slug"
                        value={duplicateSlug}
                        onChange={(e) => setDuplicateSlug(e.target.value)}
                    />
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={() => setDuplicateModalOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDuplicateConfirm}
                        disabled={isDuplicating || !duplicateSlug}
                        className="gap-2"
                    >
                        <Copy size={14} />
                        Duplicate
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default RoleTemplatesPage;
