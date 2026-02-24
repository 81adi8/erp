-- Create institution with all required fields
INSERT INTO institutions (
    id, 
    code,
    name, 
    slug, 
    db_schema, 
    type,
    status, 
    sub_domain,
    is_active,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'TEST-SCHOOL-001',
    'Test School',
    'test-school',
    'test_tenant_schema',
    'school',
    'active',
    'test-school',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET 
    status = 'active', 
    is_active = true,
    code = 'TEST-SCHOOL-001'
RETURNING id, slug, name, status;

-- Verify
SELECT id, slug, name, status, is_active FROM institutions;
