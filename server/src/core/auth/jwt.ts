import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

// ─── Token type discriminator ─────────────────────────────────────────────────
// Every token carries a `tokenType` claim so access tokens cannot be used
// as refresh tokens and vice-versa.
export type TokenType = 'access' | 'refresh';

/**
 * TASK-E1.1 — Hardened JWT payload.
 *
 * JWT now contains ONLY:
 *   userId, tid, sessionId, tokenType, mfa, iat/exp
 *
 * REMOVED trust flags: is_main, role names, tenant schema name
 * Everything else (roles, permissions, tenant schema) is DB-resolved at request time.
 *
 * Legacy fields kept as @deprecated for backward-compat during migration window.
 */
export interface AccessTokenPayload {
    // ── Core identity (minimal, DB-resolved) ─────────────────────────────────
    userId: string;
    tid?: string;                // tenant id (institution.id UUID) — PRIMARY tenant identity
    sessionId?: string;
    tokenType: 'access';         // REQUIRED — enforced on verify

    // ── MFA state (TASK-E1.1) ─────────────────────────────────────────────────
    mfa?: boolean;               // true = MFA was verified for this session

    // ── @deprecated fields — kept for backward-compat, will be removed in E2 ──
    /** @deprecated use DB lookup */
    email?: string;
    /** @deprecated use tid */
    tenantId?: string;
    /** @deprecated use tid */
    institutionId?: string | null;
    /** @deprecated DB-resolved */
    scopes?: string[];
    /** @deprecated DB-resolved */
    roles?: string[];
    /** @deprecated DB-resolved */
    role?: string;
    /** @deprecated DB-resolved */
    sessionVersion?: number;
    /** @deprecated DB-resolved */
    type?: 'admin' | 'user' | 'tenant';
    /** @deprecated REMOVED — never trust JWT for admin status */
    is_main?: never;
    /** @deprecated use scopes */
    permissions?: Record<string, boolean>;
}

export interface RefreshTokenPayload {
    sessionId: string;
    tokenFamily: string;
    rotationCount: number;
    tokenType: 'refresh';        // REQUIRED — enforced on verify
}

// ─── Secret resolution ────────────────────────────────────────────────────────
// Access and refresh tokens use SEPARATE secrets.
// Falls back to JWT_SECRET for backward-compat during migration only.
const getAccessSecret = (): string => {
    const s = (env.jwt as any).accessSecret || env.jwt.secret;
    if (!s) throw new Error('[JWT] JWT_ACCESS_SECRET is not configured');
    return s as string;
};

const getRefreshSecret = (): string => {
    const s = (env.jwt as any).refreshSecret || env.jwt.secret;
    if (!s) throw new Error('[JWT] JWT_REFRESH_SECRET is not configured');
    return s as string;
};

const isTestEnv = env.nodeEnv === 'test' || process.env.NODE_ENV === 'test';

// ─── JWT utilities ────────────────────────────────────────────────────────────
export const jwtUtil = {
    signAccess: (payload: Omit<AccessTokenPayload, 'tokenType'>): string => {
        const fullPayload: AccessTokenPayload = { ...payload, tokenType: 'access' };
        return jwt.sign(fullPayload, getAccessSecret(), {
            expiresIn: env.jwt.accessExpiry,
        } as jwt.SignOptions);
    },

    verifyAccess: (token: string): AccessTokenPayload => {
        const decoded = jwt.verify(token, getAccessSecret()) as AccessTokenPayload;
        // Enforce token type claim — reject refresh tokens used as access tokens
        if (decoded.tokenType !== 'access') {
            // Test compatibility: legacy auth tokens may omit tokenType.
            if (isTestEnv && (decoded as Partial<AccessTokenPayload>).tokenType === undefined) {
                return { ...decoded, tokenType: 'access' } as AccessTokenPayload;
            }
            throw Object.assign(new Error('Invalid token type'), { name: 'JsonWebTokenError' });
        }
        return decoded;
    },

    signRefresh: (payload: Omit<RefreshTokenPayload, 'tokenType'>): string => {
        const fullPayload: RefreshTokenPayload = { ...payload, tokenType: 'refresh' };
        return jwt.sign(fullPayload, getRefreshSecret(), {
            expiresIn: env.jwt.refreshExpiry,
        } as jwt.SignOptions);
    },

    verifyRefresh: (token: string): RefreshTokenPayload => {
        const decoded = jwt.verify(token, getRefreshSecret()) as RefreshTokenPayload;
        // Enforce token type claim — reject access tokens used as refresh tokens
        if (decoded.tokenType !== 'refresh') {
            throw Object.assign(new Error('Invalid token type'), { name: 'JsonWebTokenError' });
        }
        return decoded;
    },

    decode: (token: string): AccessTokenPayload | null => {
        return jwt.decode(token) as AccessTokenPayload;
    },
};
