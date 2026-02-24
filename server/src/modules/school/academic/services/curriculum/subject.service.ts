import { Subject } from '../../../../../database/models/school/academics/curriculum/Subject.model';
import { ClassSubject } from '../../../../../database/models/school/academics/curriculum/ClassSubject.model';
import { Chapter } from '../../../../../database/models/school/academics/curriculum/Chapter.model';
import { Topic } from '../../../../../database/models/school/academics/curriculum/Topic.model';
import { Teacher } from '../../../../../database/models/school/academics/staff/Teacher.model';
import { User } from '../../../../../database/models/shared/core/User.model';
import { CreationAttributes, Op, WhereOptions } from 'sequelize';
import { AcademicError, ErrorCodes } from '../../errors/academic.error';
import { CreateSubjectDto, UpdateSubjectDto, AssignSubjectToClassDto, UpdateClassSubjectDto } from '../../dto';
import { PaginationQueryDto, PaginatedResponse } from '../../dto/common.dto';
import { classService } from '../class/class.service';
import { academicSessionService } from '../session/academic-session.service';
import { RoleType } from '../../../../../core/constants/roles';
import { academicRepository } from '../../repositories/academic.repository';
import { sequelize } from '../../../../../database/sequelize';
import { logger } from '../../../../../core/utils/logger';

export interface CreateSubjectWithAcademicInput extends CreateSubjectDto {
    max_marks?: number;
    passing_marks?: number;
}

export interface UpdateSubjectWithAcademicInput extends UpdateSubjectDto {
    max_marks?: number;
    passing_marks?: number;
}

interface AssignmentTeacherUser {
    first_name?: string;
    last_name?: string;
}

interface AssignmentTeacher {
    user?: AssignmentTeacherUser;
    name?: string;
}

interface ClassSubjectAssignmentView {
    teacher?: AssignmentTeacher;
    [key: string]: unknown;
}

export class SubjectService {
    /**
     * Get all subjects with pagination
     */
    async getAll(schemaName: string, institutionId: string, query?: PaginationQueryDto): Promise<PaginatedResponse<Subject>> {
        const { page = 1, limit = 100, search, sortBy = 'name', sortOrder = 'ASC' } = query || {};

        const where: Record<PropertyKey, unknown> = { institution_id: institutionId };
        if (search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { code: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const { rows, count } = await Subject.schema(schemaName).findAndCountAll({
            where: where as WhereOptions,
            order: [[sortBy, sortOrder]],
            limit,
            offset: (page - 1) * limit
        });

        return {
            data: rows,
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
        };
    }

    async list(schemaName: string, institutionId: string): Promise<Subject[]> {
        return academicRepository.findAllSubjects(schemaName, institutionId);
    }

    /**
     * Get subject by ID with chapters and topics
     */
    async getById(schemaName: string, institutionId: string, id: string): Promise<Subject> {
        const subject = await Subject.schema(schemaName).findOne({
            where: { id, institution_id: institutionId },
            include: [{
                model: Chapter.schema(schemaName),
                as: 'chapters',
                where: { institution_id: institutionId },
                required: false,
                include: [{
                    model: Topic.schema(schemaName),
                    as: 'topics',
                    where: { institution_id: institutionId },
                    required: false,
                }]
            }]
        });

        if (!subject) {
            throw new AcademicError('Subject not found', ErrorCodes.SUBJECT_NOT_FOUND, 404);
        }

        return subject;
    }

    /**
     * Create new subject
     */
    async create(schemaName: string, institutionId: string, data: CreateSubjectDto): Promise<Subject> {
        // Check for duplicate name or code
        const conditions: Array<{ name?: string; code?: string }> = [{ name: data.name }];
        if (data.code) conditions.push({ code: data.code });

        const existing = await Subject.schema(schemaName).findOne({
            where: {
                institution_id: institutionId,
                [Op.or]: conditions
            }
        });

        if (existing) {
            throw new AcademicError(
                'Subject with this name or code already exists',
                ErrorCodes.SUBJECT_DUPLICATE
            );
        }

        return await Subject.schema(schemaName).create({ ...data, institution_id: institutionId });
    }

    async createWithAcademic(
        schemaName: string,
        institutionId: string,
        data: CreateSubjectWithAcademicInput
    ): Promise<Subject> {
        this.validateMarks(data.max_marks, data.passing_marks);

        const duplicate = await academicRepository.findSubjectByNameOrCode(
            schemaName,
            institutionId,
            data.name,
            data.code || ''
        );

        if (duplicate) {
            throw new AcademicError('Subject with this name or code already exists', ErrorCodes.SUBJECT_DUPLICATE, 409);
        }

        return sequelize.transaction(async (transaction) => {
            return academicRepository.createSubject(
                schemaName,
                {
                    institution_id: institutionId,
                    name: data.name,
                    code: data.code,
                    subject_type: data.subject_type,
                    is_practical: data.is_practical,
                    description: data.description,
                    credit_hours: data.credit_hours,
                    color_code: data.color_code,
                    icon_name: data.icon_name,
                    is_compulsory: data.is_compulsory,
                    assessment_weights: data.assessment_weights,
                    max_marks: data.max_marks,
                    passing_marks: data.passing_marks,
                    metadata: data.metadata
                },
                transaction
            );
        });
    }

    /**
     * Update subject
     */
    async update(schemaName: string, institutionId: string, id: string, data: UpdateSubjectDto): Promise<Subject> {
        const subject = await this.getById(schemaName, institutionId, id);

        // Check for duplicates if name or code is changing
        if (data.name || data.code) {
            const conditions: Array<{ name?: string; code?: string }> = [];
            if (data.name && data.name !== subject.name) conditions.push({ name: data.name });
            if (data.code && data.code !== subject.code) conditions.push({ code: data.code });

            if (conditions.length > 0) {
                const existing = await Subject.schema(schemaName).findOne({
                    where: {
                        institution_id: institutionId,
                        id: { [Op.ne]: id },
                        [Op.or]: conditions
                    }
                });

                if (existing) {
                    throw new AcademicError(
                        'Subject with this name or code already exists',
                        ErrorCodes.SUBJECT_DUPLICATE
                    );
                }
            }
        }

        await subject.update(data);
        return subject;
    }

    async updateWithAcademic(
        schemaName: string,
        institutionId: string,
        id: string,
        data: UpdateSubjectWithAcademicInput
    ): Promise<Subject> {
        const subject = await academicRepository.findSubjectById(schemaName, institutionId, id);
        if (!subject) {
            throw new AcademicError('Subject not found', ErrorCodes.SUBJECT_NOT_FOUND, 404);
        }

        const nextMaxMarks = data.max_marks !== undefined ? data.max_marks : (subject.get('max_marks') as number | undefined);
        const nextPassingMarks = data.passing_marks !== undefined ? data.passing_marks : (subject.get('passing_marks') as number | undefined);
        this.validateMarks(nextMaxMarks, nextPassingMarks);

        if (data.name || data.code) {
            const duplicate = await academicRepository.findSubjectByNameOrCode(
                schemaName,
                institutionId,
                data.name ?? (subject.get('name') as string),
                data.code ?? (subject.get('code') as string) ?? '',
                id
            );

            if (duplicate) {
                throw new AcademicError('Subject with this name or code already exists', ErrorCodes.SUBJECT_DUPLICATE, 409);
            }
        }

        return sequelize.transaction(async (transaction) => {
            const updated = await academicRepository.updateSubjectById(
                schemaName,
                institutionId,
                id,
                {
                    ...(data.name !== undefined ? { name: data.name } : {}),
                    ...(data.code !== undefined ? { code: data.code } : {}),
                    ...(data.subject_type !== undefined ? { subject_type: data.subject_type } : {}),
                    ...(data.is_practical !== undefined ? { is_practical: data.is_practical } : {}),
                    ...(data.description !== undefined ? { description: data.description } : {}),
                    ...(data.credit_hours !== undefined ? { credit_hours: data.credit_hours } : {}),
                    ...(data.color_code !== undefined ? { color_code: data.color_code } : {}),
                    ...(data.icon_name !== undefined ? { icon_name: data.icon_name } : {}),
                    ...(data.is_compulsory !== undefined ? { is_compulsory: data.is_compulsory } : {}),
                    ...(data.assessment_weights !== undefined ? { assessment_weights: data.assessment_weights } : {}),
                    ...(data.max_marks !== undefined ? { max_marks: data.max_marks } : {}),
                    ...(data.passing_marks !== undefined ? { passing_marks: data.passing_marks } : {}),
                    ...(data.metadata !== undefined ? { metadata: data.metadata } : {})
                },
                transaction
            );

            if (!updated) {
                throw new AcademicError('Subject update failed', ErrorCodes.INTERNAL_ERROR, 500);
            }

            return updated;
        });
    }

    /**
     * Delete subject
     */
    async delete(schemaName: string, institutionId: string, id: string): Promise<{ success: boolean; message: string }> {
        const subject = await this.getById(schemaName, institutionId, id);

        // Check for chapters
        const chapterCount = await Chapter.schema(schemaName).count({
            where: { subject_id: id, institution_id: institutionId },
        });
        if (chapterCount > 0) {
            throw new AcademicError(
                `Cannot delete subject with ${chapterCount} chapter(s). Delete chapters first.`,
                ErrorCodes.SUBJECT_HAS_CHAPTERS
            );
        }

        await subject.destroy();
        return { success: true, message: 'Subject deleted successfully' };
    }

    async deleteSafely(schemaName: string, institutionId: string, id: string): Promise<{ success: boolean; message: string }> {
        const subject = await academicRepository.findSubjectById(schemaName, institutionId, id);
        if (!subject) {
            throw new AcademicError('Subject not found', ErrorCodes.SUBJECT_NOT_FOUND, 404);
        }

        const chapterCount = await Chapter.schema(schemaName).count({
            where: { subject_id: id, institution_id: institutionId },
        });
        if (chapterCount > 0) {
            throw new AcademicError(
                `Cannot delete subject with ${chapterCount} chapter(s). Delete chapters first.`,
                ErrorCodes.SUBJECT_HAS_CHAPTERS,
                409
            );
        }

        const assignmentCount = await academicRepository.countClassSubjectUsage(schemaName, institutionId, id);
        if (assignmentCount > 0) {
            throw new AcademicError(
                `Cannot delete subject assigned to ${assignmentCount} class mapping(s)`,
                ErrorCodes.VALIDATION_ERROR,
                409
            );
        }

        await sequelize.transaction(async (transaction) => {
            await academicRepository.deleteSubjectById(schemaName, institutionId, id, transaction);
        });

        return { success: true, message: 'Subject deleted successfully' };
    }

    // ==================== Class-Subject Assignments ====================

    /**
     * Get subjects assigned to a class
     */
    async getClassSubjects(
        schemaName: string,
        institutionId: string,
        classId: string,
        academicYearId?: string
    ): Promise<ClassSubjectAssignmentView[]> {
        const currentSession = academicYearId ? { id: academicYearId } : await academicSessionService.getCurrent(schemaName, institutionId);

        const where: Record<string, string> = {
            institution_id: institutionId,
            class_id: classId
        };

        if (currentSession) {
            where.academic_year_id = currentSession.id;
        }

        const assignments = await ClassSubject.schema(schemaName).findAll({
            where: where as WhereOptions,
            include: [
                { model: Subject.schema(schemaName), as: 'subject' },
                {
                    model: Teacher.schema(schemaName),
                    as: 'teacher',
                    attributes: ['id', 'email'],
                    include: [{
                        model: User.schema(schemaName),
                        as: 'user',
                        attributes: ['first_name', 'last_name']
                    }]
                }
            ],
            order: [['created_at', 'ASC']]
        });

        return assignments.map((a) => {
            const assignment = a.toJSON() as ClassSubjectAssignmentView;
            if (assignment.teacher && assignment.teacher.user) {
                assignment.teacher.name = `${assignment.teacher.user.first_name || ''} ${assignment.teacher.user.last_name || ''}`.trim();
            }
            return assignment;
        });
    }

    /**
     * Assign subject to class
     */
    async assignToClass(schemaName: string, institutionId: string, classId: string, data: AssignSubjectToClassDto): Promise<ClassSubject> {
        // Verify class exists
        await classService.getById(schemaName, institutionId, classId);

        // Get current academic year
        const currentSession = await academicSessionService.getCurrent(schemaName, institutionId);
        if (!currentSession) {
            throw new AcademicError(
                'No current academic session found. Please create one first.',
                ErrorCodes.ACADEMIC_YEAR_NOT_FOUND,
                400
            );
        }

        // Resolve teacher ID if provided
        if (data.teacher_id) {
            data.teacher_id = await this._resolveTeacherId(schemaName, institutionId, data.teacher_id);
        }

        // Check if already assigned (in current academic year)
        const existing = await ClassSubject.schema(schemaName).findOne({
            where: {
                institution_id: institutionId,
                class_id: classId,
                subject_id: data.subject_id,
                academic_year_id: currentSession.id
            }
        });

        if (existing) {
            throw new AcademicError(
                'Subject already assigned to this class in the current session',
                ErrorCodes.SUBJECT_ALREADY_ASSIGNED
            );
        }

        return await ClassSubject.schema(schemaName).create({
            ...data,
            institution_id: institutionId,
            academic_year_id: currentSession.id,
            class_id: classId
        });
    }

    /**
     * Update class-subject assignment
     */
    async updateClassSubject(
        schemaName: string,
        institutionId: string,
        classId: string,
        subjectId: string,
        data: UpdateClassSubjectDto
    ): Promise<ClassSubject> {
        const currentSession = await academicSessionService.getCurrent(schemaName, institutionId);
        if (!currentSession) {
            throw new AcademicError('No current academic session found', ErrorCodes.ACADEMIC_YEAR_NOT_FOUND, 400);
        }

        const assignment = await ClassSubject.schema(schemaName).findOne({
            where: {
                institution_id: institutionId,
                class_id: classId,
                subject_id: subjectId,
                academic_year_id: currentSession.id
            }
        });

        if (!assignment) {
            throw new AcademicError(
                'Class-subject assignment not found for current session',
                ErrorCodes.ASSIGNMENT_NOT_FOUND,
                404
            );
        }

        if (data.teacher_id) {
            data.teacher_id = await this._resolveTeacherId(schemaName, institutionId, data.teacher_id);
        }

        await assignment.update(data);
        return assignment;
    }

    /**
     * Remove subject from class
     */
    async removeFromClass(schemaName: string, institutionId: string, classId: string, subjectId: string): Promise<{ success: boolean; message: string }> {
        const currentSession = await academicSessionService.getCurrent(schemaName, institutionId);
        if (!currentSession) {
            throw new AcademicError('No current academic session found', ErrorCodes.ACADEMIC_YEAR_NOT_FOUND, 400);
        }

        const result = await ClassSubject.schema(schemaName).destroy({
            where: {
                institution_id: institutionId,
                class_id: classId,
                subject_id: subjectId,
                academic_year_id: currentSession.id
            }
        });

        if (result === 0) {
            throw new AcademicError('Assignment not found for current session', ErrorCodes.ASSIGNMENT_NOT_FOUND, 404);
        }

        return { success: true, message: 'Subject removed from class' };
    }

    async getTeacherAssignments(schemaName: string, institutionId: string, teacherId: string) {
        const teacher = await academicRepository.findTeacherById(schemaName, institutionId, teacherId);
        if (!teacher) {
            throw new AcademicError('Teacher not found', ErrorCodes.TEACHER_NOT_FOUND, 404);
        }

        return academicRepository.findAssignmentsByTeacher(schemaName, institutionId, teacherId);
    }

    async getSectionAssignments(schemaName: string, institutionId: string, sectionId: string) {
        const section = await academicRepository.findSectionById(schemaName, institutionId, sectionId);
        if (!section) {
            throw new AcademicError('Section not found', ErrorCodes.SECTION_NOT_FOUND, 404);
        }

        return academicRepository.findAssignmentsBySection(schemaName, institutionId, sectionId);
    }

    /**
     * Helper to resolve teacher_id (can be Teacher ID or User ID)
     * and auto-create Teacher profile if missing.
     */
    private async _resolveTeacherId(schemaName: string, institutionId: string, id: string): Promise<string> {
        logger.info(`[SubjectService] Resolving teacher for ID: ${id}, Institution: ${institutionId}, Schema: ${schemaName}`);

        // 1. First, check if ID is already associated with ANY existing Teacher record (by ID or UserID)
        let teacher = await Teacher.schema(schemaName).findOne({
            where: {
                [Op.or]: [{ id }, { user_id: id }]
            }
        });

        if (teacher) {
            logger.info(`[SubjectService] Found existing teacher record: ${teacher.id}, Inst: ${teacher.institution_id}`);
            if (teacher.institution_id !== institutionId) {
                logger.info(`[SubjectService] Syncing teacher ${teacher.id} institution: ${teacher.institution_id} -> ${institutionId}`);
                await teacher.update({ institution_id: institutionId });
            }
            return teacher.id;
        }

        // 2. No Teacher record found, try to find a User record with this ID
        logger.info(`[SubjectService] No Teacher found, looking for User: ${id}`);
        const user = await User.schema(schemaName).findOne({ where: { id } });

        if (user) {
            const userType = (user.user_type as string || '').toLowerCase();
            const isTeacher = userType === 'teacher' || userType === 'faculty' || userType === 'instructor';

            logger.info(`[SubjectService] Found user: ${user.id}, email: ${user.email}, user_type: ${userType}, inst: ${user.institution_id}`);

            // Sync user institution if missing or different
            if (!user.institution_id || user.institution_id !== institutionId) {
                logger.info(`[SubjectService] Syncing user ${user.id} institution: ${user.institution_id} -> ${institutionId}`);
                await user.update({ institution_id: institutionId });
            }

            if (isTeacher) {
                let existingTeacher = await Teacher.schema(schemaName).findOne({ where: { user_id: user.id } });

                if (existingTeacher) {
                    logger.info(`[SubjectService] Found teacher record ${existingTeacher.id} for user ${user.id}, syncing institution`);
                    if (existingTeacher.institution_id !== institutionId) {
                        await existingTeacher.update({ institution_id: institutionId });
                    }
                    return existingTeacher.id;
                }

                logger.info(`[SubjectService] Creating new teacher profile for user ${user.id} in institution ${institutionId}`);
                const teacherPayload: CreationAttributes<Teacher> = {
                    user_id: user.id,
                    institution_id: institutionId,
                    email: user.email,
                    is_active: true
                };
                teacher = await Teacher.schema(schemaName).create(teacherPayload);
                return teacher.id;
            } else {
                logger.info(`[SubjectService] User ${user.id} is NOT a teacher (type: ${userType})`);
            }
        } else {
            logger.info(`[SubjectService] No User found with ID: ${id}`);
            // NOTE: Do not perform cross-tenant/public schema fallback lookup.
            // Teacher resolution must stay strictly tenant-scoped.
        }

        logger.error(`[SubjectService] Failed to resolve teacher ID: ${id} for institution ${institutionId}`);
        throw new AcademicError('Invalid teacher ID provided. Teacher profile not found.', ErrorCodes.TEACHER_NOT_FOUND, 400);
    }

    private validateMarks(maxMarks?: number, passingMarks?: number): void {
        const hasMax = maxMarks !== undefined && maxMarks !== null;
        const hasPassing = passingMarks !== undefined && passingMarks !== null;

        if (!hasMax && !hasPassing) {
            return;
        }

        if (!hasMax || !hasPassing) {
            throw new AcademicError(
                'Both max_marks and passing_marks are required together',
                ErrorCodes.VALIDATION_ERROR,
                400
            );
        }

        if ((maxMarks as number) <= 0) {
            throw new AcademicError('max_marks must be greater than 0', ErrorCodes.VALIDATION_ERROR, 400);
        }

        if ((passingMarks as number) < 0) {
            throw new AcademicError('passing_marks cannot be negative', ErrorCodes.VALIDATION_ERROR, 400);
        }

        if ((passingMarks as number) > (maxMarks as number)) {
            throw new AcademicError('passing_marks cannot exceed max_marks', ErrorCodes.VALIDATION_ERROR, 400);
        }
    }
}

export const subjectService = new SubjectService();
