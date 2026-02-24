import { Op, Transaction } from 'sequelize';
import { Student } from '../../../../database/models/school/academics/student/Student.model';
import {
    ParentProfile,
    ParentRelationType,
} from '../../../../database/models/school/academics/student/ParentProfile.model';
import {
    StudentDocument,
    StudentDocumentType,
} from '../../../../database/models/school/academics/student/StudentDocument.model';
import {
    StudentParentLink,
} from '../../../../database/models/school/academics/student/StudentParent.model';
import { StudentEnrollment } from '../../../../database/models/school/academics/student/StudentEnrollment.model';
import {
    PromotionDecision,
    PromotionHistory,
} from '../../../../database/models/school/academics/student/PromotionHistory.model';
import type { TenantIdentity } from '../../../../core/tenant/tenant-identity';
import { TenantShadowTelemetry } from '../../../../core/tenant/tenant-shadow.telemetry';
import { ApiError } from '../../../../core/http/ApiError';

export interface AddStudentDocumentDTO {
    studentId: string;
    documentType: StudentDocumentType;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    uploadedBy: string;
    uploadedAt?: Date;
    remarks?: string;
}

export interface CreateParentProfileDTO {
    institutionId: string;
    firstName: string;
    lastName: string;
    phone: string;
    relation: ParentRelationType;
    alternatePhone?: string;
    email?: string;
    occupation?: string;
    userId?: string;
    isActive?: boolean;
}

export interface LinkParentToStudentDTO {
    institutionId: string;
    studentId: string;
    parentId: string;
    relation: string;
    isPrimary?: boolean;
}

export interface PromoteStudentDTO {
    institutionId: string;
    studentId: string;
    fromAcademicYearId: string;
    fromEnrollmentId: string;
    fromClassId: string;
    fromSectionId: string;
    action: PromotionDecision;
    promotedBy: string;
    promotedAt?: Date;
    toAcademicYearId?: string;
    toEnrollmentId?: string;
    toClassId?: string;
    toSectionId?: string;
    finalPercentage?: number;
    finalGrade?: string;
    resultStatus?: string;
    remarks?: string;
    compartmentSubjects?: string[];
    isAutomatic?: boolean;
    metadata?: Record<string, unknown>;
}

export interface CreateStudentDTO {
    userId: string;
    institutionId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    admissionNumber?: string;
    admissionDate?: Date;
    dateOfBirth?: string;
    gender?: string;
    bloodGroup?: string;
    religion?: string;
    caste?: string;
    category?: string;
    aadharNumber?: string;
    currentAddress?: string;
    permanentAddress?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;
    familyDetails?: Record<string, unknown>;
    previousSchoolDetails?: Record<string, unknown>;
    isTransportRequired?: boolean;
    isHostelRequired?: boolean;
    documentUrls?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    medicalHistory?: string;
    isActive?: boolean;
    academicYearId?: string;
    classId?: string;
    sectionId?: string;
    rollNumber?: string;
    remarks?: string;
}

export interface UpdateStudentDTO extends Partial<CreateStudentDTO> {}

export interface StudentFilters {
    classId?: string;
    sectionId?: string;
    academicYearId?: string;
    search?: string;
    isActive?: boolean;
}

export interface TransferCertificateLookup {
    studentId: string;
    transferCertificateNumber: string;
    enrollmentId: string;
    issueDate?: Date;
}

/**
 * Student Repository
 * 
 * MANDATORY: Requires TenantIdentity for all operations.
 * No fallback schema - fails closed if tenant not provided.
 */
export class StudentRepository {

    private tenant: TenantIdentity;

    constructor(tenant: TenantIdentity) {
        if (!tenant || !tenant.db_schema) {
            TenantShadowTelemetry.repoUnscopedWrite({
                repository: 'school.student.repository',
                operation: 'constructor',
                reason: 'tenant_or_schema_missing',
            });
            throw ApiError.internal('TENANT_SCOPE_VIOLATION: StudentRepository requires valid TenantIdentity');
        }
        this.tenant = tenant;
    }

    private getSchema(): string {
        return this.tenant.db_schema;
    }

    async create(dto: CreateStudentDTO, tx?: Transaction): Promise<Student> {
        return Student.schema(this.getSchema()).create({
            user_id: dto.userId,
            institution_id: dto.institutionId,
            admission_number: dto.admissionNumber,
            admission_date: dto.admissionDate || new Date(),
            date_of_birth: dto.dateOfBirth,
            gender: dto.gender,
            blood_group: dto.bloodGroup,
            religion: dto.religion,
            caste: dto.caste,
            category: dto.category,
            aadhar_number: dto.aadharNumber,
            phone: dto.phone,
            email: dto.email,
            current_address: dto.currentAddress,
            permanent_address: dto.permanentAddress,
            emergency_contact_name: dto.emergencyContactName,
            emergency_contact_phone: dto.emergencyContactPhone,
            emergency_contact_relation: dto.emergencyContactRelation,
            family_details: dto.familyDetails || {},
            previous_school_details: dto.previousSchoolDetails || {},
            is_transport_required: dto.isTransportRequired || false,
            is_hostel_required: dto.isHostelRequired || false,
            document_urls: dto.documentUrls || {},
            metadata: dto.metadata || {},
            medical_history: dto.medicalHistory,
            is_active: dto.isActive ?? true,
        }, { transaction: tx });
    }

    async findById(id: string): Promise<Student | null> {
        return Student.schema(this.getSchema()).findByPk(id);
    }

    async findByUserId(userId: string): Promise<Student | null> {
        return Student.schema(this.getSchema()).findOne({
            where: { user_id: userId }
        });
    }

    async findByAdmissionNumber(admissionNumber: string, institutionId?: string): Promise<Student | null> {
        const where: Record<string, unknown> = {
            admission_number: admissionNumber,
        };

        if (institutionId) {
            where.institution_id = institutionId;
        }

        return Student.schema(this.getSchema()).findOne({
            where,
        });
    }

    async findAll(filters: StudentFilters, query: { page?: number; limit?: number }) {
        const { page = 1, limit = 20 } = query;
        const offset = (page - 1) * limit;

        const where: Record<PropertyKey, unknown> = {
            institution_id: this.tenant.id,
        };

        if (filters.isActive !== undefined) {
            where.is_active = filters.isActive;
        }

        if (filters.search) {
            where[Op.or] = [
                { admission_number: { [Op.iLike]: `%${filters.search}%` } },
                { email: { [Op.iLike]: `%${filters.search}%` } },
                { phone: { [Op.iLike]: `%${filters.search}%` } },
            ];
        }

        return Student.schema(this.getSchema()).findAndCountAll({
            where,
            limit,
            offset,
            order: [['created_at', 'DESC']],
        });
    }

    /**
     * TASK-04: Search students by first_name or last_name (ILIKE)
     * STABILIZATION: Fixed - names are on User model, not Student model.
     * Joins with User to search by name.
     */
    async searchByName(query: string, limit: number = 20): Promise<Student[]> {
        const { User } = require('../../../../database/models/shared/core/User.model');
        
        return Student.schema(this.getSchema()).findAll({
            where: {
                institution_id: this.tenant.id,
                is_active: true,
            },
            include: [
                {
                    model: User.schema(this.getSchema()),
                    as: 'user',
                    where: {
                        [Op.or]: [
                            { first_name: { [Op.iLike]: `%${query}%` } },
                            { last_name: { [Op.iLike]: `%${query}%` } },
                        ],
                    },
                    attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
                    required: true, // INNER JOIN to filter by user name
                },
            ],
            limit,
            order: [['created_at', 'DESC']],
        });
    }

    async findWithUserAndEnrollment(id: string): Promise<Student | null> {
        const { User } = require('../../../../database/models/shared/core/User.model');
        const { StudentEnrollment } = require('../../../../database/models/school/academics/student/StudentEnrollment.model');

        return Student.schema(this.getSchema()).findOne({
            where: { id },
            include: [
                {
                    model: User.schema(this.getSchema()),
                    as: 'user',
                    attributes: ['id', 'first_name', 'last_name', 'email', 'phone'],
                },
                {
                    model: StudentEnrollment.schema(this.getSchema()),
                    as: 'enrollments',
                    order: [['created_at', 'DESC']],
                },
            ],
        });
    }

    async addDocument(dto: AddStudentDocumentDTO, tx?: Transaction): Promise<StudentDocument> {
        return StudentDocument.schema(this.getSchema()).create(
            {
                institution_id: this.tenant.id,
                student_id: dto.studentId,
                document_type: dto.documentType,
                file_name: dto.fileName,
                file_url: dto.fileUrl,
                file_size: dto.fileSize,
                uploaded_by: dto.uploadedBy,
                uploaded_at: dto.uploadedAt || new Date(),
                remarks: dto.remarks,
            },
            { transaction: tx }
        );
    }

    async getDocuments(studentId: string): Promise<StudentDocument[]> {
        return StudentDocument.schema(this.getSchema()).findAll({
            where: {
                institution_id: this.tenant.id,
                student_id: studentId,
            },
            order: [['uploaded_at', 'DESC']],
        });
    }

    async createParent(dto: CreateParentProfileDTO, tx?: Transaction): Promise<ParentProfile> {
        return ParentProfile.schema(this.getSchema()).create(
            {
                institution_id: dto.institutionId,
                user_id: dto.userId,
                first_name: dto.firstName,
                last_name: dto.lastName,
                phone: dto.phone,
                alternate_phone: dto.alternatePhone,
                email: dto.email,
                occupation: dto.occupation,
                relation: dto.relation,
                is_active: dto.isActive ?? true,
            },
            { transaction: tx }
        );
    }

    async getParentById(parentId: string): Promise<ParentProfile | null> {
        return ParentProfile.schema(this.getSchema()).findOne({
            where: {
                id: parentId,
                institution_id: this.tenant.id,
            },
        });
    }

    async getParentsByStudent(studentId: string): Promise<StudentParentLink[]> {
        return StudentParentLink.schema(this.getSchema()).findAll({
            where: {
                institution_id: this.tenant.id,
                student_id: studentId,
            },
            include: [
                {
                    model: ParentProfile.schema(this.getSchema()),
                    as: 'parent_profile',
                    required: true,
                },
            ],
            order: [
                ['is_primary', 'DESC'],
                ['created_at', 'ASC'],
            ],
        });
    }

    async linkParentToStudent(dto: LinkParentToStudentDTO, tx?: Transaction): Promise<StudentParentLink> {
        const existing = await StudentParentLink.schema(this.getSchema()).findOne({
            where: {
                institution_id: dto.institutionId,
                student_id: dto.studentId,
                parent_id: dto.parentId,
            },
            transaction: tx,
        });

        if (existing) {
            if (dto.isPrimary && !existing.is_primary) {
                await existing.update(
                    {
                        relation: dto.relation,
                        is_primary: true,
                    },
                    { transaction: tx }
                );
            }
            return existing;
        }

        return StudentParentLink.schema(this.getSchema()).create(
            {
                institution_id: dto.institutionId,
                student_id: dto.studentId,
                parent_id: dto.parentId,
                relation: dto.relation,
                is_primary: dto.isPrimary ?? false,
            },
            { transaction: tx }
        );
    }

    async setPrimaryContact(studentId: string, parentId: string, tx?: Transaction): Promise<void> {
        await StudentParentLink.schema(this.getSchema()).update(
            { is_primary: false },
            {
                where: {
                    institution_id: this.tenant.id,
                    student_id: studentId,
                },
                transaction: tx,
            }
        );

        const [affectedRows] = await StudentParentLink.schema(this.getSchema()).update(
            { is_primary: true },
            {
                where: {
                    institution_id: this.tenant.id,
                    student_id: studentId,
                    parent_id: parentId,
                },
                transaction: tx,
            }
        );

        if (!affectedRows) {
            throw ApiError.notFound('Parent link not found for this student');
        }
    }

    async recordPromotion(dto: PromoteStudentDTO, tx?: Transaction): Promise<PromotionHistory> {
        return PromotionHistory.schema(this.getSchema()).create(
            {
                institution_id: dto.institutionId,
                student_id: dto.studentId,
                from_session_id: dto.fromAcademicYearId,
                from_academic_year_id: dto.fromAcademicYearId,
                from_enrollment_id: dto.fromEnrollmentId,
                from_class_id: dto.fromClassId,
                from_section_id: dto.fromSectionId,
                to_session_id: dto.toAcademicYearId,
                to_academic_year_id: dto.toAcademicYearId,
                to_enrollment_id: dto.toEnrollmentId,
                to_class_id: dto.toClassId,
                to_section_id: dto.toSectionId,
                decision: dto.action,
                action: dto.action,
                decision_date: dto.promotedAt || new Date(),
                promoted_at: dto.promotedAt || new Date(),
                final_percentage: dto.finalPercentage,
                final_grade: dto.finalGrade,
                result_status: dto.resultStatus,
                remarks: dto.remarks,
                compartment_subjects: dto.compartmentSubjects || [],
                decided_by: dto.promotedBy,
                promoted_by: dto.promotedBy,
                is_automatic: dto.isAutomatic ?? false,
                metadata: dto.metadata || {},
            },
            { transaction: tx }
        );
    }

    async getPromotionHistory(studentId: string): Promise<PromotionHistory[]> {
        return PromotionHistory.schema(this.getSchema()).findAll({
            where: {
                institution_id: this.tenant.id,
                student_id: studentId,
            },
            order: [['decision_date', 'DESC']],
        });
    }

    async findTransferCertificateByStudent(studentId: string): Promise<TransferCertificateLookup | null> {
        const enrollment = await StudentEnrollment.schema(this.getSchema()).findOne({
            where: {
                institution_id: this.tenant.id,
                student_id: studentId,
                transfer_certificate_number: {
                    [Op.not]: null,
                },
            },
            order: [
                ['leaving_date', 'DESC'],
                ['updated_at', 'DESC'],
            ],
        });

        if (!enrollment || !enrollment.transfer_certificate_number) {
            return null;
        }

        return {
            studentId: enrollment.student_id,
            transferCertificateNumber: enrollment.transfer_certificate_number,
            enrollmentId: enrollment.id,
            issueDate: enrollment.leaving_date,
        };
    }

    async update(id: string, dto: UpdateStudentDTO, tx?: Transaction): Promise<Student | null> {
        const student = await this.findById(id);
        if (!student) return null;

        await student.update(dto, { transaction: tx });
        return student;
    }

    async delete(id: string, tx?: Transaction): Promise<boolean> {
        const student = await this.findById(id);
        if (!student) return false;

        await student.destroy({ transaction: tx });
        return true;
    }

    async softDelete(id: string, tx?: Transaction): Promise<Student | null> {
        const student = await this.findById(id);
        if (!student) return null;

        await student.update({ is_active: false }, { transaction: tx });
        return student;
    }
}
