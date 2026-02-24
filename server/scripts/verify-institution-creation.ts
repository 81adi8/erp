
import { connectDB, sequelize } from '../database/sequelize';
import { InstitutionService } from '../modules/super-admin/services/institution.service';

const run = async () => {
    try {
        await connectDB();
        await sequelize.sync(); // Ensure public tables exist

        const service = new InstitutionService();
        // Ensure 'basic' plan exists
        const { Plan } = require('../database/models/public/Plan.model');
        const plan = await Plan.findOne({ where: { slug: 'basic' } });
        if (!plan) {
            console.log('Seeding basic plan...');
            await Plan.create({
                name: 'Basic Plan',
                slug: 'basic',
                description: 'Basic Plan',
                price_monthly: 0,
                price_yearly: 0
            });
        }
        const testSlug = 'test-school-' + Date.now();

        console.log(`Creating test institution with slug: ${testSlug}`);

        const result = await service.create({
            name: 'Test School',
            slug: testSlug,
            adminEmail: `admin-${testSlug}@example.com`,
            adminPassword: 'securePassword123',
            planSlug: 'basic'
        });

        console.log('Institution created successfully:', result.id);

        // Additional checks if possible
        // Check if schema exists logic is hard to check from here without raw query
        const [results] = await sequelize.query(`SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'tenant_${testSlug.replace(/-/g, '_')}'`);

        if (results.length > 0) {
            console.log('Schema confirmed created.');
        } else {
            console.error('Schema NOT found!');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};


run();
