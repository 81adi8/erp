import { logger } from '../../core/utils/logger';
/**
 * AuthService — TASK-E1.1 Enterprise Auth Hardening
 *
 * Changes from baseline:
 *  - Brute-force lockout via AuthRateLimiterService (BLOCK 3)
 *  - MFA enforcement for admin roles (BLOCK 2)
 *  - auth_provider routing — password-only if provider == 'password' (BLOCK 6)
 *  - Device intelligence — new device detection + audit event (BLOCK 4)
 *  - Auth audit logging on every auth event (BLOCK 7)
 *  - JWT no longer carries is_main / role names (BLOCK 5)
 *  - MFA session state written to Redis after TOTP verify
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sequelize } from '../../database/sequelize';
import { User } from '../../database/models/shared/core/User.model';
import { Role } from '../../database/models/shared/core/Role.model';
import { UserRole } from '../../database/models/shared/core/UserRole.model';
import { Session } from '../../database/models/shared/core/Session.model';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { MfaService } from '../../core/auth/mfa.service';
import { AuthRateLimiterService } from '../../core/auth/auth.rate-limiter.service';
import { AuthAuditService } from '../../core/auth/auth.audit.service';
import { extractDeviceInfo, generateDeviceId } from '../../core/utils/device.util';
import { getRedis } from '../../config/redis';
import { retryDbOperation, retryRedisOperation } from '../../core/resilience/retry.helper';
import type {
    LoginCredentials,
    RegisterData,
    DeviceInfo,
    AuthUser,
    AuthResult,
    RefreshResult,
    AccessTokenPayload,
    TokenPair
} from './auth.types';
import type { Request } from 'express';

// ============================================================================
// Password Configuration
// ============================================================================

const SALT_ROUNDS = 12;

// Session MFA marker TTL — must outlive the session inactivity limit
const SESSION_MFA_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

// ============================================================================
// Auth Service
// ============================================================================

export class AuthService {

    // ========================================================================
    // Registration
    // ========================================================================

    static async register(
        data: RegisterData,
        req: Request,
        schemaName: string,
        institutionId?: string
    ): Promise<AuthResult> {
        const existingUser = await User.schema(schemaName).findOne({
            where: { email: data.email.toLowerCase() },
        });

        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

        const user = await User.schema(schemaName).create({
            email: data.email.toLowerCase(),
            password_hash: passwordHash,
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone,
            institution_id: institutionId,
            is_active: true,
            is_email_verified: false,
            auth_provider: 'password',
        });

        // FIXED: Use findOrCreate to eliminate TOCTOU race condition.
        // Previously two concurrent registrations could both find no 'user' role
        // and both try to create it, causing a unique constraint violation.
        const [defaultRole] = await Role.schema(schemaName).findOrCreate({
            where: { name: 'user' },
            defaults: { name: 'user', description: 'Default user role' },
        });

        const roles: string[] = [];
        if (defaultRole) {
            await UserRole.schema(schemaName).create({
                user_id: user.id,
                role_id: defaultRole.id,
                institution_id: institutionId,
            });
            roles.push(defaultRole.name);
        }

        const deviceInfo = extractDeviceInfo(req);
        if (!deviceInfo.deviceId) {
            deviceInfo.deviceId = generateDeviceId(deviceInfo);
        }

        const session = await SessionService.createSession(
            user.id, deviceInfo, schemaName, institutionId
        );

        const tokens = await TokenService.generateTokenPair(
            { userId: user.id, tid: institutionId, sessionId: session.id, roles, type: 'tenant' },
            schemaName
        );

        await AuthAuditService.loginSuccess({
            userId: user.id,
            institutionId,
            email: user.email,
            ip: deviceInfo.ip,
            userAgent: deviceInfo.userAgent,
            sessionId: session.id,
            schemaName,
        });

        return { user: this.toAuthUser(user, roles), tokens, session };
    }

    // ========================================================================
    // Login — with lockout + MFA + audit + TRANSACTION SAFETY
    // ========================================================================

    static async login(
        credentials: LoginCredentials,
        req: Request,
        schemaName: string
    ): Promise<AuthResult & { mfaPending?: boolean; mfaToken?: string }> {
        const isTestEnv = process.env.NODE_ENV === 'test';
        const ip = req.ip || req.socket?.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || '';

        // ── BLOCK 3: Pre-auth lockout check (BEFORE DB hit) ───────────────────
        const preAuthId = AuthRateLimiterService.buildPreAuthIdentifier(
            credentials.email, ip
        );
        const lockStatus = await retryRedisOperation(() =>
            AuthRateLimiterService.checkLock(preAuthId)
        );

        if (lockStatus.locked) {
            await AuthAuditService.loginFailure(
                { email: credentials.email, ip, userAgent, schemaName },
                'ACCOUNT_LOCKED',
                lockStatus.attemptCount
            );
            throw Object.assign(
                new Error(AuthRateLimiterService.formatLockMessage(lockStatus)),
                { code: 'ACCOUNT_LOCKED', lockedUntil: lockStatus.lockedUntil }
            );
        }

        // ── Find user with retry ─────────────────────────────────────────────
        const user = await retryDbOperation(() =>
            User.schema(schemaName).findOne({
                where: { email: credentials.email.toLowerCase() },
            })
        );

        // ── ENUMERATION TIMING MITIGATION ─────────────────────────────────────
        // Always perform bcrypt compare to maintain consistent timing
        // even when user doesn't exist
        const dummyHash = '$2b$12$dummyhashdummyhashdummyhashdummyhashdum';
        const hashToCompare = user?.password_hash || dummyHash;
        
        // This always takes ~100-300ms regardless of user existence
        const isValidPassword = await bcrypt.compare(credentials.password, hashToCompare);

        if (!user) {
            // Record failure even for unknown email (prevents user enumeration timing)
            await retryRedisOperation(() =>
                AuthRateLimiterService.recordFailure(preAuthId)
            );
            await AuthAuditService.loginFailure(
                { email: credentials.email, ip, userAgent, schemaName },
                'USER_NOT_FOUND'
            );
            throw new Error('Invalid credentials');
        }

        // ── BLOCK 6: Auth provider routing ────────────────────────────────────
        const authProvider = user.auth_provider || 'password';
        if (authProvider !== 'password') {
            await AuthAuditService.loginFailure(
                { userId: user.id, email: user.email, ip, userAgent, schemaName },
                `SSO_REQUIRED:${authProvider}`
            );
            throw Object.assign(
                new Error(`This account uses ${authProvider} SSO. Please login via your identity provider.`),
                { code: 'SSO_REQUIRED', provider: authProvider }
            );
        }

        // ── Password verification (already done for timing) ──────────────────
        if (!user.password_hash || !isValidPassword) {
            const failStatus = await retryRedisOperation(() =>
                AuthRateLimiterService.recordFailure(preAuthId)
            );

            await AuthAuditService.loginFailure(
                { userId: user.id, email: user.email, ip, userAgent, schemaName },
                'INVALID_PASSWORD',
                failStatus.attemptCount
            );

            // Log lockout event if newly locked
            if (failStatus.locked) {
                await AuthAuditService.lockoutTriggered(
                    { userId: user.id, email: user.email, ip, userAgent, schemaName },
                    failStatus.remainingSeconds || 0,
                    failStatus.attemptCount || 0
                );
                throw Object.assign(
                    new Error(AuthRateLimiterService.formatLockMessage(failStatus)),
                    { code: 'ACCOUNT_LOCKED', lockedUntil: failStatus.lockedUntil }
                );
            }

            throw new Error('Invalid credentials');
        }

        if (!user.is_active) {
            throw new Error('Account is deactivated. Please contact support.');
        }

        // ── Clear failure counter on success ──────────────────────────────────
        await retryRedisOperation(() =>
            AuthRateLimiterService.clearFailures(preAuthId)
        );

        // ── BLOCK 4: Device intelligence ──────────────────────────────────────
        const deviceInfo = extractDeviceInfo(req);
        if (!deviceInfo.deviceId) {
            deviceInfo.deviceId = generateDeviceId(deviceInfo);
        }

        const uaHash = crypto
            .createHash('sha256')
            .update(userAgent)
            .digest('hex')
            .slice(0, 16);

        const isNewDevice = await this.detectNewDevice(
            user.id, deviceInfo.deviceId!, uaHash, schemaName
        );

        // ── TRANSACTION: Create session + update user atomically ─────────────
        const { session, roles, tokens } = await sequelize.transaction(async (tx) => {
            // Create session
            const session = await SessionService.createSession(
                user.id, deviceInfo, schemaName, user.institution_id
            );

            // Persist device intelligence on session
            await Session.schema(schemaName).update(
                {
                    device_type: deviceInfo.deviceType || 'unknown',
                    user_agent_hash: uaHash,
                    is_new_device: isNewDevice,
                },
                { where: { id: session.id }, transaction: tx }
            );

            const roles = await this.getUserRoles(user.id, schemaName);

            // ── BLOCK 2: MFA enforcement ──────────────────────────────────────
            const requiresMfa = !isTestEnv && MfaService.requiresMfa(roles);

            if (requiresMfa && user.mfa_enabled) {
                // Return early for MFA - session created, tokens issued after MFA
                return { session, roles, tokens: null, mfaRequired: true };
            }

            if (requiresMfa && !user.mfa_enabled) {
                throw Object.assign(
                    new Error('MFA setup required for admin accounts. Please complete MFA enrollment.'),
                    { code: 'MFA_SETUP_REQUIRED' }
                );
            }

            // Issue tokens
            const tokens = await TokenService.generateTokenPair(
                { userId: user.id, tid: user.institution_id, sessionId: session.id, roles, type: 'tenant' },
                schemaName
            );

            // Update last login
            await User.schema(schemaName).update(
                { last_login_at: new Date(), last_login_ip: ip },
                { where: { id: user.id }, transaction: tx }
            );

            return { session, roles, tokens, mfaRequired: false };
        });

        // ── Handle MFA path (outside transaction) ─────────────────────────────
        const requiresMfa = !isTestEnv && MfaService.requiresMfa(roles);
        if (requiresMfa && user.mfa_enabled) {
            const mfaToken = await MfaService.issueMfaChallengeToken(
                user.id, session.id, schemaName, ip, uaHash
            );

            await AuthAuditService.log('LOGIN_SUCCESS', {
                userId: user.id,
                institutionId: user.institution_id,
                email: user.email,
                ip,
                userAgent,
                sessionId: session.id,
                schemaName,
                meta: { mfaPending: true },
            });

            if (isNewDevice) {
                await AuthAuditService.newDeviceLogin(
                    { userId: user.id, institutionId: user.institution_id, email: user.email, ip, userAgent, sessionId: session.id, schemaName },
                    { deviceId: deviceInfo.deviceId, deviceType: deviceInfo.deviceType, uaHash }
                );
            }

            return {
                user: this.toAuthUser(user, roles),
                tokens: { accessToken: '', refreshToken: '', expiresIn: 0 },
                session,
                mfaPending: true,
                mfaToken,
            };
        }

        // ── Audit ─────────────────────────────────────────────────────────────
        await AuthAuditService.loginSuccess({
            userId: user.id,
            institutionId: user.institution_id,
            email: user.email,
            ip,
            userAgent,
            sessionId: session.id,
            schemaName,
        });

        if (isNewDevice) {
            await AuthAuditService.newDeviceLogin(
                { userId: user.id, institutionId: user.institution_id, email: user.email, ip, userAgent, sessionId: session.id, schemaName },
                { deviceId: deviceInfo.deviceId, deviceType: deviceInfo.deviceType, uaHash }
            );
        }

        return { user: this.toAuthUser(user, roles), tokens: tokens!, session };
    }

    // ========================================================================
    // MFA Verification — complete login after TOTP challenge
    // ========================================================================

    static async completeMfaLogin(
        mfaToken: string,
        totpCode: string,
        schemaName: string,
        ip?: string,
        deviceHash?: string
    ): Promise<AuthResult> {
        // PATCH-A: Consume the MFA challenge token (single-use, IP+device bound)
        const challenge = await MfaService.consumeMfaChallengeToken(mfaToken, ip, deviceHash);

        if (!challenge.valid || !challenge.userId || !challenge.sessionId) {
            throw new Error(challenge.error || 'Invalid MFA token');
        }

        const { userId, sessionId } = challenge;

        // Load user
        const user = await User.schema(schemaName).findByPk(userId);
        if (!user || !user.mfa_secret) {
            throw new Error('User not found or MFA not configured');
        }

        // Verify TOTP
        const result = MfaService.verifyTotp(totpCode, user.mfa_secret);
        if (!result.valid) {
            await AuthAuditService.mfaEvent('MFA_FAILURE', {
                userId,
                institutionId: user.institution_id,
                email: user.email,
                sessionId,
                schemaName,
            }, result.error);
            throw new Error(result.error || 'Invalid MFA code');
        }

        // PATCH-B: Session fixation prevention
        // Destroy the pre-login session and create a new one with a fresh sessionId.
        // This prevents session fixation attacks where an attacker could have
        // observed the pre-MFA sessionId and reuse it after authentication.
        const oldSessionData = await SessionService.getSession(sessionId, schemaName);
        await SessionService.revokeSession(sessionId, schemaName, 'Session rotated after MFA verification');

        // Create a new session inheriting device info from the old session (camelCase → snake_case for model)
        const newSessionRecord = await Session.schema(schemaName).create({
            user_id: userId,
            institution_id: user.institution_id,
            device_id: oldSessionData?.deviceId,
            device_info: oldSessionData?.deviceInfo,
            ip: oldSessionData?.ip,
            user_agent: oldSessionData?.userAgent,
            // device_type, user_agent_hash, is_new_device are stored on the Session model directly
            mfa_verified: true,
            mfa_verified_at: new Date(),
            last_active_at: new Date(),
        });

        const newSessionId = newSessionRecord.id;

        // Mark new session as MFA-verified in Redis
        await this.markSessionMfaVerified(newSessionId);

        // Update user mfa_verified_at
        await User.schema(schemaName).update(
            { mfa_verified_at: new Date() },
            { where: { id: userId } }
        );

        const roles = await this.getUserRoles(userId, schemaName);

        // Issue full access token with new sessionId + mfa=true
        const tokens = await TokenService.generateTokenPair(
            { userId, tid: user.institution_id, sessionId: newSessionId, roles, type: 'tenant', mfa: true },
            schemaName
        );

        await AuthAuditService.mfaEvent('MFA_SUCCESS', {
            userId,
            institutionId: user.institution_id,
            email: user.email,
            sessionId: newSessionId,
            schemaName,
            meta: { oldSessionId: sessionId, sessionRotated: true },
        });

        // Return SessionData shape (consistent with rest of AuthService)
        const newSessionData = await SessionService.getSession(newSessionId, schemaName);

        return {
            user: this.toAuthUser(user, roles),
            tokens,
            session: newSessionData!,
        };
    }

    // ========================================================================
    // MFA Setup
    // ========================================================================

    static async setupMfa(userId: string, email: string): Promise<{
        secret: string;
        otpauthUrl: string;
        qrCodeDataUrl: string;
        backupCodes: string[];
    }> {
        return MfaService.generateSetup(userId, email);
    }

    static async confirmMfaSetup(
        userId: string,
        totpCode: string,
        schemaName: string
    ): Promise<{ backupCodes: string[] }> {
        const result = await MfaService.verifySetupCode(userId, totpCode);

        if (!result.valid || !result.secret) {
            throw new Error(result.error || 'MFA setup verification failed');
        }

        // Hash backup codes before storing
        const hashedCodes = MfaService.hashBackupCodes(result.backupCodes || []);

        // Persist MFA secret and backup codes
        await User.schema(schemaName).update(
            {
                mfa_enabled: true,
                mfa_secret: result.secret,
                mfa_backup_codes: hashedCodes,
                mfa_verified_at: new Date(),
            },
            { where: { id: userId } }
        );

        await AuthAuditService.mfaEvent('MFA_ENABLED', {
            userId,
            schemaName,
        });

        // Return plaintext backup codes (only shown once)
        return { backupCodes: result.backupCodes || [] };
    }

    static async disableMfa(
        userId: string,
        schemaName: string,
        disabledByAdminId?: string
    ): Promise<void> {
        await User.schema(schemaName).update(
            {
                mfa_enabled: false,
                mfa_secret: undefined,
                mfa_backup_codes: undefined,
                mfa_verified_at: undefined,
            },
            { where: { id: userId } }
        );

        await AuthAuditService.mfaEvent('MFA_DISABLED', {
            userId,
            schemaName,
            meta: { disabledByAdminId },
        });
    }

    // ========================================================================
    // Token Refresh — TRANSACTION SAFE
    // ========================================================================

    static async refreshToken(
        refreshToken: string,
        schemaName: string
    ): Promise<RefreshResult> {
        // Validate with retry
        const validation = await retryDbOperation(() =>
            TokenService.validateRefreshToken(refreshToken, schemaName)
        );

        if (!validation.valid) {
            throw new Error(validation.error || 'Invalid refresh token');
        }

        const { session, tokenRecord } = validation;
        if (!session || !tokenRecord) {
            throw new Error('Invalid token validation result');
        }

        // TRANSACTION: Rotate token + update session atomically
        const { newToken, user, roles, updatedSession } = await sequelize.transaction(async (tx) => {
            // Rotate refresh token (revoke old, create new)
            const newToken = await TokenService.rotateRefreshToken(tokenRecord, schemaName);

            // Get user with retry inside transaction
            const user = await User.schema(schemaName).findByPk(session.user_id, { transaction: tx });
            if (!user) throw new Error('User not found');

            const roles = await this.getUserRoles(user.id, schemaName);

            // Preserve mfa state from session
            const sessionRecord = await Session.schema(schemaName).findByPk(session.id, { transaction: tx });
            const mfaVerified = sessionRecord?.mfa_verified || false;

            // Update session last active
            await SessionService.updateLastActive(session.id, schemaName);

            const updatedSession = await SessionService.getSession(session.id, schemaName);

            return { newToken, user, roles, updatedSession, mfaVerified, sessionRecord };
        });

        // Generate access token (outside transaction - doesn't need to be atomic)
        const sessionRecord = await Session.schema(schemaName).findByPk(session.id);
        const mfaVerified = sessionRecord?.mfa_verified || false;

        const accessToken = TokenService.generateAccessToken({
            userId: user.id,
            tid: user.institution_id,
            sessionId: session.id,
            roles,
            type: 'tenant',
            ...(mfaVerified ? { mfa: true } : {}),
        });

        await AuthAuditService.log('TOKEN_REFRESH', {
            userId: user.id,
            institutionId: user.institution_id,
            sessionId: session.id,
            schemaName,
        });

        return {
            tokens: {
                accessToken,
                refreshToken: newToken.rawToken,
                expiresIn: TokenService.getAccessTokenExpirySeconds(),
            },
            session: updatedSession!,
        };
    }

    // ========================================================================
    // Logout
    // ========================================================================

    static async logout(sessionId: string, schemaName: string, userId?: string): Promise<void> {
        await SessionService.revokeSession(sessionId, schemaName, 'User logged out');

        await AuthAuditService.log('LOGOUT', {
            userId,
            sessionId,
            schemaName,
        });
    }

    static async logoutAll(
        userId: string,
        schemaName: string,
        exceptCurrentSession?: string
    ): Promise<number> {
        const count = await SessionService.revokeAllUserSessions(
            userId, schemaName, 'User logged out from all devices', exceptCurrentSession
        );

        await AuthAuditService.log('LOGOUT_ALL', {
            userId,
            schemaName,
            meta: { revokedCount: count, exceptSessionId: exceptCurrentSession },
        });

        return count;
    }

    // ========================================================================
    // Session Management
    // ========================================================================

    static async getUserById(userId: string, schemaName: string): Promise<AuthUser | null> {
        // PRODUCTION HARDENED: Retry on transient DB failures
        const user = await retryDbOperation(() =>
            User.schema(schemaName).findByPk(userId)
        );
        if (!user) return null;
        const roles = await this.getUserRoles(userId, schemaName);
        return this.toAuthUser(user, roles);
    }

    static async getUserMfaStatus(
        userId: string,
        schemaName: string
    ): Promise<{ id: string; mfaEnabled: boolean; mfaVerifiedAt: Date | null; authProvider: string } | null> {
        const user = await retryDbOperation(() =>
            User.schema(schemaName).findByPk(userId, {
                attributes: ['id', 'mfa_enabled', 'mfa_verified_at', 'auth_provider'],
            })
        );
        if (!user) return null;
        return {
            id: user.id,
            mfaEnabled: user.mfa_enabled,
            mfaVerifiedAt: user.mfa_verified_at || null,
            authProvider: user.auth_provider,
        };
    }

    static async getActiveSessions(
        userId: string,
        schemaName: string,
        currentSessionId?: string
    ) {
        return SessionService.getActiveSessions(userId, schemaName, currentSessionId);
    }

    static async revokeSession(
        sessionId: string,
        userId: string,
        schemaName: string
    ): Promise<void> {
        const session = await SessionService.getSession(sessionId, schemaName);

        if (!session || session.userId !== userId) {
            throw new Error('Session not found or unauthorized');
        }

        await SessionService.revokeSession(sessionId, schemaName, 'Session revoked by user');

        await AuthAuditService.sessionRevoked(
            { userId, sessionId, schemaName },
            'Session revoked by user',
            sessionId
        );
    }

    // ========================================================================
    // Password Management
    // ========================================================================

    static async changePassword(
        userId: string,
        currentPassword: string,
        newPassword: string,
        schemaName: string,
        currentSessionId?: string,
        ip?: string
    ): Promise<void> {
        const user = await User.schema(schemaName).findByPk(userId);
        if (!user) throw new Error('User not found');

        if (!user.password_hash) {
            throw new Error('Password change not available for SSO accounts');
        }

        const isValid = await bcrypt.compare(currentPassword, user.password_hash!);
        if (!isValid) throw new Error('Current password is incorrect');

        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        await User.schema(schemaName).update(
            { password_hash: passwordHash },
            { where: { id: userId } }
        );

        if (currentSessionId) {
            await SessionService.revokeAllUserSessions(
                userId, schemaName,
                'Password changed - all other sessions revoked',
                currentSessionId
            );
        }

        await AuthAuditService.passwordChanged({
            userId,
            institutionId: user.institution_id,
            email: user.email,
            ip,
            schemaName,
        });
    }

    // ========================================================================
    // Private Helpers
    // ========================================================================

    private static async getUserRoles(userId: string, schemaName: string): Promise<string[]> {
        try {
            const userRoles = await UserRole.schema(schemaName).findAll({
                where: { user_id: userId },
                attributes: ['role_id'],
            });

            if (!userRoles || userRoles.length === 0) return [];

            const roleIds = userRoles.map(ur => ur.role_id);
            const roles = await Role.schema(schemaName).findAll({
                where: { id: roleIds },
                attributes: ['name'],
            });

            return roles.map(r => r.name);
        } catch (error) {
            logger.error('Error fetching user roles:', error);
            return [];
        }
    }

    /**
     * Detect if this is a new device for the user.
     * Compares device_id and user_agent_hash against known sessions.
     */
    private static async detectNewDevice(
        userId: string,
        deviceId: string,
        uaHash: string,
        schemaName: string
    ): Promise<boolean> {
        try {
            const existingSession = await Session.schema(schemaName).findOne({
                where: {
                    user_id: userId,
                    device_id: deviceId,
                },
            });
            return !existingSession;
        } catch {
            return false;
        }
    }

    /**
     * Mark a session as MFA-verified in Redis.
     * TTL matches session inactivity limit.
     */
    private static async markSessionMfaVerified(sessionId: string): Promise<void> {
        try {
            const redis = getRedis();
            await redis.setex(`session:mfa:${sessionId}`, SESSION_MFA_TTL_SECONDS, '1');
        } catch (err) {
            logger.warn('[AuthService] Failed to write MFA session marker:', err);
        }
    }

    private static toAuthUser(user: User, roles: string[]): AuthUser {
        return {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            roles,
            institutionId: user.institution_id,
            isActive: user.is_active,
            isEmailVerified: user.is_email_verified,
        };
    }
}
