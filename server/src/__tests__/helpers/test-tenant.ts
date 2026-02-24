/**
 * Test Tenant Helper
 * 
 * Creates and manages isolated test schemas for integration testing.
 * Each test suite gets its own schema to ensure complete isolation.
 */

import { QueryTypes } from 'sequelize';

export const TEST_TENANT = {
  id: 'test-tenant-uuid',
  schema: 'test_school',
  subdomain: 'testschool'
};

export interface TestTenantContext {
  id: string;
  schema: string;
  subdomain: string;
  adminToken: string;
  teacherToken: string;
  studentToken: string;
  parentToken: string;
}

// Lazy-load sequelize to avoid initialization errors
let _sequelize: any = null;
async function getSequelize() {
  if (!_sequelize) {
    try {
      const module = await import('../../database/sequelize');
      _sequelize = module.sequelize;
    } catch (error) {
      console.warn('[test-tenant] Could not load sequelize:', error);
    }
  }
  return _sequelize;
}

/**
 * Create an isolated test schema in the database
 * Runs migrations on it
 */
export async function createTestSchema(schemaName: string): Promise<void> {
  const sequelize = await getSequelize();
  if (!sequelize) {
    throw new Error('Database not connected');
  }

  // Create schema
  await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`, { type: QueryTypes.RAW });
  
  // Run core migrations on the schema
  await sequelize.query(`
    SET search_path TO "${schemaName}";
    
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      phone VARCHAR(20),
      is_active BOOLEAN DEFAULT true,
      locked_until TIMESTAMP,
      failed_login_attempts INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Roles table
    CREATE TABLE IF NOT EXISTS roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(50) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    -- User roles junction
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id UUID REFERENCES users(id),
      role_id UUID REFERENCES roles(id),
      PRIMARY KEY (user_id, role_id)
    );
    
    -- Academic years
    CREATE TABLE IF NOT EXISTS academic_years (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(50) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_active BOOLEAN DEFAULT true
    );
    
    -- Classes
    CREATE TABLE IF NOT EXISTS classes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(50) NOT NULL,
      code VARCHAR(20),
      academic_year_id UUID REFERENCES academic_years(id),
      is_active BOOLEAN DEFAULT true
    );
    
    -- Sections
    CREATE TABLE IF NOT EXISTS sections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      class_id UUID REFERENCES classes(id),
      name VARCHAR(10) NOT NULL,
      capacity INTEGER DEFAULT 40,
      is_active BOOLEAN DEFAULT true
    );
    
    -- Students
    CREATE TABLE IF NOT EXISTS students (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      admission_number VARCHAR(50) UNIQUE,
      is_active BOOLEAN DEFAULT true
    );
    
    -- Enrollments
    CREATE TABLE IF NOT EXISTS enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID REFERENCES students(id),
      class_id UUID REFERENCES classes(id),
      section_id UUID REFERENCES sections(id),
      academic_year_id UUID REFERENCES academic_years(id),
      status VARCHAR(20) DEFAULT 'ACTIVE',
      enrollment_date DATE DEFAULT CURRENT_DATE
    );
    
    -- Fee categories
    CREATE TABLE IF NOT EXISTS fee_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      academic_year_id UUID REFERENCES academic_years(id),
      is_active BOOLEAN DEFAULT true
    );
    
    -- Fee structures
    CREATE TABLE IF NOT EXISTS fee_structures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      fee_category_id UUID REFERENCES fee_categories(id),
      class_id UUID REFERENCES classes(id),
      academic_year_id UUID REFERENCES academic_years(id),
      amount DECIMAL(12,2) NOT NULL,
      frequency VARCHAR(20) DEFAULT 'one_time',
      is_active BOOLEAN DEFAULT true
    );
    
    -- Fee payments
    CREATE TABLE IF NOT EXISTS fee_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID REFERENCES students(id),
      amount DECIMAL(12,2) NOT NULL,
      payment_method VARCHAR(50),
      receipt_number VARCHAR(50) UNIQUE,
      payment_date DATE DEFAULT CURRENT_DATE,
      academic_year_id UUID REFERENCES academic_years(id)
    );
    
    -- Insert default roles
    INSERT INTO roles (name, description) VALUES
      ('admin', 'Administrator with full access'),
      ('teacher', 'Teacher with class management access'),
      ('student', 'Student with limited access'),
      ('parent', 'Parent with child access')
    ON CONFLICT DO NOTHING;
  `, { type: QueryTypes.RAW });
}

/**
 * Drop test schema completely
 */
export async function dropTestSchema(schemaName: string): Promise<void> {
  const sequelize = await getSequelize();
  if (!sequelize) {
    throw new Error('Database not connected');
  }

  await sequelize.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`, { type: QueryTypes.RAW });
}

/**
 * Generate a unique schema name for testing
 */
export function generateTestSchemaName(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}_${timestamp}_${random}`;
}

export default {
  TEST_TENANT,
  createTestSchema,
  dropTestSchema,
  generateTestSchemaName,
};