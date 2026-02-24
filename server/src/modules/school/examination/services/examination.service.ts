import { Exam } from '../../../../database/models/school/examination/Exam.model';
import { ExamSchedule } from '../../../../database/models/school/examination/ExamSchedule.model';
import { Mark } from '../../../../database/models/school/examination/Mark.model';
import { Grade } from '../../../../database/models/school/examination/Grade.model';
import { Student } from '../../../../database/models/school/academics/student/Student.model';
import { Teacher } from '../../../../database/models/school/academics/staff/Teacher.model';
import { ClassSubject } from '../../../../database/models/school/academics/curriculum/ClassSubject.model';
import { TenantContext } from '../../../tenant/types/tenant.types';
import { sequelize } from '../../../../database/sequelize';
import { ExaminationRepository } from '../repositories/examination.repository';
import { CreationAttributes } from 'sequelize';
import { RBACContext } from '../../../../core/rbac/rbac.types';

export enum ExamStatus {
    DRAFT = 'draft',
    SCHEDULED = 'scheduled',
    ONGOING = 'ongoing',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export enum ExamType {
    MID_TERM = 'MID_TERM',
    FINAL = 'FINAL',
    UNIT_TEST = 'UNIT_TEST',
    QUIZ = 'QUIZ',
    PRACTICAL = 'PRACTICAL',
    ASSIGNMENT = 'ASSIGNMENT',
}

export interface CreateExamDto {
    name: string;
    code?: string;
    type: ExamType;
    academic_year_id: string;
    start_date?: string;
    end_date?: string;
}

export interface CreateScheduleDto {
    exam_id: string;
    subject_id: string;
    class_id: string;
    date: string;
    start_time: string;
    end_time: string;
    max_marks: number;
    passing_marks?: number;
    room_number?: string;
}

export interface EnterMarksDto {
    exam_schedule_id: string;
    marks: Array<{
        student_id: string;
        marks_obtained?: number;
        is_absent?: boolean;
        remarks?: string;
    }>;
}

export interface ExamStats {
    totalExams: number;
    upcomingExams: number;
    ongoingExams: number;
    completedExams: number;
    examsByType: Array<{ type: string; count: number }>;
}

export class ExaminationService {
    private repository: ExaminationRepository;

    constructor() {
        this.repository = new ExaminationRepository();
    }

    async getExams(
        tenant: TenantContext,
        sessionId?: string,
        status?: string,
        type?: string
    ): Promise<Exam[]> {
        const whereClause: Record<string, unknown> = {
            institution_id: tenant.id,
            is_active: true,
        };

        if (sessionId) whereClause.academic_year_id = sessionId;
        if (status) whereClause.status = status;
        if (type) whereClause.type = type;

        return await this.repository.findExams(tenant, whereClause);
    }

    async getExamById(tenant: TenantContext, id: string): Promise<Exam> {
        const exam = await this.repository.findExamById(tenant, id);

        if (!exam) {
            throw new Error('Exam not found');
        }

        return exam;
    }

    async createExam(tenant: TenantContext, data: CreateExamDto): Promise<Exam> {
        return await this.repository.createExam(tenant, {
            ...data,
            institution_id: tenant.id,
            status: ExamStatus.DRAFT,
        });
    }

    async updateExam(tenant: TenantContext, id: string, data: Partial<CreateExamDto>): Promise<Exam> {
        const exam = await this.getExamById(tenant, id);
        await exam.update(data);
        return exam;
    }

    async updateExamStatus(tenant: TenantContext, id: string, status: ExamStatus): Promise<Exam> {
        const exam = await this.getExamById(tenant, id);
        await exam.update({ status });
        return exam;
    }

    async deleteExam(tenant: TenantContext, id: string): Promise<{ success: boolean }> {
        const exam = await this.getExamById(tenant, id);
        await exam.update({ is_active: false });
        return { success: true };
    }

    async getSchedules(tenant: TenantContext, examId: string): Promise<ExamSchedule[]> {
        return await this.repository.findSchedules(tenant, examId);
    }

    async getSchedulesByClass(tenant: TenantContext, classId: string, sessionId: string): Promise<ExamSchedule[]> {
        return await this.repository.findSchedulesByClass(tenant, classId, sessionId);
    }

    async createSchedule(tenant: TenantContext, data: CreateScheduleDto): Promise<ExamSchedule> {
        await this.getExamById(tenant, data.exam_id);

        return await this.repository.createSchedule(tenant, {
            ...data,
            institution_id: tenant.id,
        });
    }

    async updateSchedule(tenant: TenantContext, id: string, data: Partial<CreateScheduleDto>): Promise<ExamSchedule> {
        const schedule = await this.repository.findScheduleById(tenant, id);

        if (!schedule) {
            throw new Error('Schedule not found');
        }

        await schedule.update(data);
        return schedule;
    }

    async deleteSchedule(tenant: TenantContext, id: string): Promise<{ success: boolean }> {
        const schedule = await this.repository.findScheduleById(tenant, id);

        if (!schedule) {
            throw new Error('Schedule not found');
        }

        await schedule.destroy();
        return { success: true };
    }

    async getMarks(
        tenant: TenantContext,
        examScheduleId: string,
        classId?: string,
        sectionId?: string
    ): Promise<Mark[]> {
        const whereClause: Record<string, unknown> = {
            institution_id: tenant.id,
            exam_schedule_id: examScheduleId,
        };

        if (classId) whereClause.class_id = classId;
        if (sectionId) whereClause.section_id = sectionId;

        return await this.repository.findMarks(tenant, whereClause);
    }

    async enterMarks(tenant: TenantContext, data: EnterMarksDto, rbac?: RBACContext, userId?: string): Promise<{ success: boolean; count: number }> {
        const schedule = await this.repository.findScheduleWithExam(tenant, data.exam_schedule_id);

        if (!schedule) {
            throw new Error('Schedule not found');
        }

        const userRoles = rbac?.roles || [];
        const isAdmin = userRoles.some(role => 
            role === 'admin' || role === 'super_admin' || role === 'SUPER_ADMIN' || role === 'Admin'
        );

        // Horizontal authorization check (EXM-03) - Using runtime DB roles, NOT JWT roles
        if (rbac && !isAdmin) {
            const effectiveUserId = userId || rbac.userId;
            const teacher = await Teacher.schema(tenant.db_schema).findOne({ where: { user_id: effectiveUserId } });
            if (!teacher) {
                throw new Error('User is not a teacher and cannot enter marks');
            }
            
            const scheduleSectionId = (schedule as ExamSchedule & { section_id?: string | null }).section_id;
            const classSubjectWhere: any = {
                class_id: schedule.class_id,
                subject_id: schedule.subject_id,
                teacher_id: teacher.id
            };
            if (scheduleSectionId) {
                classSubjectWhere.section_id = scheduleSectionId;
            }
            
            const isAssigned = await ClassSubject.schema(tenant.db_schema).findOne({ where: classSubjectWhere });
            if (!isAssigned) {
                throw new Error('Teacher is not assigned to this subject/class and cannot enter marks');
            }
        }

        const transaction = await sequelize.transaction();

        try {
            // section_id must come from the exam schedule's section assignment (section_id),
            // never from class_id.
            const scheduleSectionId = (schedule as ExamSchedule & { section_id?: string | null }).section_id;
            if (!scheduleSectionId) {
                throw new Error('Schedule section_id is required to enter marks');
            }

            const studentIds = Array.from(new Set(data.marks.map(({ student_id }) => student_id)));
            const students = studentIds.length > 0
                ? await Student.schema(tenant.db_schema).findAll({
                    where: {
                        id: studentIds,
                        institution_id: tenant.id,
                    },
                    attributes: ['id'],
                    transaction,
                })
                : [];
            const validStudentIds = new Set(students.map((student) => student.id));

            const marksByStudentId = new Map<string, CreationAttributes<Mark>>();
            for (const markData of data.marks) {
                if (!validStudentIds.has(markData.student_id)) {
                    continue;
                }

                // EXM-04: Validate marks_obtained <= max_marks
                if (markData.marks_obtained !== undefined && markData.marks_obtained > (schedule.max_marks || 100)) {
                    throw new Error(`Marks obtained (${markData.marks_obtained}) cannot exceed max marks (${schedule.max_marks || 100}) for student ${markData.student_id}`);
                }

                const grade = this.calculateGrade(
                    markData.marks_obtained || 0,
                    schedule.max_marks || 100
                );

                marksByStudentId.set(markData.student_id, {
                    institution_id: tenant.id,
                    academic_year_id: schedule.exam?.academic_year_id,
                    exam_schedule_id: data.exam_schedule_id,
                    student_id: markData.student_id,
                    class_id: schedule.class_id,
                    section_id: scheduleSectionId,
                    marks_obtained: markData.marks_obtained,
                    is_absent: markData.is_absent || false,
                    remarks: markData.remarks,
                    grade,
                });
            }

            const marksArray = Array.from(marksByStudentId.values());
            if (marksArray.length > 0) {
                await Mark.schema(tenant.db_schema).bulkCreate(marksArray, {
                    transaction,
                    updateOnDuplicate: ['marks_obtained', 'grade', 'is_absent', 'remarks', 'updatedAt'],
                });
            }

            await transaction.commit();
            return { success: true, count: marksArray.length };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async getStudentMarks(
        tenant: TenantContext,
        studentId: string,
        sessionId: string
    ): Promise<Mark[]> {
        return await this.repository.findStudentMarks(tenant, studentId, sessionId);
    }

    async getGrades(tenant: TenantContext): Promise<Grade[]> {
        return await this.repository.findGrades(tenant);
    }

    async createGrade(tenant: TenantContext, data: Partial<Grade>): Promise<Grade> {
        return await this.repository.createGrade(tenant, {
            ...data,
            institution_id: tenant.id,
        });
    }

    async getExamStats(tenant: TenantContext, sessionId?: string): Promise<ExamStats> {
        const whereClause: Record<string, unknown> = {
            institution_id: tenant.id,
            is_active: true,
        };

        if (sessionId) whereClause.academic_year_id = sessionId;

        const exams = await this.repository.findExams(tenant, whereClause);

        const today = new Date().toISOString().split('T')[0];

        const typeMap = new Map<string, number>();
        exams.forEach(e => {
            const count = typeMap.get(e.type) || 0;
            typeMap.set(e.type, count + 1);
        });

        return {
            totalExams: exams.length,
            upcomingExams: exams.filter(e => e.start_date && e.start_date > new Date(today)).length,
            ongoingExams: exams.filter(e => e.status === ExamStatus.ONGOING).length,
            completedExams: exams.filter(e => e.status === ExamStatus.COMPLETED).length,
            examsByType: Array.from(typeMap.entries()).map(([type, count]) => ({ type, count })),
        };
    }

    private calculateGrade(marksObtained: number, maxMarks: number): string {
        const percentage = (marksObtained / maxMarks) * 100;

        if (percentage >= 90) return 'A+';
        if (percentage >= 80) return 'A';
        if (percentage >= 70) return 'B+';
        if (percentage >= 60) return 'B';
        if (percentage >= 50) return 'C';
        if (percentage >= 40) return 'D';
        return 'F';
    }
}

export const examinationService = new ExaminationService();
