-- ============================================================================
-- TASK-E1.1 PATCH-C + TASK-E1.2 Migration
-- Auth Audit Immutability + Secret Management Schema
-- Date: 2026-02-18
-- Idempotent: all changes use IF NOT EXISTS / DO $$ guards
-- ============================================================================

-- ============================================================================
-- PATCH-C: AUTH AUDIT LOG IMMUTABILITY
-- ============================================================================

-- Create dedicated immutable auth audit log table (separate from general audit_logs)
-- This table is append-only: no UPDATE, no DELETE allowed via DB rules.

CREATE TABLE IF NOT EXISTS root.auth_audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type  TEXT NOT NULL,          -- LOGIN_SUCCESS, LOGIN_FAILURE, MFA_SUCCESS, etc.
    user_id     UUID,
    email       TEXT,
    institution_id UUID,
    session_id  UUID,
    ip_address  TEXT,
    user_agent  TEXT,
    schema_name TEXT,
    meta        JSONB DEFAULT '{}',
    severity    TEXT NOT NULL DEFAULT 'INFO',  -- INFO, WARN, CRITICAL
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- NO updated_at — immutable records have no update timestamp
);

-- Indexes for forensic queries
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_id
    ON root.auth_audit_logs (user_id)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_event_type
    ON root.auth_audit_logs (event_type);

CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_created_at
    ON root.auth_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_institution_id
    ON root.auth_audit_logs (institution_id)
    WHERE institution_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_session_id
    ON root.auth_audit_logs (session_id)
    WHERE session_id IS NOT NULL;

-- ── IMMUTABILITY ENFORCEMENT ──────────────────────────────────────────────────
-- Trigger: block UPDATE on auth_audit_logs
CREATE OR REPLACE FUNCTION root.prevent_auth_audit_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Auth audit logs are immutable. UPDATE is not permitted on root.auth_audit_logs.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_auth_audit_update ON root.auth_audit_logs;
CREATE TRIGGER trg_prevent_auth_audit_update
    BEFORE UPDATE ON root.auth_audit_logs
    FOR EACH ROW EXECUTE FUNCTION root.prevent_auth_audit_update();

-- Trigger: block DELETE on auth_audit_logs
CREATE OR REPLACE FUNCTION root.prevent_auth_audit_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Auth audit logs are immutable. DELETE is not permitted on root.auth_audit_logs.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_auth_audit_delete ON root.auth_audit_logs;
CREATE TRIGGER trg_prevent_auth_audit_delete
    BEFORE DELETE ON root.auth_audit_logs
    FOR EACH ROW EXECUTE FUNCTION root.prevent_auth_audit_delete();

-- ── RETENTION POLICY ─────────────────────────────────────────────────────────
-- Retention: 180 days minimum (regulatory compliance)
-- Automated cleanup via pg_cron or application-level scheduled job.
-- Records older than 180 days may be archived to cold storage, NOT deleted.
-- The trigger above prevents direct deletion — archival must use a superuser
-- bypass or a dedicated archival role with explicit DELETE privilege.

COMMENT ON TABLE root.auth_audit_logs IS
    'Immutable auth audit log. Append-only. Retention: 180 days minimum. '
    'UPDATE and DELETE are blocked by triggers. '
    'Archival to cold storage must use dedicated archival role.';

-- ── GRANT PERMISSIONS ────────────────────────────────────────────────────────
-- Application role: INSERT only (no UPDATE, no DELETE, no TRUNCATE)
-- Adjust role name to match your PostgreSQL setup
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'erp_app') THEN
        GRANT INSERT ON root.auth_audit_logs TO erp_app;
        GRANT SELECT ON root.auth_audit_logs TO erp_app;
        -- Explicitly revoke UPDATE/DELETE (belt-and-suspenders with triggers)
        REVOKE UPDATE ON root.auth_audit_logs FROM erp_app;
        REVOKE DELETE ON root.auth_audit_logs FROM erp_app;
        REVOKE TRUNCATE ON root.auth_audit_logs FROM erp_app;
    END IF;
END $$;

-- ============================================================================
-- TASK-E1.2: SECRET ROTATION AUDIT LOG
-- ============================================================================

-- Track all secret fetch and rotation events for compliance
CREATE TABLE IF NOT EXISTS root.secret_audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type      TEXT NOT NULL,  -- SECRET_FETCHED, SECRET_ROTATED, ROTATION_FAILED, BOOT_INITIALIZED
    secret_key      TEXT NOT NULL,  -- Key name (never the value)
    provider        TEXT NOT NULL,  -- aws-secrets-manager, env, hashicorp-vault
    success         BOOLEAN NOT NULL DEFAULT TRUE,
    error_message   TEXT,
    rotated_by      TEXT,           -- userId or 'system' for automated rotation
    environment     TEXT,           -- production, staging, development
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_secret_audit_logs_event_type
    ON root.secret_audit_logs (event_type);

CREATE INDEX IF NOT EXISTS idx_secret_audit_logs_secret_key
    ON root.secret_audit_logs (secret_key);

CREATE INDEX IF NOT EXISTS idx_secret_audit_logs_created_at
    ON root.secret_audit_logs (created_at DESC);

-- Immutability triggers for secret audit log
CREATE OR REPLACE FUNCTION root.prevent_secret_audit_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Secret audit logs are immutable. UPDATE is not permitted.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_secret_audit_update ON root.secret_audit_logs;
CREATE TRIGGER trg_prevent_secret_audit_update
    BEFORE UPDATE ON root.secret_audit_logs
    FOR EACH ROW EXECUTE FUNCTION root.prevent_secret_audit_update();

DROP TRIGGER IF EXISTS trg_prevent_secret_audit_delete ON root.secret_audit_logs;
CREATE TRIGGER trg_prevent_secret_audit_delete
    BEFORE DELETE ON root.secret_audit_logs
    FOR EACH ROW EXECUTE FUNCTION root.prevent_auth_audit_delete();

COMMENT ON TABLE root.secret_audit_logs IS
    'Immutable secret access and rotation audit log. '
    'Records secret key names only — never secret values. '
    'Retention: 365 days minimum.';

-- ============================================================================
-- TASK-E1.2: JWT KEY ROTATION TRACKING
-- ============================================================================

-- Track active and previous JWT signing keys (key IDs only, not key material)
CREATE TABLE IF NOT EXISTS root.jwt_key_registry (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id          TEXT NOT NULL UNIQUE,   -- kid claim in JWT header (future)
    key_type        TEXT NOT NULL,          -- access, refresh
    status          TEXT NOT NULL DEFAULT 'active',  -- active, previous, expired
    activated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,            -- When this key should no longer verify
    rotated_at      TIMESTAMPTZ,
    rotated_by      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jwt_key_registry_status
    ON root.jwt_key_registry (status);

CREATE INDEX IF NOT EXISTS idx_jwt_key_registry_key_type
    ON root.jwt_key_registry (key_type);

COMMENT ON TABLE root.jwt_key_registry IS
    'JWT signing key registry. Tracks key IDs and rotation history. '
    'Key material is stored in AWS Secrets Manager, never in this table.';

-- ============================================================================
-- VERIFY MIGRATION
-- ============================================================================

DO $$
DECLARE
    v_auth_audit_count INTEGER;
    v_secret_audit_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_auth_audit_count
    FROM information_schema.tables
    WHERE table_schema = 'root' AND table_name = 'auth_audit_logs';

    SELECT COUNT(*) INTO v_secret_audit_count
    FROM information_schema.tables
    WHERE table_schema = 'root' AND table_name = 'secret_audit_logs';

    IF v_auth_audit_count = 0 THEN
        RAISE EXCEPTION 'Migration failed: root.auth_audit_logs not created';
    END IF;

    IF v_secret_audit_count = 0 THEN
        RAISE EXCEPTION 'Migration failed: root.secret_audit_logs not created';
    END IF;

    RAISE NOTICE 'Migration 20260218_task_e1_2 completed successfully';
    RAISE NOTICE '  - root.auth_audit_logs: immutable, append-only, 180-day retention';
    RAISE NOTICE '  - root.secret_audit_logs: immutable, 365-day retention';
    RAISE NOTICE '  - root.jwt_key_registry: key rotation tracking';
END $$;
