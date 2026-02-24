import { Class } from '../../../../../database/models/school/academics/class/Class.model';
import { Section } from '../../../../../database/models/school/academics/class/Section.model';
import { Teacher } from '../../../../../database/models/school/academics/staff/Teacher.model';
import { User } from '../../../../../database/models/shared/core/User.model';
import { Op, WhereOptions } from 'sequelize';
import { AcademicError, ErrorCodes } from '../../errors/academic.error';
import { CreateClassDto, UpdateClassDto } from '../../dto';
import { PaginationQueryDto, PaginatedResponse } from '../../dto/common.dto';
import { academicRepository } from '../../repositories/academic.repository';
import { sequelize } from '../../../../../database/sequelize';

export interface ListClassesOptions {
    academic_year_id?: string;
}

export class ClassService {
    /**
     * Get all classes with pagination and sections
     */
    async getAll(schemaName: string, institutionId: string, query?: PaginationQueryDto): Promise<PaginatedResponse<Class>> {
        const { page = 1, limit = 50, search, sortBy = 'display_order', sortOrder = 'ASC' } = query || {};

        const where: Record<PropertyKey, unknown> = { institution_id: institutionId };
        if (search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { code: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const { rows, count } = await Class.schema(schemaName).findAndCountAll({
            where: where as WhereOptions,
            include: [{
                model: Section.schema(schemaName),
                as: 'sections',
                include: [{
                    model: Teacher.schema(schemaName),
                    as: 'class_teacher',
                    attributes: ['id', 'email'],
                    include: [{
                        model: User.schema(schemaName),
                        as: 'user',
                        attributes: ['first_name', 'last_name']
                    }]
                }]
            }],
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

    async list(schemaName: string, institutionId: string, options?: ListClassesOptions): Promise<Class[]> {
        return academicRepository.findAllClasses(
            schemaName,
            institutionId,
            options?.academic_year_id
        );
    }

    /**
     * Get class by ID with sections
     */
    async getById(schemaName: string, institutionId: string, id: string): Promise<Class> {
        const classObj = await Class.schema(schemaName).findOne({
            where: { id, institution_id: institutionId },
            include: [{
                model: Section.schema(schemaName),
                as: 'sections',
                include: [{ model: Teacher.schema(schemaName), as: 'class_teacher' }]
            }]
        });

        if (!classObj) {
            throw new AcademicError('Class not found', ErrorCodes.CLASS_NOT_FOUND, 404);
        }

        return classObj;
    }

    /**
     * Create new class
     */
    async create(schemaName: string, institutionId: string, data: CreateClassDto): Promise<Class> {
        // Check for duplicate name
        const existing = await Class.schema(schemaName).findOne({
            where: { institution_id: institutionId, name: data.name }
        });

        if (existing) {
            throw new AcademicError(
                'Class with this name already exists',
                ErrorCodes.CLASS_DUPLICATE
            );
        }

        // Auto-assign display order if not provided
        if (!data.display_order) {
            const maxOrder = await Class.schema(schemaName).max('display_order', {
                where: { institution_id: institutionId }
            }) as number || 0;
            data.display_order = maxOrder + 1;
        }

        return await Class.schema(schemaName).create({ ...data, institution_id: institutionId });
    }

    async createWithAcademicYear(
        schemaName: string,
        institutionId: string,
        data: CreateClassDto & { academic_year_id: string }
    ): Promise<Class> {
        const academicYear = await academicRepository.findAcademicYearById(
            schemaName,
            institutionId,
            data.academic_year_id
        );

        if (!academicYear) {
            throw new AcademicError('Academic year not found', ErrorCodes.ACADEMIC_YEAR_NOT_FOUND, 404);
        }

        const existing = await academicRepository.findClassByName(
            schemaName,
            institutionId,
            data.name,
            data.academic_year_id
        );

        if (existing) {
            throw new AcademicError('Class with this name already exists', ErrorCodes.CLASS_DUPLICATE, 409);
        }

        const maxOrder = await Class.schema(schemaName).max('display_order', {
            where: {
                institution_id: institutionId,
                academic_year_id: data.academic_year_id
            }
        }) as number | null;

        const payload = {
            ...data,
            display_order: data.display_order ?? ((maxOrder ?? 0) + 1)
        };

        return sequelize.transaction(async (transaction) => {
            return academicRepository.createClass(
                schemaName,
                {
                    institution_id: institutionId,
                    academic_year_id: payload.academic_year_id,
                    name: payload.name,
                    code: payload.code,
                    numeric_grade: payload.numeric_grade,
                    category: payload.category,
                    language_of_instruction: payload.language_of_instruction,
                    display_order: payload.display_order,
                    description: payload.description,
                    metadata: payload.metadata
                },
                transaction
            );
        });
    }

    /**
     * Update class
     */
    async update(schemaName: string, institutionId: string, id: string, data: UpdateClassDto): Promise<Class> {
        const classObj = await this.getById(schemaName, institutionId, id);

        // Check for duplicate name if name is being changed
        if (data.name && data.name !== classObj.name) {
            const existing = await Class.schema(schemaName).findOne({
                where: {
                    institution_id: institutionId,
                    name: data.name,
                    id: { [Op.ne]: id }
                }
            });

            if (existing) {
                throw new AcademicError(
                    'Class with this name already exists',
                    ErrorCodes.CLASS_DUPLICATE
                );
            }
        }

        await classObj.update(data);
        return classObj;
    }

    async updateWithAcademicYear(
        schemaName: string,
        institutionId: string,
        id: string,
        data: UpdateClassDto & { academic_year_id?: string }
    ): Promise<Class> {
        const classObj = await academicRepository.findClassById(schemaName, institutionId, id);
        if (!classObj) {
            throw new AcademicError('Class not found', ErrorCodes.CLASS_NOT_FOUND, 404);
        }

        const nextAcademicYearId = data.academic_year_id ?? classObj.get('academic_year_id');
        if (data.academic_year_id) {
            const year = await academicRepository.findAcademicYearById(schemaName, institutionId, data.academic_year_id);
            if (!year) {
                throw new AcademicError('Academic year not found', ErrorCodes.ACADEMIC_YEAR_NOT_FOUND, 404);
            }
        }

        if (data.name) {
            const duplicate = await academicRepository.findClassByName(
                schemaName,
                institutionId,
                data.name,
                nextAcademicYearId as string | undefined,
                id
            );
            if (duplicate) {
                throw new AcademicError('Class with this name already exists', ErrorCodes.CLASS_DUPLICATE, 409);
            }
        }

        return sequelize.transaction(async (transaction) => {
            const updated = await academicRepository.updateClassById(
                schemaName,
                institutionId,
                id,
                {
                    ...(data.academic_year_id !== undefined ? { academic_year_id: data.academic_year_id } : {}),
                    ...(data.name !== undefined ? { name: data.name } : {}),
                    ...(data.code !== undefined ? { code: data.code } : {}),
                    ...(data.numeric_grade !== undefined ? { numeric_grade: data.numeric_grade } : {}),
                    ...(data.category !== undefined ? { category: data.category } : {}),
                    ...(data.language_of_instruction !== undefined ? { language_of_instruction: data.language_of_instruction } : {}),
                    ...(data.display_order !== undefined ? { display_order: data.display_order } : {}),
                    ...(data.description !== undefined ? { description: data.description } : {}),
                    ...(data.metadata !== undefined ? { metadata: data.metadata } : {})
                },
                transaction
            );

            if (!updated) {
                throw new AcademicError('Class update failed', ErrorCodes.INTERNAL_ERROR, 500);
            }

            return updated;
        });
    }

    /**
     * Delete class
     */
    async delete(schemaName: string, institutionId: string, id: string): Promise<{ success: boolean; message: string }> {
        const classObj = await this.getById(schemaName, institutionId, id);

        // Check for dependent sections
        const sectionCount = await Section.schema(schemaName).count({ where: { class_id: id } });
        if (sectionCount > 0) {
            throw new AcademicError(
                `Cannot delete class with ${sectionCount} section(s). Delete sections first.`,
                ErrorCodes.CLASS_HAS_SECTIONS
            );
        }

        await classObj.destroy();
        return { success: true, message: 'Class deleted successfully' };
    }

    async deleteSafely(schemaName: string, institutionId: string, id: string): Promise<{ success: boolean; message: string }> {
        const classObj = await academicRepository.findClassById(schemaName, institutionId, id);
        if (!classObj) {
            throw new AcademicError('Class not found', ErrorCodes.CLASS_NOT_FOUND, 404);
        }

        const enrollmentCount = await academicRepository.countActiveEnrollmentsByClass(schemaName, institutionId, id);
        if (enrollmentCount > 0) {
            throw new AcademicError(
                `Cannot delete class with ${enrollmentCount} active student enrollment(s)`,
                ErrorCodes.VALIDATION_ERROR,
                409
            );
        }

        const sections = await academicRepository.findSectionsByClassId(schemaName, institutionId, id);
        if (sections.length > 0) {
            throw new AcademicError(
                `Cannot delete class with ${sections.length} section(s). Delete sections first.`,
                ErrorCodes.CLASS_HAS_SECTIONS,
                409
            );
        }

        await sequelize.transaction(async (transaction) => {
            await academicRepository.deleteClassById(schemaName, institutionId, id, transaction);
        });

        return { success: true, message: 'Class deleted successfully' };
    }

    /**
     * Reorder classes
     */
    async reorder(schemaName: string, institutionId: string, orderedIds: string[]): Promise<{ success: boolean }> {
        const transaction = await Class.sequelize?.transaction();

        try {
            for (let i = 0; i < orderedIds.length; i++) {
                await Class.schema(schemaName).update(
                    { display_order: i + 1 },
                    {
                        where: { id: orderedIds[i], institution_id: institutionId },
                        transaction
                    }
                );
            }
            await transaction?.commit();
            return { success: true };
        } catch (error) {
            await transaction?.rollback();
            throw error;
        }
    }
}

export const classService = new ClassService();
