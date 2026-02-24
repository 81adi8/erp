import { ModelStatic, Model } from 'sequelize';
import { getTenant } from '../context/requestContext';

/**
 * Get a model bound to the current tenant's schema
 * Usage: const TenantUser = getTenantModel(User);
 *        const users = await TenantUser.findAll();
 */
export function getTenantModel<T extends Model>(
    ModelClass: ModelStatic<T>
): ModelStatic<T> {
    const tenant = getTenant();
    if (!tenant) {
        throw new Error('No tenant context found. Ensure tenant middleware is applied.');
    }
    return ModelClass.schema(tenant.db_schema) as ModelStatic<T>;
}

/**
 * Get multiple models bound to the current tenant's schema
 * Usage: const { User, Role } = getTenantModels({ User, Role });
 */
export function getTenantModels<T extends Record<string, ModelStatic<any>>>(
    models: T
): T {
    const tenant = getTenant();
    if (!tenant) {
        throw new Error('No tenant context found. Ensure tenant middleware is applied.');
    }

    const boundModels = {} as T;
    for (const [key, ModelClass] of Object.entries(models)) {
        (boundModels as any)[key] = ModelClass.schema(tenant.db_schema);
    }
    return boundModels;
}
