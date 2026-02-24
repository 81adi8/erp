import type { ReportJob } from '../../../../database/models/school/reports/ReportJob.model';
import { User } from '../../../../database/models/shared/core/User.model';
import { Student } from '../../../../database/models/school/academics/student/Student.model';
import { FeePayment } from '../../../../database/models/school/fees/FeePayment.model';
import { FeeCategory } from '../../../../database/models/school/fees/FeeCategory.model';
import { FeeStructure } from '../../../../database/models/school/fees/FeeStructure.model';
import { StudentFeeAssignment } from '../../../../database/models/school/fees/StudentFeeAssignment.model';

import type { ReportDataSet, ReportGeneratorContext } from './generator.types';
import { buildFullName, safeText, toNumber } from './generator.types';

type FeeDuesFilters = {
    min_due_amount?: number;
};

export const generateFeeDuesReport = async (
    job: ReportJob,
    context: ReportGeneratorContext,
): Promise<ReportDataSet> => {
    const where: Record<string, unknown> = {
        institution_id: job.institution_id,
        academic_year_id: job.academic_year_id,
    };

    const filters = (job.filters ?? {}) as FeeDuesFilters;
    const minDueAmount = filters.min_due_amount;

    const rows: string[][] = [];
    let offset = 0;

    while (true) {
        const assignments = await StudentFeeAssignment.schema(context.schema).findAll({
            where,
            include: [
                {
                    model: Student.schema(context.schema),
                    as: 'student',
                    include: [{ model: User.schema(context.schema), as: 'user' }],
                },
                {
                    model: FeeStructure.schema(context.schema),
                    as: 'fee_structure',
                    include: [{ model: FeeCategory.schema(context.schema), as: 'fee_category' }],
                },
            ],
            order: [['createdAt', 'ASC']],
            limit: context.chunkSize,
            offset,
        });

        if (assignments.length === 0) {
            break;
        }

        for (const assignment of assignments) {
            const student = assignment.student as Student | undefined;
            const user = student?.user as User | undefined;
            const feeStructure = assignment.fee_structure as FeeStructure | undefined;
            const feeCategory = feeStructure?.fee_category as FeeCategory | undefined;

            const paid = await FeePayment.schema(context.schema).sum('amount_paid', {
                where: {
                    institution_id: job.institution_id,
                    student_id: assignment.student_id,
                    academic_year_id: job.academic_year_id,
                    fee_structure_id: assignment.fee_structure_id,
                    status: 'success',
                },
            });

            const assignedAmount = toNumber(assignment.final_amount);
            const paidAmount = toNumber(paid);
            const dueAmount = Math.max(assignedAmount - paidAmount, 0);

            if (typeof minDueAmount === 'number' && dueAmount < minDueAmount) {
                continue;
            }

            rows.push([
                safeText(student?.admission_number),
                buildFullName(user?.first_name, user?.last_name),
                safeText(feeCategory?.name),
                assignedAmount.toFixed(2),
                paidAmount.toFixed(2),
                dueAmount.toFixed(2),
            ]);
        }

        offset += context.chunkSize;
    }

    return {
        title: 'Fee Dues Report',
        headers: ['Admission No', 'Student Name', 'Fee Category', 'Assigned', 'Paid', 'Due'],
        rows,
    };
};
