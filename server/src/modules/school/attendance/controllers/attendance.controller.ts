import { logger } from '../../../../core/utils/logger';
// ============================================================================
// ATTENDANCE CONTROLLER
// Handles HTTP requests and delegates to services
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { 
    createStudentAttendanceService,
    createAttendanceSettingsService,
    createLeaveService
} from '../services';
import { AttendanceError, AttendanceErrorCodes } from '../errors/attendance.error';
import { 
    MarkAttendanceDto,
    BulkMarkAttendanceDto,
    UpdateAttendanceDto,
    AttendanceQueryDto,
    DailyAttendanceQueryDto,
    ApplyLeaveDto,
    ApproveLeaveDto,
    RejectLeaveDto,
    LeaveQueryDto,
    CreateAttendanceSettingsDto,
    UpdateAttendanceSettingsDto,
    LockAttendanceDto
} from '../dto/attendance.dto';
import { AttendanceScope } from '../types/attendance.types';
import { ATTENDANCE_PERMISSIONS } from '../constants/attendance.constants';
import { sendError, sendPaginated, sendSuccess } from './response.utils';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate DTO and return validated instance
 */
async function validateDto<T extends object>(DtoClass: new () => T, data: unknown): Promise<T> {
    const dto = plainToInstance(DtoClass, data);
    const errors = await validate(dto);
    
    if (errors.length > 0) {
        const messages = errors
            .map((e) => Object.values(e.constraints || {}).join(', '))
            .join('; ');
        throw new AttendanceError(messages, AttendanceErrorCodes.VALIDATION_ERROR, 400);
    }
    
    return dto;
}

/**
 * Async handler wrapper for controllers
 */
const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch((error: unknown) => {
            if (error instanceof AttendanceError) {
                return sendError(
                    res,
                    error.message,
                    error.statusCode,
                    [error.message],
                    { code: error.code }
                );
            }
            
            logger.error('Attendance Controller Error:', error);
            const message = error instanceof Error ? error.message : 'An unexpected error occurred';
            return sendError(
                res,
                message,
                500,
                [message],
                { code: AttendanceErrorCodes.INTERNAL_ERROR }
            );
        });
    };
};

/**
 * Get tenant context from request
 */
function getTenantContext(req: Request): { schemaName: string; institutionId: string } {
    const schemaName = req.tenant?.db_schema;
    const institutionId = req.tenant?.id;

    if (!schemaName || !institutionId) {
        throw new AttendanceError(
            'Institution context required',
            AttendanceErrorCodes.INSTITUTION_REQUIRED,
            400
        );
    }

    return { schemaName, institutionId };
}

/**
 * Get current academic year from request
 */
function getAcademicYearId(req: Request): string {
    const academicYearId = req.academicSessionId || 
                          req.headers['x-academic-session-id'] as string ||
                          req.headers['x-academic-year-id'] as string || 
                          req.query.academicYearId as string ||
                          req.body?.academicYearId;

    if (!academicYearId) {
        throw new AttendanceError(
            'Academic year ID required',
            AttendanceErrorCodes.ACADEMIC_YEAR_REQUIRED,
            400
        );
    }

    return academicYearId;
}

/**
 * Get user ID from request
 */
function getUserId(req: Request): string {
    const userId = req.user?.userId;
    if (!userId) {
        throw new AttendanceError('User authentication required', 'AUTH_REQUIRED', 401);
    }
    return userId;
}

/**
 * Get user permissions from request
 */
function getUserPermissions(req: Request): string[] {
    return (req as Request & { user?: { permissions: string[] } }).user?.permissions || [];
}

// ============================================================================
// STUDENT ATTENDANCE CONTROLLER
// ============================================================================

class StudentAttendanceController {
    /**
     * GET /attendance/students
     * Get student attendance list with filters
     */
    getAttendance = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const query = await validateDto(AttendanceQueryDto, req.query);
        
        const service = createStudentAttendanceService(schemaName, institutionId);
        const result = await service.getAttendance(query);
        
        return sendPaginated(res, result);
    });

    /**
     * GET /attendance/students/daily
     * Get daily attendance for marking
     */
    getDailyAttendance = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const academicYearId = getAcademicYearId(req);
        const query = await validateDto(DailyAttendanceQueryDto, req.query);
        
        const service = createStudentAttendanceService(schemaName, institutionId);
        const result = await service.getDailyAttendance(academicYearId, query);
        
        return sendSuccess(res, result);
    });

    /**
     * POST /attendance/students/mark
     * Mark attendance for a single student
     */
    markAttendance = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const academicYearId = getAcademicYearId(req);
        const userId = getUserId(req);
        const dto = await validateDto(MarkAttendanceDto, req.body);
        
        const service = createStudentAttendanceService(schemaName, institutionId);
        const result = await service.markAttendance(academicYearId, dto, userId);
        
        return sendSuccess(res, result, 'Attendance marked successfully', 201);
    });

    /**
     * POST /attendance/students/bulk-mark
     * Bulk mark attendance for multiple students
     */
    bulkMarkAttendance = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const academicYearId = getAcademicYearId(req);
        const userId = getUserId(req);
        const dto = await validateDto(BulkMarkAttendanceDto, req.body);
        
        const service = createStudentAttendanceService(schemaName, institutionId);
        const result = await service.bulkMarkAttendance(academicYearId, dto, userId);
        
        return sendSuccess(res, result, 'Bulk attendance marked');
    });

    /**
     * PUT /attendance/students/:id
     * Update existing attendance
     */
    updateAttendance = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const userId = getUserId(req);
        const permissions = getUserPermissions(req);
        const dto = await validateDto(UpdateAttendanceDto, req.body);
        
        const service = createStudentAttendanceService(schemaName, institutionId);
        const result = await service.updateAttendance(req.params.id as string, dto, userId, permissions);
        
        return sendSuccess(res, result, 'Attendance updated');
    });

    /**
     * GET /attendance/students/:studentId/summary
     * Get attendance summary for a student
     */
    getStudentSummary = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const academicYearId = getAcademicYearId(req);
        const { studentId } = req.params;
        const { startDate, endDate } = req.query;
        
        const service = createStudentAttendanceService(schemaName, institutionId);
        const result = await service.getStudentSummary(
            studentId as string,
            academicYearId,
            startDate ? new Date(startDate as string) : undefined,
            endDate ? new Date(endDate as string) : undefined
        );
        
        return sendSuccess(res, result);
    });

    /**
     * POST /attendance/students/lock
     * Lock attendance for a date/section
     */
    lockAttendance = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const userId = getUserId(req);
        const dto = await validateDto(LockAttendanceDto, req.body);
        
        const service = createStudentAttendanceService(schemaName, institutionId);
        const result = await service.lockAttendance(dto.date, dto.sectionId!, userId);
        
        return sendSuccess(res, result, 'Attendance locked');
    });

    /**
     * GET /attendance/students/:id/audit
     * Get audit history for an attendance record
     */
    getAuditHistory = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        
        const service = createStudentAttendanceService(schemaName, institutionId);
        const result = await service.getAuditHistory(req.params.id as string);
        
        return sendSuccess(res, result);
    });
}

// ============================================================================
// SETTINGS CONTROLLER
// ============================================================================

class AttendanceSettingsController {
    /**
     * GET /attendance/settings
     * Get all attendance settings
     */
    getAllSettings = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const scope = req.query.scope as AttendanceScope | undefined;
        
        const service = createAttendanceSettingsService(schemaName, institutionId);
        const result = await service.getAllSettings(scope);
        
        return sendSuccess(res, result);
    });

    /**
     * GET /attendance/settings/effective
     * Get effective settings for a scope/class
     */
    getEffectiveSettings = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const scope = req.query.scope as AttendanceScope;
        const classId = req.query.classId as string | undefined;
        
        if (!scope) {
            throw new AttendanceError('Scope is required', AttendanceErrorCodes.VALIDATION_ERROR, 400);
        }
        
        const service = createAttendanceSettingsService(schemaName, institutionId);
        const result = await service.getEffectiveSettings(scope, classId);
        
        return sendSuccess(res, result);
    });

    /**
     * GET /attendance/settings/classes
     * Get class-wise settings overview
     */
    getClassSettingsOverview = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        
        const service = createAttendanceSettingsService(schemaName, institutionId);
        const result = await service.getClassSettingsOverview();
        
        return sendSuccess(res, result);
    });

    /**
     * POST /attendance/settings
     * Create or update settings
     */
    saveSettings = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const userId = getUserId(req);
        const dto = await validateDto(CreateAttendanceSettingsDto, req.body);
        
        const service = createAttendanceSettingsService(schemaName, institutionId);
        const result = await service.saveSettings(dto, userId);
        
        return sendSuccess(res, result, 'Settings saved');
    });

    /**
     * PUT /attendance/settings/class/:classId
     * Update class-specific settings
     */
    updateClassSettings = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const userId = getUserId(req);
        const dto = await validateDto(UpdateAttendanceSettingsDto, req.body);
        
        const service = createAttendanceSettingsService(schemaName, institutionId);
        const result = await service.updateClassSettings(req.params.classId as string, dto, userId);
        
        return sendSuccess(res, result, 'Class settings updated');
    });

    /**
     * DELETE /attendance/settings/class/:classId
     * Reset class settings to global defaults
     */
    resetClassSettings = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const userId = getUserId(req);
        
        const service = createAttendanceSettingsService(schemaName, institutionId);
        const result = await service.resetClassSettings(req.params.classId as string, userId);
        
        return sendSuccess(res, result, 'Class settings reset to defaults');
    });
}

// ============================================================================
// LEAVE CONTROLLER
// ============================================================================

class LeaveController {
    /**
     * GET /attendance/leaves
     * Get leave applications with filters
     */
    getLeaves = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const query = await validateDto(LeaveQueryDto, req.query);
        
        const service = createLeaveService(schemaName, institutionId);
        const result = await service.getLeaves(query);
        
        return sendPaginated(res, result);
    });

    /**
     * GET /attendance/leaves/:id
     * Get leave by ID
     */
    getLeaveById = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        
        const service = createLeaveService(schemaName, institutionId);
        const result = await service.getLeaveById(req.params.id as string);
        
        return sendSuccess(res, result);
    });

    /**
     * POST /attendance/leaves
     * Apply for leave
     */
    applyLeave = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const academicYearId = getAcademicYearId(req);
        const userId = getUserId(req);
        const dto = await validateDto(ApplyLeaveDto, req.body);
        
        const service = createLeaveService(schemaName, institutionId);
        const result = await service.applyLeave(academicYearId, dto, userId);
        
        return sendSuccess(res, result, 'Leave applied successfully', 201);
    });

    /**
     * POST /attendance/leaves/:id/approve
     * Approve leave application
     */
    approveLeave = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const userId = getUserId(req);
        const dto = await validateDto(ApproveLeaveDto, req.body);
        
        const service = createLeaveService(schemaName, institutionId);
        const result = await service.approveLeave(req.params.id as string, dto, userId);
        
        return sendSuccess(res, result, 'Leave approved');
    });

    /**
     * POST /attendance/leaves/:id/reject
     * Reject leave application
     */
    rejectLeave = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const userId = getUserId(req);
        const dto = await validateDto(RejectLeaveDto, req.body);
        
        const service = createLeaveService(schemaName, institutionId);
        const result = await service.rejectLeave(req.params.id as string, dto, userId);
        
        return sendSuccess(res, result, 'Leave rejected');
    });

    /**
     * POST /attendance/leaves/:id/cancel
     * Cancel leave application
     */
    cancelLeave = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const userId = getUserId(req);
        const { reason } = req.body;
        
        const service = createLeaveService(schemaName, institutionId);
        const result = await service.cancelLeave(req.params.id as string, reason || 'Cancelled by user', userId);
        
        return sendSuccess(res, result, 'Leave cancelled');
    });

    /**
     * GET /attendance/leaves/balance/:entityId
     * Get leave balance for an entity
     */
    getLeaveBalance = asyncHandler(async (req: Request, res: Response) => {
        const { schemaName, institutionId } = getTenantContext(req);
        const academicYearId = getAcademicYearId(req);
        const scope = req.query.scope as AttendanceScope || AttendanceScope.STUDENT;
        
        const service = createLeaveService(schemaName, institutionId);
        const result = await service.getLeaveBalance(scope, req.params.entityId as string, academicYearId);
        
        return sendSuccess(res, result);
    });
}

// ============================================================================
// EXPORT CONTROLLER INSTANCES
// ============================================================================

export const studentAttendanceController = new StudentAttendanceController();
export const attendanceSettingsController = new AttendanceSettingsController();
export const leaveController = new LeaveController();
