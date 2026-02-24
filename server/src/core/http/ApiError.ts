import { HttpStatus } from './HttpStatus';

export class ApiError extends Error {
    public readonly statusCode: number;
    public readonly status: string;
    public readonly isOperational: boolean;
    public readonly errors: any[];

    constructor(
        statusCode: number,
        message: string,
        errors: any[] = [],
        isOperational = true
    ) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = isOperational;
        this.errors = errors;

        Error.captureStackTrace(this, this.constructor);
    }

    // Factory methods for common errors
    static badRequest(message: string, errors: any[] = []): ApiError {
        return new ApiError(HttpStatus.BAD_REQUEST, message, errors);
    }

    static unauthorized(message = 'Unauthorized'): ApiError {
        return new ApiError(HttpStatus.UNAUTHORIZED, message);
    }

    static forbidden(message = 'Forbidden', errors: any[] = []): ApiError {
        return new ApiError(HttpStatus.FORBIDDEN, message, errors);
    }

    static notFound(message = 'Resource not found'): ApiError {
        return new ApiError(HttpStatus.NOT_FOUND, message);
    }

    static conflict(message: string): ApiError {
        return new ApiError(HttpStatus.CONFLICT, message);
    }

    static internal(message = 'Internal server error'): ApiError {
        return new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, message, [], false);
    }
}

export class ServiceUnavailableError extends ApiError {
    constructor(message = 'Service temporarily unavailable') {
        super(HttpStatus.SERVICE_UNAVAILABLE, message);
    }
}
