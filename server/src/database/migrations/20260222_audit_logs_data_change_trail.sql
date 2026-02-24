-- 20260222_audit_logs_data_change_trail.sql
-- Purpose:
--   Create/upgrade audit_logs for data-change auditing.
-- Captures:
--   who (user_id, user_role), what (action), which record (table_name, record_id),
--   tenant (institution_id), when (created_at), and before/after JSON payloads.

CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID,
    user_role       TEXT,
    institution_id  UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    action          TEXT NOT NULL,
    table_name      TEXT,
    record_id       TEXT,
    before_data     JSONB,
    after_data      JSONB,
    meta            JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip              INET,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_role TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS table_name TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS record_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS before_data JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS after_data JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip INET;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'audit_logs'
          AND column_name = 'institution_id'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'audit_logs_institution_id_fkey'
    ) THEN
        ALTER TABLE audit_logs
            ADD CONSTRAINT audit_logs_institution_id_fkey
            FOREIGN KEY (institution_id)
            REFERENCES public.institutions(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_institution_created_at
    ON audit_logs (institution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_record_created_at
    ON audit_logs (table_name, record_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created_at
    ON audit_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at
    ON audit_logs (action, created_at DESC);

