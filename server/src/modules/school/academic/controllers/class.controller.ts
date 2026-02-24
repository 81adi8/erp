import { Request, Response } from 'express';
import { classService } from '../services';
import { CreateClassDto, UpdateClassDto } from '../dto';
import { asyncHandler, validateDto, getInstitutionId, successResponse, paginatedResponse, errorResponse } from './utils';
import { PaginationQueryDto } from '../dto/common.dto';

class ClassController {
    /**
     * GET /classes
     * Get all classes with sections
     */
    getAll = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await classService.getAll(schemaName, institutionId, req.query as PaginationQueryDto);
        return paginatedResponse(res, result);
    });

    /**
     * GET /academic/classes
     * List classes (optionally by academic year)
     */
    listAcademic = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const classes = await classService.list(schemaName, institutionId, {
            academic_year_id: req.query.academic_year_id as string | undefined
        });
        return successResponse(res, classes);
    });

    /**
     * GET /classes/:id
     * Get class by ID with sections
     */
    getById = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const classObj = await classService.getById(schemaName, institutionId, req.params.id as string);
        return successResponse(res, classObj);
    });

    /**
     * POST /classes
     * Create new class
     */
    create = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const dto = await validateDto(CreateClassDto, req.body);
        const newClass = await classService.create(schemaName, institutionId, dto);
        return successResponse(res, newClass, 'Class created successfully', 201);
    });

    /**
     * POST /academic/classes
     * Create class with academic year
     */
    createAcademic = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const newClass = await classService.createWithAcademicYear(
            schemaName,
            institutionId,
            req.body as CreateClassDto & { academic_year_id: string }
        );
        return successResponse(res, newClass, 'Class created successfully', 201);
    });

    /**
     * PUT /classes/:id
     * Update class
     */
    update = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const dto = await validateDto(UpdateClassDto, req.body);
        const classObj = await classService.update(schemaName, institutionId, req.params.id as string, dto);
        return successResponse(res, classObj);
    });

    /**
     * PUT /academic/classes/:id
     * Update class with academic year safeguards
     */
    updateAcademic = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const classObj = await classService.updateWithAcademicYear(
            schemaName,
            institutionId,
            req.params.id as string,
            req.body as UpdateClassDto & { academic_year_id?: string }
        );
        return successResponse(res, classObj);
    });

    /**
     * DELETE /classes/:id
     * Delete class
     */
    delete = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await classService.delete(schemaName, institutionId, req.params.id as string);
        return successResponse(res, null, result.message);
    });

    /**
     * DELETE /academic/classes/:id
     * Delete class with enrollment safety checks
     */
    deleteAcademic = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await classService.deleteSafely(schemaName, institutionId, req.params.id as string);
        return successResponse(res, null, result.message);
    });

    /**
     * POST /classes/reorder
     * Reorder classes
     */
    reorder = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const { orderedIds } = req.body;

        if (!Array.isArray(orderedIds)) {
            return errorResponse(res, 'orderedIds must be an array', 400);
        }

        const result = await classService.reorder(schemaName, institutionId, orderedIds);
        return successResponse(res, result, 'Classes reordered successfully');
    });
}

export const classController = new ClassController();
