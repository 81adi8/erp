import { Job } from 'bull';
import { queueManager, QueueType, JobPriority } from '../../../../../core/queue/QueueManager';
import { logger } from '../../../../../core/utils/logger';
import { calendarificService } from '../calendar/calendarific.service';

export interface SyncHolidaysJobData {
    country: string;
    year: number;
}

class SystemQueueService {
    /**
     * Initialize the system queue service
     */
    initialize(): void {
        try {
            // Register worker for holiday synchronization
            queueManager.registerWorker<SyncHolidaysJobData>(
                QueueType.ACADEMIC,
                this.processHolidaySync.bind(this),
                {
                    jobName: 'sync-external-holidays',
                    concurrency: 1
                }
            );

            // Schedule the job to run every quarter (90 days) to keep future years updated
            // We use a cron expression for Bull
            this.scheduleHolidaySync();

            logger.info('SystemQueueService initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize SystemQueueService:', error);
            throw error;
        }
    }

    /**
     * Schedule the holiday sync job
     */
    private async scheduleHolidaySync() {
        // Run quarterly at midnight on the 1st of the month
        // '0 0 1 */3 *'
        await queueManager.addJob(
            QueueType.ACADEMIC,
            'sync-external-holidays',
            { country: 'IN', year: new Date().getFullYear() },
            {
                repeat: { cron: '0 0 1 */3 *' },
                priority: JobPriority.LOW,
                removeOnComplete: true
            }
        );

        // Also sync for the next year to ensure upcoming calendars are ready
        await queueManager.addJob(
            QueueType.ACADEMIC,
            'sync-external-holidays',
            { country: 'IN', year: new Date().getFullYear() + 1 },
            {
                repeat: { cron: '0 0 15 */6 *' }, // Every 6 months
                priority: JobPriority.LOW,
                removeOnComplete: true
            }
        );
    }

    /**
     * Trigger an immediate sync for a specific country and year
     */
    async triggerImmediateSync(country: string, year: number) {
        return await queueManager.addJob(
            QueueType.ACADEMIC,
            'sync-external-holidays',
            { country, year },
            { priority: JobPriority.NORMAL }
        );
    }

    /**
     * Process the holiday synchronization job
     */
    private async processHolidaySync(job: Job<SyncHolidaysJobData>): Promise<{ success: boolean }> {
        const { country, year } = job.data;
        
        try {
            logger.info(`[Job ${job.id}] Starting holiday sync for ${country} in ${year}`);
            await calendarificService.syncToGlobal(country, year);
            return { success: true };
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`[Job ${job.id}] Holiday sync failed: ${errMsg}`);
            throw error; // Let Bull handle retries
        }
    }
}

export const systemQueueService = new SystemQueueService();
