import { Request, Response } from 'express';
import { asyncHandler } from '../../../../core/utils/asyncHandler';
import { communicationService } from '../services/communication.service';
import { parentPortalService } from '../services/parent-portal.service';
import { getTenantContext, LinkParentBody, sendError, sendSuccess } from './response.utils';

class ParentPortalController {
    getChildren = asyncHandler(async (req: Request, res: Response) => {
        const tenant = getTenantContext(req);
        const parentUserId = req.user?.userId;
        if (!tenant || !parentUserId) {
            return sendError(res, 'Authentication required', 401);
        }

        const children = await parentPortalService.getParentChildren(
            parentUserId,
            tenant.schema,
            tenant.institutionId
        );
        return sendSuccess(res, children, 'Children fetched successfully');
    });

    getStudentAttendance = asyncHandler(async (req: Request, res: Response) => {
        const tenant = getTenantContext(req);
        const parentUserId = req.user?.userId;
        if (!tenant || !parentUserId) {
            return sendError(res, 'Authentication required', 401);
        }

        const attendance = await parentPortalService.getStudentAttendance(
            parentUserId,
            req.params.studentId as string,
            tenant.schema,
            tenant.institutionId
        );
        return sendSuccess(res, attendance, 'Student attendance fetched successfully');
    });

    getStudentFees = asyncHandler(async (req: Request, res: Response) => {
        const tenant = getTenantContext(req);
        const parentUserId = req.user?.userId;
        if (!tenant || !parentUserId) {
            return sendError(res, 'Authentication required', 401);
        }

        const fees = await parentPortalService.getStudentFees(
            parentUserId,
            req.params.studentId as string,
            tenant.schema,
            tenant.institutionId
        );
        return sendSuccess(res, fees, 'Student fees fetched successfully');
    });

    getStudentMarks = asyncHandler(async (req: Request, res: Response) => {
        const tenant = getTenantContext(req);
        const parentUserId = req.user?.userId;
        if (!tenant || !parentUserId) {
            return sendError(res, 'Authentication required', 401);
        }

        const marks = await parentPortalService.getStudentMarks(
            parentUserId,
            req.params.studentId as string,
            tenant.schema,
            tenant.institutionId
        );
        return sendSuccess(res, marks, 'Student marks fetched successfully');
    });

    getNotices = asyncHandler(async (req: Request, res: Response) => {
        const tenant = getTenantContext(req);
        if (!tenant) {
            return sendError(res, 'Tenant context missing', 400);
        }

        const notices = await parentPortalService.getParentNotices(tenant.schema, tenant.institutionId);
        return sendSuccess(res, notices, 'Parent notices fetched successfully');
    });

    linkParent = asyncHandler(async (req: Request, res: Response) => {
        const tenant = getTenantContext(req);
        if (!tenant) {
            return sendError(res, 'Tenant context missing', 400);
        }

        const body = req.body as LinkParentBody;
        const access = await communicationService.linkParentToStudent(
            {
                parentUserId: body.parentUserId,
                studentId: body.studentId,
                relationship: body.relationship,
                isPrimary: body.isPrimary,
                canViewFees: body.canViewFees,
                canViewMarks: body.canViewMarks,
                canViewAttendance: body.canViewAttendance,
            },
            tenant.schema,
            tenant.institutionId
        );

        return sendSuccess(res, access, 'Parent linked to student successfully', 201);
    });

    unlinkParent = asyncHandler(async (req: Request, res: Response) => {
        const tenant = getTenantContext(req);
        if (!tenant) {
            return sendError(res, 'Tenant context missing', 400);
        }

        const parentUserId = (req.query.parentUserId as string) || req.user?.userId;
        if (!parentUserId) {
            return sendError(res, 'Parent user ID is required', 400);
        }

        await communicationService.unlinkParentFromStudent(
            parentUserId,
            req.params.studentId as string,
            tenant.schema,
            tenant.institutionId
        );

        return sendSuccess(res, null, 'Parent unlinked from student');
    });
}

export const parentPortalController = new ParentPortalController();
