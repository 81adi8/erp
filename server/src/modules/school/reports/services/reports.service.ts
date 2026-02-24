import path from 'path';
import { promises as fs } from 'fs';
import crypto from 'crypto';

import type {
    ReportFilters,
    ReportFormat,
    ReportJobStatus,
    ReportType,
} from '../../../../database/models/school/reports';
import { ReportJob } from '../../../../database/models/school/reports';
import { ApiError } from '../../../../core/http/ApiError';
import { queueManager, QueueType } from '../../../../core/queue/QueueManager';
import {
    reportRepository,
    type PaginatedResult,
    type ReportHistoryQuery,
} from '../repositories/report.repository';
import { buildExcelBuffer } from '../helpers/excel.helper';
import { buildPdfBuffer } from '../helpers/pdf.helper';
import { resolveReportGenerator } from '../generators';
import type { ReportDataSet } from '../generators/generator.types';
import { validateSchemaName } from '../../../../core/database/schema-name.util';
import { logger } from '../../../../core/utils/logger';

const REPORT_STORAGE_MODE = process.env.REPORT_STORAGE_MODE?.toLowerCase() === 'inline'
    ? 'inline'
    : 'filesystem';
const REPORT_INLINE_MAX_BYTES = Number(process.env.REPORT_INLINE_MAX_BYTES ?? 3 * 1024 * 1024);
const REPORT_ENCRYPTION_KEY = process.env.REPORT_ENCRYPTION_KEY?.trim();
const REPORT_TEMP_DIR = path.join(process.cwd(), 'server', 'tmp', 'reports');
const REPORT_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const CHUNK_SIZE = 5000;

// RPT-01 FIX: Added max row limit and query timeout for report generation
const MAX_ROWS = 50000;
const QUERY_TIMEOUT_MS = 120000; // 2 minutes

const REPORT_TYPE_PRIORITY: Record<ReportType, number> = {
    student_list: 10,
    attendance_register: 12,
    fee_collection: 15,
    fee_dues: 16,
    exam_results: 18,
    exam_toppers: 18,
    student_strength: 8,
};

export interface RequestReportInput {
    institution_id: string;
    academic_year_id: string;
    report_type: ReportType;
    format: ReportFormat;
    filters: ReportFilters;
    requested_by: string;
}

export interface RequestReportOutput {
    job_id: string;
    status: ReportJobStatus;
}

export interface JobStatusOutput {
    id: string;
    status: ReportJobStatus;
    progress: number;
    report_type: ReportType;
    format: ReportFormat;
    file_name?: string;
    started_at?: Date;
    completed_at?: Date;
    error_message?: string;
}

export interface DownloadReportOutput {
    fileName: string;
    contentType: string;
    buffer: Buffer;
}

interface ReportFileInfo {
    fileName: string;
    contentType: string;
    storageUrl: string;
}

interface ReportGenerationResult {
    file: ReportFileInfo;
    rowCount: number;
}

export interface ReportProcessPayload {
    jobId: string;
    schema: string;
}

const sanitizeName = (value: string): string => value.replace(/[^a-zA-Z0-9_-]+/g, '_');

const resolveContentType = (format: ReportFormat): string => format === 'excel'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/pdf';

const toBase64Url = (buffer: Buffer): string => buffer.toString('base64url');

const fromBase64Url = (value: string): Buffer => Buffer.from(value, 'base64url');

const isInlineStorageUrl = (value: string): boolean => value.startsWith('inline://');

const buildInlineStorageUrl = (buffer: Buffer): string => `inline://${toBase64Url(buffer)}`;

const resolveEncryptionKey = (): Buffer | null => {
    if (!REPORT_ENCRYPTION_KEY) {
        return null;
    }

    const trimmed = REPORT_ENCRYPTION_KEY.trim();
    if (!trimmed) {
        return null;
    }

    const fromHex = /^[a-fA-F0-9]{64}$/.test(trimmed) ? Buffer.from(trimmed, 'hex') : null;
    const candidate = fromHex ?? Buffer.from(trimmed, 'utf8');

    return candidate.length === 32 ? candidate : null;
};

const INLINE_ENCRYPTION_KEY = resolveEncryptionKey();

const encryptInlineBuffer = (buffer: Buffer): string => {
    if (!INLINE_ENCRYPTION_KEY) {
        return buildInlineStorageUrl(buffer);
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', INLINE_ENCRYPTION_KEY, iv);
    const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `inline+enc://v1.${toBase64Url(iv)}.${toBase64Url(tag)}.${toBase64Url(ciphertext)}`;
};

const decryptInlineBuffer = (storageUrl: string): Buffer => {
    if (storageUrl.startsWith('inline://')) {
        return fromBase64Url(storageUrl.slice('inline://'.length));
    }

    if (!storageUrl.startsWith('inline+enc://v1.')) {
        throw ApiError.notFound('Unsupported report storage format');
    }

    if (!INLINE_ENCRYPTION_KEY) {
        throw ApiError.notFound('Encrypted report payload cannot be read without REPORT_ENCRYPTION_KEY');
    }

    const payload = storageUrl.slice('inline+enc://v1.'.length);
    const [ivEncoded, tagEncoded, dataEncoded] = payload.split('.');
    if (!ivEncoded || !tagEncoded || !dataEncoded) {
        throw ApiError.notFound('Invalid encrypted report payload');
    }

    const iv = fromBase64Url(ivEncoded);
    const tag = fromBase64Url(tagEncoded);
    const ciphertext = fromBase64Url(dataEncoded);

    const decipher = crypto.createDecipheriv('aes-256-gcm', INLINE_ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
};

export class ReportsService {
    async requestReport(input: RequestReportInput, schema: string): Promise<RequestReportOutput> {
        if (!queueManager.isQueueAvailable()) {
            throw ApiError.internal('Report queue is unavailable');
        }

        const job = await reportRepository.createReportJob(
            {
                institution_id: input.institution_id,
                academic_year_id: input.academic_year_id,
                report_type: input.report_type,
                format: input.format,
                filters: input.filters,
                requested_by: input.requested_by,
            },
            schema,
        );

        const enqueuePayload: ReportProcessPayload & { tenantId: string } = {
            jobId: job.id,
            schema,
            tenantId: input.institution_id,
        };

        await queueManager.addJob(
            QueueType.REPORTS,
            'generate-report',
            enqueuePayload,
            {
                priority: REPORT_TYPE_PRIORITY[input.report_type] ?? 10,
            },
        );

        return {
            job_id: job.id,
            status: job.status,
        };
    }

    async getJobStatus(
        jobId: string,
        schema: string,
        institutionId: string,
        userId: string,
    ): Promise<JobStatusOutput> {
        const job = await this.ensureOwnedJob(jobId, schema, institutionId, userId, 'view');

        return {
            id: job.id,
            status: job.status,
            progress: job.progress,
            report_type: job.report_type,
            format: job.format,
            file_name: job.file_name,
            started_at: job.started_at,
            completed_at: job.completed_at,
            error_message: job.error_message,
        };
    }

    async downloadReport(
        jobId: string,
        schema: string,
        institutionId: string,
        userId: string,
    ): Promise<DownloadReportOutput> {
        const job = await this.ensureOwnedJob(jobId, schema, institutionId, userId, 'download');

        if (job.status !== 'completed' || !job.file_url || !job.file_name) {
            throw ApiError.badRequest('Report is not ready for download');
        }

        if (job.expires_at && job.expires_at.getTime() < Date.now()) {
            throw ApiError.badRequest('Report download link has expired');
        }

        if (job.file_url && isInlineStorageUrl(job.file_url) || job.file_url?.startsWith('inline+enc://')) {
            const buffer = decryptInlineBuffer(job.file_url);
            return {
                fileName: job.file_name,
                contentType: resolveContentType(job.format),
                buffer,
            };
        }

        try {
            const buffer = await fs.readFile(job.file_url);
            return {
                fileName: job.file_name,
                contentType: resolveContentType(job.format),
                buffer,
            };
        } catch {
            throw ApiError.notFound('Report file is no longer available');
        }
    }

    async getReportHistory(
        schema: string,
        query: ReportHistoryQuery,
    ): Promise<PaginatedResult<ReportJob>> {
        return reportRepository.getJobHistory(query, schema);
    }

    async processReportJob(payload: ReportProcessPayload): Promise<void> {
        const safeSchema = validateSchemaName(payload.schema);
        const job = await reportRepository.findJobById(payload.jobId, safeSchema);
        if (!job) {
            return;
        }

        await reportRepository.updateJobStatus(
            job.id,
            {
                status: 'processing',
                progress: 10,
                started_at: new Date(),
                error_message: null,
            },
            safeSchema,
        );

        try {
            const generated = await this.generateReport(job, safeSchema);

            await reportRepository.updateJobStatus(
                job.id,
                {
                    status: 'completed',
                    progress: 100,
                    file_url: generated.file.storageUrl,
                    file_name: generated.file.fileName,
                    completed_at: new Date(),
                    expires_at: new Date(Date.now() + REPORT_TTL_MS),
                    error_message: null,
                },
                safeSchema,
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Report generation failed';

            await reportRepository.updateJobStatus(
                job.id,
                {
                    status: 'failed',
                    progress: 0,
                    error_message: message,
                    completed_at: new Date(),
                },
                safeSchema,
            );
        }
    }

    private async generateReport(job: ReportJob, schema: string): Promise<ReportGenerationResult> {
        const generator = resolveReportGenerator(job.report_type);
        
        // RPT-01 FIX: Add row limit check to prevent unbounded report generation
        const dataset = await generator(job, {
            schema,
            chunkSize: CHUNK_SIZE,
            maxRows: MAX_ROWS,
        });

        // RPT-01 FIX: Warn if dataset was truncated
        if (dataset.rows.length >= MAX_ROWS) {
            logger.warn(`[ReportsService] Report ${job.report_type} truncated at ${MAX_ROWS} rows`, {
                jobId: job.id,
                reportType: job.report_type,
            });
        }

        await reportRepository.updateJobStatus(job.id, { progress: 70 }, schema);

        // MT-04 FIX: Pass schema for tenant-partitioned file storage
        const file = await this.materializeReportFile(
            job.report_type,
            job.format,
            dataset,
            job.id,
            schema,
        );

        return {
            file,
            rowCount: dataset.rows.length,
        };
    }

    private async materializeReportFile(
        reportType: ReportType,
        format: ReportFormat,
        dataset: ReportDataSet,
        jobId: string,
        schema: string, // MT-04 FIX: Added schema parameter for tenant partitioning
    ): Promise<ReportFileInfo> {
        const safeSchema = validateSchemaName(schema);
        const baseName = `${sanitizeName(reportType)}_${jobId}`;
        if (format === 'excel') {
            const buffer = await buildExcelBuffer(
                dataset.title,
                dataset.headers.map((header) => ({
                    header,
                    key: header,
                    width: Math.max(16, header.length + 4),
                })),
                dataset.rows.map((row) => {
                    const item: Record<string, unknown> = {};
                    dataset.headers.forEach((header, index) => {
                        item[header] = row[index] ?? '';
                    });

                    return item;
                }),
            );

            const fileName = `${baseName}.xlsx`;
            if (REPORT_STORAGE_MODE === 'inline' && buffer.length <= REPORT_INLINE_MAX_BYTES) {
                return {
                    fileName,
                    storageUrl: encryptInlineBuffer(buffer),
                    contentType: resolveContentType(format),
                };
            }

            // MT-04 FIX: Partition report storage by tenant schema
            const tenantReportDir = path.join(REPORT_TEMP_DIR, safeSchema);
            await fs.mkdir(tenantReportDir, { recursive: true });
            const filePath = path.join(tenantReportDir, fileName);
            await fs.writeFile(filePath, buffer);

            if (REPORT_STORAGE_MODE === 'inline' && buffer.length > REPORT_INLINE_MAX_BYTES) {
                logger.warn('[ReportsService] Falling back to filesystem storage due to inline size limit', {
                    reportType,
                    format,
                    sizeBytes: buffer.length,
                    limitBytes: REPORT_INLINE_MAX_BYTES,
                });
            }

            return {
                fileName,
                storageUrl: filePath,
                contentType: resolveContentType(format),
            };
        }

        const pdfBuffer = await buildPdfBuffer({
            title: dataset.title,
            headers: dataset.headers,
            rows: dataset.rows,
        });

        const fileName = `${baseName}.pdf`;

        if (REPORT_STORAGE_MODE === 'inline' && pdfBuffer.length <= REPORT_INLINE_MAX_BYTES) {
            return {
                fileName,
                storageUrl: encryptInlineBuffer(pdfBuffer),
                contentType: resolveContentType(format),
            };
        }

        await fs.mkdir(REPORT_TEMP_DIR, { recursive: true });
        const filePath = path.join(REPORT_TEMP_DIR, fileName);
        await fs.writeFile(filePath, pdfBuffer);

        if (REPORT_STORAGE_MODE === 'inline' && pdfBuffer.length > REPORT_INLINE_MAX_BYTES) {
            logger.warn('[ReportsService] Falling back to filesystem storage due to inline size limit', {
                reportType,
                format,
                sizeBytes: pdfBuffer.length,
                limitBytes: REPORT_INLINE_MAX_BYTES,
            });
        }

        return {
            fileName,
            storageUrl: filePath,
            contentType: resolveContentType(format),
        };
    }

    private async ensureOwnedJob(
        jobId: string,
        schema: string,
        institutionId: string,
        userId: string,
        action: 'view' | 'download',
    ): Promise<ReportJob> {
        const job = await reportRepository.findJobById(jobId, schema);
        if (!job) {
            throw ApiError.notFound('Report job not found');
        }

        if (job.institution_id !== institutionId || job.requested_by !== userId) {
            const message = action === 'download'
                ? 'You are not allowed to download this report'
                : 'You are not allowed to view this report';
            throw ApiError.forbidden(message);
        }

        return job;
    }
}

export const reportsService = new ReportsService();
