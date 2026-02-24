/**
 * TASK-03: CORE MODULE TELEMETRY
 * 
 * Metrics collection for operational health monitoring.
 * Tracks key performance indicators for:
 * - Auth health
 * - Onboarding load
 * - Concurrency issues
 * - Permission drift
 */

import { sequelize } from '../../database/sequelize';
import { QueryTypes } from 'sequelize';
import { connectRedis } from '../../config/redis';
import { logger } from '../utils/logger';

// ============================================================================
// INTERFACES
// ============================================================================

interface MetricPoint {
    timestamp: Date;
    value: number;
    labels?: Record<string, string>;
}

interface MetricAggregate {
    name: string;
    p50: number;
    p95: number;
    p99: number;
    count: number;
    sum: number;
}

interface CoreModuleMetrics {
    auth_login_latency: MetricAggregate;
    auth_refresh_latency: MetricAggregate;
    auth_failed_logins: number;
    student_write_rate: number;
    student_bulk_latency: MetricAggregate;
    attendance_write_conflicts: number;
    attendance_bulk_latency: MetricAggregate;
    exam_creation_latency: MetricAggregate;
    rbac_denied_rate: number;
    db_query_latency: MetricAggregate;
    db_connection_count: number;
}

// ============================================================================
// TELEMETRY SERVICE
// ============================================================================

class CoreModuleTelemetryService {
    private redis: any = null;
    private metricsPrefix = 'erp:telemetry:';
    private enabled = true;
    private initialized = false;

    constructor() {
        this.initializeRedis();
    }

    private async initializeRedis(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;
        
        try {
            // Use the existing Redis connection from config
            const { client } = await connectRedis();
            this.redis = client;
            
            if (!this.redis) {
                logger.warn('[Telemetry] Redis not available, metrics will be no-op');
                this.enabled = false;
            }
        } catch (error) {
            logger.warn('[Telemetry] Redis initialization failed', error);
            this.redis = null;
            this.enabled = false;
        }
    }

    // ========================================================================
    // AUTH METRICS
    // ========================================================================

    /**
     * Record login latency
     * Target: p95 < 250ms
     */
    async recordLoginLatency(latencyMs: number, success: boolean, tenantId?: string): Promise<void> {
        const metric = success ? 'auth_login_latency' : 'auth_login_failed_latency';
        await this.recordMetric(metric, latencyMs, {
            tenant: tenantId || 'unknown',
            success: success.toString()
        });

        if (!success) {
            await this.incrementCounter('auth_failed_logins', tenantId);
        }
    }

    /**
     * Record refresh token latency
     * Target: p95 < 120ms
     */
    async recordRefreshLatency(latencyMs: number, tenantId?: string): Promise<void> {
        await this.recordMetric('auth_refresh_latency', latencyMs, {
            tenant: tenantId || 'unknown'
        });
    }

    /**
     * Record session revocation
     */
    async recordSessionRevocation(reason: string, tenantId?: string): Promise<void> {
        await this.incrementCounter('auth_session_revocations', tenantId, { reason });
    }

    // ========================================================================
    // STUDENT MODULE METRICS
    // ========================================================================

    /**
     * Record student write operation
     */
    async recordStudentWrite(operation: 'create' | 'update' | 'bulk', latencyMs: number, tenantId?: string): Promise<void> {
        await this.recordMetric('student_write_latency', latencyMs, {
            tenant: tenantId || 'unknown',
            operation
        });

        await this.incrementCounter('student_write_count', tenantId, { operation });
    }

    /**
     * Record bulk import performance
     * Target: 500 students < 8s
     */
    async recordBulkImport(studentCount: number, latencyMs: number, tenantId?: string): Promise<void> {
        await this.recordMetric('student_bulk_import', latencyMs, {
            tenant: tenantId || 'unknown',
            count: studentCount.toString()
        });

        // Check if within target
        const targetMs = studentCount * 16; // 16ms per student target
        if (latencyMs > targetMs) {
            await this.recordMetric('student_bulk_import_slow', latencyMs - targetMs, {
                tenant: tenantId || 'unknown'
            });
        }
    }

    // ========================================================================
    // ATTENDANCE MODULE METRICS
    // ========================================================================

    /**
     * Record attendance write operation
     */
    async recordAttendanceWrite(latencyMs: number, tenantId?: string): Promise<void> {
        await this.recordMetric('attendance_write_latency', latencyMs, {
            tenant: tenantId || 'unknown'
        });
    }

    /**
     * Record attendance write conflict (deadlock/lock wait)
     */
    async recordAttendanceConflict(conflictType: string, tenantId?: string): Promise<void> {
        await this.incrementCounter('attendance_write_conflicts', tenantId, { type: conflictType });
    }

    /**
     * Record bulk attendance marking
     * Target: 50 teachers simultaneously without deadlocks
     */
    async recordBulkAttendance(studentCount: number, latencyMs: number, tenantId?: string): Promise<void> {
        await this.recordMetric('attendance_bulk_mark', latencyMs, {
            tenant: tenantId || 'unknown',
            count: studentCount.toString()
        });
    }

    // ========================================================================
    // EXAMS MODULE METRICS
    // ========================================================================

    /**
     * Record exam creation latency
     */
    async recordExamCreation(latencyMs: number, tenantId?: string): Promise<void> {
        await this.recordMetric('exam_creation_latency', latencyMs, {
            tenant: tenantId || 'unknown'
        });
    }

    /**
     * Record exam marks entry
     */
    async recordMarksEntry(studentCount: number, latencyMs: number, tenantId?: string): Promise<void> {
        await this.recordMetric('exam_marks_entry', latencyMs, {
            tenant: tenantId || 'unknown',
            count: studentCount.toString()
        });
    }

    // ========================================================================
    // RBAC METRICS
    // ========================================================================

    /**
     * Record RBAC permission denial
     * High rate indicates permission drift
     */
    async recordRBACDenied(permission: string, role: string, tenantId?: string): Promise<void> {
        await this.incrementCounter('rbac_denied_count', tenantId, { permission, role });
    }

    /**
     * Record RBAC resolution latency
     */
    async recordRBACResolution(latencyMs: number, tenantId?: string): Promise<void> {
        await this.recordMetric('rbac_resolution_latency', latencyMs, {
            tenant: tenantId || 'unknown'
        });
    }

    // ========================================================================
    // DATABASE METRICS
    // ========================================================================

    /**
     * Record database query latency
     */
    async recordDBQuery(queryType: string, latencyMs: number, tenantId?: string): Promise<void> {
        await this.recordMetric('db_query_latency', latencyMs, {
            tenant: tenantId || 'unknown',
            type: queryType
        });
    }

    /**
     * Get current database connection count
     */
    async getDBConnectionCount(): Promise<number> {
        try {
            const result = await sequelize.query(`
                SELECT count(*) as count 
                FROM pg_stat_activity 
                WHERE datname = current_database()
            `, { type: QueryTypes.SELECT });
            
            return (result[0] as any)?.count || 0;
        } catch {
            return 0;
        }
    }

    // ========================================================================
    // AGGREGATION METHODS
    // ========================================================================

    /**
     * Get aggregated metrics for a time window
     */
    async getAggregatedMetrics(windowMinutes: number = 5): Promise<CoreModuleMetrics> {
        const windowStart = Date.now() - (windowMinutes * 60 * 1000);

        const [
            auth_login_latency,
            auth_refresh_latency,
            auth_failed_logins,
            student_write_rate,
            student_bulk_latency,
            attendance_write_conflicts,
            attendance_bulk_latency,
            exam_creation_latency,
            rbac_denied_rate,
            db_query_latency,
            db_connection_count
        ] = await Promise.all([
            this.getMetricAggregate('auth_login_latency', windowStart),
            this.getMetricAggregate('auth_refresh_latency', windowStart),
            this.getCounterValue('auth_failed_logins', windowStart),
            this.getCounterRate('student_write_count', windowStart),
            this.getMetricAggregate('student_bulk_import', windowStart),
            this.getCounterValue('attendance_write_conflicts', windowStart),
            this.getMetricAggregate('attendance_bulk_mark', windowStart),
            this.getMetricAggregate('exam_creation_latency', windowStart),
            this.getCounterRate('rbac_denied_count', windowStart),
            this.getMetricAggregate('db_query_latency', windowStart),
            this.getDBConnectionCount()
        ]);

        return {
            auth_login_latency,
            auth_refresh_latency,
            auth_failed_logins,
            student_write_rate,
            student_bulk_latency,
            attendance_write_conflicts,
            attendance_bulk_latency,
            exam_creation_latency,
            rbac_denied_rate,
            db_query_latency,
            db_connection_count
        };
    }

    /**
     * Check if performance targets are met
     */
    async checkPerformanceTargets(): Promise<{
        target: string;
        actual: number;
        threshold: number;
        status: 'PASS' | 'WARN' | 'FAIL';
    }[]> {
        const metrics = await this.getAggregatedMetrics(5);

        return [
            {
                target: 'Login p95 latency < 250ms',
                actual: metrics.auth_login_latency.p95,
                threshold: 250,
                status: metrics.auth_login_latency.p95 < 250 ? 'PASS' : 
                        metrics.auth_login_latency.p95 < 500 ? 'WARN' : 'FAIL'
            },
            {
                target: 'Refresh p95 latency < 120ms',
                actual: metrics.auth_refresh_latency.p95,
                threshold: 120,
                status: metrics.auth_refresh_latency.p95 < 120 ? 'PASS' : 
                        metrics.auth_refresh_latency.p95 < 200 ? 'WARN' : 'FAIL'
            },
            {
                target: 'Student list fetch < 300ms',
                actual: metrics.db_query_latency.p95,
                threshold: 300,
                status: metrics.db_query_latency.p95 < 300 ? 'PASS' : 
                        metrics.db_query_latency.p95 < 500 ? 'WARN' : 'FAIL'
            },
            {
                target: 'Attendance fetch < 200ms',
                actual: metrics.db_query_latency.p95,
                threshold: 200,
                status: metrics.db_query_latency.p95 < 200 ? 'PASS' : 
                        metrics.db_query_latency.p95 < 400 ? 'WARN' : 'FAIL'
            },
            {
                target: 'Attendance conflicts = 0',
                actual: metrics.attendance_write_conflicts,
                threshold: 0,
                status: metrics.attendance_write_conflicts === 0 ? 'PASS' : 'FAIL'
            },
            {
                target: 'RBAC denied rate < 5/min',
                actual: metrics.rbac_denied_rate,
                threshold: 5,
                status: metrics.rbac_denied_rate < 5 ? 'PASS' : 
                        metrics.rbac_denied_rate < 10 ? 'WARN' : 'FAIL'
            }
        ];
    }

    // ========================================================================
    // INTERNAL METHODS
    // ========================================================================

    private async recordMetric(name: string, value: number, labels?: Record<string, string>): Promise<void> {
        if (!this.enabled) return;

        const key = `${this.metricsPrefix}${name}`;
        const timestamp = Date.now();
        const labelStr = labels ? JSON.stringify(labels) : '';

        if (this.redis) {
            try {
                const pipeline = this.redis.pipeline();
                
                // Store in time-series format
                pipeline.zadd(`${key}:values`, timestamp, `${value}:${labelStr}`);
                pipeline.expire(`${key}:values`, 3600); // 1 hour TTL
                
                await pipeline.exec();
            } catch (error) {
                logger.warn('[Telemetry] Failed to record metric', error);
            }
        }
    }

    private async incrementCounter(name: string, tenantId?: string, labels?: Record<string, string>): Promise<void> {
        if (!this.enabled) return;

        const key = `${this.metricsPrefix}${name}`;
        const minute = Math.floor(Date.now() / 60000);
        const labelStr = labels ? `:${JSON.stringify(labels)}` : '';
        const tenantStr = tenantId ? `:${tenantId}` : '';

        if (this.redis) {
            try {
                await this.redis.incr(`${key}${tenantStr}${labelStr}:${minute}`);
                await this.redis.expire(`${key}${tenantStr}${labelStr}:${minute}`, 3600);
            } catch (error) {
                logger.warn('[Telemetry] Failed to increment counter', error);
            }
        }
    }

    private async getMetricAggregate(name: string, since: number): Promise<MetricAggregate> {
        const key = `${this.metricsPrefix}${name}:values`;
        
        if (this.redis) {
            try {
                const values = await this.redis.zrangebyscore(key, since, '+inf');
                
                if (values.length === 0) {
                    return { name, p50: 0, p95: 0, p99: 0, count: 0, sum: 0 };
                }

                const parsed = values.map((v: string) => {
                    const parts = v.split(':');
                    const numStr = parts[0] ?? '0';
                    return parseFloat(numStr);
                }).sort((a: number, b: number) => a - b);
                const count = parsed.length;
                const sum = parsed.reduce((a: number, b: number) => a + b, 0);

                return {
                    name,
                    p50: this.percentile(parsed, 50),
                    p95: this.percentile(parsed, 95),
                    p99: this.percentile(parsed, 99),
                    count,
                    sum
                };
            } catch (error) {
                logger.warn('[Telemetry] Failed to get metric aggregate', error);
            }
        }

        return { name, p50: 0, p95: 0, p99: 0, count: 0, sum: 0 };
    }

    private async getCounterValue(name: string, since: number): Promise<number> {
        const key = `${this.metricsPrefix}${name}`;
        const sinceMinute = Math.floor(since / 60000);
        const nowMinute = Math.floor(Date.now() / 60000);
        
        if (this.redis) {
            try {
                const keys = [];
                for (let m = sinceMinute; m <= nowMinute; m++) {
                    keys.push(`${key}:${m}`);
                }
                
                if (keys.length === 0) return 0;
                
                const values = await this.redis.mget(...keys);
                return values.reduce((sum: number, v: string | null) => sum + (parseInt(v || '0', 10)), 0);
            } catch (error) {
                logger.warn('[Telemetry] Failed to get counter value', error);
            }
        }

        return 0;
    }

    private async getCounterRate(name: string, since: number): Promise<number> {
        const value = await this.getCounterValue(name, since);
        const minutes = (Date.now() - since) / 60000;
        return minutes > 0 ? value / minutes : 0;
    }

    private percentile(sorted: number[], p: number): number {
        if (sorted.length === 0) return 0;
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        const safeIndex = Math.max(0, Math.min(index, sorted.length - 1));
        return sorted[safeIndex] ?? 0;
    }
}

// ============================================================================
// EXPORT
// ============================================================================

export const CoreModuleTelemetry = new CoreModuleTelemetryService();
export { CoreModuleMetrics, MetricAggregate };
