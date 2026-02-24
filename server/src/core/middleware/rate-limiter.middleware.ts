/**
 * Rate Limiting Middleware
 *
 * Implements tiered rate limiting using express-rate-limit with Redis store.
 * Protects public endpoints from abuse while allowing legitimate traffic.
 *
 * Tiers:
 *   - AUTH: Strict limits for login/register/password reset (5 req/15min)
 *   - API: Moderate limits for general API (100 req/15min)
 *   - WEBHOOK: Permissive limits for webhooks (1000 req/15min)
 *
 * Bypass: Internal/trusted IPs can skip rate limiting
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { getRedis } from '../../config/redis';
import { env } from '../../config/env';
import { logger } from '../utils/logger';
import { ApiError } from '../http/ApiError';
import { HttpStatus } from '../http/HttpStatus';
import { Redis } from 'ioredis';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RateLimitConfig {
    windowMs: number;
    max: number;
    message: string;
    skipFailedRequests?: boolean;
    keyGenerator?: (req: any) => string;
}

interface RateLimitTier {
    auth: RateLimitConfig;
    api: RateLimitConfig;
    webhook: RateLimitConfig;
    passwordReset: RateLimitConfig;
    tenantRegistration: RateLimitConfig;
}

// ─── Configuration ───────────────────────────────────────────────────────────

const RATE_LIMIT_TIERS: RateLimitTier = {
    auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 requests per window
        message: 'Too many login attempts. Please try again later.',
        skipFailedRequests: false,
    },
    api: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per window
        message: 'Too many requests. Please slow down.',
    },
    webhook: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // 1000 requests per window
        message: 'Webhook rate limit exceeded.',
    },
    passwordReset: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 requests per hour
        message: 'Too many password reset requests. Please check your email or try again later.',
    },
    tenantRegistration: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 registrations per hour per IP
        message: 'Too many registration attempts. Please try again later.',
    },
};

// ─── Trusted IPs Bypass ──────────────────────────────────────────────────────

const TRUSTED_IPS = new Set(
    (process.env.INTERNAL_IP_ALLOWLIST || '127.0.0.1,::1,localhost')
        .split(',')
        .map(ip => ip.trim())
);

const isTrustedIP = (ip: string): boolean => {
    return TRUSTED_IPS.has(ip) || TRUSTED_IPS.has('localhost');
};

// ─── Custom Key Generator ────────────────────────────────────────────────────

const defaultKeyGenerator = (req: any): string => {
    // Use user ID if authenticated, otherwise IP
    const userId = req.user?.userId;
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';

    return userId ? `user:${userId}` : `ip:${ip}`;
};

const authKeyGenerator = (req: any): string => {
    // For auth endpoints, always use IP + email combination
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const email = req.body?.email?.toLowerCase() || 'unknown';
    const emailHash = Buffer.from(email).toString('base64').slice(0, 16);

    return `auth:${ip}:${emailHash}`;
};

// ─── Redis Store Factory ──────────────────────────────────────────────────────

interface Store {
    increment(key: string): Promise<{ totalHits: number; resetTime: Date }>;
    decrement(key: string): Promise<void>;
    resetKey(key: string): Promise<void>;
    wrap(key: string, fn: () => Promise<any>): Promise<any>;
}

class RedisStore {
    private client: Redis;
    private prefix: string;

    constructor(client: Redis, prefix: string = 'rl:') {
        this.client = client;
        this.prefix = prefix;
    }

    async increment(key: string) {
        const prefixedKey = this.prefix + key;
        const result = await this.client.pipeline()
            .incr(prefixedKey)
            .expire(prefixedKey, Math.floor(windowMs / 1000))
            .exec();
            
        const firstResult = result?.[0];
        if (!firstResult || firstResult[1] === null || firstResult[1] === undefined) {
            throw new Error('Failed to increment rate limit');
        }
        const totalHits = parseInt(String(firstResult[1]));
        const resetTimestamp = Date.now() + windowMs;
        return {
            totalHits: totalHits,
            resetTime: new Date(resetTimestamp)
        };
    }

    async decrement(key: string) {
        const prefixedKey = this.prefix + key;
        await this.client.decr(prefixedKey);
    }

    async resetKey(key: string) {
        const prefixedKey = this.prefix + key;
        await this.client.del(prefixedKey);
    }

    async wrap(key: string, fn: () => Promise<any>) {
        return fn();
    }
}

// Store reference for windowMs
let windowMs: number = 15 * 60 * 1000; // Default to 15 minutes

const createRedisStore = (prefix: string, winMs: number): Store | undefined => {
    windowMs = winMs; // Capture the windowMs value
    try {
        const redisClient = getRedis();

        return new RedisStore(redisClient, `rl:${prefix}:`) as Store;
    } catch (error) {
        logger.warn('[RateLimiter] Redis unavailable, using memory store');
        return undefined;
    }
};

// ─── Custom Response Handler ─────────────────────────────────────────────────

const rateLimitHandler = (message: string) => {
    return (req: any, res: any) => {
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';

        logger.warn('[RateLimiter] Rate limit exceeded', {
            ip,
            path: req.path,
            method: req.method,
            userAgent: req.headers['user-agent'],
        });

        throw new ApiError(
            HttpStatus.TOO_MANY_REQUESTS,
            message
        );
    };
};

// ─── Rate Limiter Factory ────────────────────────────────────────────────────

const createRateLimiter = (
    config: RateLimitConfig,
    prefix: string,
    keyGen?: (req: any) => string
): RateLimitRequestHandler => {
    return rateLimit({
        windowMs: config.windowMs,
        max: config.max,
        standardHeaders: true, // Return rate limit info in RateLimit-* headers
        legacyHeaders: false, // Disable X-RateLimit-* headers

        // Skip trusted IPs
        skip: (req: any) => {
            const ip = req.ip || req.connection?.remoteAddress || '';
            return isTrustedIP(ip);
        },

        // Custom key generator
        keyGenerator: keyGen || defaultKeyGenerator,

        // Redis store for distributed rate limiting
        store: createRedisStore(prefix, config.windowMs),

        // Custom error handler
        handler: rateLimitHandler(config.message) as any,

        // Skip failed requests (for auth endpoints)
        skipFailedRequests: config.skipFailedRequests,

        // Add custom headers
        headers: true,
    });
};

// ─── Exported Rate Limiters ──────────────────────────────────────────────────

/**
 * Auth Rate Limiter
 * Strict limits for login, register, password reset
 * 5 requests per 15 minutes per IP+email combination
 */
export const authRateLimiter = (): RateLimitRequestHandler => {
    return createRateLimiter(
        RATE_LIMIT_TIERS.auth,
        'auth',
        authKeyGenerator
    );
};

/**
 * Password Reset Rate Limiter
 * Very strict: 3 requests per hour
 */
export const passwordResetRateLimiter = (): RateLimitRequestHandler => {
    return createRateLimiter(
        RATE_LIMIT_TIERS.passwordReset,
        'pwd-reset',
        authKeyGenerator
    );
};

/**
 * Tenant Registration Rate Limiter
 * 3 registrations per hour per IP
 */
export const tenantRegistrationRateLimiter = (): RateLimitRequestHandler => {
    return createRateLimiter(
        RATE_LIMIT_TIERS.tenantRegistration,
        'tenant-reg',
        defaultKeyGenerator
    );
};

/**
 * API Rate Limiter
 * Moderate limits for general API endpoints
 * 100 requests per 15 minutes per user/IP
 */
export const apiRateLimiter = (): RateLimitRequestHandler => {
    return createRateLimiter(
        RATE_LIMIT_TIERS.api,
        'api',
        defaultKeyGenerator
    );
};

/**
 * Webhook Rate Limiter
 * Permissive limits for webhook endpoints
 * 1000 requests per 15 minutes
 */
export const webhookRateLimiter = (): RateLimitRequestHandler => {
    return createRateLimiter(
        RATE_LIMIT_TIERS.webhook,
        'webhook',
        defaultKeyGenerator
    );
};

// ─── Combined Middleware for Auth Routes ─────────────────────────────────────

/**
 * Combined rate limiter for authentication routes.
 * Applies both IP-based and email-based limits.
 */
export const combinedAuthRateLimiter = (): RateLimitRequestHandler[] => {
    return [
        authRateLimiter(),
        // Additional brute force protection from security.middleware.ts
    ];
};

// ─── Rate Limit Status Endpoint ──────────────────────────────────────────────

/**
 * Middleware to add rate limit status to response headers
 * Useful for client-side rate limit awareness
 */
export const rateLimitStatus = (req: any, res: any, next: any) => {
    res.setHeader('X-RateLimit-Policy', 'auth=5/15min,api=100/15min,webhook=1000/15min');
    next();
};

// ─── Default Export ──────────────────────────────────────────────────────────

export default {
    authRateLimiter,
    passwordResetRateLimiter,
    tenantRegistrationRateLimiter,
    apiRateLimiter,
    webhookRateLimiter,
    combinedAuthRateLimiter,
    rateLimitStatus,
};