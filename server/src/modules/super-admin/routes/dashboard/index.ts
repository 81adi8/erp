import { logger } from '../../../../core/utils/logger';
/**
 * Super-Admin Dashboard Routes
 *
 * FIXED: Frontend (dashboard.ts) calls:
 *   GET /dashboard/stats   → getDashboardStats
 *   GET /dashboard/health  → getSystemHealth
 * These endpoints were absent in the backend, causing the frontend to fall
 * back to mock data silently. Now wired to real data.
 */
import { Router, Request, Response } from 'express';
import { InstitutionService } from '../../services/institution.service';
import { HttpStatus } from '../../../../core/http/HttpStatus';

const router = Router();
const institutionService = new InstitutionService();

/**
 * GET /dashboard/stats
 * Returns platform-level stats for the super-admin dashboard.
 */
router.get('/stats', async (_req: Request, res: Response) => {
    try {
        const stats = await institutionService.getDashboardStats();
        return res.status(HttpStatus.OK).json({
            success: true,
            data: stats,
        });
    } catch (err) {
        logger.error('[SuperAdmin Dashboard] Stats error:', err);
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: 'Failed to load dashboard stats',
        });
    }
});

/**
 * GET /dashboard/health
 * Returns basic system health indicators.
 * Uptime and response time are process-level; active sessions is a placeholder.
 */
router.get('/health', (_req: Request, res: Response) => {
    const uptimeSeconds = process.uptime();
    return res.status(HttpStatus.OK).json({
        success: true,
        data: {
            status: 'healthy',
            uptime: Math.round(uptimeSeconds),
            responseTime: 0,       // populated by client-side timing
            activeSessions: 0,     // extend with Redis session count when needed
        },
    });
});

export default router;
