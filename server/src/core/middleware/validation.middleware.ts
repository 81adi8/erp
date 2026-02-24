/**
 * Validation Middleware — Production Hardening
 *
 * Provides Zod-based request validation for DTOs.
 * Validates body, query, and params with detailed error messages.
 *
 * USAGE:
 *   router.post('/admit', validateDTO(AdmitStudentSchema), controller.admitStudent);
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../http/ApiError';
import { HttpStatus } from '../http/HttpStatus';
import { logger } from '../utils/logger';

/**
 * Validation result with detailed error information
 */
interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Format Zod errors into user-friendly messages
 */
function formatZodErrors(error: ZodError): ValidationError[] {
  return error.issues.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
}

/**
 * Validate request body against a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @param options - Validation options
 */
export function validateDTO<T>(
  schema: ZodSchema<T>,
  options: { source?: 'body' | 'query' | 'params' } = { source: 'body' }
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const source = options.source || 'body';
      const data = req[source];

      const result = await schema.safeParseAsync(data);

      if (!result.success) {
        const errors = formatZodErrors(result.error);
        
        // Return first error as primary message, all errors in errors array
        const primaryMessage = errors[0]?.message || 'Validation failed';
        
        return next(new ApiError(
          HttpStatus.BAD_REQUEST,
          primaryMessage,
          errors
        ));
      }

      // Replace request data with parsed/transformed data
      if (source === 'body') {
        req.body = result.data;
      } else if (source === 'query') {
        req.query = result.data as Request['query'];
      } else {
        req.params = result.data as Request['params'];
      }
      next();
    } catch (error) {
      // Unexpected error during validation
      logger.error('[Validation] Unexpected error', error);
      return next(new ApiError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Validation processing failed'
      ));
    }
  };
}

/**
 * Validate multiple sources at once
 *
 * @param schemas - Object with schemas for body, query, params
 */
export function validateRequest(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const allErrors: ValidationError[] = [];

      // Validate body
      if (schemas.body && req.body) {
        const result = await schemas.body.safeParseAsync(req.body);
        if (!result.success) {
          allErrors.push(...formatZodErrors(result.error));
        } else {
          req.body = result.data;
        }
      }

      // Validate query
      if (schemas.query && req.query) {
        const result = await schemas.query.safeParseAsync(req.query);
        if (!result.success) {
          allErrors.push(...formatZodErrors(result.error));
        } else {
          req.query = result.data as Request['query'];
        }
      }

      // Validate params
      if (schemas.params && req.params) {
        const result = await schemas.params.safeParseAsync(req.params);
        if (!result.success) {
          allErrors.push(...formatZodErrors(result.error));
        } else {
          req.params = result.data as Request['params'];
        }
      }

      if (allErrors.length > 0) {
        const primaryMessage = allErrors[0]?.message || 'Validation failed';
        return next(new ApiError(
          HttpStatus.BAD_REQUEST,
          primaryMessage,
          allErrors
        ));
      }

      next();
    } catch (error) {
      logger.error('[Validation] Unexpected error', error);
      return next(new ApiError(
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Validation processing failed'
      ));
    }
  };
}

/**
 * Sanitize and validate - strips dangerous patterns then validates
 * Use for user-generated content fields
 */
export function sanitizeAndValidate<T>(
  schema: ZodSchema<T>,
  options: { source?: 'body' | 'query' | 'params' } = { source: 'body' }
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const source = options.source || 'body';
    const data = req[source];

    // Pre-sanitize string fields (basic XSS stripping)
    if (data && typeof data === 'object') {
      const sanitizedData = sanitizeStrings(data);
      if (source === 'body') {
        req.body = sanitizedData;
      } else if (source === 'query') {
        req.query = sanitizedData as Request['query'];
      } else {
        req.params = sanitizedData as Request['params'];
      }
    }

    // Then validate with Zod
    return validateDTO(schema, options)(req, res, next);
  };
}

/**
 * Recursively sanitize string values in an object
 */
function sanitizeStrings(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return stripDangerousPatterns(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeStrings);
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[stripDangerousPatterns(key)] = sanitizeStrings(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Strip dangerous XSS patterns from a string
 */
function stripDangerousPatterns(value: string): string {
  const patterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript\s*:/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /on\w+\s*=\s*[^\s>]*/gi,
    /<iframe[\s\S]*?>/gi,
    /<object[\s\S]*?>/gi,
    /<embed[\s\S]*?>/gi,
    /vbscript\s*:/gi,
  ];

  let sanitized = value;
  for (const pattern of patterns) {
    sanitized = sanitized.replace(pattern, '');
  }
  return sanitized;
}

export default {
  validateDTO,
  validateRequest,
  sanitizeAndValidate,
};
