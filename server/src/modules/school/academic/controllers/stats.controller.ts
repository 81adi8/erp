import { Request, Response } from 'express';
import { statsService } from '../services';
import { asyncHandler, getInstitutionId, successResponse } from './utils';

class StatsController {
    /**
     * GET /stats
     * Get academic statistics
     */
    getStats = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const stats = await statsService.getAcademicStats(schemaName, institutionId);
        return successResponse(res, stats);
    });
}

export const statsController = new StatsController();
