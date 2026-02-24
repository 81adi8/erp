import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AcademicError, ErrorCodes } from '../errors/academic.error';
import { logger } from '../../../../core/utils/logger';

/**
 * Validates a DTO and returns the validated instance
 */
export async function validateDto<T extends object>(DtoClass: new () => T, data: unknown): Promise<T> {
    const dto = plainToInstance(DtoClass, data);
    const errors = await validate(dto);
    
    if (errors.length > 0) {
        const messages = errors
            .map((e: ValidationError) => Object.values(e.constraints || {}).join(', '))
            .join('; ');
        throw new AcademicError(messages, ErrorCodes.VALIDATION_ERROR, 400);
    }
    
    return dto;
}

/**
 * Async handler wrapper for controllers
 * Catches errors and formats them consistently
 */
export const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch((error) => {
            if (error instanceof AcademicError) {
                return errorResponse(
                    res,
                    error.message,
                    error.statusCode,
                    [error.message],
                    { code: error.code }
                );
            }
            
            logger.error('Academic Controller Error:', error);
            const message = error instanceof Error ? error.message : 'An unexpected error occurred';
            return errorResponse(
                res,
                message,
                500,
                [message],
                { code: ErrorCodes.INTERNAL_ERROR }
            );
        });
    };
};

/**
 * Gets institution ID from request, throws if not present
 */
export function getInstitutionId(req: Request): string {
    const institutionId = req.tenant?.id;
    if (!institutionId) {
        throw new AcademicError('Institution ID required', 'INSTITUTION_REQUIRED', 400);
    }
    return institutionId;
}

/**
 * Standard success response
 */
export function successResponse<T>(res: Response, data: T, message?: string, statusCode: number = 200) {
    return res.status(statusCode).json({
        success: true,
        message: message || 'Success',
        data,
        errors: [],
    });
}

/**
 * Standard error response
 */
export function errorResponse(
    res: Response,
    message: string,
    statusCode: number = 400,
    errors?: string[],
    extra: Record<string, unknown> = {}
) {
    return res.status(statusCode).json({
        success: false,
        message,
        data: null,
        errors: errors && errors.length > 0 ? errors : [message],
        ...extra,
    });
}

/**
 * Standard paginated response
 */
export function paginatedResponse<T>(
    res: Response, 
    result: { data: T[]; total: number; page: number; limit: number; totalPages: number }
) {
    return res.json({
        success: true,
        message: 'Success',
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
}
