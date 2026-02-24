import { Institution } from '../../../database/models/public/Institution.model';
import { ApiError } from '../../../core/http/ApiError';
import { HttpStatus } from '../../../core/http/HttpStatus';
import { TenantService } from '../../tenant/services/tenant.service';
import { InstitutionType } from '../../../core/constants/tenant';

interface CreateInstitutionInput {
    name: string;
    slug?: string;
    adminEmail: string;
    adminPassword: string;
    planId?: string;
    subdomain: string;
    type?: InstitutionType | string;
}

export class InstitutionService {
    async create(data: CreateInstitutionInput) {
        // Extract required fields for full tenant creation
        const { name, slug, adminEmail, adminPassword, planId, subdomain, type = 'school' } = data;

        if (!name || !subdomain || !adminEmail || !adminPassword) {
            throw new ApiError(HttpStatus.BAD_REQUEST, 'Missing required fields: name, subdomain, adminEmail, adminPassword');
        }

        // Validate institution type
        const validTypes = Object.values(InstitutionType);
        if (!validTypes.some((validType) => validType === type)) {
            throw new ApiError(HttpStatus.BAD_REQUEST, `Invalid institution type: ${type}. Valid types: ${validTypes.join(', ')}`);
        }

        const tenantSlug = slug?.trim() || subdomain;

        // Use activation-gated provisioning only.
        // Tenant becomes active strictly after checkpoint verification.
        const { tenant, activation } = await TenantService.createTenantWithActivationGate(
            name,
            tenantSlug,
            subdomain,
            adminEmail,
            adminPassword,
            planId || 'basic',
            type as InstitutionType
        );

        if (!activation.success) {
            throw new ApiError(
                HttpStatus.UNPROCESSABLE_ENTITY,
                `Tenant provisioning failed activation gate: ${activation.failureReason || 'Unknown activation failure'}`
            );
        }

        return tenant;
    }

    async findAll() {
        return Institution.findAll();
    }

    async findById(id: string) {
        return Institution.findByPk(id);
    }

    async update(id: string, data: Partial<Institution>) {
        const institution = await Institution.findByPk(id);
        if (!institution) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Institution not found');
        }
        return institution.update(data);
    }

    // FIXED: Added updateStatus — frontend calls PATCH /institutions/:id/status
    async updateStatus(id: string, status: string) {
        const institution = await Institution.findByPk(id);
        if (!institution) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Institution not found');
        }
        return institution.update({ status });
    }

    // FIXED: Added delete (soft delete via is_active flag) — frontend calls DELETE /institutions/:id
    async delete(id: string) {
        const institution = await Institution.findByPk(id);
        if (!institution) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Institution not found');
        }
        // Soft delete: mark inactive rather than destroying the record
        await institution.update({ is_active: false });
        return { id, deleted: true };
    }

    // FIXED: Added getDashboardStats — frontend calls GET /dashboard/stats
    async getDashboardStats() {
        const [total, active] = await Promise.all([
            Institution.count(),
            Institution.count({ where: { is_active: true } }),
        ]);
        return {
            totalInstitutions: total,
            activeInstitutions: active,
            pendingApprovals: 0,   // placeholder — extend when approval workflow exists
            totalAdmins: 0,        // placeholder — extend when admin count query is added
            recentActivity: [],
        };
    }
}

