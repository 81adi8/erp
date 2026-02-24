/**
 * TASK-E2 — Queue Pressure Protection
 *
 * When queue backlog grows too large, producers are throttled to protect the DB.
 *
 * Strategy:
 *   - Monitor queue depth via Redis LIST length (LLEN)
 *   - When depth > WARNING_THRESHOLD → log + emit metric
 *   - When depth > CRITICAL_THRESHOLD → throttle producers (add delay)
 *   - When depth > SHED_THRESHOLD → shed non-critical jobs (return 429)
 *
 * Thresholds (configurable via env):
 *   QUEUE_WARNING_DEPTH   = 500   (warn)
 *   QUEUE_CRITICAL_DEPTH  = 1000  (throttle producers 500ms)
 *   QUEUE_SHED_DEPTH      = 5000  (shed non-critical jobs)
 *
 * Job priority:
 *   CRITICAL  → always accepted (auth events, audit logs)
 *   HIGH      → accepted unless SHED_THRESHOLD
 *   NORMAL    → throttled at CRITICAL_THRESHOLD, shed at SHED_THRESHOLD
 *   LOW       → throttled at WARNING_THRESHOLD, shed at CRITICAL_THRESHOLD
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export type QueuePressureLevel = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'SHED';

export interface QueuePressureConfig {
    warningDepth: number;
    criticalDepth: number;
    shedDepth: number;
    throttleDelayMs: number;
    checkIntervalMs: number;
}

export interface QueuePressureStatus {
    level: QueuePressureLevel;
    depth: number;
    throttleDelayMs: number;
    shedding: boolean;
    checkedAt: Date;
}

// ─── Queue Pressure Service ───────────────────────────────────────────────────

export class QueuePressureService extends EventEmitter {
    private static instance: QueuePressureService | null = null;

    private currentLevel: QueuePressureLevel = 'NORMAL';
    private currentDepth = 0;
    private checkInterval: NodeJS.Timeout | null = null;
    private readonly queueKeys: string[];

    private readonly config: QueuePressureConfig;

    private constructor(queueKeys: string[], config?: Partial<QueuePressureConfig>) {
        super();
        this.queueKeys = queueKeys;
        this.config = {
            warningDepth: config?.warningDepth ?? parseInt(process.env.QUEUE_WARNING_DEPTH || '500'),
            criticalDepth: config?.criticalDepth ?? parseInt(process.env.QUEUE_CRITICAL_DEPTH || '1000'),
            shedDepth: config?.shedDepth ?? parseInt(process.env.QUEUE_SHED_DEPTH || '5000'),
            throttleDelayMs: config?.throttleDelayMs ?? 500,
            checkIntervalMs: config?.checkIntervalMs ?? 10_000, // Check every 10s
        };
    }

    static getInstance(queueKeys?: string[], config?: Partial<QueuePressureConfig>): QueuePressureService {
        if (!QueuePressureService.instance) {
            QueuePressureService.instance = new QueuePressureService(
                queueKeys || ['bull:*', 'queue:*'],
                config
            );
        }
        return QueuePressureService.instance;
    }

    // ── Monitoring ────────────────────────────────────────────────────────────

    startMonitoring(): void {
        if (this.checkInterval) return;
        this.checkInterval = setInterval(() => this.checkDepth(), this.config.checkIntervalMs);
        this.checkDepth(); // Immediate check
    }

    stopMonitoring(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    private async checkDepth(): Promise<void> {
        try {
            const { getRedis } = await import('../../config/redis');
            const redis = getRedis();

            // Sum depth across all monitored queue keys
            let totalDepth = 0;
            for (const key of this.queueKeys) {
                try {
                    const depth = await redis.llen(key);
                    totalDepth += depth;
                } catch {
                    // Key might not exist or be wrong type — skip
                }
            }

            this.currentDepth = totalDepth;
            const previousLevel = this.currentLevel;

            if (totalDepth >= this.config.shedDepth) {
                this.currentLevel = 'SHED';
            } else if (totalDepth >= this.config.criticalDepth) {
                this.currentLevel = 'CRITICAL';
            } else if (totalDepth >= this.config.warningDepth) {
                this.currentLevel = 'WARNING';
            } else {
                this.currentLevel = 'NORMAL';
            }

            if (this.currentLevel !== previousLevel) {
                this.emit('pressure_change', {
                    from: previousLevel,
                    to: this.currentLevel,
                    depth: totalDepth,
                    timestamp: new Date(),
                });

                if (this.currentLevel === 'CRITICAL' || this.currentLevel === 'SHED') {
                    logger.warn(
                        `[QueuePressure] Level: ${this.currentLevel}, depth: ${totalDepth}. ` +
                        `${this.currentLevel === 'SHED' ? 'Shedding non-critical jobs.' : 'Throttling producers.'}`
                    );
                }
            }
        } catch {
            // Redis unavailable — assume NORMAL (fail open for queue monitoring)
        }
    }

    // ── Producer throttle gate ────────────────────────────────────────────────

    /**
     * Call before enqueuing a job.
     * Returns: { allowed: boolean, delayMs: number }
     *
     * CRITICAL jobs always pass through.
     * LOW jobs are shed at WARNING level.
     * NORMAL jobs are shed at CRITICAL level.
     * HIGH jobs are shed at SHED level.
     */
    async checkProducerGate(priority: JobPriority = 'NORMAL'): Promise<{
        allowed: boolean;
        delayMs: number;
        reason?: string;
    }> {
        // CRITICAL jobs always pass — auth events, audit logs must never be dropped
        if (priority === 'CRITICAL') {
            return { allowed: true, delayMs: 0 };
        }

        switch (this.currentLevel) {
            case 'NORMAL':
                return { allowed: true, delayMs: 0 };

            case 'WARNING':
                if (priority === 'LOW') {
                    return { allowed: false, delayMs: 0, reason: 'Queue WARNING — LOW priority jobs shed' };
                }
                return { allowed: true, delayMs: this.config.throttleDelayMs / 2 };

            case 'CRITICAL':
                if (priority === 'LOW' || priority === 'NORMAL') {
                    return {
                        allowed: false,
                        delayMs: 0,
                        reason: `Queue CRITICAL (depth: ${this.currentDepth}) — ${priority} priority jobs shed`,
                    };
                }
                // HIGH priority: throttle with delay
                return { allowed: true, delayMs: this.config.throttleDelayMs };

            case 'SHED':
                // At this point priority is 'HIGH' | 'NORMAL' | 'LOW' (CRITICAL returned early)
                return {
                    allowed: false,
                    delayMs: 0,
                    reason: `Queue SHED (depth: ${this.currentDepth}) — only CRITICAL jobs accepted`,
                };
        }
    }

    /**
     * Apply throttle delay if needed (call after checkProducerGate returns delayMs > 0).
     */
    async applyThrottle(delayMs: number): Promise<void> {
        if (delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    // ── Status ────────────────────────────────────────────────────────────────

    getStatus(): QueuePressureStatus {
        return {
            level: this.currentLevel,
            depth: this.currentDepth,
            throttleDelayMs: this.currentLevel === 'CRITICAL' ? this.config.throttleDelayMs : 0,
            shedding: this.currentLevel === 'SHED',
            checkedAt: new Date(),
        };
    }

    getCurrentLevel(): QueuePressureLevel {
        return this.currentLevel;
    }
}

export const queuePressure = QueuePressureService.getInstance();
