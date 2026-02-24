import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    Bell,
    Plus,
    Edit2,
    Trash2,
    Send,
    AlertCircle,
    CheckCircle2,
} from 'lucide-react';
import {
    Button,
    Card,
    Input,
    LoadingSpinner,
    Modal,
    ConfirmDialog,
} from '@erp/common';
import { formatApiError } from '@/common/services/apiHelpers';
import { createNoticeSchema, type CreateNoticeFormData } from '@/core/validation/schemas';
import {
    useCreateNoticeMutation,
    useDeleteNoticeMutation,
    useGetNoticesQuery,
    usePublishNoticeMutation,
    useUpdateNoticeMutation,
    type Notice,
    type NoticeType,
    type TargetAudience,
} from '../../../../api/noticesApi';
import { useGetClassesQuery } from '../../../../api/classesApi';

function getPriorityTone(priority: Notice['priority']): string {
    if (priority === 'urgent') return 'bg-red-100 text-red-700';
    if (priority === 'high') return 'bg-orange-100 text-orange-700';
    if (priority === 'normal') return 'bg-blue-100 text-blue-700';
    return 'bg-slate-100 text-slate-700';
}

export default function NoticesPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
    const [deleteNoticeId, setDeleteNoticeId] = useState<string | null>(null);
    const [noticeTypeFilter, setNoticeTypeFilter] = useState<'all' | NoticeType>('all');
    const [audienceFilter, setAudienceFilter] = useState<'all' | TargetAudience>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
    const [formError, setFormError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const { data: noticesResponse, isLoading: isLoadingNotices, refetch } = useGetNoticesQuery();
    const { data: classesResponse } = useGetClassesQuery({});

    const [createNotice, { isLoading: isCreating }] = useCreateNoticeMutation();
    const [updateNotice, { isLoading: isUpdating }] = useUpdateNoticeMutation();
    const [publishNotice, { isLoading: isPublishing }] = usePublishNoticeMutation();
    const [deleteNotice, { isLoading: isDeleting }] = useDeleteNoticeMutation();

    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<CreateNoticeFormData>({
        resolver: zodResolver(createNoticeSchema),
        defaultValues: {
            title: '',
            content: '',
            noticeType: 'general',
            targetAudience: 'all',
            classId: '',
            priority: 'normal',
            expiresAt: '',
            isPinned: false,
        },
    });

    const notices = noticesResponse?.data || [];
    const classes = classesResponse?.data || [];
    const targetAudience = watch('targetAudience');
    const isSaving = isCreating || isUpdating || isSubmitting;

    const filteredNotices = useMemo(() => {
        return notices
            .filter((notice) => noticeTypeFilter === 'all' || notice.noticeType === noticeTypeFilter)
            .filter((notice) => audienceFilter === 'all' || notice.targetAudience === audienceFilter)
            .filter((notice) => {
                if (statusFilter === 'all') return true;
                if (statusFilter === 'published') return notice.isPublished;
                return !notice.isPublished;
            })
            .sort((a, b) => {
                const aTime = new Date(a.createdAt).getTime();
                const bTime = new Date(b.createdAt).getTime();
                return bTime - aTime;
            });
    }, [audienceFilter, noticeTypeFilter, notices, statusFilter]);

    const openCreateModal = () => {
        setEditingNotice(null);
        setFormError('');
        setSuccessMessage('');
        reset({
            title: '',
            content: '',
            noticeType: 'general',
            targetAudience: 'all',
            classId: '',
            priority: 'normal',
            expiresAt: '',
            isPinned: false,
        });
        setIsModalOpen(true);
    };

    const openEditModal = (notice: Notice) => {
        setEditingNotice(notice);
        setFormError('');
        setSuccessMessage('');
        reset({
            title: notice.title,
            content: notice.content,
            noticeType: notice.noticeType,
            targetAudience: notice.targetAudience,
            classId: notice.classId || '',
            priority: notice.priority,
            expiresAt: notice.expiresAt ? notice.expiresAt.slice(0, 10) : '',
            isPinned: notice.isPinned,
        });
        setIsModalOpen(true);
    };

    const onSubmit = async (data: CreateNoticeFormData) => {
        setFormError('');
        setSuccessMessage('');

        const payload = {
            title: data.title,
            content: data.content,
            noticeType: data.noticeType,
            targetAudience: data.targetAudience,
            classId: data.classId || undefined,
            priority: data.priority,
            expiresAt: data.expiresAt ? new Date(`${data.expiresAt}T00:00:00.000Z`).toISOString() : undefined,
            isPinned: data.isPinned,
        };

        try {
            if (editingNotice) {
                await updateNotice({ id: editingNotice.id, body: payload }).unwrap();
                setSuccessMessage('Notice updated successfully.');
            } else {
                await createNotice(payload).unwrap();
                setSuccessMessage('Notice created successfully.');
            }
            setIsModalOpen(false);
            await refetch();
        } catch (error) {
            setFormError(formatApiError(error));
        }
    };

    const handlePublish = async (id: string) => {
        setFormError('');
        setSuccessMessage('');
        try {
            await publishNotice(id).unwrap();
            setSuccessMessage('Notice published successfully.');
            await refetch();
        } catch (error) {
            setFormError(formatApiError(error));
        }
    };

    const handleDelete = async () => {
        if (!deleteNoticeId) return;

        setFormError('');
        setSuccessMessage('');
        try {
            await deleteNotice(deleteNoticeId).unwrap();
            setSuccessMessage('Notice deleted successfully.');
            setDeleteNoticeId(null);
            await refetch();
        } catch (error) {
            setFormError(formatApiError(error));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                        <Bell size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text">Notices Management</h1>
                        <p className="text-sm text-text-muted">Create, publish, and manage school announcements</p>
                    </div>
                </div>
                <Button onClick={openCreateModal}>
                    <Plus size={16} className="mr-2" />
                    Create Notice
                </Button>
            </div>

            {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    {formError}
                </div>
            )}

            {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg p-3 text-sm flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    {successMessage}
                </div>
            )}

            <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Type</label>
                        <select
                            value={noticeTypeFilter}
                            onChange={(event) => setNoticeTypeFilter(event.target.value as 'all' | NoticeType)}
                            className="h-10 px-3 rounded-lg border border-input bg-background text-sm w-full"
                        >
                            <option value="all">All Types</option>
                            <option value="general">General</option>
                            <option value="exam">Exam</option>
                            <option value="holiday">Holiday</option>
                            <option value="event">Event</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Audience</label>
                        <select
                            value={audienceFilter}
                            onChange={(event) => setAudienceFilter(event.target.value as 'all' | TargetAudience)}
                            className="h-10 px-3 rounded-lg border border-input bg-background text-sm w-full"
                        >
                            <option value="all">All Audiences</option>
                            <option value="all">All</option>
                            <option value="students">Students</option>
                            <option value="parents">Parents</option>
                            <option value="teachers">Teachers</option>
                            <option value="staff">Staff</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value as 'all' | 'published' | 'draft')}
                            className="h-10 px-3 rounded-lg border border-input bg-background text-sm w-full"
                        >
                            <option value="all">All Status</option>
                            <option value="published">Published</option>
                            <option value="draft">Draft</option>
                        </select>
                    </div>
                </div>
            </Card>

            <Card className="p-0 overflow-hidden">
                {isLoadingNotices ? (
                    <div className="p-10 flex items-center justify-center">
                        <LoadingSpinner size="lg" />
                    </div>
                ) : filteredNotices.length === 0 ? (
                    <div className="p-10 text-center text-muted-foreground">
                        No notices found for selected filters.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/40 border-b border-border">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Title</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Type</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Audience</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Priority</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Status</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredNotices.map((notice) => (
                                    <motion.tr
                                        key={notice.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="hover:bg-muted/20"
                                    >
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-sm text-foreground">{notice.title}</p>
                                            <p className="text-xs text-muted-foreground truncate max-w-[360px]">{notice.content}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 capitalize">
                                                {notice.noticeType}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 capitalize">
                                                {notice.targetAudience}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-1 rounded-full capitalize ${getPriorityTone(notice.priority)}`}>
                                                {notice.priority}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {notice.isPublished ? (
                                                <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">Published</span>
                                            ) : (
                                                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">Draft</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => openEditModal(notice)}>
                                                    <Edit2 size={14} className="mr-1" />
                                                    Edit
                                                </Button>
                                                {!notice.isPublished && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => void handlePublish(notice.id)}
                                                        disabled={isPublishing}
                                                    >
                                                        <Send size={14} className="mr-1" />
                                                        Publish
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-red-600"
                                                    onClick={() => setDeleteNoticeId(notice.id)}
                                                >
                                                    <Trash2 size={14} className="mr-1" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingNotice ? 'Edit Notice' : 'Create Notice'}
                size="lg"
            >
                <form onSubmit={handleSubmit((values) => void onSubmit(values))} className="space-y-4">
                    <Input
                        label="Title *"
                        placeholder="Enter notice title"
                        {...register('title')}
                        error={errors.title?.message}
                    />

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Content *</label>
                        <textarea
                            {...register('content')}
                            className={`w-full min-h-[120px] p-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none ${errors.content ? 'border-error' : 'border-input'}`}
                            placeholder="Write your notice content..."
                        />
                        {errors.content && <p className="text-sm text-error">{errors.content.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Notice Type</label>
                            <select
                                {...register('noticeType')}
                                className={`w-full h-10 px-3 rounded-lg border bg-background ${errors.noticeType ? 'border-error' : 'border-input'}`}
                            >
                                <option value="general">General</option>
                                <option value="exam">Exam</option>
                                <option value="holiday">Holiday</option>
                                <option value="event">Event</option>
                                <option value="urgent">Urgent</option>
                            </select>
                            {errors.noticeType && <p className="text-sm text-error">{errors.noticeType.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Target Audience</label>
                            <select
                                {...register('targetAudience')}
                                className={`w-full h-10 px-3 rounded-lg border bg-background ${errors.targetAudience ? 'border-error' : 'border-input'}`}
                            >
                                <option value="all">All</option>
                                <option value="students">Students</option>
                                <option value="parents">Parents</option>
                                <option value="teachers">Teachers</option>
                                <option value="staff">Staff</option>
                            </select>
                            {errors.targetAudience && <p className="text-sm text-error">{errors.targetAudience.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Priority</label>
                            <select
                                {...register('priority')}
                                className={`w-full h-10 px-3 rounded-lg border bg-background ${errors.priority ? 'border-error' : 'border-input'}`}
                            >
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                            {errors.priority && <p className="text-sm text-error">{errors.priority.message}</p>}
                        </div>
                    </div>

                    {targetAudience === 'students' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Target Class (Optional)</label>
                            <select
                                {...register('classId')}
                                className={`w-full h-10 px-3 rounded-lg border bg-background ${errors.classId ? 'border-error' : 'border-input'}`}
                            >
                                <option value="">All Student Classes</option>
                                {classes.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                            {errors.classId && <p className="text-sm text-error">{errors.classId.message}</p>}
                        </div>
                    )}

                    <Input
                        label="Expires At (Optional)"
                        type="date"
                        {...register('expiresAt')}
                        error={errors.expiresAt?.message}
                    />

                    <div className="flex items-center gap-2">
                        <input
                            id="isPinned"
                            type="checkbox"
                            {...register('isPinned')}
                            className="w-4 h-4 rounded border-border"
                        />
                        <label htmlFor="isPinned" className="text-sm text-foreground">Pin this notice</label>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <LoadingSpinner size="sm" className="mr-2" />
                                    Saving...
                                </>
                            ) : editingNotice ? 'Update Notice' : 'Create Notice'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!deleteNoticeId}
                onClose={() => setDeleteNoticeId(null)}
                onConfirm={() => void handleDelete()}
                title="Delete Notice"
                message="Are you sure you want to delete this notice?"
                confirmText={isDeleting ? 'Deleting...' : 'Delete'}
                type="danger"
            />
        </div>
    );
}
