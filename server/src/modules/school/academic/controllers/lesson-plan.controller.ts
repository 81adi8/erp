import { Request, Response } from 'express';
import { lessonPlanService } from '../services';
import { CreateLessonPlanDto, UpdateLessonPlanDto, LessonPlanStatus, LessonPlanFilterDto } from '../dto';
import { asyncHandler, validateDto, getInstitutionId, successResponse, errorResponse } from './utils';

class LessonPlanController {
    /**
     * GET /lesson-plans
     * Get all lesson plans with filters
     */
    getAll = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const plans = await lessonPlanService.getAll(schemaName, institutionId, req.query as LessonPlanFilterDto);
        return successResponse(res, plans);
    });

    /**
     * GET /lesson-plans/upcoming
     * Get upcoming lesson plans
     */
    getUpcoming = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const days = parseInt(req.query.days as string) || 7;
        const plans = await lessonPlanService.getUpcoming(schemaName, institutionId, days);
        return successResponse(res, plans);
    });

    /**
     * GET /lesson-plans/:id
     * Get lesson plan by ID
     */
    getById = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const plan = await lessonPlanService.getById(schemaName, institutionId, req.params.id as string);
        return successResponse(res, plan);
    });

    /**
     * POST /lesson-plans
     * Create new lesson plan
     */
    create = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const dto = await validateDto(CreateLessonPlanDto, req.body);
        const plan = await lessonPlanService.create(schemaName, institutionId, dto);
        return successResponse(res, plan, 'Lesson plan created successfully', 201);
    });

    /**
     * PUT /lesson-plans/:id
     * Update lesson plan
     */
    update = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const dto = await validateDto(UpdateLessonPlanDto, req.body);
        const plan = await lessonPlanService.update(schemaName, institutionId, req.params.id as string, dto);
        return successResponse(res, plan);
    });

    /**
     * DELETE /lesson-plans/:id
     * Delete lesson plan
     */
    delete = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await lessonPlanService.delete(schemaName, institutionId, req.params.id as string);
        return successResponse(res, null, result.message);
    });

    /**
     * PATCH /lesson-plans/:id/status
     * Update lesson plan status
     */
    updateStatus = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const { status } = req.body;

        if (!Object.values(LessonPlanStatus).includes(status)) {
            return errorResponse(
                res,
                `Invalid status. Must be one of: ${Object.values(LessonPlanStatus).join(', ')}`,
                400
            );
        }

        const plan = await lessonPlanService.updateStatus(schemaName, institutionId, req.params.id as string, status);
        return successResponse(res, plan);
    });

    /**
     * GET /lesson-plans/teacher/:teacherId
     * Get lesson plans for a specific teacher
     */
    getByTeacher = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const plans = await lessonPlanService.getByTeacher(
            schemaName,
            institutionId,
            req.params.teacherId as string,
            req.query as LessonPlanFilterDto
        );
        return successResponse(res, plans);
    });
}

export const lessonPlanController = new LessonPlanController();
