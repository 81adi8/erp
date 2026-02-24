// import nodeDns from "node:dns";
// nodeDns.setDefaultResultOrder("ipv4first");

import app, { handleUnhandledRejections, initializeQueueAndEventSystems } from './app';
import { env } from './config/env';
import { connectRedis, disconnectRedis } from './config/redis';
import { assertKeycloakRuntimeConfig } from './config/keycloak.config';
import { loadEnv, validateEnvOrExit } from './config/env.validation';
import { PermissionConfigCache } from './core/cache/permission-config.cache';
import { eventController } from './core/events/event.controller';
import { queueManager } from './core/queue/QueueManager';
import { logger } from './core/utils/logger';
import { connectDB } from './database/sequelize';

const port = env.port;
const isProductionLike = env.nodeEnv === 'production' || env.nodeEnv === 'staging';

const initOrExit = async (step: string, initializer: () => Promise<void> | void): Promise<void> => {
    try {
        await initializer();
        logger.info(`${step} initialized`);
    } catch (error) {
        logger.error(`${step} initialization failed`, error);
        if (isProductionLike || env.envValidationMode === 'enforce') {
            process.exit(1);
        }
        throw error;
    }
};

const startServer = async () => {
    logger.info('Initializing server startup sequence...');

    // 0. Load + validate env before any infra starts
    loadEnv();
    validateEnvOrExit();

    // 1. Redis
    await initOrExit('Redis', async () => {
        await connectRedis();
    });

    // 2. Database
    await initOrExit('Database', async () => {
        await connectDB();
    });

    // 3. Keycloak runtime safety checks
    await initOrExit('Keycloak config', async () => {
        assertKeycloakRuntimeConfig();
    });

    // 4. Queue + event systems
    await initOrExit('Queue/Event systems', async () => {
        await initializeQueueAndEventSystems();
    });

    // 5. Permission cache
    await initOrExit('Permission config cache', async () => {
        await PermissionConfigCache.initialize();
    });

    const server = app.listen(port, () => {
        logger.info(`Server listening at http://localhost:${port}`);
        logger.info(`Environment: ${env.nodeEnv}`);
    });

    handleUnhandledRejections(server);

    const shutdown = async (signal: string) => {
        logger.info(`${signal} received. Shutting down gracefully...`);

        try {
            logger.info('Shutting down queue systems...');
            await queueManager.shutdown();
            await eventController.shutdown();
            logger.info('Queue systems shutdown complete');

            await disconnectRedis();

            server.close(() => {
                logger.info('Process terminated');
                process.exit(0);
            });
        } catch (error) {
            logger.error('Error during shutdown', error);
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer();
