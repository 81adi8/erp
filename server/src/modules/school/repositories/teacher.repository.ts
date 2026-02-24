import { Transaction } from 'sequelize';
import { Teacher } from '../../../database/models/school/academics/staff/Teacher.model';
import { TenantContext } from '../../tenant/types/tenant.types';

/**
 * Teacher Repository
 * 
 * Handles teacher profile data access in tenant schema.
 * Part of repository extraction from UserManagementService.
 */

export interface CreateTeacherProfileDTO {
    userId: string;
    institutionId: string;
    employeeId?: string;
    qualification?: string;
    designation?: string;
    specialization?: string;
    experienceYears?: number;
    dateOfJoining?: Date;
    phone?: string;
    email: string;
    address?: string;
    biography?: string;
    skills?: string[];
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    documents?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    isActive?: boolean;
}

export interface UpdateTeacherProfileDTO extends Partial<CreateTeacherProfileDTO> {}

export interface TeacherFilters {
    institutionId?: string;
    designation?: string;
    isActive?: boolean;
    search?: string;
}

export class TeacherRepository {
    private tenant: TenantContext;

    constructor(tenant: TenantContext) {
        this.tenant = tenant;
    }

    /**
     * Create teacher profile
     */
    async create(dto: CreateTeacherProfileDTO, tx?: Transaction): Promise<Teacher> {
        return Teacher.schema(this.tenant.db_schema).create({
            user_id: dto.userId,
            institution_id: dto.institutionId,
            employee_id: dto.employeeId,
            qualification: dto.qualification,
            designation: dto.designation,
            specialization: dto.specialization,
            experience_years: dto.experienceYears,
            date_of_joining: dto.dateOfJoining,
            phone: dto.phone,
            email: dto.email.toLowerCase(),
            address: dto.address,
            biography: dto.biography,
            skills: dto.skills || [],
            emergency_contact_name: dto.emergencyContactName,
            emergency_contact_phone: dto.emergencyContactPhone,
            documents: dto.documents || {},
            metadata: dto.metadata || {},
            is_active: dto.isActive ?? true,
        }, { transaction: tx });
    }

    /**
     * Find teacher by ID
     */
    async findById(teacherId: string): Promise<Teacher | null> {
        return Teacher.schema(this.tenant.db_schema).findByPk(teacherId);
    }

    /**
     * Find teacher by user ID
     */
    async findByUserId(userId: string): Promise<Teacher | null> {
        return Teacher.schema(this.tenant.db_schema).findOne({
            where: { user_id: userId }
        });
    }

    /**
     * Find teacher by email
     */
    async findByEmail(email: string): Promise<Teacher | null> {
        return Teacher.schema(this.tenant.db_schema).findOne({
            where: { email: email.toLowerCase() }
        });
    }

    /**
     * Find teacher by employee ID
     */
    async findByEmployeeId(employeeId: string): Promise<Teacher | null> {
        return Teacher.schema(this.tenant.db_schema).findOne({
            where: { employee_id: employeeId }
        });
    }

    /**
     * Update teacher profile
     */
    async update(teacherId: string, dto: UpdateTeacherProfileDTO, tx?: Transaction): Promise<void> {
        await Teacher.schema(this.tenant.db_schema).update({
            employee_id: dto.employeeId,
            qualification: dto.qualification,
            designation: dto.designation,
            specialization: dto.specialization,
            experience_years: dto.experienceYears,
            date_of_joining: dto.dateOfJoining,
            phone: dto.phone,
            email: dto.email?.toLowerCase(),
            address: dto.address,
            biography: dto.biography,
            skills: dto.skills,
            emergency_contact_name: dto.emergencyContactName,
            emergency_contact_phone: dto.emergencyContactPhone,
            documents: dto.documents,
            metadata: dto.metadata,
            is_active: dto.isActive,
        }, {
            where: { id: teacherId },
            transaction: tx
        });
    }

    /**
     * Update teacher by user ID
     */
    async updateByUserId(userId: string, dto: UpdateTeacherProfileDTO, tx?: Transaction): Promise<void> {
        await Teacher.schema(this.tenant.db_schema).update({
            employee_id: dto.employeeId,
            qualification: dto.qualification,
            designation: dto.designation,
            specialization: dto.specialization,
            experience_years: dto.experienceYears,
            date_of_joining: dto.dateOfJoining,
            phone: dto.phone,
            email: dto.email?.toLowerCase(),
            address: dto.address,
            biography: dto.biography,
            skills: dto.skills,
            emergency_contact_name: dto.emergencyContactName,
            emergency_contact_phone: dto.emergencyContactPhone,
            documents: dto.documents,
            metadata: dto.metadata,
            is_active: dto.isActive,
        }, {
            where: { user_id: userId },
            transaction: tx
        });
    }

    /**
     * Delete teacher profile
     */
    async delete(teacherId: string, tx?: Transaction): Promise<void> {
        await Teacher.schema(this.tenant.db_schema).destroy({
            where: { id: teacherId },
            transaction: tx
        });
    }

    /**
     * List teachers with filtering
     */
    async list(filters: TeacherFilters = {}, options: { page?: number; limit?: number } = {}) {
        const { page = 1, limit = 50 } = options;
        
        const where: Record<string, unknown> = {};
        if (filters.institutionId) where.institution_id = filters.institutionId;
        if (filters.designation) where.designation = filters.designation;
        if (filters.isActive !== undefined) where.is_active = filters.isActive;

        return Teacher.schema(this.tenant.db_schema).findAndCountAll({
            where,
            limit,
            offset: (page - 1) * limit,
            order: [['created_at', 'DESC']],
        });
    }
}

export default TeacherRepository;
