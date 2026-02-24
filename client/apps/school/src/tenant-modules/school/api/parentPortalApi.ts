/**
 * Parent Portal API - RTK Query endpoints
 * Connected to backend: /school/parent-portal/*
 */
import { baseApi } from '../../../core/api/baseApi';
import { API_TAGS } from '../../../core/config/constants';

// ============================================================================
// TYPES
// ============================================================================

export interface LinkedChild {
    id: string;
    firstName: string;
    lastName: string;
    rollNumber?: string;
    photo?: string;
    class_name?: string;
    section_name?: string;
    relationship: string;
    is_primary: boolean;
}

export interface ChildAttendance {
    date: string;
    status: 'present' | 'absent' | 'leave' | 'holiday';
    remarks?: string;
}

export interface ChildFee {
    id: string;
    student_id: string;
    fee_structure_id?: string;
    fee_name?: string;
    academic_year?: string;
    amount_paid: number;
    payment_date: string;
    payment_method: 'cash' | 'online' | 'manual';
    receipt_number: string;
    status: 'paid' | 'pending' | 'failed';
}

export interface ChildMark {
    id: string;
    student_id: string;
    exam_schedule_id: string;
    exam_name?: string;
    subject_name?: string;
    marks_obtained: number;
    max_marks: number;
    grade?: string;
    remarks?: string;
}

export interface ParentNotice {
    id: string;
    title: string;
    content: string;
    notice_type: string;
    published_at: string;
    expires_at?: string;
    is_pinned: boolean;
}

// ============================================================================
// API
// ============================================================================

export const parentPortalApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Get linked children
        getLinkedChildren: builder.query<{ success: boolean; data: LinkedChild[] }, void>({
            query: () => '/school/parent-portal/children',
            providesTags: [{ type: API_TAGS.PARENTS, id: 'CHILDREN' }],
            transformResponse: (response: { success: boolean; data: LinkedChild[] }) => response,
        }),

        // Get child attendance
        getChildAttendance: builder.query<{ success: boolean; data: ChildAttendance[] }, string>({
            query: (studentId) => `/school/parent-portal/students/${studentId}/attendance`,
            providesTags: (_result, _error, studentId) => [{ type: API_TAGS.ATTENDANCE, id: `PARENT_${studentId}` }],
            transformResponse: (response: { success: boolean; data: ChildAttendance[] }) => response,
        }),

        // Get child fees
        getChildFees: builder.query<{ success: boolean; data: ChildFee[] }, string>({
            query: (studentId) => `/school/parent-portal/students/${studentId}/fees`,
            providesTags: (_result, _error, studentId) => [{ type: API_TAGS.FEES, id: `PARENT_${studentId}` }],
            transformResponse: (response: { success: boolean; data: ChildFee[] }) => response,
        }),

        // Get child marks
        getChildMarks: builder.query<{ success: boolean; data: ChildMark[] }, string>({
            query: (studentId) => `/school/parent-portal/students/${studentId}/marks`,
            providesTags: (_result, _error, studentId) => [{ type: API_TAGS.MARKS, id: `PARENT_${studentId}` }],
            transformResponse: (response: { success: boolean; data: ChildMark[] }) => response,
        }),

        // Get parent notices
        getParentNotices: builder.query<{ success: boolean; data: ParentNotice[] }, void>({
            query: () => '/school/parent-portal/notices',
            providesTags: [{ type: API_TAGS.ANNOUNCEMENTS, id: 'PARENT' }],
            transformResponse: (response: { success: boolean; data: ParentNotice[] }) => response,
        }),
    }),
    overrideExisting: false,
});

// ============================================================================
// EXPORTS
// ============================================================================

export const {
    useGetLinkedChildrenQuery,
    useGetChildAttendanceQuery,
    useGetChildFeesQuery,
    useGetChildMarksQuery,
    useGetParentNoticesQuery,
} = parentPortalApi;