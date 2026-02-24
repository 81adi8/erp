-- =============================================================================
-- Migration: Reports Module - report_jobs table
-- Date: 2026-02-20
-- NOTE: UP-ONLY and idempotent. Run in each tenant schema.
-- =============================================================================

-- Report Jobs Table
CREATE TABLE IF NOT EXISTS report_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL,
    academic_year_id UUID NOT NULL,
    report_type VARCHAR(30) NOT NULL CHECK (report_type IN (
        'student_list', 'attendance_register', 'fee_collection',
        'fee_dues', 'exam_results', 'exam_toppers', 'student_strength'
    )),
    format VARCHAR(10) NOT NULL DEFAULT 'excel' CHECK (format IN ('excel', 'pdf')),
    filters JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN (
        'queued', 'processing', 'completed', 'failed'
    )),
    progress INTEGER NOT NULL DEFAULT 0,
    file_url TEXT,
    file_name VARCHAR(255),
    error_message TEXT,
    requested_by UUID NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_report_jobs_institution_status
    ON report_jobs(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_report_jobs_requested_by
    ON report_jobs(requested_by);
CREATE INDEX IF NOT EXISTS idx_report_jobs_type_status
    ON report_jobs(report_type, status);