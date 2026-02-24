import type { ReportJob } from '../../../../database/models/school/reports/ReportJob.model';
import { User } from '../../../../database/models/shared/core/User.model';
import { Student } from '../../../../database/models/school/academics/student/Student.model';
import { Class } from '../../../../database/models/school/academics/class/Class.model';
import { Section } from '../../../../database/models/school/academics/class/Section.model';
import { Subject } from '../../../../database/models/school/academics/curriculum/Subject.model';
import { Exam } from '../../../../database/models/school/examination/Exam.model';
import { Mark } from '../../../../database/models/school/examination/Mark.model';
import { ExamSchedule } from '../../../../database/models/school/examination/ExamSchedule.model';

import type { ReportDataSet, ReportGeneratorContext } from './generator.types';
import { buildFullName, safeText, toNumber } from './generator.types';

type ExamResultFilters = {
    class_id?: string;
    section_id?: string;
};

export const generateExamResultsReport = async (
    job: ReportJob,
    context: ReportGeneratorContext,
): Promise<ReportDataSet> => {
    const where: Record<string, unknown> = {
        institution_id: job.institution_id,
        academic_year_id: job.academic_year_id,
    };

    const filters = (job.filters ?? {}) as ExamResultFilters;
    if (filters.class_id) {
        where.class_id = filters.class_id;
    }
    if (filters.section_id) {
        where.section_id = filters.section_id;
    }

    const rows: string[][] = [];
    let offset = 0;

    while (true) {
        const marks = await Mark.schema(context.schema).findAll({
            where,
            include: [
                {
                    model: Student.schema(context.schema),
                    as: 'student',
                    include: [{ model: User.schema(context.schema), as: 'user' }],
                },
                {
                    model: ExamSchedule.schema(context.schema),
                    as: 'exam_schedule',
                    include: [
                        { model: Exam.schema(context.schema), as: 'exam' },
                        { model: Subject.schema(context.schema), as: 'subject' },
                    ],
                },
                {
                    model: Class.schema(context.schema),
                    as: 'class',
                },
                {
                    model: Section.schema(context.schema),
                    as: 'section',
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
            const examSchedule = mark.exam_schedule as ExamSchedule | undefined;
            const exam = examSchedule?.exam as Exam | undefined;
            const subject = examSchedule?.subject as Subject | undefined;
            const classModel = mark.class as Class | undefined;
            const section = mark.section as Section | undefined;

            rows.push([
                safeText(exam?.name),
                safeText(subject?.name),
                safeText(student?.admission_number),
                buildFullName(user?.first_name, user?.last_name),
                safeText(classModel?.name),
                safeText(section?.name),
                toNumber(mark.marks_obtained).toFixed(2),
                safeText(mark.grade),
                mark.is_absent ? 'Yes' : 'No',
            ]);
        });

        offset += context.chunkSize;
    }

    return {
        title: 'Exam Results Report',
        headers: ['Exam', 'Subject', 'Admission No', 'Student Name', 'Class', 'Section', 'Marks', 'Grade', 'Absent'],
        rows,
    };
};
