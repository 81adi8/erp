import { Response, NextFunction } from 'express';
import { CustomRequest } from '../types/CustomRequest';
import { jwtUtil } from '../auth/jwt';
import { ApiError } from '../http/ApiError';
import { HttpStatus } from '../http/HttpStatus';
import { Admin } from '../../database/models/root/Admin.model';
import { AdminSession } from '../../database/models/root/AdminSession.model';

/**
 * Root Auth Middleware
 * 
 * Validates that the request is from a valid root admin or sub-root admin:
 * 1. Extracts token from Authorization header or HTTP-only cookie
 * 2. Verifies JWT token is valid
 * 3. Checks that the session is still valid (not revoked)
 * 4. Checks that the admin account is active
 * 5. Attaches user info to request
 */
export const rootAuthMiddleware = async (req: CustomRequest, res: Response, next: NextFunction) => {
    let token: string | undefined;

    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // Fallback to HTTP-only cookie
    if (!token && req.cookies?.auth_token) {
        token = req.cookies.auth_token;
    }

    if (!token) {
        return next(new ApiError(HttpStatus.UNAUTHORIZED, 'No authentication token provided'));
    }

    try {
        // Verify JWT
        const payload = jwtUtil.verifyAccess(token);

        // Must be admin type
        if (payload.type !== 'admin') {
            return next(new ApiError(HttpStatus.FORBIDDEN, 'Access restricted to admin users'));
        }

        // Verify session is still valid
        if (payload.sessionId) {
            const session = await AdminSession.findOne({
                where: {
                    id: payload.sessionId,
                    revoked_at: null
                }
            });

            if (!session) {
                return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Session expired or revoked'));
            }

            // Update last active
            await session.update({ last_active_at: new Date() });
        }

        // Verify admin is still active
        const admin = await Admin.findOne({
            where: {
                id: payload.userId,
                is_active: true
            },
            attributes: ['id', 'email', 'name', 'role', 'is_main', 'permissions', 'valid_until']
        });

        if (!admin) {
            return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Admin account not found or deactivated'));
        }

        // Check valid_until date for sub-admins
        if (!admin.is_main && admin.valid_until && new Date(admin.valid_until) < new Date()) {
            return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Admin account has expired'));
        }

        // Attach to request - map permissions properly
        const payloadPermissions = payload.permissions 
            ? Object.keys(payload.permissions) 
            : undefined;
            
        req.user = {
            ...payload,
            roles: payload.roles || [],
            permissions: payloadPermissions,
            admin: {
                id: admin.id,
                email: admin.email,
                name: admin.name,
                role: admin.role,
                is_main: admin.is_main,
                permissions: admin.permissions
            }
        };

        next();
    } catch (error: unknown) {
        if (error instanceof Error) {
            if (error.name === 'TokenExpiredError') {
                return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Token expired'));
            }
            if (error.name === 'JsonWebTokenError') {
                return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Invalid token'));
            }
        }
        return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Authentication failed'));
    }
};

/**
 * Require main admin (root) access
 * Must be used after rootAuthMiddleware
 */
export const requireMainAdmin = (req: CustomRequest, res: Response, next: NextFunction) => {
    if (!req.user?.admin?.is_main) {
        return next(new ApiError(HttpStatus.FORBIDDEN, 'This action requires root admin access'));
    }
    next();
};

/**
 * Require specific permission
 * Must be used after rootAuthMiddleware
 * Root admin bypasses permission checks
 */
export const requirePermission = (permission: string) => {
    return (req: CustomRequest, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user?.admin) {
            return next(new ApiError(HttpStatus.FORBIDDEN, 'Access denied'));
        }

        // Root admin has all permissions
        if (user.admin.is_main) {
            return next();
        }

        // Check specific permission
        if (!user.admin.permissions?.[permission]) {
            return next(new ApiError(HttpStatus.FORBIDDEN, `Missing required permission: ${permission}`));
        }

        next();
    };
};
