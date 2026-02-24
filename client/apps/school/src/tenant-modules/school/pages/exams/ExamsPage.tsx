// ============================================================================
// Exams Page - wired to backend. Functional, no redesign.
// ============================================================================
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGetExamsQuery, useCreateExamMutation } from '../../api/examsApi';
import { createExamSchema, type CreateExamFormData } from '@/core/validation/schemas';

export default function ExamsPage() {
    const [showCreate, setShowCreate] = useState(false);
    const [createError, setCreateError] = useState('');
    const [createSuccess, setCreateSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CreateExamFormData>({
        resolver: zodResolver(createExamSchema),
        defaultValues: {
            title: '',
            subject: '',
            date: '',
            duration: '',
            totalMarks: '',
        },
    });

    const { data, isLoading, isError, refetch } = useGetExamsQuery({});
    const [createExam, { isLoading: isCreating }] = useCreateExamMutation();

    const exams = data?.data ?? [];

    const onCreateExam = async (formData: CreateExamFormData) => {
        setCreateError('');
        setCreateSuccess(false);
        try {
            await createExam({
                title: formData.title,
                subject: formData.subject,
                date: formData.date,
                duration: formData.duration ? Number(formData.duration) : undefined,
                totalMarks: formData.totalMarks ? Number(formData.totalMarks) : undefined,
            }).unwrap();
            setCreateSuccess(true);
            reset({
                title: '',
                subject: '',
                date: '',
                duration: '',
                totalMarks: '',
            });
            setShowCreate(false);
            refetch();
        } catch {
            setCreateError('Failed to create exam. Please try again.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Exams</h1>
                    <p className="text-muted-foreground text-sm mt-1">Manage exams and assessments</p>
                </div>
                <button
                    onClick={() => {
                        setShowCreate(true);
                        setCreateSuccess(false);
                    }}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                    + Create Exam
                </button>
            </div>

            {createSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
                    Exam created successfully.
                </div>
            )}

            {showCreate && (
                <div className="bg-card border border-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4">New Exam</h2>
                    <form onSubmit={handleSubmit(onCreateExam)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-muted-foreground font-medium">Title *</label>
                            <input
                                {...register('title')}
                                placeholder="e.g. Mid-Term Mathematics"
                                className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            {errors.title && <span className="text-sm text-error">{errors.title.message}</span>}
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-muted-foreground font-medium">Subject *</label>
                            <input
                                {...register('subject')}
                                placeholder="e.g. Mathematics"
                                className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            {errors.subject && <span className="text-sm text-error">{errors.subject.message}</span>}
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-muted-foreground font-medium">Date *</label>
                            <input
                                type="date"
                                {...register('date')}
                                className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            {errors.date && <span className="text-sm text-error">{errors.date.message}</span>}
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-muted-foreground font-medium">Duration (minutes)</label>
                            <input
                                type="number"
                                {...register('duration')}
                                placeholder="e.g. 120"
                                className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            {errors.duration && <span className="text-sm text-error">{errors.duration.message}</span>}
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-muted-foreground font-medium">Total Marks</label>
                            <input
                                type="number"
                                {...register('totalMarks')}
                                placeholder="e.g. 100"
                                className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            {errors.totalMarks && <span className="text-sm text-error">{errors.totalMarks.message}</span>}
                        </div>
                        {createError && (
                            <div className="col-span-2 text-sm text-red-500">{createError}</div>
                        )}
                        <div className="col-span-2 flex gap-3">
                            <button
                                type="submit"
                                disabled={isCreating}
                                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                            >
                                {isCreating ? 'Creating...' : 'Create Exam'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCreate(false)}
                                className="px-6 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted/50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {isLoading && (
                <div className="text-center text-muted-foreground py-12 bg-card border border-border rounded-xl animate-pulse">
                    Loading exams...
                </div>
            )}

            {isError && (
                <div className="text-center text-red-500 py-12 bg-card border border-border rounded-xl">
                    Failed to load exams. Please try again.
                </div>
            )}

            {!isLoading && !isError && exams.length === 0 && (
                <div className="text-center text-muted-foreground py-12 bg-card border border-border rounded-xl">
                    No exams yet. Create your first exam above.
                </div>
            )}

            {!isLoading && !isError && exams.length > 0 && (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Title</th>
                                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Subject</th>
                                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Date</th>
                                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Duration</th>
                                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Total Marks</th>
                                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {exams.map((exam: { id: string; title: string; subject?: string; date?: string; duration?: number; totalMarks?: number; status?: string }) => (
                                <tr key={exam.id} className="border-t border-border hover:bg-muted/30">
                                    <td className="px-4 py-3 font-medium text-foreground">{exam.title}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{exam.subject ?? '-'}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{exam.date ? new Date(exam.date).toLocaleDateString() : '-'}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{exam.duration ? `${exam.duration} min` : '-'}</td>
                                    <td className="px-4 py-3 text-muted-foreground">{exam.totalMarks ?? '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                            exam.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                exam.status === 'ONGOING' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-muted text-muted-foreground'
                                            }`}>
                                            {exam.status ?? 'SCHEDULED'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
