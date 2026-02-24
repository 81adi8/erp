/**
 * Base RBAC Repository
 * 
 * Provides common functionality for all RBAC repositories.
 * Handles tenant context and schema resolution.
 */

import { Transaction } from 'sequelize';
import { TenantContext } from '../../../modules/tenant/types/tenant.types';

export abstract class BaseRBACRepository {
  
  constructor(protected tenant: TenantContext) {}

  /**
   * Get the tenant schema name
   */
  protected getSchema(): string {
    return this.tenant.db_schema;
  }

  /**
   * Get the tenant ID
   */
  protected getTenantId(): string {
    return this.tenant.id;
  }

  /**
   * Get the plan ID (if available)
   */
  protected getPlanId(): string | undefined {
    return this.tenant.plan_id;
  }

  /**
   * Execute operation with optional transaction
   */
  protected async withTransaction<T>(
    operation: (tx?: Transaction) => Promise<T>,
    existingTx?: Transaction
  ): Promise<T> {
    return operation(existingTx);
  }
}
