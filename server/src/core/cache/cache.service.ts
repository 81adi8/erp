/**
 * TASK-04: UNIFIED CACHING STRATEGY
 *
 * Three-tier cache architecture:
 *   L1 — Request-scoped in-memory (per-request, zero latency)
 *   L2 — Redis distributed (cross-instance, TTL-controlled)
 *   L3 — DB fallback (source of truth)
 *
 * Cache domains with TTLs:
 *   RBAC permissions     → 5 min
 *   Student profile      → 2 min
 *   Attendance daily     → 1 min
 *   Institution metadata → 15 min
 *
 * Rules:
 *   - All keys are tenant-scoped: tenant:{tenantId}:...
 *   - No global KEYS scanning in hot paths (use SCAN or structured patterns)
 *   - Cache invalidation hooks per entity type
 */

import { redis, getRedis } from '../../config/redis';
import { logger } from '../utils/logger';

// ─── TTL constants (seconds) ──────────────────────────────────────────────────
export const CacheTTLSeconds = {
    RBAC_PERMISSIONS:     5 * 60,   // 5 min
    STUDENT_PROFILE:      2 * 60,   // 2 min
    ATTENDANCE_DAILY:     1 * 60,   // 1 min
    INSTITUTION_METADATA: 15 * 60,  // 15 min
    TENANT_BRANDING:      10 * 60,  // 10 min
    PERMISSION_CONFIG:    60 * 60,  // 1 hour
    USER_ROLES:           15 * 60,  // 15 min
    EXAM_DATA:            5 * 60,   // 5 min
    LOGIN_ATTEMPTS:       15 * 60,  // 15 min
    SESSION:              30 * 60,  // 30 min
} as const;

// ─── L1: Request-scoped in-memory cache ──────────────────────────────────────
// Lives only for the duration of a single request.
// Prevents repeated Redis calls within the same request.

const L1_STORE = new Map<string, { value: any; expiresAt: number }>();
const L1_MAX_ENTRIES = 500; // Safety cap to prevent memory bloat

export class L1Cache {
    private static store = L1_STORE;

    static get<T>(key: string): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.value as T;
    }

    static set<T>(key: string, value: T, ttlMs: number = 60000): void {
        // Evict oldest entry if at capacity
        if (this.store.size >= L1_MAX_ENTRIES) {
            const firstKey = this.store.keys().next().value;
            if (firstKey) this.store.delete(firstKey);
        }
        this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    }

    static del(key: string): void {
        this.store.delete(key);
    }

    static delPattern(pattern: string): void {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        for (const key of this.store.keys()) {
            if (regex.test(key)) this.store.delete(key);
        }
    }

    static clear(): void {
        this.store.clear();
    }

    static size(): number {
        return this.store.size;
    }
}

// ─── Cache key builder ────────────────────────────────────────────────────────
// All keys are tenant-scoped to prevent cross-tenant bleed.

export const CacheKey = {
    // RBAC
    rbacPermissions: (tenantId: string, userId: string) =>
        `tenant:${tenantId}:rbac:user:${userId}:permissions`,
    rbacRole: (tenantId: string, roleSlug: string) =>
        `tenant:${tenantId}:rbac:role:${roleSlug}`,

    // Student
    studentProfile: (tenantId: string, studentId: string) =>
        `tenant:${tenantId}:student:${studentId}:profile`,
    studentList: (tenantId: string, classId: string, page: number) =>
        `tenant:${tenantId}:student:list:class:${classId}:page:${page}`,

    // Attendance
    attendanceDaily: (tenantId: string, classId: string, date: string) =>
        `tenant:${tenantId}:attendance:class:${classId}:date:${date}`,

    // Institution / Tenant metadata
    institutionMeta: (tenantId: string, institutionId: string) =>
        `tenant:${tenantId}:institution:${institutionId}:meta`,
    tenantMeta: (tenantId: string) =>
        `tenant:${tenantId}:meta`,

    // Exam
    examData: (tenantId: string, examId: string) =>
        `tenant:${tenantId}:exam:${examId}`,
    examList: (tenantId: string, classId: string) =>
        `tenant:${tenantId}:exam:list:class:${classId}`,

    // Auth / Session
    loginAttempts: (ip: string) =>
        `security:login:attempts:${ip}`,
    // MT-03 FIX: Added tenantId to lockout cache key for proper tenant isolation
    accountLockout: (tenantId: string, userId: string) =>
        `security:lockout:${tenantId}:${userId}`,
    session: (sessionId: string) =>
        `session:${sessionId}`,

    // Config
    permissionConfig: () => 'config:permissions:all',
    planPermissions: (planId: string) => `config:plan:${planId}:permissions`,
} as const;

// ─── Invalidation patterns ────────────────────────────────────────────────────
// Use SCAN-based invalidation — never KEYS in production hot paths.

export const InvalidationPattern = {
    allTenantData:    (tenantId: string) => `tenant:${tenantId}:*`,
    tenantRbac:       (tenantId: string) => `tenant:${tenantId}:rbac:*`,
    tenantStudents:   (tenantId: string) => `tenant:${tenantId}:student:*`,
    tenantAttendance: (tenantId: string) => `tenant:${tenantId}:attendance:*`,
    tenantExams:      (tenantId: string) => `tenant:${tenantId}:exam:*`,
    userRbac:         (tenantId: string, userId: string) =>
        `tenant:${tenantId}:rbac:user:${userId}:*`,
} as const;

// ─── Main CacheService ────────────────────────────────────────────────────────

export class CacheService {

    // ── L2: Redis get ──────────────────────────────────────────────────────────
    static async get<T>(key: string): Promise<T | null> {
        try {
            const value = await redis.get(key);
            if (!value) return null;
            return JSON.parse(value) as T;
        } catch (error) {
            logger.error(`[Cache:L2] Error getting key "${key}":`, error);
            return null;
        }
    }

    // ── L2: Redis set ──────────────────────────────────────────────────────────
    static async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        try {
            const serialized = JSON.stringify(value);
            if (ttlSeconds) {
                await redis.setex(key, ttlSeconds, serialized);
            } else {
                await redis.set(key, serialized);
            }
        } catch (error) {
            logger.error(`[Cache:L2] Error setting key "${key}":`, error);
            // Cache failure is non-fatal — continue
        }
    }

    // ── L2: Redis delete ───────────────────────────────────────────────────────
    static async del(key: string): Promise<void> {
        try {
            await redis.del(key);
        } catch (error) {
            logger.error(`[Cache:L2] Error deleting key "${key}":`, error);
        }
    }

    /**
     * Delete keys matching a pattern using SCAN (safe for production).
     * Never uses KEYS command which blocks Redis.
     */
    static async delPattern(pattern: string): Promise<number> {
        // Also clear L1
        L1Cache.delPattern(pattern);

        try {
            const client = getRedis();
            let cursor = '0';
            let deleted = 0;

            do {
                const [nextCursor, keys] = await client.scan(
                    cursor,
                    'MATCH', pattern,
                    'COUNT', 100
                );
                cursor = nextCursor;

                if (keys.length > 0) {
                    await client.del(...keys);
                    deleted += keys.length;
                }
            } while (cursor !== '0');

            return deleted;
        } catch (error) {
            logger.error(`[Cache:L2] Error deleting pattern "${pattern}":`, error);
            return 0;
        }
    }

    /**
     * L1 → L2 → L3 (fetcher) read-through cache.
     *
     * 1. Check L1 (in-memory, request-scoped)
     * 2. Check L2 (Redis)
     * 3. Call fetcher (DB) and populate L2 + L1
     */
    static async getOrSet<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttlSeconds?: number,
        l1TtlMs?: number
    ): Promise<T> {
        // ── L1 check ─────────────────────────────────────────────────────────
        const l1Value = L1Cache.get<T>(key);
        if (l1Value !== null) {
            return l1Value;
        }

        // ── L2 check ─────────────────────────────────────────────────────────
        const l2Value = await this.get<T>(key);
        if (l2Value !== null) {
            // Populate L1 from L2 hit
            L1Cache.set(key, l2Value, l1TtlMs ?? 30000);
            return l2Value;
        }

        // ── L3: DB fetch ──────────────────────────────────────────────────────
        const value = await fetcher();

        // Populate L2 and L1
        await this.set(key, value, ttlSeconds);
        L1Cache.set(key, value, l1TtlMs ?? 30000);

        return value;
    }

    /**
     * Check if a key exists in L2 (Redis).
     */
    static async exists(key: string): Promise<boolean> {
        try {
            return (await redis.exists(key)) === 1;
        } catch (error) {
            logger.error(`[Cache:L2] Error checking key "${key}":`, error);
            return false;
        }
    }

    /**
     * Increment a counter (rate limiting, login attempts).
     * Sets TTL only on first increment.
     */
    static async incr(key: string, ttlSeconds?: number): Promise<number> {
        try {
            const client = getRedis();
            const value = await client.incr(key);
            if (ttlSeconds && value === 1) {
                await client.expire(key, ttlSeconds);
            }
            return value;
        } catch (error) {
            logger.error(`[Cache:L2] Error incrementing key "${key}":`, error);
            return 0;
        }
    }

    /**
     * Get TTL of a key in seconds.
     */
    static async ttl(key: string): Promise<number> {
        try {
            return await redis.ttl(key);
        } catch (error) {
            logger.error(`[Cache:L2] Error getting TTL for "${key}":`, error);
            return -1;
        }
    }
}

// ─── Invalidation hooks ───────────────────────────────────────────────────────
// Call these when entities are mutated to keep cache consistent.

export class CacheInvalidation {

    /**
     * Invalidate all RBAC data for a user (role change, permission update).
     */
    static async onUserRoleChange(tenantId: string, userId: string): Promise<void> {
        const pattern = InvalidationPattern.userRbac(tenantId, userId);
        await CacheService.delPattern(pattern);
        L1Cache.delPattern(pattern);
    }

    /**
     * Invalidate all RBAC data for a tenant (bulk role update).
     */
    static async onTenantRbacChange(tenantId: string): Promise<void> {
        const pattern = InvalidationPattern.tenantRbac(tenantId);
        await CacheService.delPattern(pattern);
        L1Cache.delPattern(pattern);
    }

    /**
     * Invalidate student profile cache.
     */
    static async onStudentUpdate(tenantId: string, studentId: string): Promise<void> {
        const key = CacheKey.studentProfile(tenantId, studentId);
        await CacheService.del(key);
        L1Cache.del(key);

        // Also invalidate list caches for this tenant
        const listPattern = `tenant:${tenantId}:student:list:*`;
        await CacheService.delPattern(listPattern);
    }

    /**
     * Invalidate attendance cache for a class/date.
     */
    static async onAttendanceUpdate(
        tenantId: string,
        classId: string,
        date: string
    ): Promise<void> {
        const key = CacheKey.attendanceDaily(tenantId, classId, date);
        await CacheService.del(key);
        L1Cache.del(key);
    }

    /**
     * Invalidate institution metadata cache.
     */
    static async onInstitutionUpdate(tenantId: string, institutionId: string): Promise<void> {
        const key = CacheKey.institutionMeta(tenantId, institutionId);
        await CacheService.del(key);
        L1Cache.del(key);

        const tenantKey = CacheKey.tenantMeta(tenantId);
        await CacheService.del(tenantKey);
        L1Cache.del(tenantKey);
    }

    /**
     * Invalidate exam cache.
     */
    static async onExamUpdate(tenantId: string, examId: string, classId?: string): Promise<void> {
        const key = CacheKey.examData(tenantId, examId);
        await CacheService.del(key);
        L1Cache.del(key);

        if (classId) {
            const listKey = CacheKey.examList(tenantId, classId);
            await CacheService.del(listKey);
            L1Cache.del(listKey);
        }
    }

    /**
     * Full tenant cache wipe (tenant suspension, plan change).
     * Uses SCAN — safe for production.
     */
    static async onTenantWipe(tenantId: string): Promise<void> {
        const pattern = InvalidationPattern.allTenantData(tenantId);
        await CacheService.delPattern(pattern);
        L1Cache.delPattern(pattern);
    }

    /**
     * Invalidate global permission config (admin permission change).
     */
    static async onPermissionConfigChange(): Promise<void> {
        await CacheService.del(CacheKey.permissionConfig());
        L1Cache.del(CacheKey.permissionConfig());
    }
}

export default CacheService;

