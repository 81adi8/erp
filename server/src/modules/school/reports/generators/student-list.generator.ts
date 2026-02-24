import type { ReportJob } from '../../../../database/models/school/reports/ReportJob.model';
import { User } from '../../../../database/models/shared/core/User.model';
import { Student } from '../../../../database/models/school/academics/student/Student.model';
import { StudentEnrollment } from '../../../../database/models/school/academics/student/StudentEnrollment.model';
import { Class } from '../../../../database/models/school/academics/class/Class.model';
import { Section } from '../../../../database/models/school/academics/class/Section.model';

import type { ReportDataSet, ReportGeneratorContext } from './generator.types';
import { buildFullName, safeText } from './generator.types';

type StudentListFilters = {
    class_id?: string;
    section_id?: string;
    status?: string;
};

export const generateStudentListReport = async (
    job: ReportJob,
    context: ReportGeneratorContext,
): Promise<ReportDataSet> => {
    const where: Record<string, unknown> = {
        institution_id: job.institution_id,
        academic_year_id: job.academic_year_id,
    };

    const filters = (job.filters ?? {}) as StudentListFilters;
    if (filters.class_id) {
        where.class_id = filters.class_id;
    }
    if (filters.section_id) {
        where.section_id = filters.section_id;
    }
    if (filters.status) {
        where.status = filters.status;
    }

    const rows: string[][] = [];
    let offset = 0;

    while (true) {
        const chunk = await StudentEnrollment.schema(context.schema).findAll({
            where,
            include: [
                {
                    model: Student.schema(context.schema),
                    as: 'student',
                    include: [{
                        model: User.schema(context.schema),
                        as: 'user',
                    }],
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

        if (chunk.length === 0) {
            break;
        }

        chunk.forEach((item) => {
            const student = item.student as Student | undefined;
            const user = student?.user as User | undefined;
            const classModel = item.class as Class | undefined;
            const section = item.section as Section | undefined;

            rows.push([
                safeText(student?.admission_number),
                buildFullName(user?.first_name, user?.last_name),
                safeText(classModel?.name),
                safeText(section?.name),
                safeText(item.roll_number),
                safeText(item.status),
            ]);
        });

        offset += context.chunkSize;
    }

    return {
        title: 'Student List Report',
        headers: ['Admission No', 'Student Name', 'Class', 'Section', 'Roll No', 'Status'],
        rows,
    };
};
