import { Request, Response } from 'express';
import {
    academicAdminService,
    CreateAcademicYearInput,
    UpdateAcademicYearInput,
    CreateClassTeacherAssignmentInput,
    CreateSubjectTeacherAssignmentInput
} from '../services/academic-admin.service';
import { asyncHandler, getInstitutionId, successResponse } from './utils';

class AcademicAdminController {
    // ==================== Academic Years ====================
    getAcademicYears = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const years = await academicAdminService.getAcademicYears(schemaName, institutionId);
        return successResponse(res, years);
    });

    createAcademicYear = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const year = await academicAdminService.createAcademicYear(
            schemaName,
            institutionId,
            req.body as CreateAcademicYearInput
        );
        return successResponse(res, year, 'Academic year created successfully', 201);
    });

    updateAcademicYear = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const year = await academicAdminService.updateAcademicYear(
            schemaName,
            institutionId,
            req.params.id as string,
            req.body as UpdateAcademicYearInput
        );
        return successResponse(res, year, 'Academic year updated successfully');
    });

    deleteAcademicYear = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await academicAdminService.deleteAcademicYear(schemaName, institutionId, req.params.id as string);
        return successResponse(res, result);
    });

    setActiveAcademicYear = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const year = await academicAdminService.setActiveAcademicYear(schemaName, institutionId, req.params.id as string);
        return successResponse(res, year, 'Academic year activated successfully');
    });

    // ==================== Teacher Assignments ====================
    assignClassTeacher = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const assignment = await academicAdminService.assignClassTeacher(
            schemaName,
            institutionId,
            req.body as CreateClassTeacherAssignmentInput
        );
        return successResponse(res, assignment, 'Class teacher assigned successfully', 201);
    });

    assignSubjectTeacher = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const assignment = await academicAdminService.assignSubjectTeacher(
            schemaName,
            institutionId,
            req.body as CreateSubjectTeacherAssignmentInput
        );
        return successResponse(res, assignment, 'Subject teacher assigned successfully', 201);
    });

    getTeacherAssignments = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const assignments = await academicAdminService.getTeacherAssignments(
            schemaName,
            institutionId,
            req.params.teacherId as string
        );
        return successResponse(res, assignments);
    });

    getSectionAssignments = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const assignments = await academicAdminService.getSectionAssignments(
            schemaName,
            institutionId,
            req.params.sectionId as string
        );
        return successResponse(res, assignments);
    });
}

export const academicAdminController = new AcademicAdminController();
