-- Migration: Create plan_module_bundles table
-- Date: 2026-01-07
-- Description: Creates the plan_module_bundles table for storing named module bundle collections with custom permissions

-- Run this migration to create the table in your PostgreSQL database
-- Execute in psql or a database management tool

CREATE TABLE IF NOT EXISTS public.plan_module_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    module_ids JSONB DEFAULT '[]'::jsonb,
    permission_ids JSONB DEFAULT '[]'::jsonb,
    module_permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookups by active status
CREATE INDEX IF NOT EXISTS idx_plan_module_bundles_is_active 
ON public.plan_module_bundles(is_active);

-- Add comment
COMMENT ON TABLE public.plan_module_bundles IS 'Named collections of modules with custom permissions that can be linked to subscription plans';

-- If updating existing table, run these ALTER statements:
-- ALTER TABLE public.plan_module_bundles ADD COLUMN IF NOT EXISTS permission_ids JSONB DEFAULT '[]'::jsonb;
-- ALTER TABLE public.plan_module_bundles ADD COLUMN IF NOT EXISTS module_permissions JSONB DEFAULT '{}'::jsonb;
