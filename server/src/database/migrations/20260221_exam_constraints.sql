-- 20260221_exam_constraints.sql
-- Add exam uniqueness and lookup indexes.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'exams' AND column_name = 'institution_id'
    )
    AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'exams' AND column_name = 'name'
    )
    AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'exams' AND column_name = 'academic_year_id'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'exams_unique_per_year'
    ) THEN
        ALTER TABLE exams
            ADD CONSTRAINT exams_unique_per_year
            UNIQUE (institution_id, name, academic_year_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exams_institution_year
    ON exams (institution_id, academic_year_id);
