-- =============================================================================
-- Migration: Communication Module Tables
-- Date: 2026-02-20
-- =============================================================================
-- Run this migration in each tenant schema (replace :schema with schema name)
-- =============================================================================

-- ─── 1. Notifications Table ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           VARCHAR(300) NOT NULL,
    message         TEXT NOT NULL,
    type            VARCHAR(100),
    metadata        JSONB,
    channel         VARCHAR(20) NOT NULL DEFAULT 'in_app',
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    sent_at         TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    error_message   TEXT,
    idempotency_key VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_idempotency ON notifications(idempotency_key);

-- ─── 2. Notification Templates Table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_templates (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR(100) NOT NULL,
    slug             VARCHAR(100) NOT NULL UNIQUE,
    type             VARCHAR(50) NOT NULL DEFAULT 'custom',
    title_template   VARCHAR(300) NOT NULL,
    message_template TEXT NOT NULL,
    variables        JSONB,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_slug ON notification_templates(slug);
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);

-- ─── 3. Notification Queue Table (for tracking bulk notification jobs) ───────

CREATE TABLE IF NOT EXISTS notification_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          VARCHAR(100) NOT NULL UNIQUE,
    job_name        VARCHAR(100) NOT NULL,
    total_recipients INTEGER NOT NULL DEFAULT 0,
    sent_count      INTEGER NOT NULL DEFAULT 0,
    failed_count    INTEGER NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_jobs_job_id ON notification_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_notification_jobs_status ON notification_jobs(status);