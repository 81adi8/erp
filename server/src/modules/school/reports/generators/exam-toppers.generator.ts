import type { ReportJob } from '../../../../database/models/school/reports/ReportJob.model';
import { User } from '../../../../database/models/shared/core/User.model';
import { Student } from '../../../../database/models/school/academics/student/Student.model';
import { Exam } from '../../../../database/models/school/examination/Exam.model';
import { Mark } from '../../../../database/models/school/examination/Mark.model';
import { ExamSchedule } from '../../../../database/models/school/examination/ExamSchedule.model';

import type { ReportDataSet, ReportGeneratorContext } from './generator.types';
import { buildFullName, safeText, toNumber } from './generator.types';

type ExamToppersFilters = {
    exam_id?: string;
};

type TopperAggregate = {
    studentName: string;
    admissionNo: string;
    examName: string;
    total: number;
};

export const generateExamToppersReport = async (
    job: ReportJob,
    context: ReportGeneratorContext,
): Promise<ReportDataSet> => {
    const filters = (job.filters ?? {}) as ExamToppersFilters;
    const aggregate = new Map<string, TopperAggregate>();

    let offset = 0;
    while (true) {
        const marks = await Mark.schema(context.schema).findAll({
            where: {
                institution_id: job.institution_id,
                academic_year_id: job.academic_year_id,
            },
            include: [
                {
                    model: Student.schema(context.schema),
                    as: 'student',
                    include: [{ model: User.schema(context.schema), as: 'user' }],
                },
                {
                    model: ExamSchedule.schema(context.schema),
                    as: 'exam_schedule',
                    include: [{ model: Exam.schema(context.schema), as: 'exam' }],
                },
            ],
            order: [['createdAt', 'ASC']],
            limit: context.chunkSize,
            offset,
        });

        if (marks.length === 0) {
            break;
        }

        marks.forEach((mark) => {
            const student = mark.student as Student | undefined;
            const user = student?.user as User | undefined;
            const exam = (mark.exam_schedule as ExamSchedule | undefined)?.exam as Exam | undefined;

            if (!exam || !student) {
                return;
            }

            if (filters.exam_id && exam.id !== filters.exam_id) {
                return;
            }

            const key = `${exam.id}:${student.id}`;
            const current = aggregate.get(key) ?? {
                studentName: buildFullName(user?.first_name, user?.last_name),
                admissionNo: safeText(student.admission_number),
                examName: safeText(exam.name),
                total: 0,
            };

            current.total += toNumber(mark.marks_obtained);
            aggregate.set(key, current);
        });

        offset += context.chunkSize;
    }

    const rows = Array.from(aggregate.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 50)
        .map((item, index) => [
            String(index + 1),
            item.examName,
            item.admissionNo,
            item.studentName,
            item.total.toFixed(2),
        ]);

    return {
        title: 'Exam Toppers Report',
        headers: ['Rank', 'Exam', 'Admission No', 'Student Name', 'Total Marks'],
        rows,
    };
};
