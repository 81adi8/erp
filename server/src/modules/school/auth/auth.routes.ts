/**
 * School Authentication Routes
 * 
 * MIGRATED TO KEYCLOAK OIDC
 * 
 * Password-based login has been DISABLED.
 * All authentication now flows through Keycloak OIDC.
 * 
 * Login flow:
 * 1. Frontend redirects to Keycloak login page
 * 2. User authenticates with Keycloak
 * 3. Keycloak returns access token
 * 4. Frontend uses token for API requests
 * 5. Backend validates token via JWKS
 */

import { Router, Request, Response } from 'express';
import { validate } from '../../../core/middleware/validate.middleware';
import { z } from 'zod';

const router = Router();
const emptyBodySchema = z.union([z.object({}).strict(), z.undefined()]).transform(() => ({}));

const sendSuccess = (res: Response, data: unknown, message: string, statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        errors: [],
    });
};

const sendError = (
    res: Response,
    message: string,
    statusCode: number,
    errors: string[] = [],
    extra: Record<string, unknown> = {}
) => {
    return res.status(statusCode).json({
        success: false,
        message,
        data: null,
        errors,
        ...extra,
    });
};

/**
 * @route   POST /v2/api/school/auth/login
 * @desc    DEPRECATED - Password login disabled. Use Keycloak OIDC.
 * @access  Public
 * 
 * This endpoint has been migrated to Keycloak OIDC.
 * Frontend should use keycloak.login() to redirect to Keycloak.
 */
router.post('/login', validate(emptyBodySchema), (_req: Request, res: Response) => {
    return sendError(
        res,
        'Password login has been deprecated. Please use Keycloak OIDC authentication.',
        410,
        ['AUTH_MIGRATED_TO_KEYCLOAK'],
        {
            code: 'AUTH_MIGRATED_TO_KEYCLOAK',
            migration: {
                method: 'OIDC',
                loginUrl: '/auth/keycloak/login',
                documentation: 'Authentication has been migrated to Keycloak. Use the Keycloak login flow.',
            },
        }
    );
});

/**
 * @route   GET /v2/api/school/auth/keycloak/config
 * @desc    Get Keycloak configuration for frontend
 * @access  Public
 */
router.get('/keycloak/config', (_req: Request, res: Response) => {
    const keycloakUrl = process.env.KEYCLOAK_URL || 'http://localhost:8080';

    return sendSuccess(
        res,
        {
            url: keycloakUrl,
            // Realm is determined by tenant subdomain
            clientId: 'school-frontend',
        },
        'Keycloak config fetched successfully'
    );
});

/**
 * @route   POST /v2/api/school/auth/logout
 * @desc    Logout - Frontend should use keycloak.logout()
 * @access  Public
 */
router.post('/logout', validate(emptyBodySchema), (_req: Request, res: Response) => {
    return sendSuccess(
        res,
        {
            keycloakLogoutUrl: `${process.env.KEYCLOAK_URL || 'http://localhost:8080'}/realms/{realm}/protocol/openid-connect/logout`,
        },
        'Please use Keycloak logout. Call keycloak.logout() on the frontend.'
    );
});

/**
 * @route   POST /v2/api/school/auth/refresh
 * @desc    DEPRECATED - Token refresh handled by Keycloak
 * @access  Public
 */
router.post('/refresh', validate(emptyBodySchema), (_req: Request, res: Response) => {
    return sendError(
        res,
        'Token refresh is handled by Keycloak. Use keycloak.updateToken() on the frontend.',
        410,
        ['AUTH_MIGRATED_TO_KEYCLOAK'],
        {
            code: 'AUTH_MIGRATED_TO_KEYCLOAK',
        }
    );
});

export default router;
