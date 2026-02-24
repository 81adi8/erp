import { Module } from '../../../database/models/public/Module.model';
import { Feature } from '../../../database/models/public/Feature.model';
import { Permission } from '../../../database/models/public/Permission.model';
import { ApiError } from '../../../core/http/ApiError';
import { HttpStatus } from '../../../core/http/HttpStatus';
import { refreshGlobalPermissions, getPermissionStats } from '../../../database/seeders/global-permissions.seeder';
import { CreationAttributes } from 'sequelize';

interface ModulePayload {
    slug: string;
    name: string;
    institution_type: string;
    icon?: string;
    description?: string;
    route_name?: string;
    parent_id?: string | null;
    is_default?: boolean;
    sort_order?: number;
    is_active?: boolean;
    route_active?: boolean;
    route_title?: string;
}

interface FeaturePayload {
    module_id?: string | null;
    slug: string;
    name: string;
    description?: string;
    icon?: string;
    route_name?: string;
    sort_order?: number;
    is_active?: boolean;
    route_active?: boolean;
    route_title?: string;
}

interface PermissionPayload {
    feature_id: string;
    action: string;
    key: string;
    icon?: string;
    description?: string;
    route_name?: string;
    is_active?: boolean;
    route_active?: boolean;
    route_title?: string;
}

export class AccessControlService {
    // Module Operations
    async findAllModules() {
        // Return root modules (no parent) with nested children, features, and permissions
        return Module.findAll({
            where: { parent_id: null }, // Only root modules
            include: [
                {
                    model: Feature,
                    as: 'features',
                    include: [{ model: Permission, as: 'permissions' }]
                },
                {
                    model: Module,
                    as: 'children',
                    include: [
                        {
                            model: Feature,
                            as: 'features',
                            include: [{ model: Permission, as: 'permissions' }]
                        },
                        {
                            model: Module,
                            as: 'children', // Support 3 levels of nesting
                            include: [
                                {
                                    model: Feature,
                                    as: 'features',
                                    include: [{ model: Permission, as: 'permissions' }]
                                }
                            ]
                        }
                    ]
                }
            ],
            order: [
                ['sort_order', 'ASC'],
                ['name', 'ASC']
            ]
        });
    }

    async createModule(data: ModulePayload) {
        // Convert empty parent_id to null for UUID compatibility
        if (data.parent_id === '') {
            data.parent_id = null;
        }
        return Module.create(data as unknown as CreationAttributes<Module>);
    }

    async updateModule(id: string, data: ModulePayload) {
        // Convert empty parent_id to null for UUID compatibility
        if (data.parent_id === '') {
            data.parent_id = null;
        }
        const module = await Module.findByPk(id);
        if (!module) throw new ApiError(HttpStatus.NOT_FOUND, 'Module not found');
        return module.update(data as Partial<Module>);
    }

    async deleteModule(id: string) {
        const module = await Module.findByPk(id, {
            include: [
                { 
                    model: Feature, 
                    as: 'features',
                    include: [{ model: Permission, as: 'permissions' }]
                },
                { 
                    model: Module, 
                    as: 'children',
                    include: [
                        { 
                            model: Feature, 
                            as: 'features',
                            include: [{ model: Permission, as: 'permissions' }]
                        }
                    ]
                }
            ]
        });
        
        if (!module) throw new ApiError(HttpStatus.NOT_FOUND, 'Module not found');
        
        // Recursively delete child modules first
        await this.deleteModuleRecursive(module);
        
        return { success: true, message: 'Module and all related data deleted successfully' };
    }

    /**
     * Recursively delete a module and all its children, features, and permissions
     */
    private async deleteModuleRecursive(module: Module) {
        // First, delete all child modules recursively
        if (module.children && module.children.length > 0) {
            for (const child of module.children) {
                // Fetch the full child with its associations
                const fullChild = await Module.findByPk(child.id, {
                    include: [
                        { 
                            model: Feature, 
                            as: 'features',
                            include: [{ model: Permission, as: 'permissions' }]
                        },
                        { model: Module, as: 'children' }
                    ]
                });
                if (fullChild) {
                    await this.deleteModuleRecursive(fullChild);
                }
            }
        }
        
        // Delete all features and their permissions
        if (module.features && module.features.length > 0) {
            for (const feature of module.features) {
                await this.deleteFeatureWithPermissions(feature);
            }
        }
        
        // Finally, delete the module itself
        await module.destroy();
    }

    /**
     * Delete a feature and all its permissions
     */
    private async deleteFeatureWithPermissions(feature: Feature) {
        // Delete all permissions first
        if (feature.permissions && feature.permissions.length > 0) {
            for (const permission of feature.permissions) {
                await permission.destroy();
            }
        }
        // Then delete the feature
        await feature.destroy();
    }

    // Feature Operations
    async findAllFeatures() {
        return Feature.findAll({ include: [Permission, Module] });
    }

    async createFeature(data: FeaturePayload) {
        // Convert empty module_id to null for UUID compatibility
        if (data.module_id === '') {
            data.module_id = null;
        }
        return Feature.create(data as unknown as CreationAttributes<Feature>);
    }

    async updateFeature(id: string, data: FeaturePayload) {
        // Convert empty module_id to null for UUID compatibility
        if (data.module_id === '') {
            data.module_id = null;
        }
        const feature = await Feature.findByPk(id);
        if (!feature) throw new ApiError(HttpStatus.NOT_FOUND, 'Feature not found');
        return feature.update(data as Partial<Feature>);
    }

    async deleteFeature(id: string) {
        const feature = await Feature.findByPk(id, {
            include: [{ model: Permission, as: 'permissions' }]
        });
        if (!feature) throw new ApiError(HttpStatus.NOT_FOUND, 'Feature not found');
        
        // Use the helper method to delete with permissions
        await this.deleteFeatureWithPermissions(feature);
        
        return { success: true, message: 'Feature and all related permissions deleted successfully' };
    }

    // Permission Operations
    async findAllPermissions() {
        return Permission.findAll({ include: [Feature] });
    }

    async createPermission(data: PermissionPayload) {
        return Permission.create(data as unknown as CreationAttributes<Permission>);
    }

    async updatePermission(id: string, data: PermissionPayload) {
        const permission = await Permission.findByPk(id);
        if (!permission) throw new ApiError(HttpStatus.NOT_FOUND, 'Permission not found');
        return permission.update(data as Partial<Permission>);
    }

    async deletePermission(id: string) {
        const permission = await Permission.findByPk(id);
        if (!permission) throw new ApiError(HttpStatus.NOT_FOUND, 'Permission not found');
        await permission.destroy();
        return { success: true };
    }

    // ============================================================================
    // REFRESH PERMISSIONS
    // ============================================================================

    /**
     * Refresh all permissions from the seeder
     * This will create new modules/features/permissions and update existing ones
     * without deleting any existing data
     */
    async refreshPermissions() {
        try {
            const result = await refreshGlobalPermissions();
            return {
                success: true,
                message: 'Permissions refreshed successfully',
                stats: result.stats
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, `Failed to refresh permissions: ${errorMessage}`);
        }
    }

    /**
     * Get permission statistics
     */
    async getStats() {
        try {
            const stats = await getPermissionStats();
            return {
                success: true,
                data: stats
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            throw new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, `Failed to get stats: ${errorMessage}`);
        }
    }
}
