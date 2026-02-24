/**
 * Auth Helper for Integration Tests
 * 
 * Provides functions to create mock test users and generate JWT tokens
 * for different roles.
 */

import jwt from 'jsonwebtoken';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  roles: string[];
  accessToken: string;
  refreshToken: string;
}

// Mock secret for testing
const TEST_SECRET = 'test-secret-key-for-jwt-signing';

/**
 * Generate JWT access token
 */
function generateAccessToken(userId: string, email: string, roles: string[], tenantId: string): string {
  const payload = {
    userId,
    email,
    roles,
    tid: tenantId,
    type: 'access',
  };
  
  return jwt.sign(payload, TEST_SECRET, {
    expiresIn: '15m',
  });
}

/**
 * Generate JWT refresh token
 */
function generateRefreshToken(userId: string, tenantId: string): string {
  const payload = {
    userId,
    tid: tenantId,
    type: 'refresh',
  };
  
  return jwt.sign(payload, TEST_SECRET, {
    expiresIn: '7d',
  });
}

/**
 * Create a mock test user with tokens
 */
function createMockTestUser(
  tenantId: string,
  options: {
    email: string;
    password: string;
    roles: string[];
    firstName?: string;
    lastName?: string;
  }
): TestUser {
  const userId = `mock-user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  const accessToken = generateAccessToken(userId, options.email, options.roles, tenantId);
  const refreshToken = generateRefreshToken(userId, tenantId);

  return {
    id: userId,
    email: options.email,
    password: options.password,
    roles: options.roles,
    accessToken,
    refreshToken,
  };
}

/**
 * Create an admin user and return token
 */
export async function getAdminToken(_schema: string, tenantId: string): Promise<TestUser> {
  return createMockTestUser(tenantId, {
    email: `admin_${Date.now()}@test.com`,
    password: 'AdminTest123!',
    roles: ['admin'],
    firstName: 'Admin',
    lastName: 'User',
  });
}

/**
 * Create a teacher user and return token
 */
export async function getTeacherToken(_schema: string, tenantId: string): Promise<TestUser> {
  return createMockTestUser(tenantId, {
    email: `teacher_${Date.now()}@test.com`,
    password: 'TeacherTest123!',
    roles: ['teacher'],
    firstName: 'Teacher',
    lastName: 'User',
  });
}

/**
 * Create a student user and return token
 */
export async function getStudentToken(_schema: string, tenantId: string): Promise<TestUser> {
  return createMockTestUser(tenantId, {
    email: `student_${Date.now()}@test.com`,
    password: 'StudentTest123!',
    roles: ['student'],
    firstName: 'Student',
    lastName: 'User',
  });
}

/**
 * Create a parent user and return token
 */
export async function getParentToken(_schema: string, tenantId: string): Promise<TestUser> {
  return createMockTestUser(tenantId, {
    email: `parent_${Date.now()}@test.com`,
    password: 'ParentTest123!',
    roles: ['parent'],
    firstName: 'Parent',
    lastName: 'User',
  });
}

/**
 * Create a locked user (for testing lockout)
 */
export async function getLockedUser(_schema: string, tenantId: string): Promise<TestUser> {
  return createMockTestUser(tenantId, {
    email: `locked_${Date.now()}@test.com`,
    password: 'LockedTest123!',
    roles: ['user'],
    firstName: 'Locked',
    lastName: 'User',
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
export function tenantHeaders(tenantId: string, schema: string): Record<string, string> {
  return {
    'x-tenant-id': tenantId,
    'x-institution-id': tenantId,
    'x-schema-name': schema,
  };
}

export default {
  getAdminToken,
  getTeacherToken,
  getStudentToken,
  getParentToken,
  getLockedUser,
  authHeaders,
  tenantHeaders,
};