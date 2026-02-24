/**
 * Accountant Role Seeder
 * Creates the Accountant role with fee management permissions.
 *
 * FIXED: Accountant role was missing from the system entirely.
 * The audit identified this as an expected role gap.
 *
 * Run: ts-node -r tsconfig-paths/register src/database/seeders/accountant-role.seeder.ts
 */
import { sequelize } from '../sequelize';
import { QueryTypes } from 'sequelize';

const ACCOUNTANT_PERMISSIONS = [
    // Fee management — full access
    'fees.view',
    'fees.create',
    'fees.update',
    'fees.delete',
    'fees.collect',
    'fees.receipt.generate',
    'fees.report.view',

    // Student — read only (to look up students for fee collection)
    'students.view',

    // Notices — read only
    'notices.view',

    // Dashboard — read only
    'dashboard.view',
];

export async function seedAccountantRole(schemaName: string): Promise<void> {
    console.log(`[AccountantSeeder] Seeding accountant role in schema: ${schemaName}`);

    // 1. Create role if not exists
    const [existingRoles] = await sequelize.query(
        `SELECT id FROM "${schemaName}"."roles" WHERE name = 'Accountant' LIMIT 1`,
        { type: QueryTypes.SELECT }
    ) as any[];

    let roleId: string;

    if (existingRoles) {
        roleId = existingRoles.id;
        console.log(`[AccountantSeeder] Role already exists: ${roleId}`);
    } else {
        const [newRole] = await sequelize.query(
            `INSERT INTO "${schemaName}"."roles" (name, description, is_system)
             VALUES ('Accountant', 'Manages fee collection, payments, and financial records', TRUE)
             RETURNING id`,
            { type: QueryTypes.INSERT }
        ) as any[];
        roleId = (newRole as any).id;
        console.log(`[AccountantSeeder] Created role: ${roleId}`);
    }

    // 2. Ensure permissions exist and are linked to the role
    for (const permKey of ACCOUNTANT_PERMISSIONS) {
        // Upsert permission
        const [perm] = await sequelize.query(
            `INSERT INTO "${schemaName}"."permissions" (key, description)
             VALUES (:key, :description)
             ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description
             RETURNING id`,
            { type: QueryTypes.INSERT, replacements: { key: permKey, description: `Permission: ${permKey}` } }
        ) as any[];

        const permId = (perm as any).id;

        // Link to role
        await sequelize.query(
            `INSERT INTO "${schemaName}"."role_permissions" (role_id, permission_id)
             VALUES (:roleId, :permId)
             ON CONFLICT (role_id, permission_id) DO NOTHING`,
            { type: QueryTypes.INSERT, replacements: { roleId, permId } }
        );
    }

    console.log(`[AccountantSeeder] Linked ${ACCOUNTANT_PERMISSIONS.length} permissions to Accountant role`);
}

// Run directly if called as script
if (require.main === module) {
    const schema = process.argv[2] || process.env.DEFAULT_SCHEMA || 'public';
    seedAccountantRole(schema)
        .then(() => {
            console.log('[AccountantSeeder] Done');
            process.exit(0);
        })
        .catch((err) => {
            console.error('[AccountantSeeder] Error:', err);
            process.exit(1);
        });
}
