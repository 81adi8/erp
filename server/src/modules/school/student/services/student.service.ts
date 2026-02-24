import { sequelize } from '../../../../database/sequelize';
import type { TenantIdentity } from '../../../../core/tenant/tenant-identity';
import type { TenantContext } from '../../../tenant/types/tenant.types';
import { UserRepository, CreateUserDTO } from '../../../shared/repositories/user.repository';
import {
    AddStudentDocumentDTO,
    CreateParentProfileDTO,
    CreateStudentDTO,
    LinkParentToStudentDTO,
    PromoteStudentDTO,
    StudentRepository,
    UpdateStudentDTO,
} from '../repositories/student.repository';
import { EnrollmentRepository, CreateEnrollmentDTO } from '../repositories/enrollment.repository';
import { retryDbOperation } from '../../../../core/resilience/retry.helper';
import { ApiError } from '../../../../core/http/ApiError';
import { StudentDocumentType } from '../../../../database/models/school/academics/student/StudentDocument.model';
import { ParentRelationType } from '../../../../database/models/school/academics/student/ParentProfile.model';
import { PromotionDecision } from '../../../../database/models/school/academics/student/PromotionHistory.model';

export class StudentService {

    private tenant: TenantIdentity;
    private userRepo: UserRepository;
    private studentRepo: StudentRepository;
    private enrollmentRepo: EnrollmentRepository;

    constructor(tenant: TenantIdentity) {
        this.tenant = tenant;
        this.userRepo = new UserRepository(tenant);
        this.studentRepo = new StudentRepository(tenant);
        this.enrollmentRepo = new EnrollmentRepository(tenant);
    }

    async admitStudent(
        tenant: TenantContext,
        adminUserId: string | undefined,
        dto: CreateStudentDTO
    ) {
        const email = dto.email || '';
        const firstName = dto.firstName || '';
        const lastName = dto.lastName || '';

        // ── INTEGRITY: Duplicate admission number prevention (Layer 2 - Service Guard) ──
        // Check BEFORE transaction to fail fast on duplicates
        if (dto.admissionNumber) {
            const existingStudent = await retryDbOperation(() =>
                this.studentRepo.findByAdmissionNumber(dto.admissionNumber, dto.institutionId)
            );

            if (existingStudent?.is_active) {
                throw new ApiError(409, `Admission number '${dto.admissionNumber}' already exists. Please use a unique admission number.`);
            }
        }

        return sequelize.transaction(async (tx) => {
            const userDTO: CreateUserDTO = {
                email: email,
                firstName: firstName,
                lastName: lastName,
                phone: dto.phone,
                role: 'student',
                institutionId: dto.institutionId,
            };

            const user = await this.userRepo.create(userDTO, tx);

            const studentDto: CreateStudentDTO = {
                userId: user.id,
                institutionId: dto.institutionId,
                email: dto.email,
                phone: dto.phone,
                admissionNumber: dto.admissionNumber,
                admissionDate: dto.admissionDate,
                dateOfBirth: dto.dateOfBirth,
                gender: dto.gender,
                bloodGroup: dto.bloodGroup,
                religion: dto.religion,
                caste: dto.caste,
                category: dto.category,
                aadharNumber: dto.aadharNumber,
                currentAddress: dto.currentAddress,
                permanentAddress: dto.permanentAddress,
                emergencyContactName: dto.emergencyContactName,
                emergencyContactPhone: dto.emergencyContactPhone,
                emergencyContactRelation: dto.emergencyContactRelation,
                familyDetails: dto.familyDetails,
                previousSchoolDetails: dto.previousSchoolDetails,
                isTransportRequired: dto.isTransportRequired,
                isHostelRequired: dto.isHostelRequired,
                documentUrls: dto.documentUrls,
                metadata: dto.metadata,
                medicalHistory: dto.medicalHistory,
            };

            const student = await this.studentRepo.create(studentDto, tx);

            if (dto.academicYearId && dto.classId && dto.sectionId) {
                const enrollmentDto: CreateEnrollmentDTO = {
                    institutionId: dto.institutionId || '',
                    studentId: student.id,
                    academicYearId: dto.academicYearId,
                    classId: dto.classId,
                    sectionId: dto.sectionId,
                    rollNumber: dto.rollNumber,
                    enrollmentDate: dto.admissionDate,
                    remarks: dto.remarks,
                };

                await this.enrollmentRepo.create(enrollmentDto, tx);
            }

            return {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                },
                studentId: student.id,
            };
        });
    }

    async getStudents(
        tenant: TenantContext,
        filters: {
            classId?: string;
            sectionId?: string;
            academicYearId?: string;
            search?: string;
        },
        query: { page?: number; limit?: number }
    ) {
        // PRODUCTION HARDENED: Retry on transient DB failures
        const result = await retryDbOperation(() => 
            this.studentRepo.findAll(filters, query)
        );

        return {
            students: result.rows,
            total: result.count,
            page: query.page || 1,
            limit: query.limit || 20,
            totalPages: Math.ceil(result.count / (query.limit || 20)),
        };
    }

    async getStudentById(tenant: TenantContext, studentId: string) {
        // PRODUCTION HARDENED: Retry on transient DB failures
        const student = await retryDbOperation(() =>
            this.studentRepo.findWithUserAndEnrollment(studentId)
        );

        if (!student) {
            throw new Error('Student not found');
        }

        return student;
    }

    async enrollStudent(
        tenant: TenantContext,
        dto: {
            studentId: string;
            academicYearId: string;
            classId: string;
            sectionId: string;
            rollNumber?: string;
            remarks?: string;
            isRepeater?: boolean;
        }
    ) {
        return sequelize.transaction(async (tx) => {
            await this.enrollmentRepo.deactivateAll(
                dto.studentId,
                tenant.id,
                tx
            );

            const enrollment = await this.enrollmentRepo.create({
                institutionId: tenant.id,
                studentId: dto.studentId,
                academicYearId: dto.academicYearId,
                classId: dto.classId,
                sectionId: dto.sectionId,
                rollNumber: dto.rollNumber,
                remarks: dto.remarks,
                isRepeater: dto.isRepeater,
            }, tx);

            return enrollment;
        });
    }

    async bulkAdmitStudents(
        tenant: TenantContext,
        adminUserId: string | undefined,
        studentsData: CreateStudentDTO[]
    ) {
        type BatchAdmitSuccess = {
            success: true;
            email: string;
            row: number;
        };

        type BatchAdmitFailure = {
            success: false;
            email: string;
            row: number;
            error: string;
        };

        type BatchAdmitResult = BatchAdmitSuccess | BatchAdmitFailure;

        const results = {
            total: studentsData.length,
            success: 0,
            failed: 0,
            errors: [] as { row: number; email: string; error: string }[]
        };

        // TASK-09: Parallelize with batch size 10
        const BATCH_SIZE = 10;
        for (let i = 0; i < studentsData.length; i += BATCH_SIZE) {
            const batch = studentsData.slice(i, i + BATCH_SIZE);
            const batchResults: BatchAdmitResult[] = await Promise.all(
                batch.map(async (student, idx) => {
                    try {
                        await this.admitStudent(tenant, adminUserId, student);
                        return { success: true as const, email: student.email || 'unknown', row: i + idx + 1 };
                    } catch (error: unknown) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        return { success: false as const, email: student.email || 'unknown', row: i + idx + 1, error: errorMessage };
                    }
                })
            );

            for (const r of batchResults) {
                if (r.success) {
                    results.success++;
                } else {
                    results.failed++;
                    results.errors.push({
                        row: r.row,
                        email: r.email,
                        error: 'error' in r ? r.error : 'Unknown error',
                    });
                }
            }
        }

        return results;
    }

    // ── TASK-04: Restored CRUD service methods ───────────────────────────────

    async updateStudent(
        tenant: TenantContext,
        studentId: string,
        dto: UpdateStudentDTO
    ) {
        return this.studentRepo.update(studentId, dto);
    }

    async deleteStudent(
        tenant: TenantContext,
        studentId: string
    ): Promise<boolean> {
        const result = await this.studentRepo.softDelete(studentId);
        return result !== null;
    }

    async searchStudents(
        tenant: TenantContext,
        query: string,
        limit: number = 20
    ) {
        return this.studentRepo.searchByName(query, limit);
    }

    async addStudentDocument(
        tenant: TenantContext,
        studentId: string,
        actorUserId: string,
        input: {
            documentType: StudentDocumentType;
            fileName: string;
            fileUrl: string;
            fileSize?: number;
            remarks?: string;
        }
    ) {
        const student = await this.studentRepo.findById(studentId);
        if (!student || student.institution_id !== tenant.id) {
            throw ApiError.notFound('Student not found');
        }

        const dto: AddStudentDocumentDTO = {
            studentId,
            documentType: input.documentType,
            fileName: input.fileName,
            fileUrl: input.fileUrl,
            fileSize: input.fileSize,
            uploadedBy: actorUserId,
            remarks: input.remarks,
        };

        return sequelize.transaction(async (tx) => {
            return this.studentRepo.addDocument(dto, tx);
        });
    }

    async getStudentDocuments(tenant: TenantContext, studentId: string) {
        const student = await this.studentRepo.findById(studentId);
        if (!student || student.institution_id !== tenant.id) {
            throw ApiError.notFound('Student not found');
        }

        return this.studentRepo.getDocuments(studentId);
    }

    async createParentProfile(
        tenant: TenantContext,
        input: {
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
    ) {
        const dto: CreateParentProfileDTO = {
            institutionId: tenant.id,
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            relation: input.relation,
            alternatePhone: input.alternatePhone,
            email: input.email,
            occupation: input.occupation,
            userId: input.userId,
            isActive: input.isActive,
        };

        return sequelize.transaction(async (tx) => {
            return this.studentRepo.createParent(dto, tx);
        });
    }

    async linkParentToStudent(
        tenant: TenantContext,
        input: {
            studentId: string;
            parentId: string;
            relation: string;
            isPrimary?: boolean;
        }
    ) {
        const student = await this.studentRepo.findById(input.studentId);
        if (!student || student.institution_id !== tenant.id) {
            throw ApiError.notFound('Student not found');
        }

        const parent = await this.studentRepo.getParentById(input.parentId);
        if (!parent) {
            throw ApiError.notFound('Parent profile not found');
        }

        const dto: LinkParentToStudentDTO = {
            institutionId: tenant.id,
            studentId: input.studentId,
            parentId: input.parentId,
            relation: input.relation,
            isPrimary: input.isPrimary,
        };

        return sequelize.transaction(async (tx) => {
            const link = await this.studentRepo.linkParentToStudent(dto, tx);
            if (input.isPrimary) {
                await this.studentRepo.setPrimaryContact(input.studentId, input.parentId, tx);
            }
            return link;
        });
    }

    async setPrimaryParentContact(
        tenant: TenantContext,
        studentId: string,
        parentId: string
    ) {
        const student = await this.studentRepo.findById(studentId);
        if (!student || student.institution_id !== tenant.id) {
            throw ApiError.notFound('Student not found');
        }

        const parent = await this.studentRepo.getParentById(parentId);
        if (!parent) {
            throw ApiError.notFound('Parent profile not found');
        }

        return sequelize.transaction(async (tx) => {
            await this.studentRepo.setPrimaryContact(studentId, parentId, tx);
            return { studentId, parentId, isPrimary: true };
        });
    }

    async getStudentParents(tenant: TenantContext, studentId: string) {
        const student = await this.studentRepo.findById(studentId);
        if (!student || student.institution_id !== tenant.id) {
            throw ApiError.notFound('Student not found');
        }

        return this.studentRepo.getParentsByStudent(studentId);
    }

    async promoteStudent(
        tenant: TenantContext,
        actorUserId: string,
        input: {
            studentId: string;
            fromAcademicYearId: string;
            fromEnrollmentId: string;
            fromClassId: string;
            fromSectionId: string;
            action: PromotionDecision;
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
    ) {
        const student = await this.studentRepo.findById(input.studentId);
        if (!student || student.institution_id !== tenant.id) {
            throw ApiError.notFound('Student not found');
        }

        const dto: PromoteStudentDTO = {
            institutionId: tenant.id,
            studentId: input.studentId,
            fromAcademicYearId: input.fromAcademicYearId,
            fromEnrollmentId: input.fromEnrollmentId,
            fromClassId: input.fromClassId,
            fromSectionId: input.fromSectionId,
            action: input.action,
            promotedBy: actorUserId,
            promotedAt: new Date(),
            toAcademicYearId: input.toAcademicYearId,
            toEnrollmentId: input.toEnrollmentId,
            toClassId: input.toClassId,
            toSectionId: input.toSectionId,
            finalPercentage: input.finalPercentage,
            finalGrade: input.finalGrade,
            resultStatus: input.resultStatus,
            remarks: input.remarks,
            compartmentSubjects: input.compartmentSubjects,
            isAutomatic: input.isAutomatic,
            metadata: input.metadata,
        };

        return sequelize.transaction(async (tx) => {
            return this.studentRepo.recordPromotion(dto, tx);
        });
    }

    async getStudentPromotionHistory(tenant: TenantContext, studentId: string) {
        const student = await this.studentRepo.findById(studentId);
        if (!student || student.institution_id !== tenant.id) {
            throw ApiError.notFound('Student not found');
        }

        return this.studentRepo.getPromotionHistory(studentId);
    }

    async getStudentTransferCertificate(tenant: TenantContext, studentId: string) {
        const student = await this.studentRepo.findById(studentId);
        if (!student || student.institution_id !== tenant.id) {
            throw ApiError.notFound('Student not found');
        }

        return this.studentRepo.findTransferCertificateByStudent(studentId);
    }
}

export default StudentService;
