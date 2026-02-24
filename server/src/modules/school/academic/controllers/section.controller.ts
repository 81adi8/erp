import { Request, Response } from 'express';
import { sectionService } from '../services';
import { CreateSectionDto, UpdateSectionDto } from '../dto';
import { asyncHandler, validateDto, getInstitutionId, successResponse, errorResponse } from './utils';
import { CreateSectionWithClassInput, UpdateSectionWithClassInput } from '../services/class/section.service';

class SectionController {
    /**
     * GET /sections
     * Get all sections, optionally filtered by classId query param
     */
    getAll = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const sections = await sectionService.getAll(schemaName, institutionId, req.query.classId as string);
        return successResponse(res, sections);
    });

    /**
     * GET /academic/sections
     * List sections (optionally filtered by class_id)
     */
    listAcademic = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const sections = await sectionService.getAll(schemaName, institutionId, req.query.class_id as string | undefined);
        return successResponse(res, sections);
    });

    /**
     * GET /sections/:id
     * Get section by ID
     */
    getById = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const section = await sectionService.getById(schemaName, institutionId, req.params.id as string);
        return successResponse(res, section);
    });

    /**
     * POST /classes/:classId/sections
     * Create new section under a class
     */
    create = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const { classId } = req.params;
        const dto = await validateDto(CreateSectionDto, req.body);
        const section = await sectionService.create(schemaName, institutionId, classId as string, dto);
        return successResponse(res, section, 'Section created successfully', 201);
    });

    /**
     * POST /academic/sections
     * Create section with class in payload
     */
    createAcademic = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const section = await sectionService.createWithClass(
            schemaName,
            institutionId,
            req.body as CreateSectionWithClassInput
        );
        return successResponse(res, section, 'Section created successfully', 201);
    });

    /**
     * POST /academic/classes/:classId/sections
     * Create section by class path
     */
    createByClassPath = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const payload: CreateSectionWithClassInput = {
            ...(req.body as CreateSectionWithClassInput),
            class_id: req.params.classId as string
        };
        const section = await sectionService.createWithClass(schemaName, institutionId, payload);
        return successResponse(res, section, 'Section created successfully', 201);
    });

    /**
     * PUT /academic/classes/:classId/sections/:sectionId
     * Update section by class+section path
     */
    updateByClassPath = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const payload: UpdateSectionWithClassInput = {
            ...(req.body as UpdateSectionWithClassInput),
            class_id: req.params.classId as string
        };
        const section = await sectionService.updateWithClass(
            schemaName,
            institutionId,
            req.params.sectionId as string,
            payload
        );
        return successResponse(res, section);
    });

    /**
     * PUT /sections/:id
     * Update section
     */
    update = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const dto = await validateDto(UpdateSectionDto, req.body);
        const section = await sectionService.update(schemaName, institutionId, req.params.id as string, dto);
        return successResponse(res, section);
    });

    /**
     * PUT /academic/sections/:id
     * Update section with safe class reassignment checks
     */
    updateAcademic = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const section = await sectionService.updateWithClass(
            schemaName,
            institutionId,
            req.params.id as string,
            req.body as UpdateSectionWithClassInput
        );
        return successResponse(res, section);
    });

    /**
     * DELETE /sections/:id
     * Delete section
     */
    delete = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await sectionService.delete(schemaName, institutionId, req.params.id as string);
        return successResponse(res, null, result.message);
    });

    /**
     * DELETE /academic/sections/:id
     * Delete section with enrollment safety checks
     */
    deleteAcademic = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await sectionService.deleteSafely(schemaName, institutionId, req.params.id as string);
        return successResponse(res, null, result.message);
    });

    /**
     * DELETE /academic/classes/:classId/sections/:sectionId
     * Delete section by class+section path
     */
    deleteByClassPath = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const section = await sectionService.getById(schemaName, institutionId, req.params.sectionId as string);
        if (section.class_id !== (req.params.classId as string)) {
            return errorResponse(res, 'Section does not belong to given class', 400);
        }
        const result = await sectionService.deleteSafely(schemaName, institutionId, req.params.sectionId as string);
        return successResponse(res, null, result.message);
    });

    /**
     * GET /classes/:classId/sections
     * Get sections by class ID
     */
    getByClassId = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const sections = await sectionService.getByClassId(schemaName, institutionId, req.params.classId as string);
        return successResponse(res, sections);
    });
}

export const sectionController = new SectionController();
