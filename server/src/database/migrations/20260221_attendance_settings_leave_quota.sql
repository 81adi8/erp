-- 20260221_attendance_settings_leave_quota.sql
-- Add per-year leave quota setting for attendance module
-- Run in each tenant schema that contains attendance_settings

ALTER TABLE attendance_settings
ADD COLUMN IF NOT EXISTS leave_quota_per_year INTEGER NOT NULL DEFAULT 12;

COMMENT ON COLUMN attendance_settings.leave_quota_per_year IS
'Total leave quota allowed per year. Used by leave balance calculations.';
