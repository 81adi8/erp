-- Complete Database Setup for RBAC Testing
-- Run this in your PostgreSQL container

-- 1. Create institution (tenant)
INSERT INTO institutions (
    id, 
    name, 
    slug, 
    db_schema, 
    plan_id, 
    status, 
    type, 
    sub_domain,
    realm
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Test School',
    'test-school',
    'test_tenant_schema',
    NULL,
    'active',
    'school',
    'test-school',
    'test-school'
) ON CONFLICT (slug) DO UPDATE SET status = 'active'
RETURNING id, slug;

-- 2. Create test tenant schema
CREATE SCHEMA IF NOT EXISTS test_tenant_schema;

-- 3. Create users table in tenant schema (if not exists)
CREATE TABLE IF NOT EXISTS test_tenant_schema.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    user_type VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    is_email_verified BOOLEAN DEFAULT false,
    keycloak_id VARCHAR(255),
    institution_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create test admin user
INSERT INTO test_tenant_schema.users (
    id,
    email, 
    first_name, 
    last_name, 
    user_type, 
    is_active, 
    keycloak_id,
    institution_id,
    is_email_verified
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'admin@test-school.com',
    'Admin',
    'User',
    'admin',
    true,
    'keycloak-admin-001',
    '550e8400-e29b-41d4-a716-446655440000',
    true
) ON CONFLICT (email) DO NOTHING;

-- 5. Create test teacher user
INSERT INTO test_tenant_schema.users (
    id,
    email, 
    first_name, 
    last_name, 
    user_type, 
    is_active, 
    keycloak_id,
    institution_id,
    is_email_verified
) VALUES (
    '550e8400-e29b-41d4-a716-446655440002',
    'teacher@test-school.com',
    'Teacher',
    'User',
    'teacher',
    true,
    'keycloak-teacher-001',
    '550e8400-e29b-41d4-a716-446655440000',
    true
) ON CONFLICT (email) DO NOTHING;

-- 6. Create test student user
INSERT INTO test_tenant_schema.users (
    id,
    email, 
    first_name, 
    last_name, 
    user_type, 
    is_active, 
    keycloak_id,
    institution_id,
    is_email_verified
) VALUES (
    '550e8400-e29b-41d4-a716-446655440003',
    'student@test-school.com',
    'Student',
    'User',
    'student',
    true,
    'keycloak-student-001',
    '550e8400-e29b-41d4-a716-446655440000',
    true
) ON CONFLICT (email) DO NOTHING;

-- Verify data
SELECT 'Institutions:' as table_name;
SELECT id, slug, name, status FROM institutions;

SELECT 'Users:' as table_name;
SELECT id, email, first_name, user_type, is_active FROM test_tenant_schema.users;
