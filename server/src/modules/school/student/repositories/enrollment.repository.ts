import { Transaction } from 'sequelize';
import { StudentEnrollment, StudentEnrollmentStatus } from '../../../../database/models/school/academics/student/StudentEnrollment.model';
import type { TenantIdentity } from '../../../../core/tenant/tenant-identity';
import { TenantShadowTelemetry } from '../../../../core/tenant/tenant-shadow.telemetry';
import { ApiError } from '../../../../core/http/ApiError';
import { retryDbOperation } from '../../../../core/resilience/retry.helper';

export interface CreateEnrollmentDTO {
    institutionId: string;
    studentId: string;
    academicYearId: string;
    classId: string;
    sectionId: string;
    rollNumber?: string;
    enrollmentDate?: Date;
    remarks?: string;
    isRepeater?: boolean;
}

export interface UpdateEnrollmentDTO {
    classId?: string;
    sectionId?: string;
    rollNumber?: string;
    status?: StudentEnrollmentStatus;
    remarks?: string;
}

/**
 * Enrollment Repository
 * 
 * MANDATORY: Requires TenantIdentity for all operations.
 * No fallback schema - fails closed if tenant not provided.
 */
export class EnrollmentRepository {

    private tenant: TenantIdentity;

    constructor(tenant: TenantIdentity) {
        if (!tenant || !tenant.db_schema) {
            TenantShadowTelemetry.repoUnscopedWrite({
                repository: 'school.enrollment.repository',
                operation: 'constructor',
                reason: 'tenant_or_schema_missing',
            });
            throw ApiError.internal('TENANT_SCOPE_VIOLATION: EnrollmentRepository requires valid TenantIdentity');
        }
        this.tenant = tenant;
    }

    private getSchema(): string {
        return this.tenant.db_schema;
    }

    /**
     * Create a new enrollment
     * PRODUCTION HARDENED: Pre-create check for duplicate + retry wrapping
     */
    async create(dto: CreateEnrollmentDTO, tx?: Transaction): Promise<StudentEnrollment> {
        // CRITICAL: Check for existing active enrollment in same session
        // Prevents double enrollment race condition
        const existing = await retryDbOperation(() =>
            StudentEnrollment.schema(this.getSchema()).findOne({
                where: {
                    student_id: dto.studentId,
                    academic_year_id: dto.academicYearId,
                    status: StudentEnrollmentStatus.ACTIVE
                },
                transaction: tx
            })
        );

        if (existing) {
            throw new ApiError(409, 'Student already has an active enrollment for this academic session');
        }

        return retryDbOperation(() =>
            StudentEnrollment.schema(this.getSchema()).create({
                institution_id: dto.institutionId,
                student_id: dto.studentId,
                academic_year_id: dto.academicYearId,
                class_id: dto.classId,
                section_id: dto.sectionId,
                roll_number: dto.rollNumber,
                enrollment_date: dto.enrollmentDate || new Date(),
                remarks: dto.remarks,
                is_repeater: dto.isRepeater || false,
                status: StudentEnrollmentStatus.ACTIVE,
            }, { transaction: tx })
        );
    }

    async findById(id: string): Promise<StudentEnrollment | null> {
        return StudentEnrollment.schema(this.getSchema()).findByPk(id);
    }

    async findByStudentAndYear(
        studentId: string,
        academicYearId: string
    ): Promise<StudentEnrollment | null> {
        return StudentEnrollment.schema(this.getSchema()).findOne({
            where: {
                student_id: studentId,
                academic_year_id: academicYearId,
            },
        });
    }

    async findActiveByStudent(studentId: string): Promise<StudentEnrollment | null> {
        return StudentEnrollment.schema(this.getSchema()).findOne({
            where: {
                student_id: studentId,
                status: StudentEnrollmentStatus.ACTIVE,
            },
        });
    }

    async findByStudent(studentId: string): Promise<StudentEnrollment[]> {
        return StudentEnrollment.schema(this.getSchema()).findAll({
            where: { student_id: studentId },
            order: [['created_at', 'DESC']],
        });
    }

    async deactivateAll(
        studentId: string,
        institutionId: string,
        tx?: Transaction
    ): Promise<number> {
        const [affectedCount] = await StudentEnrollment.schema(this.getSchema()).update(
            { status: StudentEnrollmentStatus.INACTIVE },
            {
                where: {
                    student_id: studentId,
                    status: StudentEnrollmentStatus.ACTIVE,
                    institution_id: institutionId,
                },
                transaction: tx,
            }
        );
        return affectedCount;
    }

    async update(
        id: string,
        dto: UpdateEnrollmentDTO,
        tx?: Transaction
    ): Promise<StudentEnrollment | null> {
        const enrollment = await this.findById(id);
        if (!enrollment) return null;

        await enrollment.update(dto, { transaction: tx });
        return enrollment;
    }

    async delete(id: string, tx?: Transaction): Promise<boolean> {
        const enrollment = await this.findById(id);
        if (!enrollment) return false;

        await enrollment.destroy({ transaction: tx });
        return true;
    }

    async findByClassAndSection(
        classId: string,
        sectionId: string,
        query: { page?: number; limit?: number }
    ) {
        const { page = 1, limit = 20 } = query;
        const offset = (page - 1) * limit;

        return StudentEnrollment.schema(this.getSchema()).findAndCountAll({
            where: {
                class_id: classId,
                section_id: sectionId,
                status: StudentEnrollmentStatus.ACTIVE,
            },
            limit,
            offset,
            order: [['roll_number', 'ASC']],
        });
    }
}