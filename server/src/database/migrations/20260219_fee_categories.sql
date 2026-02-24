-- =============================================================================
-- Migration: Fee Module - fee_categories
-- Date: 2026-02-19
-- NOTE: This project executes SQL files directly (no up/down runner).
-- Keep this file UP-ONLY and idempotent.
-- =============================================================================

-- up()
CREATE TABLE IF NOT EXISTS fee_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS fee_categories_institution_year_name_unique
    ON fee_categories (institution_id, academic_year_id, name);

-- -----------------------------------------------------------------------------
-- down() rollback guidance (manual only, DO NOT execute automatically)
-- -----------------------------------------------------------------------------
-- DROP INDEX IF EXISTS fee_categories_institution_year_name_unique;
-- DROP TABLE IF EXISTS fee_categories;
