/**
 * Seed Helper
 * 
 * Creates mock test data for integration tests.
 * Mock version - returns in-memory objects without database persistence.
 */

import { randomUUID } from 'crypto';

// Helper to generate UUID
const uuid = () => randomUUID();

// ─── Academic Session ────────────────────────────────────────────────────────

export async function seedAcademicYear(
  schemaName: string,
  tenantId: string,
  options: {
    name?: string;
    isActive?: boolean;
  } = {}
) {
  const year = new Date().getFullYear();
  const name = options.name || `${year}-${year + 1}`;

  return {
    id: uuid(),
    institution_id: tenantId,
    name,
    start_date: new Date(year, 3, 1),
    end_date: new Date(year + 1, 2, 31),
    is_active: options.isActive ?? true,
  };
}

export async function seedAcademicSession(
  schemaName: string,
  tenantId: string,
  options: {
    name?: string;
    isActive?: boolean;
  } = {}
) {
  const year = new Date().getFullYear();
  const name = options.name || `Session ${year}-${year + 1}`;

  return {
    id: uuid(),
    institution_id: tenantId,
    name,
    start_date: new Date(year, 3, 1),
    end_date: new Date(year + 1, 2, 31),
    is_active: options.isActive ?? true,
  };
}

// ─── Class & Section ──────────────────────────────────────────────────────────

export async function seedClass(
  schemaName: string,
  tenantId: string,
  options: {
    name?: string;
    code?: string;
    academicYearId?: string;
  } = {}
) {
  const uniqueId = uuid().slice(0, 4);
  const name = options.name || `Class ${uniqueId}`;

  return {
    id: uuid(),
    institution_id: tenantId,
    name,
    code: options.code || name.replace(/\s+/g, '').toUpperCase(),
    academic_year_id: options.academicYearId,
    is_active: true,
  };
}

export async function seedSection(
  schemaName: string,
  tenantId: string,
  classId: string,
  options: {
    name?: string;
    capacity?: number;
  } = {}
) {
  return {
    id: uuid(),
    institution_id: tenantId,
    class_id: classId,
    name: options.name || 'A',
    capacity: options.capacity || 40,
    is_active: true,
  };
}

export async function seedClassWithSection(
  schemaName: string,
  tenantId: string,
  options: {
    className?: string;
    sectionName?: string;
    academicYearId?: string;
  } = {}
) {
  const classRecord = await seedClass(schemaName, tenantId, {
    name: options.className,
    academicYearId: options.academicYearId,
  });

  const section = await seedSection(schemaName, tenantId, classRecord.id, {
    name: options.sectionName,
  });

  return { class: classRecord, section };
}

// ─── Subject ──────────────────────────────────────────────────────────────────

export async function seedSubject(
  schemaName: string,
  tenantId: string,
  options: {
    name?: string;
    code?: string;
  } = {}
) {
  const name = options.name || `Subject ${uuid().slice(0, 4)}`;

  return {
    id: uuid(),
    institution_id: tenantId,
    name,
    code: options.code || name.substring(0, 3).toUpperCase(),
    is_active: true,
  };
}

// ─── Student ──────────────────────────────────────────────────────────────────

export async function seedStudent(
  schemaName: string,
  tenantId: string,
  options: {
    userId?: string;
    admissionNumber?: string;
    firstName?: string;
    lastName?: string;
  } = {}
) {
  const uniqueId = uuid().slice(0, 6);

  // Create user if not provided
  let userId = options.userId;
  if (!userId) {
    userId = uuid();
  }

  return {
    id: uuid(),
    user_id: userId,
    institution_id: tenantId,
    admission_number: options.admissionNumber || `ADM${uniqueId}`,
    is_active: true,
  };
}

export async function seedStudentWithEnrollment(
  schemaName: string,
  tenantId: string,
  options: {
    classId?: string;
    sectionId?: string;
    academicYearId?: string;
    firstName?: string;
    lastName?: string;
  } = {}
) {
  const student = await seedStudent(schemaName, tenantId, {
    firstName: options.firstName,
    lastName: options.lastName,
  });

  const enrollment = {
    id: uuid(),
    institution_id: tenantId,
    student_id: student.id,
    class_id: options.classId,
    section_id: options.sectionId,
    academic_year_id: options.academicYearId,
    status: 'ACTIVE',
    enrollment_date: new Date(),
    is_new_admission: true,
  };

  return { student, enrollment };
}

// ─── Fee Module ───────────────────────────────────────────────────────────────

export async function seedFeeCategory(
  schemaName: string,
  tenantId: string,
  academicYearId: string,
  options: {
    name?: string;
    description?: string;
  } = {}
) {
  return {
    id: uuid(),
    institution_id: tenantId,
    academic_year_id: academicYearId,
    name: options.name || `Fee Category ${uuid().slice(0, 4)}`,
    description: options.description || 'Test fee category',
    is_active: true,
  };
}

export async function seedFeeStructure(
  schemaName: string,
  tenantId: string,
  options: {
    feeCategoryId?: string;
    classId?: string;
    academicYearId?: string;
    amount?: number;
    frequency?: string;
  } = {}
) {
  return {
    id: uuid(),
    institution_id: tenantId,
    fee_category_id: options.feeCategoryId,
    class_id: options.classId,
    academic_year_id: options.academicYearId,
    amount: options.amount || 10000,
    frequency: options.frequency || 'one_time',
    is_active: true,
  };
}

export async function seedFeeDiscount(
  schemaName: string,
  tenantId: string,
  options: {
    name?: string;
    discountType?: 'percentage' | 'flat';
    discountValue?: number;
  } = {}
) {
  return {
    id: uuid(),
    institution_id: tenantId,
    name: options.name || `Discount ${uuid().slice(0, 4)}`,
    discount_type: options.discountType || 'percentage',
    discount_value: options.discountValue || 10,
    is_active: true,
  };
}

// ─── Examination Module ───────────────────────────────────────────────────────

export async function seedExam(
  schemaName: string,
  tenantId: string,
  academicYearId: string,
  options: {
    name?: string;
    type?: string;
  } = {}
) {
  return {
    id: uuid(),
    institution_id: tenantId,
    academic_year_id: academicYearId,
    name: options.name || `Exam ${uuid().slice(0, 4)}`,
    type: options.type || 'MID_TERM',
    status: 'draft',
    is_active: true,
  };
}

export async function seedExamSchedule(
  schemaName: string,
  tenantId: string,
  options: {
    examId?: string;
    subjectId?: string;
    classId?: string;
    date?: string;
    maxMarks?: number;
  } = {}
) {
  return {
    id: uuid(),
    institution_id: tenantId,
    exam_id: options.examId,
    subject_id: options.subjectId,
    class_id: options.classId,
    date: options.date || new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '12:00',
    max_marks: options.maxMarks || 100,
  };
}

// ─── Parent Portal ────────────────────────────────────────────────────────────

export async function seedParentAccess(
  schemaName: string,
  options: {
    parentUserId?: string;
    studentId?: string;
    relationship?: string;
    isPrimary?: boolean;
    canViewFees?: boolean;
    canViewMarks?: boolean;
    canViewAttendance?: boolean;
  } = {}
) {
  return {
    id: uuid(),
    parent_user_id: options.parentUserId,
    student_id: options.studentId,
    relationship: options.relationship || 'father',
    is_primary: options.isPrimary ?? true,
    can_view_fees: options.canViewFees ?? true,
    can_view_marks: options.canViewMarks ?? true,
    can_view_attendance: options.canViewAttendance ?? true,
  };
}

// ─── Full Setup Helpers ───────────────────────────────────────────────────────

/**
 * Setup a complete test environment with academic year, class, section
 */
export async function setupTestEnvironment(
  schemaName: string,
  tenantId: string
) {
  const academicYear = await seedAcademicYear(schemaName, tenantId);
  const academicSession = await seedAcademicSession(schemaName, tenantId);
  const { class: classRecord, section } = await seedClassWithSection(schemaName, tenantId, {
    academicYearId: academicYear.id,
  });
  const subject = await seedSubject(schemaName, tenantId);

  return {
    academicYear,
    academicSession,
    class: classRecord,
    section,
    subject,
  };
}

export default {
  seedAcademicYear,
  seedAcademicSession,
  seedClass,
  seedSection,
  seedClassWithSection,
  seedSubject,
  seedStudent,
  seedStudentWithEnrollment,
  seedFeeCategory,
  seedFeeStructure,
  seedFeeDiscount,
  seedExam,
  seedExamSchedule,
  seedParentAccess,
  setupTestEnvironment,
};