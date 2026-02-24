import { Request, Response } from 'express';
import { academicCalendarService } from '../services/calendar/academic-calendar.service';
import { asyncHandler, getInstitutionId, successResponse } from './utils';
import { AcademicError } from '../errors/academic.error';

export class AcademicCalendarController {
    /**
     * GET /academic-calendar/day
     * Get day status
     */
    getDayStatus = asyncHandler(async (req: Request, res: Response) => {
        const { date, sessionId } = req.query;
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;

        if (!date) {
            throw new AcademicError('Date is required', 'DATE_REQUIRED', 400);
        }

        const status = await academicCalendarService.getDayStatus(
            schemaName,
            institutionId,
            date as string,
            sessionId as string
        );

        return successResponse(res, status);
    });

    /**
     * GET /academic-calendar/range
     * Get calendar range (monthly view)
     */
    getCalendarRange = asyncHandler(async (req: Request, res: Response) => {
        const { startDate, endDate, sessionId } = req.query;
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;

        if (!startDate || !endDate) {
            throw new AcademicError('Start and end dates are required', 'DATES_REQUIRED', 400);
        }

        const calendar = await academicCalendarService.getCalendarRange(
            schemaName,
            institutionId,
            startDate as string,
            endDate as string,
            sessionId as string
        );

        return successResponse(res, calendar);
    });
}

export const academicCalendarController = new AcademicCalendarController();
