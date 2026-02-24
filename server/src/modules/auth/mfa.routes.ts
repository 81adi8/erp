/**
 * TASK-E1.1 — MFA Routes (Tenant Auth)
 *
 * POST /auth/mfa/setup    — generate TOTP secret + QR code
 * POST /auth/mfa/confirm  — verify first TOTP code → enable MFA
 * POST /auth/mfa/verify   — complete login after MFA challenge (PUBLIC)
 * POST /auth/mfa/disable  — disable MFA (self or admin)
 * GET  /auth/mfa/status   — check MFA status for current user
 *
 * SECURITY: MFA routes are self-service operations.
 * - /setup, /confirm, /status: Any authenticated user manages own MFA
 * - /verify: Public route (completes login flow)
 * - /disable: Self-service OR admin action (inline role check)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { authGuard } from '../../core/middleware/authGuard';
import { validate } from '../../core/middleware/validate.middleware';
import { HttpStatus } from '../../core/http/HttpStatus';
import { toError } from '../../core/utils/error.util';
import {
    MfaSetupBodySchema,
    MfaConfirmBodySchema,
    MfaVerifyBodySchema,
    MfaDisableBodySchema,
} from './auth.schemas';

interface MfaConfirmBody {
    totpCode: string;
}

interface MfaVerifyBody {
    mfaToken: string;
    totpCode: string;
}

interface MfaDisableBody {
    userId?: string;
}

const router = Router();

router.post('/setup',
    authGuard,
    validate(MfaSetupBodySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            const schemaName = req.tenantSchema || req.tenant?.db_schema;

            if (!userId || !schemaName) {
                return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Authentication required' });
            }

            const { AuthService: AS } = await import('./auth.service');
            const user = await AS.getUserById(userId, schemaName);
            if (!user) {
                return res.status(HttpStatus.NOT_FOUND).json({ error: 'User not found' });
            }

            const setup = await AuthService.setupMfa(userId, user.email);

            return res.status(HttpStatus.OK).json({
                success: true,
                data: {
                    otpauthUrl: setup.otpauthUrl,
                    qrCodeDataUrl: setup.qrCodeDataUrl,
                    secret: setup.secret,
                    backupCodes: setup.backupCodes,
                    message: 'Scan the QR code with your authenticator app, then call /auth/mfa/confirm',
                },
            });
        } catch (err) {
            next(err);
        }
    });

router.post('/confirm',
    authGuard,
    validate(MfaConfirmBodySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            const schemaName = req.tenantSchema || req.tenant?.db_schema;
            const body = (req.validatedBody as MfaConfirmBody) || req.body as MfaConfirmBody;
            const { totpCode } = body;

            if (!userId || !schemaName) {
                return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Authentication required' });
            }

            const result = await AuthService.confirmMfaSetup(userId, totpCode, schemaName);

            return res.status(HttpStatus.OK).json({
                success: true,
                data: {
                    message: 'MFA enabled successfully. Save your backup codes — they will not be shown again.',
                    backupCodes: result.backupCodes,
                },
            });
        } catch (err) {
            const error = toError(err);
            if (error.message.includes('expired') || error.message.includes('Invalid TOTP')) {
                return res.status(HttpStatus.BAD_REQUEST).json({ error: error.message });
            }
            next(err);
        }
    });

router.post('/verify',
    validate(MfaVerifyBodySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const body = (req.validatedBody as MfaVerifyBody) || req.body as MfaVerifyBody;
            const { mfaToken, totpCode } = body;
            const schemaName = req.tenantSchema || req.tenant?.db_schema;

            if (!schemaName) {
                return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Tenant context required' });
            }

            const result = await AuthService.completeMfaLogin(mfaToken, totpCode, schemaName);

            return res.status(HttpStatus.OK).json({
                success: true,
                data: {
                    user: result.user,
                    tokens: result.tokens,
                    session: {
                        id: result.session.id,
                        createdAt: result.session.createdAt,
                    },
                },
            });
        } catch (err) {
            const error = toError(err);
            if (error.message.includes('Invalid') || error.message.includes('expired')) {
                return res.status(HttpStatus.UNAUTHORIZED).json({ error: error.message });
            }
            next(err);
        }
    });

router.post('/disable',
    authGuard,
    validate(MfaDisableBodySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const requestingUserId = req.user?.userId;
            const schemaName = req.tenantSchema || req.tenant?.db_schema;
            const body = (req.validatedBody as MfaDisableBody) || req.body as MfaDisableBody;
            const { userId: targetUserId } = body;

            if (!requestingUserId || !schemaName) {
                return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Authentication required' });
            }

            const isAdminAction = targetUserId && targetUserId !== requestingUserId;

            if (isAdminAction) {
                const userRoles: string[] = req.user?.roles || [];
                const isAdmin = userRoles.some(r =>
                    ['root', 'root_admin', 'super_admin', 'tenant_admin', 'admin'].includes(r.toLowerCase())
                );
                if (!isAdmin) {
                    return res.status(HttpStatus.FORBIDDEN).json({
                        error: 'Insufficient permissions to disable MFA for another user',
                    });
                }
            }

            const targetId = isAdminAction ? targetUserId : requestingUserId;
            await AuthService.disableMfa(targetId, schemaName, isAdminAction ? requestingUserId : undefined);

            return res.status(HttpStatus.OK).json({
                success: true,
                data: { message: 'MFA disabled successfully' },
            });
        } catch (err) {
            next(err);
        }
    });

router.get('/status',
    authGuard,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            const schemaName = req.tenantSchema || req.tenant?.db_schema;

            if (!userId || !schemaName) {
                return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Authentication required' });
            }

            const user = await AuthService.getUserMfaStatus(userId, schemaName);

            if (!user) {
                return res.status(HttpStatus.NOT_FOUND).json({ error: 'User not found' });
            }

            return res.status(HttpStatus.OK).json({
                success: true,
                data: {
                    mfaEnabled: user.mfaEnabled,
                    mfaVerifiedAt: user.mfaVerifiedAt,
                    authProvider: user.authProvider,
                },
            });
        } catch (err) {
            next(err);
        }
    });

export default router;
