import type { ReportJob } from '../../../../database/models/school/reports/ReportJob.model';
import { Student } from '../../../../database/models/school/academics/student/Student.model';
import { StudentEnrollment } from '../../../../database/models/school/academics/student/StudentEnrollment.model';
import { Class } from '../../../../database/models/school/academics/class/Class.model';
import { Section } from '../../../../database/models/school/academics/class/Section.model';

import type { ReportDataSet, ReportGeneratorContext } from './generator.types';
import { safeText } from './generator.types';

type StrengthStats = {
    className: string;
    sectionName: string;
    total: number;
    male: number;
    female: number;
    other: number;
};

export const generateStudentStrengthReport = async (
    job: ReportJob,
    context: ReportGeneratorContext,
): Promise<ReportDataSet> => {
    const stats = new Map<string, StrengthStats>();
    let offset = 0;

    while (true) {
        const enrollments = await StudentEnrollment.schema(context.schema).findAll({
            where: {
                institution_id: job.institution_id,
                academic_year_id: job.academic_year_id,
            },
            include: [
                {
                    model: Student.schema(context.schema),
                    as: 'student',
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

        if (enrollments.length === 0) {
            break;
        }

        enrollments.forEach((enrollment) => {
            const classModel = enrollment.class as Class | undefined;
            const section = enrollment.section as Section | undefined;
            const student = enrollment.student as Student | undefined;

            const key = `${classModel?.id ?? 'na'}:${section?.id ?? 'na'}`;
            const entry = stats.get(key) ?? {
                className: safeText(classModel?.name),
                sectionName: safeText(section?.name),
                total: 0,
                male: 0,
                female: 0,
                other: 0,
            };

            entry.total += 1;
            const gender = typeof student?.gender === 'string'
                ? student.gender.toLowerCase()
                : '';

            if (gender === 'male') {
                entry.male += 1;
            } else if (gender === 'female') {
                entry.female += 1;
            } else {
                entry.other += 1;
            }

            stats.set(key, entry);
        });

        offset += context.chunkSize;
    }

    const rows = Array.from(stats.values())
        .sort((a, b) => a.className.localeCompare(b.className) || a.sectionName.localeCompare(b.sectionName))
        .map((item) => [
            item.className,
            item.sectionName,
            String(item.total),
            String(item.male),
            String(item.female),
            String(item.other),
        ]);

    return {
        title: 'Student Strength Report',
        headers: ['Class', 'Section', 'Total', 'Male', 'Female', 'Other'],
        rows,
    };
};
