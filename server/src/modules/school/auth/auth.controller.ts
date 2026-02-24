import { Request, Response } from 'express';
import { AuthService } from '../../auth/auth.service';
import { ApiError } from '../../../core/http/ApiError';
import { logger } from '../../../core/utils/logger';

// CQ-07 FIX: Extracted cookie TTLs to named constants
const REFRESH_TOKEN_COOKIE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ACCESS_TOKEN_COOKIE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const sendSuccess = (
    res: Response,
    data: unknown,
    message = 'Success',
    statusCode = 200,
    meta?: Record<string, unknown>
) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        errors: [],
        ...(meta ? { meta } : {}),
    });
};

const sendError = (res: Response, message: string, statusCode = 400, errors: string[] = [message]) => {
    return res.status(statusCode).json({
        success: false,
        message,
        data: null,
        errors,
    });
};

export class SchoolAuthControllerV2 {
    /**
     * Handle password-based login on v2 school auth path.
     * NOTE: this endpoint intentionally aligns with frontend contract:
     * { email, password }.
     */
    static async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            const tenant = req.tenant;

            if (!tenant || !tenant.db_schema || !tenant.id) {
                return sendError(res, 'Valid tenant context is required', 400);
            }

            if (!email || !password) {
                return sendError(res, 'Email and password are required', 400);
            }

            const result = await AuthService.login(
                { email, password },
                req,
                tenant.db_schema
            );

            // MFA challenge flow: do not issue access/refresh cookies yet
            if (result.mfaPending) {
                return sendSuccess(
                    res,
                    {
                        user: result.user,
                        mfaPending: true,
                        mfaToken: result.mfaToken,
                    },
                    'MFA verification required'
                );
            }

            // Handle Storage Strategy (Consistency with v1)
            const useHttpOnlyCookies = req.headers['x-storage-preference'] !== 'local-storage';

            const isProduction = process.env.NODE_ENV === 'production';
            const origin = req.get('origin') || '';
            let cookieDomain: string | undefined;
            try {
                if (origin) {
                    const url = new URL(origin);
                    if (url.hostname.endsWith('.localhost')) cookieDomain = url.hostname;
                    else if (url.hostname !== 'localhost') cookieDomain = url.hostname;
                }
            } catch { }

            // Set refresh token cookie
            res.cookie('refresh_token', result.tokens.refreshToken, {
                httpOnly: true,
                secure: isProduction,
                sameSite: isProduction ? 'strict' : 'lax',
                maxAge: REFRESH_TOKEN_COOKIE_TTL_MS,
                path: '/api/v2/school/auth',
                domain: cookieDomain
            });

            if (useHttpOnlyCookies) {
                res.cookie('access_token', result.tokens.accessToken, {
                    httpOnly: true,
                    secure: isProduction,
                    sameSite: isProduction ? 'strict' : 'lax',
                    maxAge: ACCESS_TOKEN_COOKIE_TTL_MS,
                    path: '/api/v2/school',
                    domain: cookieDomain
                });

                // Double-submit CSRF token for cookie-auth flow
                const csrfToken = Buffer.from(`${Date.now()}-${Math.random()}`).toString('base64url');
                res.cookie('csrf_token', csrfToken, {
                    httpOnly: false,
                    secure: isProduction,
                    sameSite: isProduction ? 'strict' : 'lax',
                    maxAge: ACCESS_TOKEN_COOKIE_TTL_MS,
                    path: '/api/v2/school',
                    domain: cookieDomain,
                });
            }

            return sendSuccess(
                res,
                {
                    user: result.user,
                    accessToken: useHttpOnlyCookies ? undefined : result.tokens.accessToken,
                    refreshToken: result.tokens.refreshToken,
                    expiresIn: result.tokens.expiresIn,
                    storageMode: useHttpOnlyCookies ? 'httponly' : 'local',
                    session: result.session,
                },
                'Login successful'
            );

        } catch (error) {
            logger.error('[SchoolAuthControllerV2] Login Error:', error);

            // Check if response already sent to prevent "headers already sent" error
            if (res.headersSent) {
                return;
            }

            const message = error instanceof Error ? error.message : 'Internal server error';
            const status = error instanceof ApiError
                ? error.statusCode
                : (message.toLowerCase().includes('invalid credentials') ? 401 : 500);
            return sendError(res, message, status);
        }
    }
}
