/**
 * Tenant Isolation Integration Tests
 * 
 * CRITICAL: Tests that data does NOT leak between tenants.
 * Uses REAL Express app and database with separate schemas.
 */

// Load test environment BEFORE any other imports
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../.env.test') });

import request from 'supertest';
import app from '../../app';
import { sequelize } from '../../database/sequelize';
import bcrypt from 'bcrypt';

const TEST_SCHEMA_A = 'test_tenant_a';
const TEST_SCHEMA_B = 'test_tenant_b';

// Helper to create test user in specific schema
async function createTestUserInSchema(schema: string, options: {
  email: string;
  password: string;
  role: string;
}): Promise<{ id: string; email: string }> {
  const hashedPassword = await bcrypt.hash(options.password, 10);
  
  const [userResult] = await sequelize.query(
    `INSERT INTO "${schema}".users (email, password_hash, first_name, last_name, is_active)
     VALUES (:email, :password, 'Test', 'User', true)
     RETURNING id, email`,
    {
      replacements: { email: options.email, password: hashedPassword },
    }
  );

  const user = userResult as { id: string; email: string }[];

  await sequelize.query(
    `INSERT INTO "${schema}".user_roles (user_id, role_id)
     SELECT :userId, id FROM "${schema}".roles WHERE name = :role`,
    {
      replacements: { userId: user[0].id, role: options.role },
    }
  );

  return user[0];
}

// Helper to create student in specific schema
async function createStudentInSchema(schema: string, admissionNumber: string): Promise<{ id: string }> {
  // Create user first
  const [userResult] = await sequelize.query(
    `INSERT INTO "${schema}".users (email, password_hash, first_name, last_name, is_active)
     VALUES (:email, 'hash', 'Student', 'Test', true)
     RETURNING id`,
    {
      replacements: { email: `student_${admissionNumber}@test.com` },
    }
  );

  const user = userResult as { id: string }[];

  // Create student
  const [studentResult] = await sequelize.query(
    `INSERT INTO "${schema}".students (user_id, admission_number, is_active)
     VALUES (:userId, :admissionNumber, true)
     RETURNING id`,
    {
      replacements: { userId: user[0].id, admissionNumber },
    }
  );

  const student = studentResult as { id: string }[];

  return student[0];
}

describe('Tenant Isolation — Students', () => {
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let studentA: { id: string };
  let studentB: { id: string };
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    // Schemas are created by global setup, just create users
    userA = await createTestUserInSchema(TEST_SCHEMA_A, {
      email: 'admin_a@test.com',
      password: 'TestPass123!',
      role: 'admin',
    });

    userB = await createTestUserInSchema(TEST_SCHEMA_B, {
      email: 'admin_b@test.com',
      password: 'TestPass123!',
      role: 'admin',
    });

    // Create students with SAME admission number in both schemas
    studentA = await createStudentInSchema(TEST_SCHEMA_A, 'ADM001');
    studentB = await createStudentInSchema(TEST_SCHEMA_B, 'ADM001');

    // Get tokens for each tenant
    const resA = await request(app)
      .post('/api/v1/tenant/auth/login')
      .set('x-schema-name', TEST_SCHEMA_A)
      .set('x-tenant-id', 'tenant-a')
      .set('x-storage-preference', 'local-storage')
      .send({ email: userA.email, password: 'TestPass123!' });
    tokenA = resA.body.data?.accessToken;

    const resB = await request(app)
      .post('/api/v1/tenant/auth/login')
      .set('x-schema-name', TEST_SCHEMA_B)
      .set('x-tenant-id', 'tenant-b')
      .set('x-storage-preference', 'local-storage')
      .send({ email: userB.email, password: 'TestPass123!' });
    tokenB = resB.body.data?.accessToken;
  });

  // Don't drop schemas here - global teardown handles that

  test('tenant_a token cannot list tenant_b students', async () => {
    const res = await request(app)
      .get('/api/v2/school/students')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-schema-name', TEST_SCHEMA_B)
      .set('x-tenant-id', 'tenant-b');

    // Should be forbidden or empty, NOT tenant_b data
    expect([401, 403, 404]).toContain(res.status);
  });

  test('tenant_a token cannot view tenant_b student by ID', async () => {
    const res = await request(app)
      .get(`/api/v2/school/students/${studentB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-schema-name', TEST_SCHEMA_A)
      .set('x-tenant-id', 'tenant-a');

    // Should be 404 or 403, NOT the student record
    expect([403, 404]).toContain(res.status);
  });

  test('tenant_a token cannot create student in tenant_b', async () => {
    const res = await request(app)
      .post('/api/v2/school/students')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-schema-name', TEST_SCHEMA_B)
      .set('x-tenant-id', 'tenant-b')
      .send({
        admission_number: 'HACK001',
        first_name: 'Hacker',
        last_name: 'User',
      });

    // Should be forbidden
    expect([401, 403, 404]).toContain(res.status);
  });
});

describe('Tenant Isolation — Fees', () => {
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let studentA: { id: string };
  let studentB: { id: string };
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    // Use different emails to avoid conflicts with Students tests
    userA = await createTestUserInSchema(TEST_SCHEMA_A, {
      email: 'fee_admin_a@test.com',
      password: 'TestPass123!',
      role: 'admin',
    });

    userB = await createTestUserInSchema(TEST_SCHEMA_B, {
      email: 'fee_admin_b@test.com',
      password: 'TestPass123!',
      role: 'admin',
    });

    studentA = await createStudentInSchema(TEST_SCHEMA_A, 'FEE001');
    studentB = await createStudentInSchema(TEST_SCHEMA_B, 'FEE001');

    const resA = await request(app)
      .post('/api/v1/tenant/auth/login')
      .set('x-schema-name', TEST_SCHEMA_A)
      .set('x-tenant-id', 'tenant-a')
      .set('x-storage-preference', 'local-storage')
      .send({ email: userA.email, password: 'TestPass123!' });
    tokenA = resA.body.data?.accessToken;

    const resB = await request(app)
      .post('/api/v1/tenant/auth/login')
      .set('x-schema-name', TEST_SCHEMA_B)
      .set('x-tenant-id', 'tenant-b')
      .set('x-storage-preference', 'local-storage')
      .send({ email: userB.email, password: 'TestPass123!' });
    tokenB = resB.body.data?.accessToken;
  });

  // Don't drop schemas here - global teardown handles that

  test('tenant_a cannot see tenant_b fee payments', async () => {
    const res = await request(app)
      .get('/api/v2/school/fees/payments')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-schema-name', TEST_SCHEMA_B)
      .set('x-tenant-id', 'tenant-b');

    expect([401, 403, 404]).toContain(res.status);
  });

  test('tenant_a cannot collect fee for tenant_b student', async () => {
    const res = await request(app)
      .post('/api/v2/school/fees/payments')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('x-schema-name', TEST_SCHEMA_A)
      .set('x-tenant-id', 'tenant-a')
      .send({
        student_id: studentB.id,
        amount: 1000,
        payment_method: 'cash',
      });

    // Should fail - student doesn't exist in tenant_a
    expect([400, 403, 404]).toContain(res.status);
  });
});
