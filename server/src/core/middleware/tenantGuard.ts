import { Response, NextFunction } from 'express';
import { CustomRequest } from '../types/CustomRequest';
import { ApiError } from '../http/ApiError';
import { HttpStatus } from '../http/HttpStatus';
import { validateSchemaName } from '../database/schema-name.util';
import { TenantShadowTelemetry } from '../tenant/tenant-shadow.telemetry';
import { Institution } from '../../database/models/public/Institution.model';

export const tenantGuard = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
        return next(new ApiError(HttpStatus.UNAUTHORIZED, 'User not authenticated'));
    }

    // Super Admin can bypass tenant check
    if (user?.roles?.includes('SUPER_ADMIN') || user?.is_main) {
        // Optionally allow acting as specific tenant via header for Super Admins
        const tenantHeader = req.headers['x-institution-id'] as string;
        if (tenantHeader) {
            // MT-05 FIX: Validate x-institution-id header
            try {
                const safeSchema = validateSchemaName(tenantHeader);
                
                // Verify the institution exists in the database
                const institution = await Institution.findByPk(safeSchema);
                if (!institution) {
                    TenantShadowTelemetry.schemaViolation({
                        reason: 'super_admin_invalid_tenant_header',
                        provided_value: tenantHeader,
                        admin_user_id: user.userId,
                        route: req.originalUrl,
                    });
                    return next(new ApiError(HttpStatus.BAD_REQUEST, 'Invalid institution ID in header'));
                }

                // Log all super-admin cross-tenant accesses
                TenantShadowTelemetry.tenantAccess({
                    tenant_id: institution.id,
                    admin_user_id: user.userId,
                    access_type: 'super_admin_impersonation',
                    route: req.originalUrl,
                });

                req.institutionId = institution.id;
            } catch (error) {
                return next(new ApiError(HttpStatus.BAD_REQUEST, 'Invalid institution ID format'));
            }
        }
        return next();
    }

    if (!user.institutionId) {
        return next(new ApiError(HttpStatus.FORBIDDEN, 'User is not associated with any institution'));
    }

    req.institutionId = user.institutionId;
    next();
};
