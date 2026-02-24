/**
 * TASK-E1.1 — Login Lockout & Brute-Force Protection
 *
 * Rules:
 *   5 failed attempts  → 10 min lock
 *   10 failed attempts → 1 hour lock
 *   exponential cooldown beyond that
 *
 * Storage: Redis
 *   login_fail:{identifier}  → attempt count + timestamps
 *   login_lock:{identifier}  → lock expiry
 *
 * Identifier = userId (if known) OR email:ip (pre-auth)
 */

import { getRedis } from '../../config/redis';
import { logger } from '../utils/logger';

// ─── Configuration ────────────────────────────────────────────────────────────

const LOCK_THRESHOLDS: Array<{ attempts: number; lockSeconds: number }> = [
    { attempts: 5,  lockSeconds: 10 * 60 },        // 10 min
    { attempts: 10, lockSeconds: 60 * 60 },         // 1 hour
    { attempts: 15, lockSeconds: 4 * 60 * 60 },     // 4 hours
    { attempts: 20, lockSeconds: 24 * 60 * 60 },    // 24 hours
];

const FAIL_WINDOW_SECONDS = 15 * 60;  // Reset attempt counter after 15 min of no failures
const MAX_TRACKED_ATTEMPTS = 25;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LockStatus {
    locked: boolean;
    lockedUntil?: Date;
    remainingSeconds?: number;
    attemptCount?: number;
}

export interface AttemptRecord {
    count: number;
    firstAt: number;
    lastAt: number;
}

// ─── Rate Limiter Service ─────────────────────────────────────────────────────

export class AuthRateLimiterService {

    // ── Key helpers ───────────────────────────────────────────────────────────

    private static failKey(identifier: string): string {
        return `login_fail:${identifier}`;
    }

    private static lockKey(identifier: string): string {
        return `login_lock:${identifier}`;
    }

    /**
     * Build a pre-auth identifier from email + IP.
     * Used before we know the userId.
     */
    static buildPreAuthIdentifier(email: string, ip: string): string {
        return `email:${email.toLowerCase()}:ip:${ip}`;
    }

    // ── Lock check ────────────────────────────────────────────────────────────

    /**
     * Check if an identifier is currently locked.
     * Call this BEFORE password verification.
     */
    static async checkLock(identifier: string): Promise<LockStatus> {
        try {
            const redis = getRedis();
            const lockKey = this.lockKey(identifier);
            const ttl = await redis.ttl(lockKey);

            if (ttl > 0) {
                return {
                    locked: true,
                    lockedUntil: new Date(Date.now() + ttl * 1000),
                    remainingSeconds: ttl,
                };
            }

            // Also check attempt count for informational purposes
            const raw = await redis.get(this.failKey(identifier));
            const record: AttemptRecord = raw ? JSON.parse(raw) : { count: 0, firstAt: 0, lastAt: 0 };

            return { locked: false, attemptCount: record.count };
        } catch {
            // Redis unavailable — fail open (do not block auth)
            logger.warn('[RateLimiter] Redis unavailable for lock check — failing open');
            return { locked: false };
        }
    }

    // ── Record failure ────────────────────────────────────────────────────────

    /**
     * Record a failed login attempt.
     * Applies lock if threshold crossed.
     * Returns updated lock status.
     */
    static async recordFailure(identifier: string): Promise<LockStatus> {
        try {
            const redis = getRedis();
            const failKey = this.failKey(identifier);

            // Get or create attempt record
            const raw = await redis.get(failKey);
            const record: AttemptRecord = raw
                ? JSON.parse(raw)
                : { count: 0, firstAt: Date.now(), lastAt: Date.now() };

            record.count = Math.min(record.count + 1, MAX_TRACKED_ATTEMPTS);
            record.lastAt = Date.now();

            // Persist with sliding window TTL
            await redis.setex(failKey, FAIL_WINDOW_SECONDS, JSON.stringify(record));

            // Determine if we should lock
            const lockSeconds = this.getLockDuration(record.count);
            if (lockSeconds > 0) {
                await redis.setex(this.lockKey(identifier), lockSeconds, '1');
                return {
                    locked: true,
                    lockedUntil: new Date(Date.now() + lockSeconds * 1000),
                    remainingSeconds: lockSeconds,
                    attemptCount: record.count,
                };
            }

            return { locked: false, attemptCount: record.count };
        } catch {
            logger.warn('[RateLimiter] Redis unavailable for failure recording');
            return { locked: false };
        }
    }

    // ── Clear on success ──────────────────────────────────────────────────────

    /**
     * Clear failure record on successful login.
     * Also removes any active lock (admin-initiated unlock).
     */
    static async clearFailures(identifier: string): Promise<void> {
        try {
            const redis = getRedis();
            await redis.del(this.failKey(identifier));
            await redis.del(this.lockKey(identifier));
        } catch {
            logger.warn('[RateLimiter] Redis unavailable for failure clear');
        }
    }

    // ── Admin unlock ──────────────────────────────────────────────────────────

    /**
     * Manually unlock an account (root admin action).
     */
    static async adminUnlock(identifier: string): Promise<void> {
        await this.clearFailures(identifier);
    }

    /**
     * Get current attempt count without modifying state.
     */
    static async getAttemptCount(identifier: string): Promise<number> {
        try {
            const redis = getRedis();
            const raw = await redis.get(this.failKey(identifier));
            if (!raw) return 0;
            const record: AttemptRecord = JSON.parse(raw);
            return record.count;
        } catch {
            return 0;
        }
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    /**
     * Determine lock duration based on attempt count.
     * Returns 0 if no lock should be applied.
     */
    private static getLockDuration(attempts: number): number {
        // Walk thresholds in reverse to find highest applicable
        for (let i = LOCK_THRESHOLDS.length - 1; i >= 0; i--) {
            const threshold = LOCK_THRESHOLDS[i];
            if (threshold && attempts >= threshold.attempts) {
                return threshold.lockSeconds;
            }
        }
        return 0;
    }

    /**
     * Format a human-readable lock message.
     */
    static formatLockMessage(status: LockStatus): string {
        if (!status.locked) return '';
        const mins = Math.ceil((status.remainingSeconds || 0) / 60);
        if (mins < 60) return `Account temporarily locked. Try again in ${mins} minute(s).`;
        const hours = Math.ceil(mins / 60);
        return `Account temporarily locked. Try again in ${hours} hour(s).`;
    }
}

