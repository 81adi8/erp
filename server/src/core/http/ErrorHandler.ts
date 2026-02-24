import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ApiError } from './ApiError';
import { env } from '../../config/env';
import { logger } from '../utils/logger';

/**
 * Custom error types for better error handling
 */
export interface AppError extends Error {
    statusCode?: number;
    status?: string;
    isOperational?: boolean;
    code?: string;
    errors?: unknown[];
}

interface ErrorResponseShape {
    success: false;
    message: string;
    data: null;
    errors?: string[];
    meta?: Record<string, unknown>;
}

const normalizeErrors = (errors: unknown): string[] | undefined => {
    if (!errors) return undefined;

    if (Array.isArray(errors)) {
        return errors.map((entry) => {
            if (typeof entry === 'string') return entry;
            if (entry && typeof entry === 'object' && 'message' in entry) {
                const message = (entry as { message?: unknown }).message;
                return typeof message === 'string' ? message : JSON.stringify(entry);
            }
            return String(entry);
        });
    }

    return [String(errors)];
};

const buildErrorResponse = (
    message: string,
    errors?: unknown,
    meta?: Record<string, unknown>
): ErrorResponseShape => {
    const normalizedErrors = normalizeErrors(errors);
    return {
        success: false,
        message,
        data: null,
        ...(normalizedErrors ? { errors: normalizedErrors } : {}),
        ...(meta ? { meta } : {}),
    };
};

/**
 * Handle different types of errors
 */
const handleCastError = (err: any): ApiError => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new ApiError(400, message);
};

const handleDuplicateFieldsError = (err: any): ApiError => {
    const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0] || 'duplicate value';
    const message = `Duplicate field value: ${value}. Please use another value.`;
    return new ApiError(400, message);
};

const handleValidationError = (err: any): ApiError => {
    const errors = Object.values(err.errors || {}).map((el: any) => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new ApiError(400, message, errors);
};

const handleJWTError = (): ApiError =>
    new ApiError(401, 'Invalid token. Please log in again.');

const handleJWTExpiredError = (): ApiError =>
    new ApiError(401, 'Your token has expired. Please log in again.');

const handleSequelizeValidationError = (err: any): ApiError => {
    const errors = err.errors?.map((e: any) => e.message) || [];
    const message = `Validation error: ${errors.join(', ')}`;
    return new ApiError(400, message, errors);
};

const handleSequelizeUniqueConstraintError = (err: any): ApiError => {
    const field = err.errors?.[0]?.path || 'field';
    const message = `A record with this ${field} already exists.`;
    return new ApiError(409, message);
};

const handleSequelizeForeignKeyError = (): ApiError => {
    const message = 'Referenced record not found.';
    return new ApiError(400, message);
};

/**
 * Send error response in development mode
 */
const sendErrorDev = (err: AppError, res: Response): void => {
    res.status(err.statusCode || 500).json(
        buildErrorResponse(err.message, err.errors, {
            status: err.status,
            code: err.code,
            stack: err.stack,
        })
    );
};

/**
 * Send error response in production mode
 */
const sendErrorProd = (err: AppError, res: Response): void => {
    if (err.isOperational) {
        res.status(err.statusCode || 500).json(
            buildErrorResponse(err.message, err.errors, {
                code: err.code,
            })
        );
        return;
    }

    // Programming or unknown error: don't leak details
    logger.error('Unhandled non-operational error', err);
    res.status(500).json(buildErrorResponse('Something went wrong. Please try again later.'));
};

/**
 * Global Error Handler Middleware
 * Must be the LAST middleware in the app
 */
export const globalErrorHandler: ErrorRequestHandler = (
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (res.headersSent) {
        logger.error('[ErrorHandler] Headers already sent, skipping response', {
            message: err.message,
            path: req.path,
        });
        next(err);
        return;
    }

    // CORS library often throws plain Error objects for denied origins.
    // Normalize these into operational 403 errors so they don't leak as 500s.
    const isCorsOriginDeniedError =
        typeof err.message === 'string' && /not allowed by CORS/i.test(err.message);
    if ((err.statusCode == null || err.statusCode === 500) && isCorsOriginDeniedError) {
        const corsError = ApiError.forbidden(err.message);
        corsError.stack = err.stack ?? corsError.stack;
        err = corsError;
    }

    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    logger.error('[ErrorHandler] Request failed', {
        message: err.message,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method,
        ip: req.ip,
        stack: env.nodeEnv === 'development' ? err.stack : undefined,
    });

    if (env.nodeEnv === 'development') {
        sendErrorDev(err, res);
        return;
    }

    let mappedError: AppError = { ...err, message: err.message, name: err.name };

    if (err.name === 'CastError') mappedError = handleCastError(err);
    if ((err as any).code === 11000) mappedError = handleDuplicateFieldsError(err);
    if (err.name === 'ValidationError') mappedError = handleValidationError(err);
    if (err.name === 'JsonWebTokenError') mappedError = handleJWTError();
    if (err.name === 'TokenExpiredError') mappedError = handleJWTExpiredError();
    if (err.name === 'SequelizeValidationError') mappedError = handleSequelizeValidationError(err);
    if (err.name === 'SequelizeUniqueConstraintError') mappedError = handleSequelizeUniqueConstraintError(err);
    if (err.name === 'SequelizeForeignKeyConstraintError') mappedError = handleSequelizeForeignKeyError();
    if (typeof err.message === 'string' && /not allowed by CORS/i.test(err.message)) {
        mappedError = ApiError.forbidden(err.message);
    }

    sendErrorProd(mappedError, res);
};

/**
 * Handle 404 Not Found errors
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
    const error = new ApiError(404, `Cannot find ${req.method} ${req.originalUrl} on this server`);
    (error as AppError).isOperational = true;
    next(error);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 * Usage: router.get('/path', catchAsync(async (req, res) => { ... }))
 */
export const catchAsync = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Handle unhandled promise rejections
 * ERR-01 FIX: Consolidated to use graceful-shutdown.ts only to avoid duplicate handlers
 * The actual handlers are registered in graceful-shutdown.ts
 */
export const handleUnhandledRejections = (_server: { close: (cb: () => void) => void }): void => {
    // Handlers are now consolidated in graceful-shutdown.ts
    // This function is kept for backward compatibility but does nothing
};

/**
 * Handle uncaught exceptions
 * ERR-01 FIX: Consolidated to use graceful-shutdown.ts only
 */
export const handleUncaughtExceptions = (): void => {
    // Handlers are now consolidated in graceful-shutdown.ts
    // This function is kept for backward compatibility but does nothing
};

// Re-export legacy function for backward compatibility
export const errorHandler = globalErrorHandler;
