-- 20260222_add_missing_operational_indexes.sql
-- Add missing operational indexes for dashboard, communication, attendance, and fees.
-- Safe to re-run: each index uses IF NOT EXISTS and table existence checks.

DO $$
BEGIN
    -- exam_schedules (institution-scoped dashboard/filter queries)
    IF to_regclass('exam_schedules') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_exam_schedules_institution ON exam_schedules (institution_id)';
    END IF;

    -- notifications (user inbox/status filtering)
    IF to_regclass('notifications') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications (user_id, status)';
    END IF;

    -- student_enrollments (session+class lookups)
    IF to_regclass('student_enrollments') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_enrollments_session_class ON student_enrollments (academic_year_id, class_id)';
    END IF;

    -- class_subjects (curriculum listing by tenant/year/class/active)
    IF to_regclass('class_subjects') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_class_subjects_curriculum ON class_subjects (institution_id, academic_year_id, class_id, is_active)';
    END IF;

    -- attendance tables: section/day fetches
    -- student_attendance is the attendance table with section_id + date columns
    IF to_regclass('student_attendance') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_student_attendance_section_date ON student_attendance (section_id, date)';
    END IF;

    -- fee tables: student payment status filters
    IF to_regclass('fee_payments') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fee_payments_student_status ON fee_payments (student_id, status)';
    END IF;
END $$;

