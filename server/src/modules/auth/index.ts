// ============================================================================
// Centralized Auth Module - Public Exports
// ============================================================================

// Types
export * from './auth.types';

// Services
export { AuthService } from './auth.service';
export { TokenService } from './token.service';
export { SessionService } from './session.service';

// Middleware
export {
    authMiddleware,
    requireAuth,
    optionalAuth,
    requireRoles,
    requirePermissions,
} from './auth.middleware';

// Utilities (re-exported from core)
export {
    extractDeviceInfo,
    getClientIp,
    parseUserAgent,
    generateDeviceId,
    createSessionFingerprint,
} from '../../core/utils/device.util';
