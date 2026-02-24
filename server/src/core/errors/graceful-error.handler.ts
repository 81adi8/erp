/**
 * TASK-03: ERROR HARDENING
 * 
 * Graceful error handling for system failures.
 * Ensures no crashes on:
 * - DB timeout
 * - Redis failure
 * - Keycloak timeout
 * - Queue failure
 * 
 * Returns controlled errors only.
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../http/ApiError';
import { HttpStatus } from '../http/HttpStatus';
import { logger } from '../utils/logger';

// ============================================================================
// ERROR TYPES
// ============================================================================

export enum ErrorType {
    DATABASE_TIMEOUT = 'DATABASE_TIMEOUT',
    DATABASE_CONNECTION = 'DATABASE_CONNECTION',
    REDIS_FAILURE = 'REDIS_FAILURE',
    KEYCLOAK_TIMEOUT = 'KEYCLOAK_TIMEOUT',
    KEYCLOAK_UNAVAILABLE = 'KEYCLOAK_UNAVAILABLE',
    QUEUE_FAILURE = 'QUEUE_FAILURE',
    TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
    TENANT_SUSPENDED = 'TENANT_SUSPENDED',
    PERMISSION_DENIED = 'PERMISSION_DENIED',
    SESSION_EXPIRED = 'SESSION_EXPIRED',
    RATE_LIMITED = 'RATE_LIMITED',
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
}

interface GracefulError {
    type: ErrorType;
    message: string;
    userMessage: string;
    retryable: boolean;
    retryAfter?: number;
    details?: Record<string, unknown>;
}

// ============================================================================
// ERROR FACTORY
// ============================================================================

export class GracefulErrorFactory {
    static databaseTimeout(query: string, timeoutMs: number): GracefulError {
        return {
            type: ErrorType.DATABASE_TIMEOUT,
            message: `Database query timeout after ${timeoutMs}ms`,
            userMessage: 'The request took too long. Please try again.',
            retryable: true,
            retryAfter: 5,
            details: { query: query.substring(0, 100), timeoutMs }
        };
    }

    static databaseConnection(originalError: Error): GracefulError {
        return {
            type: ErrorType.DATABASE_CONNECTION,
            message: 'Database connection failed',
            userMessage: 'Service temporarily unavailable. Please try again later.',
            retryable: true,
            retryAfter: 10,
            details: { error: originalError.message }
        };
    }

    static redisFailure(operation: string): GracefulError {
        return {
            type: ErrorType.REDIS_FAILURE,
            message: `Redis operation failed: ${operation}`,
            userMessage: 'Session may be affected. Please re-login if issues persist.',
            retryable: true,
            retryAfter: 2,
            details: { operation }
        };
    }

    static keycloakTimeout(operation: string): GracefulError {
        return {
            type: ErrorType.KEYCLOAK_TIMEOUT,
            message: `Keycloak timeout during: ${operation}`,
            userMessage: 'Authentication service is slow. Please try again.',
            retryable: true,
            retryAfter: 5,
            details: { operation }
        };
    }

    static keycloakUnavailable(): GracefulError {
        return {
            type: ErrorType.KEYCLOAK_UNAVAILABLE,
            message: 'Keycloak service unavailable',
            userMessage: 'Authentication service is temporarily unavailable.',
            retryable: true,
            retryAfter: 30,
        };
    }

    static queueFailure(queueName: string): GracefulError {
        return {
            type: ErrorType.QUEUE_FAILURE,
            message: `Queue operation failed: ${queueName}`,
            userMessage: 'Your request has been queued and will be processed shortly.',
            retryable: true,
            retryAfter: 60,
            details: { queueName }
        };
    }

    static tenantNotFound(tenantId: string): GracefulError {
        return {
            type: ErrorType.TENANT_NOT_FOUND,
            message: `Tenant not found: ${tenantId}`,
            userMessage: 'Organization not found. Please check your URL.',
            retryable: false,
        };
    }

    static tenantSuspended(tenantId: string): GracefulError {
        return {
            type: ErrorType.TENANT_SUSPENDED,
            message: `Tenant suspended: ${tenantId}`,
            userMessage: 'This organization has been suspended. Contact support.',
            retryable: false,
        };
    }

    static permissionDenied(permission: string): GracefulError {
        return {
            type: ErrorType.PERMISSION_DENIED,
            message: `Permission denied: ${permission}`,
            userMessage: 'You do not have permission to perform this action.',
            retryable: false,
            details: { permission }
        };
    }

    static sessionExpired(): GracefulError {
        return {
            type: ErrorType.SESSION_EXPIRED,
            message: 'Session has expired',
            userMessage: 'Your session has expired. Please login again.',
            retryable: false,
        };
    }

    static rateLimited(retryAfter: number): GracefulError {
        return {
            type: ErrorType.RATE_LIMITED,
            message: 'Rate limit exceeded',
            userMessage: 'Too many requests. Please wait before trying again.',
            retryable: true,
            retryAfter,
        };
    }

    static validationError(errors: Record<string, string[]>): GracefulError {
        return {
            type: ErrorType.VALIDATION_ERROR,
            message: 'Validation failed',
            userMessage: 'Please check your input and try again.',
            retryable: false,
            details: { errors }
        };
    }

    static internalError(context: string): GracefulError {
        return {
            type: ErrorType.INTERNAL_ERROR,
            message: `Internal error in: ${context}`,
            userMessage: 'An unexpected error occurred. Please try again.',
            retryable: true,
            retryAfter: 5,
        };
    }
}

// ============================================================================
// ERROR HANDLER MIDDLEWARE
// ============================================================================

export function gracefulErrorHandler(
    err: Error | ApiError | GracefulError,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Log error for debugging
    const errorStack = err instanceof Error ? err.stack?.split('\n').slice(0, 3) : undefined;
    logger.error('[ErrorHandler]', {
        error: err.message || 'Unknown error',
        stack: errorStack,
        path: req.path,
        method: req.method,
        tenant: (req as any).tenant?.slug,
        user: (req as any).user?.userId,
    });

    // Handle GracefulError
    if (isGracefulError(err)) {
        const status = getHttpStatusForError(err.type);
        res.status(status).json({
            success: false,
            error: {
                type: err.type,
                message: err.userMessage,
                retryable: err.retryable,
                ...(err.retryAfter && { retryAfter: err.retryAfter }),
            }
        });
        return;
    }

    // Handle ApiError
    if (err instanceof ApiError) {
        res.status(Number(err.status)).json({
            success: false,
            error: {
                type: ErrorType.INTERNAL_ERROR,
                message: err.message,
                retryable: false,
            }
        });
        return;
    }

    // Handle database errors
    if (isDatabaseError(err)) {
        const errMsg = err.message || '';
        const gracefulErr = errMsg.includes('timeout')
            ? GracefulErrorFactory.databaseTimeout('query', 30000)
            : GracefulErrorFactory.databaseConnection(err);
        
        res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
            success: false,
            error: {
                type: gracefulErr.type,
                message: gracefulErr.userMessage,
                retryable: gracefulErr.retryable,
                retryAfter: gracefulErr.retryAfter,
            }
        });
        return;
    }

    // Handle JWT errors
    if (isJWTError(err)) {
        const gracefulErr = err.message.includes('expired')
            ? GracefulErrorFactory.sessionExpired()
            : GracefulErrorFactory.permissionDenied('invalid_token');
        
        res.status(HttpStatus.UNAUTHORIZED).json({
            success: false,
            error: {
                type: gracefulErr.type,
                message: gracefulErr.userMessage,
                retryable: gracefulErr.retryable,
            }
        });
        return;
    }

    // Handle unknown errors
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
            type: ErrorType.INTERNAL_ERROR,
            message: 'An unexpected error occurred',
            retryable: true,
            retryAfter: 5,
        }
    });
}

// ============================================================================
// ASYNC ERROR WRAPPER
// ============================================================================

/**
 * Wraps async route handlers to catch errors and pass to error handler
 */
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Wraps async route handlers with timeout
 */
export function asyncHandlerWithTimeout(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
    timeoutMs: number = 30000
) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
            });

            await Promise.race([
                fn(req, res, next),
                timeoutPromise
            ]);
        } catch (error) {
            next(error);
        }
    };
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

interface CircuitBreakerState {
    failures: number;
    lastFailure: number;
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

export class CircuitBreaker {
    private name: string;
    private failureThreshold: number;
    private recoveryTimeout: number;

    constructor(name: string, failureThreshold: number = 5, recoveryTimeout: number = 30000) {
        this.name = name;
        this.failureThreshold = failureThreshold;
        this.recoveryTimeout = recoveryTimeout;
    }

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        const state = this.getState();

        if (state.state === 'OPEN') {
            if (Date.now() - state.lastFailure > this.recoveryTimeout) {
                this.setState({ ...state, state: 'HALF_OPEN' });
            } else {
                throw new Error(`Circuit breaker [${this.name}] is OPEN`);
            }
        }

        try {
            const result = await fn();
            if (state.state === 'HALF_OPEN') {
                this.reset();
            }
            return result;
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }

    private getState(): CircuitBreakerState {
        if (!circuitBreakers.has(this.name)) {
            circuitBreakers.set(this.name, {
                failures: 0,
                lastFailure: 0,
                state: 'CLOSED'
            });
        }
        return circuitBreakers.get(this.name)!;
    }

    private setState(state: CircuitBreakerState): void {
        circuitBreakers.set(this.name, state);
    }

    private recordFailure(): void {
        const state = this.getState();
        state.failures++;
        state.lastFailure = Date.now();

        if (state.failures >= this.failureThreshold) {
            state.state = 'OPEN';
            logger.warn(`[CircuitBreaker] ${this.name} opened after ${state.failures} failures`);
        }

        this.setState(state);
    }

    private reset(): void {
        circuitBreakers.set(this.name, {
            failures: 0,
            lastFailure: 0,
            state: 'CLOSED'
        });
        logger.info(`[CircuitBreaker] ${this.name} reset to CLOSED`);
    }
}

// Pre-configured circuit breakers for critical services
export const dbCircuitBreaker = new CircuitBreaker('database', 5, 30000);
export const redisCircuitBreaker = new CircuitBreaker('redis', 10, 15000);
export const keycloakCircuitBreaker = new CircuitBreaker('keycloak', 3, 60000);

// ============================================================================
// HELPERS
// ============================================================================

function isGracefulError(err: any): err is GracefulError {
    return err && typeof err.type === 'string' && Object.values(ErrorType).includes(err.type);
}

function isDatabaseError(err: any): boolean {
    return err && (
        err.name === 'SequelizeDatabaseError' ||
        err.name === 'SequelizeConnectionError' ||
        err.name === 'SequelizeConnectionRefusedError' ||
        err.name === 'SequelizeConnectionTimedOutError' ||
        err.message?.includes('database') ||
        err.message?.includes('connection')
    );
}

function isJWTError(err: any): boolean {
    return err && (
        err.name === 'JsonWebTokenError' ||
        err.name === 'TokenExpiredError' ||
        err.name === 'NotBeforeError'
    );
}

function getHttpStatusForError(type: ErrorType): number {
    switch (type) {
        case ErrorType.DATABASE_TIMEOUT:
        case ErrorType.DATABASE_CONNECTION:
        case ErrorType.REDIS_FAILURE:
        case ErrorType.KEYCLOAK_TIMEOUT:
        case ErrorType.KEYCLOAK_UNAVAILABLE:
        case ErrorType.QUEUE_FAILURE:
            return HttpStatus.SERVICE_UNAVAILABLE;
        
        case ErrorType.TENANT_NOT_FOUND:
            return HttpStatus.NOT_FOUND;
        
        case ErrorType.TENANT_SUSPENDED:
        case ErrorType.PERMISSION_DENIED:
            return HttpStatus.FORBIDDEN;
        
        case ErrorType.SESSION_EXPIRED:
            return HttpStatus.UNAUTHORIZED;
        
        case ErrorType.RATE_LIMITED:
            return HttpStatus.TOO_MANY_REQUESTS;
        
        case ErrorType.VALIDATION_ERROR:
            return HttpStatus.BAD_REQUEST;
        
        default:
            return HttpStatus.INTERNAL_SERVER_ERROR;
    }
}

// ============================================================================
// EXPORT
// ============================================================================

export { GracefulError };