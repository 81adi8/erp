import { baseApi, type ApiResponse } from '../../../core/api/baseApi';
import { env } from '../../../core/config/env';
import { secureStorage } from '../../../core/storage/SecureStorage';

export type ReportType =
    | 'student_list'
    | 'attendance_register'
    | 'fee_collection'
    | 'fee_dues'
    | 'exam_results'
    | 'exam_toppers'
    | 'student_strength';

export type ReportFormat = 'excel' | 'pdf';
export type ReportStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ReportFilters {
    class_id?: string;
    section_id?: string;
    exam_id?: string;
    month?: number;
    year?: number;
    date_from?: string;
    date_to?: string;
}

export interface ReportRequest {
    reportType: ReportType;
    format: ReportFormat;
    academicYearId?: string;
    filters?: ReportFilters;
}

export interface ReportRequestResult {
    job_id: string;
    status: ReportStatus;
}

export interface ReportJob {
    id: string;
    status: ReportStatus;
    progress: number;
    report_type: ReportType;
    format: ReportFormat;
    file_name?: string;
    started_at?: string;
    completed_at?: string;
    error_message?: string;
    createdAt?: string;
}

export interface ReportHistoryParams {
    page?: number;
    limit?: number;
    reportType?: ReportType;
    status?: ReportStatus;
}

export interface ReportHistoryResponse {
    success: boolean;
    data: ReportJob[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export const reportsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        requestReport: builder.mutation<ApiResponse<ReportRequestResult>, ReportRequest>({
            query: (body) => ({
                url: '/school/reports/request',
                method: 'POST',
                body,
            }),
        }),

        getReportStatus: builder.query<ApiResponse<ReportJob>, string>({
            query: (jobId) => ({
                url: `/school/reports/status/${jobId}`,
                method: 'GET',
            }),
        }),

        getReportHistory: builder.query<ReportHistoryResponse, ReportHistoryParams | void>({
            query: (params) => ({
                url: '/school/reports/history',
                method: 'GET',
                params,
            }),
        }),
    }),
    overrideExisting: false,
});

export const {
    useRequestReportMutation,
    useGetReportStatusQuery,
    useGetReportHistoryQuery,
} = reportsApi;

function getTenantHeader(): Record<string, string> {
    const tenant = secureStorage.getTenant<{ id: string }>();
    if (!tenant?.id) {
        return {};
    }

    return { 'X-Institution-ID': tenant.id };
}

function getFileNameFromDisposition(disposition: string | null, fallbackName: string): string {
    if (!disposition) {
        return fallbackName;
    }

    const match = disposition.match(/filename="?([^"]+)"?/i);
    if (!match?.[1]) {
        return fallbackName;
    }

    return match[1];
}

export async function downloadReport(jobId: string, fallbackName: string): Promise<void> {
    const response = await fetch(`${env.API_BASE_URL}/school/reports/download/${jobId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            ...getTenantHeader(),
        },
    });

    if (!response.ok) {
        throw new Error('Report download failed');
    }

    const blob = await response.blob();
    const fileName = getFileNameFromDisposition(
        response.headers.get('content-disposition'),
        fallbackName,
    );

    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
}
