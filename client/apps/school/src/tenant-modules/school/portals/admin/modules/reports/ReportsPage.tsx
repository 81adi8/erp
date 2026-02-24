import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, BarChart3, CheckCircle2, Clock3, Download, Loader2, RefreshCw } from 'lucide-react';
import { Button, Card, Input } from '@erp/common';
import { useGetCurrentAcademicSessionQuery } from '@core/api/endpoints/academicsApi';
import {
    downloadReport,
    useGetReportHistoryQuery,
    useGetReportStatusQuery,
    useRequestReportMutation,
    type ReportFormat,
    type ReportJob,
    type ReportRequest,
    type ReportType,
} from '../../../../api/reportsApi';

const REPORT_TYPE_OPTIONS: Array<{ label: string; value: ReportType }> = [
    { label: 'Student List', value: 'student_list' },
    { label: 'Attendance Register', value: 'attendance_register' },
    { label: 'Fee Collection', value: 'fee_collection' },
    { label: 'Fee Dues', value: 'fee_dues' },
    { label: 'Exam Results', value: 'exam_results' },
    { label: 'Exam Toppers', value: 'exam_toppers' },
    { label: 'Student Strength', value: 'student_strength' },
];

const FORMAT_OPTIONS: Array<{ label: string; value: ReportFormat }> = [
    { label: 'Excel', value: 'excel' },
    { label: 'PDF', value: 'pdf' },
];

const reportRequestSchema = z.object({
    reportType: z.enum([
        'student_list',
        'attendance_register',
        'fee_collection',
        'fee_dues',
        'exam_results',
        'exam_toppers',
        'student_strength',
    ]),
    format: z.enum(['excel', 'pdf']),
    academicYearId: z.string().optional(),
    classId: z.string().optional(),
    sectionId: z.string().optional(),
    examId: z.string().optional(),
    month: z.string().optional(),
    year: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
});

type ReportRequestFormValues = z.infer<typeof reportRequestSchema>;

function getStatusTone(status: ReportJob['status']): string {
    if (status === 'completed') return 'text-green-600';
    if (status === 'failed') return 'text-red-600';
    if (status === 'processing') return 'text-amber-600';
    return 'text-blue-600';
}

function getStatusLabel(status: ReportJob['status']): string {
    if (status === 'processing') return 'Generating';
    if (status === 'completed') return 'Ready';
    if (status === 'failed') return 'Failed';
    return 'Queued';
}

function buildRequestPayload(formValues: ReportRequestFormValues, fallbackAcademicYearId?: string): ReportRequest {
    const filters: NonNullable<ReportRequest['filters']> = {};

    if (formValues.classId?.trim()) filters.class_id = formValues.classId.trim();
    if (formValues.sectionId?.trim()) filters.section_id = formValues.sectionId.trim();
    if (formValues.examId?.trim()) filters.exam_id = formValues.examId.trim();
    if (formValues.month?.trim()) filters.month = Number(formValues.month);
    if (formValues.year?.trim()) filters.year = Number(formValues.year);
    if (formValues.dateFrom?.trim()) filters.date_from = formValues.dateFrom.trim();
    if (formValues.dateTo?.trim()) filters.date_to = formValues.dateTo.trim();

    return {
        reportType: formValues.reportType,
        format: formValues.format,
        academicYearId: formValues.academicYearId?.trim() || fallbackAcademicYearId,
        filters,
    };
}

export default function ReportsPage() {
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [requestError, setRequestError] = useState<string>('');
    const [downloadError, setDownloadError] = useState<string>('');

    const { data: currentSessionResponse } = useGetCurrentAcademicSessionQuery();
    const currentAcademicSession = currentSessionResponse?.data;

    const [requestReport, { isLoading: isRequesting }] = useRequestReportMutation();
    const {
        data: statusResponse,
        isFetching: isStatusPolling,
        refetch: refetchStatus,
    } = useGetReportStatusQuery(activeJobId ?? '', {
        skip: !activeJobId,
        pollingInterval: 3000,
    });

    const {
        data: historyResponse,
        isLoading: isHistoryLoading,
        refetch: refetchHistory,
    } = useGetReportHistoryQuery({ page: 1, limit: 20 });

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ReportRequestFormValues>({
        resolver: zodResolver(reportRequestSchema),
        defaultValues: {
            reportType: 'student_list',
            format: 'excel',
            academicYearId: currentAcademicSession?.id ?? '',
            classId: '',
            sectionId: '',
            examId: '',
            month: '',
            year: '',
            dateFrom: '',
            dateTo: '',
        },
    });

    const latestStatus = statusResponse?.data;
    const history = historyResponse?.data ?? [];
    const progressWidth = `${latestStatus?.progress ?? 0}%`;

    const statusMessage = useMemo(() => {
        if (!latestStatus) return '';
        if (latestStatus.status === 'queued') return 'Report queued...';
        if (latestStatus.status === 'processing') return `Generating... ${latestStatus.progress}%`;
        if (latestStatus.status === 'completed') return 'Ready for download';
        return `Failed: ${latestStatus.error_message ?? 'Unknown error'}`;
    }, [latestStatus]);

    const onSubmit = async (values: ReportRequestFormValues) => {
        setRequestError('');

        try {
            const payload = buildRequestPayload(values, currentAcademicSession?.id);
            const response = await requestReport(payload).unwrap();
            setActiveJobId(response.data.job_id);
            await refetchHistory();
            reset({
                ...values,
                classId: '',
                sectionId: '',
                examId: '',
                month: '',
                year: '',
                dateFrom: '',
                dateTo: '',
            });
        } catch (error) {
            const fallback = 'Unable to queue report request';
            if (typeof error === 'object' && error && 'data' in error) {
                const errData = (error as { data?: { message?: string } }).data;
                setRequestError(errData?.message || fallback);
            } else {
                setRequestError(fallback);
            }
        }
    };

    const handleDownload = async (job: ReportJob) => {
        setDownloadError('');
        try {
            const fallbackName = `${job.report_type}_${job.id}.${job.format === 'excel' ? 'xlsx' : 'pdf'}`;
            await downloadReport(job.id, fallbackName);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Report download failed';
            setDownloadError(message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                        <BarChart3 size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text">Reports & Analytics</h1>
                        <p className="text-sm text-text-muted">Generate reports, track progress, and download files</p>
                    </div>
                </div>
                <Button variant="outline" onClick={() => void refetchHistory()}>
                    <RefreshCw size={16} className="mr-2" />
                    Refresh History
                </Button>
            </div>

            <Card className="p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-text">Report Type</label>
                            <select
                                {...register('reportType')}
                                className={`w-full h-10 px-3 rounded-lg border bg-background ${errors.reportType ? 'border-red-500' : 'border-input'}`}
                            >
                                {REPORT_TYPE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            {errors.reportType && <p className="text-xs text-red-500">{errors.reportType.message}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-text">Format</label>
                            <select
                                {...register('format')}
                                className={`w-full h-10 px-3 rounded-lg border bg-background ${errors.format ? 'border-red-500' : 'border-input'}`}
                            >
                                {FORMAT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            {errors.format && <p className="text-xs text-red-500">{errors.format.message}</p>}
                        </div>

                        <Input
                            label="Academic Year ID"
                            placeholder="UUID (optional if active session exists)"
                            {...register('academicYearId')}
                            error={errors.academicYearId?.message}
                        />

                        <Input label="Class ID" placeholder="Optional" {...register('classId')} error={errors.classId?.message} />
                        <Input label="Section ID" placeholder="Optional" {...register('sectionId')} error={errors.sectionId?.message} />
                        <Input label="Exam ID" placeholder="Optional" {...register('examId')} error={errors.examId?.message} />

                        <Input label="Month" type="number" placeholder="1-12" {...register('month')} error={errors.month?.message} />
                        <Input label="Year" type="number" placeholder="2026" {...register('year')} error={errors.year?.message} />
                        <Input label="Date From" type="date" {...register('dateFrom')} error={errors.dateFrom?.message} />
                        <Input label="Date To" type="date" {...register('dateTo')} error={errors.dateTo?.message} />
                    </div>

                    {requestError && (
                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
                            <AlertCircle size={16} />
                            {requestError}
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={isRequesting || isSubmitting}
                        className="bg-primary text-white min-w-[180px]"
                    >
                        {(isRequesting || isSubmitting) ? (
                            <>
                                <Loader2 size={16} className="mr-2 animate-spin" />
                                Queuing...
                            </>
                        ) : (
                            'Request Report'
                        )}
                    </Button>
                </form>
            </Card>

            {latestStatus && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="p-6 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div>
                                <p className="text-sm text-text-muted">Current Job</p>
                                <p className="font-semibold text-text">{latestStatus.id}</p>
                            </div>
                            <div className={`font-semibold ${getStatusTone(latestStatus.status)}`}>
                                {getStatusLabel(latestStatus.status)}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-text-muted">{statusMessage}</span>
                                <span className="font-medium text-text">{latestStatus.progress}%</span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-300" style={{ width: progressWidth }} />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" onClick={() => void refetchStatus()} disabled={isStatusPolling}>
                                <Clock3 size={15} className="mr-2" />
                                Check Status
                            </Button>
                            {latestStatus.status === 'completed' && (
                                <Button className="bg-green-600 text-white" onClick={() => void handleDownload(latestStatus)}>
                                    <Download size={15} className="mr-2" />
                                    Download
                                </Button>
                            )}
                            {latestStatus.status === 'failed' && (
                                <Button onClick={handleSubmit(onSubmit)} className="bg-primary text-white">
                                    Retry Request
                                </Button>
                            )}
                        </div>
                    </Card>
                </motion.div>
            )}

            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-text">Report History</h3>
                    {isHistoryLoading && (
                        <span className="text-sm text-text-muted flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin" />
                            Loading...
                        </span>
                    )}
                </div>

                {downloadError && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
                        <AlertCircle size={16} />
                        {downloadError}
                    </div>
                )}

                {history.length === 0 ? (
                    <div className="p-8 text-center text-sm text-text-muted">No reports generated yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left text-text-muted border-b border-border">
                                    <th className="py-2 pr-3">Type</th>
                                    <th className="py-2 pr-3">Format</th>
                                    <th className="py-2 pr-3">Status</th>
                                    <th className="py-2 pr-3">Progress</th>
                                    <th className="py-2 pr-3">Created</th>
                                    <th className="py-2 pr-3">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((job) => (
                                    <tr key={job.id} className="border-b border-border/50">
                                        <td className="py-3 pr-3 font-medium text-text">{job.report_type}</td>
                                        <td className="py-3 pr-3 uppercase text-text">{job.format}</td>
                                        <td className={`py-3 pr-3 font-semibold ${getStatusTone(job.status)}`}>
                                            {job.status === 'completed' && <CheckCircle2 size={14} className="inline mr-1" />}
                                            {getStatusLabel(job.status)}
                                        </td>
                                        <td className="py-3 pr-3 text-text">{job.progress}%</td>
                                        <td className="py-3 pr-3 text-text-muted">
                                            {job.createdAt ? new Date(job.createdAt).toLocaleString() : '-'}
                                        </td>
                                        <td className="py-3 pr-3">
                                            {job.status === 'completed' ? (
                                                <Button variant="outline" size="sm" onClick={() => void handleDownload(job)}>
                                                    <Download size={14} className="mr-1" />
                                                    Download
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-text-muted">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
