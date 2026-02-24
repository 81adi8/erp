import { logger } from '../utils/logger';

type MetricType = 'counter' | 'histogram' | 'gauge';
type SecuritySeverity = 'info' | 'warn' | 'critical';

interface ShadowMetricEvent {
    metric: string;
    type: MetricType;
    value: number;
    labels?: Record<string, string | number | boolean | undefined>;
    timestamp: string;
}

interface ShadowSecurityEvent {
    event: string;
    severity: SecuritySeverity;
    labels?: Record<string, string | number | boolean | undefined>;
    timestamp: string;
}

const emit = (
    metric: string,
    type: MetricType,
    value: number,
    labels?: Record<string, string | number | boolean | undefined>
): void => {
    const payload: ShadowMetricEvent = {
        metric,
        type,
        value,
        labels,
        timestamp: new Date().toISOString(),
    };

    logger.info('[tenant-shadow-telemetry]', payload);
};

const emitSecurityEvent = (
    event: string,
    severity: SecuritySeverity,
    labels?: Record<string, string | number | boolean | undefined>
): void => {
    const payload: ShadowSecurityEvent = {
        event,
        severity,
        labels,
        timestamp: new Date().toISOString(),
    };

    logger.warn('[tenant-security-event]', payload);
};

export const TenantShadowTelemetry = {
    tenantMismatchShadowRate: (labels: Record<string, any> = {}): void => {
        emit('tenant_mismatch_shadow_rate', 'counter', 1, labels);
    },

    tenantTokenMismatch: (labels: Record<string, any> = {}): void => {
        emit('tenant_token_mismatch', 'counter', 1, labels);
        emitSecurityEvent('tenant_token_mismatch', 'critical', labels);
    },

    tenantSchemaMissing: (labels: Record<string, any> = {}): void => {
        emit('tenant_schema_missing', 'counter', 1, labels);
        emitSecurityEvent('tenant_schema_missing', 'critical', labels);
    },

    tenantContextMissing: (labels: Record<string, any> = {}): void => {
        emit('tenant_context_missing', 'counter', 1, labels);
        emitSecurityEvent('tenant_context_missing', 'critical', labels);
    },

    rbacNoTenant: (labels: Record<string, any> = {}): void => {
        emit('rbac_no_tenant', 'counter', 1, labels);
        emitSecurityEvent('rbac_no_tenant', 'critical', labels);
    },

    repoUnscopedWrite: (labels: Record<string, any> = {}): void => {
        emit('repo_unscoped_write', 'counter', 1, labels);
        emitSecurityEvent('repo_unscoped_write', 'critical', labels);
    },

    legacyHeaderUsage: (labels: Record<string, any> = {}): void => {
        emit('legacy_header_usage', 'counter', 1, labels);
    },

    jwtLegacyClaimUsage: (labels: Record<string, any> = {}): void => {
        emit('jwt_legacy_claim_usage', 'counter', 1, labels);
    },

    alsContextDrift: (labels: Record<string, any> = {}): void => {
        emit('als_context_drift', 'counter', 1, labels);
    },

    repoUnscopedWriteDetected: (labels: Record<string, any> = {}): void => {
        emit('repo_unscoped_write_detected', 'counter', 1, labels);
        emit('repo_unscoped_write', 'counter', 1, labels);
    },

    tenantResolutionLatency: (ms: number, labels: Record<string, any> = {}): void => {
        emit('tenant_resolution_latency', 'histogram', ms, labels);
    },

    tenantCacheKeyCollisions: (labels: Record<string, any> = {}): void => {
        emit('tenant_cache_key_collisions', 'counter', 1, labels);
    },

    tenantCollisionEnforcementDecisions: (labels: Record<string, any> = {}): void => {
        emit('tenant_collision_enforcement_decisions', 'counter', 1, labels);
    },

    tenantCacheCollisionSecurityEvent: (labels: Record<string, any> = {}): void => {
        const severity: SecuritySeverity = labels.action === 'blocked_409' ? 'critical' : 'warn';
        emitSecurityEvent('tenant_cache_collision_detected', severity, labels);
    },

    // ============================================================
    // TASK-02 RBAC HARDENING TELEMETRY
    // ============================================================

    /**
     * RBAC resolver called without tenant context
     * CRITICAL: This should never happen in production
     */
    rbacTenantMissing: (labels: Record<string, any> = {}): void => {
        emit('rbac_tenant_missing', 'counter', 1, labels);
        emitSecurityEvent('rbac_tenant_missing', 'critical', labels);
    },

    /**
     * Permission resolution attempted without schema
     */
    rbacGlobalResolutionAttempt: (labels: Record<string, any> = {}): void => {
        emit('rbac_global_resolution_attempt', 'counter', 1, labels);
        emitSecurityEvent('rbac_global_resolution_attempt', 'critical', labels);
    },

    /**
     * Cross-tenant cache bleed detected
     * CRITICAL: Cache returned context for wrong tenant/user
     */
    rbacCacheCrossTenant: (labels: Record<string, any> = {}): void => {
        emit('rbac_cache_cross_tenant', 'counter', 1, labels);
        emitSecurityEvent('rbac_cache_cross_tenant', 'critical', labels);
    },

    /**
     * Tenant activation blocked due to incomplete provisioning
     */
    tenantActivationBlocked: (labels: Record<string, any> = {}): void => {
        emit('tenant_activation_blocked', 'counter', 1, labels);
        emitSecurityEvent('tenant_activation_blocked', 'warn', labels);
    },

    /**
     * Root/admin route accessed without proper RBAC
     */
    rootRouteRbacMissing: (labels: Record<string, any> = {}): void => {
        emit('root_route_rbac_missing', 'counter', 1, labels);
        emitSecurityEvent('root_route_rbac_missing', 'critical', labels);
    },

    /**
     * RBAC resolution latency tracking
     */
    rbacResolutionLatency: (ms: number, labels: Record<string, any> = {}): void => {
        emit('rbac_resolution_latency', 'histogram', ms, labels);
    },

    // ============================================================
    // MT-05: Super Admin Tenant Access Tracking
    // ============================================================

    /**
     * Super admin accesses a specific tenant via x-institution-id header
     */
    tenantAccess: (labels: Record<string, any> = {}): void => {
        emit('super_admin_tenant_access', 'counter', 1, labels);
        emitSecurityEvent('super_admin_tenant_access', 'warn', labels);
    },

    /**
     * Schema violation detected (invalid tenant header, etc.)
     */
    schemaViolation: (labels: Record<string, any> = {}): void => {
        emit('schema_violation', 'counter', 1, labels);
        emitSecurityEvent('schema_violation', 'critical', labels);
    },
};
