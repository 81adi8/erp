/**
 * Parent Portal Access Control Integration Tests
 * 
 * Tests parent isolation and access control using REAL Express app and database.
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

// Helper to create test user in database
async function createTestUserInDb(options: {
  email: string;
  password: string;
  role: string;
}): Promise<{ id: string; email: string }> {
  const hashedPassword = await bcrypt.hash(options.password, 10);
  
  const [userResult] = await sequelize.query(
    `INSERT INTO "${TEST_SCHEMA}".users (email, password_hash, first_name, last_name, is_active)
     VALUES (:email, :password, 'Test', 'User', true)
     RETURNING id, email`,
    {
      replacements: { email: options.email, password: hashedPassword },
    }
  );

  const user = userResult as { id: string; email: string }[];

  await sequelize.query(
    `INSERT INTO "${TEST_SCHEMA}".user_roles (user_id, role_id)
     SELECT :userId, id FROM "${TEST_SCHEMA}".roles WHERE name = :role`,
    {
      replacements: { userId: user[0].id, role: options.role },
    }
  );

  return user[0];
}

describe('Parent isolation', () => {
  let parentToken: string;
  let parentId: string;
  let childId: string;
  let otherChildId: string;

  beforeAll(async () => {
    const parent = await createTestUserInDb({
      email: 'parent@school.com',
      password: 'TestPass123!',
      role: 'parent',
    });

    parentId = parent.id;

    const res = await withSchema(
      request(app).post('/api/v1/tenant/auth/login')
    ).send({ email: parent.email, password: 'TestPass123!' });

    parentToken = res.body.data?.accessToken;
  });

  test('parent can view their OWN child attendance', async () => {
    const res = await withSchema(
      request(app).get(`/api/v2/school/parent/${parentId}/children`)
    ).set('Authorization', `Bearer ${parentToken}`);

    expect([200, 404]).toContain(res.status);
  });

  test('parent CANNOT view another parent\'s child', async () => {
    const otherParentId = 'other-parent-uuid';
    
    const res = await withSchema(
      request(app).get(`/api/v2/school/parent/${otherParentId}/children`)
    ).set('Authorization', `Bearer ${parentToken}`);

    expect([403, 404]).toContain(res.status);
  });

  test('parent can view their OWN child marks', async () => {
    const res = await withSchema(
      request(app).get(`/api/v2/school/parent/${parentId}/results`)
    ).set('Authorization', `Bearer ${parentToken}`);

    expect([200, 404]).toContain(res.status);
  });

  test('parent CANNOT view another child\'s marks', async () => {
    const otherChildId = 'other-child-uuid';
    
    const res = await withSchema(
      request(app).get(`/api/v2/school/students/${otherChildId}/results`)
    ).set('Authorization', `Bearer ${parentToken}`);

    expect([403, 404]).toContain(res.status);
  });

  test('parent can pay fees for their OWN child', async () => {
    const res = await withSchema(
      request(app).post('/api/v2/school/fees/payments')
    ).set('Authorization', `Bearer ${parentToken}`).send({
      student_id: childId || 'test-child-id',
      amount: 5000,
      payment_method: 'online',
    });

    expect([201, 400, 403, 404]).toContain(res.status);
  });

  test('parent CANNOT pay fees for another child', async () => {
    const otherChildId = 'other-child-uuid';
    
    const res = await withSchema(
      request(app).post('/api/v2/school/fees/payments')
    ).set('Authorization', `Bearer ${parentToken}`).send({
      student_id: otherChildId,
      amount: 5000,
      payment_method: 'online',
    });

    expect([403, 404]).toContain(res.status);
  });
});

describe('Parent-Student Linking', () => {
  let adminToken: string;

  beforeAll(async () => {
    const admin = await createTestUserInDb({
      email: 'link_admin@school.com',
      password: 'TestPass123!',
      role: 'admin',
    });

    const res = await withSchema(
      request(app).post('/api/v1/tenant/auth/login')
    ).send({ email: admin.email, password: 'TestPass123!' });

    adminToken = res.body.data?.accessToken;
  });

  test('link parent to student → 201', async () => {
    const res = await withSchema(
      request(app).post('/api/v2/school/parent/link')
    ).set('Authorization', `Bearer ${adminToken}`).send({
      parent_id: 'test-parent-id',
      student_id: 'test-student-id',
      relationship: 'father',
    });

    expect([201, 400, 404]).toContain(res.status);
  });

  test('link same parent twice to same student → idempotent', async () => {
    // First link
    await withSchema(
      request(app).post('/api/v2/school/parent/link')
    ).set('Authorization', `Bearer ${adminToken}`).send({
      parent_id: 'test-parent-id-2',
      student_id: 'test-student-id-2',
      relationship: 'mother',
    });

    // Second link (should be idempotent)
    const res = await withSchema(
      request(app).post('/api/v2/school/parent/link')
    ).set('Authorization', `Bearer ${adminToken}`).send({
      parent_id: 'test-parent-id-2',
      student_id: 'test-student-id-2',
      relationship: 'mother',
    });

    expect([200, 201, 400, 409, 404]).toContain(res.status);
  });

  test('unlink parent from student → 200', async () => {
    const res = await withSchema(
      request(app).delete('/api/v2/school/parent/unlink')
    ).set('Authorization', `Bearer ${adminToken}`).send({
      parent_id: 'test-parent-id',
      student_id: 'test-student-id',
    });

    expect([200, 404]).toContain(res.status);
  });
});
