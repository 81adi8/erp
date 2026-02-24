import { TenantContext, TenantValidationResult } from '../types/tenant.types';

export class TenantValidator {
  static validate(tenant: TenantContext | undefined): TenantValidationResult {
    if (!tenant) {
      return {
        valid: false,
        error: 'Tenant not found',
        code: 'NOT_FOUND'
      };
    }

    if (tenant.status === 'suspended') {
      return {
        valid: false,
        error: 'Institution is suspended',
        code: 'SUSPENDED'
      };
    }

    if (tenant.status === 'active' || tenant.status === 'trial') {
      return { valid: true };
    }

    if (!tenant.status || tenant.status !== 'active') {
      return {
        valid: false,
        error: 'Institution is not active',
        code: 'INACTIVE'
      };
    }

    return { valid: true };
  }

  static requireActive(tenant: TenantContext | undefined): void {
    const result = this.validate(tenant);
    if (!result.valid) {
      const error = new Error(result.error);
      throw error;
    }
  }

  static canAccess(tenant: TenantContext | undefined): boolean {
    return this.validate(tenant).valid;
  }
}
