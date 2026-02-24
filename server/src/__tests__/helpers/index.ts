/**
 * Test Helpers Index
 * 
 * Exports all test helpers for easy importing.
 * These helpers work with the REAL Express app and database.
 */

// Test app - uses real Express app
export { default as app } from '../../app';

// Tenant schema management
export {
  TEST_TENANT,
  createTestSchema,
  dropTestSchema,
  generateTestSchemaName,
  type TestTenantContext,
} from './test-tenant';

// Auth helpers
export {
  getAdminToken,
  getTeacherToken,
  getStudentToken,
  getParentToken,
  getLockedUser,
  authHeaders,
  tenantHeaders,
  type TestUser,
} from './auth-helper';

// Seed helpers
export {
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
  type SeededAcademicYear,
  type SeededClass,
  type SeededSection,
  type SeededStudent,
} from './seed.helper';