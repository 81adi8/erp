import { Op } from 'sequelize';

import type { ReportJob } from '../../../../database/models/school/reports/ReportJob.model';
import { User } from '../../../../database/models/shared/core/User.model';
import { Student } from '../../../../database/models/school/academics/student/Student.model';
import { Class } from '../../../../database/models/school/academics/class/Class.model';
import { Section } from '../../../../database/models/school/academics/class/Section.model';
import { StudentAttendance } from '../../../../database/models/school/attendance/StudentAttendance.model';

import type { ReportDataSet, ReportGeneratorContext } from './generator.types';
import { buildFullName, parseDate, safeText } from './generator.types';

type AttendanceFilters = {
    class_id?: string;
    section_id?: string;
    date_from?: string;
    date_to?: string;
};

export const generateAttendanceRegisterReport = async (
    job: ReportJob,
    context: ReportGeneratorContext,
): Promise<ReportDataSet> => {
    const where: Record<string, unknown> = {
        institutionId: job.institution_id,
        academicYearId: job.academic_year_id,
    };

    const filters = (job.filters ?? {}) as AttendanceFilters;
    if (filters.class_id) {
        where.classId = filters.class_id;
    }
    if (filters.section_id) {
        where.sectionId = filters.section_id;
    }

    const from = parseDate(filters.date_from);
    const to = parseDate(filters.date_to);
    if (from || to) {
        where.date = {
            ...(from ? { [Op.gte]: from } : {}),
            ...(to ? { [Op.lte]: to } : {}),
        };
    }

    const rows: string[][] = [];
    let offset = 0;

    while (true) {
        const chunk = await StudentAttendance.schema(context.schema).findAll({
            where,
            include: [
                {
                    model: Student.schema(context.schema),
                    as: 'student',
                    include: [{ model: User.schema(context.schema), as: 'user' }],
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
            order: [['date', 'ASC']],
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
                safeText(item.date),
                safeText(student?.admission_number),
                buildFullName(user?.first_name, user?.last_name),
                safeText(classModel?.name),
                safeText(section?.name),
                safeText(item.status),
            ]);
        });

        offset += context.chunkSize;
    }

    return {
        title: 'Attendance Register Report',
        headers: ['Date', 'Admission No', 'Student Name', 'Class', 'Section', 'Attendance'],
        rows,
    };
};
