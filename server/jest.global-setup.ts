/**
 * Jest Global Setup
 * 
 * Runs ONCE before all test files.
 * Creates the test database schema and tables.
 * Does NOT close the connection - tests need it.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment first
dotenv.config({ path: path.join(__dirname, '.env.test') });

const TEST_TENANT_ID = process.env.TEST_TENANT_ID || '11111111-1111-4111-8111-111111111111';

async function ensureAuthTables(sequelize: { query: (sql: string) => Promise<unknown> }, schema: string): Promise<void> {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      phone TEXT,
      is_active BOOLEAN DEFAULT true,
      is_email_verified BOOLEAN DEFAULT false,
      is_phone_verified BOOLEAN DEFAULT false,
      institution_id UUID DEFAULT '${TEST_TENANT_ID}',
      keycloak_id TEXT,
      user_type TEXT,
      created_by UUID,
      metadata JSONB DEFAULT '{}'::jsonb,
      mfa_enabled BOOLEAN DEFAULT false,
      mfa_secret TEXT,
      mfa_backup_codes JSONB,
      mfa_verified_at TIMESTAMP,
      auth_provider TEXT DEFAULT 'password',
      ip_allowlist JSONB,
      last_login_at TIMESTAMP,
      last_login_ip TEXT,
      deleted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sequelize.query(`
    ALTER TABLE "${schema}".users
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS institution_id UUID DEFAULT '${TEST_TENANT_ID}',
      ADD COLUMN IF NOT EXISTS keycloak_id TEXT,
      ADD COLUMN IF NOT EXISTS user_type TEXT,
      ADD COLUMN IF NOT EXISTS created_by UUID,
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS mfa_secret TEXT,
      ADD COLUMN IF NOT EXISTS mfa_backup_codes JSONB,
      ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'password',
      ADD COLUMN IF NOT EXISTS ip_allowlist JSONB,
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS last_login_ip TEXT,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await sequelize.query(`
    UPDATE "${schema}".users
    SET institution_id = COALESCE(institution_id, '${TEST_TENANT_ID}'::uuid),
        auth_provider = COALESCE(auth_provider, 'password'),
        mfa_enabled = COALESCE(mfa_enabled, false),
        is_email_verified = COALESCE(is_email_verified, false)
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) UNIQUE NOT NULL,
      slug TEXT,
      description TEXT,
      role_type TEXT,
      is_system BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      asset_type TEXT DEFAULT 'public',
      source_role_id UUID,
      plan_id UUID,
      deleted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sequelize.query(`
    ALTER TABLE "${schema}".roles
      ADD COLUMN IF NOT EXISTS slug TEXT,
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS role_type TEXT,
      ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS asset_type TEXT DEFAULT 'public',
      ADD COLUMN IF NOT EXISTS source_role_id UUID,
      ADD COLUMN IF NOT EXISTS plan_id UUID,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await sequelize.query(`
    INSERT INTO "${schema}".roles (name, slug)
    VALUES
      ('admin', 'admin'),
      ('teacher', 'teacher'),
      ('student', 'student'),
      ('parent', 'parent')
    ON CONFLICT (name) DO NOTHING
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES "${schema}".users(id),
      role_id UUID REFERENCES "${schema}".roles(id),
      institution_id UUID,
      assigned_by UUID,
      assignment_type TEXT DEFAULT 'explicit',
      source_role_id UUID,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sequelize.query(`
    ALTER TABLE "${schema}".user_roles
      ADD COLUMN IF NOT EXISTS institution_id UUID,
      ADD COLUMN IF NOT EXISTS assigned_by UUID,
      ADD COLUMN IF NOT EXISTS assignment_type TEXT DEFAULT 'explicit',
      ADD COLUMN IF NOT EXISTS source_role_id UUID,
      ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS user_roles_unique
    ON "${schema}".user_roles (user_id, role_id)
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".role_permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      role_id UUID REFERENCES "${schema}".roles(id),
      permission_id UUID,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS role_permissions_unique
    ON "${schema}".role_permissions (role_id, permission_id)
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".user_permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES "${schema}".users(id),
      permission_id UUID,
      permission_key TEXT,
      granted_by UUID,
      granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS user_permissions_user_id_idx
    ON "${schema}".user_permissions (user_id)
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".admin_permissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES "${schema}".users(id),
      permission_id UUID,
      permission_key TEXT,
      institution_id UUID,
      granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS admin_permissions_user_id_idx
    ON "${schema}".admin_permissions (user_id)
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".students (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES "${schema}".users(id),
      admission_number VARCHAR(50) UNIQUE,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sequelize.query(`
    ALTER TABLE "${schema}".students
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".academic_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      institution_id UUID NOT NULL,
      name TEXT,
      is_current BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      start_date DATE,
      end_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS academic_sessions_institution_current_idx
    ON "${schema}".academic_sessions (institution_id, is_current)
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".grades (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      institution_id UUID NOT NULL,
      name TEXT NOT NULL,
      min_percentage NUMERIC(5,2) NOT NULL,
      max_percentage NUMERIC(5,2) NOT NULL,
      grade_point NUMERIC(4,2),
      description TEXT,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES "${schema}".users(id),
      institution_id UUID,
      device_id TEXT,
      device_info JSONB,
      ip INET,
      user_agent TEXT,
      device_type TEXT,
      geo_region TEXT,
      user_agent_hash TEXT,
      is_new_device BOOLEAN DEFAULT false,
      mfa_verified BOOLEAN DEFAULT false,
      mfa_verified_at TIMESTAMP,
      last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP,
      revoked_at TIMESTAMP,
      revoke_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES "${schema}".sessions(id),
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      rotated_from UUID,
      revoked_at TIMESTAMP,
      revoked_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID,
      institution_id UUID,
      action TEXT NOT NULL,
      meta JSONB DEFAULT '{}'::jsonb,
      ip INET,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON "${schema}".audit_logs (action)
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON "${schema}".audit_logs (user_id)
  `);

  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS audit_logs_institution_id_idx ON "${schema}".audit_logs (institution_id)
  `);
}

export default async function globalSetup() {
  console.log('[Jest Global Setup] Starting...');
  
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  const { sequelize } = await import('./src/database/sequelize');
  const { connectRedis } = await import('./src/config/redis');
  
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('[Jest Global Setup] Database connected');

    await connectRedis();
    console.log('[Jest Global Setup] Redis connected');

    await sequelize.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    // Create test schema
    const testSchema = process.env.DB_SCHEMA || 'test_schema_jest';
    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${testSchema}"`, { raw: true });
    console.log(`[Jest Global Setup] Created schema: ${testSchema}`);

    await ensureAuthTables(sequelize, testSchema);

    // Create tenant isolation test schemas
    const schemaA = 'test_tenant_a';
    const schemaB = 'test_tenant_b';
    
    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schemaA}"`);
    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schemaB}"`);
    
    // Create tables in tenant schemas
    for (const schema of [schemaA, schemaB]) {
      await ensureAuthTables(sequelize, schema);
    }

    console.log('[Jest Global Setup] All test tables created');
    console.log('[Jest Global Setup] Setup complete - connection remains open for tests');
    
  } catch (error) {
    console.error('[Jest Global Setup] Setup failed:', error);
    throw error;
  }
}
