-- =============================================================================
-- Migration: Fee Module - fee_payments
-- Date: 2026-02-19
-- NOTE: This project executes SQL files directly (no up/down runner).
-- Keep this file UP-ONLY and idempotent.
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_fee_payments_payment_mode') THEN
        CREATE TYPE enum_fee_payments_payment_mode AS ENUM ('cash', 'cheque', 'online', 'upi', 'dd');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_fee_payments_status') THEN
        CREATE TYPE enum_fee_payments_status AS ENUM ('success', 'pending', 'failed', 'refunded');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    academic_year_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
    receipt_number VARCHAR(100) NOT NULL,
    payment_date DATE NOT NULL,
    amount_paid NUMERIC(10, 2) NOT NULL CHECK (amount_paid > 0),
    payment_mode enum_fee_payments_payment_mode NOT NULL,
    payment_reference VARCHAR(255),
    fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE RESTRICT,
    collected_by UUID REFERENCES users(id) ON DELETE SET NULL,
    remarks VARCHAR(500),
    status enum_fee_payments_status NOT NULL DEFAULT 'success',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS fee_payments_institution_receipt_unique
    ON fee_payments (institution_id, receipt_number);

CREATE INDEX IF NOT EXISTS fee_payments_student_academic_year_idx
    ON fee_payments (student_id, academic_year_id);

-- -----------------------------------------------------------------------------
-- down() rollback guidance (manual only, DO NOT execute automatically)
-- -----------------------------------------------------------------------------
-- DROP INDEX IF EXISTS fee_payments_student_academic_year_idx;
-- DROP INDEX IF EXISTS fee_payments_institution_receipt_unique;
-- DROP TABLE IF EXISTS fee_payments;
-- DROP TYPE IF EXISTS enum_fee_payments_status;
-- DROP TYPE IF EXISTS enum_fee_payments_payment_mode;