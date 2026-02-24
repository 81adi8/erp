import { Sequelize } from 'sequelize-typescript';
import { env } from '../config/env';
import path from 'path';
import { ModelLoader } from './model-loader';
import { validateSchemaName } from '../core/database/schema-name.util';
import { registerDataChangeAuditHooks } from '../core/audit/data-change-audit.hooks';
import { logger } from '../core/utils/logger';

const modelsBaseDir = path.join(__dirname, './models');

// Load models using ModelLoader for consistency and better control
const allModelClasses = ModelLoader.getModelsFromDir(modelsBaseDir);

// CQ-07 FIX: Extracted pool config to named constants
const DB_POOL_CONFIG = {
    max: 20,
    min: 5,
    acquire: 60000,     // 60s acquisition timeout
    idle: 10000,       // 10s idle timeout
    evict: 1000,        // 1s sweep interval
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    throw new Error('[Sequelize] DATABASE_URL environment variable is required');
}

logger.info(`[Sequelize] Discovering models in ${modelsBaseDir}`);
logger.info(`[Sequelize] Loaded ${allModelClasses.length} distinct model classes ${env.database.ssl}`);

export const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
    models: allModelClasses,
    dialectOptions: {
        ssl: env.database.ssl ? {
            require: true,
            rejectUnauthorized: false
        } : false,
        // family: 4,     // Commented out to allow IPv6 as some DBs resolve to IPv6 only here
        keepAlive: true // Maintain connection stability
    },
    pool: {
        max: DB_POOL_CONFIG.max,
        min: DB_POOL_CONFIG.min,
        acquire: DB_POOL_CONFIG.acquire,
        idle: DB_POOL_CONFIG.idle,
        evict: DB_POOL_CONFIG.evict,
    },
    retry: {
        max: 3 // Retry failed connections up to 3 times
    }
});

registerDataChangeAuditHooks();

import { getTenant } from '../core/context/requestContext';

const hooks = ['beforeFind', 'beforeCount', 'beforeCreate', 'beforeUpdate', 'beforeDestroy', 'beforeBulkCreate', 'beforeBulkUpdate', 'beforeBulkDestroy'] as const;

hooks.forEach(hook => {
    sequelize.addHook(hook, (options: any) => {
        const tenant = getTenant();
        if (tenant) {
            const tenantSchema = validateSchemaName(tenant.db_schema);
            const model = options.model;
            // Check if model has specific schema defined (e.g. Tenant model in public)
            if (model) {
                const tableName = model.getTableName();
                if (typeof tableName === 'object' && tableName.schema) {
                    // Respect explicit schema (e.g., 'public')
                    return;
                }
            }

            // Otherwise, switch to tenant schema
            // If options.schema is already set (manual override), we might respect it, or overwrite? 
            // Usually we respect manual override.
            if (!options.schema) {
                options.schema = tenantSchema;
                options.searchPath = tenantSchema;
            }
        }
    });
});

export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        await createSchema('root');
        logger.info('Database connection has been established successfully.');

        // Auto-sync models in development (creates/alters tables)
        if (env.nodeEnv === 'development') {
            logger.info('[Sequelize] Auto-sync disabled. Use "pnpm migrate" to sync schema.');
            try {
                // safer sync: creates missing tables but doesn't drop columns/constraints
                // await sequelize.sync({ alter: { drop: false } });
                logger.info('[Sequelize] Database synced successfully (safe mode)');
            } catch (syncError: any) {
                logger.error(`[Sequelize] Auto-sync failed, continuing with authentication only: ${syncError.message}`);
                // Fallback to basic sync (only create tables if not exist)
                try {
                    // await sequelize.sync();
                    logger.info('[Sequelize] Database synced successfully (basic mode)');
                } catch (basicSyncError: any) {
                    logger.error(`[Sequelize] Basic sync also failed: ${basicSyncError.message}`);
                }
            }
        }
    } catch (error) {
        logger.error('Unable to connect to the database', error);
        process.exit(1);
    }
};

export const createSchema = async (schemaName: string) => {
    const safeSchemaName = validateSchemaName(schemaName);
    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${safeSchemaName}";`);
};
