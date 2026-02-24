/**
 * Institution Repository
 * 
 * Manages institution/tenant metadata in public schema.
 * Used for plan ID lookup and tenant configuration.
 */

import { Institution } from '../../../database/models/public/Institution.model';

export interface InstitutionDTO {
  id: string;
  name: string;
  code: string;
  type: string;
  slug: string;
  subDomain?: string;
  dbSchema: string;
  planId: string;
  status: string;
  isActive: boolean;
  settings: Record<string, any>;
  maxUsers?: number;
  maxStudents?: number;
}

export class InstitutionRepository {
  
  /**
   * Get institution by ID
   */
  async findById(institutionId: string): Promise<InstitutionDTO | null> {
    const institution = await Institution.findByPk(institutionId);
    
    if (!institution) return null;
    
    return this.mapToDTO(institution);
  }

  /**
   * Get institution by slug
   */
  async findBySlug(slug: string): Promise<InstitutionDTO | null> {
    const institution = await Institution.findOne({
      where: { slug }
    });
    
    if (!institution) return null;
    
    return this.mapToDTO(institution);
  }

  /**
   * Get institution by subdomain
   */
  async findBySubDomain(subDomain: string): Promise<InstitutionDTO | null> {
    const institution = await Institution.findOne({
      where: { sub_domain: subDomain }
    });
    
    if (!institution) return null;
    
    return this.mapToDTO(institution);
  }

  /**
   * Get plan ID for institution
   */
  async getPlanId(institutionId: string): Promise<string | null> {
    const institution = await Institution.findByPk(institutionId, {
      attributes: ['plan_id']
    });
    
    return institution?.plan_id ?? null;
  }

  /**
   * Check if institution is active
   */
  async isActive(institutionId: string): Promise<boolean> {
    const institution = await Institution.findByPk(institutionId, {
      attributes: ['is_active', 'status']
    });
    
    if (!institution) return false;
    
    return institution.is_active && institution.status === 'active';
  }

  /**
   * Get all active institutions
   */
  async getAllActive(): Promise<InstitutionDTO[]> {
    const institutions = await Institution.findAll({
      where: { 
        is_active: true,
        status: 'active'
      }
    });
    
    return institutions.map(i => this.mapToDTO(i));
  }

  /**
   * Update institution plan
   */
  async updatePlan(institutionId: string, planId: string): Promise<void> {
    await Institution.update(
      { plan_id: planId },
      { where: { id: institutionId } }
    );
  }

  /**
   * Get institutions by plan
   */
  async getByPlan(planId: string): Promise<InstitutionDTO[]> {
    const institutions = await Institution.findAll({
      where: { plan_id: planId }
    });
    
    return institutions.map(i => this.mapToDTO(i));
  }

  /**
   * Map ORM to DTO
   */
  private mapToDTO(institution: Institution): InstitutionDTO {
    return {
      id: institution.id,
      name: institution.name,
      code: institution.code,
      type: institution.type,
      slug: institution.slug,
      subDomain: institution.sub_domain ?? undefined,
      dbSchema: institution.db_schema,
      planId: institution.plan_id,
      status: institution.status,
      isActive: institution.is_active ?? true,
      settings: institution.settings ?? {},
      maxUsers: institution.max_users ?? undefined,
      maxStudents: institution.max_students ?? undefined
    };
  }
}
