import { TimetableSlot, TimetableSlotType, TimetableSlotAttributes } from '../../../../../database/models/school/academics/timetable/TimetableSlot.model';
import { TimetableTemplate } from '../../../../../database/models/school/academics/timetable/TimetableTemplate.model';
import { Class } from '../../../../../database/models/school/academics/class/Class.model';
import { Section } from '../../../../../database/models/school/academics/class/Section.model';
import { Subject } from '../../../../../database/models/school/academics/curriculum/Subject.model';
import { AcademicSession, AcademicSessionStatus } from '../../../../../database/models/school/academics/session/AcademicSession.model';
import { AcademicError, ErrorCodes } from '../../errors/academic.error';
import { CreationAttributes, Op } from 'sequelize';
import { sequelize } from '../../../../../database/sequelize';
import { Teacher } from '../../../../../database/models/school/academics/staff/Teacher.model';
import { User } from '../../../../../database/models/shared/core/User.model';


export interface CreateSlotDto {
    class_id: string;
    section_id: string;
    subject_id?: string | null;
    teacher_id?: string | null;
    session_id: string;
    day_of_week: number;
    slot_number: number;
    slot_type?: TimetableSlotType;
    start_time: string;
    end_time: string;
    room_number?: string;
    notes?: string;
}

export interface UpdateSlotDto extends Partial<CreateSlotDto> { }

export interface BulkCreateSlotsDto {
    session_id: string;
    section_id: string;
    slots: Array<{
        day_of_week: number;
        slot_number: number;
        subject_id?: string | null;
        teacher_id?: string | null;
        slot_type?: TimetableSlotType;
        start_time: string;
        end_time: string;
    }>;
}

export interface TimetableView {
    section: {
        id: string;
        name: string;
        class: { id: string; name: string };
    };
    days: Array<{
        dayOfWeek: number;
        dayName: string;
        slots: TimetableSlot[];
    }>;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface SubjectSummary {
    id: string;
    name: string;
    code?: string;
    color_code?: string;
    icon_name?: string;
}

interface TeacherRecord {
    id: string;
    user_id?: string;
    employee_id?: string;
}

interface UserRecord {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
}

interface TeacherSummary {
    id: string;
    employee_id?: string;
    name: string | null;
    email: string | null;
}

interface TimetableSlotSnapshot extends TimetableSlotAttributes {
    created_at?: Date;
    updated_at?: Date;
}

export class TimetableService {
    // ==================== Templates ====================

    async getTemplates(schemaName: string, institutionId: string): Promise<TimetableTemplate[]> {
        return await TimetableTemplate.schema(schemaName).findAll({
            where: { institution_id: institutionId, is_active: true },
            order: [['is_default', 'DESC'], ['name', 'ASC']],
        });
    }

    async getTemplateById(schemaName: string, institutionId: string, id: string): Promise<TimetableTemplate> {
        const template = await TimetableTemplate.schema(schemaName).findOne({
            where: { id, institution_id: institutionId },
        });

        if (!template) {
            throw new AcademicError('Timetable template not found', ErrorCodes.TIMETABLE_NOT_FOUND, 404);
        }

        return template;
    }

    async createTemplate(schemaName: string, institutionId: string, data: Partial<TimetableTemplate>): Promise<TimetableTemplate> {
        if (data.is_default) {
            await TimetableTemplate.schema(schemaName).update(
                { is_default: false },
                { where: { institution_id: institutionId } }
            );
        }

        const templatePayload = {
            ...data,
            institution_id: institutionId,
        } as CreationAttributes<TimetableTemplate>;
        return await TimetableTemplate.schema(schemaName).create(templatePayload);
    }

    async updateTemplate(schemaName: string, institutionId: string, id: string, data: Partial<TimetableTemplate>): Promise<TimetableTemplate> {
        const template = await this.getTemplateById(schemaName, institutionId, id);

        if (data.is_default) {
            await TimetableTemplate.schema(schemaName).update(
                { is_default: false },
                { where: { institution_id: institutionId, id: { [Op.ne]: id } } }
            );
        }

        await template.update(data);
        return template;
    }

    async deleteTemplate(schemaName: string, institutionId: string, id: string): Promise<{ success: boolean; message: string }> {
        const template = await this.getTemplateById(schemaName, institutionId, id);
        await template.destroy();
        return { success: true, message: 'Template deleted successfully' };
    }

    // ==================== Slots ====================

    /**
     * Get slots with optional filters
     */
    async getSlots(
        schemaName: string,
        institutionId: string,
        sessionId: string,
        sectionId?: string,
        dayOfWeek?: number
    ): Promise<TimetableSlot[]> {
        const whereClause: Record<string, unknown> = {
            institution_id: institutionId,
            session_id: sessionId,
            is_active: true,
        };

        if (sectionId) {
            whereClause.section_id = sectionId;
        }

        if (dayOfWeek !== undefined && !isNaN(dayOfWeek)) {
            whereClause.day_of_week = dayOfWeek;
        }

        return await TimetableSlot.schema(schemaName).findAll({
            where: whereClause,
            order: [['day_of_week', 'ASC'], ['slot_number', 'ASC']],
        });
    }

    async getSectionTimetable(schemaName: string, institutionId: string, sectionId: string, sessionId: string): Promise<TimetableView> {
        const section = await Section.schema(schemaName).findByPk(sectionId, {
            include: [{ model: Class.schema(schemaName), as: 'class' }],
        });

        if (!section) {
            throw new AcademicError('Section not found', ErrorCodes.SECTION_NOT_FOUND, 404);
        }

        // Fetch slots without includes (schema context issues with associations)
        const slots = (await TimetableSlot.schema(schemaName).findAll({
            where: {
                institution_id: institutionId,
                section_id: sectionId,
                session_id: sessionId,
                is_active: true,
            },
            order: [['day_of_week', 'ASC'], ['slot_number', 'ASC']],
            raw: true, // Get plain objects for easier manipulation
        })) as unknown as TimetableSlotAttributes[];

        // Collect unique subject and teacher IDs
        const subjectIds = [...new Set(slots.map((s) => s.subject_id).filter((id): id is string => Boolean(id)))];
        const teacherIds = [...new Set(slots.map((s) => s.teacher_id).filter((id): id is string => Boolean(id)))];

        // Fetch subjects in batch - only minimal fields
        const subjects: SubjectSummary[] = subjectIds.length > 0
            ? (await Subject.schema(schemaName).findAll({
                where: { id: subjectIds },
                attributes: ['id', 'name', 'code', 'color_code', 'icon_name'],
                raw: true,
            })) as unknown as SubjectSummary[]
            : [];
        const subjectMap = new Map(subjects.map((s) => [s.id, {
            id: s.id,
            name: s.name,
            code: s.code,
            color_code: s.color_code,
            icon_name: s.icon_name,
        }]));

        // Fetch teachers from tenant schema
        const teachers: TeacherRecord[] = teacherIds.length > 0
            ? (await Teacher.schema(schemaName).findAll({
                where: { id: teacherIds },
                attributes: ['id', 'user_id', 'employee_id'],
                raw: true,
            })) as unknown as TeacherRecord[]
            : [];
        
        // Collect user IDs from teachers and fetch users from SAME tenant schema
        const userIds = [...new Set(teachers.map((t) => t.user_id).filter((id): id is string => Boolean(id)))];
        const users: UserRecord[] = userIds.length > 0
            ? (await User.schema(schemaName).findAll({
                where: { id: userIds },
                attributes: ['id', 'first_name', 'last_name', 'email'],
                raw: true,
            })) as unknown as UserRecord[]
            : [];
        const userMap = new Map<string, UserRecord>(users.map((u) => [u.id, u]));
        
        // Process teachers and merge with user data
        const teacherMap = new Map<string, TeacherSummary>(teachers.map((t) => {
            const user = t.user_id ? userMap.get(t.user_id) : null;
            return [t.id, {
                id: t.id,
                employee_id: t.employee_id,
                name: user 
                    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                    : null,
                email: user?.email || null,
            }];
        }));

        // Merge the data with minimal fields
        const enrichedSlots = slots.map(slot => ({
            id: slot.id,
            day_of_week: slot.day_of_week,
            slot_number: slot.slot_number,
            slot_type: slot.slot_type,
            start_time: slot.start_time,
            end_time: slot.end_time,
            room_number: slot.room_number,
            notes: slot.notes,
            subject_id: slot.subject_id,
            teacher_id: slot.teacher_id,
            subject: slot.subject_id ? subjectMap.get(slot.subject_id) || null : null,
            teacher: slot.teacher_id ? teacherMap.get(slot.teacher_id) || null : null,
        }));

        const days: TimetableView['days'] = [];
        for (let i = 0; i < 7; i++) {
            days.push({
                dayOfWeek: i,
                dayName: DAY_NAMES[i] ?? '',
                slots: enrichedSlots.filter(s => s.day_of_week === i) as unknown as TimetableSlot[],
            });
        }

        return {
            section: {
                id: section.id,
                name: section.name,
                class: {
                    id: section.class?.id || '',
                    name: section.class?.name || '',
                },
            },
            days,
        };
    }

    async getTeacherTimetable(schemaName: string, institutionId: string, teacherId: string, sessionId: string): Promise<TimetableSlot[]> {
        return await TimetableSlot.schema(schemaName).findAll({
            where: {
                institution_id: institutionId,
                teacher_id: teacherId,
                session_id: sessionId,
                is_active: true,
            },
            include: [
                { association: 'class' },
                { association: 'section' },
                { association: 'subject' },
            ],
            order: [['day_of_week', 'ASC'], ['slot_number', 'ASC']],
        });
    }

    async createSlot(schemaName: string, institutionId: string, data: CreateSlotDto): Promise<TimetableSlot> {
        // Sanitize empty strings to null for UUID fields
        const sanitizedData = {
            ...data,
            teacher_id: data.teacher_id || null,
            subject_id: data.subject_id || null,
            institution_id: institutionId,
        } as CreationAttributes<TimetableSlot>;

        // Check for conflicts
        await this.checkSlotConflicts(schemaName, institutionId, sanitizedData);

        return await TimetableSlot.schema(schemaName).create(sanitizedData);
    }

    async updateSlot(schemaName: string, institutionId: string, slotId: string, data: UpdateSlotDto): Promise<TimetableSlot> {
        const slot = await TimetableSlot.schema(schemaName).findOne({
            where: { id: slotId, institution_id: institutionId },
        });

        if (!slot) {
            throw new AcademicError('Timetable slot not found', ErrorCodes.TIMETABLE_NOT_FOUND, 404);
        }

        // Sanitize empty strings to null for UUID fields
        const sanitizedData = {
            ...data,
            teacher_id: data.teacher_id === '' ? null : data.teacher_id,
            subject_id: data.subject_id === '' ? null : data.subject_id,
        };

        // Check for conflicts if changing time/day
        if (sanitizedData.day_of_week !== undefined || sanitizedData.slot_number !== undefined || sanitizedData.teacher_id !== undefined) {
            const existingSlot = slot.toJSON() as TimetableSlotAttributes;
            await this.checkSlotConflicts(schemaName, institutionId, { ...existingSlot, ...sanitizedData }, slotId);
        }

        await slot.update(sanitizedData);
        return slot;
    }

    async deleteSlot(schemaName: string, institutionId: string, slotId: string): Promise<{ success: boolean; message: string }> {
        const slot = await TimetableSlot.schema(schemaName).findOne({
            where: { id: slotId, institution_id: institutionId },
        });

        if (!slot) {
            throw new AcademicError('Timetable slot not found', ErrorCodes.TIMETABLE_NOT_FOUND, 404);
        }

        await slot.destroy();
        return { success: true, message: 'Slot deleted successfully' };
    }

    async bulkCreateSlots(schemaName: string, institutionId: string, data: BulkCreateSlotsDto): Promise<TimetableSlot[]> {
        const transaction = await sequelize.transaction();

        try {
            // Validate section
            const section = await Section.schema(schemaName).findByPk(data.section_id, {
                include: [{ model: Class.schema(schemaName), as: 'class' }],
            });

            if (!section) {
                throw new AcademicError('Section not found', ErrorCodes.SECTION_NOT_FOUND, 404);
            }

            // Check session lock
            const session = await AcademicSession.schema(schemaName).findOne({
                where: { id: data.session_id, institution_id: institutionId },
                transaction
            });

            if (session?.is_locked) {
                throw new AcademicError('Target academic session is locked. Timetable cannot be modified.', ErrorCodes.VALIDATION_ERROR, 403);
            }

            // Clear existing slots
            await TimetableSlot.schema(schemaName).destroy({
                where: {
                    institution_id: institutionId,
                    section_id: data.section_id,
                    session_id: data.session_id,
                },
                transaction,
            });

            // Create new slots
            const slotsToCreate = data.slots.map(slotData => ({
                ...slotData,
                teacher_id: slotData.teacher_id || null,
                subject_id: slotData.subject_id || null,
                institution_id: institutionId,
                class_id: section.class_id,
                section_id: data.section_id,
                session_id: data.session_id,
            }));

            const createPayload: Array<CreationAttributes<TimetableSlot>> = slotsToCreate.map((slot) => ({
                ...slot,
                teacher_id: slot.teacher_id ?? undefined,
                subject_id: slot.subject_id ?? undefined,
            }));
            const createdSlots = await TimetableSlot.schema(schemaName).bulkCreate(createPayload, {
                transaction,
                validate: true
            });

            await transaction.commit();
            return createdSlots;
        } catch (error) {
            if (transaction) await transaction.rollback();
            throw error;
        }
    }

    async copyTimetable(
        schemaName: string,
        institutionId: string,
        sourceSessionId: string,
        targetSessionId: string,
        sectionId?: string
    ): Promise<{ copiedCount: number }> {
        const whereClause: Record<string, unknown> = {
            institution_id: institutionId,
            session_id: sourceSessionId,
        };

        if (sectionId) {
            whereClause.section_id = sectionId;
        }

        const sourceSlots = await TimetableSlot.schema(schemaName).findAll({ where: whereClause });

        const transaction = await sequelize.transaction();

        try {
            // Check target session lock
            const targetSession = await AcademicSession.schema(schemaName).findOne({
                where: { id: targetSessionId, institution_id: institutionId },
                transaction
            });

            if (targetSession?.is_locked) {
                throw new AcademicError('Target academic session is locked. Timetable cannot be copied here.', ErrorCodes.VALIDATION_ERROR, 403);
            }

            const slotsToCreate: Array<CreationAttributes<TimetableSlot>> = sourceSlots.map((slot) => {
                const slotData = slot.toJSON() as TimetableSlotSnapshot;
                const { id: _id, created_at: _createdAt, updated_at: _updatedAt, ...rest } = slotData;
                return {
                    ...rest,
                    session_id: targetSessionId,
                };
            });

            const createdSlots = await TimetableSlot.schema(schemaName).bulkCreate(slotsToCreate, { transaction });

            await transaction.commit();
            return { copiedCount: createdSlots.length };
        } catch (error) {
            if (transaction) await transaction.rollback();
            throw error;
        }
    }

    // ==================== Conflict Detection ====================

    private async checkSlotConflicts(
        schemaName: string,
        institutionId: string,
        data: CreateSlotDto | (TimetableSlotAttributes & UpdateSlotDto) | CreationAttributes<TimetableSlot>,
        excludeId?: string
    ): Promise<void> {
        // 1. Session Validation
        const session = await AcademicSession.schema(schemaName).findOne({
            where: { id: data.session_id, institution_id: institutionId }
        });

        if (!session) {
            throw new AcademicError('Academic session not found', ErrorCodes.ACADEMIC_YEAR_NOT_FOUND, 404);
        }

        if (session.is_locked) {
            throw new AcademicError('The academic session is locked. Timetable cannot be modified.', ErrorCodes.VALIDATION_ERROR, 403);
        }

        if (session.status === AcademicSessionStatus.COMPLETED || session.status === AcademicSessionStatus.ARCHIVED) {
            throw new AcademicError('Cannot modify timetable for a completed or archived session.', ErrorCodes.VALIDATION_ERROR, 403);
        }

        // 2. Weekly Off Check
        const offDays = session.weekly_off_days || [];
        if (offDays.includes(data.day_of_week)) {
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            throw new AcademicError(
                `${dayNames[data.day_of_week]} is marked as a weekly off-day in this session.`,
                ErrorCodes.VALIDATION_ERROR,
                400
            );
        }

        // 3. Check section slot conflict (Structural integrity)
        const sectionConflict = await TimetableSlot.schema(schemaName).findOne({
            where: {
                institution_id: institutionId,
                section_id: data.section_id,
                session_id: data.session_id,
                day_of_week: data.day_of_week,
                slot_number: data.slot_number,
                ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
            },
        });

        if (sectionConflict) {
            throw new AcademicError(
                `This time slot (${data.slot_number}) is already assigned for this section on this day`,
                ErrorCodes.TIMETABLE_CONFLICT
            );
        }

        // 4. Check teacher workload & overlaps (Balanced Check)
        if (data.teacher_id) {
            // Check for concurrent session conflict (Same teacher in two places at once)
            const teacherConflict = await TimetableSlot.schema(schemaName).findOne({
                where: {
                    institution_id: institutionId,
                    teacher_id: data.teacher_id,
                    session_id: data.session_id,
                    day_of_week: data.day_of_week,
                    [Op.or]: [
                        { start_time: { [Op.between]: [data.start_time, data.end_time] } },
                        { end_time: { [Op.between]: [data.start_time, data.end_time] } }
                    ],
                    ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
                },
            });

            if (teacherConflict) {
                // Determine if it's the exact same slot or just overlapping time
                const conflictDetail = teacherConflict.slot_number === data.slot_number 
                    ? `at slot ${teacherConflict.slot_number}`
                    : `from ${teacherConflict.start_time} to ${teacherConflict.end_time}`;
                
                throw new AcademicError(
                    `Teacher conflict: This teacher is already assigned to another section ${conflictDetail}`,
                    ErrorCodes.TIMETABLE_CONFLICT
                );
            }
        }
    }
}

export const timetableService = new TimetableService();
