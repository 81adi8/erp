/**
 * TASK-E1.2 — JWT Dual-Key Rotation
 *
 * Implements zero-logout key rotation:
 *   - Active key: used for signing new tokens
 *   - Previous key: used for verifying tokens signed before rotation
 *   - Verification tries active key first, then previous key
 *   - Previous key expires after 2h (all old tokens expired by then)
 *
 * Integration with SecretManager:
 *   - Keys fetched from SecretManager (AWS SM in prod, env in dev)
 *   - Rotation: SecretManager.rotate('JWT_ACCESS_SECRET') → preserves previous
 *   - jwtRotation.verifyAccess() handles dual-key verification transparently
 */

import jwt from 'jsonwebtoken';
import { secretManager } from '../secrets/secret.provider';
import type { AccessTokenPayload, RefreshTokenPayload } from './jwt';

// ─── Key resolution ───────────────────────────────────────────────────────────

async function getActiveAccessSecret(): Promise<string> {
    return secretManager.get('JWT_ACCESS_SECRET');
}

async function getPreviousAccessSecret(): Promise<string | null> {
    try {
        return await secretManager.get('JWT_ACCESS_SECRET_PREVIOUS');
    } catch {
        return null;
    }
}

async function getActiveRefreshSecret(): Promise<string> {
    return secretManager.get('JWT_REFRESH_SECRET');
}

async function getPreviousRefreshSecret(): Promise<string | null> {
    try {
        return await secretManager.get('JWT_REFRESH_SECRET_PREVIOUS');
    } catch {
        return null;
    }
}

// ─── JWT Rotation Utilities ───────────────────────────────────────────────────

export const jwtRotation = {
    /**
     * Sign an access token using the current active key.
     */
    async signAccess(payload: Omit<AccessTokenPayload, 'tokenType'>): Promise<string> {
        const secret = await getActiveAccessSecret();
        const fullPayload: AccessTokenPayload = { ...payload, tokenType: 'access' };
        const expiresIn = process.env.JWT_ACCESS_EXPIRY || '15m';
        return jwt.sign(fullPayload, secret, { expiresIn } as jwt.SignOptions);
    },

    /**
     * Verify an access token.
     * Tries active key first, then previous key (dual-key rotation support).
     * This allows tokens signed before rotation to remain valid during the
     * 2-hour overlap window.
     */
    async verifyAccess(token: string): Promise<AccessTokenPayload> {
        const activeSecret = await getActiveAccessSecret();

        try {
            const decoded = jwt.verify(token, activeSecret) as AccessTokenPayload;
            if (decoded.tokenType !== 'access') {
                throw Object.assign(new Error('Invalid token type'), { name: 'JsonWebTokenError' });
            }
            return decoded;
        } catch (err: any) {
            // If verification failed with active key, try previous key
            if (err.name === 'JsonWebTokenError' && err.message !== 'Invalid token type') {
                const previousSecret = await getPreviousAccessSecret();
                if (previousSecret) {
                    try {
                        const decoded = jwt.verify(token, previousSecret) as AccessTokenPayload;
                        if (decoded.tokenType !== 'access') {
                            throw Object.assign(new Error('Invalid token type'), { name: 'JsonWebTokenError' });
                        }
                        // Token valid with previous key — still accepted during rotation window
                        return decoded;
                    } catch {
                        // Previous key also failed — token is truly invalid
                    }
                }
            }
            throw err;
        }
    },

    /**
     * Sign a refresh token using the current active refresh key.
     */
    async signRefresh(payload: Omit<RefreshTokenPayload, 'tokenType'>): Promise<string> {
        const secret = await getActiveRefreshSecret();
        const fullPayload: RefreshTokenPayload = { ...payload, tokenType: 'refresh' };
        const expiresIn = process.env.JWT_REFRESH_EXPIRY || '30d';
        return jwt.sign(fullPayload, secret, { expiresIn } as jwt.SignOptions);
    },

    /**
     * Verify a refresh token with dual-key support.
     */
    async verifyRefresh(token: string): Promise<RefreshTokenPayload> {
        const activeSecret = await getActiveRefreshSecret();

        try {
            const decoded = jwt.verify(token, activeSecret) as RefreshTokenPayload;
            if (decoded.tokenType !== 'refresh') {
                throw Object.assign(new Error('Invalid token type'), { name: 'JsonWebTokenError' });
            }
            return decoded;
        } catch (err: any) {
            if (err.name === 'JsonWebTokenError' && err.message !== 'Invalid token type') {
                const previousSecret = await getPreviousRefreshSecret();
                if (previousSecret) {
                    try {
                        const decoded = jwt.verify(token, previousSecret) as RefreshTokenPayload;
                        if (decoded.tokenType !== 'refresh') {
                            throw Object.assign(new Error('Invalid token type'), { name: 'JsonWebTokenError' });
                        }
                        return decoded;
                    } catch {
                        // Previous key also failed
                    }
                }
            }
            throw err;
        }
    },

    /**
     * Trigger a key rotation.
     * Old key is preserved as 'previous' for the 2h verification window.
     * New tokens will be signed with the new key immediately.
     */
    async rotateAccessKey(): Promise<{ success: boolean; error?: string }> {
        try {
            const event = await secretManager.rotate('JWT_ACCESS_SECRET');
            return { success: event.success, error: event.error };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    async rotateRefreshKey(): Promise<{ success: boolean; error?: string }> {
        try {
            const event = await secretManager.rotate('JWT_REFRESH_SECRET');
            return { success: event.success, error: event.error };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },
};
