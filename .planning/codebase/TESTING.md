# Testing Patterns

**Analysis Date:** 2026-02-24

## Test Framework

**Runner:**
- **Jest** v30.2.0
- Config: `server/jest.config.ts`
- Preset: `ts-jest`
- Environment: `node`

**Assertion Library:**
- Jest built-in expect

**Run Commands:**
```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

## Test File Organization

**Location:**
- Co-located in `__tests__` directory at `server/src/__tests__/`
- NOT co-located with source files (separate directory)

**Naming:**
- Pattern: `*.test.ts`

**Structure:**
```
server/src/__tests__/
├── auth/
│   └── auth.test.ts
├── fees/
│   └── fee.test.ts
├── examination/
│   └── examination.test.ts
├── tenant/
│   └── tenant-isolation.test.ts
├── parent/
│   └── parent-portal.test.ts
├── transactions/
│   └── critical-flows.transaction.test.ts
└── helpers/
    ├── index.ts
    ├── auth-helper.ts
    ├── auth.ts
    ├── seed.helper.ts
    ├── seed.ts
    └── tenant-schema.ts
```

## Test Structure

**Suite Organization:**
```typescript
/**
 * [Module] Integration Tests
 * 
 * Tests [functionality] using REAL Express app and database.
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

describe('[Feature Area]', () => {
    let token: string;

    beforeAll(async () => {
        // Setup: create test user, login, get token
    });

    test('[specific test case] → [expected result]', async () => {
        const res = await withSchema(
            request(app).post('/api/v1/endpoint')
        ).set('Authorization', `Bearer ${token}`).send({
            // request body
        });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
```

**Patterns:**
- `beforeAll` for test setup (user creation, login)
- `describe` blocks for feature areas
- `test` or `it` for individual test cases
- Helper function `withSchema()` to set tenant context headers

## Mocking

**Framework:** Jest built-in mocking

**Mock Files Location:** `server/src/__mocks__/`

**Example - UUID Mock** (`server/src/__mocks__/uuid.ts`):
```typescript
import { randomUUID } from 'crypto';

export const v4 = jest.fn(() => randomUUID());
export const v5 = jest.fn(() => randomUUID());
export const v1 = jest.fn(() => randomUUID());
export const v3 = jest.fn(() => randomUUID());
export const validate = jest.fn((value?: string) => typeof value === 'string' && UUID_REGEX.test(value));
export const version = jest.fn((value?: string) => /* ... */);
export const parse = jest.fn((value: string) => toBytes(value));
export const stringify = jest.fn((bytes: Uint8Array) => toUuidString(bytes));
export const NIL = '00000000-0000-0000-0000-000000000000';
export const MAX = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
```

**Keycloak Mock** (`server/src/__mocks__/@keycloak/keycloak-admin-client.ts`):
- Mocks Keycloak admin client for testing

**Module Mapping in Jest Config:**
```typescript
moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^keycloak/keycloak-admin-client$': '<rootDir>/__mocks__/@keycloak/keycloak-admin-client.ts',
    '^uuid$': '<rootDir>/__mocks__/uuid.ts',
}
```

**What to Mock:**
- ESM modules (uuid, keycloak, otplib, qrcode)
- External services
- Random generators for deterministic tests

**What NOT to Mock:**
- Express app (use real app via supertest)
- Database (use real database with test schema)
- Business logic (test through API endpoints)

## Fixtures and Factories

**Test Data Patterns:**

Helper functions in test files:
```typescript
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

async function grantTestPermissions(userId: string): Promise<void> {
  for (const permissionKey of TEST_PERMISSION_KEYS) {
    await sequelize.query(
      `INSERT INTO "${TEST_SCHEMA}".user_permissions (user_id, permission_id, permission_key, granted_by)
       VALUES (:userId, gen_random_uuid(), :permissionKey, :userId)`,
      {
        replacements: { userId, permissionKey },
      }
    );
  }
}
```

**Schema Helper:**
```typescript
function withSchema(req: request.Test): request.Test {
  return req
    .set('x-schema-name', TEST_SCHEMA)
    .set('x-tenant-id', 'test-tenant')
    .set('x-storage-preference', 'local-storage');
}
```

**Location:**
- Inline helpers in each test file
- Shared helpers in `server/src/__tests__/helpers/`

## Coverage

**Requirements:**
- Enforced via Jest config:
```typescript
coverageThreshold: {
    global: {
        branches: 50,
        functions: 60,
        lines: 60,
    },
}
```

**Collected from:**
```typescript
collectCoverageFrom: [
    'modules/**/*.ts',
    '!modules/**/*.dto.ts',
    '!modules/**/index.ts',
    '!modules/**/*.types.ts',
],
```

**View Coverage:**
```bash
npm run test:coverage
```

**Coverage Output:** `server/coverage/`

## Test Types

**Integration Tests:**
- Use supertest with real Express app
- Test against real database (test schema)
- HTTP-level testing (requests/responses)
- Full middleware stack including:
  - Tenant context resolution
  - Authentication
  - Authorization
  - RBAC

**Test Scope:**
- Auth flows (login, refresh, logout)
- CRUD operations
- Permission checks
- Validation errors
- Tenant isolation

**Test Database:**
- Uses `process.env.DB_SCHEMA || 'test_schema_jest'`
- Schema must be created before tests run
- Global setup/teardown in Jest config:
```typescript
globalSetup: '<rootDir>/../jest.global-setup.ts',
globalTeardown: '<rootDir>/../jest.global-teardown.ts',
```

## Common Patterns

**Async Testing:**
```typescript
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
});
```

**Error Testing:**
```typescript
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

test('missing email returns 400', async () => {
    const res = await withSchema(
        request(app).post('/api/v1/tenant/auth/login')
    ).send({
        password: 'TestPass123!',
    });

    expect(res.status).toBe(400);
});
```

**Flexible Status Codes (when DB may be incomplete):**
```typescript
// When tests may fail due to incomplete DB setup
expect([201, 400, 404]).toContain(res.status);
if (res.status === 201) {
    expect(res.body.data).toHaveProperty('id');
}
```

**Test Timeout:**
- 30 seconds (configured in Jest)

## Client-Side Testing

**Status:** NOT DETECTED

- No test files found in `client/apps/**/*.test.ts`
- No test files found in `client/apps/**/*.spec.ts`
- No testing framework configured for client

---

*Testing analysis: 2026-02-24*
