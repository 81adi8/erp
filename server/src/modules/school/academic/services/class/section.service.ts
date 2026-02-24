import { Section } from '../../../../../database/models/school/academics/class/Section.model';
import { Class } from '../../../../../database/models/school/academics/class/Class.model';
import { Teacher } from '../../../../../database/models/school/academics/staff/Teacher.model';
import { User } from '../../../../../database/models/shared/core/User.model';
import { Op, WhereOptions } from 'sequelize';
import { AcademicError, ErrorCodes } from '../../errors/academic.error';
import { CreateSectionDto, UpdateSectionDto } from '../../dto';
import { classService } from './class.service';
import { academicRepository } from '../../repositories/academic.repository';
import { sequelize } from '../../../../../database/sequelize';

export interface CreateSectionWithClassInput extends CreateSectionDto {
    class_id: string;
    max_strength?: number;
}

export interface UpdateSectionWithClassInput extends UpdateSectionDto {
    class_id?: string;
    max_strength?: number;
}

export class SectionService {
    /**
     * Get all sections, optionally filtered by class
     */
    async getAll(schemaName: string, institutionId: string, classId?: string): Promise<Section[]> {
        const where: Record<string, unknown> = { institution_id: institutionId };
        if (classId) {
            where.class_id = classId;
        }

        return await Section.schema(schemaName).findAll({
            where: where as WhereOptions,
            include: [
                { model: Class.schema(schemaName), as: 'class' },
                {
                    model: Teacher.schema(schemaName),
                    as: 'class_teacher',
                    attributes: ['id', 'email'],
                    include: [{
                        model: User.schema(schemaName),
                        as: 'user',
                        attributes: ['first_name', 'last_name']
                    }]
                }
            ],
            order: [['name', 'ASC']]
        });
    }

    /**
     * Get section by ID
     */
    async getById(schemaName: string, institutionId: string, id: string): Promise<Section> {
        const section = await Section.schema(schemaName).findOne({
            where: { id, institution_id: institutionId },
            include: [
                { model: Class.schema(schemaName), as: 'class' },
                { model: Teacher.schema(schemaName), as: 'class_teacher' }
            ]
        });

        if (!section) {
            throw new AcademicError('Section not found', ErrorCodes.SECTION_NOT_FOUND, 404);
        }

        return section;
    }

    /**
     * Create new section under a class
     */
    async create(schemaName: string, institutionId: string, classId: string, data: CreateSectionDto): Promise<Section> {
        // Verify class exists
        await classService.getById(schemaName, institutionId, classId);

        // Check for duplicate section name in same class
        const existing = await Section.schema(schemaName).findOne({
            where: { class_id: classId, name: data.name }
        });

        if (existing) {
            throw new AcademicError(
                'Section with this name already exists in this class',
                ErrorCodes.SECTION_DUPLICATE
            );
        }

        return await Section.schema(schemaName).create({
            ...data,
            institution_id: institutionId,
            class_id: classId
        });
    }

    /**
     * Update section
     */
    async update(schemaName: string, institutionId: string, id: string, data: UpdateSectionDto): Promise<Section> {
        const section = await this.getById(schemaName, institutionId, id);

        // Check for duplicate name if name is being changed
        if (data.name && data.name !== section.name) {
            const existing = await Section.schema(schemaName).findOne({
                where: {
                    class_id: section.class_id,
                    name: data.name,
                    id: { [Op.ne]: id }
                }
            });

            if (existing) {
                throw new AcademicError(
                    'Section with this name already exists in this class',
                    ErrorCodes.SECTION_DUPLICATE
                );
            }
        }

        await section.update(data);
        return section;
    }

    /**
     * Delete section
     */
    async delete(schemaName: string, institutionId: string, id: string): Promise<{ success: boolean; message: string }> {
        return this.deleteSafely(schemaName, institutionId, id);
    }

    async createWithClass(
        schemaName: string,
        institutionId: string,
        data: CreateSectionWithClassInput
    ): Promise<Section> {
        const classObj = await academicRepository.findClassById(schemaName, institutionId, data.class_id);
        if (!classObj) {
            throw new AcademicError('Class not found', ErrorCodes.CLASS_NOT_FOUND, 404);
        }

        const duplicate = await academicRepository.findSectionByName(
            schemaName,
            institutionId,
            data.class_id,
            data.name
        );

        if (duplicate) {
            throw new AcademicError('Section with this name already exists in this class', ErrorCodes.SECTION_DUPLICATE, 409);
        }

        return sequelize.transaction(async (transaction) => {
            return academicRepository.createSection(
                schemaName,
                {
                    institution_id: institutionId,
                    class_id: data.class_id,
                    name: data.name,
                    capacity: data.capacity,
                    max_strength: data.max_strength,
                    class_teacher_id: data.class_teacher_id,
                    room_number: data.room_number,
                    floor: data.floor,
                    wing: data.wing,
                    attendance_mode: data.attendance_mode,
                    metadata: data.metadata
                },
                transaction
            );
        });
    }

    async updateWithClass(
        schemaName: string,
        institutionId: string,
        id: string,
        data: UpdateSectionWithClassInput
    ): Promise<Section> {
        const section = await academicRepository.findSectionById(schemaName, institutionId, id);
        if (!section) {
            throw new AcademicError('Section not found', ErrorCodes.SECTION_NOT_FOUND, 404);
        }

        const nextClassId = data.class_id ?? (section.get('class_id') as string);
        const nextName = data.name ?? (section.get('name') as string);

        if (data.class_id) {
            const classObj = await academicRepository.findClassById(schemaName, institutionId, data.class_id);
            if (!classObj) {
                throw new AcademicError('Class not found', ErrorCodes.CLASS_NOT_FOUND, 404);
            }
        }

        if (data.name || data.class_id) {
            const duplicate = await academicRepository.findSectionByName(
                schemaName,
                institutionId,
                nextClassId,
                nextName,
                id
            );

            if (duplicate) {
                throw new AcademicError('Section with this name already exists in this class', ErrorCodes.SECTION_DUPLICATE, 409);
            }
        }

        return sequelize.transaction(async (transaction) => {
            const updated = await academicRepository.updateSectionById(
                schemaName,
                institutionId,
                id,
                {
                    ...(data.class_id !== undefined ? { class_id: data.class_id } : {}),
                    ...(data.name !== undefined ? { name: data.name } : {}),
                    ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
                    ...(data.max_strength !== undefined ? { max_strength: data.max_strength } : {}),
                    ...(data.class_teacher_id !== undefined ? { class_teacher_id: data.class_teacher_id } : {}),
                    ...(data.room_number !== undefined ? { room_number: data.room_number } : {}),
                    ...(data.floor !== undefined ? { floor: data.floor } : {}),
                    ...(data.wing !== undefined ? { wing: data.wing } : {}),
                    ...(data.attendance_mode !== undefined ? { attendance_mode: data.attendance_mode } : {}),
                    ...(data.metadata !== undefined ? { metadata: data.metadata } : {})
                },
                transaction
            );

            if (!updated) {
                throw new AcademicError('Section update failed', ErrorCodes.INTERNAL_ERROR, 500);
            }

            return updated;
        });
    }

    async deleteSafely(schemaName: string, institutionId: string, id: string): Promise<{ success: boolean; message: string }> {
        const section = await academicRepository.findSectionById(schemaName, institutionId, id);
        if (!section) {
            throw new AcademicError('Section not found', ErrorCodes.SECTION_NOT_FOUND, 404);
        }

        const enrollmentCount = await academicRepository.countActiveEnrollmentsBySection(schemaName, institutionId, id);
        if (enrollmentCount > 0) {
            throw new AcademicError(
                `Cannot delete section with ${enrollmentCount} active student enrollment(s)`,
                ErrorCodes.VALIDATION_ERROR,
                409
            );
        }

        await sequelize.transaction(async (transaction) => {
            await academicRepository.deleteSectionById(schemaName, institutionId, id, transaction);
        });

        return { success: true, message: 'Section deleted successfully' };
    }

    /**
     * Get sections by class ID
     */
    async getByClassId(schemaName: string, institutionId: string, classId: string): Promise<Section[]> {
        return await Section.schema(schemaName).findAll({
            where: { institution_id: institutionId, class_id: classId },
            include: [{
                model: Teacher.schema(schemaName),
                as: 'class_teacher',
                attributes: ['id', 'email'],
                include: [{
                    model: User.schema(schemaName),
                    as: 'user',
                    attributes: ['first_name', 'last_name']
                }]
            }],
            order: [['name', 'ASC']]
        });
    }
}

export const sectionService = new SectionService();
