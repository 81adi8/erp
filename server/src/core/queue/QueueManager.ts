/**
 * TASK-04: QUEUE SYSTEM HARDENING
 *
 * Production-grade queue infrastructure:
 * - Retry policy: 3 attempts with exponential backoff
 * - Dead Letter Queue (DLQ): failed jobs moved, never dropped silently
 * - Job timeout: per-queue configurable
 * - Idempotency keys: prevent duplicate processing
 * - Graceful degradation: queue down → degrade, not crash
 */

import Bull = require('bull');
import { Job, JobOptions, Queue } from 'bull';
import Redis from 'ioredis';
import { env } from '../../config/env';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// ─── Queue types ─────────────────────────────────────────────────────────────
export enum QueueType {
    ATTENDANCE    = 'attendance',
    NOTIFICATIONS = 'notifications',
    REPORTS       = 'reports',
    ACADEMIC      = 'academic',
    EXAMINATIONS  = 'examinations',
    FEES          = 'fees',
    DEFAULT       = 'default',
    // Dead Letter Queues — one per domain
    DLQ_ATTENDANCE    = 'dlq:attendance',
    DLQ_NOTIFICATIONS = 'dlq:notifications',
    DLQ_REPORTS       = 'dlq:reports',
    DLQ_ACADEMIC      = 'dlq:academic',
    DLQ_EXAMINATIONS  = 'dlq:examinations',
    DLQ_FEES          = 'dlq:fees',
    DLQ_DEFAULT       = 'dlq:default',
}

// ─── Job priorities ───────────────────────────────────────────────────────────
export enum JobPriority {
    LOW      = 1,
    NORMAL   = 10,
    HIGH     = 20,
    CRITICAL = 30,
}

// ─── Job status ───────────────────────────────────────────────────────────────
export interface JobStatus {
    id: string;
    type: QueueType;
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'dlq';
    progress?: number;
    result?: any;
    error?: string;
    createdAt: Date;
    processedAt?: Date;
    completedAt?: Date;
    idempotencyKey?: string;
}

// ─── Queue config ─────────────────────────────────────────────────────────────
export interface QueueConfig {
    concurrency: number;
    maxRetries: number;
    backoffStrategy: 'fixed' | 'exponential';
    backoffDelay: number;
    jobTimeoutMs: number;
    removeOnComplete: number;
    removeOnFail: number;
    defaultJobOptions: JobOptions;
    dlqType: QueueType;
}

// ─── DLQ job payload ──────────────────────────────────────────────────────────
export interface DLQJobPayload {
    originalQueue: string;
    originalJobId: string | number;
    originalJobName: string;
    originalData: any;
    failureReason: string;
    failedAt: string;
    attemptsMade: number;
    idempotencyKey?: string;
    tenantId?: string;
}

// ─── Default configs ──────────────────────────────────────────────────────────
const defaultConfigs: Record<string, QueueConfig> = {
    [QueueType.ATTENDANCE]: {
        concurrency: 50,
        maxRetries: 3,
        backoffStrategy: 'exponential',
        backoffDelay: 2000,
        jobTimeoutMs: 30000,
        removeOnComplete: 1000,
        removeOnFail: 0,   // Keep ALL failed — moved to DLQ
        dlqType: QueueType.DLQ_ATTENDANCE,
        defaultJobOptions: {
            removeOnComplete: 1000,
            removeOnFail: false,  // Never auto-remove failed jobs
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            priority: JobPriority.HIGH,
            timeout: 30000,
        },
    },
    [QueueType.NOTIFICATIONS]: {
        concurrency: 20,
        maxRetries: 3,
        backoffStrategy: 'exponential',
        backoffDelay: 5000,
        jobTimeoutMs: 20000,
        removeOnComplete: 500,
        removeOnFail: 0,
        dlqType: QueueType.DLQ_NOTIFICATIONS,
        defaultJobOptions: {
            removeOnComplete: 500,
            removeOnFail: false,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            priority: JobPriority.NORMAL,
            timeout: 20000,
        },
    },
    [QueueType.REPORTS]: {
        concurrency: 5,
        maxRetries: 2,
        backoffStrategy: 'fixed',
        backoffDelay: 10000,
        jobTimeoutMs: 120000,
        removeOnComplete: 100,
        removeOnFail: 0,
        dlqType: QueueType.DLQ_REPORTS,
        defaultJobOptions: {
            removeOnComplete: 100,
            removeOnFail: false,
            attempts: 2,
            backoff: { type: 'fixed', delay: 10000 },
            priority: JobPriority.LOW,
            timeout: 120000,
        },
    },
    [QueueType.ACADEMIC]: {
        concurrency: 10,
        maxRetries: 3,
        backoffStrategy: 'exponential',
        backoffDelay: 3000,
        jobTimeoutMs: 60000,
        removeOnComplete: 200,
        removeOnFail: 0,
        dlqType: QueueType.DLQ_ACADEMIC,
        defaultJobOptions: {
            removeOnComplete: 200,
            removeOnFail: false,
            attempts: 3,
            backoff: { type: 'exponential', delay: 3000 },
            priority: JobPriority.NORMAL,
            timeout: 60000,
        },
    },
    [QueueType.EXAMINATIONS]: {
        concurrency: 15,
        maxRetries: 3,
        backoffStrategy: 'exponential',
        backoffDelay: 4000,
        jobTimeoutMs: 60000,
        removeOnComplete: 300,
        removeOnFail: 0,
        dlqType: QueueType.DLQ_EXAMINATIONS,
        defaultJobOptions: {
            removeOnComplete: 300,
            removeOnFail: false,
            attempts: 3,
            backoff: { type: 'exponential', delay: 4000 },
            priority: JobPriority.HIGH,
            timeout: 60000,
        },
    },
    [QueueType.FEES]: {
        concurrency: 20,
        maxRetries: 3,
        backoffStrategy: 'exponential',
        backoffDelay: 3000,
        jobTimeoutMs: 30000,
        removeOnComplete: 500,
        removeOnFail: 0,
        dlqType: QueueType.DLQ_FEES,
        defaultJobOptions: {
            removeOnComplete: 500,
            removeOnFail: false,
            attempts: 3,
            backoff: { type: 'exponential', delay: 3000 },
            priority: JobPriority.HIGH,
            timeout: 30000,
        },
    },
    [QueueType.DEFAULT]: {
        concurrency: 10,
        maxRetries: 3,
        backoffStrategy: 'exponential',
        backoffDelay: 2000,
        jobTimeoutMs: 30000,
        removeOnComplete: 200,
        removeOnFail: 0,
        dlqType: QueueType.DLQ_DEFAULT,
        defaultJobOptions: {
            removeOnComplete: 200,
            removeOnFail: false,
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            priority: JobPriority.NORMAL,
            timeout: 30000,
        },
    },
};

// DLQ queues use minimal config — they are storage only, no processors
const dlqConfig: QueueConfig = {
    concurrency: 1,
    maxRetries: 0,
    backoffStrategy: 'fixed',
    backoffDelay: 0,
    jobTimeoutMs: 0,
    removeOnComplete: 0,
    removeOnFail: 10000, // Keep 10k failed jobs in DLQ for inspection
    dlqType: QueueType.DLQ_DEFAULT,
    defaultJobOptions: {
        removeOnComplete: false,
        removeOnFail: 10000,
        attempts: 1,
    },
};

// ─── Idempotency store ────────────────────────────────────────────────────────
// Prevents duplicate job processing using Redis-backed deduplication
class IdempotencyStore {
    private prefix = 'queue:idempotency:';
    private ttlSeconds = 86400; // 24 hours

    constructor(private redis: any) {}

    private key(idempotencyKey: string): string {
        return `${this.prefix}${idempotencyKey}`;
    }

    async isDuplicate(idempotencyKey: string): Promise<boolean> {
        try {
            const exists = await this.redis.exists(this.key(idempotencyKey));
            return exists === 1;
        } catch {
            return false; // On Redis error, allow through (fail open for idempotency)
        }
    }

    async markProcessed(idempotencyKey: string, jobId: string | number): Promise<void> {
        try {
            await this.redis.setex(
                this.key(idempotencyKey),
                this.ttlSeconds,
                String(jobId)
            );
        } catch (err) {
            logger.warn(`[Idempotency] Failed to mark key ${idempotencyKey}:`, err);
        }
    }

    async getJobId(idempotencyKey: string): Promise<string | null> {
        try {
            return await this.redis.get(this.key(idempotencyKey));
        } catch {
            return null;
        }
    }
}

// ─── Queue Manager ────────────────────────────────────────────────────────────
class QueueManager {
    private queues: Map<string, Queue> = new Map();
    private dlqQueues: Map<string, Queue> = new Map();
    private isInitialized = false;
    private isAvailable = false;
    private idempotencyStore: IdempotencyStore | null = null;
    private queueRedisOptions: any;

    /**
     * Initialize all queues and workers.
     * Gracefully degrades if Redis is unavailable.
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            logger.warn('[QueueManager] Already initialized');
            return;
        }

        try {
            this.queueRedisOptions = {
                host: env.redis.host,
                port: env.redis.port,
                password: env.redis.password || undefined,
                username: env.redis.username || undefined,
                tls: env.redis.tls ? {} : undefined,
                maxRetriesPerRequest: null,  // Required for Bull
                enableReadyCheck: false,     // Required for Bull subscriber
                lazyConnect: true,
                retryStrategy: (times: number) => {
                    if (times > 3) return null;
                    return Math.min(500 * Math.pow(2, times - 1), 5000);
                },
            };

            // Shared client + subscriber for all queues
            const queueClient = new Redis(this.queueRedisOptions);
            const queueSubscriber = new Redis(this.queueRedisOptions);

            await Promise.all([
                queueClient.connect(),
                queueSubscriber.connect(),
            ]);

            // Idempotency store uses the same client
            this.idempotencyStore = new IdempotencyStore(queueClient);

            // ── Initialize primary queues ────────────────────────────────────
            const primaryTypes = [
                QueueType.ATTENDANCE,
                QueueType.NOTIFICATIONS,
                QueueType.REPORTS,
                QueueType.ACADEMIC,
                QueueType.EXAMINATIONS,
                QueueType.FEES,
                QueueType.DEFAULT,
            ];

            for (const queueType of primaryTypes) {
                const config = defaultConfigs[queueType];
                if (!config) {
                    throw new Error(`No configuration found for queue type: ${queueType}`);
                }
                const queue = new Bull(queueType, {
                    createClient: (type: string) => {
                        switch (type) {
                            case 'client':     return queueClient;
                            case 'subscriber': return queueSubscriber;
                            default:           return new Redis(this.queueRedisOptions);
                        }
                    },
                    defaultJobOptions: config.defaultJobOptions,
                });

                this.setupQueueEventListeners(queue, queueType, config.dlqType);
                this.queues.set(queueType, queue);
            }

            // ── Initialize DLQ queues ────────────────────────────────────────
            const dlqTypes = [
                QueueType.DLQ_ATTENDANCE,
                QueueType.DLQ_NOTIFICATIONS,
                QueueType.DLQ_REPORTS,
                QueueType.DLQ_ACADEMIC,
                QueueType.DLQ_EXAMINATIONS,
                QueueType.DLQ_FEES,
                QueueType.DLQ_DEFAULT,
            ];

            for (const dlqType of dlqTypes) {
                const dlq = new Bull(dlqType, {
                    createClient: (type: string) => {
                        switch (type) {
                            case 'client':     return queueClient;
                            case 'subscriber': return queueSubscriber;
                            default:           return new Redis(this.queueRedisOptions);
                        }
                    },
                    defaultJobOptions: dlqConfig.defaultJobOptions,
                });

                this.dlqQueues.set(dlqType, dlq);
                logger.info(`[QueueManager] DLQ initialized: ${dlqType}`);
            }

            this.isInitialized = true;
            this.isAvailable = true;
            logger.info('[QueueManager] ✅ Initialized with DLQ support');

        } catch (error) {
            logger.error('[QueueManager] ❌ Failed to initialize:', error);
            this.isAvailable = false;
            // Graceful degradation: don't throw — server continues without queues
            // Jobs will be rejected with a clear error message
        }
    }

    /**
     * Set up event listeners for a queue.
     * On final failure → move to DLQ.
     */
    private setupQueueEventListeners(
        queue: Queue,
        queueType: string,
        dlqType: QueueType
    ): void {
        queue.on('error', (error: Error) => {
            logger.error(`[Queue:${queueType}] Error:`, error.message);
        });

        queue.on('active', (job: Job) => {
            logger.info(`[Queue:${queueType}] Job ${job.id} active (attempt ${job.attemptsMade + 1})`);
        });

        queue.on('stalled', (job: Job) => {
            logger.warn(`[Queue:${queueType}] Job ${job.id} stalled — will retry`);
        });

        queue.on('completed', (job: Job) => {
            logger.info(`[Queue:${queueType}] Job ${job.id} completed`);
        });

        queue.on('failed', async (job: Job, error: Error) => {
            const maxAttempts = job.opts.attempts ?? 3;
            const attemptsMade = job.attemptsMade;

            logger.error(
                `[Queue:${queueType}] Job ${job.id} failed (attempt ${attemptsMade}/${maxAttempts}): ${error.message}`
            );

            // Move to DLQ only after all retries exhausted
            if (attemptsMade >= maxAttempts) {
                await this.moveToDLQ(job, queueType, dlqType, error);
            }
        });

        queue.on('waiting', (jobId: string | number) => {
            logger.debug(`[Queue:${queueType}] Job ${jobId} waiting`);
        });
    }

    /**
     * Move a failed job to the Dead Letter Queue.
     * NEVER drops silently.
     */
    private async moveToDLQ(
        job: Job,
        sourceQueue: string,
        dlqType: QueueType,
        error: Error
    ): Promise<void> {
        try {
            const dlq = this.dlqQueues.get(dlqType);
            if (!dlq) {
                logger.error(`[DLQ] DLQ not found for type ${dlqType} — job ${job.id} LOST`);
                return;
            }

            const dlqPayload: DLQJobPayload = {
                originalQueue: sourceQueue,
                originalJobId: job.id,
                originalJobName: job.name,
                originalData: job.data,
                failureReason: error.message,
                failedAt: new Date().toISOString(),
                attemptsMade: job.attemptsMade,
                idempotencyKey: job.data?.idempotencyKey,
                tenantId: job.data?.tenantId,
            };

            await dlq.add('dlq-entry', dlqPayload, {
                removeOnComplete: false,
                removeOnFail: false,
                attempts: 1,
            });

            logger.warn(
                `[DLQ] Job ${job.id} from queue "${sourceQueue}" moved to DLQ "${dlqType}" ` +
                `after ${job.attemptsMade} attempts. Reason: ${error.message}`
            );
        } catch (dlqError) {
            // This is a critical failure — log loudly
            logger.error(
                `[DLQ] CRITICAL: Failed to move job ${job.id} to DLQ "${dlqType}". ` +
                `Job data may be LOST. DLQ error: ${dlqError}`
            );
        }
    }

    /**
     * Get a primary queue by type.
     */
    getQueue(queueType: QueueType): Queue {
        if (!this.isAvailable) {
            throw new Error('[QueueManager] Queue system is unavailable (Redis down or not initialized)');
        }
        const queue = this.queues.get(queueType);
        if (!queue) {
            throw new Error(`[QueueManager] Queue "${queueType}" not found`);
        }
        return queue;
    }

    /**
     * Get a DLQ by type.
     */
    getDLQ(dlqType: QueueType): Queue {
        const dlq = this.dlqQueues.get(dlqType);
        if (!dlq) {
            throw new Error(`[QueueManager] DLQ "${dlqType}" not found`);
        }
        return dlq;
    }

    /**
     * Add a job to a queue with idempotency support.
     *
     * @param idempotencyKey - If provided, duplicate jobs with same key are rejected
     */
    async addJob<T = any>(
        queueType: QueueType,
        jobName: string,
        data: T & { idempotencyKey?: string; tenantId?: string },
        options?: JobOptions
    ): Promise<Job<T> | { id: string; duplicate: true }> {
        if (!this.isAvailable) {
            throw new Error('[QueueManager] Queue system unavailable — cannot enqueue job');
        }

        // ── Idempotency check ────────────────────────────────────────────────
        const idempotencyKey = data.idempotencyKey;
        if (idempotencyKey && this.idempotencyStore) {
            const isDuplicate = await this.idempotencyStore.isDuplicate(idempotencyKey);
            if (isDuplicate) {
                const existingJobId = await this.idempotencyStore.getJobId(idempotencyKey);
                logger.info(
                    `[QueueManager] Duplicate job rejected (idempotencyKey: ${idempotencyKey}, ` +
                    `existing: ${existingJobId})`
                );
                return { id: existingJobId ?? 'unknown', duplicate: true };
            }
        }

        const queue = this.getQueue(queueType);
        const config = defaultConfigs[queueType];
        if (!config) {
            throw new Error(`No configuration found for queue type: ${queueType}`);
        }

        const job = await queue.add(jobName, data, {
            ...config.defaultJobOptions,
            ...options,
        });

        // ── Mark idempotency key ─────────────────────────────────────────────
        if (idempotencyKey && this.idempotencyStore) {
            await this.idempotencyStore.markProcessed(idempotencyKey, job.id);
        }

        logger.info(`[QueueManager] Job ${job.id} (${jobName}) added to queue "${queueType}"`);
        return job;
    }

    /**
     * Generate a deterministic idempotency key from job data.
     */
    static generateIdempotencyKey(
        queueType: string,
        jobName: string,
        data: Record<string, any>
    ): string {
        const payload = JSON.stringify({ queueType, jobName, ...data });
        return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 32);
    }

    /**
     * Register a worker (processor) for a queue.
     */
    registerWorker<T = any>(
        queueType: QueueType,
        processor: (job: Job<T>) => Promise<any>,
        options: { jobName?: string; concurrency?: number } = {}
    ): void {
        if (!this.isAvailable) {
            logger.warn(`[QueueManager] Cannot register worker — queue system unavailable`);
            return;
        }

        const queue = this.getQueue(queueType);
        const config = defaultConfigs[queueType];
        if (!queue || !config) {
            logger.warn(`[QueueManager] Cannot register worker — queue or config not found for ${queueType}`);
            return;
        }
        const concurrency = options.concurrency ?? config.concurrency ?? 1;

        // Wrap processor with timeout enforcement
        const timedProcessor = async (job: Job<T>) => {
            const timeoutMs = config.jobTimeoutMs ?? 300000;
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(
                    () => reject(new Error(`Job timeout after ${timeoutMs}ms`)),
                    timeoutMs
                )
            );
            return Promise.race([processor(job), timeoutPromise]);
        };

        if (options.jobName) {
            queue.process(options.jobName, concurrency, timedProcessor);
        } else {
            queue.process(concurrency, timedProcessor);
        }

        logger.info(
            `[QueueManager] Worker registered for "${queueType}" ` +
            `(concurrency: ${concurrency}, timeout: ${config.jobTimeoutMs ?? 300000}ms)`
        );
    }

    /**
     * Get queue statistics including DLQ counts.
     */
    async getQueueStats(queueType: QueueType): Promise<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        dlqCount: number;
    }> {
        const queue = this.getQueue(queueType);
        const counts = await queue.getJobCounts();
        const config = defaultConfigs[queueType];

        let dlqCount = 0;
        try {
            const dlq = config ? this.dlqQueues.get(config.dlqType) : undefined;
            if (dlq) {
                const dlqCounts = await dlq.getJobCounts();
                dlqCount = dlqCounts.waiting + dlqCounts.active + dlqCounts.failed;
            }
        } catch {
            dlqCount = -1; // Unknown
        }

        return {
            waiting: counts.waiting,
            active: counts.active,
            completed: counts.completed,
            failed: counts.failed,
            delayed: counts.delayed,
            dlqCount,
        };
    }

    /**
     * Get all queue statistics.
     */
    async getAllQueueStats(): Promise<Record<string, any>> {
        const stats: Record<string, any> = {};
        const primaryTypes = [
            QueueType.ATTENDANCE,
            QueueType.NOTIFICATIONS,
            QueueType.REPORTS,
            QueueType.ACADEMIC,
            QueueType.EXAMINATIONS,
            QueueType.FEES,
            QueueType.DEFAULT,
        ];

        for (const queueType of primaryTypes) {
            try {
                stats[queueType] = await this.getQueueStats(queueType);
            } catch (error) {
                stats[queueType] = { error: 'Failed to fetch stats' };
            }
        }

        return stats;
    }

    /**
     * Retry all failed jobs in a DLQ (manual recovery).
     */
    async retryDLQ(dlqType: QueueType, originalQueueType: QueueType): Promise<number> {
        const dlq = this.getDLQ(dlqType);
        const failedJobs = await dlq.getFailed();
        let retried = 0;

        for (const job of failedJobs) {
            try {
                const payload = job.data as DLQJobPayload;
                await this.addJob(
                    originalQueueType,
                    payload.originalJobName,
                    {
                        ...payload.originalData,
                        _retriedFromDLQ: true,
                        _originalJobId: payload.originalJobId,
                    }
                );
                await job.remove();
                retried++;
            } catch (err) {
                logger.error(`[DLQ] Failed to retry job ${job.id}:`, err);
            }
        }

        logger.info(`[DLQ] Retried ${retried} jobs from ${dlqType}`);
        return retried;
    }

    /**
     * Check if queue system is available.
     */
    isQueueAvailable(): boolean {
        return this.isAvailable;
    }

    /**
     * Pause a queue.
     */
    async pauseQueue(queueType: QueueType): Promise<void> {
        const queue = this.getQueue(queueType);
        await queue.pause();
        logger.info(`[QueueManager] Queue "${queueType}" paused`);
    }

    /**
     * Resume a queue.
     */
    async resumeQueue(queueType: QueueType): Promise<void> {
        const queue = this.getQueue(queueType);
        await queue.resume();
        logger.info(`[QueueManager] Queue "${queueType}" resumed`);
    }

    /**
     * Graceful shutdown.
     */
    async shutdown(): Promise<void> {
        logger.info('[QueueManager] Shutting down...');

        const allQueues = [
            ...Array.from(this.queues.entries()),
            ...Array.from(this.dlqQueues.entries()),
        ];

        for (const [name, queue] of allQueues) {
            try {
                await queue.close();
                logger.debug(`[QueueManager] Queue "${name}" closed`);
            } catch (err) {
                logger.warn(`[QueueManager] Error closing queue "${name}":`, err);
            }
        }

        this.queues.clear();
        this.dlqQueues.clear();
        this.isInitialized = false;
        this.isAvailable = false;

        logger.info('[QueueManager] Shutdown complete');
    }
}

// ─── Singleton export ─────────────────────────────────────────────────────────
export const queueManager = new QueueManager();
