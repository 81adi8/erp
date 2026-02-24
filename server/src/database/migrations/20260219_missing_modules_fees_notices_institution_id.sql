-- =============================================================================
-- Migration: Missing ERP Modules — Fees, Notices, institution_id columns
-- Date: 2026-02-19
-- =============================================================================
-- Run this migration in each tenant schema (replace :schema with schema name)
-- and in public schema for institution_id additions.
-- =============================================================================

-- ─── 1. Add institution_id to school models missing it ───────────────────────
-- These tables exist in tenant schemas but lack institution_id for defense-in-depth.
-- Schema-based isolation is primary; institution_id is secondary guard.

ALTER TABLE IF EXISTS chapters
    ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS topics
    ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS session_holidays
    ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS schools
    ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS student_parents
    ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE;

-- ─── 2. Fee Management Tables ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fee_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS fee_structures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    academic_year   VARCHAR(20) NOT NULL,
    class_id        UUID REFERENCES classes(id) ON DELETE SET NULL,
    category_id     UUID REFERENCES fee_categories(id) ON DELETE SET NULL,
    amount          NUMERIC(12, 2) NOT NULL DEFAULT 0,
    due_date        DATE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS fee_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE SET NULL,
    amount_paid     NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method  VARCHAR(50) DEFAULT 'cash',  -- cash, online, cheque, dd
    transaction_ref VARCHAR(200),
    status          VARCHAR(20) NOT NULL DEFAULT 'paid',  -- paid, partial, pending, refunded
    remarks         TEXT,
    collected_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    receipt_number  VARCHAR(100) UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_receipts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id      UUID NOT NULL REFERENCES fee_payments(id) ON DELETE CASCADE,
    receipt_number  VARCHAR(100) NOT NULL UNIQUE,
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    issued_by       UUID REFERENCES users(id) ON DELETE SET NULL,
    pdf_url         TEXT  -- S3/storage URL for generated PDF receipt
);

-- Indexes for fee queries
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_status ON fee_payments(status);
CREATE INDEX IF NOT EXISTS idx_fee_payments_date ON fee_payments(payment_date);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'fee_structures'
          AND column_name = 'academic_year'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_fee_structures_year ON fee_structures(academic_year);
    ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'fee_structures'
          AND column_name = 'academic_year_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_fee_structures_year ON fee_structures(academic_year_id);
    END IF;
END$$;

-- ─── 3. Notices / Announcements Table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(300) NOT NULL,
    content         TEXT NOT NULL,
    notice_type     VARCHAR(50) DEFAULT 'general',  -- general, exam, holiday, event, urgent
    target_audience VARCHAR(50) DEFAULT 'all',       -- all, students, teachers, parents, staff
    class_id        UUID REFERENCES classes(id) ON DELETE SET NULL,  -- NULL = school-wide
    section_id      UUID REFERENCES sections(id) ON DELETE SET NULL,
    published_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    is_published    BOOLEAN NOT NULL DEFAULT FALSE,
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notices_published ON notices(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_notices_audience ON notices(target_audience);
CREATE INDEX IF NOT EXISTS idx_notices_class ON notices(class_id);

-- ─── 4. ID Card / Admit Card Tables ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS id_cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    academic_year   VARCHAR(20) NOT NULL,
    template_id     VARCHAR(100),
    generated_at    TIMESTAMPTZ,
    pdf_url         TEXT,
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, generated, printed
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, academic_year)
);

CREATE TABLE IF NOT EXISTS admit_cards (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    exam_id         UUID REFERENCES exam_schedules(id) ON DELETE CASCADE,
    roll_number     VARCHAR(50),
    seat_number     VARCHAR(50),
    hall_ticket_no  VARCHAR(100) UNIQUE,
    generated_at    TIMESTAMPTZ,
    pdf_url         TEXT,
    status          VARCHAR(20) DEFAULT 'pending',  -- pending, generated, distributed
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_id_cards_student ON id_cards(student_id);
CREATE INDEX IF NOT EXISTS idx_admit_cards_student ON admit_cards(student_id);
CREATE INDEX IF NOT EXISTS idx_admit_cards_exam ON admit_cards(exam_id);

-- ─── 5. Parent Portal Access Table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS parent_portal_access (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    relationship    VARCHAR(50) DEFAULT 'parent',  -- parent, guardian, sibling
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    can_view_fees   BOOLEAN NOT NULL DEFAULT TRUE,
    can_view_marks  BOOLEAN NOT NULL DEFAULT TRUE,
    can_view_attendance BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(parent_user_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_portal_parent ON parent_portal_access(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_portal_student ON parent_portal_access(student_id);
