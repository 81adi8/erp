/**
 * Security Middleware
 * 
 * Provides XSS sanitization, injection protection, and brute-force defense.
 * Applied after body parsing, before route handlers.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { CacheService } from '../cache/cache.service';
import { CacheKeys, CacheTTL } from '../cache/cache.keys';
import { ApiError } from '../http/ApiError';
import { HttpStatus } from '../http/HttpStatus';
import { logger } from '../utils/logger';

/**
 * XSS patterns to DETECT and STRIP from input.
 *
 * IMPORTANT: We strip dangerous tags/protocols but do NOT HTML-encode the
 * remaining content. HTML encoding belongs at the output/rendering layer,
 * not at the storage layer. Encoding at storage corrupts data:
 *   "O'Brien" → "O&#x27;Brien" stored in DB (wrong)
 *   "St. Mary's & Sons" → "St. Mary&#x27;s &amp; Sons" (wrong)
 *
 * Parameterized queries (Sequelize replacements) handle SQL injection.
 * Output encoding is the responsibility of the frontend renderer.
 */
const XSS_STRIP_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,  // Script tags
    /javascript\s*:/gi,                                       // JavaScript protocol
    /on\w+\s*=\s*["'][^"']*["']/gi,                          // Inline event handlers (quoted)
    /on\w+\s*=\s*[^\s>]*/gi,                                  // Inline event handlers (unquoted)
    /<iframe[\s\S]*?>/gi,                                     // Iframes
    /<object[\s\S]*?>/gi,                                     // Objects
    /<embed[\s\S]*?>/gi,                                      // Embeds
    /vbscript\s*:/gi,                                         // VBScript protocol
];

/**
 * SQL injection patterns to detect (for logging/alerting only — not blocking)
 * Primary SQL injection defense is Sequelize parameterized queries.
 */
const SQL_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)/gi,
    /--/g,                                                   // SQL comments
    /;.*(\b(DROP|DELETE|UPDATE)\b)/gi,                       // Chained dangerous commands
];

/**
 * Strip dangerous XSS patterns from a string value.
 * Does NOT HTML-encode — raw data is stored as-is after stripping.
 */
function sanitizeValue(value: string): string {
    if (typeof value !== 'string') return value;

    let sanitized = value;
    for (const pattern of XSS_STRIP_PATTERNS) {
        sanitized = sanitized.replace(pattern, '');
    }
    return sanitized;
}

/**
 * Check for SQL injection patterns (log only, don't block)
 */
function detectSqlInjection(value: string): boolean {
    if (typeof value !== 'string') return false;

    for (const pattern of SQL_PATTERNS) {
        if (pattern.test(value)) {
            return true;
        }
    }
    return false;
}

/**
 * Recursively sanitize object values
 */
function sanitizeObject(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
        return sanitizeValue(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    if (typeof obj === 'object') {
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[sanitizeValue(key)] = sanitizeObject(value);
        }
        return sanitized;
    }

    return obj;
}

/**
 * XSS Sanitization Middleware
 * Sanitizes request body only (query and params are read-only in Express 5)
 * For query/params, validation should happen in route handlers
 */
export const xssSanitize: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    try {
        // Sanitize body only (writable)
        // Note: req.query and req.params are read-only getters in Express 5
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body);
        }

        next();
    } catch (error) {
        logger.error('[Security] XSS sanitization error', error);
        next(); // Don't block on sanitization errors
    }
};

/**
 * SQL Injection Detection Middleware
 * Logs suspicious patterns but doesn't block (use parameterized queries as primary defense)
 */
export const sqlInjectionDetect: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    const checkValue = (value: unknown, location: string) => {
        if (typeof value === 'string' && detectSqlInjection(value)) {
            logger.warn(`[Security] Potential SQL injection detected in ${location}`, {
                ip: req.ip,
                path: req.path,
                value: value.substring(0, 100),
            });
        }
    };

    // Check body
    if (req.body) {
        JSON.stringify(req.body, (key, value) => {
            checkValue(value, 'body');
            return value;
        });
    }

    // Check query
    Object.values(req.query || {}).forEach(value => {
        checkValue(value, 'query');
    });

    next();
};

/**
 * Brute Force Protection for Login Endpoints
 * Tracks failed attempts and locks out after threshold
 */
export const bruteForceProtection = (maxAttempts: number = 5, lockoutMinutes: number = 15): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const attemptsKey = CacheKeys.LOGIN_ATTEMPTS(ip);

        try {
            // Check current attempts
            const attempts = await CacheService.get<number>(attemptsKey) || 0;

            if (attempts >= maxAttempts) {
                const ttl = await CacheService.ttl(attemptsKey);
                return next(new ApiError(
                    HttpStatus.TOO_MANY_REQUESTS,
                    `Too many login attempts. Please try again in ${Math.ceil(ttl / 60)} minutes.`
                ));
            }

            // Track this attempt (will be cleared on successful login)
            res.on('finish', () => {
                // If response indicates failure (401), increment counter
                if (res.statusCode === 401) {
                    // Non-blocking, fire-and-forget with error handling
                    CacheService.incr(attemptsKey, lockoutMinutes * 60).catch(err => {
                        logger.error('[Security] Failed to increment login attempts', err);
                    });
                }
            });

            next();
        } catch (error) {
            logger.error('[Security] Brute force check error', error);
            next(); // Don't block if Redis fails
        }
    };
};

/**
 * Clear login attempts on successful login
 */
export const clearLoginAttempts = async (ip: string): Promise<void> => {
    await CacheService.del(CacheKeys.LOGIN_ATTEMPTS(ip));
};

/**
 * Add security headers middleware
 */
export const securityHeaders: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
    // Already handled by Helmet, but add any custom ones here
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
};

export default {
    xssSanitize,
    sqlInjectionDetect,
    bruteForceProtection,
    clearLoginAttempts,
    securityHeaders,
};
