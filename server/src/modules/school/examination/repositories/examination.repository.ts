import { Exam } from '../../../../database/models/school/examination/Exam.model';
import { ExamSchedule } from '../../../../database/models/school/examination/ExamSchedule.model';
import { Mark } from '../../../../database/models/school/examination/Mark.model';
import { Grade } from '../../../../database/models/school/examination/Grade.model';
import { Class } from '../../../../database/models/school/academics/class/Class.model';
import { Subject } from '../../../../database/models/school/academics/curriculum/Subject.model';
import { Student } from '../../../../database/models/school/academics/student/Student.model';
import { AcademicSession } from '../../../../database/models/school/academics/session/AcademicSession.model';
import { TenantContext } from '../../../tenant/types/tenant.types';
import { CreationAttributes, Transaction } from 'sequelize';

export class ExaminationRepository {
    async findExams(tenant: TenantContext, whereClause: Record<string, unknown>) {
        return await Exam.schema(tenant.db_schema).findAll({
            where: whereClause,
            include: [{ model: AcademicSession.schema(tenant.db_schema), as: 'academic_session' }],
            order: [['start_date', 'DESC']],
        });
    }

    async findExamById(tenant: TenantContext, id: string) {
        return await Exam.schema(tenant.db_schema).findOne({
            where: { id, institution_id: tenant.id },
            include: [{ model: AcademicSession.schema(tenant.db_schema), as: 'academic_session' }],
        });
    }

    async createExam(tenant: TenantContext, data: CreationAttributes<Exam>) {
        return await Exam.schema(tenant.db_schema).create(data);
    }

    async findSchedules(tenant: TenantContext, examId: string) {
        return await ExamSchedule.schema(tenant.db_schema).findAll({
            where: { institution_id: tenant.id, exam_id: examId },
            include: [
                { model: Subject.schema(tenant.db_schema), as: 'subject' },
                { model: Class.schema(tenant.db_schema), as: 'class' },
            ],
            order: [['date', 'ASC'], ['start_time', 'ASC']],
        });
    }

    async findSchedulesByClass(tenant: TenantContext, classId: string, sessionId: string) {
        return await ExamSchedule.schema(tenant.db_schema).findAll({
            where: { institution_id: tenant.id, class_id: classId },
            include: [
                { model: Subject.schema(tenant.db_schema), as: 'subject' },
                { 
                    model: Exam.schema(tenant.db_schema), 
                    as: 'exam',
                    where: { academic_year_id: sessionId, is_active: true },
                },
            ],
            order: [['date', 'ASC'], ['start_time', 'ASC']],
        });
    }

    async findScheduleById(tenant: TenantContext, id: string) {
        return await ExamSchedule.schema(tenant.db_schema).findOne({
            where: { id, institution_id: tenant.id },
        });
    }

    async findScheduleWithExam(tenant: TenantContext, id: string) {
        return await ExamSchedule.schema(tenant.db_schema).findOne({
            where: { id, institution_id: tenant.id },
            include: [{ model: Exam.schema(tenant.db_schema), as: 'exam' }],
        });
    }

    async createSchedule(tenant: TenantContext, data: CreationAttributes<ExamSchedule>) {
        return await ExamSchedule.schema(tenant.db_schema).create(data);
    }

    async findMarks(tenant: TenantContext, whereClause: Record<string, unknown>) {
        return await Mark.schema(tenant.db_schema).findAll({
            where: whereClause,
            include: [{ model: Student.schema(tenant.db_schema), as: 'student' }],
            order: [['created_at', 'ASC']],
        });
    }

    async findStudentMarks(tenant: TenantContext, studentId: string, sessionId: string) {
        return await Mark.schema(tenant.db_schema).findAll({
            where: {
                institution_id: tenant.id,
                student_id: studentId,
                academic_year_id: sessionId,
            },
            include: [
                {
                    model: ExamSchedule.schema(tenant.db_schema),
                    as: 'exam_schedule',
                    include: [
                        { model: Subject.schema(tenant.db_schema), as: 'subject' },
                        { model: Exam.schema(tenant.db_schema), as: 'exam' },
                    ],
                },
            ],
            order: [['created_at', 'ASC']],
        });
    }

    async upsertMark(
        tenant: TenantContext,
        markData: CreationAttributes<Mark>,
        transaction?: Transaction
    ) {
        return await Mark.schema(tenant.db_schema).upsert(markData, { transaction });
    }

    async findGrades(tenant: TenantContext) {
        return await Grade.schema(tenant.db_schema).findAll({
            where: { institution_id: tenant.id },
            order: [['min_percentage', 'DESC']],
        });
    }

    async createGrade(tenant: TenantContext, data: CreationAttributes<Grade>) {
        return await Grade.schema(tenant.db_schema).create(data);
    }
}
