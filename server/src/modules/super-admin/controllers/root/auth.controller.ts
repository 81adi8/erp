import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../../services/admin.service';
import { HttpStatus } from '../../../../core/http/HttpStatus';
import { ApiError } from '../../../../core/http/ApiError';
import { passwordUtil } from '../../../../core/auth/password';
import { jwtUtil } from '../../../../core/auth/jwt';

export class RootAuthController {
    private service = new AdminService();

    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email, password, twoFactorCode } = req.body;

            if (!email || !password) {
                throw new ApiError(HttpStatus.BAD_REQUEST, 'Email and password are required');
            }

            const admin = await this.service.findByEmail(email);
            if (!admin) {
                throw new ApiError(HttpStatus.UNAUTHORIZED, 'Invalid credentials');
            }

            const isMatch = await passwordUtil.compare(password, admin.password_hash);
            if (!isMatch) {
                throw new ApiError(HttpStatus.UNAUTHORIZED, 'Invalid credentials');
            }

            if (!admin.is_active) {
                throw new ApiError(HttpStatus.FORBIDDEN, 'Account is inactive');
            }

            if (admin.valid_until && new Date() > new Date(admin.valid_until)) {
                throw new ApiError(HttpStatus.FORBIDDEN, 'Account access has expired');
            }

            // 2FA Check
            if (admin.is_two_factor_enabled) {
                if (!twoFactorCode) {
                    // Indicate 2FA is required
                    return res.status(HttpStatus.OK).json({
                        success: true,
                        require2FA: true,
                        message: '2FA code required'
                    });
                }

                const is2FAValid = await this.service.verify2FAToken(admin.id, twoFactorCode);
                if (!is2FAValid) {
                    throw new ApiError(HttpStatus.UNAUTHORIZED, 'Invalid 2FA code');
                }
            }

            // Create Session
            const deviceInfo = {
                userAgent: req.headers['user-agent'],
                ip: req.ip
            };
            const session = await this.service.createSession(admin.id, deviceInfo, req.ip || '');

            // FIXED: Removed is_main from token payload â€” authGuard rejects any token
            // carrying is_main (TASK-E1.1 hardening). is_main is DB-resolved at request
            // time via rootAuthMiddleware, never trusted from JWT.
            const tokenPayload = {
                userId: admin.id,
                sessionId: session.id,
                type: 'admin' as const,
                // roles/permissions are DB-resolved at request time â€” not in token
            };

            const accessToken = jwtUtil.signAccess(tokenPayload);

            // Generate refresh token
            const { token: refreshToken, expiresAt: refreshExpiresAt } = await this.service.createRefreshToken(session.id);

            // Set HTTP-only secure cookies
            res.cookie('auth_token', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 15 * 60 * 1000, // 15 minutes
                path: '/',
            });

            res.cookie('refresh_token', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                path: '/',
            });

            // Update last login
            admin.last_login_at = new Date();
            await admin.save();

            res.status(HttpStatus.OK).json({
                success: true,
                require2FA: false,
                data: {
                    user: {
                        id: admin.id,
                        email: admin.email,
                        name: admin.name,
                        role: admin.role,
                        permissions: admin.permissions,
                        is_main: admin.is_main,
                        is_two_factor_enabled: admin.is_two_factor_enabled
                    },
                    // Tokens in cookies, but return access token for clients that need it
                    accessToken,
                    expiresIn: 15 * 60 // 15 minutes in seconds
                }
            });

        } catch (error) {
            next(error);
        }
    };

    // 2FA Endpoints
    setup2FA = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ApiError(HttpStatus.UNAUTHORIZED, 'Authentication required');
            }
            const { qrCodeUrl } = await this.service.generate2FASecret(userId);

            res.status(HttpStatus.OK).json({
                success: true,
                data: { qrCodeUrl }
            });
        } catch (error) {
            next(error);
        }
    };

    verify2FA = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ApiError(HttpStatus.UNAUTHORIZED, 'Authentication required');
            }
            const { token } = req.body;

            await this.service.verifyAndEnable2FA(userId, token);

            res.status(HttpStatus.OK).json({
                success: true,
                message: '2FA enabled successfully'
            });
        } catch (error) {
            next(error);
        }
    };

    disable2FA = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ApiError(HttpStatus.UNAUTHORIZED, 'Authentication required');
            }
            await this.service.disable2FA(userId);
            res.status(HttpStatus.OK).json({
                success: true,
                message: '2FA disabled successfully'
            });
        } catch (error) {
            next(error);
        }
    };

    // Session Management Endpoints
    getSessions = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new ApiError(HttpStatus.UNAUTHORIZED, 'Authentication required');
            }
            const sessions = await this.service.listSessions(userId);
            res.status(HttpStatus.OK).json({
                success: true,
                data: sessions
            });
        } catch (error) {
            next(error);
        }
    };

    revokeSession = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { sessionId } = req.params;
            const requestingUserId = req.user?.userId;
            if (!requestingUserId) {
                throw new ApiError(HttpStatus.UNAUTHORIZED, 'Authentication required');
            }

            const session = await this.service.getSessionById(sessionId as string);
            if (!session) {
                throw new ApiError(HttpStatus.NOT_FOUND, 'Session not found');
            }

            const sessionOwnerId = session.admin_id;
            if (requestingUserId !== sessionOwnerId) {
                const requestingAdmin = await this.service.findById(requestingUserId);
                const isSuperAdmin = requestingAdmin?.is_main === true || requestingAdmin?.role === 'super_admin';

                if (!isSuperAdmin) {
                    throw new ApiError(HttpStatus.FORBIDDEN, 'You can only manage your own sessions');
                }
            }

            await this.service.revokeSession(sessionId as string, 'User revoked');
            res.status(HttpStatus.OK).json({
                success: true,
                message: 'Session revoked'
            });
        } catch (error) {
            next(error);
        }
    };

    // Refresh Token - rotates refresh token and issues new access token
    refresh = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const refreshToken = req.cookies?.refresh_token;

            if (!refreshToken) {
                return res.status(HttpStatus.UNAUTHORIZED).json({
                    success: false,
                    message: 'No refresh token provided'
                });
            }

            const { accessToken, refreshToken: newRefreshToken, user } = await this.service.rotateRefreshToken(refreshToken);

            // Set new cookies
            res.cookie('auth_token', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 15 * 60 * 1000, // 15 minutes
                path: '/',
            });

            res.cookie('refresh_token', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                path: '/',
            });

            res.status(HttpStatus.OK).json({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        permissions: user.permissions,
                        is_main: user.is_main,
                        is_two_factor_enabled: user.is_two_factor_enabled
                    },
                    accessToken,
                    expiresIn: 15 * 60
                }
            });
        } catch (error) {
            next(error);
        }
    };

    // Logout - clears HTTP-only cookies
    logout = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Clear both cookies
            res.cookie('auth_token', '', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                expires: new Date(0),
                path: '/',
            });

            res.cookie('refresh_token', '', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                expires: new Date(0),
                path: '/',
            });

            res.status(HttpStatus.OK).json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error) {
            next(error);
        }
    };
}
