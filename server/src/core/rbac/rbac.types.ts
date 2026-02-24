/**
 * RBAC Types - Authorization Contract for Entire ERP
 * 
 * This file defines the core authorization types used across the entire backend.
 * All RBAC operations, repositories, and engines depend on these contracts.
 * 
 * CRITICAL: Keep this file lean. No ORM types. No Express types.
 * Only pure data contracts.
 */

import { TenantContext } from '../../modules/tenant/types/tenant.types';

// ============================================================================
// Core Permission Types
// ============================================================================

/**
 * Permission key - dot-notation identifier
 * Examples: 'students.view', 'exams.manage', 'attendance.mark'
 */
export type PermissionKey = string;

/**
 * Role identifier - UUID or slug
 */
export type RoleId = string;

/**
 * User identifier - UUID
 */
export type UserId = string;

/**
 * Institution/Tenant identifier
 */
export type InstitutionId = string;

// ============================================================================
// RBAC Context - Runtime Authorization State
// ============================================================================

/**
 * Source of data for debugging and audit
 */
export interface RBACDataSource {
  /** How roles were loaded */
  roles: 'cache' | 'db';
  /** How permissions were loaded */
  permissions: 'cache' | 'db';
  /** Timestamp of resolution */
  resolvedAt: Date;
  /** Cache TTL remaining (seconds) */
  cacheTtl?: number;
}

/**
 * Breakdown of permission sources for debugging
 */
export interface RBACSourceMap {
  /** Permissions from role assignments */
  rolePermissions: PermissionKey[];
  /** Permissions from direct user grants */
  userOverrides: PermissionKey[];
  /** Permissions allowed by subscription plan */
  planPermissions: PermissionKey[];
  /** Permissions from admin delegation pool */
  adminDelegations: PermissionKey[];
  /** Permissions enabled by feature flags */
  featureFlags: PermissionKey[];
}

/**
 * Runtime authorization context - attached to every request
 * This is the single source of truth for access decisions
 */
export interface RBACContext {
  /** User being authorized */
  userId: UserId;
  /** Tenant context */
  tenantId: string;
  /** Institution scope (if applicable) */
  institutionId?: InstitutionId;
  /** User's assigned roles (IDs only) */
  roles: RoleId[];
  /** Effective permissions after all filters */
  permissions: PermissionKey[];
  /** Current subscription plan */
  planId?: string;
  /** Enabled features for this tenant */
  features?: string[];
  /** Data source tracking for debugging */
  source: RBACDataSource;
  /** Permission breakdown for audit/debugging */
  sourceMap: RBACSourceMap;
}

// ============================================================================
// Resolver Input/Output Contracts
// ============================================================================

/**
 * Input to RBAC resolver - minimal required data
 * Resolver never depends on Express Request
 */
export interface RBACResolverInput {
  /** User to resolve permissions for */
  userId: UserId;
  /** Tenant context (contains planId, schema, etc.) */
  tenant: TenantContext;
  /** Optional institution scope */
  institutionId?: InstitutionId;
  /** Force refresh (bypass cache) */
  forceRefresh?: boolean;
}

/**
 * Output from RBAC resolver
 */
export interface RBACResolverOutput {
  /** Built context */
  context: RBACContext;
  /** Whether result came from cache */
  fromCache: boolean;
  /** Time taken to resolve (ms) */
  resolutionTime: number;
}

// ============================================================================
// Permission Check Contracts
// ============================================================================

/**
 * Permission check specification
 */
export interface PermissionCheck {
  /** Required permissions (any one matches if requireAll=false) */
  requiredPermissions?: PermissionKey[];
  /** Required roles (any one matches) */
  requiredRoles?: RoleId[];
  /** Whether ALL permissions must be present (default: false = ANY) */
  requireAll?: boolean;
}

/**
 * Result of permission evaluation
 */
export interface PermissionCheckResult {
  /** Whether check passed */
  granted: boolean;
  /** Missing permissions (if failed) */
  missingPermissions?: PermissionKey[];
  /** Missing roles (if failed) */
  missingRoles?: RoleId[];
  /** Context used for evaluation */
  context: RBACContext;
}

// ============================================================================
// Cache Contracts
// ============================================================================

/**
 * Cache key structure for RBAC
 */
export interface RBACCacheKey {
  tenantId: string;
  userId: UserId;
  institutionId?: InstitutionId;
}

/**
 * Cache entry metadata
 */
export interface RBACCacheEntry {
  /** Stored context */
  context: RBACContext;
  /** When cached */
  cachedAt: Date;
  /** TTL in seconds */
  ttl: number;
  /** Version for cache invalidation */
  version: string;
}

// ============================================================================
// Repository Data Transfer Objects
// ============================================================================

/**
 * Role data from repository (normalized)
 */
export interface RoleDTO {
  id: RoleId;
  slug?: string;
  name: string;
  roleType?: string;
  assetType?: string;
  planId?: string;
  isSystem?: boolean;
  isActive: boolean;
}

/**
 * Role assignment data
 */
export interface UserRoleDTO {
  roleId: RoleId;
  assignmentType: 'system_default' | 'custom_default' | 'explicit';
  institutionId?: InstitutionId;
  assignedAt: Date;
}

/**
 * Permission assignment data
 */
export interface RolePermissionDTO {
  roleId: RoleId;
  permissionId: string;
  permissionKey: PermissionKey;
}

/**
 * User direct permission grant
 */
export interface UserPermissionDTO {
  permissionId: string;
  permissionKey: PermissionKey;
  grantedAt: Date;
  expiresAt?: Date;
  grantedBy: UserId;
}

/**
 * Plan permission definition
 */
export interface PlanPermissionDTO {
  permissionId: string;
  permissionKey: PermissionKey;
  planId: string;
}

/**
 * Feature data
 */
export interface FeatureDTO {
  id: string;
  slug: string;
  moduleId: string;
  isActive: boolean;
  permissions: PermissionKey[];
}

/**
 * Feature flag targeting
 */
export interface FeatureFlagDTO {
  key: string;
  enabled: boolean;
  tenantTypes: string[];
  planIds: string[];
  institutionIds: string[];
  rolloutPercentage: number;
  startsAt?: Date;
  endsAt?: Date;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * RBAC-specific error codes
 */
export enum RBACErrorCode {
  RESOLUTION_FAILED = 'RBAC_RESOLUTION_FAILED',
  CACHE_ERROR = 'RBAC_CACHE_ERROR',
  INVALID_TENANT = 'RBAC_INVALID_TENANT',
  INVALID_USER = 'RBAC_INVALID_USER',
  PERMISSION_DENIED = 'RBAC_PERMISSION_DENIED',
  ROLE_NOT_FOUND = 'RBAC_ROLE_NOT_FOUND',
  PLAN_LIMIT_EXCEEDED = 'RBAC_PLAN_LIMIT_EXCEEDED',
  FEATURE_DISABLED = 'RBAC_FEATURE_DISABLED',
}

/**
 * RBAC error structure
 */
export interface RBACError {
  code: RBACErrorCode;
  message: string;
  userId?: UserId;
  tenantId?: string;
  permissionKey?: PermissionKey;
  roleId?: RoleId;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default cache TTL for RBAC contexts (seconds)
 */
export const RBAC_CACHE_TTL_DEFAULT = 600; // 10 minutes

/**
 * Cache key prefix
 */
export const RBAC_CACHE_PREFIX = 'rbac';

/**
 * Cache version for invalidation
 */
export const RBAC_CACHE_VERSION = 'v1';

/**
 * Maximum permissions per user (sanity limit)
 */
export const RBAC_MAX_PERMISSIONS = 500;

/**
 * Maximum roles per user (sanity limit)
 */
export const RBAC_MAX_ROLES = 50;
