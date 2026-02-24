import { Request, Response } from 'express';
import { TargetAudience, NoticeType } from '../../../../database/models/school/communication/Notice.model';
import { RelationshipType } from '../../../../database/models/school/communication/ParentPortalAccess.model';

export interface NoticeQuery {
    audience?: string;
    classId?: string;
    pinned?: string;
}

export interface NoticeBody {
    title: string;
    content: string;
    noticeType?: NoticeType;
    targetAudience?: TargetAudience;
    classId?: string;
    sectionId?: string;
    publishedAt?: string;
    expiresAt?: string;
    isPublished?: boolean;
    isPinned?: boolean;
}

export interface LinkParentBody {
    parentUserId: string;
    studentId: string;
    relationship?: RelationshipType;
    isPrimary?: boolean;
    canViewFees?: boolean;
    canViewMarks?: boolean;
    canViewAttendance?: boolean;
}

export const sendSuccess = (
    res: Response,
    data: unknown,
    message = 'Success',
    statusCode = 200,
    meta?: Record<string, unknown>
) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        errors: [],
        ...(meta ? { meta } : {}),
    });
};

export const sendError = (
    res: Response,
    message: string,
    statusCode = 400,
    errors: string[] = [message]
) => {
    return res.status(statusCode).json({
        success: false,
        message,
        data: null,
        errors,
    });
};

export const getTenantContext = (req: Request): { schema: string; institutionId: string } | null => {
    const schema = req.tenant?.db_schema;
    const institutionId = req.tenant?.id;
    if (!schema || !institutionId) {
        return null;
    }
    return { schema, institutionId };
};
