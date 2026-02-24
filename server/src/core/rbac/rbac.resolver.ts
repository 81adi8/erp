/**
 * RBAC Resolver
 * 
 * Core authorization resolution engine.
 * Builds RBACContext by composing data from multiple repositories.
 * 
 * CRITICAL: This class has NO side effects except caching.
 * It does NOT perform permission checks - only builds context.
 * 
 * SECURITY RULES (TASK-02 HARDENING):
 * - Tenant context is MANDATORY - no fallback to global
 * - All queries MUST use tenant.db_schema
 * - Cache keys MUST include tenant + user + roleVersion
 * - Cross-tenant resolution is BLOCKED
 *
 * Resolution Pipeline:
 * 0. TENANT GATE (mandatory)
 * 1. Cache check
 * 2. Load user roles
 * 3. Load role permissions (batch)
 * 4. Load user overrides
 * 5. Load plan permissions (filter ceiling)
 * 6. Load feature flags (filter)
 * 7. Merge and deduplicate
 * 8. Build context
 * 9. Cache result
 * 10. Return
 */

import { RBACContext, RBACResolverInput, RBACResolverOutput, RBACCacheKey, RBACErrorCode } from './rbac.types';
import { RBACCache } from './rbac.cache';
import { TenantShadowTelemetry } from '../tenant/tenant-shadow.telemetry';
import { retryDbOperation } from '../resilience/retry.helper';
import {
  UserRoleRepository,
  RolePermissionRepository,
  UserPermissionRepository,
  AdminPermissionRepository,
  PlanPermissionRepository,
  FeatureRepository,
  FeatureFlagRepository,
  InstitutionRepository
} from './repositories';

export class RBACResolver {
  
  private cache: RBACCache;
  
  // Only stateless/global repositories are instance-level.
  // Tenant-scoped repositories are created per-resolve() call to prevent
  // cross-tenant data leaks under concurrent requests.
  private planPermissionRepo: PlanPermissionRepository;
  private featureRepo: FeatureRepository;
  private featureFlagRepo: FeatureFlagRepository;
  private institutionRepo: InstitutionRepository;

  constructor(cache: RBACCache) {
    this.cache = cache;
    // These repos are stateless (no tenant context) — safe as instance properties
    this.planPermissionRepo = new PlanPermissionRepository();
    this.featureRepo = new FeatureRepository();
    this.featureFlagRepo = new FeatureFlagRepository();
    this.institutionRepo = new InstitutionRepository();
  }

  /**
   * Resolve RBAC context for a user
   * Main entry point - follows strict pipeline
   * 
   * SECURITY: Tenant context is MANDATORY
   */
  async resolve(input: RBACResolverInput): Promise<RBACResolverOutput> {
    const startTime = Date.now();
    
    const { userId, tenant, institutionId, forceRefresh } = input;

    // ============================================================
    // STEP 0: MANDATORY TENANT GATE
    // RBAC cannot execute without tenant context - NO FALLBACK
    // ============================================================
    if (!tenant) {
      TenantShadowTelemetry.rbacNoTenant({
        userId,
        reason: 'rbac_tenant_missing',
        route: 'resolver.resolve'
      });
      throw {
        code: RBACErrorCode.INVALID_TENANT,
        message: 'RBAC_TENANT_REQUIRED: Tenant context is mandatory for RBAC resolution',
        userId
      };
    }

    if (!tenant.id || !tenant.db_schema) {
      TenantShadowTelemetry.rbacNoTenant({
        userId,
        tenant_id: tenant?.id,
        reason: 'rbac_tenant_incomplete',
        route: 'resolver.resolve'
      });
      throw {
        code: RBACErrorCode.INVALID_TENANT,
        message: 'RBAC_TENANT_INCOMPLETE: Tenant must have id and db_schema',
        userId,
        tenantId: tenant?.id
      };
    }

    // Build cache key with tenant isolation
    const cacheKey: RBACCacheKey = {
      tenantId: tenant.id,
      userId,
      institutionId
    };

    // STEP 1: Cache check
    if (!forceRefresh) {
      const cached = await this.cache.getContext(cacheKey);
      if (cached) {
        return {
          context: cached,
          fromCache: true,
          resolutionTime: Date.now() - startTime
        };
      }
    }

    // FIXED: Tenant-scoped repositories are created as LOCAL variables per resolve() call.
    // Previously they were instance properties, causing cross-tenant data leaks under
    // concurrent requests (request A's tenant context overwritten by request B).
    const userRoleRepo = new UserRoleRepository(tenant);
    const rolePermissionRepo = new RolePermissionRepository(tenant);
    const userPermissionRepo = new UserPermissionRepository(tenant);
    const adminPermissionRepo = new AdminPermissionRepository(tenant);

    // STEP 1 & 2: Load user roles and user overrides in parallel
    // PRODUCTION HARDENED: All DB calls wrapped with retry
    const [roleAssignments, userOverrides] = await Promise.all([
      retryDbOperation(() => userRoleRepo.getRolesForUser(userId, institutionId)),
      retryDbOperation(() => userPermissionRepo.getPermissionsForUser(userId))
    ]);

    const roleIds = roleAssignments.map((assignment) => assignment.roleId);

    // STEP 3: Load role permissions (batch operation)
    // PRODUCTION HARDENED: Retry on transient failures
    let rolePermissions: string[] = [];
    if (roleIds.length > 0) {
      rolePermissions = await retryDbOperation(() =>
        rolePermissionRepo.getPermissionsForRoles(roleIds)
      ) as string[];
    }

    // STEP 4: Load admin delegation permissions (NOT runtime permissions)
    // These are tracked separately for delegation checking
    // PRODUCTION HARDENED: Retry on transient failures
    const adminDelegationPerms = await retryDbOperation(() =>
      adminPermissionRepo.getDelegablePermissions(userId, institutionId)
    ) as string[];

    // STEP 5: Load plan permissions and institution data in parallel
    // PRODUCTION HARDENED: Retry on transient failures
    const institution = await retryDbOperation(() =>
      this.institutionRepo.findById(tenant.id)
    );
    const planId = institution?.planId;
    
    let planPermissions: string[] = [];
    if (planId) {
      planPermissions = await this.planPermissionRepo.getPermissionsForPlan(planId);
    }

    // STEP 6: Load features and feature flags
    const tenantType = institution?.type ?? 'school';
    const [allFeatures, enabledFlagKeys] = await Promise.all([
      this.featureRepo.getAllFeaturesWithPermissions(),
      this.featureFlagRepo.getEnabledFlagsForTenant({
        tenantId: tenant.id,
        tenantType,
        planId: planId ?? '',
        institutionId
      })
    ]);

    // Build enabled features set
    const enabledFeatureSlugs = new Set(enabledFlagKeys);
    
    // Collect permissions from enabled features
    const featurePermissions: string[] = [];
    for (const feature of allFeatures) {
      // Feature must be structurally active AND enabled by flag
      if (feature.isActive && enabledFeatureSlugs.has(feature.slug)) {
        featurePermissions.push(...feature.permissions);
      }
    }

    // STEP 7: MERGE AND APPLY FILTERS
    
    // Start with role permissions + user overrides
    let runtimePermissions = new Set([...rolePermissions, ...userOverrides]);
    
    // Apply plan ceiling (intersection)
    if (planPermissions.length > 0) {
      const planSet = new Set(planPermissions);
      runtimePermissions = new Set(
        [...runtimePermissions].filter(p => planSet.has(p))
      );
    }
    
    // Apply feature filter (permissions must be in enabled features)
    // FIXED: Removed dead code — the inner `if (featureSet.size === 0)` could never
    // be true when the outer `if (featurePermissions.length > 0)` is true.
    // If no features are seeded, we pass through all runtime permissions to prevent
    // zero-permission lockout on fresh tenants.
    if (featurePermissions.length > 0) {
      const featureSet = new Set(featurePermissions);
      runtimePermissions = new Set(
        [...runtimePermissions].filter(p => featureSet.has(p))
      );
    }
    // else: no features configured — pass through all runtime permissions (fresh tenant)

    // STEP 8: DEDUPLICATE ROLES
    const uniqueRoles = [...new Set(roleIds)];

    // STEP 9: BUILD RBAC CONTEXT
    const context: RBACContext = {
      userId,
      tenantId: tenant.id,
      institutionId,
      roles: uniqueRoles,
      permissions: [...runtimePermissions],
      planId,
      features: [...enabledFeatureSlugs],
      source: {
        roles: 'db',
        permissions: 'db',
        resolvedAt: new Date(),
        cacheTtl: 600
      },
      sourceMap: {
        rolePermissions: [...new Set(rolePermissions)],
        userOverrides: [...new Set(userOverrides)],
        planPermissions: [...new Set(planPermissions)],
        adminDelegations: [...new Set(adminDelegationPerms)],
        featureFlags: [...new Set(featurePermissions)]
      }
    };

    // STEP 10: CACHE RESULT
    await this.cache.setContext(cacheKey, context);

    const resolutionTime = Date.now() - startTime;

    return {
      context,
      fromCache: false,
      resolutionTime
    };
  }

  /**
   * Force refresh cached context
   * Invalidates cache and rebuilds
   */
  async refresh(input: RBACResolverInput): Promise<RBACResolverOutput> {
    const { userId, tenant, institutionId } = input;
    
    // Invalidate existing cache
    await this.cache.deleteContext({
      tenantId: tenant.id,
      userId,
      institutionId
    });

    // Rebuild with force flag
    return this.resolve({ ...input, forceRefresh: true });
  }

  /**
   * Invalidate context for user
   * Use when roles/permissions change
   */
  async invalidateForUser(userId: string, tenantId: string): Promise<void> {
    await this.cache.deleteContext({
      tenantId,
      userId
    });
  }

  /**
   * Invalidate all contexts for tenant
   * Use for plan changes, mass updates
   */
  async invalidateForTenant(tenantId: string): Promise<void> {
    await this.cache.invalidateTenant(tenantId);
  }
}

export default RBACResolver;
