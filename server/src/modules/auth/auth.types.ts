import { Request } from 'express';

// ============================================================================
// DTOs - Data Transfer Objects
// ============================================================================

export interface LoginDTO {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export interface RefreshTokenDTO {
    refreshToken?: string;
}

export interface RegisterDTO {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    institutionId?: string;
}

export interface ChangePasswordDTO {
    currentPassword: string;
    newPassword: string;
}

export interface ForgotPasswordDTO {
    email: string;
}

export interface ResetPasswordDTO {
    token: string;
    newPassword: string;
}

// ============================================================================
// Auth Credentials & User Types
// ============================================================================

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
}

export interface AuthUser {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    roles: string[];
    permissions?: string[];
    institutionId?: string;
    isActive: boolean;
    isEmailVerified: boolean;
}

// ============================================================================
// Token Types
// ============================================================================

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface AccessTokenPayload {
    userId: string;
    tid?: string;                // tenant id (institution.id UUID) - PRIMARY tenant identity
    tenantId?: string;           // @deprecated - use tid instead
    institutionId?: string;      // @deprecated - use tid instead
    sessionId: string;
    sessionVersion?: number;     // For session invalidation
    mfa?: boolean;               // true when MFA was completed for this session
    scopes?: string[];           // Compact scope keys (e.g., ["academic:read", "settings:full"])
    roles?: string[];            // Role names (for legacy compatibility)
    permissions?: string[];      // Deprecated - use scopes instead
    type: 'tenant' | 'admin';
    email?: string;              // Optional - avoid storing in JWT if possible
    iat?: number;
    exp?: number;
}

export interface RefreshTokenData {
    id: string;
    sessionId: string;
    tokenHash: string;
    expiresAt: Date;
    rotatedFrom?: string;
    revokedAt?: Date;
    revokedReason?: string;
}

// ============================================================================
// Session & Device Types
// ============================================================================

export interface DeviceInfo {
    ip: string;
    userAgent: string;
    deviceId?: string;
    fingerprint?: string;
    browser?: string;
    os?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet' | 'unknown';
}

export interface SessionData {
    id: string;
    userId: string;
    institutionId?: string;
    deviceId?: string;
    deviceInfo: DeviceInfo;
    ip: string;
    userAgent: string;
    lastActiveAt: Date;
    createdAt: Date;
    revokedAt?: Date;
    revokeReason?: string;
}

export interface SessionInfo {
    id: string;
    deviceInfo: DeviceInfo;
    ip: string;
    lastActiveAt: Date;
    createdAt: Date;
    isCurrent: boolean;
}

// ============================================================================
// Auth Result Types
// ============================================================================

export interface AuthResult {
    user: AuthUser;
    tokens: TokenPair;
    session: SessionData;
}

export interface RefreshResult {
    tokens: TokenPair;
    session: SessionData;
}

// ============================================================================
// Request Extension
// ============================================================================

// Note: Express Request already has tenant?: Institution defined in types/express.d.ts
// We extend it with auth-specific properties
export interface AuthenticatedRequest extends Request {
    user?: AccessTokenPayload;
    session?: SessionData;
    requestId?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AuthConfig {
    accessTokenExpiry: string;     // e.g., '15m'
    refreshTokenExpiry: string;    // e.g., '7d'
    sessionInactivityLimit: number; // days before session expires
    maxActiveSessions: number;      // max concurrent sessions per user
    enableReuseDetection: boolean;  // kill session on token reuse
}

export const DEFAULT_AUTH_CONFIG: AuthConfig = {
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    sessionInactivityLimit: 30,
    maxActiveSessions: 5,
    enableReuseDetection: true,
};
