-- =============================================================================
-- Migration: Fee Module - student_fee_assignments
-- Date: 2026-02-19
-- NOTE: This project executes SQL files directly (no up/down runner).
-- Keep this file UP-ONLY and idempotent.
-- =============================================================================

CREATE TABLE IF NOT EXISTS student_fee_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
    discount_id UUID REFERENCES fee_discounts(id) ON DELETE SET NULL,
    discount_override_amount NUMERIC(10, 2) CHECK (discount_override_amount >= 0),
    final_amount NUMERIC(10, 2) NOT NULL CHECK (final_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS student_fee_assignments_student_structure_year_unique
    ON student_fee_assignments (student_id, fee_structure_id, academic_year_id);

-- -----------------------------------------------------------------------------
-- down() rollback guidance (manual only, DO NOT execute automatically)
-- -----------------------------------------------------------------------------
-- DROP INDEX IF EXISTS student_fee_assignments_student_structure_year_unique;
-- DROP TABLE IF EXISTS student_fee_assignments;