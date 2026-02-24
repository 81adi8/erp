/**
 * Keycloak OIDC Token Verification Middleware
 * 
 * Validates incoming JWT tokens against realm-specific JWKS endpoints.
 * Enforces issuer, audience, and expiration validation.
 * Maps Keycloak roles to application context.
 * 
 * SECURITY:
 * - Rejects requests without Bearer token
 * - Rejects tokens signed by wrong realm
 * - Rejects expired tokens
 * - Validates signature via JWKS
 */

import { Response, NextFunction } from 'express';
import { KeycloakService } from '../auth/keycloak.service';
import { AuthenticatedRequest } from '../../modules/auth/auth.types';
import { ApiError } from '../http/ApiError';
import { HttpStatus } from '../http/HttpStatus';
import { TenantShadowTelemetry } from '../tenant/tenant-shadow.telemetry';

// Role mapping from Keycloak realm roles to application roles
const ROLE_MAP: Record<string, string> = {
    'school_admin': 'admin',
    'admin': 'admin',
    'teacher': 'teacher',
    'student': 'student',
    'staff': 'staff',
    'parent': 'parent',
};

// Roles that require MFA verification
const MFA_REQUIRED_ROLES = new Set(['admin', 'school_admin', 'super_admin']);

const sanitizeRealm = (value: string | undefined): string | null => {
    if (!value) return null;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    return /^[a-z0-9._-]+$/.test(normalized) ? normalized : null;
};

const toLegacyRealm = (value: string): string =>
    `tenant_${value.replace(/-/g, '_').toLowerCase()}`;

const buildRealmCandidates = (req: AuthenticatedRequest): string[] => {
    const candidates: string[] = [];
    const pushCandidate = (value: string | null) => {
        if (!value) return;
        if (!candidates.includes(value)) {
            candidates.push(value);
        }
    };

    const subdomain = sanitizeRealm(req.tenant?.sub_domain);
    const slug = sanitizeRealm(req.tenant?.slug);
    const headerRealm = sanitizeRealm(req.headers['x-tenant-id'] as string | undefined);

    pushCandidate(subdomain);
    pushCandidate(slug);
    if (subdomain) pushCandidate(toLegacyRealm(subdomain));
    if (slug) pushCandidate(toLegacyRealm(slug));
    pushCandidate(headerRealm);

    return candidates;
};

/**
 * Keycloak OIDC Authentication Middleware
 * 
 * Validates JWT tokens against the tenant's Keycloak realm JWKS.
 * Must be used after tenantMiddleware (requires req.tenant).
 */
export const keycloakOidcMiddleware = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        // Extract Bearer token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new ApiError(HttpStatus.UNAUTHORIZED, 'No authentication token provided'));
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return next(new ApiError(HttpStatus.UNAUTHORIZED, 'No authentication token provided'));
        }

        let tenantId: string | undefined;

        if (req.tenant) {
            tenantId = req.tenant.id;
        }

        // Verify token against tenant realm candidates.
        // Includes a legacy realm format fallback for backward compatibility.
        const realmCandidates = buildRealmCandidates(req);
        let payload;
        let lastRealmError: unknown = null;

        if (realmCandidates.length === 0) {
            payload = await KeycloakService.verifyToken(token);
        } else {
            for (const realm of realmCandidates) {
                try {
                    payload = await KeycloakService.verifyToken(token, realm);
                    break;
                } catch (error) {
                    lastRealmError = error;
                }
            }
        }

        if (!payload) {
            throw (lastRealmError || new Error('Invalid realm'));
        }

        // Extract user identity from token claims
        const userId = payload.sub;
        const email = payload.email || payload.preferred_username || '';
        const username = payload.preferred_username || email;

        // Extract realm roles
        const realmRoles = KeycloakService.getRoles(payload);
        
        // Map to application roles
        const appRoles = realmRoles
            .map(role => ROLE_MAP[role.toLowerCase()] || role.toLowerCase())
            .filter(Boolean);

        // Validate tenant binding - check for tenant_id in token claims
        const tokenTenantId = (payload as any).tenant_id || (payload as any).tid;
        if (tenantId && tokenTenantId && tokenTenantId !== tenantId) {
            TenantShadowTelemetry.tenantTokenMismatch({
                reason: 'keycloak_tenant_mismatch',
                tenant_id: tenantId,
                token_tid: tokenTenantId,
                route: req.originalUrl || req.url,
            });
            return next(new ApiError(HttpStatus.UNAUTHORIZED, 'TENANT_TOKEN_MISMATCH'));
        }

        // Attach user to request
        // SECURITY: Token roles are NOT trusted for authorization
        // They are only provided for identity/metadata purposes
        // All authorization decisions MUST use req.rbac (runtime DB permissions)
        req.user = {
            userId,
            email,
            roles: appRoles, // Use roles instead of tokenRoles to match AccessTokenPayload interface
            permissions: [], // Always empty - RBAC resolves from DB via req.rbac
            sessionId: '', // Keycloak manages sessions
            tenantId: tenantId || tokenTenantId,
            institutionId: tenantId || tokenTenantId,
            type: 'tenant', // All Keycloak authenticated users are tenant users
        };

        next();
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        
        // Map error types to appropriate HTTP status
        if (err.message.includes('expired')) {
            return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Token expired'));
        }
        if (err.message.includes('invalid') || err.message.includes('signature')) {
            return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Invalid token'));
        }
        if (err.message.includes('realm')) {
            return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Invalid realm'));
        }
        
        return next(new ApiError(HttpStatus.UNAUTHORIZED, err.message || 'Authentication failed'));
    }
};

/**
 * Optional Keycloak auth - sets req.user if valid token, continues otherwise
 */
export const optionalKeycloakMiddleware = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return next();
        }
        let expectedRealm: string | undefined;

        if (req.tenant) {
            expectedRealm = req.tenant.sub_domain || req.tenant.slug;
        }

        const payload = await KeycloakService.verifyToken(token, expectedRealm);
        const realmRoles = KeycloakService.getRoles(payload);
        const appRoles = realmRoles
            .map(role => ROLE_MAP[role.toLowerCase()] || role.toLowerCase())
            .filter(Boolean);

        req.user = {
            userId: payload.sub,
            email: payload.email || payload.preferred_username || '',
            roles: appRoles, // Use roles instead of tokenRoles to match AccessTokenPayload interface
            permissions: [],
            sessionId: '',
            tenantId: req.tenant?.id,
            institutionId: req.tenant?.id,
            type: 'tenant',
        };

        next();
    } catch {
        // Continue without user on error
        next();
    }
};

/**
 * Require specific role for route access
 * @deprecated DO NOT USE - Token roles are NOT trusted for authorization
 * Use requirePermission() from rbac.middleware with runtime DB permissions instead
 */
export const requireKeycloakRole = (...requiredRoles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Authentication required'));
        }

        const userRoles = req.user?.roles || [];
        const hasRole = requiredRoles.some(role => 
            userRoles.includes(role) || userRoles.includes(role.toLowerCase())
        );

        if (!hasRole) {
            return next(new ApiError(HttpStatus.FORBIDDEN, 'Insufficient permissions'));
        }

        next();
    };
};

/**
 * MFA requirement check for admin roles
 * @deprecated DO NOT USE - Token roles are NOT trusted for authorization
 * MFA is handled at Keycloak level - this middleware is not needed
 */
export const requireKeycloakMfa = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    if (!req.user) {
        return next(new ApiError(HttpStatus.UNAUTHORIZED, 'Authentication required'));
    }

    const userRoles = req.user?.roles || [];
    const requiresMfa = userRoles.some(role => MFA_REQUIRED_ROLES.has(role.toLowerCase()));

    if (!requiresMfa) {
        // Non-admin roles don't require MFA
        return next();
    }

    // Check if MFA was performed (Keycloak includes acr claim)
    // For now, we trust Keycloak's session - MFA is enforced at Keycloak level
    // In production, you may want to check acr claim or use Keycloak's step-up auth
    next();
};

// Legacy export for backward compatibility
export const keycloakMiddleware = keycloakOidcMiddleware;
