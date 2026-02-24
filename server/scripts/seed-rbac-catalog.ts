/**
 * RBAC Permission Catalog Seeder
 * 
 * Seeds missing RBAC permissions for User Management and RBAC modules.
 * Idempotent - safe to run multiple times.
 */

const { Pool } = require('pg');

const pool = new Pool({ 
    connectionString: 'postgres://postgres:postgres@127.0.0.1:5433/school_erp'
});

const MODULES = [
    { slug: 'users', name: 'User Management' },
    { slug: 'settings', name: 'Settings & RBAC' }
];

const FEATURES = [
    { slug: 'users', name: 'User Management', moduleSlug: 'users' },
    { slug: 'settings', name: 'Settings', moduleSlug: 'settings' },
    { slug: 'roles', name: 'Roles', moduleSlug: 'settings' },
    { slug: 'permissions', name: 'Permissions', moduleSlug: 'settings' },
    { slug: 'rbac', name: 'RBAC', moduleSlug: 'settings' }
];

const PERMISSIONS = [
    // User Management - Teachers
    { key: 'users.teachers.view', name: 'View Teachers' },
    { key: 'users.teachers.create', name: 'Create Teachers' },
    { key: 'users.teachers.edit', name: 'Edit Teachers' },
    { key: 'users.teachers.delete', name: 'Delete Teachers' },
    { key: 'users.teachers.manage', name: 'Manage Teachers' },
    
    // User Management - Students
    { key: 'users.students.view', name: 'View Students' },
    { key: 'users.students.create', name: 'Create Students' },
    { key: 'users.students.edit', name: 'Edit Students' },
    { key: 'users.students.delete', name: 'Delete Students' },
    { key: 'users.students.manage', name: 'Manage Students' },
    
    // User Management - Staff
    { key: 'users.staff.view', name: 'View Staff' },
    { key: 'users.staff.create', name: 'Create Staff' },
    { key: 'users.staff.edit', name: 'Edit Staff' },
    { key: 'users.staff.delete', name: 'Delete Staff' },
    { key: 'users.staff.manage', name: 'Manage Staff' },
    
    // User Management - Parents
    { key: 'users.parents.view', name: 'View Parents' },
    { key: 'users.parents.manage', name: 'Manage Parents' },
    
    // User Management - General
    { key: 'users.view', name: 'View Users' },
    { key: 'users.manage', name: 'Manage Users' },
    { key: 'users.management.view', name: 'View User Management' },
    { key: 'users.management.manage', name: 'Manage User Management' },
    
    // Settings - Roles
    { key: 'settings.roles.view', name: 'View Roles' },
    { key: 'settings.roles.create', name: 'Create Roles' },
    { key: 'settings.roles.edit', name: 'Edit Roles' },
    { key: 'settings.roles.delete', name: 'Delete Roles' },
    { key: 'settings.roles.manage', name: 'Manage Roles' },
    
    // Settings - Permissions
    { key: 'settings.permissions.view', name: 'View Permissions' },
    { key: 'settings.permissions.assign', name: 'Assign Permissions' },
    { key: 'settings.permissions.manage', name: 'Manage Permissions' },
    
    // Settings - RBAC
    { key: 'settings.rbac.view', name: 'View RBAC Settings' },
    { key: 'settings.rbac.manage', name: 'Manage RBAC' },
    { key: 'settings.rbac.assign', name: 'Assign RBAC Roles' },
    
    // Settings - General
    { key: 'settings.view', name: 'View Settings' },
    { key: 'settings.manage', name: 'Manage Settings' },
];

async function seed() {
    console.log('=== RBAC Permission Catalog Seeder ===\n');
    
    // Step 1: Create missing modules
    console.log('--- Creating Modules ---');
    let modulesCreated = 0;
    for (const mod of MODULES) {
        const existing = await pool.query('SELECT id FROM public.modules WHERE slug = $1', [mod.slug]);
        if (existing.rows.length === 0) {
            await pool.query(
                'INSERT INTO public.modules (id, slug, name, is_active, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, true, NOW(), NOW())',
                [mod.slug, mod.name]
            );
            console.log(`  [CREATED] module: ${mod.slug}`);
            modulesCreated++;
        }
    }
    console.log(`  Modules created: ${modulesCreated}`);
    
    // Get module IDs
    const moduleMap = {};
    const modResult = await pool.query('SELECT id, slug FROM public.modules');
    modResult.rows.forEach(m => moduleMap[m.slug] = m.id);
    
    // Step 2: Create missing features
    console.log('\n--- Creating Features ---');
    let featuresCreated = 0;
    for (const feat of FEATURES) {
        const existing = await pool.query('SELECT id FROM public.features WHERE slug = $1', [feat.slug]);
        if (existing.rows.length === 0) {
            await pool.query(
                'INSERT INTO public.features (id, module_id, slug, name, is_active, route_active, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, true, true, NOW(), NOW())',
                [moduleMap[feat.moduleSlug], feat.slug, feat.name]
            );
            console.log(`  [CREATED] feature: ${feat.slug}`);
            featuresCreated++;
        }
    }
    console.log(`  Features created: ${featuresCreated}`);
    
    // Get feature IDs
    const featureMap = {};
    const featResult = await pool.query('SELECT id, slug FROM public.features');
    featResult.rows.forEach(f => featureMap[f.slug] = f.id);
    
    // Step 3: Create missing permissions
    console.log('\n--- Creating Permissions ---');
    let permsCreated = 0;
    let permsExisting = 0;
    
    for (const perm of PERMISSIONS) {
        const existing = await pool.query('SELECT id FROM public.permissions WHERE key = $1', [perm.key]);
        if (existing.rows.length === 0) {
            // Determine feature based on key prefix
            const prefix = perm.key.split('.')[0]; // users or settings
            const featureId = featureMap[prefix] || featureMap['users'];
            
            const action = perm.key.split('.')[1] || 'view';
            
            await pool.query(
                'INSERT INTO public.permissions (id, feature_id, key, action, description, is_active, route_active, created_at, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, true, true, NOW(), NOW())',
                [featureId, perm.key, action, `Permission to ${perm.name.toLowerCase()}`]
            );
            console.log(`  [CREATED] ${perm.key}`);
            permsCreated++;
        } else {
            permsExisting++;
        }
    }
    console.log(`  Permissions created: ${permsCreated}, existing: ${permsExisting}`);
    
    // Step 4: Link permissions to admin role
    console.log('\n--- Linking Permissions to Admin Role ---');
    
    const adminRole = await pool.query(
        "SELECT id FROM demo_school_validation.roles WHERE name = 'Admin'"
    );
    
    if (adminRole.rows.length > 0) {
        const adminRoleId = adminRole.rows[0].id;
        
        // Get all permission IDs
        let linkedCount = 0;
        for (const perm of PERMISSIONS) {
            const permResult = await pool.query('SELECT id FROM public.permissions WHERE key = $1', [perm.key]);
            if (permResult.rows.length > 0) {
                const permId = permResult.rows[0].id;
                
                // Check if already linked
                const linkCheck = await pool.query(
                    'SELECT 1 FROM demo_school_validation.role_permissions WHERE role_id = $1 AND permission_id = $2',
                    [adminRoleId, permId]
                );
                
                if (linkCheck.rows.length === 0) {
                    await pool.query(
                        'INSERT INTO demo_school_validation.role_permissions (id, role_id, permission_id) VALUES (gen_random_uuid(), $1, $2)',
                        [adminRoleId, permId]
                    );
                    linkedCount++;
                }
            }
        }
        console.log(`  Permissions linked to admin: ${linkedCount}`);
    }
    
    // Step 5: Show admin permissions
    console.log('\n--- Admin Role Permissions ---');
    const adminPerms = await pool.query(
        `SELECT p.key 
         FROM demo_school_validation.role_permissions rp
         JOIN public.permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = $1
         ORDER BY p.key`,
        [adminRole.rows[0].id]
    );
    
    console.log(`Total permissions for admin: ${adminPerms.rows.length}`);
    adminPerms.rows.slice(0, 15).forEach(r => console.log(`  - ${r.key}`));
    if (adminPerms.rows.length > 15) {
        console.log(`  ... and ${adminPerms.rows.length - 15} more`);
    }
    
    console.log('\n✅ Seeder completed successfully');
    await pool.end();
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Seeder failed:', err);
    process.exit(1);
});
