import { Request, Response, NextFunction } from 'express';
import { attendanceQueueService, BatchMarkAttendanceJobData } from '../services/attendance-queue.service';
import { queueManager, JobPriority, QueueType } from '../../../../core/queue/QueueManager';
import { logger } from '../../../../core/utils/logger';
import { sendError, sendSuccess } from './response.utils';

type AttendanceQueueStats = Awaited<ReturnType<typeof attendanceQueueService.getQueueStats>>;

interface BulkAttendanceEntryInput {
    studentId: string;
    classId?: string;
    sectionId?: string;
    date?: string;
    status: BatchMarkAttendanceJobData['attendanceData'][number]['status'];
    remarks?: string;
}

/**
 * Enhanced Attendance Controller with Queue Integration
 * This controller integrates the queue system with attendance operations
 */
export class EnhancedAttendanceController {
    /**
     * Mark attendance for a single student using queue
     */
    async queueMarkAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.userId;
            const tenantId = req.tenantId ?? req.tenant?.id;
            const institutionId = req.tenant?.id ?? req.tenantId;

            if (!userId || !tenantId || !institutionId) {
                sendError(res, 'User, tenant, or institution not found', 400);
                return;
            }

            const { studentId, classId, sectionId, date, status, remarks } = req.body;

            if (!studentId || !classId || !sectionId || !date || !status) {
                sendError(res, 'Missing required fields', 400);
                return;
            }

            // Queue the attendance marking job
            const jobId = await attendanceQueueService.queueMarkAttendance({
                tenantId,
                institutionId,
                attendanceData: {
                    studentId,
                    classId,
                    sectionId,
                    date: new Date(date),
                    status,
                    markedBy: userId,
                    remarks,
                    deviceInfo: req.headers['user-agent'] || undefined
                }
            }, {
                priority: JobPriority.HIGH
            });

            // Check if we should wait for immediate processing
            const queueStats = await attendanceQueueService.getQueueStats();
            const immediate = queueStats.waiting < 10 && queueStats.active < 40;

            sendSuccess(
                res,
                {
                    jobId,
                    queued: !immediate,
                    estimatedTime: immediate ? 0 : this.estimateProcessingTime(queueStats),
                },
                immediate
                    ? 'Attendance marked successfully'
                    : 'Attendance marking queued for processing',
                202
            );

        } catch (error) {
            logger.error('Error in queueMarkAttendance:', error);
            next(error);
        }
    }

    /**
     * Bulk mark attendance using queue
     */
    async queueBulkMarkAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user?.userId;
            const tenantId = req.tenantId ?? req.tenant?.id;
            const institutionId = req.tenant?.id ?? req.tenantId;

            if (!userId || !tenantId || !institutionId) {
                sendError(res, 'User, tenant, or institution not found', 400);
                return;
            }

            const { entries, date, classId, sectionId } = req.body as {
                entries?: BulkAttendanceEntryInput[];
                date?: string;
                classId?: string;
                sectionId?: string;
            };

            if (!entries || !Array.isArray(entries) || entries.length === 0) {
                sendError(res, 'No attendance entries provided', 400);
                return;
            }

            if (entries.length > 100) {
                sendError(res, 'Batch size cannot exceed 100 students', 400);
                return;
            }

            // Generate batch ID
            const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Queue the bulk attendance marking job
            const jobId = await attendanceQueueService.queueBatchMarkAttendance({
                tenantId,
                institutionId,
                batchId,
                attendanceData: entries.map((entry) => ({
                    studentId: entry.studentId,
                    classId: classId || entry.classId,
                    sectionId: sectionId || entry.sectionId,
                    date: new Date(date || entry.date),
                    status: entry.status,
                    markedBy: userId,
                    remarks: entry.remarks
                }))
            }, {
                priority: JobPriority.NORMAL
            });

            sendSuccess(
                res,
                {
                    jobId,
                    batchId,
                    totalStudents: entries.length,
                    estimatedTime: this.estimateBatchProcessingTime(entries.length),
                },
                'Bulk attendance marking queued for processing',
                202
            );

        } catch (error) {
            logger.error('Error in queueBulkMarkAttendance:', error);
            next(error);
        }
    }

    /**
     * Get job status
     */
    async getJobStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { jobId } = req.params;

            // Get job status from queue
            const queue = queueManager.getQueue(QueueType.ATTENDANCE);
            const job = await queue.getJob(jobId);

            if (!job) {
                sendError(res, 'Job not found', 404);
                return;
            }

            const state = await job.getState();
            const jobData = {
                id: job.id,
                name: job.name,
                data: job.data,
                progress: job.progress(),
                processedOn: job.processedOn,
                finishedOn: job.finishedOn,
                failedReason: job.failedReason,
                returnvalue: job.returnvalue,
                state,
            };

            sendSuccess(res, jobData, 'Job status fetched successfully');

        } catch (error) {
            logger.error('Error in getJobStatus:', error);
            next(error);
        }
    }

    /**
     * Get queue status for attendance
     */
    async getQueueStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const stats = await attendanceQueueService.getQueueStats();

            sendSuccess(
                res,
                {
                    queue: 'attendance',
                    stats,
                    timestamp: new Date().toISOString(),
                },
                'Queue status fetched successfully'
            );

        } catch (error) {
            logger.error('Error in getQueueStatus:', error);
            next(error);
        }
    }

    // =========================================================================
    // PRIVATE HELPER METHODS
    // =========================================================================

    /**
     * Estimate processing time based on queue stats
     */
    private estimateProcessingTime(stats: AttendanceQueueStats): number {
        const baseTime = 2000; // 2 seconds base time
        const queueFactor = stats.waiting * 0.5; // 0.5 seconds per waiting job
        const activeFactor = stats.active * 0.1; // 0.1 seconds per active job
        
        return Math.ceil(baseTime + queueFactor + activeFactor);
    }

    /**
     * Estimate batch processing time
     */
    private estimateBatchProcessingTime(studentCount: number): number {
        const baseTime = 5000; // 5 seconds base for batch
        const studentFactor = studentCount * 0.2; // 0.2 seconds per student
        
        return Math.ceil(baseTime + studentFactor);
    }
}

// Export singleton instance
export const enhancedAttendanceController = new EnhancedAttendanceController();
