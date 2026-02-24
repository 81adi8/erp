-- =============================================================================
-- Migration: Fee Module - fee_discounts
-- Date: 2026-02-19
-- NOTE: This project executes SQL files directly (no up/down runner).
-- Keep this file UP-ONLY and idempotent.
-- =============================================================================

-- up()
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_fee_discounts_discount_type') THEN
        CREATE TYPE enum_fee_discounts_discount_type AS ENUM ('percentage', 'flat');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS fee_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    discount_type enum_fee_discounts_discount_type NOT NULL,
    discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- down() rollback guidance (manual only, DO NOT execute automatically)
-- -----------------------------------------------------------------------------
-- DROP TABLE IF EXISTS fee_discounts;
-- DROP TYPE IF EXISTS enum_fee_discounts_discount_type;
