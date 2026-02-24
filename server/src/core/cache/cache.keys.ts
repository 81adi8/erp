/**
 * Standardized Cache Key Patterns
 * All cache keys should use these patterns for consistency and proper invalidation
 * 
 * TWO-TIER CACHING STRATEGY:
 * 1. PLAN-SCOPED (Global): For system/public/readonly roles
 *    - Key: plan:{planId}:role:{roleSlug}:permissions
 *    - Shared across all tenants with same plan
 * 
 * 2. TENANT-SCOPED (Isolated): For custom roles
 *    - Key: tenant:{tenantId}:role:{roleSlug}:permissions
 *    - Strictly isolated per tenant
 */

export const CacheKeys = {
    // Tenant branding/public info (safe to cache)
    TENANT_BRANDING: (slug: string) => `tenant:branding:${slug}`,
    TENANT_BY_ID: (id: string) => `tenant:id:${id}`,
    TENANT_BY_SUBDOMAIN: (subdomain: string) => `tenant:subdomain:${subdomain}`,

    // Permission config (loaded on startup, refreshed on admin update)
    SCOPE_PERMISSION_MAP: () => 'config:scope:permission:map',
    ALL_PERMISSIONS: () => 'config:permissions:all',
    PLAN_PERMISSIONS: (planId: string) => `config:plan:${planId}:permissions`,

    // Tenant-scoped role permissions (role→permissions for a tenant's custom roles)
    TENANT_ROLE_PERMISSIONS: (tenantId: string, roleName: string) =>
        `tenant:${tenantId}:role:${roleName}:permissions`,

    // Plan-scoped role permissions (role→permissions for initial/readonly roles)
    // These are shared across all tenants with the same plan
    PLAN_ROLE_PERMISSIONS: (planId: string, roleSlug: string) =>
        `plan:${planId}:role:${roleSlug}:permissions`,

    // =========================================================================
    // TENANT ROLE CONFIGURATION (Default role per user type)
    // =========================================================================

    /**
     * Default role configuration for a specific user type within a tenant
     * Example: tenant:tenant_xyz:role-config:student
     */
    TENANT_ROLE_CONFIG: (tenantId: string, userType: string) =>
        `tenant:${tenantId}:role-config:${userType}`,

    /**
     * All role configurations for a tenant (for bulk operations)
     * Example: tenant:tenant_xyz:role-configs
     */
    TENANT_ALL_ROLE_CONFIGS: (tenantId: string) =>
        `tenant:${tenantId}:role-configs`,

    /**
     * User's effective roles (combined from all assignments)
     * Invalidate when user's role assignment changes
     */
    USER_EFFECTIVE_ROLES: (tenantId: string, userId: string) =>
        `tenant:${tenantId}:user:${userId}:roles`,

    // =========================================================================
    // SESSION & SECURITY
    // =========================================================================

    // Session tracking (for brute-force protection)
    LOGIN_ATTEMPTS: (ip: string) => `security:login:attempts:${ip}`,
    // MT-03 FIX: Added tenantId to lockout cache key for proper tenant isolation
    ACCOUNT_LOCKOUT: (tenantId: string, userId: string) => `security:lockout:${tenantId}:${userId}`,

    // Config version (for cache invalidation)
    CONFIG_VERSION: () => 'config:version',
} as const;

/**
 * TTL values in seconds
 */
export const CacheTTL = {
    TENANT_BRANDING: 600,           // 10 minutes
    PERMISSION_CONFIG: 3600,        // 1 hour (rarely changes)
    LOGIN_ATTEMPTS: 900,            // 15 minutes
    ACCOUNT_LOCKOUT: 900,           // 15 minutes
    PLAN_PERMISSIONS: 3600,         // 1 hour
    PLAN_ROLE_PERMISSIONS: 3600,    // 1 hour (for global plan-scoped roles)
    TENANT_ROLE_CONFIG: 1800,       // 30 minutes (default role configs)
    USER_EFFECTIVE_ROLES: 900,      // 15 minutes (user's current roles)
} as const;

/**
 * Cache patterns for bulk invalidation
 */
export const CachePatterns = {
    ALL_TENANT: 'tenant:*',
    ALL_CONFIG: 'config:*',
    ALL_SECURITY: 'security:*',
    TENANT_ROLE_CONFIGS: (tenantId: string) => `tenant:${tenantId}:role-config:*`,
    TENANT_USER_ROLES: (tenantId: string) => `tenant:${tenantId}:user:*:roles`,
} as const;
