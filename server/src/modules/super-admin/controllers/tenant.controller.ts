import { logger } from '../../../core/utils/logger';

import { Request, Response } from 'express';
import { TenantService } from '../../tenant/services/tenant.service';
import { AppError } from '../../../core/utils/error';
import { InstitutionType } from '../../../core/constants/tenant';

export class TenantController {
    static async create(req: Request, res: Response) {
        try {
            logger.info('[TenantController] Received request to create tenant', {
                slug: req.body?.slug,
                subdomain: req.body?.subdomain,
            });

            const {
                name,
                slug,
                subdomain,
                adminEmail,
                adminPassword,
                planId,
                type,
            } = req.body;

            const tenantSlug = typeof slug === 'string' ? slug.trim() : '';
            const tenantSubdomain = typeof subdomain === 'string' && subdomain.trim().length > 0
                ? subdomain.trim()
                : tenantSlug;

            if (!name || !tenantSlug || !tenantSubdomain || !adminEmail || !adminPassword) {
                throw new AppError('Missing required fields', 400);
            }

            const institutionType = Object.values(InstitutionType).includes(type)
                ? (type as InstitutionType)
                : InstitutionType.SCHOOL;

            const { tenant, activation } = await TenantService.createTenantWithActivationGate(
                name,
                tenantSlug,
                tenantSubdomain,
                adminEmail,
                adminPassword,
                planId || 'basic',
                institutionType
            );

            if (!activation.success) {
                return res.status(422).json({
                    success: false,
                    message: activation.failureReason || 'Tenant provisioning failed activation gate',
                    data: {
                        tenantId: tenant.id,
                        status: activation.status,
                        checkpoints: activation.checkpoints,
                    }
                });
            }

            res.status(201).json({
                success: true,
                message: 'Tenant created successfully',
                data: tenant,
                activation,
            });
        } catch (error: unknown) {
            const statusCode = error instanceof AppError ? error.statusCode : 500;
            const message = error instanceof Error ? error.message : 'Error creating tenant';

            res.status(statusCode).json({
                success: false,
                message,
            });
        }
    }
}

