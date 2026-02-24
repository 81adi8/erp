import { Transaction, Op } from 'sequelize';
import { Permission } from '../../../database/models/public/Permission.model';

/**
 * Permission Repository (Public Schema)
 * 
 * Handles global permission catalog in public schema.
 * Part of repository extraction from UserManagementService.
 * 
 * Permissions are defined globally and referenced by key.
 * They can be grouped into plans via PlanPermission associations.
 */

export interface CreatePermissionDTO {
    key: string;
    name: string;
    description?: string;
    module?: string;
    category?: string;
    isActive?: boolean;
    metadata?: Record<string, unknown>;
}

export interface UpdatePermissionDTO extends Partial<CreatePermissionDTO> {}

export interface PermissionFilters {
    module?: string;
    category?: string;
    isActive?: boolean;
    search?: string;
}

export class PermissionRepository {
    /**
     * Create permission
     */
    async create(dto: CreatePermissionDTO, tx?: Transaction): Promise<Permission> {
        return Permission.create({
            key: dto.key,
            name: dto.name,
            description: dto.description,
            module: dto.module,
            category: dto.category,
            is_active: dto.isActive ?? true,
            metadata: dto.metadata || {},
        }, { transaction: tx });
    }

    /**
     * Find permission by ID
     */
    async findById(permissionId: string): Promise<Permission | null> {
        return Permission.findByPk(permissionId);
    }

    /**
     * Find permission by key
     */
    async findByKey(key: string): Promise<Permission | null> {
        return Permission.findOne({ where: { key } });
    }

    /**
     * Find permissions by keys
     */
    async findByKeys(keys: string[]): Promise<Permission[]> {
        if (keys.length === 0) return [];
        
        return Permission.findAll({
            where: { key: { [Op.in]: keys } }
        });
    }

    /**
     * Find or create permission by key
     */
    async findOrCreateByKey(
        key: string,
        defaults: Partial<CreatePermissionDTO>,
        tx?: Transaction
    ): Promise<[Permission, boolean]> {
        return Permission.findOrCreate({
            where: { key },
            defaults: {
                key,
                name: defaults.name || key,
                description: defaults.description,
                module: defaults.module,
                category: defaults.category,
                is_active: defaults.isActive ?? true,
                metadata: defaults.metadata || {},
            },
            transaction: tx
        });
    }

    /**
     * Update permission
     */
    async update(permissionId: string, dto: UpdatePermissionDTO, tx?: Transaction): Promise<void> {
        await Permission.update({
            key: dto.key,
            name: dto.name,
            description: dto.description,
            module: dto.module,
            category: dto.category,
            is_active: dto.isActive,
            metadata: dto.metadata,
        }, {
            where: { id: permissionId },
            transaction: tx
        });
    }

    /**
     * Delete permission
     */
    async delete(permissionId: string, tx?: Transaction): Promise<void> {
        await Permission.destroy({
            where: { id: permissionId },
            transaction: tx
        });
    }

    /**
     * List permissions with filtering
     */
    async list(filters: PermissionFilters = {}) {
        const where: Record<PropertyKey, unknown> = {};
        
        if (filters.module) where.module = filters.module;
        if (filters.category) where.category = filters.category;
        if (filters.isActive !== undefined) where.is_active = filters.isActive;
        if (filters.search) {
            where[Op.or] = [
                { key: { [Op.iLike]: `%${filters.search}%` } },
                { name: { [Op.iLike]: `%${filters.search}%` } },
                { description: { [Op.iLike]: `%${filters.search}%` } }
            ];
        }

        return Permission.findAll({
            where,
            order: [['module', 'ASC'], ['category', 'ASC'], ['name', 'ASC']]
        });
    }

    /**
     * Get all permission keys
     */
    async getAllKeys(): Promise<string[]> {
        const permissions = await Permission.findAll({
            where: { is_active: true },
            attributes: ['key']
        });
        return permissions.map(p => p.key);
    }

    /**
     * Get permissions by module
     */
    async getByModule(module: string): Promise<Permission[]> {
        return Permission.findAll({
            where: { module, is_active: true },
            order: [['category', 'ASC'], ['name', 'ASC']]
        });
    }

    /**
     * Check if permission exists by key
     */
    async exists(key: string): Promise<boolean> {
        const count = await Permission.count({ where: { key } });
        return count > 0;
    }

    /**
     * Bulk create permissions
     */
    async bulkCreate(
        permissions: CreatePermissionDTO[],
        tx?: Transaction
    ): Promise<Permission[]> {
        return Permission.bulkCreate(
            permissions.map(p => ({
                key: p.key,
                name: p.name,
                description: p.description,
                module: p.module,
                category: p.category,
                is_active: p.isActive ?? true,
                metadata: p.metadata || {},
            })),
            { transaction: tx }
        );
    }
}

export default PermissionRepository;
