import { z } from 'zod';
import { ParentRelationType } from '../../../../database/models/school/academics/student/ParentProfile.model';
import { StudentDocumentType } from '../../../../database/models/school/academics/student/StudentDocument.model';
import { PromotionDecision } from '../../../../database/models/school/academics/student/PromotionHistory.model';

/**
 * Detailed Student Admission Schema
 */
export const AdmitStudentSchema = z.object({
    // Basic User Info
    email: z.string().email('Valid email is required'),
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    phone: z.string().optional(),

    // Academic Details
    academicYearId: z.string().uuid().optional(),
    classId: z.string().uuid().optional(),
    sectionId: z.string().uuid().optional(),
    rollNumber: z.string().optional(),
    admissionNumber: z.string().optional(),
    admissionDate: z.string().optional(),

    // Demographic Details
    dateOfBirth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    bloodGroup: z.string().optional(),
    religion: z.string().optional(),
    caste: z.string().optional(),
    category: z.string().optional(),
    aadharNumber: z.string().optional(),
    motherTongue: z.string().optional(),

    // Address
    currentAddress: z.string().optional(),
    permanentAddress: z.string().optional(),

    // Family & Contact
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    emergencyContactRelation: z.string().optional(),
    familyDetails: z.record(z.string(), z.any()).optional(),

    // History & Requirements
    previousSchoolDetails: z.record(z.string(), z.any()).optional(),
    isTransportRequired: z.boolean().optional(),
    isHostelRequired: z.boolean().optional(),

    // Medical & Remarks
    medicalHistory: z.string().optional(),
    remarks: z.string().optional(),

    // System
    metadata: z.record(z.string(), z.any()).optional(),
    documentUrls: z.record(z.string(), z.any()).optional(),
}).strict();

export type AdmitStudentDTO = z.infer<typeof AdmitStudentSchema>;

export const UpdateStudentSchema = z.object({
    // All fields optional for partial update
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    email: z.string().email().max(255).optional(),
    phone: z.string().max(20).optional(),
    dateOfBirth: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    bloodGroup: z.string().max(10).optional(),
    religion: z.string().max(50).optional(),
    caste: z.string().max(50).optional(),
    category: z.string().max(50).optional(),
    aadharNumber: z.string().max(12).optional(),
    currentAddress: z.string().max(500).optional(),
    permanentAddress: z.string().max(500).optional(),
    emergencyContactName: z.string().max(100).optional(),
    emergencyContactPhone: z.string().max(20).optional(),
    emergencyContactRelation: z.string().max(50).optional(),
    familyDetails: z.record(z.string(), z.any()).optional(),
    medicalHistory: z.string().max(2000).optional(),
    isTransportRequired: z.boolean().optional(),
    isHostelRequired: z.boolean().optional(),
    remarks: z.string().max(1000).optional(),
}).strict().refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
);

export type UpdateStudentDTO = z.infer<typeof UpdateStudentSchema>;

/**
 * Enrollment Schema
 */
export const EnrollStudentSchema = z.object({
    studentId: z.string().uuid('Student ID is required'),
    academicYearId: z.string().uuid('Academic Year is required'),
    classId: z.string().uuid('Class is required'),
    sectionId: z.string().uuid('Section is required'),
    rollNumber: z.string().optional(),
    remarks: z.string().optional(),
    isRepeater: z.boolean().optional().default(false)
}).strict();

export type EnrollStudentDTO = z.infer<typeof EnrollStudentSchema>;

/**
 * Bulk Admit Schema
 */
export const BulkAdmitSchema = z.object({
    students: z.array(AdmitStudentSchema).min(1, 'At least one student is required')
}).strict();

export type BulkAdmitDTO = z.infer<typeof BulkAdmitSchema>;

/**
 * Get Students Query Schema
 * PRODUCTION HARDENED: Pagination caps enforced
 */
export const GetStudentsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20), // CAPPED at 100
    search: z.string().max(200).optional(),
    classId: z.string().uuid().optional(),
    sectionId: z.string().uuid().optional(),
    academicYearId: z.string().uuid().optional()
}).strict();

export type GetStudentsQueryDTO = z.infer<typeof GetStudentsQuerySchema>;

/**
 * Student ID Parameter Schema
 */
export const StudentIdParamSchema = z.object({
    id: z.string().uuid('Invalid student ID')
}).strict();

export type StudentIdParamDTO = z.infer<typeof StudentIdParamSchema>;

export const AddStudentDocumentSchema = z.object({
    documentType: z.nativeEnum(StudentDocumentType),
    fileName: z.string().min(1).max(255),
    fileUrl: z.string().url(),
    fileSize: z.number().int().positive().optional(),
    remarks: z.string().max(500).optional(),
}).strict();

export type AddStudentDocumentDTO = z.infer<typeof AddStudentDocumentSchema>;

export const CreateParentProfileSchema = z.object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    phone: z.string().min(7).max(20),
    relation: z.nativeEnum(ParentRelationType),
    alternatePhone: z.string().min(7).max(20).optional(),
    email: z.string().email().max(255).optional(),
    occupation: z.string().max(150).optional(),
    userId: z.string().uuid().optional(),
    isActive: z.boolean().optional(),
}).strict();

export type CreateParentProfileDTO = z.infer<typeof CreateParentProfileSchema>;

export const LinkStudentParentSchema = z.object({
    studentId: z.string().uuid('Invalid student ID'),
    parentId: z.string().uuid('Invalid parent ID'),
    relation: z.string().min(1).max(50),
    isPrimary: z.boolean().optional(),
}).strict();

export type LinkStudentParentDTO = z.infer<typeof LinkStudentParentSchema>;

export const SetPrimaryParentSchema = z.object({
    studentId: z.string().uuid('Invalid student ID'),
    parentId: z.string().uuid('Invalid parent ID'),
}).strict();

export type SetPrimaryParentDTO = z.infer<typeof SetPrimaryParentSchema>;

export const StudentPromotionSchema = z.object({
    studentId: z.string().uuid('Invalid student ID'),
    fromAcademicYearId: z.string().uuid('Invalid from academic year ID'),
    fromEnrollmentId: z.string().uuid('Invalid from enrollment ID'),
    fromClassId: z.string().uuid('Invalid from class ID'),
    fromSectionId: z.string().uuid('Invalid from section ID'),
    action: z.nativeEnum(PromotionDecision),
    toAcademicYearId: z.string().uuid('Invalid to academic year ID').optional(),
    toEnrollmentId: z.string().uuid('Invalid to enrollment ID').optional(),
    toClassId: z.string().uuid('Invalid to class ID').optional(),
    toSectionId: z.string().uuid('Invalid to section ID').optional(),
    finalPercentage: z.number().min(0).max(100).optional(),
    finalGrade: z.string().max(20).optional(),
    resultStatus: z.string().max(50).optional(),
    remarks: z.string().max(1000).optional(),
    compartmentSubjects: z.array(z.string().max(100)).max(20).optional(),
    isAutomatic: z.boolean().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
}).strict();

export type StudentPromotionDTO = z.infer<typeof StudentPromotionSchema>;

// SEC-04: Search query validation schema
export const StudentSearchQuerySchema = z.object({
    q: z.string().min(1, 'Search query is required').max(100, 'Search query must be at most 100 characters'),
    search: z.string().min(1).max(100).optional(),
    limit: z.coerce.number().min(1).max(100).default(20),
}).passthrough();

export type StudentSearchQueryDTO = z.infer<typeof StudentSearchQuerySchema>;
