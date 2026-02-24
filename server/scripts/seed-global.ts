import 'reflect-metadata';
import { sequelize } from '../src/database/sequelize';
import { seedGlobalPermissions } from '../src/database/seeders/global-permissions.seeder';

async function main() {
    console.log('');
    console.log('========================================');
    console.log('  Global Permissions Seeder');
    console.log('========================================');
    console.log('');

    try {
        await sequelize.authenticate();
        console.log('[Seed] ✓ Database connected');

        await seedGlobalPermissions();

        console.log('');
        console.log('[Seed] ✅ Global seeding completed successfully!');
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
