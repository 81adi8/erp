-- Migration: Add scheduling preferences and related columns to class_subjects table
-- Date: 2026-02-04
-- Description: Enhances ClassSubject model with rich scheduling preferences for intelligent timetable generation

-- This migration needs to be run on each tenant schema
-- Replace ${SCHEMA_NAME} with the actual tenant schema name

-- Add new columns to class_subjects table
ALTER TABLE ${SCHEMA_NAME}.class_subjects 
ADD COLUMN IF NOT EXISTS max_periods_per_day INTEGER,
ADD COLUMN IF NOT EXISTS min_periods_per_week INTEGER,
ADD COLUMN IF NOT EXISTS requires_special_room BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS special_room_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS scheduling_preferences JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN ${SCHEMA_NAME}.class_subjects.max_periods_per_day IS 'Maximum periods allowed per day for this subject. Overrides template-level setting.';
COMMENT ON COLUMN ${SCHEMA_NAME}.class_subjects.min_periods_per_week IS 'Minimum periods required per week (for validation).';
COMMENT ON COLUMN ${SCHEMA_NAME}.class_subjects.requires_special_room IS 'Subject requires special resources (lab, computer, sports ground).';
COMMENT ON COLUMN ${SCHEMA_NAME}.class_subjects.special_room_type IS 'Type of special room required: science_lab, computer_lab, music_room, sports_ground, etc.';
COMMENT ON COLUMN ${SCHEMA_NAME}.class_subjects.scheduling_preferences IS 'Rich scheduling preferences for intelligent timetable generation (JSON).';

-- Create index on scheduling_preferences for efficient querying
CREATE INDEX IF NOT EXISTS idx_class_subjects_scheduling_prefs 
ON ${SCHEMA_NAME}.class_subjects USING GIN (scheduling_preferences);

-- Example scheduling_preferences JSON structure:
-- {
--   "preferred_days": [4, 5],           -- Prefer Friday & Saturday (0=Sun, 6=Sat)
--   "avoid_days": [0, 1],               -- Avoid Sunday & Monday
--   "preferred_slots": ["last"],        -- Prefer last periods (or ["first", "morning", "afternoon", 7, 8])
--   "avoid_slots": [1],                 -- Avoid first period
--   "prefer_consecutive": true,         -- Schedule as double periods
--   "min_gap_same_day": 2,              -- 2 period gap if scheduled twice same day
--   "priority": 8,                      -- Priority level 1-10
--   "spread_evenly": true,              -- Distribute across week
--   "fixed_slots": [                    -- Must be placed at these positions
--     { "day": 5, "slot": 7 },
--     { "day": 5, "slot": 8 }
--   ]
-- }
