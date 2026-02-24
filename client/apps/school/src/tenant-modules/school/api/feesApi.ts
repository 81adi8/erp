/**
 * Fees API - RTK Query endpoints for fee management
 * Connected to backend: /school/fees/*
 */
import { baseApi } from '../../../core/api/baseApi';
import { API_TAGS } from '../../../core/config/constants';

// ============================================================================
// TYPES
// ============================================================================

export interface FeeCategory {
    id: string;
    name: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

export interface FeeStructure {
    id: string;
    name: string;
    academic_year: string;
    class_id?: string;
    category_id?: string;
    category_name?: string;
    amount: number;
    due_date?: string;
    created_at: string;
}

export interface FeePayment {
    id: string;
    student_id: string;
    student_name?: string;
    fee_structure_id?: string;
    fee_name?: string;
    amount_paid: number;
    payment_date: string;
    payment_method: 'cash' | 'online' | 'manual';
    transaction_ref?: string;
    remarks?: string;
    receipt_number: string;
    collected_by?: string;
    status: 'paid' | 'pending' | 'failed';
    created_at: string;
}

export interface FeeSummary {
    total_payments: number;
    total_collected: number;
    paid_count: number;
    pending_count: number;
    today_collection: number;
    totalAssigned?: number;
    totalOutstanding?: number;
    collectionPercentage?: number;
}

export interface FeeDueLineItem {
    feeStructureId: string;
    feeCategoryId?: string;
    feeName?: string;
    amount: number;
    paidAmount: number;
    outstandingAmount: number;
    dueDate?: string;
    daysOverdue?: number;
}

export interface FeeDuesResponse {
    studentId: string;
    totalAssigned: number;
    totalPaid: number;
    outstanding: number;
    dues: FeeDueLineItem[];
}

export interface FeeSummaryFilters {
    classId?: string;
    sectionId?: string;
    academicYearId?: string;
}

export interface CreateCategoryDTO {
    name: string;
    description?: string;
}

export interface CreateStructureDTO {
    name: string;
    academicYear: string;
    classId?: string;
    categoryId?: string;
    amount: number;
    dueDate?: string;
}

export interface CreatePaymentDTO {
    studentId: string;
    feeStructureId: string;
    academicYearId?: string;
    amountPaid: number;
    paymentDate?: string;
    paymentMethod?: 'cash' | 'cheque' | 'online' | 'upi' | 'dd' | 'manual';
    paymentMode?: 'cash' | 'cheque' | 'online' | 'upi' | 'dd';
    transactionRef?: string;
    paymentReference?: string;
    remarks?: string;
    status?: 'success' | 'pending' | 'failed' | 'refunded' | 'paid';
}

export interface PaymentFilters {
    studentId?: string;
    status?: string;
    from?: string;
    to?: string;
}

export interface StructureFilters {
    academicYear?: string;
    classId?: string;
}

export interface ApplyDiscountDTO {
    studentId: string;
    feeStructureId: string;
    academicYearId: string;
    discountId?: string;
    discountOverrideAmount?: number;
}

// ============================================================================
// API
// ============================================================================

export const feesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // ── Fee Summary / Dashboard ────────────────────────────────────────
        getFeeSummary: builder.query<{ success: boolean; data: FeeSummary }, FeeSummaryFilters | void>({
            query: (params) => ({
                url: '/school/fees/summary',
                params: {
                    classId: params?.classId || undefined,
                    sectionId: params?.sectionId || undefined,
                    academicYearId: params?.academicYearId || undefined,
                },
            }),
            providesTags: [{ type: API_TAGS.FEES, id: 'SUMMARY' }],
            transformResponse: (response: { success: boolean; data: FeeSummary }) => response,
        }),

        // ── Fee Categories ──────────────────────────────────────────────────
        getFeeCategories: builder.query<{ success: boolean; data: FeeCategory[] }, void>({
            query: () => '/school/fees/categories',
            providesTags: [{ type: API_TAGS.FEES, id: 'CATEGORIES' }],
            transformResponse: (response: { success: boolean; data: FeeCategory[] }) => response,
        }),

        createFeeCategory: builder.mutation<{ success: boolean; data: FeeCategory }, CreateCategoryDTO>({
            query: (body) => ({
                url: '/school/fees/categories',
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: API_TAGS.FEES, id: 'CATEGORIES' }],
        }),

        // ── Fee Structures (Assign Fees) ────────────────────────────────────
        getFeeStructures: builder.query<{ success: boolean; data: FeeStructure[] }, StructureFilters>({
            query: (params) => ({
                url: '/school/fees/structures',
                params: {
                    academicYear: params.academicYear || undefined,
                    classId: params.classId || undefined,
                },
            }),
            providesTags: [{ type: API_TAGS.FEES, id: 'STRUCTURES' }],
            transformResponse: (response: { success: boolean; data: FeeStructure[] }) => response,
        }),

        createFeeStructure: builder.mutation<{ success: boolean; data: FeeStructure }, CreateStructureDTO>({
            query: (body) => ({
                url: '/school/fees/structures',
                method: 'POST',
                body,
            }),
            invalidatesTags: [{ type: API_TAGS.FEES, id: 'STRUCTURES' }],
        }),

        // ── Fee Payments ────────────────────────────────────────────────────
        getFeePayments: builder.query<{ success: boolean; data: FeePayment[] }, PaymentFilters>({
            query: (params) => ({
                url: '/school/fees/payments',
                params: {
                    studentId: params.studentId || undefined,
                    status: params.status || undefined,
                    from: params.from || undefined,
                    to: params.to || undefined,
                },
            }),
            providesTags: [{ type: API_TAGS.FEES, id: 'PAYMENTS' }],
            transformResponse: (response: { success: boolean; data: FeePayment[] }) => response,
        }),

        getStudentPayments: builder.query<{ success: boolean; data: FeePayment[] }, string>({
            query: (studentId) => `/school/fees/payments/student/${studentId}`,
            providesTags: (_result, _error, studentId) => [{ type: API_TAGS.FEES, id: `PAYMENTS_${studentId}` }],
            transformResponse: (response: { success: boolean; data: FeePayment[] }) => response,
        }),

        getFeeDues: builder.query<
            { success: boolean; data: FeeDuesResponse },
            { studentId: string; academicYearId?: string }
        >({
            query: ({ studentId, academicYearId }) => ({
                url: `/school/fees/dues/student/${studentId}`,
                params: {
                    academicYearId: academicYearId || undefined,
                },
            }),
            providesTags: (_result, _error, { studentId }) => [{ type: API_TAGS.FEES, id: `DUES_${studentId}` }],
        }),

        createFeePayment: builder.mutation<{ success: boolean; data: FeePayment }, CreatePaymentDTO>({
            query: (body) => ({
                url: '/school/fees/payments',
                method: 'POST',
                body: {
                    studentId: body.studentId,
                    feeStructureId: body.feeStructureId,
                    academicYearId: body.academicYearId,
                    amountPaid: body.amountPaid,
                    paymentDate: body.paymentDate,
                    paymentMethod: body.paymentMethod,
                    paymentMode: body.paymentMode,
                    transactionRef: body.transactionRef,
                    paymentReference: body.paymentReference,
                    remarks: body.remarks,
                    status: body.status,
                },
            }),
            invalidatesTags: [
                { type: API_TAGS.FEES, id: 'PAYMENTS' },
                { type: API_TAGS.FEES, id: 'SUMMARY' },
            ],
        }),

        applyDiscount: builder.mutation<{ success: boolean; data: unknown }, ApplyDiscountDTO>({
            query: (body) => ({
                url: '/school/fees/discounts/apply',
                method: 'POST',
                body,
            }),
            invalidatesTags: [
                { type: API_TAGS.FEES, id: 'PAYMENTS' },
                { type: API_TAGS.FEES, id: 'SUMMARY' },
            ],
        }),
    }),
    overrideExisting: false,
});

// ============================================================================
// EXPORTS
// ============================================================================

export const {
    useGetFeeSummaryQuery,
    useGetFeeCategoriesQuery,
    useCreateFeeCategoryMutation,
    useGetFeeStructuresQuery,
    useCreateFeeStructureMutation,
    useGetFeePaymentsQuery,
    useGetStudentPaymentsQuery,
    useGetFeeDuesQuery,
    useCreateFeePaymentMutation,
    useApplyDiscountMutation,
} = feesApi;
