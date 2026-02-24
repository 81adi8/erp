/**
 * Feature Repository
 * 
 * Manages feature definitions in public schema.
 * Features are structural and define permission groupings.
 */

import { Feature } from '../../../database/models/public/Feature.model';
import { Permission } from '../../../database/models/public/Permission.model';

export interface FeatureDTO {
  id: string;
  slug: string;
  name: string;
  moduleId: string;
  isActive: boolean;
  routeActive: boolean;
  routeName?: string;
  sortOrder: number;
}

export interface FeatureWithPermissionsDTO extends FeatureDTO {
  permissions: string[];
}

export class FeatureRepository {
  private extractPermissionKeys(feature: Feature): string[] {
    const featureWithPermissions = feature as Feature & { permissions?: Permission[] };
    return featureWithPermissions.permissions?.map((permission) => permission.key) ?? [];
  }
  
  /**
   * Get all active features
   */
  async getActiveFeatures(): Promise<FeatureDTO[]> {
    const features = await Feature.findAll({
      where: { is_active: true },
      order: [['sort_order', 'ASC']]
    });
    
    return features.map(f => this.mapToDTO(f));
  }

  /**
   * Get features by module
   */
  async getFeaturesByModule(moduleId: string): Promise<FeatureDTO[]> {
    const features = await Feature.findAll({
      where: { 
        module_id: moduleId,
        is_active: true 
      },
      order: [['sort_order', 'ASC']]
    });
    
    return features.map(f => this.mapToDTO(f));
  }

  /**
   * Get feature by slug
   */
  async getFeatureBySlug(slug: string): Promise<FeatureDTO | null> {
    const feature = await Feature.findOne({
      where: { slug }
    });
    
    if (!feature) return null;
    
    return this.mapToDTO(feature);
  }

  /**
   * Get feature with its permissions
   */
  async getFeatureWithPermissions(slug: string): Promise<FeatureWithPermissionsDTO | null> {
    const feature = await Feature.findOne({
      where: { slug },
      include: [{
        model: Permission,
        as: 'permissions'
      }]
    });
    
    if (!feature) return null;
    
    const dto = this.mapToDTO(feature);
    const permissions = this.extractPermissionKeys(feature);
    
    return {
      ...dto,
      permissions
    };
  }

  /**
   * Get all features with permissions
   */
  async getAllFeaturesWithPermissions(): Promise<FeatureWithPermissionsDTO[]> {
    const features = await Feature.findAll({
      where: { is_active: true },
      include: [{
        model: Permission,
        as: 'permissions'
      }],
      order: [['sort_order', 'ASC']]
    });
    
    return features.map(f => {
      const dto = this.mapToDTO(f);
      const permissions = this.extractPermissionKeys(f);
      
      return {
        ...dto,
        permissions
      };
    });
  }

  /**
   * Check if feature exists and is active
   */
  async isFeatureActive(slug: string): Promise<boolean> {
    const count = await Feature.count({
      where: { 
        slug,
        is_active: true 
      }
    });
    
    return count > 0;
  }

  /**
   * Get permissions for a feature
   */
  async getFeaturePermissions(slug: string): Promise<string[]> {
    const feature = await Feature.findOne({
      where: { slug },
      include: [{
        model: Permission,
        as: 'permissions'
      }]
    });
    
    if (!feature) return [];
    
    return this.extractPermissionKeys(feature);
  }

  /**
   * Map ORM to DTO
   */
  private mapToDTO(feature: Feature): FeatureDTO {
    return {
      id: feature.id,
      slug: feature.slug,
      name: feature.name,
      moduleId: feature.module_id,
      isActive: feature.is_active ?? true,
      routeActive: feature.route_active ?? true,
      routeName: feature.route_name ?? undefined,
      sortOrder: feature.sort_order ?? 0
    };
  }
}
