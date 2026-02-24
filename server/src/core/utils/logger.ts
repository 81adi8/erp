export enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3,
}

// LOG-01/02 FIX: Import request context to include tenant/user info in all logs
let requestContext: typeof import('../context/requestContext') | null = null;
try {
    requestContext = require('../context/requestContext');
} catch {
    // Context may not be available at startup
}

class Logger {
    private logLevel: LogLevel;

    constructor() {
        // Use process.env directly to avoid circular dependency with config/env
        this.logLevel = this.getLogLevelFromEnv(process.env.NODE_ENV);
    }

    private getLogLevelFromEnv(env: string | undefined): LogLevel {
        switch (env?.toLowerCase()) {
            case 'development':
                return LogLevel.DEBUG;
            case 'test':
                return LogLevel.WARN;
            case 'production':
                return LogLevel.INFO;
            default:
                return LogLevel.INFO;
        }
    }

    private getContextFields(): Record<string, string> {
        const fields: Record<string, string> = {};
        if (requestContext) {
            try {
                const ctx = requestContext.getContext();
                if (ctx) {
                    if (ctx.tenant?.id) fields.tenant_id = ctx.tenant.id;
                    if (ctx.actor?.userId) fields.user_id = ctx.actor.userId;
                    if (ctx.requestId) fields.request_id = ctx.requestId;
                }
            } catch {
                // Context not available
            }
        }
        return fields;
    }

    private formatMessage(level: string, message: string, ...args: any[]): string {
        const timestamp = new Date().toISOString();
        const pid = process.pid;
        const contextFields = this.getContextFields();
        const baseLog = {
            timestamp,
            level,
            pid,
            message,
            ...contextFields,
        };
        // If there are additional args, add them
        if (args.length > 0) {
            return JSON.stringify({ ...baseLog, args });
        }
        return JSON.stringify(baseLog);
    }

    private writeStdout(line: string): void {
        process.stdout.write(`${line}\n`);
    }

    private writeStderr(line: string): void {
        process.stderr.write(`${line}\n`);
    }

    error(message: string, ...args: any[]): void {
        if (this.logLevel >= LogLevel.ERROR) {
            this.writeStderr(this.formatMessage('ERROR', message, ...args));
        }
    }

    warn(message: string, ...args: any[]): void {
        if (this.logLevel >= LogLevel.WARN) {
            this.writeStderr(this.formatMessage('WARN', message, ...args));
        }
    }

    info(message: string, ...args: any[]): void {
        if (this.logLevel >= LogLevel.INFO) {
            this.writeStdout(this.formatMessage('INFO', message, ...args));
        }
    }

    debug(message: string, ...args: any[]): void {
        if (this.logLevel >= LogLevel.DEBUG) {
            this.writeStdout(this.formatMessage('DEBUG', message, ...args));
        }
    }
}

export const logger = new Logger();
