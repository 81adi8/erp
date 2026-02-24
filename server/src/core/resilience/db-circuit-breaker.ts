/**
 * TASK-E2 — Database Circuit Breaker
 *
 * Prevents connection storms when the DB is slow or unavailable.
 *
 * States:
 *   CLOSED   → normal operation, all queries pass through
 *   OPEN     → circuit tripped, queries rejected immediately (503)
 *   HALF_OPEN → testing recovery, limited queries allowed through
 *
 * Trip conditions:
 *   - Consecutive failures >= FAILURE_THRESHOLD (default: 5)
 *   - OR average latency > LATENCY_THRESHOLD_MS (default: 3000ms)
 *
 * Recovery:
 *   - After OPEN_DURATION_MS (default: 30s), enters HALF_OPEN
 *   - HALF_OPEN: allows 1 probe query
 *   - If probe succeeds → CLOSED
 *   - If probe fails → back to OPEN
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
    failureThreshold: number;      // Consecutive failures to trip
    latencyThresholdMs: number;    // Avg latency to trip
    openDurationMs: number;        // How long to stay OPEN before HALF_OPEN
    halfOpenProbeCount: number;    // Probes allowed in HALF_OPEN
    latencyWindowSize: number;     // Rolling window for latency calculation
}

export interface CircuitBreakerStats {
    state: CircuitState;
    consecutiveFailures: number;
    avgLatencyMs: number;
    totalRequests: number;
    totalFailures: number;
    lastFailureAt: Date | null;
    openedAt: Date | null;
    recoveredAt: Date | null;
}

// ─── DB Circuit Breaker ───────────────────────────────────────────────────────

export class DbCircuitBreaker extends EventEmitter {
    private static instance: DbCircuitBreaker | null = null;

    private state: CircuitState = 'CLOSED';
    private consecutiveFailures = 0;
    private latencyWindow: number[] = [];
    private totalRequests = 0;
    private totalFailures = 0;
    private lastFailureAt: Date | null = null;
    private openedAt: Date | null = null;
    private recoveredAt: Date | null = null;
    private halfOpenProbesAllowed = 0;
    private halfOpenProbesUsed = 0;

    private readonly config: CircuitBreakerConfig;

    private constructor(config?: Partial<CircuitBreakerConfig>) {
        super();
        this.config = {
            failureThreshold: config?.failureThreshold ?? 5,
            latencyThresholdMs: config?.latencyThresholdMs ?? 3000,
            openDurationMs: config?.openDurationMs ?? 30_000,
            halfOpenProbeCount: config?.halfOpenProbeCount ?? 1,
            latencyWindowSize: config?.latencyWindowSize ?? 20,
        };
    }

    static getInstance(config?: Partial<CircuitBreakerConfig>): DbCircuitBreaker {
        if (!DbCircuitBreaker.instance) {
            DbCircuitBreaker.instance = new DbCircuitBreaker(config);
        }
        return DbCircuitBreaker.instance;
    }

    // ── Core: execute with circuit breaker ───────────────────────────────────

    /**
     * Execute a DB operation through the circuit breaker.
     * Throws CircuitOpenError if circuit is OPEN.
     */
    async execute<T>(operation: () => Promise<T>, operationName = 'db_query'): Promise<T> {
        this.checkState();

        const start = Date.now();
        this.totalRequests++;

        try {
            const result = await operation();
            const latency = Date.now() - start;

            this.recordSuccess(latency);
            return result;
        } catch (err: any) {
            const latency = Date.now() - start;
            this.recordFailure(latency, operationName, err.message);
            throw err;
        }
    }

    /**
     * Check if a request should be allowed through.
     * Throws if circuit is OPEN or HALF_OPEN with no probes remaining.
     */
    private checkState(): void {
        if (this.state === 'CLOSED') return;

        if (this.state === 'OPEN') {
            // Check if it's time to try HALF_OPEN
            const openDuration = Date.now() - (this.openedAt?.getTime() ?? 0);
            if (openDuration >= this.config.openDurationMs) {
                this.transitionTo('HALF_OPEN');
                this.halfOpenProbesAllowed = this.config.halfOpenProbeCount;
                this.halfOpenProbesUsed = 0;
            } else {
                const remainingMs = this.config.openDurationMs - openDuration;
                throw Object.assign(
                    new Error(`Database circuit breaker OPEN. Retry in ${Math.ceil(remainingMs / 1000)}s`),
                    { code: 'CIRCUIT_OPEN', retryAfterMs: remainingMs }
                );
            }
        }

        if (this.state === 'HALF_OPEN') {
            if (this.halfOpenProbesUsed >= this.halfOpenProbesAllowed) {
                throw Object.assign(
                    new Error('Database circuit breaker HALF_OPEN — probe limit reached'),
                    { code: 'CIRCUIT_HALF_OPEN' }
                );
            }
            this.halfOpenProbesUsed++;
        }
    }

    private recordSuccess(latencyMs: number): void {
        this.updateLatencyWindow(latencyMs);

        if (this.state === 'HALF_OPEN') {
            // Probe succeeded — close the circuit
            this.consecutiveFailures = 0;
            this.recoveredAt = new Date();
            this.transitionTo('CLOSED');
            logger.info(`[DbCircuitBreaker] Circuit CLOSED after successful probe (latency: ${latencyMs}ms)`);
        } else {
            // Normal success — reset consecutive failures
            this.consecutiveFailures = 0;
        }
    }

    private recordFailure(latencyMs: number, operationName: string, errorMsg: string): void {
        this.consecutiveFailures++;
        this.totalFailures++;
        this.lastFailureAt = new Date();
        this.updateLatencyWindow(latencyMs);

        const avgLatency = this.getAvgLatency();

        if (this.state === 'HALF_OPEN') {
            // Probe failed — back to OPEN
            this.openedAt = new Date();
            this.transitionTo('OPEN');
            logger.warn(`[DbCircuitBreaker] HALF_OPEN probe failed — back to OPEN`);
            return;
        }

        // Check trip conditions
        const shouldTrip =
            this.consecutiveFailures >= this.config.failureThreshold ||
            avgLatency > this.config.latencyThresholdMs;

        if (shouldTrip && this.state === 'CLOSED') {
            this.openedAt = new Date();
            this.transitionTo('OPEN');
            logger.error(
                `[DbCircuitBreaker] Circuit OPEN — ` +
                `failures: ${this.consecutiveFailures}, avgLatency: ${avgLatency}ms, ` +
                `operation: ${operationName}, error: ${errorMsg}`
            );
        }
    }

    private updateLatencyWindow(latencyMs: number): void {
        this.latencyWindow.push(latencyMs);
        if (this.latencyWindow.length > this.config.latencyWindowSize) {
            this.latencyWindow.shift();
        }
    }

    private getAvgLatency(): number {
        if (this.latencyWindow.length === 0) return 0;
        return this.latencyWindow.reduce((a, b) => a + b, 0) / this.latencyWindow.length;
    }

    private transitionTo(newState: CircuitState): void {
        const oldState = this.state;
        this.state = newState;
        this.emit('state_change', { from: oldState, to: newState, timestamp: new Date() });
    }

    // ── Public API ────────────────────────────────────────────────────────────

    getState(): CircuitState {
        return this.state;
    }

    isHealthy(): boolean {
        return this.state === 'CLOSED';
    }

    getStats(): CircuitBreakerStats {
        return {
            state: this.state,
            consecutiveFailures: this.consecutiveFailures,
            avgLatencyMs: Math.round(this.getAvgLatency()),
            totalRequests: this.totalRequests,
            totalFailures: this.totalFailures,
            lastFailureAt: this.lastFailureAt,
            openedAt: this.openedAt,
            recoveredAt: this.recoveredAt,
        };
    }

    /**
     * Force reset (for testing or manual recovery).
     */
    reset(): void {
        this.state = 'CLOSED';
        this.consecutiveFailures = 0;
        this.latencyWindow = [];
        this.openedAt = null;
        this.emit('manual_reset', { timestamp: new Date() });
    }
}

export const dbCircuitBreaker = DbCircuitBreaker.getInstance();
