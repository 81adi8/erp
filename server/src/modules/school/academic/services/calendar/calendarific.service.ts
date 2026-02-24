import axios from 'axios';
import { env } from '../../../../../config/env';
import { GlobalHoliday } from '../../../../../database/models/public/GlobalHoliday.model';
import { logger } from '../../../../../core/utils/logger';

export interface CalendarificHoliday {
    name: string;
    description: string;
    date: {
        iso: string;
        datetime: {
            year: number;
            month: number;
            day: number;
        };
    };
    type: string[];
    locations: string;
    states: unknown;
}

export class CalendarificService {
    private readonly apiKey: string;
    private readonly baseUrl = 'https://calendarific.com/api/v2';

    constructor() {
        this.apiKey = env.calendarificApiKey ?? '';
    }

    /**
     * Fetch holidays from Calendarific API
     * @param country ISO country code (e.g., 'IN')
     * @param year Year to fetch holidays for
     */
    async fetchHolidays(country: string, year: number): Promise<CalendarificHoliday[]> {
        if (!this.apiKey) {
            logger.warn('[Calendarific] API Key not configured. Skipping fetch.');
            return [];
        }

        try {
            const response = await axios.get(`${this.baseUrl}/holidays`, {
                params: {
                    api_key: this.apiKey,
                    country,
                    year,
                    // For India, we might want religious and observance holidays too
                    type: 'national,religious,observance'
                }
            });

            if (response.data?.response?.holidays) {
                return response.data.response.holidays;
            }

            return [];
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.error(`[Calendarific] Failed to fetch holidays: ${err.message}`);
            return [];
        }
    }

    /**
     * Sync fetched holidays to the GlobalHoliday table
     */
    async syncToGlobal(country: string, year: number): Promise<void> {
        const holidays = await this.fetchHolidays(country, year);
        
        for (const h of holidays) {
            const holidayKey = `${country}_${year}_${h.name.replace(/\s+/g, '_').toUpperCase()}`;
            
            await GlobalHoliday.upsert({
                name: h.name,
                country_code: country,
                year,
                date: h.date.iso.split('T')[0],
                month: h.date.datetime.month,
                day: h.date.datetime.day,
                description: h.description,
                type: (h.type || []).join(', ').toUpperCase(),
                holiday_key: holidayKey,
                metadata: {
                    calendarific_raw: h
                }
            });
        }

        logger.info(`[Calendarific] Synchronized ${holidays.length} holidays for ${country} in ${year}`);
    }
}

export const calendarificService = new CalendarificService();
