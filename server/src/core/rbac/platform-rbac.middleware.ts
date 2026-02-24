import { NextFunction, Request, Response } from 'express';
import { ApiError } from '../http/ApiError';
import { RBACContext } from './rbac.types';
import { TenantShadowTelemetry } from '../tenant/tenant-shadow.telemetry';
import { AuthUser } from '../types/api';

type PlatformScope = 'root' | 'system' | 'platform';

// Valid platform permission prefixes
const PLATFORM_PERMISSION_PREFIXES = ['root.', 'system.', 'platform.'];

const normalizePermissions = (rawPermissions: unknown): string[] => {
    if (Array.isArray(rawPermissions)) {
        return [...new Set(rawPermissions.filter((p): p is string => typeof p === 'string' && p.length > 0))];
    }

    if (rawPermissions && typeof rawPermissions === 'object') {
        const permissionMap = rawPermissions as Record<string, unknown>;
        return Object.entries(permissionMap)
            .filter(([, value]) => value === true)
            .map(([key]) => key);
    }

    return [];
};

/**
 * Validates that permissions are platform-scoped
 * Prevents tenant permissions from leaking into platform context
 */
const validatePlatformPermissions = (permissions: string[]): string[] => {
    return permissions.filter(perm => {
        const isPlatform = PLATFORM_PERMISSION_PREFIXES.some(prefix => perm.startsWith(prefix));
        if (!isPlatform) {
            TenantShadowTelemetry.rbacGlobalResolutionAttempt({
                permission: perm,
                reason: 'tenant_permission_in_platform_context'
            });
        }
        return isPlatform;
    });
};

/**
 * Attaches a platform-scoped RBAC context for root/system control-plane routes.
 *
 * SECURITY (TASK-02 HARDENING):
 * - Only platform-scoped permissions allowed (root.*, system.*, platform.*)
 * - Tenant RBAC is BLOCKED on these routes
 * - Validates that req.tenant is NOT set (ensures isolation)
 *
 * These routes do not run in tenant context, so we derive effective permissions
 * from authenticated token claims and bind them to req.rbac for standard RBAC
 * middleware checks.
 */
export const attachPlatformRBACContext = (scope: PlatformScope = 'platform') => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        // ============================================================
        // SECURITY: Ensure no tenant context leakage
        // Platform routes must NEVER have tenant context
        // ============================================================
        const tenant = req.tenant;
        if (tenant) {
            TenantShadowTelemetry.rbacCacheCrossTenant({
                tenant_id: tenant.id,
                reason: 'tenant_context_on_platform_route',
                path: req.path
            });
            // Clear tenant context for safety - platform routes are tenant-agnostic
            req.tenant = undefined;
        }

        const user = req.user as (AuthUser & {
            roles?: unknown;
            permissions?: unknown;
        }) | undefined;

        if (!user?.userId) {
            return next(ApiError.unauthorized('Authentication required'));
        }

        const roles = Array.isArray(user.roles)
            ? [...new Set(user.roles.filter((role): role is string => typeof role === 'string' && role.length > 0))]
            : [];

        let permissions = normalizePermissions(user.permissions);
        
        // SECURITY: Filter to only platform-scoped permissions
        permissions = validatePlatformPermissions(permissions);

        // Root admin (is_main) gets all platform permissions
        if (user.is_main) {
            permissions = [
                'root.config.view', 'root.config.manage',
                'root.tenants.manage', 'root.institutions.view', 'root.institutions.manage',
                'root.auth.sessions.manage', 'root.auth.2fa.manage',
                'system.queues.manage', 'system.platform.manage'
            ];
        }

        const context: RBACContext = {
            userId: user.userId,
            tenantId: `platform:${scope}`,
            roles,
            permissions,
            planId: 'platform',
            features: [],
            source: {
                roles: 'db',
                permissions: 'db',
                resolvedAt: new Date(),
                cacheTtl: 0
            },
            sourceMap: {
                rolePermissions: [],
                userOverrides: permissions,
                planPermissions: permissions,
                adminDelegations: [],
                featureFlags: permissions
            }
        };

        req.rbac = context;
        next();
    };
};

/**
 * Require platform permission for root/admin routes
 * Use this instead of requirePermission for platform routes
 */
export const requirePlatformPermission = (...permissions: string[]) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.rbac) {
            TenantShadowTelemetry.rootRouteRbacMissing({
                path: req.path,
                reason: 'no_rbac_context'
            });
            return next(ApiError.internal('RBAC context not attached'));
        }

        // Verify this is a platform context
        if (!req.rbac.tenantId.startsWith('platform:')) {
            TenantShadowTelemetry.rootRouteRbacMissing({
                path: req.path,
                reason: 'tenant_rbac_on_platform_route',
                tenant_id: req.rbac.tenantId
            });
            return next(ApiError.forbidden('Platform RBAC required for this route'));
        }

        // Check permissions
        const hasPermission = permissions.some(p => req.rbac!.permissions.includes(p));
        if (!hasPermission) {
            return next(ApiError.forbidden(
                `Permission denied. Required: ${permissions.join(' OR ')}`,
                [{ code: 'INSUFFICIENT_PLATFORM_PERMISSION', required: permissions }]
            ));
        }

        next();
    };
};
