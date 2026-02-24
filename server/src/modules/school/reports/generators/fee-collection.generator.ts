import { Op } from 'sequelize';

import type { ReportJob } from '../../../../database/models/school/reports/ReportJob.model';
import { User } from '../../../../database/models/shared/core/User.model';
import { Student } from '../../../../database/models/school/academics/student/Student.model';
import { FeePayment } from '../../../../database/models/school/fees/FeePayment.model';

import type { ReportDataSet, ReportGeneratorContext } from './generator.types';
import { buildFullName, parseDate, safeText, toNumber } from './generator.types';

type FeeCollectionFilters = {
    payment_mode?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
};

export const generateFeeCollectionReport = async (
    job: ReportJob,
    context: ReportGeneratorContext,
): Promise<ReportDataSet> => {
    const where: Record<string, unknown> = {
        institution_id: job.institution_id,
        academic_year_id: job.academic_year_id,
    };

    const filters = (job.filters ?? {}) as FeeCollectionFilters;
    if (filters.payment_mode) {
        where.payment_mode = filters.payment_mode;
    }
    if (filters.status) {
        where.status = filters.status;
    }

    const from = parseDate(filters.date_from);
    const to = parseDate(filters.date_to);
    if (from || to) {
        where.payment_date = {
            ...(from ? { [Op.gte]: from } : {}),
            ...(to ? { [Op.lte]: to } : {}),
        };
    }

    const rows: string[][] = [];
    let offset = 0;

    while (true) {
        const chunk = await FeePayment.schema(context.schema).findAll({
            where,
            include: [
                {
                    model: Student.schema(context.schema),
                    as: 'student',
                    include: [{ model: User.schema(context.schema), as: 'user' }],
                },
            ],
            order: [['payment_date', 'ASC']],
            limit: context.chunkSize,
            offset,
        });

        if (chunk.length === 0) {
            break;
        }

        chunk.forEach((payment) => {
            const student = payment.student as Student | undefined;
            const user = student?.user as User | undefined;

            rows.push([
                safeText(payment.payment_date),
                safeText(payment.receipt_number),
                safeText(student?.admission_number),
                buildFullName(user?.first_name, user?.last_name),
                safeText(payment.payment_mode),
                toNumber(payment.amount_paid).toFixed(2),
                safeText(payment.status),
            ]);
        });

        offset += context.chunkSize;
    }

    return {
        title: 'Fee Collection Report',
        headers: ['Payment Date', 'Receipt No', 'Admission No', 'Student Name', 'Payment Mode', 'Amount', 'Status'],
        rows,
    };
};
