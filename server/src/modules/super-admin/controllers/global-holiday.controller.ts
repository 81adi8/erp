import { Request, Response } from 'express';
import { globalHolidayService } from '../services/global-holiday.service';
import { logger } from '../../../core/utils/logger';

export class GlobalHolidayController {
    /**
     * Get holidays by year and country
     */
    async getHolidays(req: Request, res: Response) {
        try {
            const { year, country } = req.query;
            const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
            const countryCode = (country as string) || 'IN';

            const holidays = await globalHolidayService.getHolidays(currentYear, countryCode);
            res.json({ success: true, data: holidays });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error fetching global holidays:', error);
            res.status(500).json({ success: false, message: errorMessage });
        }
    }

    /**
     * Sync from Calendarific
     */
    async syncHolidays(req: Request, res: Response) {
        try {
            const { year, country } = req.body;
            const currentYear = year ? parseInt(year as string) : new Date().getFullYear();
            const countryCode = (country as string) || 'IN';

            const holidays = await globalHolidayService.syncFromExternal(currentYear, countryCode);
            res.json({ success: true, message: `Holidays synced for ${currentYear}`, data: holidays });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error syncing global holidays:', error);
            res.status(500).json({ success: false, message: errorMessage });
        }
    }

    /**
     * Create or update holiday
     */
    async upsertHoliday(req: Request, res: Response) {
        try {
            const holiday = await globalHolidayService.upsertHoliday(req.body);
            res.json({ success: true, data: holiday });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error saving global holiday:', error);
            res.status(500).json({ success: false, message: errorMessage });
        }
    }

    /**
     * Delete holiday
     */
    async deleteHoliday(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await globalHolidayService.deleteHoliday(id as string);
            res.json({ success: true, message: 'Holiday deleted successfully' });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Error deleting global holiday:', error);
            res.status(500).json({ success: false, message: errorMessage });
        }
    }
}

export const globalHolidayController = new GlobalHolidayController();
