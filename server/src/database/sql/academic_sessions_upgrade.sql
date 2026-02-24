-- Academic Sessions Upgrade Script
-- This script creates a rich academic sessions table and related term/holiday tables.

-- 1. Enum for Session Status
DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Academic Sessions Table (if refactoring from academic_years)
CREATE TABLE IF NOT EXISTS academic_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status session_status NOT NULL DEFAULT 'DRAFT',
    is_current BOOLEAN DEFAULT FALSE,
    
    -- Configuration & Policies
    weekly_off_days JSONB DEFAULT '[0]', -- 0 = Sunday, 1 = Monday, etc.
    attendance_backdate_days INTEGER DEFAULT 0,
    marks_lock_days INTEGER DEFAULT 7,
    
    -- Results & Promotion
    promotion_rule JSONB, 
    result_publish_rules JSONB,
    
    notes TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Partial Unique Index to ensure only one current session per institution
CREATE UNIQUE INDEX IF NOT EXISTS idx_only_one_current_session 
ON academic_sessions (institution_id) 
WHERE (is_current = TRUE);

-- 4. Academic Terms Table
CREATE TABLE IF NOT EXISTS academic_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Session Holidays Table
CREATE TABLE IF NOT EXISTS session_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT,
    is_gazetted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_sessions_institution ON academic_sessions(institution_id);
CREATE INDEX IF NOT EXISTS idx_terms_session ON academic_terms(session_id);
CREATE INDEX IF NOT EXISTS idx_terms_institution ON academic_terms(institution_id);
CREATE INDEX IF NOT EXISTS idx_holidays_session ON session_holidays(session_id);

-- 7. Example Insert for 2025-26
INSERT INTO academic_sessions (
    institution_id, 
    name, 
    start_date, 
    end_date, 
    status, 
    is_current, 
    weekly_off_days, 
    attendance_backdate_days, 
    marks_lock_days
) VALUES (
    'your-institution-uuid-here', -- Replace with actual ID
    '2025-26', 
    '2025-04-01', 
    '2026-03-31', 
    'ACTIVE', 
    TRUE, 
    '[0]', 
    3, 
    15
);
