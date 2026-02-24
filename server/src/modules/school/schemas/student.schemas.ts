/**
 * Student Zod Schemas — Production Hardening
 *
 * Provides validation schemas for all student-related DTOs.
 * These schemas enforce input validation at the API boundary.
 */

import { z } from 'zod';
import { ParentRelationType } from '../../../database/models/school/academics/student/ParentProfile.model';
import { StudentDocumentType } from '../../../database/models/school/academics/student/StudentDocument.model';
import { PromotionDecision } from '../../../database/models/school/academics/student/PromotionHistory.model';

// ============================================================================
// Common Validators
// ============================================================================

/**
 * Pagination query schema with security caps
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20), // CAPPED at 100
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['ASC', 'DESC']).optional(),
  search: z.string().max(200).optional(),
});

/**
 * UUID validation
 */
const uuidSchema = z.string().uuid();

/**
 * Optional string with max length
 */
const optionalString = (maxLength: number) => 
  z.string().max(maxLength).optional();

/**
 * Required string with min and max length
 */
const requiredString = (min: number, max: number) => 
  z.string().min(min).max(max);

/**
 * Email validation
 */
const emailSchema = z.string().email().max(255).toLowerCase();

/**
 * Phone validation (basic international format)
 */
const phoneSchema = z.string()
  .regex(/^[\d\s\-+()]{7,20}$/, 'Invalid phone number format')
  .max(20)
  .optional();

/**
 * Date string validation (YYYY-MM-DD)
 */
const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .optional();

/**
 * Gender enum
 */
const genderSchema = z.enum(['male', 'female', 'other']).optional();

/**
 * Blood group validation
 */
const bloodGroupSchema = z.enum([
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'
]).optional();

// ============================================================================
// Address Schema
// ============================================================================

const AddressSchema = z.object({
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  pincode: z.string().max(20).optional(),
}).optional();

// ============================================================================
// Family Details Schema
// ============================================================================

const FamilyDetailsSchema = z.object({
  fatherName: z.string().max(100).optional(),
  fatherOccupation: z.string().max(100).optional(),
  fatherPhone: phoneSchema,
  fatherEmail: emailSchema.optional(),
  motherName: z.string().max(100).optional(),
  motherOccupation: z.string().max(100).optional(),
  motherPhone: phoneSchema,
  motherEmail: emailSchema.optional(),
  guardianName: z.string().max(100).optional(),
  guardianRelation: z.string().max(50).optional(),
  guardianPhone: phoneSchema,
}).optional();

// ============================================================================
// Previous School Details Schema
// ============================================================================

const PreviousSchoolSchema = z.object({
  schoolName: z.string().max(200).optional(),
  lastClass: z.string().max(50).optional(),
  percentage: z.number().min(0).max(100).optional(),
  yearOfPassing: z.number().int().min(1990).max(new Date().getFullYear()).optional(),
  reasonForLeaving: z.string().max(500).optional(),
}).optional();

// ============================================================================
// Medical History Schema
// ============================================================================

const MedicalHistorySchema = z.object({
  allergies: z.array(z.string().max(100)).max(20).optional(),
  medications: z.array(z.string().max(100)).max(20).optional(),
  conditions: z.array(z.string().max(100)).max(20).optional(),
  emergencyNotes: z.string().max(1000).optional(),
}).optional();

// ============================================================================
// Student Admission Schema
// ============================================================================

export const AdmitStudentSchema = z.object({
  // Required fields
  firstName: requiredString(1, 100),
  lastName: requiredString(1, 100),
  admissionNumber: requiredString(1, 50),
  academicYearId: uuidSchema,
  classId: uuidSchema,
  
  // Optional personal info
  email: emailSchema.optional(),
  phone: phoneSchema,
  dateOfBirth: dateSchema,
  gender: genderSchema,
  bloodGroup: bloodGroupSchema,
  
  // Optional demographic info
  religion: optionalString(50),
  caste: optionalString(50),
  category: z.enum(['General', 'OBC', 'SC', 'ST', 'EWS', 'Other']).optional(),
  aadharNumber: z.string()
    .regex(/^\d{12}$/, 'Aadhar must be 12 digits')
    .optional(),
  
  // Address
  currentAddress: AddressSchema,
  permanentAddress: AddressSchema,
  
  // Emergency contact
  emergencyContactName: optionalString(100),
  emergencyContactPhone: phoneSchema,
  emergencyContactRelation: optionalString(50),
  
  // Family & Previous school
  familyDetails: FamilyDetailsSchema,
  previousSchoolDetails: PreviousSchoolSchema,
  
  // Medical
  medicalHistory: MedicalHistorySchema,
  
  // Transport & Hostel
  isTransportRequired: z.boolean().optional(),
  isHostelRequired: z.boolean().optional(),
  
  // Section & Roll Number
  sectionId: uuidSchema.optional(),
  rollNumber: optionalString(20),
  
  // Admission date
  admissionDate: dateSchema,
  
  // Remarks
  remarks: optionalString(1000),
});

// ============================================================================
// Student Update Schema
// ============================================================================

export const UpdateStudentSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: phoneSchema,
  email: emailSchema.optional(),
  dateOfBirth: dateSchema,
  gender: genderSchema,
  bloodGroup: bloodGroupSchema,
  religion: optionalString(50),
  caste: optionalString(50),
  category: z.enum(['General', 'OBC', 'SC', 'ST', 'EWS', 'Other']).optional(),
  aadharNumber: z.string()
    .regex(/^\d{12}$/, 'Aadhar must be 12 digits')
    .optional(),
  currentAddress: AddressSchema,
  permanentAddress: AddressSchema,
  emergencyContactName: optionalString(100),
  emergencyContactPhone: phoneSchema,
  emergencyContactRelation: optionalString(50),
  familyDetails: FamilyDetailsSchema,
  medicalHistory: MedicalHistorySchema,
  isTransportRequired: z.boolean().optional(),
  isHostelRequired: z.boolean().optional(),
  remarks: optionalString(1000),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// ============================================================================
// Student Enrollment Schema
// ============================================================================

export const EnrollStudentSchema = z.object({
  studentId: uuidSchema,
  academicYearId: uuidSchema,
  classId: uuidSchema,
  sectionId: uuidSchema.optional(),
  rollNumber: optionalString(20),
  isRepeater: z.boolean().optional(),
  remarks: optionalString(1000),
});

// ============================================================================
// Bulk Admit Schema
// ============================================================================

export const BulkAdmitSchema = z.object({
  students: z.array(AdmitStudentSchema).min(1).max(100), // Max 100 at a time
});

// ============================================================================
// Student ID Param Schema
// ============================================================================

export const StudentIdParamSchema = z.object({
  id: uuidSchema,
});

// ============================================================================
// Student Search Query Schema
// ============================================================================

export const StudentSearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  classId: uuidSchema.optional(),
  sectionId: uuidSchema.optional(),
  academicYearId: uuidSchema.optional(),
});

// ============================================================================
// Get Students Query Schema
// ============================================================================

export const GetStudentsQuerySchema = PaginationQuerySchema.extend({
  classId: uuidSchema.optional(),
  sectionId: uuidSchema.optional(),
  academicYearId: uuidSchema.optional(),
  status: z.enum(['active', 'inactive', 'all']).optional(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type AdmitStudentDTO = z.infer<typeof AdmitStudentSchema>;
export type UpdateStudentDTO = z.infer<typeof UpdateStudentSchema>;
export type EnrollStudentDTO = z.infer<typeof EnrollStudentSchema>;
export type BulkAdmitDTO = z.infer<typeof BulkAdmitSchema>;
export type StudentIdParamDTO = z.infer<typeof StudentIdParamSchema>;
export type StudentSearchQueryDTO = z.infer<typeof StudentSearchQuerySchema>;
export type GetStudentsQueryDTO = z.infer<typeof GetStudentsQuerySchema>;

// ============================================================================
// Student documents, parents, promotion schemas
// ============================================================================

export const AddStudentDocumentSchema = z.object({
  documentType: z.nativeEnum(StudentDocumentType),
  fileName: z.string().min(1).max(255),
  fileUrl: z.string().url(),
  fileSize: z.number().int().positive().optional(),
  remarks: z.string().max(500).optional(),
});

export const CreateParentProfileSchema = z.object({
  firstName: requiredString(1, 100),
  lastName: requiredString(1, 100),
  phone: z.string().min(7).max(20),
  relation: z.nativeEnum(ParentRelationType),
  alternatePhone: z.string().min(7).max(20).optional(),
  email: emailSchema.optional(),
  occupation: optionalString(150),
  userId: uuidSchema.optional(),
  isActive: z.boolean().optional(),
});

export const LinkStudentParentSchema = z.object({
  studentId: uuidSchema,
  parentId: uuidSchema,
  relation: requiredString(1, 50),
  isPrimary: z.boolean().optional(),
});

export const SetPrimaryParentSchema = z.object({
  studentId: uuidSchema,
  parentId: uuidSchema,
});

export const StudentPromotionSchema = z.object({
  studentId: uuidSchema,
  fromAcademicYearId: uuidSchema,
  fromEnrollmentId: uuidSchema,
  fromClassId: uuidSchema,
  fromSectionId: uuidSchema,
  action: z.nativeEnum(PromotionDecision),
  toAcademicYearId: uuidSchema.optional(),
  toEnrollmentId: uuidSchema.optional(),
  toClassId: uuidSchema.optional(),
  toSectionId: uuidSchema.optional(),
  finalPercentage: z.number().min(0).max(100).optional(),
  finalGrade: z.string().max(20).optional(),
  resultStatus: z.string().max(50).optional(),
  remarks: z.string().max(1000).optional(),
  compartmentSubjects: z.array(z.string().max(100)).max(20).optional(),
  isAutomatic: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});