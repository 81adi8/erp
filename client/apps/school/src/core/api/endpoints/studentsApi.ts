import { baseApi } from '../baseApi';
import type { ApiResponse, PaginatedResponse } from '../baseApi';

type JsonObject = Record<string, unknown>;

interface StudentMutationResult {
    id?: string;
    studentId?: string;
    admittedCount?: number;
    enrolledCount?: number;
    message?: string;
}

// Student types
export interface Student {
    id: string;
    userId: string;
    admission_number: string;
    roll_number?: string;
    mother_tongue?: string;
    admission_date: string;
    date_of_birth?: string;
    gender?: 'male' | 'female' | 'other';
    blood_group?: string;
    religion?: string;
    caste?: string;
    category?: string;
    aadhar_number?: string;
    phone?: string;
    email?: string;
    current_address?: string;
    permanent_address?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    emergency_contact_relation?: string;
    family_details?: JsonObject;
    previous_school_details?: JsonObject;
    is_transport_required: boolean;
    is_hostel_required: boolean;
    medical_history?: string;
    is_active: boolean;
    document_urls?: JsonObject;
    metadata?: JsonObject;
    user?: {
        first_name: string;
        last_name: string;
        email: string;
        phone?: string;
    };
    enrollments?: Array<{
        id: string;
        class_id: string;
        section_id: string;
        academic_year_id: string;
        roll_number?: string;
        status: string;
        is_repeater: boolean;
        scholarship_details?: JsonObject;
    }>;
}

export interface AdmitStudentData {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    academicYearId?: string;
    classId?: string;
    sectionId?: string;
    rollNumber?: string;
    admissionNumber?: string;
    admissionDate?: string;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other';
    bloodGroup?: string;
    religion?: string;
    caste?: string;
    category?: string;
    aadharNumber?: string;
    motherTongue?: string;
    currentAddress?: string;
    permanentAddress?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;
    parentName?: string;
    parentPhone?: string;
    familyDetails?: JsonObject;
    previousSchoolDetails?: JsonObject;
    isTransportRequired?: boolean;
    isHostelRequired?: boolean;
    medicalHistory?: string;
    remarks?: string;
    metadata?: JsonObject;
    documentUrls?: JsonObject;
}

export interface StudentQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    classId?: string;
    sectionId?: string;
    academicYearId?: string;
    status?: string;
}

export interface UpdateStudentData extends Partial<AdmitStudentData> {
    is_active?: boolean;
}

export interface EnrollStudentData {
    studentId: string;
    academicYearId: string;
    classId: string;
    sectionId: string;
    rollNumber?: string;
    remarks?: string;
    isRepeater?: boolean;
}

// Students API endpoints
export const studentsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Get all students with pagination
        getStudents: builder.query<PaginatedResponse<Student>, StudentQueryParams>({
            query: (params) => ({
                url: '/school/students',
                params,
            }),
            providesTags: (result) =>
                result
                    ? [
                        ...result.data.map(({ id }) => ({ type: 'Students' as const, id })),
                        { type: 'Students' as const, id: 'LIST' },
                    ]
                    : [{ type: 'Students' as const, id: 'LIST' }],
        }),

        // Admit student (New implementation)
        admitStudent: builder.mutation<ApiResponse<StudentMutationResult>, AdmitStudentData>({
            query: (data) => ({
                url: '/school/students/admit',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [{ type: 'Students' as const, id: 'LIST' }],
        }),

        // Enroll student
        enrollStudent: builder.mutation<ApiResponse<StudentMutationResult>, EnrollStudentData>({
            query: (data) => ({
                url: '/school/students/enroll',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: (_result, _error, { studentId }) => [
                { type: 'Students' as const, id: studentId },
                { type: 'Students' as const, id: 'LIST' },
            ],
        }),

        // Bulk admit students
        bulkAdmitStudents: builder.mutation<ApiResponse<StudentMutationResult>, { students: AdmitStudentData[] }>({
            query: (data) => ({
                url: '/school/students/bulk-admit',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [{ type: 'Students' as const, id: 'LIST' }],
        }),

        // Get single student
        getStudentById: builder.query<ApiResponse<Student>, string>({
            query: (id) => `/school/students/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'Students' as const, id }],
        }),

        // Legacy/Basic Create (Alternative)
        createStudent: builder.mutation<ApiResponse<Student>, AdmitStudentData>({
            query: (data) => ({
                url: '/school/students/admit',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [{ type: 'Students' as const, id: 'LIST' }],
        }),

        // Update student
        updateStudent: builder.mutation<ApiResponse<Student>, { id: string; data: UpdateStudentData }>({
            query: ({ id, data }) => ({
                url: `/school/students/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Students' as const, id },
                { type: 'Students' as const, id: 'LIST' },
            ],
        }),

        // Delete student
        deleteStudent: builder.mutation<ApiResponse<null>, string>({
            query: (id) => ({
                url: `/school/students/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'Students' as const, id: 'LIST' }],
        }),
    }),
    overrideExisting: false,
});

// Export hooks
export const {
    useGetStudentsQuery,
    useLazyGetStudentsQuery,
    useGetStudentByIdQuery,
    useLazyGetStudentByIdQuery,
    useAdmitStudentMutation,
    useEnrollStudentMutation,
    useBulkAdmitStudentsMutation,
    useCreateStudentMutation,
    useUpdateStudentMutation,
    useDeleteStudentMutation,
} = studentsApi;
