// ============================================================================
// Core Auth Utilities
// ============================================================================
// This module contains common auth utilities kept in core.
// Main auth services are in modules/auth

// Core utilities
export { jwtUtil, type AccessTokenPayload, type RefreshTokenPayload } from './jwt';
export { passwordUtil } from './password';

// Re-export from modules/auth for backward compatibility
export * from '../../modules/auth';
