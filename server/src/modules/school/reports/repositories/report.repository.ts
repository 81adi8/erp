import { Op, Transaction, WhereOptions } from 'sequelize';
import { ReportJob } from '../../../../database/models/school/reports/ReportJob.model';
import type {
    ReportFilters,
    ReportFormat,
    ReportJobStatus,
    ReportType,
} from '../../../../database/models/school/reports';

export interface CreateReportJobInput {
    institution_id: string;
    academic_year_id: string;
    report_type: ReportType;
    format: ReportFormat;
    filters: ReportFilters;
    requested_by: string;
}

export interface UpdateReportJobStatusInput {
    status?: ReportJobStatus;
    progress?: number;
    file_url?: string | null;
    file_name?: string | null;
    error_message?: string | null;
    started_at?: Date | null;
    completed_at?: Date | null;
    expires_at?: Date | null;
}

export interface ReportHistoryQuery {
    requestedBy: string;
    institutionId?: string;
    reportType?: ReportType;
    status?: ReportJobStatus;
    page?: number;
    limit?: number;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

const reportModel = (schema: string) => ReportJob.schema(schema);

export class ReportRepository {
    async createReportJob(
        data: CreateReportJobInput,
        schema: string,
        transaction?: Transaction,
    ): Promise<ReportJob> {
        return reportModel(schema).create(data as unknown as Record<string, unknown>, { transaction });
    }

    async findJobById(id: string, schema: string): Promise<ReportJob | null> {
        return reportModel(schema).findByPk(id);
    }

    async updateJobStatus(
        id: string,
        data: UpdateReportJobStatusInput,
        schema: string,
        transaction?: Transaction,
    ): Promise<ReportJob | null> {
        await reportModel(schema).update(data, {
            where: { id },
            transaction,
        });

        return this.findJobById(id, schema);
    }

    async getJobHistory(
        query: ReportHistoryQuery,
        schema: string,
    ): Promise<PaginatedResult<ReportJob>> {
        const page = Math.max(1, query.page ?? 1);
        const limit = Math.min(100, Math.max(1, query.limit ?? 20));

        const where: WhereOptions = {
            requested_by: query.requestedBy,
        };

        if (query.institutionId) {
            where.institution_id = query.institutionId;
        }

        if (query.reportType) {
            where.report_type = query.reportType;
        }

        if (query.status) {
            where.status = query.status;
        }

        const { rows, count } = await reportModel(schema).findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit,
            offset: (page - 1) * limit,
        });

        return {
            data: rows,
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        };
    }

    async findExpiredJobs(schema: string, now: Date = new Date()): Promise<ReportJob[]> {
        return reportModel(schema).findAll({
            where: {
                status: 'completed',
                expires_at: {
                    [Op.lt]: now,
                },
            },
        });
    }
}

export const reportRepository = new ReportRepository();
