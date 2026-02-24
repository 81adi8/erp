/**
 * Seed Global Permissions Script
 * 
 * Seeds modules, features, and permissions into the public schema.
 * Run with: npx ts-node src/scripts/seed-global-permissions.ts
 */

import 'reflect-metadata';
import { sequelize } from '../database/sequelize';
import { seedGlobalPermissions } from '../database/seeders/global-permissions.seeder';

const log = (message: string) => console.log(`[Seed] ${message}`);

async function main() {
    console.log('');
    console.log('========================================');
    console.log('  Global Permissions Seeder');
    console.log('========================================');
    console.log('');

    try {
        await sequelize.authenticate();
        log('✓ Database connected');

        await seedGlobalPermissions();

        console.log('');
        log('✅ Seeding completed successfully!');
        console.log('');
    } catch (err: any) {
        console.error('');
        console.error('[Seed Error]', err.message);
        console.error(err);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

main();
