import { Transaction } from 'sequelize';
import { Institution } from '../../../database/models/public/Institution.model';

/**
 * Institution Repository (Public Schema)
 * 
 * Handles institution data access in public schema.
 * Part of repository extraction from UserManagementService.
 * 
 * Institution is the bridge between tenant and plan/subscription.
 */

export interface CreateInstitutionDTO {
    name: string;
    slug: string;
    dbSchema: string;
    planId: string;
    realm?: string;
    type?: string;
    status?: string;
    metadata?: Record<string, unknown>;
}

export interface UpdateInstitutionDTO extends Partial<CreateInstitutionDTO> {}

export class InstitutionRepository {
    /**
     * Create institution
     */
    async create(dto: CreateInstitutionDTO, tx?: Transaction): Promise<Institution> {
        return Institution.create({
            name: dto.name,
            slug: dto.slug,
            db_schema: dto.dbSchema,
            plan_id: dto.planId,
            realm: dto.realm,
            type: dto.type || 'school',
            status: dto.status || 'active',
            metadata: dto.metadata || {},
        }, { transaction: tx });
    }

    /**
     * Find institution by ID
     */
    async findById(institutionId: string): Promise<Institution | null> {
        return Institution.findByPk(institutionId);
    }

    /**
     * Find institution by slug
     */
    async findBySlug(slug: string): Promise<Institution | null> {
        return Institution.findOne({ where: { slug } });
    }

    /**
     * Find institution by database schema
     * This is the primary lookup method for tenant resolution
     */
    async findBySchema(dbSchema: string): Promise<Institution | null> {
        return Institution.findOne({ where: { db_schema: dbSchema } });
    }

    /**
     * Find institution by realm
     */
    async findByRealm(realm: string): Promise<Institution | null> {
        return Institution.findOne({ where: { realm } });
    }

    /**
     * Get institution with plan info
     */
    async findWithPlan(institutionId: string): Promise<Institution | null> {
        return Institution.findByPk(institutionId, {
            include: ['plan']
        });
    }

    /**
     * Update institution
     */
    async update(institutionId: string, dto: UpdateInstitutionDTO, tx?: Transaction): Promise<void> {
        await Institution.update({
            name: dto.name,
            slug: dto.slug,
            db_schema: dto.dbSchema,
            plan_id: dto.planId,
            realm: dto.realm,
            type: dto.type,
            status: dto.status,
            metadata: dto.metadata,
        }, {
            where: { id: institutionId },
            transaction: tx
        });
    }

    /**
     * Update institution plan
     */
    async updatePlan(institutionId: string, planId: string, tx?: Transaction): Promise<void> {
        await Institution.update(
            { plan_id: planId },
            { where: { id: institutionId }, transaction: tx }
        );
    }

    /**
     * Delete institution
     */
    async delete(institutionId: string, tx?: Transaction): Promise<void> {
        await Institution.destroy({
            where: { id: institutionId },
            transaction: tx
        });
    }

    /**
     * List all institutions
     */
    async list(options: { status?: string; type?: string } = {}) {
        const where: Record<string, unknown> = {};
        if (options.status) where.status = options.status;
        if (options.type) where.type = options.type;

        return Institution.findAll({
            where,
            order: [['created_at', 'DESC']]
        });
    }

    /**
     * Check if slug exists
     */
    async slugExists(slug: string): Promise<boolean> {
        const count = await Institution.count({ where: { slug } });
        return count > 0;
    }

    /**
     * Check if schema exists
     */
    async schemaExists(dbSchema: string): Promise<boolean> {
        const count = await Institution.count({ where: { db_schema: dbSchema } });
        return count > 0;
    }
}

export default InstitutionRepository;
