/**
 * TASK-04: OBSERVABILITY STACK — Metrics Collector
 *
 * In-process metrics collection (no external dependency required):
 *   - auth latency
 *   - DB query latency
 *   - RBAC resolution latency
 *   - queue lag
 *   - Redis latency
 *
 * Metrics are stored in a rolling window and exposed via /health/metrics.
 * In production, these can be scraped by Prometheus or pushed to Datadog.
 */

import { structuredLogger } from './structured-logger';

// ─── Metric types ─────────────────────────────────────────────────────────────
export type MetricName =
    | 'auth.latency'
    | 'auth.login_failures'
    | 'db.query_latency'
    | 'db.slow_queries'
    | 'rbac.resolution_latency'
    | 'rbac.deny_count'
    | 'redis.latency'
    | 'redis.disconnects'
    | 'queue.lag'
    | 'queue.dlq_count'
    | 'http.request_latency'
    | 'http.error_count';

// ─── Histogram bucket ─────────────────────────────────────────────────────────
interface HistogramBucket {
    count: number;
    sum: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
    samples: number[]; // Rolling window of last N samples
}

// ─── Counter ──────────────────────────────────────────────────────────────────
interface Counter {
    total: number;
    perMinute: number[];  // Last 60 minute buckets
    lastReset: number;
}

// ─── Alert thresholds ─────────────────────────────────────────────────────────
export const AlertThresholds = {
    AUTH_LATENCY_MS:          2000,   // Alert if auth > 2s
    DB_LATENCY_MS:            1000,   // Alert if DB query > 1s
    RBAC_LATENCY_MS:          500,    // Alert if RBAC > 500ms
    REDIS_LATENCY_MS:         200,    // Alert if Redis > 200ms
    LOGIN_FAILURES_PER_MIN:   20,     // Alert if >20 login failures/min
    RBAC_DENIES_PER_MIN:      50,     // Alert if >50 RBAC denies/min
    SLOW_QUERY_THRESHOLD_MS:  500,    // Queries > 500ms are "slow"
    QUEUE_LAG_MS:             30000,  // Alert if queue lag > 30s
    DLQ_COUNT_THRESHOLD:      10,     // Alert if DLQ has > 10 items
} as const;

// ─── Metrics Registry ─────────────────────────────────────────────────────────
const ROLLING_WINDOW_SIZE = 1000; // Keep last 1000 samples per metric

class MetricsRegistry {
    private histograms = new Map<string, HistogramBucket>();
    private counters   = new Map<string, Counter>();
    private alerts     = new Map<string, { count: number; lastFired: number }>();

    // ── Histogram recording ────────────────────────────────────────────────────
    recordLatency(
        metric: MetricName,
        latencyMs: number,
        labels?: Record<string, string>
    ): void {
        const key = this.buildKey(metric, labels);
        let bucket = this.histograms.get(key);

        if (!bucket) {
            bucket = {
                count: 0, sum: 0,
                min: Infinity, max: -Infinity,
                p50: 0, p95: 0, p99: 0,
                samples: [],
            };
            this.histograms.set(key, bucket);
        }

        bucket.count++;
        bucket.sum += latencyMs;
        bucket.min = Math.min(bucket.min, latencyMs);
        bucket.max = Math.max(bucket.max, latencyMs);

        // Rolling window
        bucket.samples.push(latencyMs);
        if (bucket.samples.length > ROLLING_WINDOW_SIZE) {
            bucket.samples.shift();
        }

        // Recalculate percentiles
        const sorted = [...bucket.samples].sort((a, b) => a - b);
        const len = sorted.length;
        bucket.p50 = sorted[Math.floor(len * 0.50)] ?? 0;
        bucket.p95 = sorted[Math.floor(len * 0.95)] ?? 0;
        bucket.p99 = sorted[Math.floor(len * 0.99)] ?? 0;

        // Check alert thresholds
        this.checkLatencyAlert(metric, latencyMs, labels);
    }

    // ── Counter increment ──────────────────────────────────────────────────────
    increment(metric: MetricName, labels?: Record<string, string>): void {
        const key = this.buildKey(metric, labels);
        let counter = this.counters.get(key);

        if (!counter) {
            counter = { total: 0, perMinute: new Array(60).fill(0), lastReset: Date.now() };
            this.counters.set(key, counter);
        }

        counter.total++;

        // Current minute bucket
        const minuteIndex = Math.floor(Date.now() / 60000) % 60;
        counter.perMinute[minuteIndex] = (counter.perMinute[minuteIndex] ?? 0) + 1;

        // Check alert thresholds
        this.checkCounterAlert(metric, counter, labels);
    }

    // ── Alert checking ─────────────────────────────────────────────────────────
    private checkLatencyAlert(
        metric: MetricName,
        latencyMs: number,
        labels?: Record<string, string>
    ): void {
        let threshold: number | undefined;

        switch (metric) {
            case 'auth.latency':           threshold = AlertThresholds.AUTH_LATENCY_MS;  break;
            case 'db.query_latency':       threshold = AlertThresholds.DB_LATENCY_MS;    break;
            case 'rbac.resolution_latency': threshold = AlertThresholds.RBAC_LATENCY_MS; break;
            case 'redis.latency':          threshold = AlertThresholds.REDIS_LATENCY_MS; break;
        }

        if (threshold && latencyMs > threshold) {
            const alertKey = `latency:${metric}`;
            const now = Date.now();
            const lastAlert = this.alerts.get(alertKey);

            // Throttle alerts: max 1 per minute per metric
            if (!lastAlert || now - lastAlert.lastFired > 60000) {
                this.alerts.set(alertKey, { count: (lastAlert?.count ?? 0) + 1, lastFired: now });

                structuredLogger.alert('SLOW_OPERATION', `${metric} exceeded threshold`, {
                    meta: {
                        metric,
                        latencyMs,
                        threshold,
                        labels,
                    }
                });
            }
        }
    }

    private checkCounterAlert(
        metric: MetricName,
        counter: Counter,
        labels?: Record<string, string>
    ): void {
        const minuteIndex = Math.floor(Date.now() / 60000) % 60;
        const currentMinuteCount = counter.perMinute[minuteIndex] ?? 0;

        let threshold: number | undefined;
        let alertType: string | undefined;

        switch (metric) {
            case 'auth.login_failures':
                threshold = AlertThresholds.LOGIN_FAILURES_PER_MIN;
                alertType = 'LOGIN_FAILURE_SPIKE';
                break;
            case 'rbac.deny_count':
                threshold = AlertThresholds.RBAC_DENIES_PER_MIN;
                alertType = 'RBAC_DENY_SPIKE';
                break;
            case 'redis.disconnects':
                threshold = 3;
                alertType = 'REDIS_DISCONNECT';
                break;
        }

        if (threshold && alertType && currentMinuteCount >= threshold) {
            const alertKey = `counter:${metric}`;
            const now = Date.now();
            const lastAlert = this.alerts.get(alertKey);

            if (!lastAlert || now - lastAlert.lastFired > 60000) {
                this.alerts.set(alertKey, { count: (lastAlert?.count ?? 0) + 1, lastFired: now });

                structuredLogger.alert(alertType, `${metric} spike detected`, {
                    meta: {
                        metric,
                        currentMinuteCount,
                        threshold,
                        labels,
                    }
                });
            }
        }
    }

    // ── Snapshot ───────────────────────────────────────────────────────────────
    getSnapshot(): Record<string, any> {
        const snapshot: Record<string, any> = {
            histograms: {},
            counters: {},
            timestamp: new Date().toISOString(),
        };

        for (const [key, bucket] of this.histograms.entries()) {
            snapshot.histograms[key] = {
                count: bucket.count,
                avg: bucket.count > 0 ? Math.round(bucket.sum / bucket.count) : 0,
                min: bucket.min === Infinity ? 0 : bucket.min,
                max: bucket.max === -Infinity ? 0 : bucket.max,
                p50: bucket.p50,
                p95: bucket.p95,
                p99: bucket.p99,
            };
        }

        for (const [key, counter] of this.counters.entries()) {
            const minuteIndex = Math.floor(Date.now() / 60000) % 60;
            snapshot.counters[key] = {
                total: counter.total,
                lastMinute: counter.perMinute[minuteIndex],
            };
        }

        return snapshot;
    }

    // ── Helpers ────────────────────────────────────────────────────────────────
    private buildKey(metric: string, labels?: Record<string, string>): string {
        if (!labels || Object.keys(labels).length === 0) return metric;
        const labelStr = Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join(',');
        return `${metric}{${labelStr}}`;
    }
}

// ─── Singleton ────────────────────────────────────────────────────────────────
export const metrics = new MetricsRegistry();

// ─── Timing helper ────────────────────────────────────────────────────────────
/**
 * Wrap an async function and record its latency.
 *
 * Usage:
 *   const result = await withMetrics('db.query_latency', () => db.findAll(...));
 */
export async function withMetrics<T>(
    metric: MetricName,
    fn: () => Promise<T>,
    labels?: Record<string, string>
): Promise<T> {
    const start = Date.now();
    try {
        const result = await fn();
        metrics.recordLatency(metric, Date.now() - start, labels);
        return result;
    } catch (error) {
        metrics.recordLatency(metric, Date.now() - start, labels);
        throw error;
    }
}

// ─── DB slow query detector ───────────────────────────────────────────────────
/**
 * Wrap a DB query and log if it exceeds the slow query threshold.
 */
export async function withDbMetrics<T>(
    queryName: string,
    fn: () => Promise<T>,
    context?: { tenantId?: string }
): Promise<T> {
    const start = Date.now();
    try {
        const result = await fn();
        const latencyMs = Date.now() - start;

        metrics.recordLatency('db.query_latency', latencyMs, { query: queryName });

        if (latencyMs > AlertThresholds.SLOW_QUERY_THRESHOLD_MS) {
            metrics.increment('db.slow_queries', { query: queryName });
            structuredLogger.alert('SLOW_QUERY', `Slow DB query: ${queryName}`, {
                tenantId: context?.tenantId,
                meta: { queryName, latencyMs, threshold: AlertThresholds.SLOW_QUERY_THRESHOLD_MS }
            });
        }

        return result;
    } catch (error) {
        metrics.recordLatency('db.query_latency', Date.now() - start, { query: queryName });
        throw error;
    }
}
