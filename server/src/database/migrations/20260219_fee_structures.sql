-- =============================================================================
-- Migration: Fee Module - fee_structures
-- Date: 2026-02-19
-- NOTE: This project executes SQL files directly (no up/down runner).
-- Keep this file UP-ONLY and idempotent.
-- =============================================================================

-- up()
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_fee_structures_frequency') THEN
        CREATE TYPE enum_fee_structures_frequency AS ENUM ('monthly', 'quarterly', 'annually', 'one_time');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS fee_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
    fee_category_id UUID NOT NULL REFERENCES fee_categories(id) ON DELETE RESTRICT,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    frequency enum_fee_structures_frequency NOT NULL,
    due_day INTEGER,
    late_fee_per_day NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (late_fee_per_day >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT fee_structures_due_day_range CHECK (due_day IS NULL OR (due_day BETWEEN 1 AND 31))
);

CREATE UNIQUE INDEX IF NOT EXISTS fee_structures_institution_year_category_class_unique
    ON fee_structures (institution_id, academic_year_id, fee_category_id, class_id);

-- -----------------------------------------------------------------------------
-- down() rollback guidance (manual only, DO NOT execute automatically)
-- -----------------------------------------------------------------------------
-- DROP INDEX IF EXISTS fee_structures_institution_year_category_class_unique;
-- DROP TABLE IF EXISTS fee_structures;
-- DROP TYPE IF EXISTS enum_fee_structures_frequency;
