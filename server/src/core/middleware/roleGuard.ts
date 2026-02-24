import { Response, NextFunction } from 'express';
import { ApiError } from '../http/ApiError';
import { HttpStatus } from '../http/HttpStatus';
import { ApiRequest } from '../types/api';
import { logger } from '../utils/logger';

/**
 * Role-based guard middleware
 * @deprecated Use RBAC middleware from core/rbac/rbac.middleware
 */
export const roleGuard = (requiredPermission?: string) => (req: ApiRequest, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV !== 'production') {
        logger.warn('[DEPRECATED] roleGuard middleware invoked. Use RBAC instead.');
    }
    
    const user = req.user;

    if (!user) {
        return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Authentication required'));
    }

    // Root Admin (is_main: true) has access to everything
    if (user.is_main) {
        return next();
    }

    // If a specific permission is required, check if user has it
    if (requiredPermission) {
        const hasPermission = user.permissions && user.permissions.includes(requiredPermission);
        if (!hasPermission) {
            return next(new ApiError(HttpStatus.FORBIDDEN, 'Insufficient permissions'));
        }
    }

    next();
};

export const rootAdminOnly = (req: ApiRequest, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV !== 'production') {
        logger.warn('[DEPRECATED] rootAdminOnly middleware invoked. Use RBAC instead.');
    }
    
    const user = req.user;
    if (!user || !user.is_main) {
        return next(new ApiError(HttpStatus.FORBIDDEN, 'Root admin access only'));
    }
    next();
};
