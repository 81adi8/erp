-- 20260219_enrollment_unique_constraint.sql
-- CRITICAL: Ensures a student can only have ONE active enrollment per academic session
-- This prevents double enrollment, double promotion, and data corruption

-- ============================================================================
-- PARTIAL UNIQUE INDEX: One active enrollment per student per session
-- ============================================================================
-- This index only applies when status = 'active', allowing:
-- - Historical enrollments (inactive, promoted, completed, etc.)
-- - Multiple enrollments across different sessions
-- - But NOT multiple ACTIVE enrollments in the same session

CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollment_student_session_active
ON student_enrollments (student_id, academic_year_id)
WHERE status = 'active';

-- ============================================================================
-- COMMENT FOR DOCUMENTATION
-- ============================================================================
COMMENT ON INDEX idx_enrollment_student_session_active IS 
'Ensures a student can only have one active enrollment per academic session. Critical for data integrity.';

-- ============================================================================
-- VALIDATION: Check for existing duplicates before deployment
-- ============================================================================
-- Run this query to identify any existing duplicates that need cleanup:
-- 
-- SELECT student_id, academic_year_id, COUNT(*) as enrollment_count
-- FROM student_enrollments
-- WHERE status = 'active'
-- GROUP BY student_id, academic_year_id
-- HAVING COUNT(*) > 1;
--
-- If duplicates exist, they must be resolved before this migration runs,
-- or the migration will fail.

-- ============================================================================
-- ADDITIONAL INDEXES FOR ENROLLMENT PERFORMANCE
-- ============================================================================

-- Index for finding enrollments by student (all statuses)
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id
ON student_enrollments (student_id);

-- Index for finding enrollments by session
CREATE INDEX IF NOT EXISTS idx_enrollments_academic_year
ON student_enrollments (academic_year_id);

-- Index for class+section queries (common for attendance)
CREATE INDEX IF NOT EXISTS idx_enrollments_class_section_session
ON student_enrollments (class_id, section_id, academic_year_id)
WHERE status = 'active';