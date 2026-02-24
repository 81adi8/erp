import { Plan } from '../../../database/models/public/Plan.model';
import { Module } from '../../../database/models/public/Module.model';
import { Permission } from '../../../database/models/public/Permission.model';
import { ApiError } from '../../../core/http/ApiError';
import { HttpStatus } from '../../../core/http/HttpStatus';
import { nestItems } from '../../../core/utils/hierarchy.util';

interface PlanPayload {
    module_ids?: string[];
    permission_ids?: string[];
    [key: string]: unknown;
}

interface PlanWithAssociations {
    modules?: Module[];
    permissions?: Permission[];
    [key: string]: unknown;
}

type PlanWithSetters = Plan & {
    setModules: (ids: string[]) => Promise<void>;
    setPermissions: (ids: string[]) => Promise<void>;
};

export class PlanService {
    async findAll() {
        const plans = await Plan.findAll({
            include: [
                { model: Module, as: 'modules', through: { attributes: [] } },
                { model: Permission, as: 'permissions', through: { attributes: [] } }
            ]
        });

        return plans.map(plan => {
            const planJson = plan.toJSON() as PlanWithAssociations;
            return {
                ...planJson,
                modules: nestItems(planJson.modules || []),
            };
        });
    }

    async findById(id: string) {
        const plan = await Plan.findByPk(id, {
            include: [
                { model: Module, as: 'modules', through: { attributes: [] } },
                { model: Permission, as: 'permissions', through: { attributes: [] } }
            ]
        });
        if (!plan) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Plan not found');
        }

        const planJson = plan.toJSON() as PlanWithAssociations;
        return {
            ...planJson,
            modules: nestItems(planJson.modules || []),
        };
    }

    async create(data: PlanPayload) {
        const { module_ids, permission_ids, ...planData } = data;

        const plan = await Plan.create(planData);
        const planWithSetters = plan as PlanWithSetters;

        if (module_ids && module_ids.length > 0) {
            await planWithSetters.setModules(module_ids);
        }

        if (permission_ids && permission_ids.length > 0) {
            await planWithSetters.setPermissions(permission_ids);
        }

        return this.findById(plan.id);
    }

    async update(id: string, data: PlanPayload) {
        const plan = await Plan.findByPk(id);
        if (!plan) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Plan not found');
        }

        const { module_ids, permission_ids, ...planData } = data;
        await plan.update(planData);
        const planWithSetters = plan as PlanWithSetters;

        if (module_ids !== undefined) {
            await planWithSetters.setModules(module_ids);
        }

        if (permission_ids !== undefined) {
            await planWithSetters.setPermissions(permission_ids);
        }

        return this.findById(id);
    }

    async delete(id: string) {
        const plan = await Plan.findByPk(id);
        if (!plan) {
            throw new ApiError(HttpStatus.NOT_FOUND, 'Plan not found');
        }
        await plan.destroy();
        return { message: 'Plan deleted successfully' };
    }
}
