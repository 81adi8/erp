/**
 * Communication Service
 * Business logic for notices, notifications, and templates
 * 
 * IMPORTANT: Bulk notifications (>10 recipients) are queued and return jobId immediately
 */
import { sequelize } from '../../../../database/sequelize';
import { ApiError } from '../../../../core/http/ApiError';
import { queueManager, QueueType } from '../../../../core/queue/QueueManager';
import { logger } from '../../../../core/utils/logger';
import {
    createCommunicationRepositories,
    NoticeRepository,
    NotificationRepository,
    NotificationTemplateRepository,
    ParentPortalAccessRepository,
    CreateNoticeData,
    UpdateNoticeData,
    NoticeFilters,
    CreateNotificationData,
    UpdateNotificationData,
    NotificationFilters,
    CreateTemplateData,
    UpdateTemplateData,
    CreateParentAccessData,
    UpdateParentAccessData,
} from '../repositories/communication.repository';
import { Notice, NoticeType, TargetAudience } from '../../../../database/models/school/communication/Notice.model';
import { Notification, NotificationStatus, NotificationChannel } from '../../../../database/models/school/communication/Notification.model';
import { NotificationTemplate, TemplateType } from '../../../../database/models/school/communication/NotificationTemplate.model';
import { ParentPortalAccess, RelationshipType } from '../../../../database/models/school/communication/ParentPortalAccess.model';

// ─── Constants ───────────────────────────────────────────────────────────────

const BULK_NOTIFICATION_THRESHOLD = 10;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateNoticeInput {
    title: string;
    content: string;
    noticeType?: NoticeType;
    targetAudience?: TargetAudience;
    classId?: string;
    sectionId?: string;
    publishedAt?: Date;
    expiresAt?: Date;
    isPublished?: boolean;
    isPinned?: boolean;
    createdBy?: string;
}

export interface UpdateNoticeInput {
    title?: string;
    content?: string;
    noticeType?: NoticeType;
    targetAudience?: TargetAudience;
    classId?: string;
    sectionId?: string;
    publishedAt?: Date;
    expiresAt?: Date;
    isPublished?: boolean;
    isPinned?: boolean;
}

export interface SendNotificationInput {
    userId: string;
    title: string;
    message: string;
    type?: string;
    metadata?: Record<string, unknown>;
    channel?: NotificationChannel;
}

export interface SendBulkNotificationInput {
    userIds: string[];
    title: string;
    message: string;
    type?: string;
    metadata?: Record<string, unknown>;
    channel?: NotificationChannel;
}

export interface BulkNotificationResult {
    queued: boolean;
    jobId?: string;
    recipientCount?: number;
    message: string;
}

export interface CreateTemplateInput {
    name: string;
    slug: string;
    type?: TemplateType;
    titleTemplate: string;
    messageTemplate: string;
    variables?: string[];
    isActive?: boolean;
}

export interface UpdateTemplateInput {
    name?: string;
    titleTemplate?: string;
    messageTemplate?: string;
    variables?: string[];
    isActive?: boolean;
}

export interface LinkParentInput {
    parentUserId: string;
    studentId: string;
    relationship?: RelationshipType;
    isPrimary?: boolean;
    canViewFees?: boolean;
    canViewMarks?: boolean;
    canViewAttendance?: boolean;
}

// ─── Communication Service ───────────────────────────────────────────────────

export class CommunicationService {
    // ─── Notice Methods ───────────────────────────────────────────────────────

    async getPublishedNotices(filters: NoticeFilters, schema: string, institutionId: string): Promise<Notice[]> {
        this.ensureSchema(schema);
        const repos = createCommunicationRepositories(schema, institutionId);
        return repos.notice.findAllPublished(filters);
    }

    async getAllNotices(schema: string, institutionId: string): Promise<Notice[]> {
        this.ensureSchema(schema);
        const repos = createCommunicationRepositories(schema, institutionId);
        return repos.notice.findAllWithCreator();
    }

    async getNoticeById(id: string, schema: string, institutionId: string): Promise<Notice> {
        this.ensureSchema(schema);
        this.ensureUuid(id, 'Notice ID is required');

        const repos = createCommunicationRepositories(schema, institutionId);
        const notice = await repos.notice.findById(id);

        if (!notice) {
            throw ApiError.notFound('Notice not found');
        }

        return notice;
    }

    async createNotice(input: CreateNoticeInput, schema: string, institutionId: string): Promise<Notice> {
        this.ensureSchema(schema);

        const title = input.title?.trim();
        const content = input.content?.trim();

        if (!title) {
            throw ApiError.badRequest('Title is required');
        }

        if (!content) {
            throw ApiError.badRequest('Content is required');
        }

        const repos = createCommunicationRepositories(schema, institutionId);

        return sequelize.transaction(async (tx) => {
            const data: CreateNoticeData = {
                title,
                content,
                notice_type: input.noticeType || NoticeType.GENERAL,
                target_audience: input.targetAudience || TargetAudience.ALL,
                class_id: input.classId,
                section_id: input.sectionId,
                published_at: input.publishedAt,
                expires_at: input.expiresAt,
                is_published: input.isPublished ?? false,
                is_pinned: input.isPinned ?? false,
                created_by: input.createdBy,
            };

            // If publishing for the first time, set published_at
            if (input.isPublished && !input.publishedAt) {
                data.published_at = new Date();
            }

            return repos.notice.createNotice(data, tx);
        });
    }

    async updateNotice(id: string, input: UpdateNoticeInput, schema: string, institutionId: string): Promise<Notice> {
        this.ensureSchema(schema);
        this.ensureUuid(id, 'Notice ID is required');

        const repos = createCommunicationRepositories(schema, institutionId);

        return sequelize.transaction(async (tx) => {
            const existing = await repos.notice.findById(id);
            if (!existing) {
                throw ApiError.notFound('Notice not found');
            }

            const data: UpdateNoticeData = {};

            if (input.title !== undefined) {
                data.title = input.title.trim();
            }
            if (input.content !== undefined) {
                data.content = input.content.trim();
            }
            if (input.noticeType !== undefined) {
                data.notice_type = input.noticeType;
            }
            if (input.targetAudience !== undefined) {
                data.target_audience = input.targetAudience;
            }
            if (input.classId !== undefined) {
                data.class_id = input.classId;
            }
            if (input.sectionId !== undefined) {
                data.section_id = input.sectionId;
            }
            if (input.publishedAt !== undefined) {
                data.published_at = input.publishedAt;
            }
            if (input.expiresAt !== undefined) {
                data.expires_at = input.expiresAt;
            }
            if (input.isPinned !== undefined) {
                data.is_pinned = input.isPinned;
            }

            // Handle publishing
            if (input.isPublished !== undefined) {
                data.is_published = input.isPublished;
                // If publishing for the first time, set published_at
                if (input.isPublished && !existing.published_at) {
                    data.published_at = new Date();
                }
            }

            await repos.notice.updateNotice(id, data, tx);
            return (await repos.notice.findById(id))!;
        });
    }

    async deleteNotice(id: string, schema: string, institutionId: string): Promise<{ deleted: boolean }> {
        this.ensureSchema(schema);
        this.ensureUuid(id, 'Notice ID is required');

        const repos = createCommunicationRepositories(schema, institutionId);

        const existing = await repos.notice.findById(id);
        if (!existing) {
            throw ApiError.notFound('Notice not found');
        }

        await repos.notice.softDeleteNotice(id);
        return { deleted: true };
    }

    // ─── Notification Methods ─────────────────────────────────────────────────

    async getNotifications(
        userId: string,
        filters: NotificationFilters,
        schema: string,
        institutionId: string
    ): Promise<Notification[]> {
        this.ensureSchema(schema);
        this.ensureUuid(userId, 'User ID is required');

        const repos = createCommunicationRepositories(schema, institutionId);
        return repos.notification.findByUser(userId, filters);
    }

    async getUnreadCount(userId: string, schema: string, institutionId: string): Promise<number> {
        this.ensureSchema(schema);
        this.ensureUuid(userId, 'User ID is required');

        const repos = createCommunicationRepositories(schema, institutionId);
        return repos.notification.countUnread(userId);
    }

    async markNotificationAsRead(id: string, schema: string, institutionId: string): Promise<{ updated: boolean }> {
        this.ensureSchema(schema);
        this.ensureUuid(id, 'Notification ID is required');

        const repos = createCommunicationRepositories(schema, institutionId);
        await repos.notification.markAsRead(id);
        return { updated: true };
    }

    async markAllNotificationsAsRead(userId: string, schema: string, institutionId: string): Promise<{ updated: boolean }> {
        this.ensureSchema(schema);
        this.ensureUuid(userId, 'User ID is required');

        const repos = createCommunicationRepositories(schema, institutionId);
        await repos.notification.markAllAsRead(userId);
        return { updated: true };
    }

    /**
     * Send a notification to a single user (synchronous)
     */
    async sendNotification(input: SendNotificationInput, schema: string, institutionId: string): Promise<Notification> {
        this.ensureSchema(schema);
        this.ensureUuid(input.userId, 'User ID is required');

        const repos = createCommunicationRepositories(schema, institutionId);

        return sequelize.transaction(async (tx) => {
            const data: CreateNotificationData = {
                user_id: input.userId,
                title: input.title,
                message: input.message,
                type: input.type,
                metadata: input.metadata,
                channel: input.channel || NotificationChannel.IN_APP,
                status: NotificationStatus.SENT,
            };

            const notification = await repos.notification.createNotification(data, tx);

            // Update sent_at
            await repos.notification.updateNotification(notification.id, {
                sent_at: new Date(),
            }, tx);

            return notification;
        });
    }

    /**
     * Send notifications to multiple users
     * IMPORTANT: If recipients > 10, queues the job and returns jobId immediately
     */
    async sendBulkNotifications(
        input: SendBulkNotificationInput,
        schema: string,
        institutionId: string,
        tenantId?: string
    ): Promise<BulkNotificationResult> {
        this.ensureSchema(schema);

        if (!input.userIds || input.userIds.length === 0) {
            throw ApiError.badRequest('At least one recipient is required');
        }

        const uniqueUserIds = [...new Set(input.userIds)];
        const recipientCount = uniqueUserIds.length;

        // Validate all user IDs
        uniqueUserIds.forEach((id) => this.ensureUuid(id, `Invalid user ID: ${id}`));

        // If recipients exceed threshold, queue the job
        if (recipientCount > BULK_NOTIFICATION_THRESHOLD) {
            return this.queueBulkNotification(input, uniqueUserIds, schema, institutionId, tenantId);
        }

        // Otherwise, send synchronously
        const repos = createCommunicationRepositories(schema, institutionId);

        return sequelize.transaction(async (tx) => {
            const notifications: CreateNotificationData[] = uniqueUserIds.map((userId) => ({
                user_id: userId,
                title: input.title,
                message: input.message,
                type: input.type,
                metadata: input.metadata,
                channel: input.channel || NotificationChannel.IN_APP,
                status: NotificationStatus.SENT,
            }));

            await repos.notification.bulkCreateNotifications(notifications, tx);

            return {
                queued: false,
                recipientCount,
                message: `Notifications sent to ${recipientCount} recipients`,
            };
        });
    }

    private async queueBulkNotification(
        input: SendBulkNotificationInput,
        userIds: string[],
        schema: string,
        institutionId: string,
        tenantId?: string
    ): Promise<BulkNotificationResult> {
        try {
            const job = await queueManager.addJob(
                QueueType.NOTIFICATIONS,
                'bulk-notification',
                {
                    userIds,
                    title: input.title,
                    message: input.message,
                    type: input.type,
                    metadata: input.metadata,
                    channel: input.channel || NotificationChannel.IN_APP,
                    schema,
                    institutionId,
                    tenantId,
                },
                {
                    priority: 10, // Normal priority
                }
            );

            const jobId = String(job.id);

            logger.info(`[CommunicationService] Bulk notification queued with jobId: ${jobId}`);

            return {
                queued: true,
                jobId: jobId?.toString(),
                recipientCount: userIds.length,
                message: `Notification queued for ${userIds.length} recipients. Job ID: ${jobId}`,
            };
        } catch (error) {
            logger.error('[CommunicationService] Failed to queue bulk notification:', error);
            throw ApiError.internal('Failed to queue bulk notification');
        }
    }

    // ─── Template Methods ──────────────────────────────────────────────────────

    async getTemplates(schema: string, institutionId: string): Promise<NotificationTemplate[]> {
        this.ensureSchema(schema);
        const repos = createCommunicationRepositories(schema, institutionId);
        return repos.template.findAllActive();
    }

    async getTemplateBySlug(slug: string, schema: string, institutionId: string): Promise<NotificationTemplate> {
        this.ensureSchema(schema);

        if (!slug?.trim()) {
            throw ApiError.badRequest('Template slug is required');
        }

        const repos = createCommunicationRepositories(schema, institutionId);
        const template = await repos.template.findBySlug(slug.trim());

        if (!template) {
            throw ApiError.notFound('Template not found');
        }

        return template;
    }

    async createTemplate(input: CreateTemplateInput, schema: string, institutionId: string): Promise<NotificationTemplate> {
        this.ensureSchema(schema);

        const name = input.name?.trim();
        const slug = input.slug?.trim();
        const titleTemplate = input.titleTemplate?.trim();
        const messageTemplate = input.messageTemplate?.trim();

        if (!name) {
            throw ApiError.badRequest('Template name is required');
        }
        if (!slug) {
            throw ApiError.badRequest('Template slug is required');
        }
        if (!titleTemplate) {
            throw ApiError.badRequest('Title template is required');
        }
        if (!messageTemplate) {
            throw ApiError.badRequest('Message template is required');
        }

        const repos = createCommunicationRepositories(schema, institutionId);

        // Check for duplicate slug
        const existing = await repos.template.findBySlug(slug);
        if (existing) {
            throw ApiError.conflict('Template with this slug already exists');
        }

        return sequelize.transaction(async (tx) => {
            const data: CreateTemplateData = {
                name,
                slug,
                type: input.type || TemplateType.CUSTOM,
                title_template: titleTemplate,
                message_template: messageTemplate,
                variables: input.variables,
                is_active: input.isActive ?? true,
            };

            return repos.template.createTemplate(data, tx);
        });
    }

    async updateTemplate(
        id: string,
        input: UpdateTemplateInput,
        schema: string,
        institutionId: string
    ): Promise<NotificationTemplate> {
        this.ensureSchema(schema);
        this.ensureUuid(id, 'Template ID is required');

        const repos = createCommunicationRepositories(schema, institutionId);
        const existing = await repos.template.findById(id);
        if (!existing) {
            throw ApiError.notFound('Template not found');
        }

        return sequelize.transaction(async (tx) => {
            const data: UpdateTemplateData = {};

            if (input.name !== undefined) {
                data.name = input.name.trim();
            }
            if (input.titleTemplate !== undefined) {
                data.title_template = input.titleTemplate.trim();
            }
            if (input.messageTemplate !== undefined) {
                data.message_template = input.messageTemplate.trim();
            }
            if (input.variables !== undefined) {
                data.variables = input.variables;
            }
            if (input.isActive !== undefined) {
                data.is_active = input.isActive;
            }

            await repos.template.updateTemplate(id, data, tx);
            const template = await repos.template.findById(id);
            if (!template) {
                throw ApiError.internal('Template update failed');
            }
            return template;
        });
    }

    async deleteTemplate(id: string, schema: string, institutionId: string): Promise<{ deleted: boolean }> {
        this.ensureSchema(schema);
        this.ensureUuid(id, 'Template ID is required');

        const repos = createCommunicationRepositories(schema, institutionId);
        const existing = await repos.template.findById(id);
        if (!existing) {
            throw ApiError.notFound('Template not found');
        }
        await repos.template.deleteTemplate(id);
        return { deleted: true };
    }

    /**
     * Render a template with variables
     */
    renderTemplate(template: NotificationTemplate, variables: Record<string, unknown>): { title: string; message: string } {
        let title = template.title_template;
        let message = template.message_template;

        // Replace {{variable}} placeholders
        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            title = title.replace(regex, String(value));
            message = message.replace(regex, String(value));
        });

        return { title, message };
    }

    // ─── Parent Portal Access Methods ─────────────────────────────────────────

    async getParentChildren(parentUserId: string, schema: string, institutionId: string): Promise<ParentPortalAccess[]> {
        this.ensureSchema(schema);
        this.ensureUuid(parentUserId, 'Parent user ID is required');

        const repos = createCommunicationRepositories(schema, institutionId);
        return repos.parentAccess.findByParentUserId(parentUserId);
    }

    async linkParentToStudent(input: LinkParentInput, schema: string, institutionId: string): Promise<ParentPortalAccess> {
        this.ensureSchema(schema);
        this.ensureUuid(input.parentUserId, 'Parent user ID is required');
        this.ensureUuid(input.studentId, 'Student ID is required');

        const repos = createCommunicationRepositories(schema, institutionId);

        return sequelize.transaction(async (tx) => {
            const data: CreateParentAccessData = {
                parent_user_id: input.parentUserId,
                student_id: input.studentId,
                relationship: input.relationship || RelationshipType.PARENT,
                is_primary: input.isPrimary ?? false,
                can_view_fees: input.canViewFees ?? true,
                can_view_marks: input.canViewMarks ?? true,
                can_view_attendance: input.canViewAttendance ?? true,
            };

            return repos.parentAccess.upsertAccess(data, tx);
        });
    }

    async unlinkParentFromStudent(
        parentUserId: string,
        studentId: string,
        schema: string,
        institutionId: string
    ): Promise<{ deleted: boolean }> {
        this.ensureSchema(schema);
        this.ensureUuid(parentUserId, 'Parent user ID is required');
        this.ensureUuid(studentId, 'Student ID is required');

        const repos = createCommunicationRepositories(schema, institutionId);
        await repos.parentAccess.deleteByParentAndStudent(parentUserId, studentId);
        return { deleted: true };
    }

    async updateParentAccess(
        parentUserId: string,
        studentId: string,
        input: Partial<LinkParentInput>,
        schema: string,
        institutionId: string
    ): Promise<ParentPortalAccess> {
        this.ensureSchema(schema);
        this.ensureUuid(parentUserId, 'Parent user ID is required');
        this.ensureUuid(studentId, 'Student ID is required');

        const repos = createCommunicationRepositories(schema, institutionId);

        const existing = await repos.parentAccess.findByParentAndStudent(parentUserId, studentId);
        if (!existing) {
            throw ApiError.notFound('Parent access record not found');
        }

        return sequelize.transaction(async (tx) => {
            const data: UpdateParentAccessData = {};

            if (input.relationship !== undefined) {
                data.relationship = input.relationship;
            }
            if (input.isPrimary !== undefined) {
                data.is_primary = input.isPrimary;
            }
            if (input.canViewFees !== undefined) {
                data.can_view_fees = input.canViewFees;
            }
            if (input.canViewMarks !== undefined) {
                data.can_view_marks = input.canViewMarks;
            }
            if (input.canViewAttendance !== undefined) {
                data.can_view_attendance = input.canViewAttendance;
            }

            await repos.parentAccess.updateAccess(existing.id, data, tx);

            return (await repos.parentAccess.findByParentAndStudent(parentUserId, studentId))!;
        });
    }

    /**
     * Verify parent has access to student (strict isolation)
     */
    async verifyParentAccess(
        parentUserId: string,
        studentId: string,
        schema: string,
        institutionId: string,
        requiredPermission?: 'fees' | 'marks' | 'attendance'
    ): Promise<ParentPortalAccess> {
        this.ensureSchema(schema);
        this.ensureUuid(parentUserId, 'Parent user ID is required');
        this.ensureUuid(studentId, 'Student ID is required');

        const repos = createCommunicationRepositories(schema, institutionId);
        const access = await repos.parentAccess.findByParentAndStudent(parentUserId, studentId);

        if (!access) {
            throw ApiError.forbidden('Access denied: No relationship to this student');
        }

        // Check specific permissions
        if (requiredPermission === 'fees' && !access.can_view_fees) {
            throw ApiError.forbidden('Access denied: Fee viewing not permitted');
        }
        if (requiredPermission === 'marks' && !access.can_view_marks) {
            throw ApiError.forbidden('Access denied: Marks viewing not permitted');
        }
        if (requiredPermission === 'attendance' && !access.can_view_attendance) {
            throw ApiError.forbidden('Access denied: Attendance viewing not permitted');
        }

        return access;
    }

    // ─── Validation Helpers ────────────────────────────────────────────────────

    private ensureSchema(schema: string): void {
        if (!schema || typeof schema !== 'string') {
            throw ApiError.badRequest('Tenant schema is required');
        }
    }

    private ensureUuid(value: string, message: string): void {
        if (!value || !this.isUuid(value)) {
            throw ApiError.badRequest(message);
        }
    }

    private isUuid(value: string): boolean {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    }
}

export const communicationService = new CommunicationService();
