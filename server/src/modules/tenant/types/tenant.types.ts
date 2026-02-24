import type { TenantIdentity } from '../../../core/tenant/tenant-identity';

export type TenantStatus = 'active' | 'suspended' | 'trial' | 'expired' | 'provisioning';

/**
 * Backward-compatible tenant context shape.
 * Runtime tenant identity must always satisfy TenantIdentity.
 */
export type TenantContext = TenantIdentity & {
  institutionName?: string;
  sub_domain?: string;
  type?: string;
  metadata?: Record<string, unknown>;
};

export interface TenantResolutionResult {
  tenant: TenantContext;
  source: 'subdomain' | 'token';
}

export interface TenantValidationResult {
  valid: boolean;
  error?: string;
  code?: 'INACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'NOT_FOUND';
}

export interface CreateTenantDTO {
  name: string;
  slug: string;
  subdomain: string;
  type?: string;
  planId?: string;
  adminEmail: string;
  adminPassword: string;
}

export interface UpdateTenantDTO {
  name?: string;
  status?: TenantStatus;
  planId?: string;
  metadata?: Record<string, unknown>;
}
