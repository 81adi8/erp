/**
 * RBAC Middleware
 * 
 * Express middleware for attaching RBAC context and authorization guards.
 * Must be placed AFTER tenant and auth middleware.
 * 
 * SECURITY RULES (TASK-02 HARDENING):
 * - Tenant context is MANDATORY for tenant RBAC
 * - Root routes MUST use platform RBAC only
 * - No route executes RBAC without full identity chain
 * 
 * Pipeline: tenant → auth → rbac → routes
 */

import { Request, Response, NextFunction } from 'express';
import { RBACContext, PermissionKey, RoleId } from './rbac.types';
import { RBACResolver } from './rbac.resolver';
import { RBACEngine } from './rbac.engine';
import { ApiError } from '../http/ApiError';
import { HttpStatus } from '../http/HttpStatus';
import { TenantContext } from '../../modules/tenant/types/tenant.types';
import { resolvePermission } from './permission-map';
import { TenantShadowTelemetry } from '../tenant/tenant-shadow.telemetry';
import { logger } from '../utils/logger';

// Root route prefixes that MUST use platform RBAC
const ROOT_ROUTE_PREFIXES = [
  '/v1/root/admin',
  '/v1/root',
  '/api/v1/system',
  '/api/v1/platform'
];

// Extend Express Request to include RBAC
declare global {
  namespace Express {
    interface Request {
      rbac?: RBACContext;
      rbacInvocationCount?: number; // Guardrail: tracks resolver calls per request
    }
  }
}

export interface RBACMiddlewareOptions {
  resolver: RBACResolver;
}

/**
 * Check if route is a root/platform route
 */
function isRootRoute(path: string): boolean {
  return ROOT_ROUTE_PREFIXES.some(prefix => path.startsWith(prefix));
}

/**
 * Create RBAC middleware factory
 * Attaches RBAC context to request
 * 
 * SECURITY (TASK-02 HARDENING):
 * - Tenant context is MANDATORY for tenant RBAC
 * - Root routes are BLOCKED from using tenant RBAC
 * - Full identity chain required before resolution
 * 
 * Stage 0 Observability:
 * - rbac_resolve_ms: resolver latency
 * - rbac_cache: hit | miss
 * - permission_count: number of permissions
 * - role_count: number of roles
 * - tenant_id, plan_id: tenant distribution
 */
export function createRBACMiddleware(options: RBACMiddlewareOptions) {
  const { resolver } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Guardrail: Track invocation count per request (should be exactly 1)
      req.rbacInvocationCount = (req.rbacInvocationCount || 0) + 1;
      
      // Skip if already attached (e.g., from previous middleware)
      if (req.rbac) {
        return next();
      }

      // ============================================================
      // SECURITY: Root route check
      // Root routes MUST use platform RBAC, not tenant RBAC
      // ============================================================
      if (isRootRoute(req.path)) {
        TenantShadowTelemetry.rootRouteRbacMissing({
          path: req.path,
          reason: 'tenant_rbac_on_root_route',
          hint: 'Use attachPlatformRBACContext for root routes'
        });
        // For root routes, skip tenant RBAC - platform RBAC should be used
        // This is not an error, just skip tenant RBAC resolution
        return next();
      }

      // Get tenant and user from request (must be set by previous middleware)
      const tenant = req.tenant as TenantContext | undefined;
      const user = req.user as { userId: string } | undefined;

      // ============================================================
      // SECURITY: Mandatory tenant context
      // ============================================================
      if (!tenant) {
        TenantShadowTelemetry.rbacTenantMissing({
          path: req.path,
          reason: 'RBAC_CONTEXT_MISSING',
          user_id: user?.userId
        });
        return next(new ApiError(
          HttpStatus.INTERNAL_SERVER_ERROR, 
          'RBAC_CONTEXT_MISSING: Tenant context required for RBAC'
        ));
      }

      if (!user) {
        return next(ApiError.unauthorized('Authentication required'));
      }

      // Resolve RBAC context
      const result = await resolver.resolve({
        userId: user.userId,
        tenant,
        institutionId: tenant.id // Use tenant as institution for now
      });

      // Attach to request
      req.rbac = result.context;

      // Track latency
      TenantShadowTelemetry.rbacResolutionLatency(result.resolutionTime, {
        tenant_id: tenant.id,
        user_id: user.userId,
        cache_hit: result.fromCache
      });

      // Stage 0 Observability: Log RBAC metrics (structured, low-volume)
      // Only log every 100th request in production to reduce noise
      const shouldLog = process.env.NODE_ENV !== 'production' || Math.random() < 0.01;
      if (shouldLog) {
        logger.info(JSON.stringify({
          event: 'rbac_resolution',
          timestamp: new Date().toISOString(),
          rbac_resolve_ms: result.resolutionTime,
          rbac_cache: result.fromCache ? 'hit' : 'miss',
          rbac_invocation_count_per_request: req.rbacInvocationCount,
          cache_key: `rbac:${result.context.tenantId}:${result.context.userId}`,
          permission_count: result.context.permissions.length,
          role_count: result.context.roles.length,
          tenant_id: result.context.tenantId,
          plan_id: result.context.planId || 'none',
          user_id: result.context.userId,
          path: req.path,
          method: req.method
        }));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require specific permission(s)
 * Throws 403 if user lacks permission
 * 
 * MIGRATION: Maps legacy permission keys to RBAC keys before checking
 * This allows gradual migration from legacy to RBAC permission system
 */
export function requirePermission(...permissions: PermissionKey[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.rbac) {
      return next(ApiError.internal('RBAC context not attached'));
    }

    const engine = new RBACEngine(req.rbac);
    
    // MIGRATION: Map legacy permissions to RBAC permissions
    const rbacPermissions = permissions.map(p => resolvePermission(p as string));
    
    if (!engine.hasAnyPermission(rbacPermissions)) {
      const missing = engine.getMissingPermissions(rbacPermissions);
      return next(ApiError.forbidden(
        `Permission denied. Missing: ${missing.join(', ')}`,
        [{ code: 'INSUFFICIENT_PERMISSION', permissions: missing }]
      ));
    }

    next();
  };
}

/**
 * Require ALL specified permissions
 * Throws 403 if user lacks any
 * 
 * MIGRATION: Maps legacy permission keys to RBAC keys before checking
 */
export function requireAllPermissions(...permissions: PermissionKey[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.rbac) {
      return next(ApiError.internal('RBAC context not attached'));
    }

    const engine = new RBACEngine(req.rbac);
    
    // MIGRATION: Map legacy permissions to RBAC permissions
    const rbacPermissions = permissions.map(p => resolvePermission(p as string));
    
    if (!engine.hasAllPermissions(rbacPermissions)) {
      const missing = engine.getMissingPermissions(rbacPermissions);
      return next(ApiError.forbidden(
        `Permission denied. Missing: ${missing.join(', ')}`,
        [{ code: 'INSUFFICIENT_PERMISSION', permissions: missing }]
      ));
    }

    next();
  };
}

/**
 * Require specific role(s)
 * Throws 403 if user lacks role
 */
export function requireRole(...roles: RoleId[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.rbac) {
      return next(ApiError.internal('RBAC context not attached'));
    }

    const engine = new RBACEngine(req.rbac);
    
    if (!engine.hasAnyRole(roles)) {
      return next(ApiError.forbidden(
        'Access denied. Required role not found.',
        [{ code: 'INSUFFICIENT_ROLE', roles }]
      ));
    }

    next();
  };
}

/**
 * Require permission OR role (either satisfies)
 */
export function requirePermissionOrRole(
  permissions: PermissionKey[],
  roles: RoleId[]
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.rbac) {
      return next(ApiError.internal('RBAC context not attached'));
    }

    const engine = new RBACEngine(req.rbac);
    
    const hasPermission = permissions.length > 0 && engine.hasAnyPermission(permissions);
    const hasRole = roles.length > 0 && engine.hasAnyRole(roles);
    
    if (!hasPermission && !hasRole) {
      return next(ApiError.forbidden(
        'Access denied. Insufficient permissions or roles.',
        [{
          code: 'INSUFFICIENT_ACCESS',
          missingPermissions: engine.getMissingPermissions(permissions),
          requiredRoles: roles
        }]
      ));
    }

    next();
  };
}

/**
 * Flexible RBAC check
 */
export function requireRBAC(options: {
  permissions?: PermissionKey[];
  roles?: RoleId[];
  requireAll?: boolean;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.rbac) {
      return next(ApiError.internal('RBAC context not attached'));
    }

    const engine = new RBACEngine(req.rbac);
    
    if (!engine.check(options)) {
      const missingPerms = options.permissions 
        ? engine.getMissingPermissions(options.permissions)
        : [];
      const missingRoles = options.roles
        ? engine.getMissingRoles(options.roles)
        : [];
      
      return next(ApiError.forbidden(
        'Access denied.',
        [{
          code: 'INSUFFICIENT_ACCESS',
          missingPermissions: missingPerms,
          missingRoles: missingRoles
        }]
      ));
    }

    next();
  };
}

/**
 * Get RBAC engine from request
 * For use in controllers/services
 */
export function getRBACEngine(req: Request): RBACEngine {
  if (!req.rbac) {
    throw new Error('RBAC context not attached to request');
  }
  return new RBACEngine(req.rbac);
}

/**
 * Check if user has permission (non-throwing)
 * For conditional logic in controllers
 */
export function hasPermission(req: Request, permission: PermissionKey): boolean {
  if (!req.rbac) return false;
  const engine = new RBACEngine(req.rbac);
  return engine.hasPermission(permission);
}

export default {
  createRBACMiddleware,
  requirePermission,
  requireAllPermissions,
  requireRole,
  requirePermissionOrRole,
  requireRBAC,
  getRBACEngine,
  hasPermission
};
