import { ApiError } from '../../../../core/http/ApiError';
import type { ReportType } from '../../../../database/models/school/reports';

import type { ReportGenerator } from './generator.types';
import { generateStudentListReport } from './student-list.generator';
import { generateAttendanceRegisterReport } from './attendance-register.generator';
import { generateFeeCollectionReport } from './fee-collection.generator';
import { generateFeeDuesReport } from './fee-dues.generator';
import { generateExamResultsReport } from './exam-results.generator';
import { generateExamToppersReport } from './exam-toppers.generator';
import { generateStudentStrengthReport } from './student-strength.generator';

export const reportGenerators: Record<ReportType, ReportGenerator> = {
    student_list: generateStudentListReport,
    attendance_register: generateAttendanceRegisterReport,
    fee_collection: generateFeeCollectionReport,
    fee_dues: generateFeeDuesReport,
    exam_results: generateExamResultsReport,
    exam_toppers: generateExamToppersReport,
    student_strength: generateStudentStrengthReport,
};

export const resolveReportGenerator = (reportType: ReportType): ReportGenerator => {
    const generator = reportGenerators[reportType];
    if (!generator) {
        throw ApiError.badRequest('Unsupported report type');
    }

    return generator;
};
