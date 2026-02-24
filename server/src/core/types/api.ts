import { Request } from 'express';

// Re-export TenantContext from tenant module for backward compatibility
// Import from modules/tenant/types/tenant.types.ts
export type { TenantContext } from '../../modules/tenant/types/tenant.types';

export interface AdminInfo {
  id: string;
  email: string;
  name: string;
  role: string;
  is_main: boolean;
  permissions: Record<string, boolean> | null;
}

export interface AuthUser {
  userId: string;
  sessionId?: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
  scopes?: string[];
  tenantId?: string;
  institutionId?: string | null;
  is_main?: boolean;
  admin?: AdminInfo;
}

export type ApiRequest<TBody = unknown> = Request & {
  body: TBody;
  tenant?: import('../../modules/tenant/types/tenant.types').TenantContext;
  user?: AuthUser;
};

export interface AuthRequest<TBody = unknown> extends ApiRequest<TBody> {
  user: AuthUser;
}

export interface TenantRequest<TBody = unknown> extends ApiRequest<TBody> {
  tenant: import('../../modules/tenant/types/tenant.types').TenantContext;
  user?: AuthUser;
}
