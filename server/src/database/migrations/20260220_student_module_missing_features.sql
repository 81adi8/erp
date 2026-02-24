-- =============================================================================
-- Migration: Student Module Missing Features (Step-1/2 Backfill)
-- Date: 2026-02-20
-- Notes:
--   - Idempotent / up-only
--   - Intended for tenant schema execution context (unqualified table names)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) students: paranoid soft-delete support
-- -----------------------------------------------------------------------------
ALTER TABLE students
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS students_deleted_at_idx
    ON students (deleted_at);

-- -----------------------------------------------------------------------------
-- 2) student_enrollments: add contract alias field enrolled_at
-- -----------------------------------------------------------------------------
ALTER TABLE student_enrollments
    ADD COLUMN IF NOT EXISTS enrolled_at DATE;

UPDATE student_enrollments
SET enrolled_at = enrollment_date
WHERE enrolled_at IS NULL
  AND enrollment_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS student_enrollments_enrolled_at_idx
    ON student_enrollments (enrolled_at);

-- -----------------------------------------------------------------------------
-- 3) promotion_history: add contract alias fields
-- -----------------------------------------------------------------------------
ALTER TABLE promotion_history
    ADD COLUMN IF NOT EXISTS from_academic_year_id UUID,
    ADD COLUMN IF NOT EXISTS to_academic_year_id UUID,
    ADD COLUMN IF NOT EXISTS promoted_by UUID,
    ADD COLUMN IF NOT EXISTS promoted_at DATE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'promotion_history'
          AND column_name = 'action'
    ) THEN
        IF EXISTS (
            SELECT 1
            FROM pg_type
            WHERE typname = 'enum_promotion_history_action'
        ) THEN
            ALTER TABLE promotion_history
                ADD COLUMN action enum_promotion_history_action;
        ELSE
            ALTER TABLE promotion_history
                ADD COLUMN action TEXT;
        END IF;
    END IF;
END$$;

UPDATE promotion_history
SET from_academic_year_id = from_session_id
WHERE from_academic_year_id IS NULL
  AND from_session_id IS NOT NULL;

UPDATE promotion_history
SET to_academic_year_id = to_session_id
WHERE to_academic_year_id IS NULL
  AND to_session_id IS NOT NULL;

DO $$
DECLARE
    v_action_udt_name TEXT;
BEGIN
    SELECT c.udt_name
    INTO v_action_udt_name
    FROM information_schema.columns c
    WHERE c.table_schema = current_schema()
      AND c.table_name = 'promotion_history'
      AND c.column_name = 'action';

    IF v_action_udt_name = 'enum_promotion_history_action' THEN
        UPDATE promotion_history
        SET action = (decision::text)::enum_promotion_history_action
        WHERE action IS NULL
          AND decision IS NOT NULL;
    ELSE
        UPDATE promotion_history
        SET action = decision::text
        WHERE action IS NULL
          AND decision IS NOT NULL;
    END IF;
END$$;

UPDATE promotion_history
SET promoted_by = decided_by
WHERE promoted_by IS NULL
  AND decided_by IS NOT NULL;

UPDATE promotion_history
SET promoted_at = decision_date
WHERE promoted_at IS NULL
  AND decision_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS promotion_history_student_decision_date_idx
    ON promotion_history (student_id, decision_date DESC);

-- -----------------------------------------------------------------------------
-- 4) student_documents table + indexes
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_student_documents_document_type') THEN
        CREATE TYPE enum_student_documents_document_type AS ENUM (
            'birth_certificate',
            'transfer_certificate',
            'aadhaar',
            'marksheet',
            'photo',
            'medical_record',
            'address_proof',
            'other'
        );
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS student_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    document_type enum_student_documents_document_type NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(1024) NOT NULL,
    file_size INTEGER,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    remarks VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

ALTER TABLE student_documents
    ADD COLUMN IF NOT EXISTS institution_id UUID,
    ADD COLUMN IF NOT EXISTS student_id UUID,
    ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS file_url VARCHAR(1024),
    ADD COLUMN IF NOT EXISTS file_size INTEGER,
    ADD COLUMN IF NOT EXISTS uploaded_by UUID,
    ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verified_by UUID,
    ADD COLUMN IF NOT EXISTS remarks VARCHAR(500),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS student_documents_student_id_idx
    ON student_documents (student_id);

CREATE INDEX IF NOT EXISTS student_documents_institution_type_idx
    ON student_documents (institution_id, document_type);

-- -----------------------------------------------------------------------------
-- 5) parents table shape hardening for ParentProfile model
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    email VARCHAR(255),
    occupation VARCHAR(150),
    relation VARCHAR(50) NOT NULL DEFAULT 'guardian',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

ALTER TABLE parents
    ADD COLUMN IF NOT EXISTS user_id UUID,
    ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS occupation VARCHAR(150),
    ADD COLUMN IF NOT EXISTS relation VARCHAR(50),
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE parents
SET first_name = COALESCE(NULLIF(BTRIM(first_name), ''), 'Parent')
WHERE first_name IS NULL OR BTRIM(first_name) = '';

UPDATE parents
SET last_name = COALESCE(last_name, '')
WHERE last_name IS NULL;

DO $$
DECLARE
    v_relation_udt_name TEXT;
BEGIN
    SELECT c.udt_name
    INTO v_relation_udt_name
    FROM information_schema.columns c
    WHERE c.table_schema = current_schema()
      AND c.table_name = 'parents'
      AND c.column_name = 'relation';

    IF v_relation_udt_name = 'enum_parents_relation' THEN
        UPDATE parents
        SET relation = CASE
            WHEN relation IS NULL THEN 'guardian'::enum_parents_relation
            WHEN relation::text = LOWER(relation::text) THEN relation
            ELSE (LOWER(relation::text))::enum_parents_relation
        END
        WHERE relation IS NULL OR relation::text <> LOWER(relation::text);
    ELSE
        UPDATE parents
        SET relation = COALESCE(LOWER(relation::text), 'guardian')
        WHERE relation IS NULL OR relation::text <> LOWER(relation::text);
    END IF;
END$$;

UPDATE parents
SET is_active = TRUE
WHERE is_active IS NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'parents'
          AND column_name = 'first_name'
    ) AND NOT EXISTS (
        SELECT 1
        FROM parents
        WHERE first_name IS NULL OR BTRIM(first_name) = ''
    ) THEN
        ALTER TABLE parents ALTER COLUMN first_name SET NOT NULL;
    END IF;
END$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'parents'
          AND column_name = 'last_name'
    ) AND NOT EXISTS (
        SELECT 1
        FROM parents
        WHERE last_name IS NULL
    ) THEN
        ALTER TABLE parents ALTER COLUMN last_name SET NOT NULL;
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS parents_institution_phone_idx
    ON parents (institution_id, phone);

-- -----------------------------------------------------------------------------
-- 6) student_parents table shape hardening for StudentParentLink model
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    relation VARCHAR(50) NOT NULL DEFAULT 'guardian',
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    is_emergency_contact BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE student_parents
    ADD COLUMN IF NOT EXISTS institution_id UUID,
    ADD COLUMN IF NOT EXISTS relation VARCHAR(50),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE student_parents sp
SET institution_id = s.institution_id
FROM students s
WHERE sp.institution_id IS NULL
  AND sp.student_id = s.id;

UPDATE student_parents sp
SET institution_id = p.institution_id
FROM parents p
WHERE sp.institution_id IS NULL
  AND sp.parent_id = p.id;

UPDATE student_parents
SET relation = COALESCE(relation, 'guardian')
WHERE relation IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM student_parents WHERE institution_id IS NULL) THEN
        ALTER TABLE student_parents ALTER COLUMN institution_id SET NOT NULL;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM student_parents WHERE relation IS NULL) THEN
        ALTER TABLE student_parents ALTER COLUMN relation SET NOT NULL;
    END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS student_parents_student_parent_unique
    ON student_parents (student_id, parent_id);

CREATE INDEX IF NOT EXISTS student_parents_student_primary_idx
    ON student_parents (student_id, is_primary);

-- -----------------------------------------------------------------------------
-- Rollback guidance (manual only; do not auto-execute)
-- -----------------------------------------------------------------------------
-- DROP INDEX IF EXISTS student_parents_student_primary_idx;
-- DROP INDEX IF EXISTS student_parents_student_parent_unique;
-- DROP INDEX IF EXISTS parents_institution_phone_idx;
-- DROP INDEX IF EXISTS student_documents_institution_type_idx;
-- DROP INDEX IF EXISTS student_documents_student_id_idx;
-- DROP INDEX IF EXISTS promotion_history_student_decision_date_idx;
-- DROP INDEX IF EXISTS student_enrollments_enrolled_at_idx;
-- DROP INDEX IF EXISTS students_deleted_at_idx;