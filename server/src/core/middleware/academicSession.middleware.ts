// ============================================================================
// Academic Session Context Middleware
// ============================================================================
// Ensures that `req.academicSessionId` is ALWAYS available for downstream
// controllers and services.
//
// Resolution order:
//   1. X-Academic-Session-ID header (from frontend selector)
//   2. Database lookup: the current active session for the tenant
//
// If neither source yields a session ID, the request continues without
// one — services that require it should throw a clear error.
// ============================================================================

/// <reference path="../../types/express.d.ts" />

import { Request, Response, NextFunction } from 'express';
import { AcademicSession } from '../../database/models/school/academics/session/AcademicSession.model';
import { logger } from '../utils/logger';

// ============================================================================
// In-memory cache to avoid repeated DB lookups
// ============================================================================
// Key = institution_id, Value = { sessionId, expiresAt }
// TTL of 5 minutes — balances freshness with performance.

interface CacheEntry {
    sessionId: string;
    expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const currentSessionCache = new Map<string, CacheEntry>();

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            academicSessionId?: string;
        }
    }
}

// ============================================================================
// Middleware
// ============================================================================

/**
 * Resolves the academic session for the current request.
 *
 * 1. If `X-Academic-Session-ID` header is present and valid → use it.
 * 2. Otherwise, look up (with cache) the `is_current = true` session for the tenant.
 * 3. Attaches the result to `req.academicSessionId`.
 */
export async function academicSessionMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        // ── Priority 1: Header from frontend ───────────────────────────
        const headerSessionId = req.headers['x-academic-session-id'] as string | undefined;

        if (headerSessionId && isValidUUID(headerSessionId)) {
            req.academicSessionId = headerSessionId;
            return next();
        }

        // ── Priority 2: Database – Current session for this tenant ─────
        const tenant = req.tenant as
            | { id: string; db_schema: string }
            | undefined;

        if (!tenant?.id || !tenant?.db_schema) {
            // No tenant context yet — let it pass through
            return next();
        }

        const sessionId = await getCurrentSessionId(tenant.id, tenant.db_schema);

        if (sessionId) {
            req.academicSessionId = sessionId;
        }

        next();
    } catch (error) {
        // Non-blocking: log and continue without session context
        logger.error('[AcademicSessionMiddleware] Error resolving session:', error);
        next();
    }
}

// ============================================================================
// Cache-backed DB Lookup
// ============================================================================

async function getCurrentSessionId(
    institutionId: string,
    schemaName: string,
): Promise<string | null> {
    // Check cache first
    const cached = currentSessionCache.get(institutionId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.sessionId;
    }

    // Cache miss or expired — query DB
    const currentSession = await AcademicSession.schema(schemaName).findOne({
        where: {
            institution_id: institutionId,
            is_current: true,
        },
        attributes: ['id'],
        raw: true,
    });

    if (currentSession) {
        // Update cache
        currentSessionCache.set(institutionId, {
            sessionId: currentSession.id,
            expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return currentSession.id;
    }

    return null;
}

// ============================================================================
// Cache Invalidation (exported for use by session management services)
// ============================================================================

/**
 * Call this when the current session changes (e.g., admin sets a new
 * session as current) to immediately invalidate the cached value.
 */
export function invalidateSessionCache(institutionId: string): void {
    currentSessionCache.delete(institutionId);
}

/**
 * Clear the entire session cache. Useful during testing or deployments.
 */
export function clearSessionCache(): void {
    currentSessionCache.clear();
}

// ============================================================================
// Helpers
// ============================================================================

function isValidUUID(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
