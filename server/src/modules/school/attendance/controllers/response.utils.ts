import { Response } from 'express';

export const sendSuccess = (
    res: Response,
    data: unknown,
    message = 'Success',
    statusCode = 200,
    meta?: Record<string, unknown>
) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        errors: [],
        ...(meta ? { meta } : {}),
    });
};

export const sendError = (
    res: Response,
    message: string,
    statusCode = 400,
    errors: string[] = [message],
    extra?: Record<string, unknown>
) => {
    return res.status(statusCode).json({
        success: false,
        message,
        data: null,
        errors,
        ...(extra || {}),
    });
};

export const sendPaginated = <T>(
    res: Response,
    result: { data: T[]; total: number; page: number; limit: number; totalPages: number },
    message = 'Success',
    statusCode = 200
) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data: result.data,
        meta: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
        },
        // Backward compatibility fields
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        errors: [],
    });
};
