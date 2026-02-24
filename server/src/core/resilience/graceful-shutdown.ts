/**
 * TASK-E2 — Graceful Shutdown
 *
 * ALB + autoscaling requires clean shutdown on SIGTERM:
 *
 *   SIGTERM received →
 *     1. Stop accepting new HTTP connections (server.close())
 *     2. Wait for in-flight requests to complete (drain window: 15s)
 *     3. Stop queue consumers (no new jobs picked up)
 *     4. Flush pending queue jobs back to Redis
 *     5. Close DB connection pool
 *     6. Close Redis connections
 *     7. Stop resilience monitors (Redis probe, queue pressure)
 *     8. Exit 0 (clean)
 *
 * Timeout: if drain takes > SHUTDOWN_TIMEOUT_MS (default: 30s), force exit(1).
 *
 * Usage:
 *   import { registerGracefulShutdown } from './graceful-shutdown';
 *   registerGracefulShutdown(httpServer, { sequelize, redis });
 */

import type { Server } from 'http';
import type { Sequelize } from 'sequelize';
import { logger } from '../utils/logger';

export interface ShutdownDependencies {
    sequelize?: Sequelize;
    redis?: any;           // ioredis client
    queueManager?: any;    // QueueManager instance
    onBeforeShutdown?: () => Promise<void>;  // Custom pre-shutdown hook
}

export interface ShutdownConfig {
    drainTimeoutMs: number;    // Max time to wait for in-flight requests (default: 15s)
    shutdownTimeoutMs: number; // Max total shutdown time before force exit (default: 30s)
    exitCode: number;          // Exit code on clean shutdown (default: 0)
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

let isShuttingDown = false;

export function registerGracefulShutdown(
    server: Server,
    deps: ShutdownDependencies = {},
    config: Partial<ShutdownConfig> = {}
): void {
    const shutdownConfig: ShutdownConfig = {
        drainTimeoutMs: config.drainTimeoutMs ?? parseInt(process.env.SHUTDOWN_DRAIN_MS || '15000'),
        shutdownTimeoutMs: config.shutdownTimeoutMs ?? parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '30000'),
        exitCode: config.exitCode ?? 0,
    };

    const shutdown = async (signal: string): Promise<void> => {
        if (isShuttingDown) {
            logger.info(`[GracefulShutdown] Already shutting down, ignoring ${signal}`);
            return;
        }

        isShuttingDown = true;
        logger.info(`\n[GracefulShutdown] ${signal} received — starting graceful shutdown`);
        logger.info(`[GracefulShutdown] Drain timeout: ${shutdownConfig.drainTimeoutMs}ms, Total timeout: ${shutdownConfig.shutdownTimeoutMs}ms`);

        // Force exit if shutdown takes too long
        const forceExitTimer = setTimeout(() => {
            logger.error('[GracefulShutdown] Shutdown timeout exceeded — forcing exit(1)');
            process.exit(1);
        }, shutdownConfig.shutdownTimeoutMs);
        forceExitTimer.unref(); // Don't keep process alive just for this timer

        try {
            // ── STEP 1: Stop accepting new connections ────────────────────────
            logger.info('[GracefulShutdown] Step 1: Stopping HTTP server (no new connections)');
            await new Promise<void>((resolve) => {
                server.close((err) => {
                    if (err) {
                        logger.warn('[GracefulShutdown] HTTP server close error:', err.message);
                    }
                    resolve();
                });

                // Force close after drain timeout
                setTimeout(() => {
                    logger.warn('[GracefulShutdown] Drain timeout — forcing server close');
                    resolve();
                }, shutdownConfig.drainTimeoutMs);
            });
            logger.info('[GracefulShutdown] Step 1: HTTP server stopped');

            // ── STEP 2: Custom pre-shutdown hook ──────────────────────────────
            if (deps.onBeforeShutdown) {
                logger.info('[GracefulShutdown] Step 2: Running pre-shutdown hook');
                try {
                    await deps.onBeforeShutdown();
                } catch (err: any) {
                    logger.warn('[GracefulShutdown] Pre-shutdown hook error:', err.message);
                }
            }

            // ── STEP 3: Stop queue consumers ──────────────────────────────────
            if (deps.queueManager) {
                logger.info('[GracefulShutdown] Step 3: Stopping queue consumers');
                try {
                    if (typeof deps.queueManager.shutdown === 'function') {
                        await deps.queueManager.shutdown();
                    } else if (typeof deps.queueManager.close === 'function') {
                        await deps.queueManager.close();
                    }
                    logger.info('[GracefulShutdown] Step 3: Queue consumers stopped');
                } catch (err: any) {
                    logger.warn('[GracefulShutdown] Queue shutdown error:', err.message);
                }
            }

            // ── STEP 4: Stop resilience monitors ─────────────────────────────
            logger.info('[GracefulShutdown] Step 4: Stopping resilience monitors');
            try {
                const { redisDegradation } = await import('./redis-degradation.service');
                redisDegradation.stopHealthProbe();

                const { queuePressure } = await import('./queue-pressure.service');
                queuePressure.stopMonitoring();

                logger.info('[GracefulShutdown] Step 4: Resilience monitors stopped');
            } catch (err: any) {
                logger.warn('[GracefulShutdown] Resilience monitor stop error:', err.message);
            }

            // ── STEP 5: Close DB connection pool ─────────────────────────────
            if (deps.sequelize) {
                logger.info('[GracefulShutdown] Step 5: Closing database connections');
                try {
                    await deps.sequelize.close();
                    logger.info('[GracefulShutdown] Step 5: Database connections closed');
                } catch (err: any) {
                    logger.warn('[GracefulShutdown] DB close error:', err.message);
                }
            }

            // ── STEP 6: Close Redis connections ───────────────────────────────
            if (deps.redis) {
                logger.info('[GracefulShutdown] Step 6: Closing Redis connections');
                try {
                    await deps.redis.quit();
                    logger.info('[GracefulShutdown] Step 6: Redis connections closed');
                } catch (err: any) {
                    logger.warn('[GracefulShutdown] Redis close error:', err.message);
                }
            }

            // ── STEP 7: Clean exit ────────────────────────────────────────────
            clearTimeout(forceExitTimer);
            logger.info(`[GracefulShutdown] Shutdown complete — exit(${shutdownConfig.exitCode})`);
            process.exit(shutdownConfig.exitCode);

        } catch (err: any) {
            logger.error('[GracefulShutdown] Unexpected error during shutdown:', err.message);
            clearTimeout(forceExitTimer);
            process.exit(1);
        }
    };

    // ── Signal handlers ───────────────────────────────────────────────────────
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Unhandled rejection — log but don't crash in production
    process.on('unhandledRejection', (reason: any) => {
        logger.error('[GracefulShutdown] Unhandled Promise Rejection:', reason?.message || reason);
        // In production, log and continue. In development, crash to surface bugs.
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
            process.exit(1);
        }
    });

    // Uncaught exception — always fatal
    process.on('uncaughtException', (err: Error) => {
        logger.error('[GracefulShutdown] Uncaught Exception:', err.message, err.stack);
        process.exit(1);
    });

    logger.info('[GracefulShutdown] Signal handlers registered (SIGTERM, SIGINT)');
}

/**
 * Check if the server is currently shutting down.
 * Use this in health checks to return 503 during drain window.
 */
export function isServerShuttingDown(): boolean {
    return isShuttingDown;
}

