/**
 * TASK-04: REDIS REAL ENABLEMENT
 *
 * Production-grade Redis configuration:
 * - No mock path in production/staging
 * - Exponential backoff retry policy
 * - Health check ping on connect
 * - Fail-fast: server will NOT boot if Redis unavailable in production
 *
 * Domains:
 *   RBAC cache       → permission resolution
 *   session store    → auth reliability
 *   rate limiter     → login protection
 *   telemetry buffer → metrics batching
 */

import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../core/utils/logger';

// ─── Singleton state ────────────────────────────────────────────────────────
let redisClient: Redis | null = null;
let redisSubscriber: Redis | null = null;
let connecting = false;

const isProductionLike =
    env.nodeEnv === 'production' || env.nodeEnv === 'staging';

// ─── Mock Redis (development / test ONLY) ───────────────────────────────────
const createMockRedis = (): any => {
    const cache = new Map<string, { value: string; expiresAt?: number }>();

    const isExpired = (key: string): boolean => {
        const entry = cache.get(key);
        if (!entry) return true;
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            cache.delete(key);
            return true;
        }
        return false;
    };

    logger.warn('[MockRedis] ⚠️  Using in-memory mock — NOT for production');
    return {
        get: async (key: string) => {
            if (isExpired(key)) return null;
            return cache.get(key)?.value ?? null;
        },
        set: async (key: string, value: string, mode?: string, ttl?: number) => {
            const expiresAt = mode === 'EX' && ttl ? Date.now() + ttl * 1000 : undefined;
            cache.set(key, { value, expiresAt });
            return 'OK';
        },
        setex: async (key: string, seconds: number, value: string) => {
            cache.set(key, { value, expiresAt: Date.now() + seconds * 1000 });
            return 'OK';
        },
        del: async (...keys: string[]) => {
            let count = 0;
            for (const k of keys) { if (cache.delete(k)) count++; }
            return count;
        },
        exists: async (key: string) => (isExpired(key) ? 0 : 1),
        ttl: async (key: string) => {
            const entry = cache.get(key);
            if (!entry || isExpired(key)) return -2;
            if (!entry.expiresAt) return -1;
            return Math.ceil((entry.expiresAt - Date.now()) / 1000);
        },
        expire: async (key: string, seconds: number) => {
            const entry = cache.get(key);
            if (!entry) return 0;
            entry.expiresAt = Date.now() + seconds * 1000;
            return 1;
        },
        incr: async (key: string) => {
            const entry = cache.get(key);
            const val = parseInt(entry?.value ?? '0', 10) + 1;
            cache.set(key, { value: String(val), expiresAt: entry?.expiresAt });
            return val;
        },
        keys: async (pattern: string) => {
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            return [...cache.keys()].filter(k => !isExpired(k) && regex.test(k));
        },
        scan: async (_cursor: string, _match: string, _count: string, _num: number) => ['0', []],
        info: async (_section?: string) => 'used_memory_human:1.00M\r\n',
        ping: async () => 'PONG',
        quit: async () => { cache.clear(); return 'OK'; },
        on: () => {},
        status: 'ready',
    };
};

// ─── Redis connection options ────────────────────────────────────────────────
export const redisOptions: any = {
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password || undefined,
    username: env.redis.username || undefined,
    tls: env.redis.tls ? {} : undefined,
    lazyConnect: true,
    // Exponential backoff: 200ms → 400ms → 800ms → 1600ms → 3200ms → give up
    retryStrategy: (times: number) => {
        if (times > 5) {
            logger.error(`[Redis] ❌ Connection failed after ${times} retries — giving up`);
            return null; // stop retrying
        }
        const delay = Math.min(200 * Math.pow(2, times - 1), 5000);
        logger.warn(`[Redis] Retry #${times} in ${delay}ms`);
        return delay;
    },
    reconnectOnError: (err: Error) => {
        // Reconnect on READONLY errors (Redis failover)
        return err.message.includes('READONLY');
    },
    enableOfflineQueue: false, // Fail fast — don't queue commands when disconnected
    connectTimeout: 10000,     // 10s connection timeout
    commandTimeout: 5000,      // 5s per command timeout
    maxRetriesPerRequest: 3,
};

// ─── Health check ────────────────────────────────────────────────────────────
const pingRedis = async (client: Redis): Promise<void> => {
    const pong = await client.ping();
    if (pong !== 'PONG') {
        throw new Error(`[Redis] Health check failed — unexpected PING response: ${pong}`);
    }
    logger.info('[Redis] ✅ Health check passed (PONG received)');
};

// ─── Public accessors ────────────────────────────────────────────────────────

/**
 * Get the main Redis client.
 * Throws if not initialized — call connectRedis() first.
 */
export const getRedis = (): Redis | any => {
    if (!redisClient) {
        throw new Error('[Redis] Client not initialized. Call connectRedis() first.');
    }
    return redisClient;
};

/**
 * Get the Redis subscriber client (for pub/sub).
 */
export const getRedisSubscriber = (): Redis => {
    if (!redisSubscriber) {
        throw new Error('[Redis] Subscriber not initialized. Call connectRedis() first.');
    }
    return redisSubscriber as Redis;
};

/**
 * Alias kept for backward compatibility.
 */
export const getRedisClient = getRedis;

// ─── Legacy proxy (backward compat) ─────────────────────────────────────────
export const redis: any = {
    get: (key: string) => getRedis().get(key),
    set: (key: string, value: string, mode?: string, ttl?: number) => {
        if (mode === 'EX' && ttl) return getRedis().set(key, value, 'EX', ttl);
        return getRedis().set(key, value);
    },
    setex: (key: string, seconds: number, value: string) =>
        getRedis().setex(key, seconds, value),
    del: (...keys: string[]) => getRedis().del(...keys),
    exists: (key: string) => getRedis().exists(key),
    ttl: (key: string) => getRedis().ttl(key),
    incr: (key: string) => getRedis().incr(key),
    expire: (key: string, seconds: number) => getRedis().expire(key, seconds),
    quit: () => getRedis().quit(),
};

// ─── Connect ─────────────────────────────────────────────────────────────────

/**
 * Connect to Redis.
 *
 * Production/staging:
 *   - Mock is FORBIDDEN
 *   - Server will NOT boot if Redis is unavailable
 *
 * Development/test:
 *   - Falls back to in-memory mock if ALLOW_REDIS_MOCK=true
 */
export const connectRedis = async (): Promise<{
    client: Redis | any;
    subscriber: Redis | any;
}> => {
    // Already connected
    if (redisClient && redisSubscriber && !connecting) {
        return { client: redisClient, subscriber: redisSubscriber };
    }

    // Wait if connection is in progress
    if (connecting) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (redisClient && redisSubscriber) {
            return { client: redisClient, subscriber: redisSubscriber };
        }
    }

    connecting = true;
    logger.info('[Redis] 🔌 Connecting...');

    try {
        // ── Guard: production must have host + port ──────────────────────────
        if (!env.redis.host || !env.redis.port) {
            throw new Error('[Redis] REDIS_HOST and REDIS_PORT are required');
        }

        // ── Guard: production must have password ─────────────────────────────
        if (isProductionLike && !env.redis.password) {
            throw new Error('[Redis] REDIS_PASSWORD is required in production/staging');
        }

        // ── Guard: mock is forbidden in production ───────────────────────────
        if (isProductionLike && env.redis.allowMock) {
            throw new Error('[Redis] ALLOW_REDIS_MOCK is forbidden in production/staging');
        }

        // ── Create real clients ──────────────────────────────────────────────
        const client = new Redis(redisOptions);
        const subscriber = new Redis(redisOptions);

        // Attach error listeners before connecting
        client.on('error', (err: Error) => {
            logger.error('[Redis:client] Error:', err.message);
        });
        client.on('reconnecting', () => {
            logger.warn('[Redis:client] Reconnecting...');
        });
        client.on('ready', () => {
            logger.info('[Redis:client] Ready');
        });

        subscriber.on('error', (err: Error) => {
            logger.error('[Redis:subscriber] Error:', err.message);
        });
        subscriber.on('reconnecting', () => {
            logger.warn('[Redis:subscriber] Reconnecting...');
        });

        await Promise.all([client.connect(), subscriber.connect()]);

        // ── Health check ping ────────────────────────────────────────────────
        await pingRedis(client);

        redisClient = client;
        redisSubscriber = subscriber;

        logger.info('[Redis] ✅ Connected and healthy');
        return { client: redisClient, subscriber: redisSubscriber };

    } catch (error) {
        redisClient = null;
        redisSubscriber = null;

        // ── Production: fail-fast — do NOT boot ─────────────────────────────
        if (isProductionLike) {
            logger.error('[Redis] ❌ FATAL: Redis unavailable in production — server will NOT boot');
            connecting = false;
            throw error;
        }

        // ── Development: allow mock if explicitly enabled ────────────────────
        if (env.redis.allowMock) {
            logger.warn('[Redis] ⚠️  Falling back to mock Redis (ALLOW_REDIS_MOCK=true)');
            redisClient = createMockRedis();
            redisSubscriber = createMockRedis();
            connecting = false;
            return { client: redisClient, subscriber: redisSubscriber };
        }

        // ── Development without mock: still fail ─────────────────────────────
        logger.error('[Redis] ❌ Connection failed. Set ALLOW_REDIS_MOCK=true to use mock in dev.');
        connecting = false;
        throw error;
    } finally {
        connecting = false;
    }
};

// ─── Disconnect ──────────────────────────────────────────────────────────────
export const disconnectRedis = async (): Promise<void> => {
    try {
        if (redisClient && typeof redisClient.quit === 'function') {
            await redisClient.quit();
        }
        if (redisSubscriber && typeof redisSubscriber.quit === 'function') {
            await redisSubscriber.quit();
        }
    } catch (err) {
        logger.warn('[Redis] Error during disconnect:', err);
    } finally {
        redisClient = null;
        redisSubscriber = null;
        logger.info('[Redis] Disconnected');
    }
};

// ─── Health probe (for /health endpoint) ─────────────────────────────────────
export const redisHealthCheck = async (): Promise<{
    status: 'ok' | 'degraded' | 'down';
    latencyMs?: number;
    error?: string;
}> => {
    if (!redisClient) {
        return { status: 'down', error: 'Client not initialized' };
    }
    try {
        const start = Date.now();
        await redisClient.ping();
        return { status: 'ok', latencyMs: Date.now() - start };
    } catch (err: any) {
        return { status: 'down', error: err.message };
    }
};

