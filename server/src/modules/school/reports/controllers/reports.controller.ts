import { Request, Response } from 'express';

import { ApiError } from '../../../../core/http/ApiError';
import { HttpStatus } from '../../../../core/http/HttpStatus';
import { asyncHandler } from '../../../../core/utils/asyncHandler';
import {
    REPORT_FORMATS,
    REPORT_JOB_STATUSES,
    REPORT_TYPES,
    type ReportFilters,
    type ReportFormat,
    type ReportJobStatus,
    type ReportType,
} from '../../../../database/models/school/reports';
import { reportsService } from '../services/reports.service';
import {
    type ReportHistoryQueryInput,
    type RequestReportInput,
} from '../validators/reports.validators';

type TenantRequest = Request & {
    tenant?: {
        db_schema?: string;
        id?: string;
    };
    user?: {
        userId?: string;
    };
    academicSessionId?: string;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const pickString = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
};

const getTenantContext = (req: Request): { schema: string; institutionId: string } => {
    const typedReq = req as TenantRequest;
    const schema = pickString(typedReq.tenant?.db_schema);
    const institutionId = pickString(typedReq.tenant?.id);

    if (!schema || !institutionId) {
        throw ApiError.badRequest('Tenant context missing');
    }

    return { schema, institutionId };
};

const getUserId = (req: Request): string => {
    const userId = pickString((req as TenantRequest).user?.userId);
    if (!userId) {
        throw ApiError.unauthorized('User not authenticated');
    }

    return userId;
};

const resolveAcademicYearId = (req: Request, explicit?: unknown): string => {
    const typedReq = req as TenantRequest;
    const headerSession = req.headers['x-academic-session-id'];
    const fromHeader = Array.isArray(headerSession) ? headerSession[0] : headerSession;

    const candidates = [
        pickString(explicit),
        pickString(typedReq.academicSessionId),
        pickString(fromHeader),
    ].filter((value): value is string => Boolean(value));

    const academicYearId = candidates.find((value) => UUID_REGEX.test(value));
    if (!academicYearId) {
        throw ApiError.badRequest('Academic year id is required and must be a valid UUID');
    }

    return academicYearId;
};

const sendSuccess = (
    res: Response,
    data: unknown,
    message = 'Success',
    statusCode = 200,
    meta?: Record<string, unknown>,
    extra?: Record<string, unknown>
) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        errors: [],
        ...(meta ? { meta } : {}),
        ...(extra || {}),
    });
};

export const requestReport = asyncHandler(async (req: Request, res: Response) => {
    const { schema, institutionId } = getTenantContext(req);
    const userId = getUserId(req);
    const body = req.body as RequestReportInput;

    const result = await reportsService.requestReport(
        {
            institution_id: institutionId,
            academic_year_id: resolveAcademicYearId(req, body.academicYearId),
            report_type: body.reportType as ReportType,
            format: body.format as ReportFormat,
            filters: (body.filters ?? {}) as ReportFilters,
            requested_by: userId,
        },
        schema,
    );

    return sendSuccess(res, result, 'Report request accepted', 202);
});

export const getReportStatus = asyncHandler(async (req: Request, res: Response) => {
    const { schema, institutionId } = getTenantContext(req);
    const userId = getUserId(req);

    const jobId = req.params.jobId;
    if (!jobId) {
        throw new ApiError(HttpStatus.BAD_REQUEST, 'Job ID is required');
    }

    const result = await reportsService.getJobStatus(
        jobId,
        schema,
        institutionId,
        userId,
    );

    return sendSuccess(res, result, 'Report status fetched successfully');
});

export const downloadReport = asyncHandler(async (req: Request, res: Response) => {
    const { schema, institutionId } = getTenantContext(req);
    const userId = getUserId(req);

    const jobId = req.params.jobId;
    if (!jobId) {
        throw new ApiError(HttpStatus.BAD_REQUEST, 'Job ID is required');
    }

    const result = await reportsService.downloadReport(
        jobId,
        schema,
        institutionId,
        userId,
    );

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename=\"${result.fileName}\"`);
    return res.status(200).send(result.buffer);
});

export const getReportHistory = asyncHandler(async (req: Request, res: Response) => {
    const { schema, institutionId } = getTenantContext(req);
    const userId = getUserId(req);
    const query = req.query as unknown as ReportHistoryQueryInput;

    const result = await reportsService.getReportHistory(schema, {
        requestedBy: userId,
        institutionId,
        reportType: query.reportType as ReportType | undefined,
        status: query.status as ReportJobStatus | undefined,
        page: query.page,
        limit: query.limit,
    });

    const pagination = {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
    };

    return sendSuccess(
        res,
        result.data,
        'Report history fetched successfully',
        200,
        pagination,
        { pagination }
    );
});

export const getReportTypes = (_req: Request, res: Response) => {
    return sendSuccess(res, {
        reportTypes: REPORT_TYPES.map((type) => ({
            value: type,
            label: type.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
        })),
        formats: REPORT_FORMATS.map((format) => ({
            value: format,
            label: format.toUpperCase(),
        })),
        statuses: REPORT_JOB_STATUSES.map((status) => ({
            value: status,
            label: status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
        })),
    }, 'Report metadata fetched successfully');
};
