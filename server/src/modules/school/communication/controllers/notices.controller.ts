import { Request, Response } from 'express';
import { asyncHandler } from '../../../../core/utils/asyncHandler';
import { TargetAudience } from '../../../../database/models/school/communication/Notice.model';
import { communicationService } from '../services/communication.service';
import { getTenantContext, NoticeBody, NoticeQuery, sendError, sendSuccess } from './response.utils';

class NoticesController {
    getPublished = asyncHandler(async (req: Request, res: Response) => {
        const tenant = getTenantContext(req);
        if (!tenant) {
            return sendError(res, 'Tenant context missing', 400);
        }

        const query = req.query as NoticeQuery;
        const { audience, classId, pinned } = query;
        const filters = {
            targetAudience: audience as TargetAudience,
            classId: classId as string,
            pinned: pinned === 'true' ? true : pinned === 'false' ? false : undefined,
            includeCreator: true,
        };

        const notices = await communicationService.getPublishedNotices(
            filters,
            tenant.schema,
            tenant.institutionId
        );
        return sendSuccess(res, notices, 'Published notices fetched successfully');
    });

    getAll = asyncHandler(async (req: Request, res: Response) => {
        const tenant = getTenantContext(req);
        if (!tenant) {
            return sendError(res, 'Tenant context missing', 400);
        }

        const notices = await communicationService.getAllNotices(tenant.schema, tenant.institutionId);
        return sendSuccess(res, notices, 'All notices fetched successfully');
    });

    getById = asyncHandler(async (req: Request, res: Response) => {
        const tenant = getTenantContext(req);
        if (!tenant) {
            return sendError(res, 'Tenant context missing', 400);
        }

        const notice = await communicationService.getNoticeById(
            req.params.id as string,
            tenant.schema,
            tenant.institutionId
        );
        return sendSuccess(res, notice, 'Notice fetched successfully');
    });

    create = asyncHandler(async (req: Request, res: Response) => {
        const tenant = getTenantContext(req);
        if (!tenant) {
            return sendError(res, 'Tenant context missing', 400);
        }

        const createdBy = req.user?.userId;
        const body = req.body as NoticeBody;
        const notice = await communicationService.createNotice(
            {
                title: body.title,
                content: body.content,
                noticeType: body.noticeType,
                targetAudience: body.targetAudience,
                classId: body.classId,
                sectionId: body.sectionId,
                publishedAt: body.publishedAt ? new Date(body.publishedAt) : undefined,
                expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
                isPublished: body.isPublished,
                isPinned: body.isPinned,
                createdBy,
            },
            tenant.schema,
            tenant.institutionId
        );

        return sendSuccess(res, notice, 'Notice created successfully', 201);
    });

    update = asyncHandler(async (req: Request, res: Response) => {
        const tenant = getTenantContext(req);
        if (!tenant) {
            return sendError(res, 'Tenant context missing', 400);
        }

        const body = req.body as Partial<NoticeBody>;
        const notice = await communicationService.updateNotice(
            req.params.id as string,
            {
                title: body.title,
                content: body.content,
                noticeType: body.noticeType,
                targetAudience: body.targetAudience,
                classId: body.classId,
                sectionId: body.sectionId,
                publishedAt: body.publishedAt ? new Date(body.publishedAt) : undefined,
                expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
                isPublished: body.isPublished,
                isPinned: body.isPinned,
            },
            tenant.schema,
            tenant.institutionId
        );

        return sendSuccess(res, notice, 'Notice updated successfully');
    });

    delete = asyncHandler(async (req: Request, res: Response) => {
        const tenant = getTenantContext(req);
        if (!tenant) {
            return sendError(res, 'Tenant context missing', 400);
        }

        await communicationService.deleteNotice(req.params.id as string, tenant.schema, tenant.institutionId);
        return sendSuccess(res, null, 'Notice deleted');
    });
}

export const noticesController = new NoticesController();
