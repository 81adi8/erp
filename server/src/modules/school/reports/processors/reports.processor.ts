import { Job } from 'bull';

import { queueManager, QueueType } from '../../../../core/queue/QueueManager';
import { reportsService, type ReportProcessPayload } from '../services/reports.service';

let workerRegistered = false;

export const registerReportsWorker = (): void => {
    if (workerRegistered || !queueManager.isQueueAvailable()) {
        return;
    }

    queueManager.registerWorker(
        QueueType.REPORTS,
        async (job: Job<ReportProcessPayload>) => {
            await reportsService.processReportJob(job.data);
        },
        { jobName: 'generate-report', concurrency: 2 },
    );

    workerRegistered = true;
};
