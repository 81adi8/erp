import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../http/ApiError';

interface ValidationErrorItem {
    field: string;
    message: string;
}

const sendValidationFailure = (
    res: Response,
    message: string,
    errors: ValidationErrorItem[]
) => {
    return res.status(400).json({
        success: false,
        message,
        data: null,
        errors: errors.map((e) => `${e.field}: ${e.message}`),
        meta: {
            code: 'VALIDATION_ERROR',
            fields: errors,
        },
    });
};

/**
 * Middleware to validate request body against a Zod schema
 * Replaces validation logic in controllers
 */
export const validate = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const formattedErrors = formatZodErrors(result.error);
            
            const error = ApiError.badRequest(
                'Validation failed',
                [formattedErrors]
            );
            
            return sendValidationFailure(res, error.message, formattedErrors);
        }

        // Replace body with validated and parsed data
        req.body = result.data;
        next();
    };
};

/**
 * Middleware to validate query parameters against a Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.query);

        if (!result.success) {
            const formattedErrors = formatZodErrors(result.error);
            return sendValidationFailure(res, 'Query validation failed', formattedErrors);
        }

        req.query = result.data as Request['query'];
        next();
    };
};

/**
 * Middleware to validate route parameters against a Zod schema
 */
export const validateParams = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.params);

        if (!result.success) {
            const formattedErrors = formatZodErrors(result.error);
            return sendValidationFailure(res, 'Parameter validation failed', formattedErrors);
        }

        req.params = result.data as Request['params'];
        next();
    };
};

/**
 * Format Zod errors into a flat object with field paths as keys
 */
function formatZodErrors(error: ZodError): ValidationErrorItem[] {
    return error.issues.map((issue) => ({
        field: issue.path.join('.') || 'general',
        message: issue.message,
    }));
}
