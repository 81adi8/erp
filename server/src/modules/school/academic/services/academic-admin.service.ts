import { AcademicError, ErrorCodes } from '../errors/academic.error';
import { academicRepository } from '../repositories/academic.repository';
import { sequelize } from '../../../../database/sequelize';
import { DayOfWeek, Timetable } from '../../../../database/models/school/academics/timetable/Timetable.model';

export interface CreateAcademicYearInput {
    name: string;
    start_date: string;
    end_date: string;
    is_active?: boolean;
}

export interface UpdateAcademicYearInput {
    name?: string;
    start_date?: string;
    end_date?: string;
    is_active?: boolean;
}

export interface CreateClassTeacherAssignmentInput {
    teacher_id: string;
    class_id: string;
    section_id: string;
    academic_year_id: string;
    is_active?: boolean;
}

export interface CreateSubjectTeacherAssignmentInput {
    teacher_id: string;
    subject_id: string;
    section_id: string;
    academic_year_id: string;
    is_active?: boolean;
}

export interface CreateAcademicTimetableInput {
    academic_year_id: string;
    class_id: string;
    section_id: string;
    subject_id: string;
    teacher_id: string;
    day_of_week: DayOfWeek;
    period_number: number;
    start_time: string;
    end_time: string;
    room_number?: string;
    is_active?: boolean;
}

export interface UpdateAcademicTimetableInput {
    academic_year_id?: string;
    class_id?: string;
    section_id?: string;
    subject_id?: string;
    teacher_id?: string;
    day_of_week?: DayOfWeek;
    period_number?: number;
    start_time?: string;
    end_time?: string;
    room_number?: string;
    is_active?: boolean;
}

export interface ConflictCheckInput {
    academic_year_id: string;
    class_id: string;
    section_id: string;
    teacher_id: string;
    day_of_week: DayOfWeek;
    period_number: number;
    exclude_id?: string;
}

interface TimetableDayEntry {
    day_of_week: DayOfWeek;
    period_number: number | string;
    [key: string]: unknown;
}

export class AcademicAdminService {
    private readonly timetableDays: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    // ==================== Academic Year ====================
    async getAcademicYears(schema: string, institutionId: string) {
        return academicRepository.findAllAcademicYears(schema, institutionId);
    }

    async createAcademicYear(schema: string, institutionId: string, payload: CreateAcademicYearInput) {
        this.ensureDateRange(payload.start_date, payload.end_date);

        const duplicate = await academicRepository.findAcademicYearByName(
            schema,
            institutionId,
            payload.name
        );

        if (duplicate) {
            throw new AcademicError('Academic year name already exists', ErrorCodes.VALIDATION_ERROR, 409);
        }

        return sequelize.transaction(async (transaction) => {
            if (payload.is_active) {
                await academicRepository.setOnlyActiveAcademicYear(schema, institutionId, '__none__', transaction);
            }

            const created = await academicRepository.createAcademicYear(
                schema,
                {
                    institution_id: institutionId,
                    name: payload.name,
                    start_date: new Date(payload.start_date),
                    end_date: new Date(payload.end_date),
                    is_active: Boolean(payload.is_active)
                },
                transaction
            );

            if (payload.is_active) {
                await academicRepository.setOnlyActiveAcademicYear(schema, institutionId, created.id, transaction);
            }

            return created;
        });
    }

    async updateAcademicYear(
        schema: string,
        institutionId: string,
        id: string,
        payload: UpdateAcademicYearInput
    ) {
        const existing = await academicRepository.findAcademicYearById(schema, institutionId, id);
        if (!existing) {
            throw new AcademicError('Academic year not found', ErrorCodes.ACADEMIC_YEAR_NOT_FOUND, 404);
        }

        const startDate = payload.start_date ?? String(existing.get('start_date'));
        const endDate = payload.end_date ?? String(existing.get('end_date'));
        this.ensureDateRange(String(startDate), String(endDate));

        if (payload.name) {
            const duplicate = await academicRepository.findAcademicYearByName(
                schema,
                institutionId,
                payload.name,
                id
            );
            if (duplicate) {
                throw new AcademicError('Academic year name already exists', ErrorCodes.VALIDATION_ERROR, 409);
            }
        }

        return sequelize.transaction(async (transaction) => {
            const updated = await academicRepository.updateAcademicYearById(
                schema,
                institutionId,
                id,
                {
                    ...(payload.name !== undefined ? { name: payload.name } : {}),
                    ...(payload.start_date !== undefined ? { start_date: new Date(payload.start_date) } : {}),
                    ...(payload.end_date !== undefined ? { end_date: new Date(payload.end_date) } : {}),
                    ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {})
                },
                transaction
            );

            if (payload.is_active === true) {
                await academicRepository.setOnlyActiveAcademicYear(schema, institutionId, id, transaction);
                return academicRepository.findAcademicYearById(schema, institutionId, id);
            }

            return updated;
        });
    }

    async deleteAcademicYear(schema: string, institutionId: string, id: string) {
        const existing = await academicRepository.findAcademicYearById(schema, institutionId, id);
        if (!existing) {
            throw new AcademicError('Academic year not found', ErrorCodes.ACADEMIC_YEAR_NOT_FOUND, 404);
        }

        const deleted = await academicRepository.deleteAcademicYearById(schema, institutionId, id);
        if (!deleted) {
            throw new AcademicError('Academic year delete failed', ErrorCodes.INTERNAL_ERROR, 500);
        }

        return { success: true };
    }

    async setActiveAcademicYear(schema: string, institutionId: string, id: string) {
        const existing = await academicRepository.findAcademicYearById(schema, institutionId, id);
        if (!existing) {
            throw new AcademicError('Academic year not found', ErrorCodes.ACADEMIC_YEAR_NOT_FOUND, 404);
        }

        return sequelize.transaction(async (transaction) => {
            await academicRepository.setOnlyActiveAcademicYear(schema, institutionId, id, transaction);
            return academicRepository.findAcademicYearById(schema, institutionId, id);
        });
    }

    // ==================== Teacher Assignments ====================
    async assignClassTeacher(
        schema: string,
        institutionId: string,
        payload: CreateClassTeacherAssignmentInput
    ) {
        await this.ensureAcademicYearExists(schema, institutionId, payload.academic_year_id);
        await this.ensureClassSectionExists(schema, institutionId, payload.class_id, payload.section_id);
        await this.ensureTeacherExists(schema, institutionId, payload.teacher_id);

        return sequelize.transaction(async (transaction) => {
            return academicRepository.upsertClassTeacherAssignment(
                schema,
                institutionId,
                {
                    institution_id: institutionId,
                    academic_year_id: payload.academic_year_id,
                    class_id: payload.class_id,
                    section_id: payload.section_id,
                    teacher_id: payload.teacher_id,
                    is_active: payload.is_active ?? true
                },
                transaction
            );
        });
    }

    async assignSubjectTeacher(
        schema: string,
        institutionId: string,
        payload: CreateSubjectTeacherAssignmentInput
    ) {
        await this.ensureAcademicYearExists(schema, institutionId, payload.academic_year_id);
        const section = await academicRepository.findSectionById(schema, institutionId, payload.section_id);
        if (!section) {
            throw new AcademicError('Section not found', ErrorCodes.SECTION_NOT_FOUND, 404);
        }

        const subject = await academicRepository.findSubjectById(schema, institutionId, payload.subject_id);
        if (!subject) {
            throw new AcademicError('Subject not found', ErrorCodes.SUBJECT_NOT_FOUND, 404);
        }

        await this.ensureTeacherExists(schema, institutionId, payload.teacher_id);

        return sequelize.transaction(async (transaction) => {
            return academicRepository.upsertSubjectTeacherAssignment(
                schema,
                institutionId,
                {
                    institution_id: institutionId,
                    academic_year_id: payload.academic_year_id,
                    subject_id: payload.subject_id,
                    section_id: payload.section_id,
                    teacher_id: payload.teacher_id,
                    is_active: payload.is_active ?? true
                },
                transaction
            );
        });
    }

    async getTeacherAssignments(schema: string, institutionId: string, teacherId: string) {
        await this.ensureTeacherExists(schema, institutionId, teacherId);
        return academicRepository.findAssignmentsByTeacher(schema, institutionId, teacherId);
    }

    async getSectionAssignments(schema: string, institutionId: string, sectionId: string) {
        const section = await academicRepository.findSectionById(schema, institutionId, sectionId);
        if (!section) {
            throw new AcademicError('Section not found', ErrorCodes.SECTION_NOT_FOUND, 404);
        }

        return academicRepository.findAssignmentsBySection(schema, institutionId, sectionId);
    }

    // ==================== Timetable (new model) ====================
    async checkTimetableConflicts(
        schema: string,
        institutionId: string,
        payload: ConflictCheckInput
    ) {
        await this.ensureAcademicYearExists(schema, institutionId, payload.academic_year_id);
        await this.ensureClassSectionExists(schema, institutionId, payload.class_id, payload.section_id);
        await this.ensureTeacherExists(schema, institutionId, payload.teacher_id);

        const classConflict = await academicRepository.findClassSlotConflict(
            schema,
            institutionId,
            payload.academic_year_id,
            payload.class_id,
            payload.section_id,
            payload.day_of_week,
            payload.period_number,
            payload.exclude_id
        );

        const teacherConflict = await academicRepository.findTeacherSlotConflict(
            schema,
            institutionId,
            payload.academic_year_id,
            payload.teacher_id,
            payload.day_of_week,
            payload.period_number,
            payload.exclude_id
        );

        return {
            hasClassConflict: Boolean(classConflict),
            hasTeacherConflict: Boolean(teacherConflict),
            classConflict,
            teacherConflict
        };
    }

    async createTimetable(
        schema: string,
        institutionId: string,
        payload: CreateAcademicTimetableInput
    ) {
        this.ensureTimeRange(payload.start_time, payload.end_time);
        await this.ensureAcademicYearExists(schema, institutionId, payload.academic_year_id);
        await this.ensureClassSectionExists(schema, institutionId, payload.class_id, payload.section_id);

        const subject = await academicRepository.findSubjectById(schema, institutionId, payload.subject_id);
        if (!subject) {
            throw new AcademicError('Subject not found', ErrorCodes.SUBJECT_NOT_FOUND, 404);
        }

        await this.ensureTeacherExists(schema, institutionId, payload.teacher_id);

        const conflicts = await this.checkTimetableConflicts(schema, institutionId, {
            academic_year_id: payload.academic_year_id,
            class_id: payload.class_id,
            section_id: payload.section_id,
            teacher_id: payload.teacher_id,
            day_of_week: payload.day_of_week,
            period_number: payload.period_number
        });

        if (conflicts.hasClassConflict || conflicts.hasTeacherConflict) {
            throw new AcademicError('Timetable conflict detected', ErrorCodes.TIMETABLE_CONFLICT, 409);
        }

        return sequelize.transaction(async (transaction) => {
            return academicRepository.createTimetable(
                schema,
                {
                    institution_id: institutionId,
                    academic_year_id: payload.academic_year_id,
                    class_id: payload.class_id,
                    section_id: payload.section_id,
                    subject_id: payload.subject_id,
                    teacher_id: payload.teacher_id,
                    day_of_week: payload.day_of_week,
                    period_number: payload.period_number,
                    start_time: payload.start_time,
                    end_time: payload.end_time,
                    room_number: payload.room_number,
                    is_active: payload.is_active ?? true
                },
                transaction
            );
        });
    }

    async updateTimetable(
        schema: string,
        institutionId: string,
        id: string,
        payload: UpdateAcademicTimetableInput
    ) {
        const existing = await academicRepository.findTimetableById(schema, institutionId, id);
        if (!existing) {
            throw new AcademicError('Timetable entry not found', ErrorCodes.TIMETABLE_NOT_FOUND, 404);
        }

        const merged = {
            academic_year_id: payload.academic_year_id ?? (existing.get('academic_year_id') as string),
            class_id: payload.class_id ?? (existing.get('class_id') as string),
            section_id: payload.section_id ?? (existing.get('section_id') as string),
            subject_id: payload.subject_id ?? (existing.get('subject_id') as string),
            teacher_id: payload.teacher_id ?? (existing.get('teacher_id') as string),
            day_of_week: (payload.day_of_week ?? existing.get('day_of_week')) as DayOfWeek,
            period_number: payload.period_number ?? (existing.get('period_number') as number),
            start_time: payload.start_time ?? (existing.get('start_time') as string),
            end_time: payload.end_time ?? (existing.get('end_time') as string),
            room_number: payload.room_number ?? (existing.get('room_number') as string | undefined),
            is_active: payload.is_active ?? (existing.get('is_active') as boolean)
        };

        this.ensureTimeRange(merged.start_time, merged.end_time);
        await this.ensureAcademicYearExists(schema, institutionId, merged.academic_year_id);
        await this.ensureClassSectionExists(schema, institutionId, merged.class_id, merged.section_id);

        const subject = await academicRepository.findSubjectById(schema, institutionId, merged.subject_id);
        if (!subject) {
            throw new AcademicError('Subject not found', ErrorCodes.SUBJECT_NOT_FOUND, 404);
        }

        await this.ensureTeacherExists(schema, institutionId, merged.teacher_id);

        const conflicts = await this.checkTimetableConflicts(schema, institutionId, {
            academic_year_id: merged.academic_year_id,
            class_id: merged.class_id,
            section_id: merged.section_id,
            teacher_id: merged.teacher_id,
            day_of_week: merged.day_of_week,
            period_number: merged.period_number,
            exclude_id: id
        });

        if (conflicts.hasClassConflict || conflicts.hasTeacherConflict) {
            throw new AcademicError('Timetable conflict detected', ErrorCodes.TIMETABLE_CONFLICT, 409);
        }

        return sequelize.transaction(async (transaction) => {
            return academicRepository.updateTimetableById(
                schema,
                institutionId,
                id,
                {
                    academic_year_id: merged.academic_year_id,
                    class_id: merged.class_id,
                    section_id: merged.section_id,
                    subject_id: merged.subject_id,
                    teacher_id: merged.teacher_id,
                    day_of_week: merged.day_of_week,
                    period_number: merged.period_number,
                    start_time: merged.start_time,
                    end_time: merged.end_time,
                    room_number: merged.room_number,
                    is_active: merged.is_active
                },
                transaction
            );
        });
    }

    async deleteTimetable(schema: string, institutionId: string, id: string) {
        const existing = await academicRepository.findTimetableById(schema, institutionId, id);
        if (!existing) {
            throw new AcademicError('Timetable entry not found', ErrorCodes.TIMETABLE_NOT_FOUND, 404);
        }

        await sequelize.transaction(async (transaction) => {
            await academicRepository.softDeleteTimetableById(schema, institutionId, id, transaction);
        });

        return { success: true };
    }

    async getClassTimetable(
        schema: string,
        institutionId: string,
        academicYearId: string,
        classId: string,
        sectionId: string
    ) {
        await this.ensureAcademicYearExists(schema, institutionId, academicYearId);
        await this.ensureClassSectionExists(schema, institutionId, classId, sectionId);

        const periods = await academicRepository.findClassTimetable(schema, institutionId, classId, sectionId, academicYearId);

        return {
            academic_year_id: academicYearId,
            class_id: classId,
            section_id: sectionId,
            by_day: this.groupTimetableByDay(periods)
        };
    }

    async getTeacherTimetable(
        schema: string,
        institutionId: string,
        academicYearId: string,
        teacherId: string
    ) {
        await this.ensureAcademicYearExists(schema, institutionId, academicYearId);
        await this.ensureTeacherExists(schema, institutionId, teacherId);

        const periods = await academicRepository.findTeacherTimetable(schema, institutionId, teacherId, academicYearId);

        return {
            academic_year_id: academicYearId,
            teacher_id: teacherId,
            by_day: this.groupTimetableByDay(periods)
        };
    }

    // ==================== Helpers ====================
    private ensureDateRange(startDate: string, endDate: string) {
        if (new Date(startDate) >= new Date(endDate)) {
            throw new AcademicError('start_date must be before end_date', ErrorCodes.INVALID_DATE_RANGE, 400);
        }
    }

    private ensureTimeRange(startTime: string, endTime: string) {
        if (startTime >= endTime) {
            throw new AcademicError('start_time must be before end_time', ErrorCodes.VALIDATION_ERROR, 400);
        }
    }

    private async ensureAcademicYearExists(schema: string, institutionId: string, academicYearId: string) {
        const year = await academicRepository.findAcademicYearById(schema, institutionId, academicYearId);
        if (!year) {
            throw new AcademicError('Academic year not found', ErrorCodes.ACADEMIC_YEAR_NOT_FOUND, 404);
        }
        return year;
    }

    private async ensureTeacherExists(schema: string, institutionId: string, teacherId: string) {
        const teacher = await academicRepository.findTeacherById(schema, institutionId, teacherId);
        if (!teacher) {
            throw new AcademicError('Teacher not found', ErrorCodes.TEACHER_NOT_FOUND, 404);
        }
        return teacher;
    }

    private async ensureClassSectionExists(
        schema: string,
        institutionId: string,
        classId: string,
        sectionId: string
    ) {
        const classObj = await academicRepository.findClassById(schema, institutionId, classId);
        if (!classObj) {
            throw new AcademicError('Class not found', ErrorCodes.CLASS_NOT_FOUND, 404);
        }

        const section = await academicRepository.findSectionById(schema, institutionId, sectionId);
        if (!section) {
            throw new AcademicError('Section not found', ErrorCodes.SECTION_NOT_FOUND, 404);
        }

        if (section.get('class_id') !== classId) {
            throw new AcademicError('Section does not belong to given class', ErrorCodes.VALIDATION_ERROR, 400);
        }

        return { classObj, section };
    }

    private groupTimetableByDay(periods: Timetable[]) {
        const grouped = this.timetableDays.reduce((acc, day) => {
            acc[day] = [];
            return acc;
        }, {} as Record<DayOfWeek, TimetableDayEntry[]>);

        for (const period of periods) {
            const row = (typeof period?.toJSON === 'function' ? period.toJSON() : period) as TimetableDayEntry;
            const day = row?.day_of_week as DayOfWeek | undefined;
            if (!day || !grouped[day]) {
                continue;
            }

            grouped[day].push(row);
        }

        for (const day of this.timetableDays) {
            grouped[day].sort((a, b) => Number(a.period_number) - Number(b.period_number));
        }

        return grouped;
    }
}

export const academicAdminService = new AcademicAdminService();
