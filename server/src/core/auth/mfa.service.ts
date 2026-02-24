/**
 * TASK-E1.1 — MFA Service (TOTP-based)
 *
 * Mandatory for: root admins, tenant admins, super users
 * Uses otplib (already in package.json) for TOTP generation/verification.
 * QR code generation via qrcode package.
 *
 * Flow:
 *   1. POST /auth/mfa/setup   → generate secret + QR URI
 *   2. User scans QR in authenticator app
 *   3. POST /auth/mfa/verify  → verify first TOTP code → enable MFA
 *   4. All subsequent logins require TOTP after password
 */

import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { getRedis } from '../../config/redis';

// ─── Configuration ────────────────────────────────────────────────────────────

const MFA_ISSUER = 'ERP Platform';
const MFA_SETUP_TTL_SECONDS = 10 * 60; // 10 min to complete setup
const MFA_TOKEN_TTL_SECONDS = 5 * 60;  // 5 min MFA challenge token
const TOTP_WINDOW = 1;                  // ±1 step tolerance (30s each)

authenticator.options = {
    window: TOTP_WINDOW,
    step: 30,
    digits: 6,
    algorithm: 'sha1' as any,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MfaSetupResult {
    secret: string;
    otpauthUrl: string;
    qrCodeDataUrl: string;
    backupCodes: string[];
}

export interface MfaVerifyResult {
    valid: boolean;
    error?: string;
}

// ─── MFA Service ─────────────────────────────────────────────────────────────

export class MfaService {

    // ── Secret generation ─────────────────────────────────────────────────────

    /**
     * Generate a new TOTP secret and QR code for setup.
     * Stores the pending secret in Redis until verified.
     */
    static async generateSetup(
        userId: string,
        email: string
    ): Promise<MfaSetupResult> {
        const secret = authenticator.generateSecret(32);
        const otpauthUrl = authenticator.keyuri(email, MFA_ISSUER, secret);
        const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
        const backupCodes = this.generateBackupCodes();

        // Store pending setup in Redis (not yet active — user must verify first)
        const redis = getRedis();
        await redis.setex(
            `mfa:setup:${userId}`,
            MFA_SETUP_TTL_SECONDS,
            JSON.stringify({ secret, backupCodes })
        );

        return { secret, otpauthUrl, qrCodeDataUrl, backupCodes };
    }

    /**
     * Verify a TOTP code against a pending setup secret.
     * Returns the secret if valid (caller must persist to DB).
     */
    static async verifySetupCode(
        userId: string,
        totpCode: string
    ): Promise<{ valid: boolean; secret?: string; backupCodes?: string[]; error?: string }> {
        const redis = getRedis();
        const raw = await redis.get(`mfa:setup:${userId}`);

        if (!raw) {
            return { valid: false, error: 'MFA setup session expired. Please restart setup.' };
        }

        const { secret, backupCodes } = JSON.parse(raw);
        const isValid = authenticator.verify({ token: totpCode, secret });

        if (!isValid) {
            return { valid: false, error: 'Invalid TOTP code' };
        }

        // Clean up pending setup
        await redis.del(`mfa:setup:${userId}`);

        return { valid: true, secret, backupCodes };
    }

    // ── TOTP verification ─────────────────────────────────────────────────────

    /**
     * Verify a TOTP code against a stored secret.
     * Used during login MFA challenge.
     */
    static verifyTotp(totpCode: string, secret: string): MfaVerifyResult {
        try {
            const isValid = authenticator.verify({ token: totpCode, secret });
            return isValid
                ? { valid: true }
                : { valid: false, error: 'Invalid or expired TOTP code' };
        } catch {
            return { valid: false, error: 'TOTP verification error' };
        }
    }

    /**
     * Verify a backup code (single-use).
     * Returns the remaining backup codes if valid.
     */
    static verifyBackupCode(
        inputCode: string,
        storedCodes: string[]
    ): { valid: boolean; remainingCodes?: string[]; error?: string } {
        const normalised = inputCode.trim().toUpperCase();
        const idx = storedCodes.findIndex(c => c === normalised);

        if (idx === -1) {
            return { valid: false, error: 'Invalid backup code' };
        }

        const remainingCodes = storedCodes.filter((_, i) => i !== idx);
        return { valid: true, remainingCodes };
    }

    // ── MFA challenge tokens ──────────────────────────────────────────────────

    /**
     * PATCH-A: Issue a short-lived MFA challenge token after password verification.
     *
     * Token is bound to:
     *   - userId (prevents token transfer between users)
     *   - ipHash (prevents replay from different IP)
     *   - deviceHash (prevents replay from different device)
     *   - expiresAt (5-min TTL)
     *   - used: false (single-use flag)
     *
     * On verify: ip/device mismatch → reject; used=true → reject
     */
    static async issueMfaChallengeToken(
        userId: string,
        sessionId: string,
        schemaName: string,
        ip?: string,
        deviceHash?: string
    ): Promise<string> {
        const token = crypto.randomBytes(32).toString('hex');
        const redis = getRedis();

        const ipHash = ip
            ? crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16)
            : null;

        await redis.setex(
            `mfa:challenge:${token}`,
            MFA_TOKEN_TTL_SECONDS,
            JSON.stringify({
                userId,
                sessionId,
                schemaName,
                ipHash,
                deviceHash: deviceHash || null,
                issuedAt: Date.now(),
                used: false,
            })
        );

        return token;
    }

    /**
     * PATCH-A: Consume an MFA challenge token (single-use, IP+device bound).
     *
     * Rejects if:
     *   - Token not found / expired
     *   - Token already used (used=true)
     *   - IP hash mismatch (replay from different IP)
     *   - Device hash mismatch (replay from different device)
     */
    static async consumeMfaChallengeToken(
        token: string,
        ip?: string,
        deviceHash?: string
    ): Promise<{ valid: boolean; userId?: string; sessionId?: string; schemaName?: string; error?: string }> {
        const redis = getRedis();
        const key = `mfa:challenge:${token}`;
        const raw = await redis.get(key);

        if (!raw) {
            return { valid: false, error: 'MFA challenge token expired or invalid' };
        }

        const data = JSON.parse(raw);

        // Single-use enforcement
        if (data.used) {
            return { valid: false, error: 'MFA challenge token already used' };
        }

        // IP binding check
        if (data.ipHash && ip) {
            const incomingIpHash = crypto
                .createHash('sha256').update(ip).digest('hex').slice(0, 16);
            if (incomingIpHash !== data.ipHash) {
                // Mark as used to prevent further attempts with this token
                await redis.setex(key, 60, JSON.stringify({ ...data, used: true }));
                return { valid: false, error: 'MFA challenge token IP mismatch — possible replay attack' };
            }
        }

        // Device binding check
        if (data.deviceHash && deviceHash && data.deviceHash !== deviceHash) {
            await redis.setex(key, 60, JSON.stringify({ ...data, used: true }));
            return { valid: false, error: 'MFA challenge token device mismatch — possible replay attack' };
        }

        // Mark as used immediately (atomic delete — single-use)
        await redis.del(key);

        return {
            valid: true,
            userId: data.userId,
            sessionId: data.sessionId,
            schemaName: data.schemaName,
        };
    }

    // ── Backup codes ──────────────────────────────────────────────────────────

    /**
     * Generate 10 cryptographically random backup codes.
     * Format: XXXX-XXXX (8 uppercase alphanumeric chars)
     */
    static generateBackupCodes(count = 10): string[] {
        return Array.from({ length: count }, () => {
            const part1 = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
            const part2 = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
            return `${part1}-${part2}`;
        });
    }

    /**
     * Hash backup codes for storage (SHA-256).
     */
    static hashBackupCodes(codes: string[]): string[] {
        return codes.map(c =>
            crypto.createHash('sha256').update(c).digest('hex')
        );
    }

    // ── Role-based MFA requirement ────────────────────────────────────────────

    /**
     * Determine if a user requires MFA based on their roles.
     * root, tenant_admin, super_admin, admin → mandatory MFA
     */
    static requiresMfa(roles: string[]): boolean {
        const MFA_REQUIRED_ROLES = new Set([
            'root',
            'root_admin',
            'super_admin',
            'tenant_admin',
            'admin',
        ]);
        return roles.some(r => MFA_REQUIRED_ROLES.has(r.toLowerCase()));
    }
}
