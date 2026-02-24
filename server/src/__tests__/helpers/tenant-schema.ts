/**
 * Tenant Schema Lifecycle Helper
 * 
 * Creates mock tenant data for testing.
 * In a real integration test environment, this would create actual database schemas.
 */

import { randomUUID } from 'crypto';
import { InstitutionType } from '../../core/constants/tenant';

export interface TestTenant {
  id: string;
  slug: string;
  sub_domain: string;
  db_schema: string;
  name: string;
  type: InstitutionType;
}

// In-memory store for test tenants
const testTenants: Map<string, TestTenant> = new Map();

/**
 * Create a test tenant with its own schema
 * Mock version - doesn't actually create database schemas
 */
export async function createTestTenant(
  prefix: string = 'test',
  type: InstitutionType = InstitutionType.SCHOOL
): Promise<TestTenant> {
  const uniqueId = randomUUID().slice(0, 8);
  const slug = `${prefix}_${uniqueId}`;
  const schemaName = `tenant_${slug.replace(/-/g, '_')}`;
  const tenantId = randomUUID();

  const tenant: TestTenant = {
    id: tenantId,
    slug,
    sub_domain: slug,
    db_schema: schemaName,
    name: `Test School ${uniqueId}`,
    type,
  };

  // Store in memory
  testTenants.set(tenantId, tenant);

  return tenant;
}

/**
 * Destroy a test tenant
 * Mock version - removes from memory
 */
export async function destroyTestTenant(tenant: TestTenant): Promise<void> {
  testTenants.delete(tenant.id);
}

/**
 * Get a test tenant by ID
 */
export function getTestTenant(id: string): TestTenant | undefined {
  return testTenants.get(id);
}

/**
 * Get all test tenants
 */
export function getAllTestTenants(): TestTenant[] {
  return Array.from(testTenants.values());
}

/**
 * Clean up all test tenants
 */
export async function cleanupTestTenants(): Promise<void> {
  testTenants.clear();
}

export default {
  createTestTenant,
  destroyTestTenant,
  getTestTenant,
  getAllTestTenants,
  cleanupTestTenants,
};