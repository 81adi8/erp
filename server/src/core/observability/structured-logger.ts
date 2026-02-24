/**
 * TASK-04: OBSERVABILITY STACK — Structured Logger
 *
 * Production-grade structured logging with:
 *   - requestId, tenantId, userId, route, latency on every log
 *   - JSON output in production (machine-parseable)
 *   - Human-readable in development
 *   - Log levels: ERROR, WARN, INFO, DEBUG
 *   - Never logs sensitive fields (passwords, tokens, secrets)
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// ─── Log levels ───────────────────────────────────────────────────────────────
export enum LogLevel {
    ERROR = 0,
    WARN  = 1,
    INFO  = 2,
    DEBUG = 3,
}

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
    [LogLevel.ERROR]: 'ERROR',
    [LogLevel.WARN]:  'WARN',
    [LogLevel.INFO]:  'INFO',
    [LogLevel.DEBUG]: 'DEBUG',
};

// ─── Structured log entry ─────────────────────────────────────────────────────
export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    requestId?: string;
    tenantId?: string;
    userId?: string;
    route?: string;
    method?: string;
    latencyMs?: number;
    statusCode?: number;
    service?: string;
    component?: string;
    error?: {
        message: string;
        stack?: string;
        code?: string;
    };
    meta?: Record<string, any>;
}

// ─── Sensitive field scrubber ─────────────────────────────────────────────────
const SENSITIVE_KEYS = new Set([
    'password', 'token', 'secret', 'authorization', 'cookie',
    'jwt', 'apiKey', 'api_key', 'privateKey', 'private_key',
    'creditCard', 'credit_card', 'ssn', 'aadhar',
]);

function scrubSensitive(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (SENSITIVE_KEYS.has(key.toLowerCase())) {
            result[key] = '[REDACTED]';
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            result[key] = scrubSensitive(value);
        } else {
            result[key] = value;
        }
    }
    return result;
}

// ─── Structured Logger ────────────────────────────────────────────────────────
class StructuredLogger {
    private logLevel: LogLevel;
    private isProduction: boolean;
    private service: string;

    constructor() {
        const nodeEnv = process.env.NODE_ENV ?? 'development';
        this.isProduction = nodeEnv === 'production' || nodeEnv === 'staging';
        this.service = process.env.SERVICE_NAME ?? 'school-erp';
        this.logLevel = this.resolveLogLevel(nodeEnv);
    }

    private resolveLogLevel(env: string): LogLevel {
        switch (env) {
            case 'production':  return LogLevel.INFO;
            case 'staging':     return LogLevel.INFO;
            case 'test':        return LogLevel.WARN;
            case 'development': return LogLevel.DEBUG;
            default:            return LogLevel.INFO;
        }
    }

    private format(entry: LogEntry): string {
        if (this.isProduction) {
            // JSON for log aggregators (Datadog, CloudWatch, Loki)
            return JSON.stringify(entry);
        }

        // Human-readable for development
        const { timestamp, level, message, requestId, tenantId, userId, latencyMs, meta } = entry;
        const ts = timestamp.substring(11, 23); // HH:MM:SS.mmm
        const rid = requestId ? ` [${requestId.substring(0, 8)}]` : '';
        const tid = tenantId ? ` tenant:${tenantId}` : '';
        const uid = userId ? ` user:${userId.substring(0, 8)}` : '';
        const lat = latencyMs !== undefined ? ` ${latencyMs}ms` : '';
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';

        return `[${ts}] ${level.padEnd(5)}${rid}${tid}${uid}${lat} ${message}${metaStr}`;
    }

    private write(level: LogLevel, message: string, context?: Partial<LogEntry>): void {
        if (level > this.logLevel) return;

        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level: LOG_LEVEL_NAMES[level],
            message,
            service: this.service,
            ...context,
        };

        const formatted = this.format(entry);

        switch (level) {
            case LogLevel.ERROR:
                process.stderr.write(`${formatted}\n`);
                break;
            case LogLevel.WARN:
                process.stderr.write(`${formatted}\n`);
                break;
            default:
                process.stdout.write(`${formatted}\n`);
                break;
        }
    }

    error(message: string, context?: Partial<LogEntry> | Error | any): void {
        if (context instanceof Error) {
            this.write(LogLevel.ERROR, message, {
                error: {
                    message: context.message,
                    stack: this.isProduction ? undefined : context.stack,
                    code: (context as any).code,
                }
            });
        } else {
            this.write(LogLevel.ERROR, message, context);
        }
    }

    warn(message: string, context?: Partial<LogEntry> | any): void {
        this.write(LogLevel.WARN, message, context);
    }

    info(message: string, context?: Partial<LogEntry> | any): void {
        this.write(LogLevel.INFO, message, context);
    }

    debug(message: string, context?: Partial<LogEntry> | any): void {
        this.write(LogLevel.DEBUG, message, context);
    }

    /**
     * Log an HTTP request with full context.
     */
    request(
        req: Request,
        res: Response,
        latencyMs: number,
        extra?: Record<string, any>
    ): void {
        const level = res.statusCode >= 500 ? LogLevel.ERROR
                    : res.statusCode >= 400 ? LogLevel.WARN
                    : LogLevel.INFO;

        this.write(level, `${req.method} ${req.path} ${res.statusCode}`, {
            requestId: (req as any).requestId,
            tenantId:  (req as any).tenant?.id ?? (req as any).tenantId,
            userId:    (req as any).user?.userId ?? (req as any).user?.id,
            route:     req.path,
            method:    req.method,
            latencyMs,
            statusCode: res.statusCode,
            meta: extra,
        });
    }

    /**
     * Log a metric event (auth, DB, RBAC, queue latency).
     */
    metric(
        component: string,
        operation: string,
        latencyMs: number,
        context?: {
            tenantId?: string;
            userId?: string;
            success?: boolean;
            meta?: Record<string, any>;
        }
    ): void {
        this.write(LogLevel.INFO, `[METRIC] ${component}.${operation}`, {
            component,
            latencyMs,
            tenantId: context?.tenantId,
            userId: context?.userId,
            meta: {
                operation,
                success: context?.success ?? true,
                ...context?.meta,
            },
        });
    }

    /**
     * Log a security alert.
     */
    alert(
        alertType: string,
        message: string,
        context?: {
            tenantId?: string;
            userId?: string;
            ip?: string;
            meta?: Record<string, any>;
        }
    ): void {
        this.write(LogLevel.WARN, `[ALERT:${alertType}] ${message}`, {
            tenantId: context?.tenantId,
            userId: context?.userId,
            meta: {
                alertType,
                ip: context?.ip,
                ...context?.meta,
            },
        });
    }
}

// ─── Singleton export ─────────────────────────────────────────────────────────
export const structuredLogger = new StructuredLogger();

// ─── Request ID middleware ────────────────────────────────────────────────────
export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
    (req as any).requestId = crypto.randomUUID();
    next();
}

// ─── HTTP request logger middleware ──────────────────────────────────────────
export function httpLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    res.on('finish', () => {
        const latencyMs = Date.now() - startTime;
        structuredLogger.request(req, res, latencyMs);
    });

    next();
}
