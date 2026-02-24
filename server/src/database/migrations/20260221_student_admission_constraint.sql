-- 20260221_student_admission_constraint.sql
-- Replace global admission_number uniqueness with tenant-scoped uniqueness.

ALTER TABLE IF EXISTS students
    DROP CONSTRAINT IF EXISTS students_admission_number_key;

DROP INDEX IF EXISTS idx_students_admission_number_active;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'students' AND column_name = 'institution_id'
    )
    AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'students' AND column_name = 'admission_number'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'students_unique_admission_per_institution'
    ) THEN
        ALTER TABLE students
            ADD CONSTRAINT students_unique_admission_per_institution
            UNIQUE (institution_id, admission_number);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_students_institution_id
    ON students (institution_id);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'students' AND column_name = 'class_id'
    )
    AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'students' AND column_name = 'section_id'
    ) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_students_class_section ON students (class_id, section_id)';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'students' AND column_name = 'status'
    )
    AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'students' AND column_name = 'institution_id'
    ) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_students_status ON students (status, institution_id)';
    END IF;
END $$;
