import { Request, Response } from 'express';
import { subjectService } from '../services';
import { CreateSubjectDto, UpdateSubjectDto, AssignSubjectToClassDto, UpdateClassSubjectDto } from '../dto';
import { asyncHandler, validateDto, getInstitutionId, successResponse, paginatedResponse } from './utils';
import { PaginationQueryDto } from '../dto/common.dto';
import { CreateSubjectWithAcademicInput, UpdateSubjectWithAcademicInput } from '../services/curriculum/subject.service';

class SubjectController {
    /**
     * GET /subjects
     * Get all subjects with pagination
     */
    getAll = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await subjectService.getAll(schemaName, institutionId, req.query as PaginationQueryDto);
        return paginatedResponse(res, result);
    });

    /**
     * GET /academic/subjects
     * List subjects
     */
    listAcademic = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const subjects = await subjectService.list(schemaName, institutionId);
        return successResponse(res, subjects);
    });

    /**
     * GET /subjects/:id
     * Get subject by ID with chapters
     */
    getById = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const subject = await subjectService.getById(schemaName, institutionId, req.params.id as string);
        return successResponse(res, subject);
    });

    /**
     * POST /subjects
     * Create new subject
     */
    create = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const dto = await validateDto(CreateSubjectDto, req.body);
        const subject = await subjectService.create(schemaName, institutionId, dto);
        return successResponse(res, subject, 'Subject created successfully', 201);
    });

    /**
     * POST /academic/subjects
     * Create subject with marks validation
     */
    createAcademic = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const subject = await subjectService.createWithAcademic(
            schemaName,
            institutionId,
            req.body as CreateSubjectWithAcademicInput
        );
        return successResponse(res, subject, 'Subject created successfully', 201);
    });

    /**
     * PUT /subjects/:id
     * Update subject
     */
    update = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const dto = await validateDto(UpdateSubjectDto, req.body);
        const subject = await subjectService.update(schemaName, institutionId, req.params.id as string, dto);
        return successResponse(res, subject);
    });

    /**
     * PUT /academic/subjects/:id
     * Update subject with marks validation
     */
    updateAcademic = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const subject = await subjectService.updateWithAcademic(
            schemaName,
            institutionId,
            req.params.id as string,
            req.body as UpdateSubjectWithAcademicInput
        );
        return successResponse(res, subject);
    });

    /**
     * DELETE /subjects/:id
     * Delete subject
     */
    delete = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await subjectService.delete(schemaName, institutionId, req.params.id as string);
        return successResponse(res, null, result.message);
    });

    /**
     * DELETE /academic/subjects/:id
     * Delete subject with dependency safety checks
     */
    deleteAcademic = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await subjectService.deleteSafely(schemaName, institutionId, req.params.id as string);
        return successResponse(res, null, result.message);
    });

    // ==================== Class-Subject Assignments ====================

    /**
     * GET /classes/:classId/subjects
     * Get subjects assigned to a class
     */
    getClassSubjects = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const { academicYearId } = req.query;
        const assignments = await subjectService.getClassSubjects(
            schemaName,
            institutionId,
            req.params.classId as string,
            academicYearId as string
        );
        return successResponse(res, assignments);
    });

    /**
     * POST /classes/:classId/subjects
     * Assign subject to class
     */
    assignToClass = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const dto = await validateDto(AssignSubjectToClassDto, req.body);
        const assignment = await subjectService.assignToClass(schemaName, institutionId, req.params.classId as string, dto);
        return successResponse(res, assignment, 'Subject assigned to class successfully', 201);
    });

    /**
     * PUT /classes/:classId/subjects/:subjectId
     * Update class-subject assignment
     */
    updateClassSubject = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const dto = await validateDto(UpdateClassSubjectDto, req.body);
        const assignment = await subjectService.updateClassSubject(
            schemaName,
            institutionId,
            req.params.classId as string,
            req.params.subjectId as string,
            dto
        );
        return successResponse(res, assignment);
    });

    /**
     * DELETE /classes/:classId/subjects/:subjectId
     * Remove subject from class
     */
    removeFromClass = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await subjectService.removeFromClass(
            schemaName,
            institutionId,
            req.params.classId as string,
            req.params.subjectId as string
        );
        return successResponse(res, null, result.message);
    });

    /**
     * GET /academic/assignments/teacher/:teacherId
     */
    getTeacherAssignments = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const assignments = await subjectService.getTeacherAssignments(
            schemaName,
            institutionId,
            req.params.teacherId as string
        );
        return successResponse(res, assignments);
    });

    /**
     * GET /academic/assignments/section/:sectionId
     */
    getSectionAssignments = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const assignments = await subjectService.getSectionAssignments(
            schemaName,
            institutionId,
            req.params.sectionId as string
        );
        return successResponse(res, assignments);
    });
}

export const subjectController = new SubjectController();
