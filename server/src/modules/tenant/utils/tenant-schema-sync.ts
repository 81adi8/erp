import { redis } from '../../../config/redis';
import fs from 'fs';
import path from 'path';
import { logger } from '../../../core/utils/logger';

export interface SyncableModel {
    name: string;
    tableName?: string;
    schema: (schemaName: string) => { sync: (options: { alter: boolean }) => Promise<unknown> };
}

export function isSyncableModel(value: unknown): value is SyncableModel {
    if (!value || typeof value !== 'function') {
        return false;
    }
    const candidate = value as { tableName?: string; schema?: unknown };
    return typeof candidate.tableName === 'string' && typeof candidate.schema === 'function';
}

const syncedSchemasMemory = new Set<string>();
const SYNC_CACHE_PREFIX = 'tenant:schema:synced:';
const SYNC_TTL_SECONDS = 60 * 60 * 24;

export async function isSchemaSynced(schemaName: string): Promise<boolean> {
    if (syncedSchemasMemory.has(schemaName)) {
        return true;
    }

    try {
        const cached = await redis.get(`${SYNC_CACHE_PREFIX}${schemaName}`);
        if (cached) {
            syncedSchemasMemory.add(schemaName);
            return true;
        }
    } catch (error) {
        logger.warn('Redis cache check failed:', error);
    }

    return false;
}

export async function markSchemaSynced(schemaName: string): Promise<void> {
    syncedSchemasMemory.add(schemaName);

    try {
        await redis.set(`${SYNC_CACHE_PREFIX}${schemaName}`, Date.now().toString(), 'EX', SYNC_TTL_SECONDS);
    } catch (error) {
        logger.warn('Failed to update Redis cache:', error);
    }
}

export async function invalidateSchemaCache(schemaName: string): Promise<void> {
    syncedSchemasMemory.delete(schemaName);
    try {
        await redis.del(`${SYNC_CACHE_PREFIX}${schemaName}`);
    } catch (error) {
        logger.warn('Failed to invalidate Redis cache:', error);
    }
}

export async function syncTenantSchema(schemaName: string): Promise<void> {
    const modulesToSync = ['core', 'academics', 'attendance'];
    const modelsToSync: SyncableModel[] = [];

    const validComponents = ['core', 'academics', 'attendance', 'crm'];

    for (const moduleSlug of modulesToSync) {
        if (!validComponents.includes(moduleSlug)) continue;

        const modulePath = path.join(__dirname, `../../../../database/models/tenant/${moduleSlug}`);
        if (fs.existsSync(modulePath)) {
            fs.readdirSync(modulePath)
                .filter(file => file.endsWith('.model.ts') || file.endsWith('.model.js'))
                .forEach(file => {
                    const modelPath = path.join(modulePath, file);
                    const modelExports = require(modelPath);
                    Object.values(modelExports).forEach((exported) => {
                        if (isSyncableModel(exported)) {
                            modelsToSync.push(exported);
                        }
                    });
                });
        }
    }

    const modelOrder = [
        'Role', 'Permission', 'User', 'UserRole', 'RolePermission',
        'Session', 'RefreshToken', 'AuditLog', 'FailedLogin', 'School'
    ];

    modelsToSync.sort((a, b) => {
        const indexA = modelOrder.indexOf(a.name);
        const indexB = modelOrder.indexOf(b.name);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.name.localeCompare(b.name);
    });

    for (const ModelClass of modelsToSync) {
        try {
            await ModelClass.schema(schemaName).sync({ alter: false });
        } catch (error) {
            logger.warn(`[TenantSchemaSync] Schema sync warning for ${schemaName}::${ModelClass?.tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
