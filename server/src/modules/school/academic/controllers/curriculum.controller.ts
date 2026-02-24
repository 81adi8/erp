import { Request, Response } from 'express';
import { curriculumService } from '../services';
import { CreateChapterDto, UpdateChapterDto, CreateTopicDto, UpdateTopicDto } from '../dto';
import { asyncHandler, validateDto, getInstitutionId, successResponse } from './utils';

class CurriculumController {
    // ==================== Chapters ====================

    /**
     * GET /subjects/:subjectId/chapters
     * Get all chapters for a subject
     */
    getChapters = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const chapters = await curriculumService.getChapters(schemaName, institutionId, req.params.subjectId as string);
        return successResponse(res, chapters);
    });

    /**
     * GET /chapters/:id
     * Get chapter by ID
     */
    getChapterById = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const chapter = await curriculumService.getChapterById(schemaName, institutionId, req.params.id as string);
        return successResponse(res, chapter);
    });

    /**
     * POST /chapters
     * Create new chapter
     */
    createChapter = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const dto = await validateDto(CreateChapterDto, req.body);
        const chapter = await curriculumService.createChapter(schemaName, institutionId, dto);
        return successResponse(res, chapter, 'Chapter created successfully', 201);
    });

    /**
     * PUT /chapters/:id
     * Update chapter
     */
    updateChapter = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const dto = await validateDto(UpdateChapterDto, req.body);
        const chapter = await curriculumService.updateChapter(schemaName, institutionId, req.params.id as string, dto);
        return successResponse(res, chapter);
    });

    /**
     * DELETE /chapters/:id
     * Delete chapter
     */
    deleteChapter = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await curriculumService.deleteChapter(schemaName, institutionId, req.params.id as string);
        return successResponse(res, null, result.message);
    });

    // ==================== Topics ====================

    /**
     * GET /chapters/:chapterId/topics
     * Get all topics for a chapter
     */
    getTopics = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const topics = await curriculumService.getTopics(schemaName, institutionId, req.params.chapterId as string);
        return successResponse(res, topics);
    });

    /**
     * GET /topics/:id
     * Get topic by ID
     */
    getTopicById = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const topic = await curriculumService.getTopicById(schemaName, institutionId, req.params.id as string);
        return successResponse(res, topic);
    });

    /**
     * POST /topics
     * Create new topic
     */
    createTopic = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const dto = await validateDto(CreateTopicDto, req.body);
        const topic = await curriculumService.createTopic(schemaName, institutionId, dto);
        return successResponse(res, topic, 'Topic created successfully', 201);
    });

    /**
     * PUT /topics/:id
     * Update topic
     */
    updateTopic = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const dto = await validateDto(UpdateTopicDto, req.body);
        const topic = await curriculumService.updateTopic(schemaName, institutionId, req.params.id as string, dto);
        return successResponse(res, topic);
    });

    /**
     * DELETE /topics/:id
     * Delete topic
     */
    deleteTopic = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await curriculumService.deleteTopic(schemaName, institutionId, req.params.id as string);
        return successResponse(res, null, result.message);
    });

    /**
     * PATCH /topics/:id/complete
     * Mark topic as completed
     */
    markTopicCompleted = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const { completed = true } = req.body;
        const topic = await curriculumService.markTopicCompleted(schemaName, institutionId, req.params.id as string, completed);
        return successResponse(res, topic);
    });
}

export const curriculumController = new CurriculumController();
