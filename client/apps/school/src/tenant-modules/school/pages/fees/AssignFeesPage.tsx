/**
 * Assign Fees Page
 * Assign fee categories to classes/sections/students
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, AlertCircle, FileText, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGetFeeStructuresQuery, useCreateFeeStructureMutation, useGetFeeCategoriesQuery } from '../../api/feesApi';
import { usePermission } from '../../../../core/rbac';
import { useAcademicSession } from '../../../../core/hooks/useAcademicSession';
import { LoadingSpinner, Button, Input } from '@erp/common';
import { formatApiError } from '@/common/services/apiHelpers';
import { assignFeeSchema, type AssignFeeFormData } from '@/core/validation/schemas';

export default function AssignFeesPage() {
    const { hasPermission } = usePermission();
    const { sessionId } = useAcademicSession();
    const [showModal, setShowModal] = useState(false);
    const [formError, setFormError] = useState('');

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<AssignFeeFormData>({
        resolver: zodResolver(assignFeeSchema),
        defaultValues: {
            name: '',
            academicYear: sessionId || '',
            classId: '',
            categoryId: '',
            amount: undefined,
            dueDate: '',
        },
    });

    const { data: structuresData, isLoading, isError, refetch } = useGetFeeStructuresQuery({ academicYear: sessionId || undefined });
    const { data: categoriesData } = useGetFeeCategoriesQuery();
    const [createStructure, { isLoading: isCreating }] = useCreateFeeStructureMutation();

    const structures = structuresData?.data || [];
    const categories = categoriesData?.data || [];
    const canManage = hasPermission('fees.manage');

    const handleOpenModal = () => {
        reset({
            name: '',
            academicYear: sessionId || '',
            classId: '',
            categoryId: '',
            amount: undefined,
            dueDate: '',
        });
        setFormError('');
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setFormError('');
    };

    const onSubmit = async (formData: AssignFeeFormData) => {
        try {
            await createStructure({
                name: formData.name.trim(),
                academicYear: formData.academicYear,
                classId: formData.classId || undefined,
                categoryId: formData.categoryId || undefined,
                amount: formData.amount,
                dueDate: formData.dueDate || undefined,
            }).unwrap();
            handleCloseModal();
            refetch();
        } catch (error) {
            setFormError(formatApiError(error));
        }
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

    if (isLoading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

    if (isError) return (
        <div className="p-6">
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <div><p className="font-medium">Failed to load fee structures</p><button onClick={refetch} className="text-sm underline mt-1">Try again</button></div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Assigned Fees</h1>
                    <p className="text-muted-foreground text-sm mt-1">Fee structures assigned to classes and students</p>
                </div>
                {canManage && <Button onClick={handleOpenModal}><Plus className="w-4 h-4 mr-2" />Assign Fee</Button>}
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl overflow-hidden">
                {structures.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No fee structures assigned yet</p>
                        {canManage && <button onClick={handleOpenModal} className="text-primary text-sm hover:underline mt-2">Assign your first fee</button>}
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Name</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Category</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Amount</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Due Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {structures.map((s) => (
                                <tr key={s.id} className="hover:bg-muted/30">
                                    <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                                    <td className="px-4 py-3 text-muted-foreground text-sm">{s.category_name || '-'}</td>
                                    <td className="px-4 py-3 text-foreground font-medium">{formatCurrency(s.amount)}</td>
                                    <td className="px-4 py-3 text-muted-foreground text-sm">{s.due_date ? new Date(s.due_date).toLocaleDateString() : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </motion.div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h2 className="text-lg font-semibold text-foreground">Assign Fee</h2>
                            <button onClick={handleCloseModal} className="p-2 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
                            <input type="hidden" {...register('academicYear')} />
                            {formError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{formError}</div>}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Fee Name *</label>
                                <Input {...register('name')} placeholder="e.g., Q1 Tuition Fee" error={errors.name?.message} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Category</label>
                                <select {...register('categoryId')} className={`w-full h-10 px-3 rounded-lg border bg-background ${errors.categoryId ? 'border-error' : 'border-input'}`}>
                                    <option value="">Select category</option>
                                    {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                                </select>
                                {errors.categoryId && <p className="text-sm text-error">{errors.categoryId.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Amount (INR) *</label>
                                <Input type="number" {...register('amount')} placeholder="5000" min="1" error={errors.amount?.message} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">Due Date</label>
                                <Input type="date" {...register('dueDate')} error={errors.dueDate?.message} />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1">Cancel</Button>
                                <Button type="submit" disabled={isCreating || isSubmitting} className="flex-1">{isCreating || isSubmitting ? <><LoadingSpinner size="sm" className="mr-2" />Saving...</> : 'Assign'}</Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
