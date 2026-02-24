// School Module API Services - Optimized RTK Query
// All school-specific API endpoints are lazy-loaded with this module

import { baseApi } from '../../../core/api/baseApi';
import { API_TAGS } from '../../../core/config/constants';

// Student-related types
interface Student {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    rollNumber: string;
    classId: string;
    className?: string;
    sectionName?: string;
    dateOfBirth?: string;
    gender?: string;
    status: 'active' | 'inactive' | 'graduated';
    parentPhone?: string;
    address?: string;
    createdAt: string;
    updatedAt: string;
}

interface QueryParams {
    page?: number;
    limit?: number;
    search?: string;
    classId?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export type StudentDocumentType =
    | 'birth_certificate'
    | 'transfer_certificate'
    | 'marksheet'
    | 'id_proof'
    | 'address_proof'
    | 'photo'
    | 'other';

export interface StudentDocument {
    id: string;
    studentId?: string;
    documentType: StudentDocumentType;
    fileName?: string;
    fileUrl: string;
    fileSize?: number;
    remarks?: string;
    isVerified?: boolean;
    verifiedBy?: string;
    verifiedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface UploadStudentDocumentPayload {
    studentId: string;
    documentType: StudentDocumentType;
    fileName?: string;
    fileUrl: string;
    fileSize?: number;
    remarks?: string;
}

export interface TransferCertificate {
    tcNumber?: string;
    issueDate?: string;
    fileUrl?: string;
    reason?: string;
    status?: string;
}

// School Students API
export const studentsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Get all students with pagination and filters
        getStudents: builder.query<PaginatedResponse<Student>, QueryParams>({
            query: (params) => ({
                url: '/school/students',
                params: {
                    page: params.page || 1,
                    limit: params.limit || 10,
                    ...params,
                },
            }),
            providesTags: (result) =>
                result
                    ? [
                        ...result.data.map(({ id }) => ({ type: API_TAGS.STUDENTS, id } as const)),
                        { type: API_TAGS.STUDENTS, id: 'LIST' },
                    ]
                    : [{ type: API_TAGS.STUDENTS, id: 'LIST' }],
            // Cache for 5 minutes
            keepUnusedDataFor: 300,
        }),

        // Get single student by ID
        getStudent: builder.query<{ data: Student }, string>({
            query: (id) => `/school/students/${id}`,
            providesTags: (_result, _error, id) => [{ type: API_TAGS.STUDENTS, id }],
        }),

        // Create new student
        createStudent: builder.mutation<{ data: Student }, Partial<Student>>({
            query: (student) => ({
                url: '/school/students/admit',
                method: 'POST',
                body: student,
            }),
            invalidatesTags: [{ type: API_TAGS.STUDENTS, id: 'LIST' }],
        }),

        // Update student
        updateStudent: builder.mutation<{ data: Student }, { id: string; data: Partial<Student> }>({
            query: ({ id, data }) => ({
                url: `/school/students/${id}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: API_TAGS.STUDENTS, id },
                { type: API_TAGS.STUDENTS, id: 'LIST' },
            ],
        }),

        // Delete student
        deleteStudent: builder.mutation<void, string>({
            query: (id) => ({
                url: `/school/students/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_result, _error, id) => [
                { type: API_TAGS.STUDENTS, id },
                { type: API_TAGS.STUDENTS, id: 'LIST' },
            ],
        }),

        // Bulk operations
        bulkDeleteStudents: builder.mutation<void, string[]>({
            query: (ids) => ({
                url: '/school/students/bulk-delete',
                method: 'POST',
                body: { ids },
            }),
            invalidatesTags: [{ type: API_TAGS.STUDENTS, id: 'LIST' }],
        }),

        getStudentDocuments: builder.query<{ success: boolean; data: StudentDocument[] }, string>({
            query: (studentId) => ({
                url: `/school/students/${studentId}/documents`,
                method: 'GET',
            }),
            providesTags: (_result, _error, studentId) => [{ type: API_TAGS.STUDENTS, id: `DOCS_${studentId}` }],
        }),

        uploadStudentDocument: builder.mutation<{ success: boolean; data: StudentDocument }, UploadStudentDocumentPayload>({
            query: ({ studentId, ...body }) => ({
                url: `/school/students/${studentId}/documents`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (_result, _error, { studentId }) => [
                { type: API_TAGS.STUDENTS, id: `DOCS_${studentId}` },
                { type: API_TAGS.STUDENTS, id: studentId },
            ],
        }),

        deleteStudentDocument: builder.mutation<{ success: boolean; message?: string }, { studentId: string; docId: string }>({
            query: ({ studentId, docId }) => ({
                url: `/school/students/${studentId}/documents/${docId}`,
                method: 'DELETE',
            }),
            invalidatesTags: (_result, _error, { studentId }) => [{ type: API_TAGS.STUDENTS, id: `DOCS_${studentId}` }],
        }),

        verifyStudentDocument: builder.mutation<{ success: boolean; data: StudentDocument }, { studentId: string; docId: string }>({
            query: ({ studentId, docId }) => ({
                url: `/school/students/${studentId}/documents/${docId}/verify`,
                method: 'PUT',
            }),
            invalidatesTags: (_result, _error, { studentId }) => [{ type: API_TAGS.STUDENTS, id: `DOCS_${studentId}` }],
        }),

        // Backend exposes GET /school/students/:id/transfer-certificate (no POST). Align frontend to use GET.
        issueTransferCertificate: builder.mutation<{ success: boolean; data: TransferCertificate }, string>({
            query: (studentId) => ({
                url: `/school/students/${studentId}/transfer-certificate`,
                method: 'GET',
            }),
            invalidatesTags: (_result, _error, studentId) => [{ type: API_TAGS.STUDENTS, id: `TC_${studentId}` }],
        }),

        getTransferCertificate: builder.query<{ success: boolean; data: TransferCertificate | null }, string>({
            query: (studentId) => ({
                url: `/school/students/${studentId}/transfer-certificate`,
                method: 'GET',
            }),
            providesTags: (_result, _error, studentId) => [{ type: API_TAGS.STUDENTS, id: `TC_${studentId}` }],
        }),
    }),
    overrideExisting: false,
});

// Export hooks
export const {
    useGetStudentsQuery,
    useGetStudentQuery,
    useCreateStudentMutation,
    useUpdateStudentMutation,
    useDeleteStudentMutation,
    useBulkDeleteStudentsMutation,
    useGetStudentDocumentsQuery,
    useUploadStudentDocumentMutation,
    useDeleteStudentDocumentMutation,
    useVerifyStudentDocumentMutation,
    useIssueTransferCertificateMutation,
    useGetTransferCertificateQuery,
    // Prefetch utilities
    usePrefetch,
} = studentsApi;
