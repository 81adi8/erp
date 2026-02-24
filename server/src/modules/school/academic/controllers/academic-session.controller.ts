import { Request, Response } from 'express';
import { academicSessionService, sessionManagementService } from '../services';
import { 
    CreateAcademicSessionDto, UpdateAcademicSessionDto, 
    CreateAcademicTermDto, UpdateAcademicTermDto, 
    CreateSessionHolidayDto, UpdateSessionHolidayDto,
    CreateMasterHolidayDto, UpdateMasterHolidayDto
} from '../dto/academic-session.dto';
import { LockSessionDto, BulkPromotionDto, CreateNextSessionDto } from '../dto/session-management.dto';
import { PaginationQueryDto } from '../dto/common.dto';
import { asyncHandler, validateDto, getInstitutionId, successResponse, paginatedResponse } from './utils';
import { AcademicError } from '../errors/academic.error';

class AcademicSessionController {
    /**
     * GET /academic-sessions
     */
    getAll = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await academicSessionService.getAll(schemaName, institutionId, req.query as PaginationQueryDto);
        return paginatedResponse(res, result);
    });

    /**
     * GET /academic-sessions/current
     */
    getCurrent = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await academicSessionService.getCurrent(schemaName, institutionId);
        return successResponse(res, result);
    });

    /**
     * GET /academic-sessions/:id
     */
    getById = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await academicSessionService.getById(schemaName, institutionId, req.params.id as string);
        return successResponse(res, result);
    });

    /**
     * POST /academic-sessions
     */
    create = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const userId = req.user?.userId;
        if (!userId) throw new AcademicError('User context missing', 'USER_REQUIRED', 401);
        const dto = await validateDto(CreateAcademicSessionDto, req.body);
        const result = await academicSessionService.create(schemaName, institutionId, userId, dto);
        return successResponse(res, result, 'Academic session created successfully', 201);
    });

    /**
     * PUT /academic-sessions/:id
     */
    update = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const userId = req.user?.userId;
        if (!userId) throw new AcademicError('User context missing', 'USER_REQUIRED', 401);
        const dto = await validateDto(UpdateAcademicSessionDto, req.body);
        const result = await academicSessionService.update(schemaName, institutionId, req.params.id as string, userId, dto);
        return successResponse(res, result);
    });

    /**
     * DELETE /academic-sessions/:id
     */
    delete = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await academicSessionService.delete(schemaName, institutionId, req.params.id as string);
        return successResponse(res, null, result.message);
    });

    // Terms
    addTerm = asyncHandler(async (req: Request, res: Response) => {
        const schemaName = req.tenant?.db_schema as string;
        const dto = await validateDto(CreateAcademicTermDto, req.body);
        const result = await academicSessionService.addTerm(schemaName, req.params.id as string, dto);
        return successResponse(res, result, 'Term added successfully', 201);
    });

    updateTerm = asyncHandler(async (req: Request, res: Response) => {
        const schemaName = req.tenant?.db_schema as string;
        const dto = await validateDto(UpdateAcademicTermDto, req.body);
        const result = await academicSessionService.updateTerm(schemaName, req.params.termId as string, dto);
        return successResponse(res, result);
    });

    deleteTerm = asyncHandler(async (req: Request, res: Response) => {
        const schemaName = req.tenant?.db_schema as string;
        await academicSessionService.deleteTerm(schemaName, req.params.termId as string);
        return successResponse(res, null);
    });

    // Holidays
    addHoliday = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const dto = await validateDto(CreateSessionHolidayDto, req.body);
        const result = await academicSessionService.addHoliday(schemaName, institutionId, req.params.id as string, dto);
        return successResponse(res, result, 'Holiday added successfully', 201);
    });

    updateHoliday = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const dto = await validateDto(UpdateSessionHolidayDto, req.body);
        const result = await academicSessionService.updateHoliday(schemaName, institutionId, req.params.holidayId as string, dto);
        return successResponse(res, result, 'Holiday updated successfully');
    });

    deleteHoliday = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        await academicSessionService.deleteHoliday(schemaName, institutionId, req.params.holidayId as string);
        return successResponse(res, null);
    });

    // ==================== MASTER HOLIDAYS ====================

    getAllMasterHolidays = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const result = await academicSessionService.getAllMasterHolidays(schemaName, institutionId);
        return successResponse(res, result);
    });

    addMasterHoliday = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const dto = await validateDto(CreateMasterHolidayDto, req.body);
        const result = await academicSessionService.addMasterHoliday(schemaName, institutionId, dto);
        return successResponse(res, result, 'Master Holiday added successfully', 201);
    });

    updateMasterHoliday = asyncHandler(async (req: Request, res: Response) => {
        const schemaName = req.tenant?.db_schema as string;
        const dto = await validateDto(UpdateMasterHolidayDto, req.body);
        const result = await academicSessionService.updateMasterHoliday(schemaName, req.params.holidayId as string, dto);
        return successResponse(res, result, 'Master Holiday updated successfully');
    });

    deleteMasterHoliday = asyncHandler(async (req: Request, res: Response) => {
        const schemaName = req.tenant?.db_schema as string;
        await academicSessionService.deleteMasterHoliday(schemaName, req.params.holidayId as string);
        return successResponse(res, null);
    });

    syncMasterHolidays = asyncHandler(async (req: Request, res: Response) => {
        const schemaName = req.tenant?.db_schema as string;
        const institutionId = getInstitutionId(req);
        await academicSessionService.syncSystemHolidays(schemaName, institutionId);
        return successResponse(res, null, 'System holidays synchronized successfully');
    });

    // ==================== SESSION MANAGEMENT ====================

    /**
     * POST /academic-sessions/:id/lock
     */
    lock = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const userId = req.user?.userId ?? '';
        const dto = await validateDto(LockSessionDto, req.body);
        const result = await sessionManagementService.lockSession(schemaName, institutionId, req.params.id as string, userId, dto);
        return successResponse(res, result);
    });

    /**
     * POST /academic-sessions/:id/unlock
     */
    unlock = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const userId = req.user?.userId ?? '';
        const dto = await validateDto(LockSessionDto, req.body);
        const result = await sessionManagementService.unlockSession(schemaName, institutionId, req.params.id as string, userId, dto, dto.reason);
        return successResponse(res, result);
    });

    /**
     * GET /academic-sessions/:id/lock-status
     */
    getLockStatus = asyncHandler(async (req: Request, res: Response) => {
        const schemaName = req.tenant?.db_schema as string;
        const result = await sessionManagementService.getSessionLockStatus(schemaName, req.params.id as string);
        return successResponse(res, result);
    });

    /**
     * POST /academic-sessions/promote
     */
    promote = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const userId = req.user?.userId ?? '';
        const dto = await validateDto(BulkPromotionDto, req.body);
        const result = await sessionManagementService.promoteStudents(
            schemaName,
            institutionId,
            userId,
            dto.fromSessionId,
            dto.toSessionId,
            dto.decisions
        );
        return successResponse(res, result);
    });

    /**
     * POST /academic-sessions/transition
     */
    transition = asyncHandler(async (req: Request, res: Response) => {
        const institutionId = getInstitutionId(req);
        const schemaName = req.tenant?.db_schema as string;
        const userId = req.user?.userId ?? '';
        const dto = await validateDto(CreateNextSessionDto, req.body);
        const result = await sessionManagementService.createNextSession(
            schemaName,
            institutionId,
            userId,
            dto.currentSessionId,
            {
                name: dto.name,
                code: dto.code,
                start_date: new Date(dto.start_date),
                end_date: new Date(dto.end_date)
            }
        );
        return successResponse(res, result, 'Session transition initiated', 201);
    });
}

export const academicSessionController = new AcademicSessionController();
