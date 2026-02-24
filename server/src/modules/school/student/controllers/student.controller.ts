import { Response } from 'express';
import StudentService from '../services/student.service';
import { ApiRequest } from '../../../../core/types';
import { ApiError } from '../../../../core/http/ApiError';
import { requireTenantIdentity } from '../../../../core/context/requestContext';
import { asyncHandler } from '../../../../core/utils/asyncHandler';
import {
    AdmitStudentDTO,
    EnrollStudentDTO,
    BulkAdmitDTO,
    GetStudentsQueryDTO,
    StudentIdParamDTO,
    AddStudentDocumentDTO,
    CreateParentProfileDTO,
    LinkStudentParentDTO,
    SetPrimaryParentDTO,
    StudentPromotionDTO,
} from '../dto/student.dto';
import { CreateStudentDTO, UpdateStudentDTO } from '../repositories/student.repository';

const sendSuccess = (
    res: Response,
    data: unknown,
    message = 'Success',
    statusCode = 200,
    meta?: Record<string, unknown>
) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        errors: [],
        ...(meta ? { meta } : {}),
    });
};

/**
 * StudentController
 *
 * FIXED: All methods are now wrapped with asyncHandler so unhandled promise
 * rejections are caught and forwarded to the global error handler instead of
 * crashing the request silently.
 *
 * FIXED: admitStudent no longer sets userId to '' — it is omitted and the
 * service layer is responsible for creating/linking the user account.
 */
export class StudentController {
    private assertStudentBelongsToTenant = async (
        req: ApiRequest<unknown>,
        studentService: StudentService,
        studentId: string
    ): Promise<void> => {
        const tenantInstitutionId = req.tenant?.id;
        if (!tenantInstitutionId) {
            throw ApiError.unauthorized('Tenant context is required');
        }

        let student: { institution_id?: string } | null = null;
        try {
            student = await studentService.getStudentById(req.tenant!, studentId) as { institution_id?: string };
        } catch (error: unknown) {
            if (error instanceof Error && error.message === 'Student not found') {
                throw ApiError.notFound('Student not found');
            }
            throw error;
        }

        if (!student || student.institution_id !== tenantInstitutionId) {
            throw ApiError.forbidden('Forbidden: student does not belong to this institution');
        }
    };

    admitStudent = asyncHandler(async (req: ApiRequest<AdmitStudentDTO>, res: Response) => {
        const tenant = requireTenantIdentity();

        const dto: CreateStudentDTO = {
            userId: undefined,   // Service layer creates/links user account — not set by caller
            institutionId: tenant.id,
            email: req.body.email,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            phone: req.body.phone,
            admissionNumber: req.body.admissionNumber,
            admissionDate: req.body.admissionDate ? new Date(req.body.admissionDate) : undefined,
            dateOfBirth: req.body.dateOfBirth,
            gender: req.body.gender,
            bloodGroup: req.body.bloodGroup,
            religion: req.body.religion,
            caste: req.body.caste,
            category: req.body.category,
            aadharNumber: req.body.aadharNumber,
            currentAddress: req.body.currentAddress,
            permanentAddress: req.body.permanentAddress,
            emergencyContactName: req.body.emergencyContactName,
            emergencyContactPhone: req.body.emergencyContactPhone,
            emergencyContactRelation: req.body.emergencyContactRelation,
            familyDetails: req.body.familyDetails,
            previousSchoolDetails: req.body.previousSchoolDetails,
            isTransportRequired: req.body.isTransportRequired,
            isHostelRequired: req.body.isHostelRequired,
            medicalHistory: req.body.medicalHistory,
            academicYearId: req.body.academicYearId,
            classId: req.body.classId,
            sectionId: req.body.sectionId,
            rollNumber: req.body.rollNumber,
            remarks: req.body.remarks,
        };

        const studentService = new StudentService(tenant);
        const result = await studentService.admitStudent(
            req.tenant!,
            req.user?.userId,
            dto
        );

        return sendSuccess(res, result, 'Student admitted successfully', 201);
    });

    getStudents = asyncHandler(async (req: ApiRequest<unknown>, res: Response) => {
        const tenant = requireTenantIdentity();

        const filters = {
            search: req.query.search as string | undefined,
            classId: req.query.classId as string | undefined,
            sectionId: req.query.sectionId as string | undefined,
            academicYearId: req.query.academicYearId as string | undefined,
        };

        // PRODUCTION HARDENED: Pagination caps enforced (max 100)
        const query = {
            page: Math.min(Math.max(Number(req.query.page) || 1, 1), 10000),
            limit: Math.min(Math.max(Number(req.query.limit) || 20, 1), 100),
        };

        const studentService = new StudentService(tenant);
        const result = await studentService.getStudents(req.tenant!, filters, query);

        return sendSuccess(
            res,
            result.students,
            'Students fetched successfully',
            200,
            {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: result.totalPages,
            }
        );
    });

    getStudentById = asyncHandler(async (req: ApiRequest<unknown>, res: Response) => {
        const tenant = requireTenantIdentity();
        const studentId = req.params.id as string;

        const studentService = new StudentService(tenant);
        const student = await studentService.getStudentById(req.tenant!, studentId);

        if (!student) {
            throw ApiError.notFound('Student not found');
        }

        return sendSuccess(res, student, 'Student fetched successfully');
    });

    enrollStudent = asyncHandler(async (req: ApiRequest<EnrollStudentDTO>, res: Response) => {
        const tenant = requireTenantIdentity();

        const studentService = new StudentService(tenant);
        const result = await studentService.enrollStudent(req.tenant!, {
            studentId: req.body.studentId,
            academicYearId: req.body.academicYearId,
            classId: req.body.classId,
            sectionId: req.body.sectionId,
            rollNumber: req.body.rollNumber,
            remarks: req.body.remarks,
            isRepeater: req.body.isRepeater,
        });

        return sendSuccess(res, result, 'Student enrolled successfully');
    });

    bulkAdmitStudents = asyncHandler(async (req: ApiRequest<BulkAdmitDTO>, res: Response) => {
        const tenant = requireTenantIdentity();

        const studentsData: CreateStudentDTO[] = req.body.students.map((s: AdmitStudentDTO) => ({
            institutionId: tenant.id,
            email: s.email,
            firstName: s.firstName,
            lastName: s.lastName,
            phone: s.phone,
            admissionNumber: s.admissionNumber,
            academicYearId: s.academicYearId,
            classId: s.classId,
            sectionId: s.sectionId,
        }));

        const studentService = new StudentService(tenant);
        const result = await studentService.bulkAdmitStudents(
            req.tenant!,
            req.user?.userId,
            studentsData
        );

        return sendSuccess(res, result, 'Bulk admission processed');
    });

    // ── TASK-04: Restored CRUD methods ──────────────────────────────────────

    updateStudent = asyncHandler(async (req: ApiRequest<UpdateStudentDTO>, res: Response) => {
        const tenant = requireTenantIdentity();
        const studentId = req.params.id as string;

        const studentService = new StudentService(tenant);
        const updated = await studentService.updateStudent(req.tenant!, studentId, req.body);

        if (!updated) {
            throw ApiError.notFound('Student not found');
        }

        return sendSuccess(res, updated, 'Student updated successfully');
    });

    deleteStudent = asyncHandler(async (req: ApiRequest<unknown>, res: Response) => {
        const tenant = requireTenantIdentity();
        const studentId = req.params.id as string;

        const studentService = new StudentService(tenant);
        const deleted = await studentService.deleteStudent(req.tenant!, studentId);

        if (!deleted) {
            throw ApiError.notFound('Student not found');
        }

        return sendSuccess(res, null, 'Student deactivated successfully');
    });

    searchStudents = asyncHandler(async (req: ApiRequest<unknown>, res: Response) => {
        const tenant = requireTenantIdentity();
        // SEC-04: Use validated query from Zod schema (req.query is already validated)
        const query = (req.query.q || req.query.search || '') as string;
        const limit = Number(req.query.limit) || 20;

        const studentService = new StudentService(tenant);
        const results = await studentService.searchStudents(req.tenant!, query.trim(), limit);

        return sendSuccess(res, results, 'Students search completed', 200, {
            query,
            count: results.length,
        });
    });

    addStudentDocument = asyncHandler(async (req: ApiRequest<AddStudentDocumentDTO>, res: Response) => {
        const tenant = requireTenantIdentity();
        const studentId = req.params.id as string;

        const actorUserId = req.user?.userId;
        if (!actorUserId) {
            throw ApiError.unauthorized('Authentication required');
        }

        const studentService = new StudentService(tenant);
        await this.assertStudentBelongsToTenant(req, studentService, studentId);

        const document = await studentService.addStudentDocument(
            req.tenant!,
            studentId,
            actorUserId,
            {
                documentType: req.body.documentType,
                fileName: req.body.fileName,
                fileUrl: req.body.fileUrl,
                fileSize: req.body.fileSize,
                remarks: req.body.remarks,
            }
        );

        return sendSuccess(res, document, 'Student document added successfully', 201);
    });

    getStudentDocuments = asyncHandler(async (req: ApiRequest<unknown>, res: Response) => {
        const tenant = requireTenantIdentity();
        const studentId = req.params.id as string;

        const studentService = new StudentService(tenant);
        await this.assertStudentBelongsToTenant(req, studentService, studentId);

        const documents = await studentService.getStudentDocuments(req.tenant!, studentId);

        return sendSuccess(res, documents, 'Student documents fetched successfully');
    });

    createParentProfile = asyncHandler(async (req: ApiRequest<CreateParentProfileDTO>, res: Response) => {
        const tenant = requireTenantIdentity();
        const studentService = new StudentService(tenant);

        const parent = await studentService.createParentProfile(req.tenant!, {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            phone: req.body.phone,
            relation: req.body.relation,
            alternatePhone: req.body.alternatePhone,
            email: req.body.email,
            occupation: req.body.occupation,
            userId: req.body.userId,
            isActive: req.body.isActive,
        });

        return sendSuccess(res, parent, 'Parent profile created successfully', 201);
    });

    linkParentToStudent = asyncHandler(async (req: ApiRequest<LinkStudentParentDTO>, res: Response) => {
        const tenant = requireTenantIdentity();
        const studentService = new StudentService(tenant);

        const link = await studentService.linkParentToStudent(req.tenant!, {
            studentId: req.body.studentId,
            parentId: req.body.parentId,
            relation: req.body.relation,
            isPrimary: req.body.isPrimary,
        });

        return sendSuccess(res, link, 'Parent linked to student successfully', 201);
    });

    getStudentParents = asyncHandler(async (req: ApiRequest<unknown>, res: Response) => {
        const tenant = requireTenantIdentity();
        const studentId = req.params.id as string;

        const studentService = new StudentService(tenant);
        const parents = await studentService.getStudentParents(req.tenant!, studentId);

        return sendSuccess(res, parents, 'Student parents fetched successfully');
    });

    setPrimaryParent = asyncHandler(async (req: ApiRequest<SetPrimaryParentDTO>, res: Response) => {
        const tenant = requireTenantIdentity();
        const studentService = new StudentService(tenant);

        const result = await studentService.setPrimaryParentContact(
            req.tenant!,
            req.body.studentId,
            req.body.parentId
        );

        return sendSuccess(res, result, 'Primary parent contact updated successfully');
    });

    promoteStudent = asyncHandler(async (req: ApiRequest<StudentPromotionDTO>, res: Response) => {
        const tenant = requireTenantIdentity();
        const actorUserId = req.user?.userId;
        if (!actorUserId) {
            throw ApiError.unauthorized('Authentication required');
        }

        const studentService = new StudentService(tenant);
        const promotion = await studentService.promoteStudent(req.tenant!, actorUserId, {
            studentId: req.body.studentId,
            fromAcademicYearId: req.body.fromAcademicYearId,
            fromEnrollmentId: req.body.fromEnrollmentId,
            fromClassId: req.body.fromClassId,
            fromSectionId: req.body.fromSectionId,
            action: req.body.action,
            toAcademicYearId: req.body.toAcademicYearId,
            toEnrollmentId: req.body.toEnrollmentId,
            toClassId: req.body.toClassId,
            toSectionId: req.body.toSectionId,
            finalPercentage: req.body.finalPercentage,
            finalGrade: req.body.finalGrade,
            resultStatus: req.body.resultStatus,
            remarks: req.body.remarks,
            compartmentSubjects: req.body.compartmentSubjects,
            isAutomatic: req.body.isAutomatic,
            metadata: req.body.metadata,
        });

        return sendSuccess(res, promotion, 'Student promotion recorded successfully', 201);
    });

    getStudentPromotionHistory = asyncHandler(async (req: ApiRequest<unknown>, res: Response) => {
        const tenant = requireTenantIdentity();
        const studentId = req.params.id as string;

        const studentService = new StudentService(tenant);
        const history = await studentService.getStudentPromotionHistory(req.tenant!, studentId);

        return sendSuccess(res, history, 'Student promotion history fetched successfully');
    });

    getTransferCertificate = asyncHandler(async (req: ApiRequest<unknown>, res: Response) => {
        const tenant = requireTenantIdentity();
        const studentId = req.params.id as string;

        const studentService = new StudentService(tenant);
        await this.assertStudentBelongsToTenant(req, studentService, studentId);

        const tc = await studentService.getStudentTransferCertificate(req.tenant!, studentId);

        return sendSuccess(res, tc, 'Transfer certificate fetched successfully');
    });
}

export default new StudentController();
