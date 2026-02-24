import { Request, Response, NextFunction } from 'express';
import { Institution } from '../../../database/models/public/Institution.model';
import { asyncHandler } from '../../../core/utils/asyncHandler';
import { AppError } from '../../../core/utils/error';
import { logger } from '../../../core/utils/logger';
import { isSchemaSynced, markSchemaSynced, syncTenantSchema, invalidateSchemaCache } from '../utils/tenant-schema-sync';

// ============================================================================
// CQ-03 FIX: Schema sync logic extracted to tenant-schema-sync.ts
// ============================================================================

/**
 * Verify tenant by subdomain and sync schema (optimized)
 * GET /v1/tenant/verify/:subdomain
 */
export const verifyTenant = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { subdomain } = req.params;

    if (!subdomain) {
        throw new AppError('Subdomain is required', 400);
    }

    // 1. Look up Institution by subdomain
    const tenant = await Institution.findOne({
        where: {
            sub_domain: subdomain,
            status: 'active'
        }
    });

    if (!tenant) {
        return res.status(404).json({
            success: false,
            tenant: null,
            message: `Institution with subdomain '${subdomain}' not found or inactive`
        });
    }

    // 2. Sync tenant schema (OPTIMIZED - only if not recently synced)
    try {
        const alreadySynced = await isSchemaSynced(tenant.db_schema);
        if (!alreadySynced) {
            await syncTenantSchema(tenant.db_schema);
            await markSchemaSynced(tenant.db_schema);
        }
    } catch (error) {
        logger.error('Schema sync error:', error);
        // Don't fail the request - tenant may still be usable
    }

    // 3. Return tenant info
    res.json({
        success: true,
        tenant: {
            id: tenant.id,
            subdomain: tenant.sub_domain,
            name: tenant.name,
            type: tenant.type,
            logoUrl: tenant.metadata?.logoUrl || null,
            primaryColor: tenant.metadata?.primaryColor || null,
            settings: {
                enabledModules: tenant.settings?.enabledModules || [],
                timezone: tenant.settings?.timezone || 'UTC',
                dateFormat: tenant.settings?.dateFormat || 'YYYY-MM-DD',
                currency: tenant.settings?.currency || 'INR',
                language: tenant.settings?.language || 'en'
            }
        }
    });
});

export { invalidateSchemaCache };
