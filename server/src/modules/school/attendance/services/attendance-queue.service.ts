import { Job } from 'bull';
import { queueManager, QueueType, JobPriority } from '../../../../core/queue/QueueManager';
import { eventController, EventType } from '../../../../core/events/event.controller';
import { logger } from '../../../../core/utils/logger';
import { sequelize } from '../../../../database/sequelize';
import { Transaction } from 'sequelize';

// Attendance job data interfaces
export interface MarkAttendanceJobData {
    tenantId: string;
    institutionId: string;
    attendanceData: {
        studentId: string;
        classId: string;
        sectionId: string;
        subjectId?: string;
        date: Date;
        status: 'present' | 'absent' | 'late' | 'half_day';
        markedBy: string;
        remarks?: string;
        latitude?: number;
        longitude?: number;
        deviceInfo?: string;
    };
}

export interface BatchMarkAttendanceJobData {
    tenantId: string;
    institutionId: string;
    batchId: string;
    attendanceData: Array<{
        studentId: string;
        classId: string;
        sectionId: string;
        subjectId?: string;
        date: Date;
        status: 'present' | 'absent' | 'late' | 'half_day';
        markedBy: string;
        remarks?: string;
    }>;
}

export interface GenerateAttendanceReportJobData {
    tenantId: string;
    institutionId: string;
    reportConfig: {
        type: 'daily' | 'weekly' | 'monthly' | 'custom';
        startDate: Date;
        endDate: Date;
        classIds?: string[];
        sectionIds?: string[];
        studentIds?: string[];
        format: 'excel' | 'pdf' | 'json';
    };
    requestedBy: string;
    emailTo?: string[];
}

// Result interfaces
export interface AttendanceJobResult {
    success: boolean;
    attendanceId?: string;
    error?: string;
    warnings?: string[];
}

export interface BatchAttendanceJobResult {
    success: boolean;
    totalProcessed: number;
    successful: number;
    failed: number;
    results: Array<{
        studentId: string;
        success: boolean;
        attendanceId?: string;
        error?: string;
    }>;
    batchId: string;
}

export interface AttendanceReportJobResult {
    success: boolean;
    reportUrl?: string;
    reportId?: string;
    error?: string;
    fileSize?: number;
}

class AttendanceQueueService {
    /**
     * Initialize the attendance queue service
     */
    initialize(): void {
        try {
            // Register workers for different attendance operations
            queueManager.registerWorker<MarkAttendanceJobData>(
                QueueType.ATTENDANCE,
                this.processMarkAttendance.bind(this),
                { 
                    jobName: 'mark-attendance',
                    concurrency: 50 // High concurrency for individual attendance marking
                }
            );

            queueManager.registerWorker<BatchMarkAttendanceJobData>(
                QueueType.ATTENDANCE,
                this.processBatchAttendance.bind(this),
                {
                    jobName: 'process-batch-attendance',
                    concurrency: 10 // Lower concurrency for batch operations
                }
            );

            queueManager.registerWorker<GenerateAttendanceReportJobData>(
                QueueType.ATTENDANCE,
                this.processGenerateAttendanceReport.bind(this),
                {
                    jobName: 'generate-attendance-report',
                    concurrency: 5 // Low concurrency for report generation
                }
            );

            // Subscribe to attendance events
            this.setupEventSubscriptions();

            logger.info('AttendanceQueueService initialized successfully');

        } catch (error) {
            logger.error('Failed to initialize AttendanceQueueService:', error);
            throw error;
        }
    }

    /**
     * Queue individual attendance marking
     */
    async queueMarkAttendance(
        data: MarkAttendanceJobData,
        options?: {
            priority?: JobPriority;
            delay?: number;
        }
    ): Promise<string> {
        const job = await queueManager.addJob(
            QueueType.ATTENDANCE,
            'mark-attendance',
            data,
            {
                priority: options?.priority || JobPriority.HIGH,
                delay: options?.delay || 0,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
            }
        );

        return job.id!.toString();
    }

    /**
     * Queue batch attendance marking
     */
    async queueBatchMarkAttendance(
        data: BatchMarkAttendanceJobData,
        options?: {
            priority?: JobPriority;
            delay?: number;
        }
    ): Promise<string> {
        const job = await queueManager.addJob(
            QueueType.ATTENDANCE,
            'process-batch-attendance',
            data,
            {
                priority: options?.priority || JobPriority.NORMAL,
                delay: options?.delay || 0,
                attempts: 2,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
            }
        );

        return job.id!.toString();
    }

    /**
     * Queue attendance report generation
     */
    async queueGenerateReport(
        data: GenerateAttendanceReportJobData,
        options?: {
            priority?: JobPriority;
            delay?: number;
        }
    ): Promise<string> {
        const job = await queueManager.addJob(
            QueueType.ATTENDANCE,
            'generate-attendance-report',
            data,
            {
                priority: options?.priority || JobPriority.LOW,
                delay: options?.delay || 0,
                attempts: 1,
                removeOnComplete: 50,
                removeOnFail: 25,
            }
        );

        return job.id!.toString();
    }

    /**
     * Process individual attendance marking
     */
    private async processMarkAttendance(job: Job<MarkAttendanceJobData>): Promise<AttendanceJobResult> {
        const { tenantId, institutionId, attendanceData } = job.data;
        
        try {
            logger.info(`Processing attendance marking job ${job.id} for student ${attendanceData.studentId}`);

            // Simulate database operation
            // In a real implementation, you would import and use your Attendance model here
            // For now, we'll simulate success
            const attendanceId = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Publish attendance marked event
            await eventController.publish({
                type: EventType.ATTENDANCE_MARKED,
                tenantId,
                institutionId,
                userId: attendanceData.markedBy,
                data: {
                    attendanceId,
                    studentId: attendanceData.studentId,
                    status: attendanceData.status,
                    date: attendanceData.date,
                },
            });

            logger.info(`Attendance marked for student ${attendanceData.studentId} on ${attendanceData.date}`);

            return {
                success: true,
                attendanceId,
            };

        } catch (error) {
            logger.error(`Failed to process attendance marking job ${job.id}:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Process batch attendance marking
     */
    private async processBatchAttendance(job: Job<BatchMarkAttendanceJobData>): Promise<BatchAttendanceJobResult> {
        const { tenantId, institutionId, batchId, attendanceData } = job.data;
        const results: BatchAttendanceJobResult['results'] = [];
        let successful = 0;
        let failed = 0;

        try {
            logger.info(`Processing batch attendance job ${job.id} with ${attendanceData.length} records`);

            // Process attendance in chunks to avoid overwhelming the database
            const chunkSize = 20;
            const chunks = this.chunkArray(attendanceData, chunkSize);

            for (const chunk of chunks) {
                // Process chunk within a transaction
                const chunkResults = await this.processAttendanceChunk(tenantId, institutionId, chunk);
                results.push(...chunkResults);
                
                successful += chunkResults.filter(r => r.success).length;
                failed += chunkResults.filter(r => !r.success).length;
            }

            // Publish batch attendance completed event
            await eventController.publish({
                type: EventType.ATTENDANCE_BATCH_MARKED,
                tenantId,
                institutionId,
                data: {
                    batchId,
                    totalProcessed: attendanceData.length,
                    successful,
                    failed,
                },
            });

            logger.info(`Batch attendance processed: ${successful} successful, ${failed} failed`);

            return {
                success: true,
                totalProcessed: attendanceData.length,
                successful,
                failed,
                results,
                batchId,
            };

        } catch (error) {
            logger.error(`Failed to process batch attendance job ${job.id}:`, error);
            return {
                success: false,
                totalProcessed: attendanceData.length,
                successful,
                failed,
                results,
                batchId,
            };
        }
    }

    /**
     * Process a chunk of attendance records within a transaction
     */
    private async processAttendanceChunk(
        tenantId: string,
        institutionId: string,
        attendanceChunk: BatchMarkAttendanceJobData['attendanceData']
    ): Promise<BatchAttendanceJobResult['results']> {
        const results: BatchAttendanceJobResult['results'] = [];

        return await sequelize.transaction(async (transaction: Transaction) => {
            for (const data of attendanceChunk) {
                try {
                    // Simulate database operation
                    // In a real implementation, you would import and use your Attendance model here
                    const attendanceId = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                    results.push({
                        studentId: data.studentId,
                        success: true,
                        attendanceId,
                    });
                } catch (error) {
                    results.push({
                        studentId: data.studentId,
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }

            return results;
        });
    }

    /**
     * Process attendance report generation
     */
    private async processGenerateAttendanceReport(job: Job<GenerateAttendanceReportJobData>): Promise<AttendanceReportJobResult> {
        const { tenantId, institutionId, reportConfig, requestedBy, emailTo } = job.data;

        try {
            logger.info(`Processing report generation job ${job.id}`);

            // Simulate report generation
            await new Promise(resolve => setTimeout(resolve, 2000));

            const reportId = `report_${Date.now()}`;
            const reportUrl = `/reports/${reportId}.${reportConfig.format}`;

            // Publish report generated event
            await eventController.publish({
                type: EventType.ATTENDANCE_REPORT_GENERATED,
                tenantId,
                institutionId,
                userId: requestedBy,
                data: {
                    reportId,
                    reportUrl,
                    reportConfig,
                    emailTo,
                },
            });

            logger.info(`Attendance report generated: ${reportId}`);

            return {
                success: true,
                reportId,
                reportUrl,
                fileSize: 1024,
            };

        } catch (error) {
            logger.error(`Failed to generate attendance report job ${job.id}:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Setup event subscriptions for attendance-related events
     */
    private setupEventSubscriptions(): void {
        // Subscribe to attendance events for logging and analytics
        eventController.subscribe(EventType.ATTENDANCE_MARKED, async (event) => {
            logger.debug(`Attendance marked event received`, {
                tenantId: event.tenantId,
                studentId: event.data.studentId,
                attendanceId: event.data.attendanceId,
            });
        });

        eventController.subscribe(EventType.ATTENDANCE_BATCH_MARKED, async (event) => {
            logger.info(`Batch attendance completed`, {
                tenantId: event.tenantId,
                batchId: event.data.batchId,
                successful: event.data.successful,
                failed: event.data.failed,
            });
        });
    }

    /**
     * Utility function to chunk array
     */
    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }

    /**
     * Get attendance queue statistics
     */
    async getQueueStats() {
        return await queueManager.getQueueStats(QueueType.ATTENDANCE);
    }
}

// Export singleton instance
export const attendanceQueueService = new AttendanceQueueService();
