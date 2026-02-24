-- Create RBAC tables for test tenant schema
CREATE TABLE IF NOT EXISTS test_tenant_schema.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    permission_id UUID,
    permission_key VARCHAR(255) NOT NULL,
    granted_by UUID,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_tenant_schema.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    assigned_by UUID,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS test_tenant_schema.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    role_type VARCHAR(50),
    is_system BOOLEAN DEFAULT false,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert admin role with all permissions
INSERT INTO test_tenant_schema.roles (id, name, description, role_type, is_system, permissions) VALUES 
('550e8400-e29b-41d4-a716-446655440010', 'Admin', 'Full system access', 'admin', true, '["*"]')
ON CONFLICT (id) DO NOTHING;

-- Assign admin role to test user
INSERT INTO test_tenant_schema.user_roles (user_id, role_id, assigned_by) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT DO NOTHING;

-- Grant permissions to test user
INSERT INTO test_tenant_schema.user_permissions (user_id, permission_key, granted_by) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'users.students.view', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440001', 'users.students.create', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440001', 'users.students.manage', '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT DO NOTHING;
