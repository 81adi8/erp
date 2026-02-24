import { Transaction, Op } from 'sequelize';
import { Plan } from '../../../database/models/public/Plan.model';
import { Permission } from '../../../database/models/public/Permission.model';
import { PlanPermission } from '../../../database/models/public/PlanPermission.model';

/**
 * Plan Repository (Public Schema)
 * 
 * Handles plan/subscription data access in public schema.
 * Part of repository extraction from UserManagementService.
 */

export interface CreatePlanDTO {
    name: string;
    slug: string;
    description?: string;
    price?: number;
    billingCycle?: string;
    maxUsers?: number;
    maxStudents?: number;
    maxStorage?: number;
    features?: string[];
    isActive?: boolean;
    metadata?: Record<string, unknown>;
}

export interface UpdatePlanDTO extends Partial<CreatePlanDTO> {}

export class PlanRepository {
    /**
     * Create plan
     */
    async create(dto: CreatePlanDTO, tx?: Transaction): Promise<Plan> {
        return Plan.create({
            name: dto.name,
            slug: dto.slug,
            description: dto.description,
            price: dto.price,
            billing_cycle: dto.billingCycle,
            max_users: dto.maxUsers,
            max_students: dto.maxStudents,
            max_storage: dto.maxStorage,
            features: dto.features || [],
            is_active: dto.isActive ?? true,
            metadata: dto.metadata || {},
        }, { transaction: tx });
    }

    /**
     * Find plan by ID
     */
    async findById(planId: string): Promise<Plan | null> {
        return Plan.findByPk(planId);
    }

    /**
     * Find plan by ID with permissions
     */
    async findByIdWithPermissions(planId: string): Promise<Plan | null> {
        return Plan.findByPk(planId, {
            include: ['permissions']
        });
    }

    /**
     * Find plan by slug
     */
    async findBySlug(slug: string): Promise<Plan | null> {
        return Plan.findOne({ where: { slug } });
    }

    /**
     * Get plan's allowed permission keys
     */
    async getPermissionKeys(planId: string): Promise<string[]> {
        const plan = await Plan.findByPk(planId, {
            include: ['permissions']
        });
        
        if (!plan || !plan.permissions) {
            return [];
        }

        return plan.permissions.map((permission) => permission.key);
    }

    /**
     * Update plan
     */
    async update(planId: string, dto: UpdatePlanDTO, tx?: Transaction): Promise<void> {
        await Plan.update({
            name: dto.name,
            slug: dto.slug,
            description: dto.description,
            price: dto.price,
            billing_cycle: dto.billingCycle,
            max_users: dto.maxUsers,
            max_students: dto.maxStudents,
            max_storage: dto.maxStorage,
            features: dto.features,
            is_active: dto.isActive,
            metadata: dto.metadata,
        }, {
            where: { id: planId },
            transaction: tx
        });
    }

    /**
     * Delete plan
     */
    async delete(planId: string, tx?: Transaction): Promise<void> {
        await Plan.destroy({
            where: { id: planId },
            transaction: tx
        });
    }

    /**
     * List active plans
     */
    async listActive(): Promise<Plan[]> {
        return Plan.findAll({
            where: { is_active: true },
            order: [['created_at', 'ASC']]
        });
    }

    /**
     * List all plans
     */
    async listAll(): Promise<Plan[]> {
        return Plan.findAll({
            order: [['created_at', 'ASC']]
        });
    }

    /**
     * Associate permissions with plan
     */
    async setPermissions(planId: string, permissionIds: string[], tx?: Transaction): Promise<void> {
        const plan = await Plan.findByPk(planId, { transaction: tx });
        if (plan) {
            await PlanPermission.destroy({
                where: { plan_id: planId },
                transaction: tx,
            });

            if (permissionIds.length > 0) {
                await PlanPermission.bulkCreate(
                    permissionIds.map((permissionId) => ({
                        plan_id: planId,
                        permission_id: permissionId,
                    })),
                    { transaction: tx }
                );
            }
        }
    }

    /**
     * Check if plan exists
     */
    async exists(planId: string): Promise<boolean> {
        const count = await Plan.count({ where: { id: planId } });
        return count > 0;
    }
}

export default PlanRepository;
