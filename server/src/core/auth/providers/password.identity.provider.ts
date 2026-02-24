/**
 * TASK-E1.1 — Password Identity Provider
 *
 * Implements IIdentityProvider for email/password authentication.
 * This is the default provider for all tenant users.
 *
 * Registered at boot time via IdentityProviderRegistry.register(new PasswordIdentityProvider())
 */

import bcrypt from 'bcrypt';
import type { Request } from 'express';
import {
    IIdentityProvider,
    IdentityCredentials,
    IdentityUser,
    IssuedTokens,
    SessionContext,
    VerifiedSession,
    AuthProviderType,
} from '../identity.provider';
import { jwtUtil } from '../jwt';
import { SessionService } from '../../../modules/auth/session.service';
import { TokenService } from '../../../modules/auth/token.service';
import { User } from '../../../database/models/shared/core/User.model';
import { Role } from '../../../database/models/shared/core/Role.model';
import { UserRole } from '../../../database/models/shared/core/UserRole.model';
import { MfaService } from '../mfa.service';

export class PasswordIdentityProvider implements IIdentityProvider {
    readonly providerType: AuthProviderType = 'password';

    async authenticate(
        credentials: IdentityCredentials,
        req: Request,
        schemaName: string
    ): Promise<IdentityUser> {
        const user = await User.schema(schemaName).findOne({
            where: { email: credentials.email.toLowerCase() },
        });

        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Enforce provider routing
        if ((user.auth_provider || 'password') !== 'password') {
            throw Object.assign(
                new Error(`Account uses ${user.auth_provider} SSO`),
                { code: 'SSO_REQUIRED', provider: user.auth_provider }
            );
        }

        if (!user.password_hash) {
            throw new Error('Invalid credentials');
        }

        const valid = await bcrypt.compare(credentials.password!, user.password_hash);
        if (!valid) {
            throw new Error('Invalid credentials');
        }

        if (!user.is_active) {
            throw new Error('Account is deactivated');
        }

        const roles = await this.getUserRoles(user.id, schemaName);
        const requiresMfa = MfaService.requiresMfa(roles);

        return {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            roles,
            institutionId: user.institution_id,
            isActive: user.is_active,
            isEmailVerified: user.is_email_verified,
            authProvider: 'password',
            mfaEnabled: user.mfa_enabled || false,
            mfaVerifiedAt: user.mfa_verified_at,
            requiresMfa,
        };
    }

    async verifySession(token: string): Promise<VerifiedSession> {
        try {
            const payload = jwtUtil.verifyAccess(token);
            return {
                valid: true,
                userId: payload.userId,
                sessionId: payload.sessionId,
                mfaVerified: payload.mfa === true,
            };
        } catch (err: any) {
            return { valid: false, error: err.message };
        }
    }

    async issueTokens(
        user: IdentityUser,
        sessionContext: SessionContext,
        schemaName: string
    ): Promise<IssuedTokens> {
        const tokens = await TokenService.generateTokenPair(
            {
                userId: user.id,
                tid: user.institutionId,
                sessionId: sessionContext.sessionId,
                roles: user.roles,
                type: 'tenant',
            },
            schemaName
        );

        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn,
        };
    }

    async revokeSession(sessionId: string, schemaName: string, reason?: string): Promise<void> {
        await SessionService.revokeSession(sessionId, schemaName, reason || 'Revoked');
    }

    private async getUserRoles(userId: string, schemaName: string): Promise<string[]> {
        try {
            const userRoles = await UserRole.schema(schemaName).findAll({
                where: { user_id: userId },
                attributes: ['role_id'],
            });
            if (!userRoles.length) return [];
            const roleIds = userRoles.map(ur => ur.role_id);
            const roles = await Role.schema(schemaName).findAll({
                where: { id: roleIds },
                attributes: ['name'],
            });
            return roles.map(r => r.name);
        } catch {
            return [];
        }
    }
}
