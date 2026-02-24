-- =============================================================================
-- Migration: Academic year core + assignment models + timetable slots hard constraints
-- Date: 2026-02-20
-- NOTE: UP-ONLY and idempotent
-- =============================================================================

-- Academic year enum compatibility for subject_type additions
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typname = 'enum_subjects_subject_type'
          AND n.nspname = current_schema()
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumtypid = (
                SELECT t.oid
                FROM pg_type t
                JOIN pg_namespace n ON n.oid = t.typnamespace
                WHERE t.typname = 'enum_subjects_subject_type'
                  AND n.nspname = current_schema()
            )
            AND enumlabel = 'theory'
        ) THEN
            ALTER TYPE enum_subjects_subject_type ADD VALUE 'theory';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumtypid = (
                SELECT t.oid
                FROM pg_type t
                JOIN pg_namespace n ON n.oid = t.typnamespace
                WHERE t.typname = 'enum_subjects_subject_type'
                  AND n.nspname = current_schema()
            )
            AND enumlabel = 'practical'
        ) THEN
            ALTER TYPE enum_subjects_subject_type ADD VALUE 'practical';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumtypid = (
                SELECT t.oid
                FROM pg_type t
                JOIN pg_namespace n ON n.oid = t.typnamespace
                WHERE t.typname = 'enum_subjects_subject_type'
                  AND n.nspname = current_schema()
            )
            AND enumlabel = 'both'
        ) THEN
            ALTER TYPE enum_subjects_subject_type ADD VALUE 'both';
        END IF;
    END IF;
END $$;

-- Academic years table
CREATE TABLE IF NOT EXISTS academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    is_active_record BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT academic_years_date_range_chk CHECK (end_date > start_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS academic_years_institution_date_range_unique
    ON academic_years (institution_id, start_date, end_date);

CREATE UNIQUE INDEX IF NOT EXISTS academic_years_institution_name_unique
    ON academic_years (institution_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS academic_years_single_active_per_institution
    ON academic_years (institution_id)
    WHERE is_active = true;

-- Class model gaps
ALTER TABLE classes
    ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL;

-- Section model gap
ALTER TABLE sections
    ADD COLUMN IF NOT EXISTS max_strength INTEGER;

-- Subject model gaps
ALTER TABLE subjects
    ADD COLUMN IF NOT EXISTS max_marks INTEGER,
    ADD COLUMN IF NOT EXISTS passing_marks INTEGER;

ALTER TABLE subjects
    DROP CONSTRAINT IF EXISTS subjects_marks_check;

ALTER TABLE subjects
    ADD CONSTRAINT subjects_marks_check
    CHECK (
        (max_marks IS NULL AND passing_marks IS NULL)
        OR (max_marks IS NOT NULL AND passing_marks IS NOT NULL AND max_marks > 0 AND passing_marks >= 0 AND passing_marks <= max_marks)
    );

-- Class teacher assignment table
CREATE TABLE IF NOT EXISTS class_teacher_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE class_teacher_assignments
    ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES teachers(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS class_teacher_assignments_section_year_unique
    ON class_teacher_assignments (institution_id, academic_year_id, section_id);

-- Subject teacher assignment table
CREATE TABLE IF NOT EXISTS subject_teacher_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE RESTRICT,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE subject_teacher_assignments
    ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES teachers(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS subject_teacher_assignments_unique
    ON subject_teacher_assignments (institution_id, academic_year_id, subject_id, section_id);

-- Timetable day enum and table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_timetables_day_of_week') THEN
        CREATE TYPE enum_timetables_day_of_week AS ENUM (
            'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
        );
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS timetables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    day_of_week enum_timetables_day_of_week NOT NULL,
    period_number INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_number TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT timetables_period_number_chk CHECK (period_number >= 1),
    CONSTRAINT timetables_time_range_chk CHECK (end_time > start_time)
);

ALTER TABLE timetables
    ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS teacher_id UUID,
    ADD COLUMN IF NOT EXISTS period_number INTEGER,
    ADD COLUMN IF NOT EXISTS start_time TIME,
    ADD COLUMN IF NOT EXISTS end_time TIME,
    ADD COLUMN IF NOT EXISTS room_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS timetables_unique_class_slot
    ON timetables (institution_id, academic_year_id, class_id, section_id, day_of_week, period_number);

CREATE UNIQUE INDEX IF NOT EXISTS timetables_unique_teacher_slot
    ON timetables (institution_id, academic_year_id, teacher_id, day_of_week, period_number);
