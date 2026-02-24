import { GlobalHoliday } from '../../../database/models/public/GlobalHoliday.model';
import { calendarificService } from '../../school/academic/services/calendar/calendarific.service';
import { Op } from 'sequelize';

export class GlobalHolidayService {
    /**
     * Get all global holidays filtered by year and country
     */
    async getHolidays(year: number, country: string = 'IN') {
        return await GlobalHoliday.findAll({
            where: {
                year,
                country_code: country
            },
            order: [['date', 'ASC']]
        });
    }

    /**
     * Sync from external API (Calendarific)
     */
    async syncFromExternal(year: number, country: string = 'IN') {
        await calendarificService.syncToGlobal(country, year);
        return await this.getHolidays(year, country);
    }

    /**
     * Create or update a global holiday manually
     */
    async upsertHoliday(data: {
        id?: string;
        holiday_key?: string;
        country_code: string;
        year: number;
        name: string;
        [key: string]: unknown;
    }) {
        const { id, ...holidayData } = data;
        
        if (id) {
            const existing = await GlobalHoliday.findByPk(id);
            if (existing) {
                return await existing.update(holidayData);
            }
        }

        // generate key if not provided
        if (!holidayData.holiday_key) {
            holidayData.holiday_key = `${holidayData.country_code}_${holidayData.year}_${holidayData.name.replace(/\s+/g, '_').toUpperCase()}`;
        }

        return await GlobalHoliday.upsert(holidayData);
    }

    /**
     * Delete a global holiday
     */
    async deleteHoliday(id: string) {
        const holiday = await GlobalHoliday.findByPk(id);
        if (holiday) {
            await holiday.destroy();
        }
    }
}

export const globalHolidayService = new GlobalHolidayService();
