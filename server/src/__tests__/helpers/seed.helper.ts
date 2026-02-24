/**
 * Seed Helper for Integration Tests
 * 
 * Provides functions to create mock test data.
 * Mock version - returns in-memory objects without database persistence.
 */

import { randomUUID } from 'crypto';

// Helper to generate UUID
const uuid = () => randomUUID();

export interface SeededAcademicYear {
  id: string;
  name: string;
}

export interface SeededClass {
  id: string;
  name: string;
  code: string;
}

export interface SeededSection {
  id: string;
  name: string;
  classId: string;
}

export interface SeededStudent {
  id: string;
  admissionNumber: string;
  userId: string;
}

/**
 * Seed an academic year
 */
export async function seedAcademicYear(_schema: string, name?: string): Promise<SeededAcademicYear> {
  const year = new Date().getFullYear();
  const yearName = name || `${year}-${year + 1}`;
  
  return {
    id: uuid(),
    name: yearName,
  };
}

/**
 * Seed a class
 */
export async function seedClass(
  _schema: string, 
  academicYearId?: string, 
  options?: { name?: string; code?: string }
): Promise<SeededClass> {
  const className = options?.name || `Class ${Math.floor(Math.random() * 12) + 1}`;
  const code = options?.code || className.replace(/\s+/g, '').toUpperCase();
  
  return {
    id: uuid(),
    name: className,
    code,
  };
}

/**
 * Seed a section
 */
export async function seedSection(
  _schema: string, 
  _classId?: string, 
  name?: string
): Promise<SeededSection> {
  const sectionName = name || 'A';
  const classId = _classId || uuid();
  
  return {
    id: uuid(),
    name: sectionName,
    classId,
  };
}

/**
 * Seed a student with enrollment
 */
export async function seedStudent(
  _schema: string, 
  _classId?: string, 
  _sectionId?: string, 
  _academicYearId?: string,
  options?: { admissionNumber?: string }
): Promise<SeededStudent> {
  const admissionNumber = options?.admissionNumber || `ADM${Date.now()}`;
  
  return {
    id: uuid(),
    admissionNumber,
    userId: uuid(),
  };
}

/**
 * Seed a fee category
 */
export async function seedFeeCategory(
  _schema: string,
  _academicYearId?: string,
  options?: { name?: string; description?: string }
): Promise<{ id: string; name: string }> {
  const name = options?.name || `Fee Category ${Date.now()}`;
  
  return {
    id: uuid(),
    name,
  };
}

/**
 * Seed a fee structure
 */
export async function seedFeeStructure(
  _schema: string,
  _classId?: string,
  _academicYearId?: string,
  options?: { feeCategoryId?: string; amount?: number }
): Promise<{ id: string; amount: number }> {
  const amount = options?.amount || 10000;
  
  return {
    id: uuid(),
    amount,
  };
}

/**
 * Seed a fee payment with receipt number
 */
export async function seedFeePayment(
  _schema: string,
  _studentId?: string,
  _academicYearId?: string,
  options?: { amount?: number; receiptNumber?: string }
): Promise<{ id: string; receiptNumber: string; amount: number }> {
  const amount = options?.amount || 5000;
  const receiptNumber = options?.receiptNumber || generateReceiptNumber();
  
  return {
    id: uuid(),
    receiptNumber,
    amount,
  };
}

/**
 * Generate a receipt number in format RCP-{YEAR}-{5digits}
 */
export function generateReceiptNumber(): string {
  const year = new Date().getFullYear();
  const digits = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `RCP-${year}-${digits}`;
}

/**
 * Seed an exam
 */
export async function seedExam(
  _schema: string,
  _academicYearId?: string,
  options?: { name?: string; type?: string }
): Promise<{ id: string; name: string }> {
  const name = options?.name || `Exam ${Date.now()}`;
  
  return {
    id: uuid(),
    name,
  };
}

/**
 * Seed an exam schedule
 */
export async function seedExamSchedule(
  _schema: string,
  _examId?: string,
  _classId?: string,
  options?: { subject?: string; maxMarks?: number }
): Promise<{ id: string; maxMarks: number }> {
  const maxMarks = options?.maxMarks || 100;
  
  return {
    id: uuid(),
    maxMarks,
  };
}

/**
 * Seed marks for a student
 */
export async function seedMarks(
  _schema: string,
  _examScheduleId?: string,
  _studentId?: string,
  options?: { marksObtained?: number; isAbsent?: boolean }
): Promise<{ id: string; marksObtained: number; grade: string }> {
  const isAbsent = options?.isAbsent ?? false;
  const marksObtained = isAbsent ? 0 : (options?.marksObtained ?? 75);
  const grade = calculateGrade(marksObtained);
  
  return {
    id: uuid(),
    marksObtained,
    grade,
  };
}

/**
 * Calculate grade based on percentage
 */
export function calculateGrade(marks: number, maxMarks: number = 100): string {
  const percentage = (marks / maxMarks) * 100;
  
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

/**
 * Seed parent portal access
 */
export async function seedParentAccess(
  _schema: string,
  _parentUserId?: string,
  _studentId?: string,
  options?: {
    relationship?: string;
    canViewFees?: boolean;
    canViewMarks?: boolean;
    canViewAttendance?: boolean;
  }
): Promise<{ id: string }> {
  return {
    id: uuid(),
  };
}

export default {
  seedAcademicYear,
  seedClass,
  seedSection,
  seedStudent,
  seedFeeCategory,
  seedFeeStructure,
  seedFeePayment,
  generateReceiptNumber,
  seedExam,
  seedExamSchedule,
  seedMarks,
  calculateGrade,
  seedParentAccess,
};