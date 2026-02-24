import { Request, Response, NextFunction } from 'express';

export abstract class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly code?: string;

    constructor(message: string, statusCode: number, code?: string, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code;

        Error.captureStackTrace(this, this.constructor);
    }
}

export class BadRequestError extends AppError {
    constructor(message: string = 'Bad Request', code?: string) {
        super(message, 400, code);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized', code?: string) {
        super(message, 401, code);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Forbidden', code?: string) {
        super(message, 403, code);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string = 'Not Found', code?: string) {
        super(message, 404, code);
    }
}

export class ConflictError extends AppError {
    constructor(message: string = 'Conflict', code?: string) {
        super(message, 409, code);
    }
}

export class TooManyRequestsError extends AppError {
    constructor(message: string = 'Too Many Requests', code?: string) {
        super(message, 429, code);
    }
}

export class InternalServerError extends AppError {
    constructor(message: string = 'Internal Server Error', code?: string) {
        super(message, 500, code);
    }
}