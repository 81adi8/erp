/**
 * Auth Integration Tests
 * 
 * Tests authentication flows using REAL Express app and database.
 */

// Load test environment BEFORE any other imports
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../.env.test') });

import request from 'supertest';
import app from '../../app';
import { sequelize } from '../../database/sequelize';
import bcrypt from 'bcrypt';

const TEST_SCHEMA = process.env.DB_SCHEMA || 'test_schema_jest';

// Helper to set schema context
function withSchema(req: request.Test): request.Test {
  return req
    .set('x-schema-name', TEST_SCHEMA)
    .set('x-tenant-id', 'test-tenant')
    .set('x-storage-preference', 'local-storage');
}

// Helper to create test user in database using raw query
async function createTestUserInDb(options: {
  email: string;
  password: string;
  role: string;
}): Promise<{ id: string; email: string }> {
  const hashedPassword = await bcrypt.hash(options.password, 10);
  
  // Insert user
  const [userResult] = await sequelize.query(
    `INSERT INTO "${TEST_SCHEMA}".users (email, password_hash, first_name, last_name, is_active)
     VALUES (:email, :password, 'Test', 'User', true)
     RETURNING id, email`,
    {
      replacements: { email: options.email, password: hashedPassword },
    }
  );

  const user = userResult as { id: string; email: string }[];

  // Assign role
  await sequelize.query(
    `INSERT INTO "${TEST_SCHEMA}".user_roles (user_id, role_id)
     SELECT :userId, id FROM "${TEST_SCHEMA}".roles WHERE name = :role`,
    {
      replacements: { userId: user[0].id, role: options.role },
    }
  );

  return user[0];
}

describe('POST /api/v1/tenant/auth/login', () => {
  let testUser: { id: string; email: string };

  beforeAll(async () => {
    // Create test user
    testUser = await createTestUserInDb({
      email: 'testuser@school.com',
      password: 'TestPass123!',
      role: 'teacher',
    });
  });

  test('valid credentials returns 200 + tokens', async () => {
    const res = await withSchema(
      request(app).post('/api/v1/tenant/auth/login')
    ).send({
      email: testUser.email,
      password: 'TestPass123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
  });

  test('wrong password returns 401', async () => {
    const res = await withSchema(
      request(app).post('/api/v1/tenant/auth/login')
    ).send({
      email: testUser.email,
      password: 'WrongPassword123!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('non-existent user returns 401', async () => {
    const res = await withSchema(
      request(app).post('/api/v1/tenant/auth/login')
    ).send({
      email: 'nonexistent@school.com',
      password: 'SomePassword123!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('missing email returns 400', async () => {
    const res = await withSchema(
      request(app).post('/api/v1/tenant/auth/login')
    ).send({
      password: 'TestPass123!',
    });

    expect(res.status).toBe(400);
  });

  test('missing password returns 400', async () => {
    const res = await withSchema(
      request(app).post('/api/v1/tenant/auth/login')
    ).send({
      email: testUser.email,
    });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/tenant/auth/refresh', () => {
  let testUser: { id: string; email: string };
  let refreshToken: string;

  beforeAll(async () => {
    testUser = await createTestUserInDb({
      email: 'refreshuser@school.com',
      password: 'TestPass123!',
      role: 'teacher',
    });

    // Login to get refresh token
    const res = await withSchema(
      request(app).post('/api/v1/tenant/auth/login')
    ).send({
      email: testUser.email,
      password: 'TestPass123!',
    });

    refreshToken = res.body.data?.refreshToken;
  });

  test('valid refresh token returns new access token', async () => {
    const res = await withSchema(
      request(app).post('/api/v1/tenant/auth/refresh')
    ).send({
      refreshToken,
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  test('invalid refresh token returns 401', async () => {
    const res = await withSchema(
      request(app).post('/api/v1/tenant/auth/refresh')
    ).send({
      refreshToken: 'invalid-token',
    });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/tenant/auth/logout', () => {
  let testUser: { id: string; email: string };
  let accessToken: string;

  beforeAll(async () => {
    testUser = await createTestUserInDb({
      email: 'logoutuser@school.com',
      password: 'TestPass123!',
      role: 'teacher',
    });

    // Login to get access token
    const res = await withSchema(
      request(app).post('/api/v1/tenant/auth/login')
    ).send({
      email: testUser.email,
      password: 'TestPass123!',
    });

    accessToken = res.body.data?.accessToken;
  });

  test('valid token logout returns 200', async () => {
    const res = await withSchema(
      request(app).post('/api/v1/tenant/auth/logout')
    ).set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
