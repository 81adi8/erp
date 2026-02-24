/**
 * Root Auth Guard Middleware
 *
 * PURPOSE: Authenticate root-admin requests WITHOUT requiring tenant context.
 *
 * The standard `authGuard` hard-fails when `req.tenant` is missing because
 * tenant-scoped school routes always have a tenant. Root-admin routes are
 * mounted at /v1/root/admin/* which has NO tenant middleware in the chain,
 * so `req.tenant` is always undefined there — causing every protected root
 * endpoint to return 403 TENANT_INVALID.
 *
 * This guard:
 *   1. Validates the JWT (same jwtUtil.verifyAccess — same secret, same claims)
 *   2. Checks session revocation via Redis
 *   3. Enforces token type === 'access'
 *   4. Rejects is_main flag in token (TASK-E1.1)
 *   5. Does NOT check req.tenant — root admins have no tenant
 *   6. Does NOT check tid/tenantId claim — root tokens have none
 *
 * SECURITY: Root identity is verified by rootAuthMiddleware (DB lookup of
 * Admin model + session validity). This guard is the JWT gate; rootAuthMiddleware
 * is the DB gate. Both are required on protected root routes.
 */

import { Response, NextFunction } from 'express';
import { CustomRequest } from '../types/CustomRequest';
import { jwtUtil } from '../auth/jwt';
import { ApiError } from '../http/ApiError';
import { HttpStatus } from '../http/HttpStatus';
import { getRedis } from '../../config/redis';
import { logger } from '../utils/logger';

// ─── Session revocation check ─────────────────────────────────────────────────
const isSessionRevoked = async (sessionId: string): Promise<boolean> => {
    try {
        const client = getRedis();
        const key = `session:revoked:${sessionId}`;
        const result = await client.exists(key);
        return result === 1;
    } catch {
        logger.warn('[RootAuthGuard] Redis unavailable for session revocation check');
        return false;
    }
};

// ─── Root auth guard ──────────────────────────────────────────────────────────
export const rootAuthGuard = async (req: CustomRequest, res: Response, next: NextFunction) => {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token && req.cookies?.auth_token) {
        token = req.cookies.auth_token;
    }

    if (!token) {
        return next(new ApiError(HttpStatus.UNAUTHORIZED, 'No authentication token provided'));
    }

    try {
        // verifyAccess enforces tokenType === 'access' internally
        const payload = jwtUtil.verifyAccess(token);

        // ── TASK-E1.1: Reject any token carrying is_main trust flag ──────────
        if ('is_main' in payload) {
            return next(new ApiError(HttpStatus.UNAUTHORIZED, 'INVALID_TOKEN'));
        }

        // ── Session revocation check ──────────────────────────────────────────
        if (payload.sessionId) {
            const revoked = await isSessionRevoked(payload.sessionId);
            if (revoked) {
                return next(new ApiError(HttpStatus.UNAUTHORIZED, 'SESSION_REVOKED'));
            }
        }

        // ── Root tokens have no tenant — skip tenant validation entirely ──────
        // (This is the key difference from authGuard)

        req.user = {
            userId: payload.userId,
            email: '',
            roles: payload.roles || [],
            permissions: payload.permissions ? Object.keys(payload.permissions) : [],
            scopes: payload.scopes,
            tenantId: undefined,
            institutionId: undefined,
        };

        next();
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.name === 'TokenExpiredError') {
                return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Token expired'));
            }
            if (error.name === 'JsonWebTokenError') {
                return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Invalid token'));
            }
        }
        return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Authentication failed'));
    }
};
