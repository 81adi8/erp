-- ============================================================================
-- 20260219_admission_number_unique_constraint.sql
-- INTEGRITY: Prevents duplicate admission numbers at database level
-- ============================================================================
-- This is Layer 3 of the integrity protection:
-- Layer 1: Validation middleware (DTO validation)
-- Layer 2: Service guard (existence check before create)
-- Layer 3: DB constraint (race condition protection - THIS FILE)
--
-- This migration MUST be run on EACH tenant schema.
-- The partial index only applies to active (non-deleted) students.
-- ============================================================================

-- ============================================================================
-- PARTIAL UNIQUE INDEX: One admission_number per tenant (active students only)
-- ============================================================================
-- This index only applies when is_active = true, allowing:
-- - Soft-deleted students to keep their admission numbers
-- - Re-admission with same number after proper archival
-- - But NOT duplicate active admission numbers

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_admission_number_active
ON students (admission_number)
WHERE is_active = true AND admission_number IS NOT NULL;

-- ============================================================================
-- COMMENT FOR DOCUMENTATION
-- ============================================================================
COMMENT ON INDEX idx_students_admission_number_active IS 
'Ensures admission_number is unique among active students. Critical for data integrity. Soft-deleted students are excluded.';

-- ============================================================================
-- VALIDATION: Check for existing duplicates before deployment
-- ============================================================================
-- Run this query to identify any existing duplicates that need cleanup:
-- 
-- SELECT admission_number, COUNT(*) as count
-- FROM students
-- WHERE is_active = true AND admission_number IS NOT NULL
-- GROUP BY admission_number
-- HAVING COUNT(*) > 1;
--
-- If duplicates exist, they must be resolved before this migration runs,
-- or the migration will fail.
-- ============================================================================

-- ============================================================================
-- ADDITIONAL INDEX FOR PERFORMANCE
-- ============================================================================

-- Index for admission number lookups (common in student search)
CREATE INDEX IF NOT EXISTS idx_students_admission_number
ON students (admission_number)
WHERE admission_number IS NOT NULL;