/**
 * Auth Test Helper
 * 
 * Provides mock utilities for authentication testing.
 * Creates test users with mock tokens.
 */

import { randomUUID } from 'crypto';

export interface TestUser {
  id: string;
  email: string;
  password: string; // Plain text password for testing
  roles: string[];
  accessToken: string;
  refreshToken: string;
}

// In-memory store for test users
const testUsers: Map<string, TestUser> = new Map();

/**
 * Create a test user
 * Mock version - doesn't create actual database records
 */
export async function createTestUser(
  schemaName: string,
  tenantId: string,
  options: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    roles?: string[];
    isActive?: boolean;
  } = {}
): Promise<TestUser> {
  const uniqueId = randomUUID().slice(0, 8);
  const email = options.email || `test_${uniqueId}@example.com`;
  const password = options.password || 'TestPassword123!';
  const roles = options.roles || ['user'];

  const user: TestUser = {
    id: randomUUID(),
    email,
    password,
    roles,
    accessToken: `mock-access-token-${randomUUID()}`,
    refreshToken: `mock-refresh-token-${randomUUID()}`,
  };

  // Store in memory
  testUsers.set(user.id, user);

  return user;
}

/**
 * Create an admin test user
 */
export async function createAdminUser(
  schemaName: string,
  tenantId: string,
  options: {
    email?: string;
    password?: string;
  } = {}
): Promise<TestUser> {
  return createTestUser(schemaName, tenantId, {
    ...options,
    roles: ['admin'],
  });
}

/**
 * Create a teacher test user
 */
export async function createTeacherUser(
  schemaName: string,
  tenantId: string,
  options: {
    email?: string;
    password?: string;
  } = {}
): Promise<TestUser> {
  return createTestUser(schemaName, tenantId, {
    ...options,
    roles: ['teacher'],
  });
}

/**
 * Create a student test user
 */
export async function createStudentUser(
  schemaName: string,
  tenantId: string,
  options: {
    email?: string;
    password?: string;
  } = {}
): Promise<TestUser> {
  return createTestUser(schemaName, tenantId, {
    ...options,
    roles: ['student'],
  });
}

/**
 * Create a parent test user
 */
export async function createParentUser(
  schemaName: string,
  tenantId: string,
  options: {
    email?: string;
    password?: string;
  } = {}
): Promise<TestUser> {
  return createTestUser(schemaName, tenantId, {
    ...options,
    roles: ['parent'],
  });
}

/**
 * Generate auth headers for a test user
 */
export function authHeaders(user: TestUser): Record<string, string> {
  return {
    Authorization: `Bearer ${user.accessToken}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Generate tenant headers
 */
export function tenantHeaders(tenant: { id: string; db_schema: string }): Record<string, string> {
  return {
    'x-tenant-id': tenant.id,
    'x-institution-id': tenant.id,
  };
}

/**
 * Login helper - simulates login flow
 * Mock version - returns mock data
 */
export async function loginTestUser(
  schemaName: string,
  email: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string; user: any } | null> {
  // Find user by email
  for (const user of testUsers.values()) {
    if (user.email === email && user.password === password) {
      return {
        accessToken: user.accessToken,
        refreshToken: user.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          roles: user.roles,
        },
      };
    }
  }
  return null;
}

/**
 * Get a test user by ID
 */
export function getTestUser(id: string): TestUser | undefined {
  return testUsers.get(id);
}

/**
 * Clean up all test users
 */
export async function cleanupTestUsers(): Promise<void> {
  testUsers.clear();
}

export default {
  createTestUser,
  createAdminUser,
  createTeacherUser,
  createStudentUser,
  createParentUser,
  authHeaders,
  tenantHeaders,
  loginTestUser,
  getTestUser,
  cleanupTestUsers,
};