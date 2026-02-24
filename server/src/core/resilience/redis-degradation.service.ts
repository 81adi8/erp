/**
 * TASK-E2 — Redis Degradation Mode
 *
 * When Redis is unavailable, the system must NOT crash.
 * Each Redis-dependent subsystem has a defined degraded behavior:
 *
 *   RBAC cache      → in-process LRU memory cache (bounded, 1000 entries)
 *   Rate limiter    → local in-memory counter (per-process, not distributed)
 *   Session revoke  → soft-degraded (DB-only revocation, Redis marker skipped)
 *   MFA challenges  → fail-closed (MFA login blocked until Redis recovers)
 *   Secret rotation → local only (pub/sub skipped, logged as warning)
 *
 * Health probe: RedisDegradationService.isRedisHealthy()
 * Auto-recovery: probes Redis every 30s, restores full mode when healthy
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

// ─── Simple bounded LRU cache (no external deps) ─────────────────────────────

class LruCache<K, V> {
    private map = new Map<K, V>();
    constructor(private readonly maxSize: number) {}

    get(key: K): V | undefined {
        if (!this.map.has(key)) return undefined;
        // Move to end (most recently used)
        const val = this.map.get(key)!;
        this.map.delete(key);
        this.map.set(key, val);
        return val;
    }

    set(key: K, value: V): void {
        if (this.map.has(key)) this.map.delete(key);
        else if (this.map.size >= this.maxSize) {
            // Evict least recently used (first entry)
            this.map.delete(this.map.keys().next().value!);
        }
        this.map.set(key, value);
    }

    delete(key: K): void {
        this.map.delete(key);
    }

    clear(): void {
        this.map.clear();
    }

    get size(): number {
        return this.map.size;
    }
}

// ─── In-memory rate limiter (per-process fallback) ───────────────────────────

interface LocalRateLimitEntry {
    count: number;
    lockedUntil: number | null;
    firstFailAt: number;
}

// ─── Redis health state ───────────────────────────────────────────────────────

export type RedisHealthState = 'healthy' | 'degraded' | 'unknown';

// ─── Redis Degradation Service ────────────────────────────────────────────────

export class RedisDegradationService extends EventEmitter {
    private static instance: RedisDegradationService | null = null;

    private healthState: RedisHealthState = 'unknown';
    private probeInterval: NodeJS.Timeout | null = null;
    private readonly PROBE_INTERVAL_MS = 30_000; // 30s health probe

    // In-memory fallbacks
    private rbacMemoryCache = new LruCache<string, { value: any; expiresAt: number }>(1000);
    private rateLimitMemory = new Map<string, LocalRateLimitEntry>();

    private constructor() {
        super();
    }

    static getInstance(): RedisDegradationService {
        if (!RedisDegradationService.instance) {
            RedisDegradationService.instance = new RedisDegradationService();
        }
        return RedisDegradationService.instance;
    }

    // ── Health probing ────────────────────────────────────────────────────────

    startHealthProbe(): void {
        if (this.probeInterval) return;
        this.probeInterval = setInterval(() => this.probe(), this.PROBE_INTERVAL_MS);
        // Run immediately
        this.probe();
    }

    stopHealthProbe(): void {
        if (this.probeInterval) {
            clearInterval(this.probeInterval);
            this.probeInterval = null;
        }
    }

    private async probe(): Promise<void> {
        try {
            const { getRedis } = await import('../../config/redis');
            const redis = getRedis();
            await redis.ping();

            if (this.healthState !== 'healthy') {
                const previous = this.healthState;
                this.healthState = 'healthy';
                logger.info('[RedisDegradation] Redis recovered — restoring full mode');
                this.emit('redis_recovered', { previous });
            }
        } catch {
            if (this.healthState !== 'degraded') {
                this.healthState = 'degraded';
                logger.warn('[RedisDegradation] Redis unavailable — entering degraded mode');
                this.emit('redis_degraded', { timestamp: new Date() });
            }
        }
    }

    isRedisHealthy(): boolean {
        return this.healthState === 'healthy';
    }

    getHealthState(): RedisHealthState {
        return this.healthState;
    }

    // ── RBAC cache fallback ───────────────────────────────────────────────────

    /**
     * Get from RBAC memory cache (Redis degraded fallback).
     * TTL-aware: returns undefined if entry expired.
     */
    rbacCacheGet(key: string): any | undefined {
        const entry = this.rbacMemoryCache.get(key);
        if (!entry) return undefined;
        if (Date.now() > entry.expiresAt) {
            this.rbacMemoryCache.delete(key);
            return undefined;
        }
        return entry.value;
    }

    /**
     * Set in RBAC memory cache (Redis degraded fallback).
     */
    rbacCacheSet(key: string, value: any, ttlSeconds: number): void {
        this.rbacMemoryCache.set(key, {
            value,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }

    rbacCacheDelete(key: string): void {
        this.rbacMemoryCache.delete(key);
    }

    rbacCacheClear(): void {
        this.rbacMemoryCache.clear();
    }

    // ── Rate limiter fallback ─────────────────────────────────────────────────

    /**
     * Record a login failure in local memory (Redis degraded fallback).
     * Less accurate than Redis (per-process only, not distributed),
     * but prevents complete bypass of rate limiting.
     */
    localRateLimitRecord(identifier: string): { locked: boolean; count: number; lockedUntil: number | null } {
        const now = Date.now();
        let entry = this.rateLimitMemory.get(identifier);

        if (!entry) {
            entry = { count: 0, lockedUntil: null, firstFailAt: now };
        }

        // Check if lock expired
        if (entry.lockedUntil && now > entry.lockedUntil) {
            entry = { count: 0, lockedUntil: null, firstFailAt: now };
        }

        entry.count++;

        // Apply lock thresholds (same as Redis-backed rate limiter)
        if (entry.count >= 10) {
            entry.lockedUntil = now + 60 * 60 * 1000; // 1 hour
        } else if (entry.count >= 5) {
            entry.lockedUntil = now + 10 * 60 * 1000; // 10 minutes
        }

        this.rateLimitMemory.set(identifier, entry);

        return {
            locked: entry.lockedUntil !== null && now < entry.lockedUntil,
            count: entry.count,
            lockedUntil: entry.lockedUntil,
        };
    }

    localRateLimitCheck(identifier: string): { locked: boolean; count: number } {
        const entry = this.rateLimitMemory.get(identifier);
        if (!entry) return { locked: false, count: 0 };

        const now = Date.now();
        if (entry.lockedUntil && now > entry.lockedUntil) {
            this.rateLimitMemory.delete(identifier);
            return { locked: false, count: 0 };
        }

        return {
            locked: entry.lockedUntil !== null && now < entry.lockedUntil,
            count: entry.count,
        };
    }

    localRateLimitClear(identifier: string): void {
        this.rateLimitMemory.delete(identifier);
    }

    // ── Session revocation fallback ───────────────────────────────────────────

    /**
     * Session revocation in degraded mode:
     * - DB revocation still happens (source of truth)
     * - Redis marker skipped (authGuard will fall back to DB check)
     * - Logs warning for monitoring
     */
    logSessionRevocationDegraded(sessionId: string): void {
        logger.warn(
            `[RedisDegradation] Session ${sessionId} revoked in DB only (Redis unavailable). ` +
            `authGuard will use DB fallback for revocation check.`
        );
        this.emit('session_revocation_degraded', { sessionId, timestamp: new Date() });
    }

    // ── Degradation status report ─────────────────────────────────────────────

    getStatus(): {
        state: RedisHealthState;
        rbacCacheSize: number;
        rateLimitEntries: number;
    } {
        return {
            state: this.healthState,
            rbacCacheSize: this.rbacMemoryCache.size,
            rateLimitEntries: this.rateLimitMemory.size,
        };
    }
}

export const redisDegradation = RedisDegradationService.getInstance();
