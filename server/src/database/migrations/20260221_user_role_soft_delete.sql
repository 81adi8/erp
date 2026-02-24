-- 20260221_user_role_soft_delete.sql
-- Enable soft-delete support on tenant users and roles tables.

ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS roles
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
