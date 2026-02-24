import { Request, Response } from 'express';
import { timetableService, timetableGeneratorService } from '../services';
import { academicAdminService } from '../services/academic-admin.service';
import { asyncHandler, getInstitutionId, successResponse, errorResponse } from './utils';
import {
    ConflictCheckInput,
    CreateAcademicTimetableInput,
    UpdateAcademicTimetableInput
} from '../services/academic-admin.service';

class TimetableController {
    // ==================== Academic Timetable Admin (new flow) ====================

    /**
     * POST /academic/timetable/check-conflicts
     */
    checkAcademicConflicts = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const conflicts = await academicAdminService.checkTimetableConflicts(
            schemaName,
            institutionId,
            req.body as ConflictCheckInput
        );
        return successResponse(res, conflicts);
    });

    /**
     * POST /academic/timetable/periods
     */
    createAcademicPeriod = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const period = await academicAdminService.createTimetable(
            schemaName,
            institutionId,
            req.body as CreateAcademicTimetableInput
        );
        return successResponse(res, period, 'Timetable period created successfully', 201);
    });

    /**
     * PUT /academic/timetable/periods/:id
     */
    updateAcademicPeriod = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const period = await academicAdminService.updateTimetable(
            schemaName,
            institutionId,
            req.params.id as string,
            req.body as UpdateAcademicTimetableInput
        );
        return successResponse(res, period, 'Timetable period updated successfully');
    });

    /**
     * DELETE /academic/timetable/periods/:id
     */
    deleteAcademicPeriod = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await academicAdminService.deleteTimetable(schemaName, institutionId, req.params.id as string);
        return successResponse(res, result);
    });

    /**
     * GET /academic/timetable/class
     */
    getAcademicClassTimetable = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const data = await academicAdminService.getClassTimetable(
            schemaName,
            institutionId,
            req.query.academic_year_id as string,
            req.query.class_id as string,
            req.query.section_id as string
        );
        return successResponse(res, data);
    });

    /**
     * GET /academic/timetable/teacher
     */
    getAcademicTeacherTimetable = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const data = await academicAdminService.getTeacherTimetable(
            schemaName,
            institutionId,
            req.query.academic_year_id as string,
            req.query.teacher_id as string
        );
        return successResponse(res, data);
    });

    /**
     * POST /academic/timetable
     */
    addAcademicTimetablePeriod = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const period = await academicAdminService.createTimetable(
            schemaName,
            institutionId,
            req.body as CreateAcademicTimetableInput
        );
        return successResponse(res, period, 'Timetable period created successfully', 201);
    });

    /**
     * PUT /academic/timetable/:id
     */
    updateAcademicTimetablePeriod = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const period = await academicAdminService.updateTimetable(
            schemaName,
            institutionId,
            req.params.id as string,
            req.body as UpdateAcademicTimetableInput
        );
        return successResponse(res, period, 'Timetable period updated successfully');
    });

    /**
     * DELETE /academic/timetable/:id
     */
    deleteAcademicTimetablePeriod = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await academicAdminService.deleteTimetable(schemaName, institutionId, req.params.id as string);
        return successResponse(res, result);
    });

    /**
     * GET /academic/timetable/class/:classId/section/:sectionId
     */
    getAcademicClassTimetableByPath = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const data = await academicAdminService.getClassTimetable(
            schemaName,
            institutionId,
            req.query.academicYearId as string,
            req.params.classId as string,
            req.params.sectionId as string
        );
        return successResponse(res, data);
    });

    /**
     * GET /academic/timetable/teacher/:teacherId
     */
    getAcademicTeacherTimetableByPath = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const data = await academicAdminService.getTeacherTimetable(
            schemaName,
            institutionId,
            req.query.academicYearId as string,
            req.params.teacherId as string
        );
        return successResponse(res, data);
    });

    // ==================== Templates ====================

    /**
     * GET /timetable/templates
     */
    getTemplates = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const templates = await timetableService.getTemplates(schemaName, institutionId);
        return successResponse(res, templates);
    });

    /**
     * GET /timetable/templates/:id
     */
    getTemplateById = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const template = await timetableService.getTemplateById(schemaName, institutionId, req.params.id as string);
        return successResponse(res, template);
    });

    /**
     * POST /timetable/templates
     */
    createTemplate = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const template = await timetableService.createTemplate(schemaName, institutionId, req.body);
        return successResponse(res, template, 'Template created successfully', 201);
    });

    /**
     * PUT /timetable/templates/:id
     */
    updateTemplate = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const template = await timetableService.updateTemplate(schemaName, institutionId, req.params.id as string, req.body);
        return successResponse(res, template, 'Template updated successfully');
    });

    /**
     * DELETE /timetable/templates/:id
     */
    deleteTemplate = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await timetableService.deleteTemplate(schemaName, institutionId, req.params.id as string);
        return successResponse(res, result);
    });

    // ==================== Timetable View ====================

    /**
     * GET /timetable/sections/:sectionId
     * Get timetable for a section
     */
    getSectionTimetable = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const { sectionId } = req.params;
        const { sessionId } = req.query;

        if (!sessionId) {
            return errorResponse(res, 'Session ID is required', 400);
        }

        const timetable = await timetableService.getSectionTimetable(
            schemaName,
            institutionId,
            sectionId as string,
            sessionId as string
        );
        return successResponse(res, timetable);
    });

    /**
     * GET /timetable/teachers/:teacherId
     * Get timetable for a teacher
     */
    getTeacherTimetable = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const { teacherId } = req.params;
        const { sessionId } = req.query;

        if (!sessionId) {
            return errorResponse(res, 'Session ID is required', 400);
        }

        const slots = await timetableService.getTeacherTimetable(
            schemaName,
            institutionId,
            teacherId as string,
            sessionId as string
        );
        return successResponse(res, slots);
    });

    // ==================== Slot Management ====================

    /**
     * GET /timetable/slots
     * Get slots with optional filters
     */
    getSlots = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const { sessionId, sectionId, day_of_week } = req.query;

        if (!sessionId) {
            return errorResponse(res, 'Session ID is required', 400);
        }

        const slots = await timetableService.getSlots(
            schemaName,
            institutionId,
            sessionId as string,
            sectionId as string | undefined,
            day_of_week !== undefined ? Number(day_of_week) : undefined
        );
        return successResponse(res, slots);
    });

    /**
     * POST /timetable/slots
     */
    createSlot = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const slot = await timetableService.createSlot(schemaName, institutionId, req.body);
        return successResponse(res, slot, 'Slot created successfully', 201);
    });

    /**
     * PUT /timetable/slots/:id
     */
    updateSlot = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const slot = await timetableService.updateSlot(schemaName, institutionId, req.params.id as string, req.body);
        return successResponse(res, slot, 'Slot updated successfully');
    });

    /**
     * DELETE /timetable/slots/:id
     */
    deleteSlot = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await timetableService.deleteSlot(schemaName, institutionId, req.params.id as string);
        return successResponse(res, result);
    });

    /**
     * POST /timetable/slots/bulk
     * Bulk create slots for a section
     */
    bulkCreateSlots = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const slots = await timetableService.bulkCreateSlots(schemaName, institutionId, req.body);
        return successResponse(res, slots, `${slots.length} slots created successfully`, 201);
    });

    /**
     * POST /timetable/copy
     * Copy timetable from one session to another
     */
    copyTimetable = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const { sourceSessionId, targetSessionId, sectionId } = req.body;

        if (!sourceSessionId || !targetSessionId) {
            return errorResponse(res, 'Source and target session IDs are required', 400);
        }

        const result = await timetableService.copyTimetable(
            schemaName,
            institutionId,
            sourceSessionId,
            targetSessionId,
            sectionId
        );
        return successResponse(res, result, `Copied ${result.copiedCount} timetable slots`);
    });

    /**
     * POST /timetable/sections/:sectionId/generate
     */
    generateTimetable = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const { sectionId } = req.params;

        const result = await timetableGeneratorService.generate(schemaName, institutionId, {
            ...req.body,
            section_id: sectionId
        });

        return successResponse(res, result, 'Timetable generated successfully as Draft');
    });
}

export const timetableController = new TimetableController();
