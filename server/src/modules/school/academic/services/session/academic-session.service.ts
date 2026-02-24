import { AcademicSession, AcademicSessionStatus } from '../../../../../database/models/school/academics/session/AcademicSession.model';
import { AcademicTerm } from '../../../../../database/models/school/academics/session/AcademicTerm.model';
import { SessionHoliday } from '../../../../../database/models/school/academics/session/SessionHoliday.model';
import { Op } from 'sequelize';
import { AcademicError, ErrorCodes } from '../../errors/academic.error';
import {
    CreateAcademicSessionDto,
    UpdateAcademicSessionDto,
    CreateAcademicTermDto,
    CreateSessionHolidayDto,
    CreateMasterHolidayDto,
    UpdateMasterHolidayDto
} from '../../dto/academic-session.dto';
import { MasterHoliday } from '../../../../../database/models/school/academics/session/MasterHoliday.model';
import { PaginationQueryDto, PaginatedResponse } from '../../dto/common.dto';
import { GlobalHoliday } from '../../../../../database/models/public/GlobalHoliday.model';
import { HolidayRegistryService } from '../calendar/holiday-registry.service';

export class AcademicSessionService {
    /**
     * Get all academic sessions with pagination
     */
    async getAll(schemaName: string, institutionId: string, query?: PaginationQueryDto): Promise<PaginatedResponse<AcademicSession>> {
        const { page = 1, limit = 50, search, sortBy = 'start_date', sortOrder = 'DESC' } = query || {};

        const where: { institution_id: string; name?: { [Op.iLike]: string } } = { institution_id: institutionId };
        if (search) {
            where.name = { [Op.iLike]: `%${search}%` };
        }

        const { rows, count } = await AcademicSession.schema(schemaName).findAndCountAll({
            where,
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

    /**
     * Get academic session by ID with details
     */
    async getById(schemaName: string, institutionId: string, id: string): Promise<AcademicSession> {
        const session = await AcademicSession.schema(schemaName).findOne({
            where: { id, institution_id: institutionId },
            include: [
                { model: AcademicTerm.schema(schemaName), as: 'terms' },
                {
                    model: SessionHoliday.schema(schemaName),
                    as: 'holidays',
                    where: { institution_id: institutionId },
                    required: false,
                }
            ]
        });

        if (!session) {
            throw new AcademicError(
                'Academic session not found',
                ErrorCodes.ACADEMIC_YEAR_NOT_FOUND,
                404
            );
        }

        return session;
    }

    /**
     * Get current academic session
     */
    async getCurrent(schemaName: string, institutionId: string): Promise<AcademicSession | null> {
        return await AcademicSession.schema(schemaName).findOne({
            where: { institution_id: institutionId, is_current: true }
        });
    }

    /**
     * Create new academic session
     */
    async create(schemaName: string, institutionId: string, userId: string, data: CreateAcademicSessionDto): Promise<AcademicSession> {
        // Validate date range
        if (new Date(data.start_date) >= new Date(data.end_date)) {
            throw new AcademicError(
                'Start date must be before end date',
                ErrorCodes.INVALID_DATE_RANGE
            );
        }

        // If setting as current, unset others
        if (data.is_current) {
            await AcademicSession.schema(schemaName).update(
                { is_current: false },
                { where: { institution_id: institutionId } }
            );
        }

        return await AcademicSession.schema(schemaName).create({
            ...data,
            institution_id: institutionId,
            created_by: userId,
            updated_by: userId
        });
    }

    /**
     * Update academic session
     */
    async update(schemaName: string, institutionId: string, id: string, userId: string, data: UpdateAcademicSessionDto): Promise<AcademicSession> {
        const session = await this.getById(schemaName, institutionId, id);

        // Validate date range if dates are being changed
        const startDate = data.start_date ? new Date(data.start_date) : session.start_date;
        const endDate = data.end_date ? new Date(data.end_date) : session.end_date;

        if (startDate >= endDate) {
            throw new AcademicError(
                'Start date must be before end date',
                ErrorCodes.INVALID_DATE_RANGE
            );
        }

        // If setting as current, unset others
        if (data.is_current) {
            await AcademicSession.schema(schemaName).update(
                { is_current: false },
                { where: { institution_id: institutionId, id: { [Op.ne]: id } } }
            );
        }

        await session.update({
            ...data,
            updated_by: userId
        });
        return session;
    }

    /**
     * Delete academic session
     */
    async delete(schemaName: string, institutionId: string, id: string): Promise<{ success: boolean; message: string }> {
        const session = await this.getById(schemaName, institutionId, id);

        if (session.is_current) {
            throw new AcademicError(
                'Cannot delete current academic session',
                ErrorCodes.CANNOT_DELETE_CURRENT
            );
        }

        await session.destroy();
        return { success: true, message: 'Academic session deleted successfully' };
    }

    // ==================== Terms Management ====================

    async addTerm(schemaName: string, sessionId: string, data: CreateAcademicTermDto): Promise<AcademicTerm> {
        return await AcademicTerm.schema(schemaName).create({ ...data, session_id: sessionId });
    }

    async updateTerm(schemaName: string, termId: string, data: Partial<CreateAcademicTermDto>): Promise<AcademicTerm> {
        const term = await AcademicTerm.schema(schemaName).findByPk(termId);
        if (!term) throw new Error('Term not found');
        return await term.update(data);
    }

    async deleteTerm(schemaName: string, termId: string): Promise<void> {
        const term = await AcademicTerm.schema(schemaName).findByPk(termId);
        if (term) await term.destroy();
    }

    // ==================== Holiday Management ====================

    async addHoliday(schemaName: string, institutionId: string, sessionId: string, data: CreateSessionHolidayDto): Promise<SessionHoliday> {
        return await SessionHoliday.schema(schemaName).create({
            ...data,
            session_id: sessionId,
            institution_id: institutionId,
        });
    }

    async updateHoliday(
        schemaName: string,
        institutionId: string,
        holidayId: string,
        data: Partial<CreateSessionHolidayDto>
    ): Promise<SessionHoliday> {
        const holiday = await SessionHoliday.schema(schemaName).findOne({
            where: { id: holidayId, institution_id: institutionId },
        });
        if (!holiday) throw new Error('Holiday not found');
        return await holiday.update(data);
    }

    async deleteHoliday(schemaName: string, institutionId: string, holidayId: string): Promise<void> {
        const holiday = await SessionHoliday.schema(schemaName).findOne({
            where: { id: holidayId, institution_id: institutionId },
        });
        if (holiday) await holiday.destroy();
    }

    // ==================== Master Holiday Management ====================

    async getAllMasterHolidays(schemaName: string, institutionId: string): Promise<MasterHoliday[]> {
        return await MasterHoliday.schema(schemaName).findAll({
            where: { institution_id: institutionId },
            order: [['month', 'ASC'], ['day', 'ASC']]
        });
    }

    async addMasterHoliday(schemaName: string, institutionId: string, data: CreateMasterHolidayDto): Promise<MasterHoliday> {
        return await MasterHoliday.schema(schemaName).create({ ...data, institution_id: institutionId });
    }

    async updateMasterHoliday(schemaName: string, holidayId: string, data: UpdateMasterHolidayDto): Promise<MasterHoliday> {
        const holiday = await MasterHoliday.schema(schemaName).findByPk(holidayId);
        if (!holiday) throw new Error('Master Holiday not found');
        return await holiday.update(data);
    }

    async deleteMasterHoliday(schemaName: string, holidayId: string): Promise<void> {
        const holiday = await MasterHoliday.schema(schemaName).findByPk(holidayId);
        if (holiday) await holiday.destroy();
    }

    async syncSystemHolidays(schemaName: string, institutionId: string): Promise<void> {
        // 1. Fetch official holidays for India for the current year (Global Store)
        const currentYear = new Date().getFullYear();
        let globalSource = await GlobalHoliday.findAll({
            where: { country_code: 'IN', year: currentYear }
        });

        const existingHolidays = await MasterHoliday.schema(schemaName).findAll({
            where: { institution_id: institutionId, holiday_key: { [Op.ne]: null } }
        });

        const existingKeys = new Set(existingHolidays.map(h => h.holiday_key));

        if (globalSource.length > 0) {
            // Use the Global Store (Accurate & External)
            for (const gh of globalSource) {
                if (!existingKeys.has(gh.holiday_key)) {
                    await MasterHoliday.schema(schemaName).create({
                        institution_id: institutionId,
                        name: gh.name,
                        month: gh.month,
                        day: gh.day,
                        description: gh.description,
                        is_gazetted: true,
                        holiday_type: 'SYSTEM',
                        calculation_type: gh.type.includes('FLOATING') ? 'RELATIVE' : 'FIXED',
                        holiday_key: gh.holiday_key,
                        is_system_generated: true
                    });
                }
            }
        } else {
            // Fallback to static registry if global store is empty
            const systemHolidays = HolidayRegistryService.getSystemHolidays();
            for (const holiday of systemHolidays) {
                if (!existingKeys.has(holiday.key)) {
                    let calculationType = 'FIXED';
                    let month = 1, day = 1;

                    if (holiday.type === 'FLOATING') {
                        calculationType = 'RELATIVE';
                        const d = HolidayRegistryService.getHolidayDate(holiday.key, currentYear);
                        if (d) { month = d.month; day = d.day; }
                    } else {
                        const fixedDates: Record<string, { m: number, d: number }> = {
                            'IN_REPUBLIC_DAY': { m: 1, d: 26 },
                            'IN_INDEPENDENCE_DAY': { m: 8, d: 15 },
                            'IN_GANDHI_JAYANTI': { m: 10, d: 2 },
                            'IN_CHRISTMAS': { m: 12, d: 25 }
                        };
                        const fd = fixedDates[holiday.key];
                        if (fd) { month = fd.m; day = fd.d; }
                    }

                    await MasterHoliday.schema(schemaName).create({
                        institution_id: institutionId,
                        name: holiday.name,
                        month,
                        day,
                        description: holiday.description,
                        is_gazetted: true,
                        holiday_type: 'SYSTEM',
                        calculation_type: calculationType,
                        holiday_key: holiday.key,
                        is_system_generated: true
                    });
                }
            }
        }
    }
}

export const academicSessionService = new AcademicSessionService();
