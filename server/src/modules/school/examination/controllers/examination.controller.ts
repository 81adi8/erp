import { Request, Response } from 'express';
import { examinationService, ExamStatus } from '../services';
import { asyncHandler, getInstitutionId, successResponse } from '../../academic/controllers/utils';

/**
 * Examination Controller (Tenant-Safe)
 * 
 * SECURITY PATCH: All endpoints now pass full TenantContext
 * - Extracts req.tenant and passes to service
 * - Service uses tenant.db_schema for schema isolation
 * - Institution ID filter preserved (tenant.id)
 * 
 * This ensures every query is bound to the correct tenant schema.
 */
class ExaminationController {
    // ==================== Exams ====================

    getExams = asyncHandler(async (req: Request, res: Response) => {
        // SECURITY: Pass full tenant context for schema isolation
        const tenant = req.tenant;
        if (!tenant) {
            throw new Error('Tenant context required');
        }
        
        const { sessionId, status, type } = req.query;
        
        const exams = await examinationService.getExams(
            tenant,
            sessionId as string,
            status as string,
            type as string
        );
        
        return successResponse(res, exams);
    });

    getExamById = asyncHandler(async (req: Request, res: Response) => {
        const tenant = req.tenant;
        if (!tenant) {
            throw new Error('Tenant context required');
        }
        
        const exam = await examinationService.getExamById(tenant, req.params.id as string);
        return successResponse(res, exam);
    });

    createExam = asyncHandler(async (req: Request, res: Response) => {
        const tenant = req.tenant;
        if (!tenant) {
            throw new Error('Tenant context required');
        }
        
        const exam = await examinationService.createExam(tenant, req.body);
        return successResponse(res, exam, 'Exam created successfully', 201);
    });

    updateExam = asyncHandler(async (req: Request, res: Response) => {
        const tenant = req.tenant;
        if (!tenant) {
            throw new Error('Tenant context required');
        }
        
        const exam = await examinationService.updateExam(tenant, req.params.id as string, req.body);
        return successResponse(res, exam, 'Exam updated successfully');
    });

    updateExamStatus = asyncHandler(async (req: Request, res: Response) => {
        const tenant = req.tenant;
        if (!tenant) {
            throw new Error('Tenant context required');
        }
        
        const { status } = req.body;
        const exam = await examinationService.updateExamStatus(tenant, req.params.id as string, status as ExamStatus);
        return successResponse(res, exam, 'Exam status updated');
    });

    deleteExam = asyncHandler(async (req: Request, res: Response) => {
        const tenant = req.tenant;
        if (!tenant) {
            throw new Error('Tenant context required');
        }
        
        const result = await examinationService.deleteExam(tenant, req.params.id as string);
        return successResponse(res, result);
    });

    // ==================== Schedules ====================

    getSchedules = asyncHandler(async (req: Request, res: Response) => {
        const tenant = req.tenant;
        if (!tenant) {
            throw new Error('Tenant context required');
        }
        
        const schedules = await examinationService.getSchedules(tenant, req.params.examId as string);
        return successResponse(res, schedules);
    });

    getSchedulesByClass = asyncHandler(async (req: Request, res: Response) => {
        const tenant = req.tenant;
        if (!tenant) {
            throw new Error('Tenant context required');
        }
        
        const { classId } = req.params;
        const { sessionId } = req.query;
        
        const schedules = await examinationService.getSchedulesByClass(
            tenant,
            classId as string,
            sessionId as string
        );
        return successResponse(res, schedules);
    });

    createSchedule = asyncHandler(async (req: Request, res: Response) => {
        const tenant = req.tenant;
        if (!tenant) {
            throw new Error('Tenant context required');
        }
        
        const schedule = await examinationService.createSchedule(tenant, req.body);
        return successResponse(res, schedule, 'Schedule created successfully', 201);
    });

    updateSchedule = asyncHandler(async (req: Request, res: Response) => {
        const tenant = req.tenant;
        if (!tenant) {
            throw new Error('Tenant context required');
        }
        
        const schedule = await examinationService.updateSchedule(tenant, req.params.id as string, req.body);
        return successResponse(res, schedule, 'Schedule updated successfully');
    });

    deleteSchedule = asyncHandler(async (req: Request, res: Response) => {
        const tenant = req.tenant;
        if (!tenant) {
            throw new Error('Tenant context required');
        }
        
        const result = await examinationService.deleteSchedule(tenant, req.params.id as string);
        return successResponse(res, result);
    });

    // ==================== Marks ====================

    getMarks = asyncHandler(async (req: Request, res: Response) => {
        const tenant = req.tenant;
        if (!tenant) {
            throw new Error('Tenant context required');
        }
        
        const { examScheduleId } = req.params;
        const { classId, sectionId } = req.query;
        
        const marks = await examinationService.getMarks(
            tenant,
            examScheduleId as string,
            classId as string,
            sectionId as string
        );
        return successResponse(res, marks);
    });

    enterMarks = asyncHandler(async (req: Request, res: Response) => {
        const tenant = req.tenant;
        if (!tenant) {
            throw new Error('Tenant context required');
        }
        
        const result = await examinationService.enterMarks(tenant, req.body, req.rbac, req.user?.userId);
        return successResponse(res, result, `${result.count} marks entered successfully`);
    });

    getStudentMarks = asyncHandler(async (req: Request, res: Response) => {
        const tenant = req.tenant;
        if (!tenant) {
            throw new Error('Tenant context required');
        }
        
        const { studentId } = req.params;
        const { sessionId } = req.query;
        
        const marks = await examinationService.getStudentMarks(
            tenant,
            studentId as string,
            sessionId as string
        );
        return successResponse(res, marks);
    });

    // ==================== Grades ====================

    getGrades = asyncHandler(async (req: Request, res: Response) => {
        const tenant = req.tenant;
        if (!tenant) {
            throw new Error('Tenant context required');
        }
        
        const grades = await examinationService.getGrades(tenant);
        return successResponse(res, grades);
    });

    createGrade = asyncHandler(async (req: Request, res: Response) => {
        const tenant = req.tenant;
        if (!tenant) {
            throw new Error('Tenant context required');
        }
        
        const grade = await examinationService.createGrade(tenant, req.body);
        return successResponse(res, grade, 'Grade created successfully', 201);
    });

    // ==================== Statistics ====================

    getExamStats = asyncHandler(async (req: Request, res: Response) => {
        const tenant = req.tenant;
        if (!tenant) {
            throw new Error('Tenant context required');
        }
        
        const { sessionId } = req.query;
        const stats = await examinationService.getExamStats(tenant, sessionId as string);
        return successResponse(res, stats);
    });
}

export const examinationController = new ExaminationController();
