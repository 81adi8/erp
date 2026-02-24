/**
 * Jest Global Teardown
 * 
 * Runs ONCE after all test files.
 * Drops test schemas and closes connections.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment first
dotenv.config({ path: path.join(__dirname, '.env.test') });

export default async function globalTeardown() {
  console.log('[Jest Global Teardown] Starting...');
  
  const { sequelize } = await import('./src/database/sequelize');
  const { disconnectRedis } = await import('./src/config/redis');
  
  try {
    // Test connection
    await sequelize.authenticate();
    
    // Drop test schemas
    const testSchema = process.env.DB_SCHEMA || 'test_schema_jest';
    await sequelize.query(`DROP SCHEMA IF EXISTS "${testSchema}" CASCADE`, { raw: true });
    console.log(`[Jest Global Teardown] Dropped schema: ${testSchema}`);
    
    // Drop tenant isolation test schemas
    await sequelize.query(`DROP SCHEMA IF EXISTS "test_tenant_a" CASCADE`);
    await sequelize.query(`DROP SCHEMA IF EXISTS "test_tenant_b" CASCADE`);
    console.log('[Jest Global Teardown] Dropped tenant test schemas');

    // Close connection
    await sequelize.close();
    await disconnectRedis();
    console.log('[Jest Global Teardown] Complete');
    
  } catch (error) {
    console.error('[Jest Global Teardown] Teardown error:', error);
  }
}
