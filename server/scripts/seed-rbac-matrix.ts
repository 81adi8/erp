#!/usr/bin/env ts-node
/**
 * RBAC Permission Matrix Seeder
 * 
 * Seeds the complete RBAC authorization matrix for Academics module testing.
 * This creates proper permission records and links them to roles via junction tables.
 * 
 * Usage:
 *   npx ts-node src/scripts/seed-rbac-matrix.ts [schema_name]
 * 
 * Example:
 *   npx ts-node src/scripts/seed-rbac-matrix.ts test_tenant_schema
 */

import { sequelize, connectDB } from '../database/sequelize';

const DEFAULT_SCHEMA = process.argv[2] || 'test_tenant_schema';

// Academics permission matrix
const ACADEMICS_PERMISSIONS = [
  // Sessions
  { code: 'academics.sessions.view', name: 'View Academic Sessions', action: 'view' },
  { code: 'academics.sessions.manage', name: 'Manage Academic Sessions', action: 'manage' },
  // Classes
  { code: 'academics.classes.view', name: 'View Classes', action: 'view' },
  { code: 'academics.classes.manage', name: 'Manage Classes', action: 'manage' },
  // Subjects
  { code: 'academics.subjects.view', name: 'View Subjects', action: 'view' },
  { code: 'academics.subjects.manage', name: 'Manage Subjects', action: 'manage' },
  // Curriculum
  { code: 'academics.curriculum.view', name: 'View Curriculum', action: 'view' },
  { code: 'academics.curriculum.manage', name: 'Manage Curriculum', action: 'manage' },
  // Lesson Plans
  { code: 'academics.lessonPlans.view', name: 'View Lesson Plans', action: 'view' },
  { code: 'academics.lessonPlans.manage', name: 'Manage Lesson Plans', action: 'manage' },
  // Timetable
  { code: 'academics.timetable.view', name: 'View Timetable', action: 'view' },
  { code: 'academics.timetable.manage', name: 'Manage Timetable', action: 'manage' }
];

// Role permission assignments
const ROLE_MATRIX = {
  Admin: [
    'academics.sessions.view', 'academics.sessions.manage',
    'academics.classes.view', 'academics.classes.manage',
    'academics.subjects.view', 'academics.subjects.manage',
    'academics.curriculum.view', 'academics.curriculum.manage',
    'academics.lessonPlans.view', 'academics.lessonPlans.manage',
    'academics.timetable.view', 'academics.timetable.manage'
  ],
  Teacher: [
    'academics.sessions.view',
    'academics.classes.view',
    'academics.subjects.view',
    'academics.curriculum.view', 'academics.curriculum.manage',
    'academics.lessonPlans.view', 'academics.lessonPlans.manage',
    'academics.timetable.view'
  ],
  Student: [
    'academics.sessions.view',
    'academics.classes.view',
    'academics.subjects.view',
    'academics.timetable.view'
  ]
};

async function seedRBACMatrix(schemaName: string) {
  console.log('='.repeat(70));
  console.log('RBAC PERMISSION MATRIX SEEDER');
  console.log('='.repeat(70));
  console.log(`Schema: ${schemaName}`);
  console.log('');

  try {
    await connectDB();

    // Step 1: Create Academics Feature
    console.log('Step 1: Creating Academics feature...');
    const featureId = await createOrGetFeature();
    console.log(`✅ Feature ID: ${featureId}\n`);

    // Step 2: Create Permissions
    console.log('Step 2: Creating permissions...');
    const permissionMap = new Map<string, string>(); // code -> id
    for (const perm of ACADEMICS_PERMISSIONS) {
      const permId = await createOrGetPermission(featureId, perm);
      permissionMap.set(perm.code, permId);
      console.log(`  ✅ ${perm.code}`);
    }
    console.log('');

    // Step 3: Assign permissions to roles
    console.log('Step 3: Assigning permissions to roles...');
    for (const [roleName, permissions] of Object.entries(ROLE_MATRIX)) {
      await assignPermissionsToRole(schemaName, roleName, permissions, permissionMap);
    }
    console.log('');

    // Step 4: Verify matrix
    console.log('Step 4: Verifying permission matrix...');
    await verifyMatrix(schemaName);

    // Summary
    console.log('='.repeat(70));
    console.log('SEEDING COMPLETE');
    console.log('='.repeat(70));
    console.log('');
    console.log('Authorization Matrix:');
    console.log('  Admin:   12 permissions (full access)');
    console.log('  Teacher:  8 permissions (view + limited manage)');
    console.log('  Student:  4 permissions (view only)');
    console.log('');
    console.log('Expected Test Results:');
    console.log('  Admin POST /classes   → 200 ✅');
    console.log('  Admin GET /classes    → 200 ✅');
    console.log('  Teacher POST /classes → 403 ✅');
    console.log('  Teacher GET /classes  → 200 ✅');
    console.log('  Student POST /classes → 403 ✅');
    console.log('  Student GET /classes  → 200 ✅');
    console.log('');
    console.log('Ready for final RBAC certification tests');
    console.log('');

  } catch (error: any) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

async function createOrGetFeature(): Promise<string> {
  // Check if Academics feature exists in public schema
  const existing = await sequelize.query(
    `SELECT id FROM public.features WHERE slug = 'academics'`,
    { type: 'SELECT' }
  );

  if ((existing as any[]).length > 0) {
    return (existing as any[])[0].id;
  }

  // Get or create Academics module first
  let moduleId;
  const existingModule = await sequelize.query(
    `SELECT id FROM public.modules WHERE slug = 'academics'`,
    { type: 'SELECT' }
  );

  if ((existingModule as any[]).length > 0) {
    moduleId = (existingModule as any[])[0].id;
  } else {
    // Create module
    const moduleResult = await sequelize.query(
      `INSERT INTO public.modules (id, slug, name, description, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), 'academics', 'Academics', 'Academic management module', true, NOW(), NOW())
       RETURNING id`,
      { type: 'SELECT' }
    );
    moduleId = (moduleResult as any[])[0].id;
    console.log(`    ✅ Created module: academics`);
  }

  // Create feature
  const result = await sequelize.query(
    `INSERT INTO public.features (id, module_id, slug, name, description, is_active, created_at, updated_at)
     VALUES (gen_random_uuid(), :moduleId, 'academics', 'Academics', 'Academic management module', true, NOW(), NOW())
     RETURNING id`,
    {
      replacements: { moduleId },
      type: 'SELECT'
    }
  );

  return (result as any[])[0].id;
}

async function createOrGetPermission(featureId: string, perm: any): Promise<string> {
  // Check if permission exists
  const existing = await sequelize.query(
    `SELECT id FROM public.permissions WHERE key = :key`,
    {
      replacements: { key: perm.code },
      type: 'SELECT'
    }
  );

  if ((existing as any[]).length > 0) {
    return (existing as any[])[0].id;
  }

  // Create permission
  const result = await sequelize.query(
    `INSERT INTO public.permissions 
     (id, feature_id, action, key, description, is_active, route_active, created_at, updated_at)
     VALUES (gen_random_uuid(), :featureId, :action, :key, :description, true, true, NOW(), NOW())
     RETURNING id`,
    {
      replacements: {
        featureId,
        action: perm.action,
        key: perm.code,
        description: perm.name
      },
      type: 'SELECT'
    }
  );

  return (result as any[])[0].id;
}

async function assignPermissionsToRole(
  schemaName: string, 
  roleName: string, 
  permissionCodes: string[],
  permissionMap: Map<string, string>
) {
  // Get role ID
  const roleResult = await sequelize.query(
    `SELECT id FROM "${schemaName}".roles WHERE name = :name`,
    {
      replacements: { name: roleName },
      type: 'SELECT'
    }
  );

  if ((roleResult as any[]).length === 0) {
    console.log(`  ❌ Role not found: ${roleName}`);
    return;
  }
  const roleId = (roleResult as any[])[0].id;

  let assignedCount = 0;
  for (const code of permissionCodes) {
    const permissionId = permissionMap.get(code);
    if (!permissionId) {
      console.log(`  ⚠️  Permission not found: ${code}`);
      continue;
    }

    // Check if already assigned
    const existing = await sequelize.query(
      `SELECT id FROM "${schemaName}".role_permissions 
       WHERE role_id = :roleId AND permission_id = :permissionId`,
      {
        replacements: { roleId, permissionId },
        type: 'SELECT'
      }
    );

    if ((existing as any[]).length === 0) {
      // Create assignment
      await sequelize.query(
        `INSERT INTO "${schemaName}".role_permissions 
         (id, role_id, permission_id, created_at, updated_at)
         VALUES (gen_random_uuid(), :roleId, :permissionId, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        {
          replacements: { roleId, permissionId },
          type: 'RAW'
        }
      );
      assignedCount++;
    }
  }

  console.log(`  ✅ ${roleName}: ${assignedCount} permissions assigned`);
}

async function verifyMatrix(schemaName: string) {
  for (const roleName of ['Admin', 'Teacher', 'Student']) {
    const result = await sequelize.query(
      `SELECT COUNT(*) as count 
       FROM "${schemaName}".role_permissions rp
       JOIN "${schemaName}".roles r ON rp.role_id = r.id
       WHERE r.name = :roleName`,
      {
        replacements: { roleName },
        type: 'SELECT'
      }
    );
    const count = (result as any[])[0].count;
    console.log(`  ${roleName}: ${count} permission links`);
  }
}

// Run the seeder
seedRBACMatrix(DEFAULT_SCHEMA);
