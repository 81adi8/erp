import { AcademicSession } from '../../../../../database/models/school/academics/session/AcademicSession.model';
import { SessionHoliday } from '../../../../../database/models/school/academics/session/SessionHoliday.model';
import { AcademicTerm } from '../../../../../database/models/school/academics/session/AcademicTerm.model';
import { MasterHoliday } from '../../../../../database/models/school/academics/session/MasterHoliday.model';
import { Op } from 'sequelize';
import { AcademicError, ErrorCodes } from '../../errors/academic.error';
import { GlobalHoliday } from '../../../../../database/models/public/GlobalHoliday.model';
import { Institution } from '../../../../../database/models/public/Institution.model';
import { HolidayRegistryService } from './holiday-registry.service';
import { academicSessionService } from '../session/academic-session.service';
import { logger } from '../../../../../core/utils/logger';

export enum DayStatus {
    WORKING = 'WORKING',
    HOLIDAY = 'HOLIDAY',
    WEEKLY_OFF = 'WEEKLY_OFF',
    NON_SESSION = 'NON_SESSION',
    EXAM = 'EXAM',
    EVENT = 'EVENT'
}

export interface DayDetail {
    date: string;
    status: DayStatus;
    id?: string;
    name?: string;
    description?: string;
    isGazetted?: boolean;
    holidayType?: string;
    isRecurring?: boolean;
}

export class AcademicCalendarService {
    /**
     * Get the status and details of a specific day
     * Optimized for single date lookup
     */
    async getDayStatus(
        schemaName: string, 
        institutionId: string, 
        date: Date | string,
        sessionId?: string
    ): Promise<DayDetail> {
        const checkDate = typeof date === 'string' ? new Date(date) : date;
        const dateStr = checkDate.toISOString().split('T')[0] || checkDate.toISOString().slice(0, 10);

        // 1. Fetch Session (Source of Truth)
        const session = await this.resolveSession(schemaName, institutionId, checkDate, sessionId);
        
        if (!session) {
            if (!dateStr) throw new Error("Failed to generate date string");
            return { date: dateStr, status: DayStatus.NON_SESSION };
        }

        // 2. Check for Manual Holidays (Priority 1)
        const holiday = await SessionHoliday.schema(schemaName).findOne({
            where: {
                institution_id: institutionId,
                session_id: session.id,
                start_date: { [Op.lte]: dateStr },
                end_date: { [Op.gte]: dateStr }
            }
        });

        if (holiday) {
            if (!dateStr) throw new Error("Failed to generate date string");
            return {
                date: dateStr,
                status: DayStatus.HOLIDAY,
                id: holiday.id,
                name: holiday.name ?? '',
                description: holiday.description,
                isGazetted: holiday.is_gazetted,
                holidayType: holiday.holiday_type,
                isRecurring: false
            };
        }

        // 3. Check for Master Holidays (Recurring & Smart)
        const masterHolidays = await MasterHoliday.schema(schemaName).findAll({
            where: { institution_id: institutionId }
        });

        const currentYear = checkDate.getFullYear();
        let activeMasterHoliday = null;

        for (const m of masterHolidays) {
            // Priority 1: Smart Holiday (linked to GlobalHoliday)
            if (m.holiday_key && (m.holiday_type === 'SYSTEM' || m.calculation_type === 'RELATIVE')) {
                const globalHoliday = await GlobalHoliday.findOne({
                    where: {
                        holiday_key: m.holiday_key,
                        year: currentYear
                    }
                });
                
                if (globalHoliday && globalHoliday.month === (checkDate.getMonth() + 1) && globalHoliday.day === checkDate.getDate()) {
                    activeMasterHoliday = m;
                    break;
                }
            }
            // Priority 2: Fixed Date
            if (m.month === (checkDate.getMonth() + 1) && m.day === checkDate.getDate()) {
                activeMasterHoliday = m;
                break;
            }
        }

        if (activeMasterHoliday) {
            if (!dateStr) throw new Error("Failed to generate date string");
            return {
                date: dateStr,
                status: DayStatus.HOLIDAY,
                id: activeMasterHoliday.id,
                name: activeMasterHoliday.name ?? '',
                description: activeMasterHoliday.description,
                isGazetted: activeMasterHoliday.is_gazetted,
                holidayType: activeMasterHoliday.holiday_type,
                isRecurring: true
            };
        }

        // 4. Check Weekly Off Days (Priority 2)
        const dayOfWeek = checkDate.getDay(); // 0 (Sun) to 6 (Sat)
        if (session.weekly_off_days && session.weekly_off_days.includes(dayOfWeek)) {
            if (!dateStr) throw new Error("Failed to generate date string");
            return {
                date: dateStr,
                status: DayStatus.WEEKLY_OFF,
                name: 'Weekly Off'
            };
        }

        // 4. Default to Working Day
        if (!dateStr) throw new Error("Failed to generate date string");
        return {
            date: dateStr,
            status: DayStatus.WORKING
        };
    }

    /**
     * Get statuses for a range of dates
     * HIGHLY OPTIMIZED to avoid N+1 queries
     */
    async getCalendarRange(
        schemaName: string,
        institutionId: string,
        startDate: string | Date,
        endDate: string | Date,
        sessionId?: string
    ): Promise<Record<string, DayDetail>> {
        // Auto-initialize if this is the first visit
        await this.ensureCalendarInitialized(schemaName, institutionId);

        const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
        const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
        
        const startStr = start.toISOString().split('T')[0] ?? start.toISOString().slice(0, 10);
        const endStr = end.toISOString().split('T')[0] ?? end.toISOString().slice(0, 10);

        // 1. Resolve Session(s)
        const sessions = await AcademicSession.schema(schemaName).findAll({
            where: {
                institution_id: institutionId,
                [Op.or]: [
                    { start_date: { [Op.between]: [startStr, endStr] } },
                    { end_date: { [Op.between]: [startStr, endStr] } },
                    {
                        [Op.and]: [
                            { start_date: { [Op.lte]: startStr } },
                            { end_date: { [Op.gte]: endStr } }
                        ]
                    }
                ]
            }
        });

        const sessionIds = sessions.map(s => s.id);
        
        // 2. Fetch all holidays in range for these sessions
        const holidays = await SessionHoliday.schema(schemaName).findAll({
            where: {
                institution_id: institutionId,
                session_id: { [Op.in]: sessionIds },
                [Op.or]: [
                    { start_date: { [Op.between]: [startStr, endStr] } },
                    { end_date: { [Op.between]: [startStr, endStr] } }
                ]
            }
        });

        // 3. Fetch Master Holidays for the institution
        const masterHolidays = await MasterHoliday.schema(schemaName).findAll({
            where: { institution_id: institutionId }
        });

        const startYear = start.getFullYear();
        const endYear = end.getFullYear();
        const globalHolidays = await GlobalHoliday.findAll({
            where: {
                year: { [Op.between]: [startYear, endYear] }
            }
        });

        // 4. Compose the map
        const result: Record<string, DayDetail> = {};
        const curr = new Date(start);
        
        while (curr <= end) {
            const dStr = curr.toISOString().split('T')[0] ?? curr.toISOString().slice(0, 10);
            const dOfWeek = curr.getDay();
            
            // Find session for this specific day
            const session = sessions.find(s => 
                new Date(s.start_date) <= curr && new Date(s.end_date) >= curr
            );

            if (!session) {
                if (dStr) result[dStr] = { date: dStr, status: DayStatus.NON_SESSION };
            } else {
                // Check holiday
                const dayHoliday = holidays.find(h => 
                    new Date(h.start_date) <= curr && new Date(h.end_date) >= curr
                );

                if (dayHoliday) {
                    if (dStr) result[dStr] = {
                        date: dStr,
                        status: DayStatus.HOLIDAY,
                        id: dayHoliday.id,
                        name: dayHoliday.name ?? '',
                        description: dayHoliday.description,
                        isGazetted: dayHoliday.is_gazetted,
                        holidayType: dayHoliday.holiday_type,
                        isRecurring: false
                    };
                } else {
                    // Check master holiday
                    const year = curr.getFullYear();
                    const mHoliday = masterHolidays.find(m => {
                        // Smart floating holiday check (against GlobalHoliday table)
                        if (m.holiday_key && (m.holiday_type === 'SYSTEM' || m.calculation_type === 'RELATIVE')) {
                            const gHoliday = globalHolidays.find(gh => 
                                gh.holiday_key === m.holiday_key && 
                                gh.year === year &&
                                gh.month === (curr.getMonth() + 1) &&
                                gh.day === curr.getDate()
                            );
                            return !!gHoliday;
                        }
                        // Traditional fixed date check
                        return m.month === (curr.getMonth() + 1) && m.day === curr.getDate();
                    });
                    
                    if (mHoliday) {
                        if (dStr) result[dStr] = {
                            date: dStr,
                            status: DayStatus.HOLIDAY,
                            id: mHoliday.id,
                            name: mHoliday.name ?? '',
                            description: mHoliday.description,
                            isGazetted: mHoliday.is_gazetted,
                            holidayType: mHoliday.holiday_type,
                            isRecurring: true
                        };
                    } else if (session.weekly_off_days && session.weekly_off_days.includes(dOfWeek)) {
                        if (dStr) result[dStr] = { date: dStr, status: DayStatus.WEEKLY_OFF, name: 'Weekly Off' };
                    } else {
                        if (dStr) result[dStr] = { date: dStr, status: DayStatus.WORKING };
                    }
                }
            }

            curr.setDate(curr.getDate() + 1);
        }

        return result;
    }

    /**
     * Efficiently resolve which session to use
     */
    private async resolveSession(
        schemaName: string,
        institutionId: string,
        date: Date,
        sessionId?: string
    ): Promise<AcademicSession | null> {
        if (sessionId) {
            return await AcademicSession.schema(schemaName).findOne({
                where: { id: sessionId, institution_id: institutionId }
            });
        }

        const dateStr = date.toISOString().split('T')[0];
        return await AcademicSession.schema(schemaName).findOne({
            where: {
                institution_id: institutionId,
                start_date: { [Op.lte]: dateStr },
                end_date: { [Op.gte]: dateStr }
            }
        });
    }

    /**
     * Helper to validate if business operations can be performed on a date
     */
    async validateWorkingDay(
        schemaName: string,
        institutionId: string,
        date: Date | string,
        sessionId?: string
    ): Promise<{ isWorking: boolean; reason?: string }> {
        const status = await this.getDayStatus(schemaName, institutionId, date, sessionId);
        
        if (status.status === DayStatus.WORKING) {
            return { isWorking: true };
        }

        return { 
            isWorking: false, 
            reason: status.name || status.status.replace('_', ' ') 
        };
    }

    /**
     * Track and initialize calendar on first visit
     */
    private async ensureCalendarInitialized(schemaName: string, institutionId: string): Promise<void> {
        const institution = await Institution.findByPk(institutionId);
        if (!institution) return;


        const metadata = institution.metadata || {};
        if (metadata.calendar_initialized) return;

        try {
            // First time initialization - sync standard holidays
            await academicSessionService.syncSystemHolidays(schemaName, institutionId);
            
            // Mark as initialized
            await institution.update({
                metadata: {
                    ...metadata,
                    calendar_initialized: true,
                    calendar_initialized_at: new Date().toISOString()
                }
            });
        } catch (error) {
            // Log error but don't block user from seeing the calendar
            logger.error('[AcademicCalendarService] Failed auto-initialization:', error);
        }
    }
}

export const academicCalendarService = new AcademicCalendarService();
