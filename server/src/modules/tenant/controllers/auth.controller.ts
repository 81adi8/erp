import { Request, Response, NextFunction, CookieOptions } from 'express';
import crypto from 'crypto';
import { AuthService, AuthenticatedRequest } from '../../auth';
import { getTenant } from '../../../core/context/requestContext';
import { asyncHandler } from '../../../core/utils/asyncHandler';
import { logger } from '../../../core/utils/logger';

interface MfaTokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

interface MfaCompleteResult {
    user: unknown;
    tokens?: MfaTokenPair;
}

type TenantAuthService = typeof AuthService & {
    forgotPassword?: (email: string, schemaName: string, tenantId: string) => Promise<void>;
    resetPassword?: (token: string, newPassword: string, schemaName: string) => Promise<void>;
    verifyMfa?: (mfaToken: string, totpCode: string, schemaName: string) => Promise<unknown>;
    setupMfa?: (userId: string, schemaName: string) => Promise<unknown>;
    completeMfaLogin?: (mfaToken: string, totpCode: string, schemaName: string) => Promise<MfaCompleteResult>;
};

const tenantAuthService = AuthService as TenantAuthService;

function getErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

// ============================================================================
// Cookie Configuration Helpers
// ============================================================================

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Extract tenant subdomain from request for cookie domain isolation
 * Uses the Origin header to get the frontend domain, not the server host
 * - Origin: http://vdm.localhost:5173 -> vdm.localhost
 * - Origin: http://raj.localhost:5173 -> raj.localhost
 * - Origin: https://raj.schoolerp.com -> raj.schoolerp.com
 */
function getTenantCookieDomain(req: Request): string | undefined {
    // Get the frontend origin (where the request came from)
    const origin = req.get('origin') || req.get('referer') || '';

    try {
        // Parse the origin URL to extract hostname
        const url = new URL(origin);
        const hostname = url.hostname;

        // For localhost subdomains (dev): vdm.localhost, raj.localhost
        if (hostname.endsWith('.localhost')) {
            return hostname;
        }

        // For plain localhost (no subdomain), don't set domain
        // This allows the cookie to be set on the exact origin
        if (hostname === 'localhost') {
            return undefined;
        }

        // For production: exact subdomain for isolation
        return hostname;
    } catch {
        // If origin parsing fails, don't set domain (defaults to server domain)
        return undefined;
    }
}

/**
 * Get cookie options for access token (short-lived, tenant-scoped)
 */
function getAccessTokenCookieOptions(req: Request): CookieOptions {
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: '/api/v1/tenant',
        domain: getTenantCookieDomain(req),
    };
}

/**
 * Get cookie options for refresh token (long-lived, tenant-scoped)
 */
function getRefreshTokenCookieOptions(req: Request): CookieOptions {
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/v1/tenant/auth',
        domain: getTenantCookieDomain(req),
    };
}

/**
 * Generate a secure CSRF token
 */
function generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

async function handleMfaCompletion(
    req: AuthenticatedRequest,
    res: Response,
    mfaToken: string,
    totpCode: string
): Promise<Response> {
    const tenant = getTenant();
    if (!tenant) {
        return res.status(400).json({ success: false, error: 'Tenant context required' });
    }

    if (typeof tenantAuthService.completeMfaLogin !== 'function') {
        return res.status(503).json({ success: false, error: 'MFA completion not yet available' });
    }

    const result = await tenantAuthService.completeMfaLogin(mfaToken, totpCode, tenant.db_schema);

    const useHttpOnlyCookies = req.headers['x-storage-preference'] !== 'local-storage';

    if (result.tokens) {
        res.cookie('refresh_token', result.tokens.refreshToken, getRefreshTokenCookieOptions(req as unknown as Request));

        if (useHttpOnlyCookies) {
            res.cookie('access_token', result.tokens.accessToken, getAccessTokenCookieOptions(req as unknown as Request));
            const csrfToken = generateCSRFToken();
            res.cookie('csrf_token', csrfToken, {
                ...getAccessTokenCookieOptions(req as unknown as Request),
                httpOnly: false,
            });
        }
    }

    return res.json({
        success: true,
        data: {
            user: result.user,
            accessToken: useHttpOnlyCookies ? undefined : result.tokens?.accessToken,
            refreshToken: result.tokens?.refreshToken,
            expiresIn: result.tokens?.expiresIn,
            storageMode: useHttpOnlyCookies ? 'httponly' : 'local',
        },
    });
}

// ============================================================================
// Tenant Auth Controller
// ============================================================================

/**
 * POST /auth/register
 * Register a new user in the current tenant
 */
export const register = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    const { email, password, firstName, lastName, phone } = req.body;

    // Validate required fields
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: 'Email and password are required',
        });
    }

    // Get tenant context
    const tenant = getTenant();
    if (!tenant) {
        return res.status(400).json({
            success: false,
            error: 'Tenant context required',
        });
    }

    const result = await AuthService.register(
        { email, password, firstName, lastName, phone },
        req as unknown as Request,
        tenant.db_schema,
        tenant.id
    );

    // Check client's storage preference
    const useHttpOnlyCookies = req.headers['x-storage-preference'] !== 'local-storage';

    // Set tenant-scoped refresh token cookie
    res.cookie('refresh_token', result.tokens.refreshToken, getRefreshTokenCookieOptions(req as unknown as Request));

    if (useHttpOnlyCookies) {
        // Store access token in httpOnly cookie for maximum security
        res.cookie('access_token', result.tokens.accessToken, getAccessTokenCookieOptions(req as unknown as Request));

        // Generate CSRF token (readable by JS for inclusion in headers)
        const csrfToken = generateCSRFToken();
        res.cookie('csrf_token', csrfToken, {
            ...getAccessTokenCookieOptions(req as unknown as Request),
            httpOnly: false, // Client needs to read this
        });
    }

    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
            user: result.user,
            accessToken: useHttpOnlyCookies ? undefined : result.tokens.accessToken,
            refreshToken: result.tokens.refreshToken,
            expiresIn: result.tokens.expiresIn,
            storageMode: useHttpOnlyCookies ? 'httponly' : 'local',
        },
    });
});

/**
 * POST /auth/login
 * Login with email and password
 */
export const login = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: 'Email and password are required',
        });
    }

    const tenant = getTenant();
    if (!tenant) {
        return res.status(400).json({
            success: false,
            error: 'Tenant context required',
        });
    }

    try {
        const result = await AuthService.login(
            { email, password },
            req as unknown as Request,
            tenant.db_schema
        );

        // Check client's storage preference
        const useHttpOnlyCookies = req.headers['x-storage-preference'] !== 'local-storage';

        // Set tenant-scoped refresh token cookie
        res.cookie('refresh_token', result.tokens.refreshToken, getRefreshTokenCookieOptions(req as unknown as Request));

        if (useHttpOnlyCookies) {
            // Store access token in httpOnly cookie for maximum security
            res.cookie('access_token', result.tokens.accessToken, getAccessTokenCookieOptions(req as unknown as Request));

            // Generate CSRF token
            const csrfToken = generateCSRFToken();
            res.cookie('csrf_token', csrfToken, {
                ...getAccessTokenCookieOptions(req as unknown as Request),
                httpOnly: false,
            });
        }

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: result.user,
                accessToken: useHttpOnlyCookies ? undefined : result.tokens.accessToken,
                refreshToken: result.tokens.refreshToken,
                expiresIn: result.tokens.expiresIn,
                storageMode: useHttpOnlyCookies ? 'httponly' : 'local',
            },
        });
    } catch (error) {

        logger.info(error);
        return res.status(401).json({
            success: false,
            error: getErrorMessage(error, 'Invalid credentials'),
        });
    }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
export const refresh = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    // Get refresh token from body or cookie
    const refreshToken = req.body.refreshToken || req.cookies?.refresh_token;

    if (!refreshToken) {
        return res.status(400).json({
            success: false,
            error: 'Refresh token required',
        });
    }

    const tenant = getTenant();
    if (!tenant) {
        return res.status(400).json({
            success: false,
            error: 'Tenant context required',
        });
    }

    try {
        const result = await AuthService.refreshToken(refreshToken, tenant.db_schema);

        // Check client's storage preference
        const useHttpOnlyCookies = req.headers['x-storage-preference'] !== 'local-storage';

        // Update cookies with new tokens
        res.cookie('refresh_token', result.tokens.refreshToken, getRefreshTokenCookieOptions(req as unknown as Request));

        if (useHttpOnlyCookies) {
            res.cookie('access_token', result.tokens.accessToken, getAccessTokenCookieOptions(req as unknown as Request));

            // Rotate CSRF token
            const csrfToken = generateCSRFToken();
            res.cookie('csrf_token', csrfToken, {
                ...getAccessTokenCookieOptions(req as unknown as Request),
                httpOnly: false,
            });
        }

        res.json({
            success: true,
            data: {
                accessToken: useHttpOnlyCookies ? undefined : result.tokens.accessToken,
                refreshToken: result.tokens.refreshToken,
                expiresIn: result.tokens.expiresIn,
                storageMode: useHttpOnlyCookies ? 'httponly' : 'local',
            },
        });
    } catch (error) {
        // Clear cookies on refresh failure
        res.clearCookie('refresh_token');
        res.clearCookie('access_token');
        res.clearCookie('csrf_token');

        return res.status(401).json({
            success: false,
            error: getErrorMessage(error, 'Token refresh failed'),
        });
    }
});

/**
 * POST /auth/logout
 * Logout current session
 */
export const logout = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    const tenant = getTenant();
    if (!tenant || !req.user?.sessionId) {
        return res.status(400).json({
            success: false,
            error: 'Invalid session',
        });
    }

    await AuthService.logout(req.user.sessionId, tenant.db_schema);

    // Clear refresh token cookie
    res.clearCookie('refresh_token');

    res.json({
        success: true,
        message: 'Logged out successfully',
    });
});

/**
 * POST /auth/logout-all
 * Logout from all devices
 */
export const logoutAll = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    const tenant = getTenant();
    if (!tenant || !req.user) {
        return res.status(400).json({
            success: false,
            error: 'Invalid session',
        });
    }

    const { keepCurrent } = req.body;
    const exceptSessionId = keepCurrent ? req.user.sessionId : undefined;

    const revokedCount = await AuthService.logoutAll(
        req.user.userId,
        tenant.db_schema,
        exceptSessionId
    );

    // Clear cookie if not keeping current
    if (!keepCurrent) {
        res.clearCookie('refresh_token');
    }

    res.json({
        success: true,
        message: `Logged out from ${revokedCount} device(s)`,
        data: { revokedCount },
    });
});

/**
 * GET /auth/me
 * Get current user profile
 */
export const me = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    const tenant = getTenant();
    if (!tenant || !req.user) {
        return res.status(401).json({
            success: false,
            error: 'Not authenticated',
        });
    }

    const user = await AuthService.getUserById(req.user.userId, tenant.db_schema);

    if (!user) {
        return res.status(404).json({
            success: false,
            error: 'User not found',
        });
    }

    res.json({
        success: true,
        data: { user },
    });
});

/**
 * GET /auth/sessions
 * Get all active sessions for current user
 */
export const sessions = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    const tenant = getTenant();
    if (!tenant || !req.user) {
        return res.status(401).json({
            success: false,
            error: 'Not authenticated',
        });
    }

    const activeSessions = await AuthService.getActiveSessions(
        req.user.userId,
        tenant.db_schema,
        req.user.sessionId
    );

    res.json({
        success: true,
        data: { sessions: activeSessions },
    });
});

/**
 * DELETE /auth/sessions/:sessionId
 * Revoke a specific session
 */
export const revokeSession = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    const { sessionId } = req.params;
    const tenant = getTenant();

    if (!tenant || !req.user) {
        return res.status(401).json({
            success: false,
            error: 'Not authenticated',
        });
    }

    // Prevent revoking current session via this endpoint
    if (sessionId === req.user.sessionId) {
        return res.status(400).json({
            success: false,
            error: 'Cannot revoke current session. Use /logout instead.',
        });
    }

    try {
        await AuthService.revokeSession(sessionId as string, req.user.userId, tenant.db_schema);

        res.json({
            success: true,
            message: 'Session revoked successfully',
        });
    } catch (error) {
        return res.status(404).json({
            success: false,
            error: getErrorMessage(error, 'Session not found'),
        });
    }
});

/**
 * POST /auth/forgot-password
 * Initiate password reset â€” sends reset token via email.
 * FIXED: Was missing from tenant auth router (returned 404).
 * Now returns 200 with a generic message (security: don't reveal if email exists).
 */
export const forgotPassword = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const tenant = getTenant();
    if (!tenant) {
        return res.status(400).json({ success: false, error: 'Tenant context required' });
    }

    try {
        // Delegate to AuthService if it has forgotPassword, otherwise stub
        if (typeof tenantAuthService.forgotPassword === 'function') {
            await tenantAuthService.forgotPassword(email, tenant.db_schema, tenant.id);
        }
        // Always return 200 â€” don't reveal whether email exists (security)
        return res.json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.',
        });
    } catch {
        return res.json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.',
        });
    }
});

/**
 * POST /auth/reset-password
 * Complete password reset using token from email.
 * FIXED: Was missing from tenant auth router (returned 404).
 */
export const resetPassword = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ success: false, error: 'token and newPassword are required' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    const tenant = getTenant();
    if (!tenant) {
        return res.status(400).json({ success: false, error: 'Tenant context required' });
    }

    try {
        if (typeof tenantAuthService.resetPassword === 'function') {
            await tenantAuthService.resetPassword(token, newPassword, tenant.db_schema);
            return res.json({ success: true, message: 'Password reset successfully. Please log in.' });
        }
        return res.status(501).json({ success: false, error: 'Password reset not yet implemented' });
    } catch (error) {
        return res.status(400).json({ success: false, error: getErrorMessage(error, 'Password reset failed') });
    }
});

/**
 * POST /auth/mfa/verify
 * Verify MFA code (TOTP) for the current session.
 * FIXED: Was missing from tenant auth router (returned 404).
 */
export const verifyMfa = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
) => {
    const { mfaToken, totpCode } = (req as any).validatedBody ?? req.body;
    if (!mfaToken || !totpCode) {
        return res.status(400).json({ success: false, error: 'mfaToken and totpCode are required' });
    }

    try {
        return await handleMfaCompletion(req, res, mfaToken, totpCode);
    } catch (error) {
        return res.status(400).json({ success: false, error: getErrorMessage(error, 'MFA completion failed') });
    }
});

/**
 * POST /auth/mfa/setup
 * Set up MFA (TOTP) for the authenticated user.
 * FIXED: Was missing from tenant auth router (returned 404).
 */
export const setupMfa = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
) => {
    const tenant = getTenant();
    if (!tenant || !req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    try {
        if (typeof tenantAuthService.setupMfa === 'function') {
            const result = await tenantAuthService.setupMfa(req.user.userId, tenant.db_schema);
            return res.json({ success: true, data: result });
        }
        return res.status(501).json({ success: false, error: 'MFA setup not yet implemented' });
    } catch (error) {
        return res.status(400).json({ success: false, error: getErrorMessage(error, 'MFA setup failed') });
    }
});

/**
 * POST /auth/mfa/complete
 * Complete MFA login after verification.
 * STABILIZATION: Added dedicated handler - was incorrectly wired to verifyMfa.
 */
export const completeMfaLogin = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction
) => {
    const { mfaToken, totpCode } = (req as any).validatedBody ?? req.body;

    if (!mfaToken || !totpCode) {
        return res.status(400).json({ success: false, error: 'mfaToken and totpCode are required' });
    }

    try {
        return await handleMfaCompletion(req, res, mfaToken, totpCode);
    } catch (error) {
        return res.status(400).json({ success: false, error: getErrorMessage(error, 'MFA completion failed') });
    }
});

/**
 * POST /auth/change-password
 * Change password for current user
 */
export const changePassword = asyncHandler(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    const { currentPassword, newPassword } = req.body;
    const tenant = getTenant();

    if (!tenant || !req.user) {
        return res.status(401).json({
            success: false,
            error: 'Not authenticated',
        });
    }

    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            error: 'Current password and new password are required',
        });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
        return res.status(400).json({
            success: false,
            error: 'New password must be at least 8 characters',
        });
    }

    try {
        await AuthService.changePassword(
            req.user.userId,
            currentPassword,
            newPassword,
            tenant.db_schema,
            req.user.sessionId
        );

        res.json({
            success: true,
            message: 'Password changed successfully. Other sessions have been logged out.',
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            error: getErrorMessage(error, 'Password change failed'),
        });
    }
});
