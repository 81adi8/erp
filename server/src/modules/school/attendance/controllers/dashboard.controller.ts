import { logger } from '../../../../core/utils/logger';
// ============================================================================
// ATTENDANCE DASHBOARD CONTROLLER
// Handles dashboard-specific requests
// ============================================================================

import { Request, Response } from 'express';
import { createAttendanceDashboardService } from '../services/attendance-dashboard.service';
import { AttendanceError, AttendanceErrorCodes } from '../errors/attendance.error';
import { sendError, sendSuccess } from './response.utils';

const asyncHandler = (
    fn: (req: Request, res: Response) => Promise<Response | void>
) => {
    return (req: Request, res: Response) => {
        fn(req, res).catch((error) => {
            logger.error('Attendance Dashboard Controller Error:', error);
            return sendError(
                res,
                error instanceof Error ? error.message : 'An unexpected error occurred',
                500,
                [error instanceof Error ? error.message : 'An unexpected error occurred'],
                { code: AttendanceErrorCodes.INTERNAL_ERROR }
            );
        });
    };
};

function getTenantContext(req: Request) {
    const schemaName = req.tenant?.db_schema;
    const institutionId = req.tenant?.id;

    if (!schemaName || !institutionId) {
        throw new AttendanceError(
            'Institution context required',
            AttendanceErrorCodes.INSTITUTION_REQUIRED,
            400
        );
    }

    return { schemaName, institutionId };
}

function getAcademicYearId(req: Request): string {
    const headerAcademicYear = req.headers['x-academic-year-id'];
    const headerAcademicSession = req.headers['x-academic-session-id'];

    const academicYearId =
        (Array.isArray(headerAcademicYear) ? headerAcademicYear[0] : headerAcademicYear) as string ||
        (Array.isArray(headerAcademicSession) ? headerAcademicSession[0] : headerAcademicSession) as string ||
        req.query.academicYearId as string ||
        req.query.academicYear as string;

    if (!academicYearId) {
        throw new AttendanceError(
            'Academic year ID required',
            AttendanceErrorCodes.ACADEMIC_YEAR_REQUIRED,
            400
        );
    }

    return academicYearId;
}

class AttendanceDashboardController {
    /**
     * GET /attendance/dashboard/stats
     */
    getStats = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const academicYearId = getAcademicYearId(req);
        const { date } = req.query;

        const service = createAttendanceDashboardService(schemaName, institutionId);
        const result = await service.getTodayStats(academicYearId, date as string);

        return sendSuccess(res, result, 'Attendance dashboard stats fetched successfully');
    });

    /**
     * GET /attendance/dashboard/activity
     */
    getActivity = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const { limit } = req.query;

        const service = createAttendanceDashboardService(schemaName, institutionId);
        const result = await service.getRecentActivity(limit ? parseInt(limit as string, 10) : 10);

        return sendSuccess(res, result, 'Attendance dashboard activity fetched successfully');
    });

    /**
     * GET /attendance/dashboard/class-summary
     */
    getClassSummary = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const academicYearId = getAcademicYearId(req);
        const { date } = req.query;

        const service = createAttendanceDashboardService(schemaName, institutionId);
        const result = await service.getClassSummary(academicYearId, date as string);

        return sendSuccess(res, result, 'Class attendance summary fetched successfully');
    });

    /**
     * GET /attendance/dashboard/history
     */
    getHistory = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const academicYearId = getAcademicYearId(req);
        const { startDate, endDate } = req.query;

        const service = createAttendanceDashboardService(schemaName, institutionId);
        const result = await service.getClassAttendanceHistory(
            academicYearId, 
            startDate as string, 
            endDate as string
        );

        return sendSuccess(res, result, 'Attendance history fetched successfully');
    });
}

export const attendanceDashboardController = new AttendanceDashboardController();
