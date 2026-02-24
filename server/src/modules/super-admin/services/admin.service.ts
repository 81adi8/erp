import { Admin } from '../../../database/models/root/Admin.model';
import { AdminSession } from '../../../database/models/root/AdminSession.model';
import { AdminRefreshToken } from '../../../database/models/root/AdminRefreshToken.model';
import { ApiError } from '../../../core/http/ApiError';
import { HttpStatus } from '../../../core/http/HttpStatus';
import { passwordUtil } from '../../../core/auth/password';
import { jwtUtil } from '../../../core/auth/jwt';
import { authenticator } from 'otplib';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

interface AdminCreateInput {
    email: string;
    password: string;
    name: string;
    role?: string;
    validUntil?: Date;
    permissions?: Record<string, boolean>;
}

interface AdminUpdateInput extends Partial<Admin> {
    validUntil?: Date;
    permissions?: Record<string, boolean>;
}

export class AdminService {
    // Session Management
    async createSession(adminId: string, deviceInfo: Record<string, unknown>, ip: string) {
        return AdminSession.create({
            admin_id: adminId,
            device_info: deviceInfo,
            ip,
            last_active_at: new Date()
        });
    }

    async revokeSession(sessionId: string, reason: string) {
        return AdminSession.update(
            { revoked_at: new Date(), revoke_reason: reason },
            { where: { id: sessionId } }
        );
    }

    async getSessionById(sessionId: string) {
        return AdminSession.findByPk(sessionId);
    }

    async listSessions(adminId: string) {
        return AdminSession.findAll({
            where: { admin_id: adminId },
            order: [['created_at', 'DESC']]
        });
    }

    // Refresh Token Management
    private hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    async createRefreshToken(sessionId: string, tokenFamily?: string): Promise<{ token: string; expiresAt: Date }> {
        const family = tokenFamily || uuidv4();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const payload = {
            sessionId,
            tokenFamily: family,
            rotationCount: 0
        };

        const token = jwtUtil.signRefresh(payload);
        const tokenHash = this.hashToken(token);

        await AdminRefreshToken.create({
            session_id: sessionId,
            token_hash: tokenHash,
            expires_at: expiresAt,
            token_family: family,
            rotation_count: 0
        });

        return { token, expiresAt };
    }

    async rotateRefreshToken(oldToken: string): Promise<{ accessToken: string; refreshToken: string; user: Admin }> {
        let payload;
        try {
            payload = jwtUtil.verifyRefresh(oldToken);
        } catch {
            throw new ApiError(HttpStatus.UNAUTHORIZED, 'Invalid refresh token');
        }

        const { sessionId, tokenFamily, rotationCount } = payload;
        const oldTokenHash = this.hashToken(oldToken);

        // Find the refresh token record
        const tokenRecord = await AdminRefreshToken.findOne({
            where: {
                token_hash: oldTokenHash,
                session_id: sessionId,
                token_family: tokenFamily,
                revoked_at: null
            }
        });

        if (!tokenRecord) {
            // Token not found or already used - possible reuse attack!
            // Revoke entire token family
            await this.revokeTokenFamily(tokenFamily, 'Possible token reuse detected');
            throw new ApiError(HttpStatus.UNAUTHORIZED, 'Token reuse detected. Please login again.');
        }

        // Check if token matches expected rotation count
        if (tokenRecord.rotation_count !== rotationCount) {
            // Rotation count mismatch - token reuse!
            await this.revokeTokenFamily(tokenFamily, 'Rotation count mismatch');
            throw new ApiError(HttpStatus.UNAUTHORIZED, 'Token reuse detected. Please login again.');
        }

        // Verify session is still valid
        const session = await AdminSession.findOne({
            where: { id: sessionId, revoked_at: null }
        });

        if (!session) {
            throw new ApiError(HttpStatus.UNAUTHORIZED, 'Session expired or revoked');
        }

        // Get admin
        const admin = await Admin.findByPk(session.admin_id);
        if (!admin || !admin.is_active) {
            throw new ApiError(HttpStatus.UNAUTHORIZED, 'Admin account not active');
        }

        // Revoke old token
        await tokenRecord.update({
            revoked_at: new Date(),
            revoked_reason: 'Rotated'
        });

        // Create new refresh token with incremented rotation count
        const newRotationCount = rotationCount + 1;
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const newPayload = {
            sessionId,
            tokenFamily,
            rotationCount: newRotationCount
        };

        const newRefreshToken = jwtUtil.signRefresh(newPayload);
        const newTokenHash = this.hashToken(newRefreshToken);

        await AdminRefreshToken.create({
            session_id: sessionId,
            token_hash: newTokenHash,
            expires_at: expiresAt,
            token_family: tokenFamily,
            rotation_count: newRotationCount
        });

        // Update session last_active
        await session.update({ last_active_at: new Date() });

        // Generate new access token
        const accessToken = jwtUtil.signAccess({
            userId: admin.id,
            sessionId,
            roles: [admin.role || 'super_admin'],
            type: 'admin',
            permissions: admin.permissions as Record<string, boolean>
        });

        return { accessToken, refreshToken: newRefreshToken, user: admin };
    }

    async revokeTokenFamily(tokenFamily: string, reason: string) {
        await AdminRefreshToken.update(
            { revoked_at: new Date(), revoked_reason: reason },
            { where: { token_family: tokenFamily, revoked_at: null } }
        );
    }

    async revokeAllRefreshTokensForSession(sessionId: string, reason: string) {
        await AdminRefreshToken.update(
            { revoked_at: new Date(), revoked_reason: reason },
            { where: { session_id: sessionId, revoked_at: null } }
        );
    }


    // 2FA Management
    async generate2FASecret(adminId: string) {
        const admin = await Admin.findByPk(adminId);
        if (!admin) throw new ApiError(HttpStatus.NOT_FOUND, 'Admin not found');

        const secret = authenticator.generateSecret();
        const otpauth = authenticator.keyuri(admin.email, 'SchoolERP-Root', secret);
        const qrCodeUrl = otpauth;

        // Ideally, don't save secret until verified. But for simplicity, we save strict "pending" state or just save it but keep is_two_factor_enabled = false until verified.
        // Let's assume we save it but require verification to enable.
        admin.two_factor_secret = secret;
        await admin.save();

        return { qrCodeUrl };
    }

    async verifyAndEnable2FA(adminId: string, token: string) {
        const admin = await Admin.findByPk(adminId);
        if (!admin || !admin.two_factor_secret) {
            throw new ApiError(HttpStatus.BAD_REQUEST, '2FA setup not initiated');
        }

        const isValid = authenticator.check(token, admin.two_factor_secret);
        if (!isValid) {
            throw new ApiError(HttpStatus.BAD_REQUEST, 'Invalid 2FA token');
        }

        admin.is_two_factor_enabled = true;
        await admin.save();
        return true;
    }

    async verify2FAToken(adminId: string, token: string) {
        const admin = await Admin.findByPk(adminId);
        if (!admin || !admin.is_two_factor_enabled || !admin.two_factor_secret) {
            // If 2FA not enabled, technically verification is "bypassed" or invalid request.
            return false;
        }
        return authenticator.check(token, admin.two_factor_secret);
    }

    async disable2FA(adminId: string) {
        const admin = await Admin.findByPk(adminId);
        if (!admin) throw new ApiError(HttpStatus.NOT_FOUND, 'Admin not found');

        admin.is_two_factor_enabled = false;
        admin.two_factor_secret = null;
        await admin.save();
        return true;
    }
    async create(data: AdminCreateInput) {
        const { email, password, name, role, validUntil, permissions } = data;

        if (!email || !password || !name) {
            throw new ApiError(HttpStatus.BAD_REQUEST, 'Missing required fields');
        }

        const existing = await Admin.findOne({ where: { email } });
        if (existing) {
            throw new ApiError(HttpStatus.CONFLICT, 'Admin with this email already exists');
        }

        const password_hash = await passwordUtil.hash(password);

        return await Admin.create({
            email,
            password_hash,
            name,
            role: role || 'super_admin',
            is_active: true,
            valid_until: validUntil || null,
            permissions: permissions || {}
        });
    }

    async findByEmail(email: string) {
        return Admin.findOne({ where: { email } });
    }

    async findById(id: string) {
        return Admin.findByPk(id);
    }

    async update(id: string, data: AdminUpdateInput) {
        const admin = await Admin.findByPk(id);
        if (!admin) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Admin not found');
        }

        if (data.email && data.email !== admin.email) {
            const existing = await Admin.findOne({ where: { email: data.email } });
            if (existing) {
                throw new ApiError(HttpStatus.CONFLICT, 'Email already in use');
            }
        }

        // Map camelCase to snake_case if necessary, or just rely on partial
        const updateData: Partial<Admin> & { valid_until?: Date } = { ...data };
        if (data.validUntil !== undefined) updateData.valid_until = data.validUntil;

        return admin.update(updateData);
    }

    async delete(id: string) {
        const admin = await Admin.findByPk(id);
        if (!admin) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Admin not found');
        }
        // Hard delete or soft delete? Let's do soft delete by deactivating or just destroy if strictly requested. 
        // User asked "remove", I'll implement destroy for cleanup.
        return admin.destroy();
    }

    async list(limit = 20, offset = 0) {
        return Admin.findAndCountAll({
            limit,
            offset,
            order: [['created_at', 'DESC']],
            attributes: { exclude: ['password_hash'] }
        });
    }
}
