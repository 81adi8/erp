/**
 * Fee Categories Page
 * Manage fee categories (Tuition, Transport, Exam, Misc)
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Plus,
    Edit2,
    Trash2,
    Tag,
    AlertCircle,
    X,
} from 'lucide-react';
import {
    useGetFeeCategoriesQuery,
    useCreateFeeCategoryMutation,
} from '../../api/feesApi';
import { usePermission } from '../../../../core/rbac';
import { LoadingSpinner, Button, Input } from '@erp/common';
import type { FeeCategory } from '../../api/feesApi';
import { formatApiError } from '@/common/services/apiHelpers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { feeCategorySchema, type FeeCategoryFormData } from '@/core/validation/schemas';

export default function FeeCategoriesPage() {
    const { hasPermission } = usePermission();
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<FeeCategory | null>(null);
    const [formError, setFormError] = useState('');

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FeeCategoryFormData>({
        resolver: zodResolver(feeCategorySchema),
        defaultValues: {
            name: '',
            description: '',
        },
    });

    const { data: categoriesData, isLoading, isError, refetch } = useGetFeeCategoriesQuery();
    const [createCategory, { isLoading: isCreating }] = useCreateFeeCategoryMutation();

    const categories = categoriesData?.data || [];
    const canManage = hasPermission('fees.manage');

    const handleOpenModal = (category?: FeeCategory) => {
        if (category) {
            setEditingCategory(category);
            reset({ name: category.name, description: category.description || '' });
        } else {
            setEditingCategory(null);
            reset({ name: '', description: '' });
        }
        setFormError('');
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingCategory(null);
        reset({ name: '', description: '' });
        setFormError('');
    };

    const onSubmit = async (formData: FeeCategoryFormData) => {
        try {
            await createCategory({
                name: formData.name.trim(),
                description: formData.description?.trim() || undefined,
            }).unwrap();

            handleCloseModal();
            refetch();
        } catch (error) {
            setFormError(formatApiError(error));
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <div>
                        <p className="font-medium">Failed to load categories</p>
                        <button onClick={refetch} className="text-sm underline mt-1">Try again</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Fee Categories</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Define fee types like Tuition, Transport, Exam, etc.
                    </p>
                </div>
                {canManage && (
                    <Button onClick={() => handleOpenModal()}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Category
                    </Button>
                )}
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl overflow-hidden"
            >
                {categories.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No fee categories yet</p>
                        {canManage && (
                            <button
                                onClick={() => handleOpenModal()}
                                className="text-primary text-sm hover:underline mt-2"
                            >
                                Create your first category
                            </button>
                        )}
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Name</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Description</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Created</th>
                                {canManage && (
                                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {categories.map((category) => (
                                <tr key={category.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-lg bg-primary/10">
                                                <Tag className="w-4 h-4 text-primary" />
                                            </div>
                                            <span className="font-medium text-foreground">{category.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground text-sm">
                                        {category.description || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground text-sm">
                                        {new Date(category.created_at).toLocaleDateString()}
                                    </td>
                                    {canManage && (
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                                    onClick={() => handleOpenModal(category)}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </motion.div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h2 className="text-lg font-semibold text-foreground">
                                {editingCategory ? 'Edit Category' : 'Add Category'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
                            {formError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {formError}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    Category Name *
                                </label>
                                <Input
                                    {...register('name')}
                                    placeholder="e.g., Tuition Fee, Transport Fee"
                                    autoFocus
                                    error={errors.name?.message}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">
                                    Description
                                </label>
                                <textarea
                                    {...register('description')}
                                    placeholder="Optional description"
                                    className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                                {errors.description && <p className="text-sm text-error">{errors.description.message}</p>}
                            </div>

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCloseModal}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isCreating || isSubmitting}
                                    className="flex-1"
                                >
                                    {isCreating || isSubmitting ? (
                                        <>
                                            <LoadingSpinner size="sm" className="mr-2" />
                                            Saving...
                                        </>
                                    ) : (
                                        editingCategory ? 'Update' : 'Create'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
