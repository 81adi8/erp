/**
 * TASK-04: OBSERVABILITY STACK — Health & Metrics Endpoints
 *
 * Endpoints:
 *   GET /health          → liveness probe (fast, no DB)
 *   GET /health/ready    → readiness probe (checks Redis + DB)
 *   GET /health/metrics  → internal metrics snapshot
 *   GET /health/queues   → queue stats + DLQ counts
 */

import { Router, Request, Response } from 'express';
import { redisHealthCheck } from '../../config/redis';
import { sequelize } from '../../database/sequelize';
import { metrics } from './metrics';
import { queueManager } from '../queue/QueueManager';
import { structuredLogger } from './structured-logger';
import goliveDashboardRoutes from './golive-dashboard.routes';

const router = Router();

// TASK-05: Go-live dashboard (mounted at /health/golive/*)
router.use('/golive', goliveDashboardRoutes);

// ─── Liveness probe ───────────────────────────────────────────────────────────
// Fast check — just confirms the process is alive.
// Used by Kubernetes/Docker to decide if container needs restart.
router.get('/', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        pid: process.pid,
    });
});

// ─── Readiness probe ──────────────────────────────────────────────────────────
// Checks all critical dependencies.
// Used by load balancer to decide if instance should receive traffic.
router.get('/ready', async (_req: Request, res: Response) => {
    const checks: Record<string, any> = {};
    let overallStatus: 'ok' | 'degraded' | 'down' = 'ok';

    // ── Redis check ────────────────────────────────────────────────────────────
    try {
        const redisResult = await redisHealthCheck();
        checks.redis = redisResult;
        if (redisResult.status === 'down') overallStatus = 'down';
        else if (redisResult.status === 'degraded' && overallStatus === 'ok') overallStatus = 'degraded';
    } catch (err: any) {
        checks.redis = { status: 'down', error: err.message };
        overallStatus = 'down';
    }

    // ── Database check ─────────────────────────────────────────────────────────
    try {
        const dbStart = Date.now();
        await sequelize.authenticate();
        checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
    } catch (err: any) {
        checks.database = { status: 'down', error: err.message };
        overallStatus = 'down';
    }

    // ── Queue check ────────────────────────────────────────────────────────────
    checks.queues = {
        status: queueManager.isQueueAvailable() ? 'ok' : 'degraded',
    };
    if (!queueManager.isQueueAvailable() && overallStatus === 'ok') {
        overallStatus = 'degraded';
    }

    // ── Memory check ───────────────────────────────────────────────────────────
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const heapPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

    checks.memory = {
        status: heapPercent > 90 ? 'degraded' : 'ok',
        heapUsedMB,
        heapTotalMB,
        heapPercent,
    };

    if (heapPercent > 90 && overallStatus === 'ok') overallStatus = 'degraded';

    const httpStatus = overallStatus === 'ok' ? 200
                     : overallStatus === 'degraded' ? 200  // Still serve traffic
                     : 503;

    if (overallStatus !== 'ok') {
        structuredLogger.warn(`[Health] Readiness check: ${overallStatus}`, { meta: checks });
    }

    res.status(httpStatus).json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        checks,
    });
});

// ─── Metrics endpoint ─────────────────────────────────────────────────────────
router.get('/metrics', (_req: Request, res: Response) => {
    const snapshot = metrics.getSnapshot();

    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memory: {
            heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
        metrics: snapshot,
    });
});

// ─── Queue stats endpoint ─────────────────────────────────────────────────────
router.get('/queues', async (_req: Request, res: Response) => {
    if (!queueManager.isQueueAvailable()) {
        res.status(503).json({
            status: 'unavailable',
            message: 'Queue system is not available',
        });
        return;
    }

    try {
        const stats = await queueManager.getAllQueueStats();
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            queues: stats,
        });
    } catch (err: any) {
        res.status(500).json({
            status: 'error',
            message: err.message,
        });
    }
});

export default router;
