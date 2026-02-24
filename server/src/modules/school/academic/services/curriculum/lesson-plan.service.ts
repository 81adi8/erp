import { LessonPlan } from '../../../../../database/models/school/academics/curriculum/LessonPlan.model';
import { Class } from '../../../../../database/models/school/academics/class/Class.model';
import { Section } from '../../../../../database/models/school/academics/class/Section.model';
import { Subject } from '../../../../../database/models/school/academics/curriculum/Subject.model';
import { Teacher } from '../../../../../database/models/school/academics/staff/Teacher.model';
import { User } from '../../../../../database/models/shared/core/User.model';
import { Topic } from '../../../../../database/models/school/academics/curriculum/Topic.model';
import { Chapter } from '../../../../../database/models/school/academics/curriculum/Chapter.model';
import { Op, WhereOptions } from 'sequelize';
import { AcademicError, ErrorCodes } from '../../errors/academic.error';
import { CreateLessonPlanDto, UpdateLessonPlanDto, LessonPlanFilterDto, LessonPlanStatus } from '../../dto';
import { curriculumService } from './curriculum.service';
import { academicSessionService } from '../session/academic-session.service';

export class LessonPlanService {
    /**
     * Get all lesson plans with filters
     */
    async getAll(schemaName: string, institutionId: string, filters?: LessonPlanFilterDto): Promise<LessonPlan[]> {
        const where: Record<string, unknown> = { institution_id: institutionId };

        if (filters?.class_id) where.class_id = filters.class_id;
        if (filters?.section_id) where.section_id = filters.section_id;
        if (filters?.subject_id) where.subject_id = filters.subject_id;
        if (filters?.teacher_id) where.teacher_id = filters.teacher_id;
        if (filters?.status) where.status = filters.status;

        if (filters?.from_date || filters?.to_date) {
            const plannedDate: Record<symbol, string> = {};
            if (filters.from_date) plannedDate[Op.gte] = filters.from_date;
            if (filters.to_date) plannedDate[Op.lte] = filters.to_date;
            where.planned_date = plannedDate;
        }

        return await LessonPlan.schema(schemaName).findAll({
            where: where as WhereOptions,
            include: [
                { model: Class.schema(schemaName), as: 'class' },
                { model: Section.schema(schemaName), as: 'section' },
                { model: Subject.schema(schemaName), as: 'subject' },
                {
                    model: Teacher.schema(schemaName),
                    as: 'teacher',
                    attributes: ['id'],
                    include: [{
                        model: User.schema(schemaName),
                        as: 'user',
                        attributes: ['first_name', 'last_name']
                    }]
                },
                {
                    model: Topic.schema(schemaName),
                    as: 'topic',
                    where: { institution_id: institutionId },
                    required: false,
                }
            ],
            order: [['planned_date', 'DESC']]
        });
    }

    /**
     * Get lesson plan by ID
     */
    async getById(schemaName: string, institutionId: string, id: string): Promise<LessonPlan> {
        const plan = await LessonPlan.schema(schemaName).findOne({
            where: { id, institution_id: institutionId },
            include: [
                { model: Class.schema(schemaName), as: 'class' },
                { model: Section.schema(schemaName), as: 'section' },
                { model: Subject.schema(schemaName), as: 'subject' },
                { model: Teacher.schema(schemaName), as: 'teacher' },
                {
                    model: Topic.schema(schemaName),
                    as: 'topic',
                    where: { institution_id: institutionId },
                    required: false,
                    include: [{
                        model: Chapter.schema(schemaName),
                        as: 'chapter',
                        where: { institution_id: institutionId },
                        required: false,
                    }],
                }
            ]
        });

        if (!plan) {
            throw new AcademicError('Lesson plan not found', ErrorCodes.LESSON_PLAN_NOT_FOUND, 404);
        }

        return plan;
    }

    /**
     * Create new lesson plan
     */
    async create(schemaName: string, institutionId: string, data: CreateLessonPlanDto): Promise<LessonPlan> {
        // Get topic to find subject
        const topic = await curriculumService.getTopicById(schemaName, institutionId, data.topic_id);
        const chapter = topic.chapter;

        // Get current academic session
        const currentSession = await academicSessionService.getCurrent(schemaName, institutionId);
        if (!currentSession) {
            throw new AcademicError(
                'No current academic session set. Please set an active academic session first.',
                'NO_CURRENT_ACADEMIC_SESSION',
                400
            );
        }

        return await LessonPlan.schema(schemaName).create({
            ...data,
            institution_id: institutionId,
            academic_year_id: currentSession.id,
            subject_id: chapter.subject_id,
            status: data.status || LessonPlanStatus.PLANNED
        });
    }

    /**
     * Update lesson plan
     */
    async update(schemaName: string, institutionId: string, id: string, data: UpdateLessonPlanDto): Promise<LessonPlan> {
        const plan = await this.getById(schemaName, institutionId, id);
        await plan.update(data);
        return plan;
    }

    /**
     * Delete lesson plan
     */
    async delete(schemaName: string, institutionId: string, id: string): Promise<{ success: boolean; message: string }> {
        const plan = await this.getById(schemaName, institutionId, id);
        await plan.destroy();
        return { success: true, message: 'Lesson plan deleted successfully' };
    }

    /**
     * Update lesson plan status
     */
    async updateStatus(schemaName: string, institutionId: string, id: string, status: LessonPlanStatus): Promise<LessonPlan> {
        const plan = await this.getById(schemaName, institutionId, id);

        const updateData: Partial<LessonPlan> = { status };
        if (status === LessonPlanStatus.COMPLETED) {
            updateData.completion_date = new Date();
        }

        await plan.update(updateData);
        return plan;
    }

    /**
     * Get lesson plans for a teacher
     */
    async getByTeacher(schemaName: string, institutionId: string, teacherId: string, filters?: LessonPlanFilterDto): Promise<LessonPlan[]> {
        return this.getAll(schemaName, institutionId, { ...filters, teacher_id: teacherId });
    }

    /**
     * Get upcoming lesson plans
     */
    async getUpcoming(schemaName: string, institutionId: string, days: number = 7): Promise<LessonPlan[]> {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + days);

        return await LessonPlan.schema(schemaName).findAll({
            where: {
                institution_id: institutionId,
                planned_date: {
                    [Op.between]: [today, futureDate]
                },
                status: LessonPlanStatus.PLANNED
            },
            include: [
                { model: Class.schema(schemaName), as: 'class' },
                { model: Section.schema(schemaName), as: 'section' },
                { model: Subject.schema(schemaName), as: 'subject' },
                {
                    model: Teacher.schema(schemaName),
                    as: 'teacher',
                    attributes: ['id'],
                    include: [{
                        model: User.schema(schemaName),
                        as: 'user',
                        attributes: ['first_name', 'last_name']
                    }]
                },
                {
                    model: Topic.schema(schemaName),
                    as: 'topic',
                    where: { institution_id: institutionId },
                    required: false,
                }
            ],
            order: [['planned_date', 'ASC']]
        });
    }
}

export const lessonPlanService = new LessonPlanService();
