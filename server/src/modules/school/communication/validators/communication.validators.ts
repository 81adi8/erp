/**
 * Communication Validators
 * Zod schemas for request validation
 */
import { z } from 'zod';
import { NoticeType, TargetAudience } from '../../../../database/models/school/communication/Notice.model';
import { NotificationChannel } from '../../../../database/models/school/communication/Notification.model';
import { TemplateType } from '../../../../database/models/school/communication/NotificationTemplate.model';
import { RelationshipType } from '../../../../database/models/school/communication/ParentPortalAccess.model';

// ─── Notice Validators ───────────────────────────────────────────────────────

export const createNoticeSchema = z.object({
    body: z.object({
        title: z.string().min(1, 'Title is required').max(300, 'Title must be at most 300 characters'),
        content: z.string().min(1, 'Content is required'),
        noticeType: z.nativeEnum(NoticeType).optional().default(NoticeType.GENERAL),
        targetAudience: z.nativeEnum(TargetAudience).optional().default(TargetAudience.ALL),
        classId: z.string().uuid('Class ID must be a valid UUID').optional(),
        sectionId: z.string().uuid('Section ID must be a valid UUID').optional(),
        publishedAt: z.string().datetime().optional(),
        expiresAt: z.string().datetime().optional(),
        isPublished: z.boolean().optional().default(false),
        isPinned: z.boolean().optional().default(false),
    }),
});

export const updateNoticeSchema = z.object({
    params: z.object({
        id: z.string().uuid('Notice ID must be a valid UUID'),
    }),
    body: z.object({
        title: z.string().min(1, 'Title cannot be empty').max(300, 'Title must be at most 300 characters').optional(),
        content: z.string().min(1, 'Content cannot be empty').optional(),
        noticeType: z.nativeEnum(NoticeType).optional(),
        targetAudience: z.nativeEnum(TargetAudience).optional(),
        classId: z.string().uuid('Class ID must be a valid UUID').optional().nullable(),
        sectionId: z.string().uuid('Section ID must be a valid UUID').optional().nullable(),
        publishedAt: z.string().datetime().optional().nullable(),
        expiresAt: z.string().datetime().optional().nullable(),
        isPublished: z.boolean().optional(),
        isPinned: z.boolean().optional(),
    }),
});

export const noticeIdSchema = z.object({
    params: z.object({
        id: z.string().uuid('Notice ID must be a valid UUID'),
    }),
});

export const noticeQuerySchema = z.object({
    query: z.object({
        audience: z.nativeEnum(TargetAudience).optional(),
        classId: z.string().uuid('Class ID must be a valid UUID').optional(),
        pinned: z.enum(['true', 'false'] as const).optional(),
    }),
});

// ─── Notification Validators ─────────────────────────────────────────────────

export const sendNotificationSchema = z.object({
    body: z.object({
        userId: z.string().uuid('User ID must be a valid UUID'),
        title: z.string().min(1, 'Title is required').max(300, 'Title must be at most 300 characters'),
        message: z.string().min(1, 'Message is required'),
        type: z.string().max(100).optional(),
        metadata: z.record(z.string(), z.any()).optional(),
        channel: z.nativeEnum(NotificationChannel).optional().default(NotificationChannel.IN_APP),
    }),
});

export const sendBulkNotificationSchema = z.object({
    body: z.object({
        userIds: z.array(z.string().uuid('User ID must be a valid UUID')).min(1, 'At least one recipient is required'),
        title: z.string().min(1, 'Title is required').max(300, 'Title must be at most 300 characters'),
        message: z.string().min(1, 'Message is required'),
        type: z.string().max(100).optional(),
        metadata: z.record(z.string(), z.any()).optional(),
        channel: z.nativeEnum(NotificationChannel).optional().default(NotificationChannel.IN_APP),
    }),
});

export const notificationIdSchema = z.object({
    params: z.object({
        id: z.string().uuid('Notification ID must be a valid UUID'),
    }),
});

export const notificationQuerySchema = z.object({
    query: z.object({
        status: z.enum(['pending', 'sent', 'delivered', 'read', 'failed'] as const).optional(),
        type: z.string().max(100).optional(),
        unreadOnly: z.enum(['true', 'false'] as const).optional(),
    }),
});

// ─── Template Validators ─────────────────────────────────────────────────────

export const createTemplateSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
        slug: z.string().min(1, 'Slug is required').max(100, 'Slug must be at most 100 characters').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
        type: z.nativeEnum(TemplateType).optional().default(TemplateType.CUSTOM),
        titleTemplate: z.string().min(1, 'Title template is required').max(300),
        messageTemplate: z.string().min(1, 'Message template is required'),
        variables: z.array(z.string()).optional(),
        isActive: z.boolean().optional().default(true),
    }),
});

export const updateTemplateSchema = z.object({
    params: z.object({
        id: z.string().uuid('Template ID must be a valid UUID'),
    }),
    body: z.object({
        name: z.string().min(1, 'Name cannot be empty').max(100, 'Name must be at most 100 characters').optional(),
        titleTemplate: z.string().min(1, 'Title template cannot be empty').max(300).optional(),
        messageTemplate: z.string().min(1, 'Message template cannot be empty').optional(),
        variables: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
    }),
});

export const templateSlugSchema = z.object({
    params: z.object({
        slug: z.string().min(1, 'Slug is required'),
    }),
});

export const templateIdSchema = z.object({
    params: z.object({
        id: z.string().uuid('Template ID must be a valid UUID'),
    }),
});

export const renderTemplateSchema = z.object({
    params: z.object({
        slug: z.string().min(1, 'Slug is required'),
    }),
    body: z.object({
        variables: z.record(z.string(), z.any()),
    }),
});

// ─── Parent Portal Validators ────────────────────────────────────────────────

export const linkParentSchema = z.object({
    body: z.object({
        parentUserId: z.string().uuid('Parent user ID must be a valid UUID'),
        studentId: z.string().uuid('Student ID must be a valid UUID'),
        relationship: z.nativeEnum(RelationshipType).optional().default(RelationshipType.PARENT),
        isPrimary: z.boolean().optional().default(false),
        canViewFees: z.boolean().optional().default(true),
        canViewMarks: z.boolean().optional().default(true),
        canViewAttendance: z.boolean().optional().default(true),
    }),
});

export const updateParentAccessSchema = z.object({
    params: z.object({
        studentId: z.string().uuid('Student ID must be a valid UUID'),
    }),
    body: z.object({
        relationship: z.nativeEnum(RelationshipType).optional(),
        isPrimary: z.boolean().optional(),
        canViewFees: z.boolean().optional(),
        canViewMarks: z.boolean().optional(),
        canViewAttendance: z.boolean().optional(),
    }),
});

export const studentIdSchema = z.object({
    params: z.object({
        studentId: z.string().uuid('Student ID must be a valid UUID'),
    }),
});

// ─── Type exports ────────────────────────────────────────────────────────────

export type CreateNoticeInput = z.infer<typeof createNoticeSchema>['body'];
export type UpdateNoticeInput = z.infer<typeof updateNoticeSchema>['body'];
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>['body'];
export type SendBulkNotificationInput = z.infer<typeof sendBulkNotificationSchema>['body'];
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>['body'];
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>['body'];
export type LinkParentInput = z.infer<typeof linkParentSchema>['body'];
export type UpdateParentAccessInput = z.infer<typeof updateParentAccessSchema>['body'];