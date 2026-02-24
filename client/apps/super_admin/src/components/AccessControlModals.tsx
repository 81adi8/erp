import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
    Modal,
    ModalFooter,
    Button,
    Input,
    Select,
    IconSelectModal,
    DynamicIcon
} from '@erp/common';
import {
    useCreateModuleMutation,
    useUpdateModuleMutation,
    useCreateFeatureMutation,
    useUpdateFeatureMutation,
    useCreatePermissionMutation,
    useUpdatePermissionMutation
} from '../services/endpoints';
import type { Module, Feature, Permission } from '../services/types';

interface AccessControlFormData extends Partial<Module>, Partial<Feature>, Partial<Permission> {
    module_slug?: string;
    feature_slug?: string;
}

interface ModalsProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'module' | 'feature' | 'permission';
    mode: 'create' | 'edit';
    data?: AccessControlFormData;
    modules?: Module[]; // List of modules for parent selection
}

const COMMON_ACTIONS = [
    { label: 'View', value: 'view' },
    { label: 'Create', value: 'create' },
    { label: 'Update/Edit', value: 'update' },
    { label: 'Delete', value: 'delete' },
    { label: 'Manage', value: 'manage' },
    { label: 'Export', value: 'export' },
    { label: 'Import', value: 'import' },
    { label: 'Print', value: 'print' },
    { label: 'Mark', value: 'mark' },
    { label: 'Assign', value: 'assign' },
    { label: 'Generate', value: 'generate' },
    { label: 'Send', value: 'send' },
    { label: 'Publish', value: 'publish' },
];

export const AccessControlModals: React.FC<ModalsProps> = ({
    isOpen,
    onClose,
    type,
    mode,
    data,
    modules = []
}) => {
    const { register, handleSubmit, reset, setValue, watch, formState: { dirtyFields } } = useForm<AccessControlFormData>();
    const [isIconModalOpen, setIsIconModalOpen] = useState(false);

    const [createModule, { isLoading: isCreatingModule }] = useCreateModuleMutation();
    const [updateModule, { isLoading: isUpdatingModule }] = useUpdateModuleMutation();
    const [createFeature, { isLoading: isCreatingFeature }] = useCreateFeatureMutation();
    const [updateFeature, { isLoading: isUpdatingFeature }] = useUpdateFeatureMutation();
    const [createPermission, { isLoading: isCreatingPermission }] = useCreatePermissionMutation();
    const [updatePermission, { isLoading: isUpdatingPermission }] = useUpdatePermissionMutation();

    const isLoading = isCreatingModule || isUpdatingModule || isCreatingFeature || isUpdatingFeature || isCreatingPermission || isUpdatingPermission;
    const selectedIcon = watch('icon');
    const watchedName = watch('name');
    const watchedSlug = watch('slug');
    const watchedParentId = watch('parent_id');
    const watchedModuleId = watch('module_id');
    const watchedFeatureId = watch('feature_id');
    const watchedAction = watch('action');

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && data) {
                reset(data);
            } else if (mode === 'create' && data) {
                // Pre-fill parent IDs but keep state fresh
                reset(data);
            } else {
                reset({
                    is_active: true,
                    route_active: true,
                    sort_order: 0,
                    asset_type: 'public',
                    tenant_type: 'school'
                });
            }
        }
    }, [isOpen, mode, data, reset]);

    // 1. Auto-generate slug from name
    useEffect(() => {
        if (isOpen && mode === 'create' && watchedName && !dirtyFields.slug) {
            const generatedSlug = watchedName
                .toLowerCase()
                .trim()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
            setValue('slug', generatedSlug);
        }
    }, [watchedName, isOpen, mode, setValue, dirtyFields.slug]);

    // 2. Auto-generate route_name
    useEffect(() => {
        if (!isOpen || dirtyFields.route_name) return;

        let baseRoute = '';

        if (type === 'module') {
            const parentId = watchedParentId || data?.parent_id;
            if (parentId) {
                const parent = modules.find(m => m.id === parentId);
                if (parent?.route_name) baseRoute = parent.route_name;
                else if (parent?.slug) baseRoute = `/${parent.slug}`;
            }
            if (watchedSlug) {
                setValue('route_name', `${baseRoute}/${watchedSlug}`.replace(/\/+/g, '/'));
            }
        } else if (type === 'feature') {
            const moduleId = watchedModuleId || data?.module_id;
            const module = modules.find(m => m.id === moduleId);
            if (module?.route_name) baseRoute = module.route_name;
            else if (module?.slug) baseRoute = `/${module.slug}`;

            if (watchedSlug) {
                setValue('route_name', `${baseRoute}/${watchedSlug}`.replace(/\/+/g, '/'));
            }
        } else if (type === 'permission') {
            // Permissions usually follow the feature's route
            const moduleId = data?.module_id;
            const featureId = watchedFeatureId || data?.feature_id;

                const module = modules.find(m => m.id === moduleId);
                if (module) {
                const feature = module.features?.find((f) => f.id === featureId);
                if (feature?.route_name) {
                    setValue('route_name', feature.route_name);
                } else {
                    const moduleRoute = module.route_name || `/${module.slug}`;
                    if (feature?.slug) {
                        setValue('route_name', `${moduleRoute}/${feature.slug}`.replace(/\/+/g, '/'));
                    }
                }
            }
        }
    }, [isOpen, type, watchedSlug, watchedParentId, watchedModuleId, watchedFeatureId, modules, data, setValue, dirtyFields.route_name]);

    // 3. Auto-generate permission key
    useEffect(() => {
        if (isOpen && type === 'permission' && mode === 'create' && watchedAction && !dirtyFields.key) {
            const moduleSlug = data?.module_slug || '';
            const featureSlug = data?.feature_slug || '';
            const generatedKey = [moduleSlug, featureSlug, watchedAction].filter(Boolean).join('.');
            setValue('key', generatedKey);
        }
    }, [watchedAction, type, mode, data, setValue, isOpen, dirtyFields.key]);

    const onSubmit = async (formData: AccessControlFormData) => {
        try {
            // Remove helper fields that are only used for key generation
            // Also remove 'id' when creating to let the server generate it
            const { module_slug, feature_slug, id, ...cleanData } = formData;

            if (type === 'module') {
                if (mode === 'create') await createModule(cleanData).unwrap();
                else await updateModule({ id: data.id, data: cleanData }).unwrap();
            } else if (type === 'feature') {
                if (mode === 'create') await createFeature(cleanData).unwrap();
                else await updateFeature({ id: data.id, data: cleanData }).unwrap();
            } else if (type === 'permission') {
                if (mode === 'create') await createPermission(cleanData).unwrap();
                else await updatePermission({ id: data.id, data: cleanData }).unwrap();
            }
            onClose();
            reset();
        } catch (error) {
            console.error('Failed to save:', error);
        }
    };

    const getTitle = () => {
        const action = mode === 'create' ? 'Add' : 'Edit';
        const entity = type.charAt(0).toUpperCase() + type.slice(1);
        return `${action} ${entity}`;
    };

    const handleIconSelect = (iconName: string) => {
        setValue('icon', iconName);
    };

    const IconSelectionField = () => (
        <div className="space-y-2">
            <label className="text-sm font-medium">Icon</label>
            <div className="flex items-center gap-3">
                <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center border-2 border-dashed
                    ${selectedIcon ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-muted/20 text-muted-foreground'}
                `}>
                    <DynamicIcon name={selectedIcon || 'Plus'} size={24} />
                </div>
                <div className="flex-1">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsIconModalOpen(true)}
                        className="w-full justify-start text-left font-normal"
                    >
                        {selectedIcon ? `Icon: ${selectedIcon}` : 'Select an icon...'}
                    </Button>
                    <input type="hidden" {...register('icon')} />
                </div>
                {selectedIcon && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setValue('icon', '')}
                        className="px-2"
                    >
                        Clear
                    </Button>
                )}
            </div>
        </div>
    );

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={getTitle()}
                size="3xl"
                className="flex-1"
                closeOnOutsideClick={false}
                closeOnEscape={false}
                preventNavigation={true}
                preventReload={true}
            >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex-1">
                    {type === 'module' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Module Name</label>
                                    <Input {...register('name', { required: true })} placeholder="e.g., Academics" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Slug</label>
                                    <Input {...register('slug', { required: true })} placeholder="e.g., academics" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Route Name</label>
                                    <Input {...register('route_name')} placeholder="e.g., /admin/academics" />
                                    <p className="text-xs text-muted-foreground">The route path for this module</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Route Title</label>
                                    <Input {...register('route_title')} placeholder="e.g., Academics Management" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <IconSelectionField />
                                <div className="flex flex-col gap-4 p-4 bg-muted/30 rounded-xl border border-border/50">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <label className="text-sm font-semibold">Module Active</label>
                                            <p className="text-xs text-muted-foreground">Enable or disable this module entirely</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            {...register('is_active')}
                                            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <label className="text-sm font-semibold">Route Active</label>
                                            <p className="text-xs text-muted-foreground">Show or hide this route in navigation</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            {...register('route_active')}
                                            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                    </div>
                                </div>
                                {mode === 'create' && modules.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Parent Module (Optional)</label>
                                        <select
                                            {...register('parent_id')}
                                            className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm"
                                        >
                                            <option value="">No parent (Root Module)</option>
                                            {modules.map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-muted-foreground">Create as sub-module inside another module</p>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <Input {...register('description')} placeholder="Module description..." />
                                </div>
                            </div>
                        </div>
                    )}

                    {type === 'feature' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <input type="hidden" {...register('module_id')} />
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Feature Name</label>
                                    <Input {...register('name', { required: true })} placeholder="e.g., Student Management" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Slug</label>
                                    <Input {...register('slug', { required: true })} placeholder="e.g., students" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Route Name</label>
                                    <Input {...register('route_name')} placeholder="e.g., /admin/academics/students" />
                                    <p className="text-xs text-muted-foreground">The route path for this feature</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Route Title</label>
                                    <Input {...register('route_title')} placeholder="e.g., Student Directory" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <IconSelectionField />
                                <div className="flex flex-col gap-4 p-4 bg-muted/30 rounded-xl border border-border/50">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <label className="text-sm font-semibold">Feature Active</label>
                                            <p className="text-xs text-muted-foreground">Enable or disable this feature</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            {...register('is_active')}
                                            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <label className="text-sm font-semibold">Route Active</label>
                                            <p className="text-xs text-muted-foreground">Show or hide this route in navigation</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            {...register('route_active')}
                                            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Sort Order</label>
                                    <Input type="number" {...register('sort_order')} defaultValue={0} />
                                </div>
                            </div>
                            <div className="col-span-full space-y-2">
                                <label className="text-sm font-medium">Description</label>
                                <Input {...register('description')} placeholder="Feature description..." />
                            </div>
                        </div>
                    )}

                    {type === 'permission' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <input type="hidden" {...register('feature_id')} />
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Permission Key</label>
                                    <Input {...register('key', { required: true })} placeholder="e.g., academics.students.view" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Action</label>
                                    <Select
                                        options={COMMON_ACTIONS}
                                        placeholder="Select action type"
                                        {...register('action', { required: true })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Route Name</label>
                                    <Input {...register('route_name')} placeholder="e.g., /admin/academics/students" />
                                    <p className="text-xs text-muted-foreground">The route this permission protects</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Route Title</label>
                                    <Input {...register('route_title')} placeholder="e.g., View Students" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <IconSelectionField />
                                <div className="flex flex-col gap-4 p-4 bg-muted/30 rounded-xl border border-border/50">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <label className="text-sm font-semibold">Permission Active</label>
                                            <p className="text-xs text-muted-foreground">Enable or disable this permission</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            {...register('is_active')}
                                            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <label className="text-sm font-semibold">Route Active</label>
                                            <p className="text-xs text-muted-foreground">Show or hide this route in navigation</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            {...register('route_active')}
                                            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Description</label>
                                    <Input {...register('description')} placeholder="What does this permission allow?" />
                                </div>
                            </div>
                        </div>
                    )}

                    <ModalFooter>
                        <Button variant="ghost" type="button" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            <IconSelectModal
                isOpen={isIconModalOpen}
                onClose={() => setIsIconModalOpen(false)}
                onSelect={handleIconSelect}
                selectedIcon={selectedIcon}
                title={`Select ${type.charAt(0).toUpperCase() + type.slice(1)} Icon`}
            />
        </>
    );
};
