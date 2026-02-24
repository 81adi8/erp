/**
 * Communication Repository
 * ORM-only data access for notices, notifications, and templates
 * All methods are schema-aware for multi-tenant isolation
 */
import { Notice, NoticeType, TargetAudience } from '../../../../database/models/school/communication/Notice.model';
import { Notification, NotificationStatus, NotificationChannel } from '../../../../database/models/school/communication/Notification.model';
import { NotificationTemplate, TemplateType } from '../../../../database/models/school/communication/NotificationTemplate.model';
import { ParentPortalAccess, RelationshipType } from '../../../../database/models/school/communication/ParentPortalAccess.model';
import { BaseRepository } from '../../../../database/repositories/BaseRepository';
import { FindOptions, WhereOptions, Includeable, Transaction } from 'sequelize';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateNoticeData {
    title: string;
    content: string;
    notice_type?: NoticeType;
    target_audience?: TargetAudience;
    class_id?: string;
    section_id?: string;
    published_at?: Date;
    expires_at?: Date;
    is_published?: boolean;
    is_pinned?: boolean;
    created_by?: string;
}

export interface UpdateNoticeData {
    title?: string;
    content?: string;
    notice_type?: NoticeType;
    target_audience?: TargetAudience;
    class_id?: string;
    section_id?: string;
    published_at?: Date;
    expires_at?: Date;
    is_published?: boolean;
    is_pinned?: boolean;
}

export interface NoticeFilters {
    isPublished?: boolean;
    targetAudience?: TargetAudience;
    classId?: string;
    pinned?: boolean;
    includeCreator?: boolean;
}

export interface CreateNotificationData {
    institution_id?: string;
    user_id: string;
    title: string;
    message: string;
    type?: string;
    metadata?: Record<string, unknown>;
    channel?: NotificationChannel;
    status?: NotificationStatus;
    idempotency_key?: string;
}

export interface UpdateNotificationData {
    status?: NotificationStatus;
    sent_at?: Date;
    read_at?: Date;
    error_message?: string;
}

export interface NotificationFilters {
    userId?: string;
    status?: NotificationStatus;
    type?: string;
    unreadOnly?: boolean;
}

export interface CreateTemplateData {
    institution_id?: string;
    name: string;
    slug: string;
    type?: TemplateType;
    title_template: string;
    message_template: string;
    variables?: string[];
    is_active?: boolean;
}

export interface UpdateTemplateData {
    name?: string;
    title_template?: string;
    message_template?: string;
    variables?: string[];
    is_active?: boolean;
}

export interface CreateParentAccessData {
    parent_user_id: string;
    student_id: string;
    relationship?: RelationshipType;
    is_primary?: boolean;
    can_view_fees?: boolean;
    can_view_marks?: boolean;
    can_view_attendance?: boolean;
}

export interface UpdateParentAccessData {
    relationship?: RelationshipType;
    is_primary?: boolean;
    can_view_fees?: boolean;
    can_view_marks?: boolean;
    can_view_attendance?: boolean;
}

// ─── Notice Repository ───────────────────────────────────────────────────────

export class NoticeRepository extends BaseRepository<Notice> {
    constructor(schema: string) {
        super(Notice, schema);
    }

    async findAllPublished(filters: NoticeFilters): Promise<Notice[]> {
        const where: WhereOptions = {
            deleted_at: null,
            is_published: true,
        };

        if (filters.targetAudience) {
            // Include notices targeted at 'all' or the specific audience
            const audiences = ['all', filters.targetAudience];
            Object.assign(where, { target_audience: audiences });
        }

        if (filters.classId) {
            Object.assign(where, { class_id: filters.classId });
        }

        if (filters.pinned !== undefined) {
            Object.assign(where, { is_pinned: filters.pinned });
        }

        const include: Includeable[] = [];
        if (filters.includeCreator) {
            include.push({ association: 'creator', attributes: ['id', 'email', 'first_name', 'last_name'] });
        }

        return this.findAll({
            where,
            include,
            order: [
                ['is_pinned', 'DESC'],
                ['published_at', 'DESC'],
            ],
        });
    }

    async findAllWithCreator(): Promise<Notice[]> {
        return this.findAll({
            where: { deleted_at: null } as WhereOptions,
            include: [{ association: 'creator', attributes: ['id', 'email', 'first_name', 'last_name'] }],
            order: [['created_at', 'DESC']],
        });
    }

    async findById(id: string): Promise<Notice | null> {
        return this.findOne({
            where: { id, deleted_at: null } as WhereOptions,
            include: [{ association: 'creator', attributes: ['id', 'email', 'first_name', 'last_name'] }],
        });
    }

    async createNotice(data: CreateNoticeData, transaction?: Transaction): Promise<Notice> {
        return this.create(data, { transaction });
    }

    async updateNotice(id: string, data: UpdateNoticeData, transaction?: Transaction): Promise<[number]> {
        return this.update(data, { id, deleted_at: null } as WhereOptions, { transaction });
    }

    async softDeleteNotice(id: string): Promise<number> {
        return this.softDelete({ id } as WhereOptions);
    }
}

// ─── Notification Repository ─────────────────────────────────────────────────

export class NotificationRepository extends BaseRepository<Notification> {
    constructor(
        schema: string,
        private readonly institutionId: string
    ) {
        super(Notification, schema);
    }

    async findByUser(userId: string, filters?: NotificationFilters): Promise<Notification[]> {
        const where: WhereOptions = {
            user_id: userId,
            institution_id: this.institutionId,
        };

        if (filters?.status) {
            Object.assign(where, { status: filters.status });
        }

        if (filters?.type) {
            Object.assign(where, { type: filters.type });
        }

        if (filters?.unreadOnly) {
            Object.assign(where, { read_at: null });
        }

        return this.findAll({
            where,
            order: [['created_at', 'DESC']],
            limit: 100,
        });
    }

    async findById(id: string): Promise<Notification | null> {
        return this.findOne({
            where: { id, institution_id: this.institutionId } as WhereOptions,
        });
    }

    async createNotification(data: CreateNotificationData, transaction?: Transaction): Promise<Notification> {
        return this.create({
            ...data,
            institution_id: this.institutionId,
        }, { transaction });
    }

    async bulkCreateNotifications(data: CreateNotificationData[], transaction?: Transaction): Promise<Notification[]> {
        return this.bulkCreate(
            data.map((entry) => ({
                ...entry,
                institution_id: this.institutionId,
            }))
        );
    }

    async updateNotification(id: string, data: UpdateNotificationData, transaction?: Transaction): Promise<[number]> {
        return this.update(
            data,
            { id, institution_id: this.institutionId } as WhereOptions,
            { transaction }
        );
    }

    async markAsRead(id: string): Promise<[number]> {
        return this.update(
            { read_at: new Date(), status: NotificationStatus.READ },
            { id, institution_id: this.institutionId } as WhereOptions
        );
    }

    async markAllAsRead(userId: string): Promise<[number]> {
        return this.update(
            { read_at: new Date(), status: NotificationStatus.READ },
            { user_id: userId, read_at: null, institution_id: this.institutionId } as WhereOptions
        );
    }

    async countUnread(userId: string): Promise<number> {
        return this.count({
            where: { user_id: userId, read_at: null, institution_id: this.institutionId } as WhereOptions,
        });
    }

    async findByIdempotencyKey(key: string): Promise<Notification | null> {
        return this.findOne({
            where: { idempotency_key: key, institution_id: this.institutionId } as WhereOptions,
        });
    }
}

// ─── Notification Template Repository ────────────────────────────────────────

export class NotificationTemplateRepository extends BaseRepository<NotificationTemplate> {
    constructor(
        schema: string,
        private readonly institutionId: string
    ) {
        super(NotificationTemplate, schema);
    }

    async findBySlug(slug: string): Promise<NotificationTemplate | null> {
        return this.findOne({
            where: { slug, institution_id: this.institutionId } as WhereOptions,
        });
    }

    async findById(id: string): Promise<NotificationTemplate | null> {
        return this.findOne({
            where: { id, institution_id: this.institutionId } as WhereOptions,
        });
    }

    async findByType(type: TemplateType): Promise<NotificationTemplate[]> {
        return this.findAll({
            where: { type, is_active: true, institution_id: this.institutionId } as WhereOptions,
        });
    }

    async findAllActive(): Promise<NotificationTemplate[]> {
        return this.findAll({
            where: { is_active: true, institution_id: this.institutionId } as WhereOptions,
            order: [['name', 'ASC']],
        });
    }

    async createTemplate(data: CreateTemplateData, transaction?: Transaction): Promise<NotificationTemplate> {
        return this.create({
            ...data,
            institution_id: this.institutionId,
        }, { transaction });
    }

    async updateTemplate(id: string, data: UpdateTemplateData, transaction?: Transaction): Promise<[number]> {
        return this.update(
            data,
            { id, institution_id: this.institutionId } as WhereOptions,
            { transaction }
        );
    }

    async deleteTemplate(id: string): Promise<number> {
        return this.hardDelete({ id, institution_id: this.institutionId } as WhereOptions);
    }
}

// ─── Parent Portal Access Repository ─────────────────────────────────────────

export class ParentPortalAccessRepository extends BaseRepository<ParentPortalAccess> {
    constructor(schema: string) {
        super(ParentPortalAccess, schema);
    }

    async findByParentUserId(parentUserId: string): Promise<ParentPortalAccess[]> {
        return this.findAll({
            where: { parent_user_id: parentUserId } as WhereOptions,
            include: [{ association: 'student' }],
        });
    }

    async findByParentAndStudent(parentUserId: string, studentId: string): Promise<ParentPortalAccess | null> {
        return this.findOne({
            where: {
                parent_user_id: parentUserId,
                student_id: studentId,
            } as WhereOptions,
        });
    }

    async hasAccess(parentUserId: string, studentId: string): Promise<boolean> {
        return this.exists({
            parent_user_id: parentUserId,
            student_id: studentId,
        } as WhereOptions);
    }

    async createAccess(data: CreateParentAccessData, transaction?: Transaction): Promise<ParentPortalAccess> {
        return this.create(data, { transaction });
    }

    async upsertAccess(data: CreateParentAccessData, transaction?: Transaction): Promise<ParentPortalAccess> {
        const [result] = await this.upsert(data);
        return result;
    }

    async updateAccess(id: string, data: UpdateParentAccessData, transaction?: Transaction): Promise<[number]> {
        return this.update(data, { id } as WhereOptions, { transaction });
    }

    async deleteAccess(id: string): Promise<number> {
        return this.hardDelete({ id } as WhereOptions);
    }

    async deleteByParentAndStudent(parentUserId: string, studentId: string): Promise<number> {
        return this.hardDelete({
            parent_user_id: parentUserId,
            student_id: studentId,
        } as WhereOptions);
    }
}

// ─── Factory function for schema-bound repositories ───────────────────────────

export function createCommunicationRepositories(schema: string, institutionId: string) {
    return {
        notice: new NoticeRepository(schema),
        notification: new NotificationRepository(schema, institutionId),
        template: new NotificationTemplateRepository(schema, institutionId),
        parentAccess: new ParentPortalAccessRepository(schema),
    };
}
