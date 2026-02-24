import { Response, NextFunction } from 'express';
import { CustomRequest } from '../../../core/types/CustomRequest';
import { queueManager, QueueType } from '../../../core/queue/QueueManager';
import { eventController } from '../../../core/events/event.controller';
import { attendanceQueueService } from '../../school/attendance/services/attendance-queue.service';
import { logger } from '../../../core/utils/logger';

/**
 * Get all queue statistics
 */
export const getAllQueueStats = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        const stats = await queueManager.getAllQueueStats();
        
        res.json({
            success: true,
            data: {
                queues: stats,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        logger.error('Failed to get queue stats:', error);
        next(error);
    }
};

/**
 * Get specific queue statistics
 */
export const getQueueStats = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        const { queueType } = req.params;
        
        if (!Object.values(QueueType).includes(queueType as QueueType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid queue type',
            });
        }

        const stats = await queueManager.getQueueStats(queueType as QueueType);
        
        res.json({
            success: true,
            data: {
                queueType,
                stats,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        logger.error(`Failed to get queue stats for ${req.params.queueType}:`, error);
        next(error);
    }
};

/**
 * Get attendance queue specific statistics
 */
export const getAttendanceQueueStats = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        const stats = await attendanceQueueService.getQueueStats();
        
        res.json({
            success: true,
            data: {
                queueType: QueueType.ATTENDANCE,
                stats,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        logger.error('Failed to get attendance queue stats:', error);
        next(error);
    }
};

/**
 * Pause a queue
 */
export const pauseQueue = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        const { queueType } = req.params;
        
        if (!Object.values(QueueType).includes(queueType as QueueType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid queue type',
            });
        }

        await queueManager.pauseQueue(queueType as QueueType);
        
        res.json({
            success: true,
            message: `Queue ${queueType} paused successfully`,
        });
    } catch (error) {
        logger.error(`Failed to pause queue ${req.params.queueType}:`, error);
        next(error);
    }
};

/**
 * Resume a queue
 */
export const resumeQueue = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        const { queueType } = req.params;
        
        if (!Object.values(QueueType).includes(queueType as QueueType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid queue type',
            });
        }

        await queueManager.resumeQueue(queueType as QueueType);
        
        res.json({
            success: true,
            message: `Queue ${queueType} resumed successfully`,
        });
    } catch (error) {
        logger.error(`Failed to resume queue ${req.params.queueType}:`, error);
        next(error);
    }
};

/**
 * Clear a queue
 */
export const clearQueue = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        const { queueType } = req.params;
        
        if (!Object.values(QueueType).includes(queueType as QueueType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid queue type',
            });
        }

        const queue = queueManager.getQueue(queueType as QueueType);
        await queue.empty();
        
        res.json({
            success: true,
            message: `Queue ${queueType} cleared successfully`,
        });
    } catch (error) {
        logger.error(`Failed to clear queue ${req.params.queueType}:`, error);
        next(error);
    }
};

/**
 * Get event controller statistics
 */
export const getEventStats = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        const stats = eventController.getStats();
        
        res.json({
            success: true,
            data: {
                events: stats,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        logger.error('Failed to get event stats:', error);
        next(error);
    }
};

/**
 * Get system health including queue and event status
 */
export const getSystemHealth = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        const [queueStats, eventStats] = await Promise.all([
            queueManager.getAllQueueStats(),
            Promise.resolve(eventController.getStats()),
        ]);

        // Calculate overall health status
        const totalQueues = Object.keys(queueStats).length;
        const healthyQueues = Object.values(queueStats).filter(
            (stats) => {
                const queueStat = stats as { error?: unknown; active?: number };
                return !queueStat.error && (queueStat.active ?? 0) < 100; // Consider queue unhealthy if too many active jobs
            }
        ).length;

        const healthStatus = healthyQueues === totalQueues ? 'healthy' : 
                           healthyQueues > totalQueues / 2 ? 'degraded' : 'unhealthy';

        res.json({
            success: true,
            data: {
                status: healthStatus,
                queues: {
                    total: totalQueues,
                    healthy: healthyQueues,
                    details: queueStats,
                },
                events: eventStats,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        logger.error('Failed to get system health:', error);
        next(error);
    }
};

/**
 * Test queue functionality
 */
export const testQueue = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        const { queueType = QueueType.DEFAULT } = req.body;
        
        if (!Object.values(QueueType).includes(queueType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid queue type',
            });
        }

        // Add a test job
        const jobId = await queueManager.addJob(
            queueType as QueueType,
            'test-job',
            {
                message: 'This is a test job',
                timestamp: new Date(),
                requestedBy: req.user?.userId || 'anonymous',
            },
            {
                priority: 10,
                removeOnComplete: 10,
                removeOnFail: 5,
            }
        );

        res.json({
            success: true,
            message: 'Test job added successfully',
            data: {
                jobId,
                queueType,
            },
        });
    } catch (error) {
        logger.error('Failed to add test job:', error);
        next(error);
    }
};

/**
 * Test event publishing
 */
export const testEvent = async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
        const { eventType = 'TEST_EVENT', data = {} } = req.body;
        
        await eventController.publish({
            type: eventType,
            data: {
                ...data,
                message: 'This is a test event',
                timestamp: new Date(),
                requestedBy: req.user?.userId || 'anonymous',
            },
        });

        res.json({
            success: true,
            message: 'Test event published successfully',
            data: {
                eventType,
            },
        });
    } catch (error) {
        logger.error('Failed to publish test event:', error);
        next(error);
    }
};

