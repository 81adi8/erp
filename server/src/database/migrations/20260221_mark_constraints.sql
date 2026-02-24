-- 20260221_mark_constraints.sql
-- Add constraints and indexes for marks data integrity + soft delete support.

ALTER TABLE IF EXISTS marks
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'marks' AND column_name = 'institution_id'
    )
    AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'marks' AND column_name = 'exam_schedule_id'
    )
    AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'marks' AND column_name = 'student_id'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'marks_unique_per_student_exam_schedule'
    ) THEN
        ALTER TABLE marks
            ADD CONSTRAINT marks_unique_per_student_exam_schedule
            UNIQUE (institution_id, exam_schedule_id, student_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_marks_student_id
    ON marks (student_id);

CREATE INDEX IF NOT EXISTS idx_marks_exam_schedule_id
    ON marks (exam_schedule_id);

CREATE INDEX IF NOT EXISTS idx_marks_institution_id
    ON marks (institution_id);

CREATE INDEX IF NOT EXISTS idx_marks_student_exam
    ON marks (student_id, institution_id);
