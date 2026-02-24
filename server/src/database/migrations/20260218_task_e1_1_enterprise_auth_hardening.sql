-- =============================================================================
-- TASK-E1.1 — Enterprise Auth Hardening Migration
-- =============================================================================
-- Run against: ALL tenant schemas + public schema
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS guards)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add MFA columns to users table (tenant schemas)
-- ---------------------------------------------------------------------------
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS mfa_enabled        BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS mfa_secret         TEXT,
    ADD COLUMN IF NOT EXISTS mfa_backup_codes   JSONB,
    ADD COLUMN IF NOT EXISTS mfa_verified_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS auth_provider      TEXT        NOT NULL DEFAULT 'password',
    ADD COLUMN IF NOT EXISTS ip_allowlist       JSONB,
    ADD COLUMN IF NOT EXISTS last_login_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_login_ip      TEXT;

-- Index for auth_provider lookups (SSO routing)
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users (auth_provider);

-- ---------------------------------------------------------------------------
-- 2. Add MFA columns to root.admins table
-- ---------------------------------------------------------------------------
ALTER TABLE root.admins
    ADD COLUMN IF NOT EXISTS mfa_enabled        BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS mfa_secret         TEXT,
    ADD COLUMN IF NOT EXISTS mfa_backup_codes   JSONB,
    ADD COLUMN IF NOT EXISTS mfa_verified_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ip_allowlist       JSONB,
    ADD COLUMN IF NOT EXISTS session_duration_hours INTEGER NOT NULL DEFAULT 8;

-- ---------------------------------------------------------------------------
-- 3. Enhance sessions table with device intelligence
-- ---------------------------------------------------------------------------
ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS device_type        TEXT,
    ADD COLUMN IF NOT EXISTS geo_region         TEXT,
    ADD COLUMN IF NOT EXISTS user_agent_hash    TEXT,
    ADD COLUMN IF NOT EXISTS is_new_device      BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS mfa_verified       BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS mfa_verified_at    TIMESTAMPTZ;

-- Index for device lookups
CREATE INDEX IF NOT EXISTS idx_sessions_device_id ON sessions (device_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_agent_hash ON sessions (user_agent_hash);

-- ---------------------------------------------------------------------------
-- 4. Enhance root.admin_sessions with device intelligence
-- ---------------------------------------------------------------------------
ALTER TABLE root.admin_sessions
    ADD COLUMN IF NOT EXISTS device_type        TEXT,
    ADD COLUMN IF NOT EXISTS geo_region         TEXT,
    ADD COLUMN IF NOT EXISTS user_agent_hash    TEXT,
    ADD COLUMN IF NOT EXISTS is_new_device      BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS mfa_verified       BOOLEAN     NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS mfa_verified_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS expires_at         TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 5. Ensure audit_logs table has required columns
-- ---------------------------------------------------------------------------
-- audit_logs already exists with: id, user_id, institution_id, action, meta, ip, user_agent, created_at
-- No changes needed — AUTH:* events use the action column prefix

-- Add index on action for auth event queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- ---------------------------------------------------------------------------
-- 6. Constraint: auth_provider must be a known value
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_users_auth_provider'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_auth_provider
            CHECK (auth_provider IN ('password', 'keycloak', 'google', 'azure'));
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. Root schema: add ip_allowlist to admins if not present
-- ---------------------------------------------------------------------------
-- Already handled in step 2 above.

-- ---------------------------------------------------------------------------
-- 8. Comments for documentation
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN users.mfa_enabled IS 'Whether TOTP MFA is active for this user';
COMMENT ON COLUMN users.mfa_secret IS 'Encrypted TOTP secret (base32). NULL if MFA not enabled.';
COMMENT ON COLUMN users.mfa_backup_codes IS 'Array of hashed single-use backup codes';
COMMENT ON COLUMN users.mfa_verified_at IS 'Timestamp of last successful MFA verification';
COMMENT ON COLUMN users.auth_provider IS 'Identity provider: password | keycloak | google | azure';
COMMENT ON COLUMN users.ip_allowlist IS 'Optional IP allowlist for this user (null = all IPs allowed)';
COMMENT ON COLUMN sessions.mfa_verified IS 'Whether MFA was verified for this session';
COMMENT ON COLUMN sessions.is_new_device IS 'True if this was the first login from this device';
