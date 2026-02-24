-- Fix Institution Creation (without realm column)
INSERT INTO institutions (
    id, 
    name, 
    slug, 
    db_schema, 
    plan_id, 
    status, 
    type, 
    sub_domain
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Test School',
    'test-school',
    'test_tenant_schema',
    NULL,
    'active',
    'school',
    'test-school'
) ON CONFLICT (id) DO UPDATE SET status = 'active', slug = 'test-school'
RETURNING id, slug;

-- Verify
SELECT id, slug, name, status FROM institutions;
