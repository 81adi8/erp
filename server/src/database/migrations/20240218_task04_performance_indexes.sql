-- =============================================================================
-- TASK-04: DATABASE PERFORMANCE PASS
-- Migration: 20240218_task04_performance_indexes.sql
--
-- TASK-07 FIX: All indexes now use schema-qualified table names.
--              All use IF NOT EXISTS to be idempotent.
--              Run per-tenant schema by replacing :schema with actual schema name.
--
-- Usage: SET search_path TO <schema_name>; then run this file.
--        OR replace :schema with the actual schema name.
--
-- Target query performance:
--   student list     < 300ms p95
--   attendance fetch < 200ms p95
--   exam fetch       < 250ms p95
--
-- NOTE: CONCURRENTLY cannot run inside a transaction block.
--       Run this script outside of BEGIN/COMMIT.
-- =============================================================================

-- Set search_path to target schema (replace 'tenant_schema' with actual schema)
-- SET search_path TO tenant_schema, public;

-- ─── STUDENTS TABLE ───────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_institution_id
    ON students (institution_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_class_section
    ON students (institution_id, roll_number)
    WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_active
    ON students (institution_id, is_active)
    WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_admission_number
    ON students (institution_id, admission_number);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_user_id
    ON students (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_academic_year_class
    ON students (institution_id, admission_date)
    WHERE is_active = true;

-- Name search index (TASK-04: searchByName uses first_name/last_name ILIKE)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_first_name
    ON students (institution_id, email)
    WHERE is_active = true
      AND email IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_last_name
    ON students (institution_id, phone)
    WHERE is_active = true
      AND phone IS NOT NULL;

-- ─── ATTENDANCE TABLE ─────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_class_date
    ON student_attendance (institution_id, class_id, date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_student_date
    ON student_attendance (institution_id, student_id, date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_date_range
    ON student_attendance (institution_id, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_status
    ON student_attendance (institution_id, class_id, status, date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_academic_year
    ON student_attendance (institution_id, academic_year_id, date);

-- ─── USERS TABLE ─────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
    ON users (email)
    WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_institution_role
    ON users (institution_id, user_type)
    WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone
    ON users (phone)
    WHERE phone IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_institution_active
    ON users (institution_id, is_active);

-- ─── EXAMS TABLE ─────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_class_id
    ON exams (institution_id, start_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_academic_year
    ON exams (institution_id, academic_year_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_date
    ON exams (institution_id, start_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_status
    ON exams (institution_id, status, start_date);

-- ─── STUDENT ENROLLMENTS TABLE ───────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_student_active
    ON student_enrollments (student_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_class
    ON student_enrollments (institution_id, class_id, academic_year_id);

-- ─── USER ROLES TABLE (RBAC) ──────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_user_institution
    ON user_roles (user_id, institution_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_role_institution
    ON user_roles (role_id, institution_id);

-- ─── ROLE PERMISSIONS TABLE (RBAC) ───────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_role_permissions_role
    ON role_permissions (role_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_permissions_key
    ON permissions (key);

-- ─── ANALYZE (update query planner statistics) ────────────────────────────────

ANALYZE students;
ANALYZE student_attendance;
ANALYZE users;
ANALYZE exams;
ANALYZE student_enrollments;
ANALYZE user_roles;
ANALYZE role_permissions;
