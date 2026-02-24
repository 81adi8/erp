import { baseApi } from '../../../core/api/baseApi';
import { API_TAGS } from '../../../core/config/constants';

export type NoticeType = 'general' | 'exam' | 'holiday' | 'event' | 'urgent';
export type TargetAudience = 'all' | 'students' | 'parents' | 'teachers' | 'staff';
export type NoticePriority = 'low' | 'normal' | 'high' | 'urgent';

type NoticeSource = Record<string, unknown>;

export interface Notice {
    id: string;
    title: string;
    content: string;
    noticeType: NoticeType;
    targetAudience: TargetAudience;
    classId?: string;
    sectionId?: string;
    priority: NoticePriority;
    isPublished: boolean;
    isPinned: boolean;
    publishedAt?: string;
    expiresAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface NoticeFilters {
    noticeType?: NoticeType;
    targetAudience?: TargetAudience;
    status?: 'published' | 'draft';
}

export interface NoticePayload {
    title: string;
    content: string;
    noticeType: NoticeType;
    targetAudience: TargetAudience;
    classId?: string;
    sectionId?: string;
    priority?: NoticePriority;
    expiresAt?: string;
    isPinned?: boolean;
}

function asString(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function asOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function asBoolean(value: unknown): boolean {
    return value === true;
}

function normalizePriority(raw: unknown): NoticePriority {
    const value = asString(raw).toLowerCase();
    if (value === 'low' || value === 'high' || value === 'urgent') {
        return value;
    }
    return 'normal';
}

function normalizeNoticeType(raw: unknown): NoticeType {
    const value = asString(raw).toLowerCase();
    if (value === 'exam' || value === 'holiday' || value === 'event' || value === 'urgent') {
        return value;
    }
    return 'general';
}

function normalizeAudience(raw: unknown): TargetAudience {
    const value = asString(raw).toLowerCase();
    if (value === 'students' || value === 'parents' || value === 'teachers' || value === 'staff') {
        return value;
    }
    return 'all';
}

function normalizeNotice(source: NoticeSource): Notice {
    const createdAt = asString(source.createdAt ?? source.created_at);
    const updatedAt = asString(source.updatedAt ?? source.updated_at);

    return {
        id: asString(source.id),
        title: asString(source.title),
        content: asString(source.content),
        noticeType: normalizeNoticeType(source.noticeType ?? source.notice_type),
        targetAudience: normalizeAudience(source.targetAudience ?? source.target_audience),
        classId: asOptionalString(source.classId ?? source.class_id),
        sectionId: asOptionalString(source.sectionId ?? source.section_id),
        priority: normalizePriority(source.priority),
        isPublished: asBoolean(source.isPublished ?? source.is_published),
        isPinned: asBoolean(source.isPinned ?? source.is_pinned),
        publishedAt: asOptionalString(source.publishedAt ?? source.published_at),
        expiresAt: asOptionalString(source.expiresAt ?? source.expires_at),
        createdAt,
        updatedAt: updatedAt || createdAt,
    };
}

function normalizeNoticeList(response: { success: boolean; data: NoticeSource[] }) {
    return {
        ...response,
        data: response.data.map((notice) => normalizeNotice(notice)),
    };
}

function normalizeNoticeItem(response: { success: boolean; data: NoticeSource }) {
    return {
        ...response,
        data: normalizeNotice(response.data),
    };
}

export const noticesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getNotices: builder.query<{ success: boolean; data: Notice[] }, NoticeFilters | void>({
            query: () => ({
                url: '/school/notices/all',
                method: 'GET',
            }),
            transformResponse: (response: { success: boolean; data: NoticeSource[] }) => normalizeNoticeList(response),
            providesTags: [{ type: API_TAGS.ANNOUNCEMENTS, id: 'LIST' }],
        }),
        createNotice: builder.mutation<{ success: boolean; data: Notice }, NoticePayload>({
            query: (body) => ({
                url: '/school/notices',
                method: 'POST',
                body,
            }),
            transformResponse: (response: { success: boolean; data: NoticeSource }) => normalizeNoticeItem(response),
            invalidatesTags: [{ type: API_TAGS.ANNOUNCEMENTS, id: 'LIST' }],
        }),
        updateNotice: builder.mutation<{ success: boolean; data: Notice }, { id: string; body: Partial<NoticePayload> & { isPublished?: boolean } }>({
            query: ({ id, body }) => ({
                url: `/school/notices/${id}`,
                method: 'PATCH',
                body,
            }),
            transformResponse: (response: { success: boolean; data: NoticeSource }) => normalizeNoticeItem(response),
            invalidatesTags: (_result, _error, { id }) => [
                { type: API_TAGS.ANNOUNCEMENTS, id },
                { type: API_TAGS.ANNOUNCEMENTS, id: 'LIST' },
            ],
        }),
        deleteNotice: builder.mutation<{ success: boolean; message?: string }, string>({
            query: (id) => ({
                url: `/school/notices/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_result, _error, id) => [
                { type: API_TAGS.ANNOUNCEMENTS, id },
                { type: API_TAGS.ANNOUNCEMENTS, id: 'LIST' },
            ],
        }),
        publishNotice: builder.mutation<{ success: boolean; data: Notice }, string>({
            query: (id) => ({
                url: `/school/notices/${id}`,
                method: 'PATCH',
                body: {
                    isPublished: true,
                    publishedAt: new Date().toISOString(),
                },
            }),
            transformResponse: (response: { success: boolean; data: NoticeSource }) => normalizeNoticeItem(response),
            invalidatesTags: (_result, _error, id) => [
                { type: API_TAGS.ANNOUNCEMENTS, id },
                { type: API_TAGS.ANNOUNCEMENTS, id: 'LIST' },
            ],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetNoticesQuery,
    useCreateNoticeMutation,
    useUpdateNoticeMutation,
    useDeleteNoticeMutation,
    usePublishNoticeMutation,
} = noticesApi;
