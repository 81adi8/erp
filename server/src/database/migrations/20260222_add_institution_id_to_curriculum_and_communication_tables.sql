-- 20260222_add_institution_id_to_curriculum_and_communication_tables.sql
-- Ensures tenant-owned records are always bound to an institution.
-- Tables covered:
--   chapters, topics, session_holidays, notifications, notification_templates
--
-- This migration is intended to run in a tenant schema context.
-- It backfills NULL institution_id values from public.institutions.db_schema,
-- then enforces NOT NULL + FK constraints.

DO $$
DECLARE
    v_schema TEXT := current_schema();
    v_institution_id UUID;
BEGIN
    IF v_schema IN ('public', 'root') THEN
        RAISE NOTICE 'Skipping tenant institution migration for schema: %', v_schema;
        RETURN;
    END IF;

    SELECT i.id
    INTO v_institution_id
    FROM public.institutions i
    WHERE i.db_schema = v_schema
    ORDER BY i.created_at DESC
    LIMIT 1;

    IF v_institution_id IS NULL THEN
        RAISE NOTICE 'Skipping tenant institution migration: no institution mapping found for schema: %', v_schema;
        RETURN;
    END IF;

    -- chapters
    IF to_regclass(format('%I.%I', v_schema, 'chapters')) IS NOT NULL THEN
        EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS institution_id UUID', v_schema, 'chapters');
        EXECUTE format('UPDATE %I.%I SET institution_id = $1 WHERE institution_id IS NULL', v_schema, 'chapters')
            USING v_institution_id;
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN institution_id SET NOT NULL', v_schema, 'chapters');
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS chapters_institution_id_fkey', v_schema, 'chapters');
        EXECUTE format(
            'ALTER TABLE %I.%I ADD CONSTRAINT chapters_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE',
            v_schema,
            'chapters'
        );
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_chapters_institution_id ON %I.%I (institution_id)', v_schema, 'chapters');
    END IF;

    -- topics
    IF to_regclass(format('%I.%I', v_schema, 'topics')) IS NOT NULL THEN
        EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS institution_id UUID', v_schema, 'topics');
        EXECUTE format('UPDATE %I.%I SET institution_id = $1 WHERE institution_id IS NULL', v_schema, 'topics')
            USING v_institution_id;
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN institution_id SET NOT NULL', v_schema, 'topics');
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS topics_institution_id_fkey', v_schema, 'topics');
        EXECUTE format(
            'ALTER TABLE %I.%I ADD CONSTRAINT topics_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE',
            v_schema,
            'topics'
        );
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_topics_institution_id ON %I.%I (institution_id)', v_schema, 'topics');
    END IF;

    -- session_holidays
    IF to_regclass(format('%I.%I', v_schema, 'session_holidays')) IS NOT NULL THEN
        EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS institution_id UUID', v_schema, 'session_holidays');
        EXECUTE format('UPDATE %I.%I SET institution_id = $1 WHERE institution_id IS NULL', v_schema, 'session_holidays')
            USING v_institution_id;
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN institution_id SET NOT NULL', v_schema, 'session_holidays');
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS session_holidays_institution_id_fkey', v_schema, 'session_holidays');
        EXECUTE format(
            'ALTER TABLE %I.%I ADD CONSTRAINT session_holidays_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE',
            v_schema,
            'session_holidays'
        );
        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS idx_session_holidays_institution_id ON %I.%I (institution_id)',
            v_schema,
            'session_holidays'
        );
    END IF;

    -- notifications
    IF to_regclass(format('%I.%I', v_schema, 'notifications')) IS NOT NULL THEN
        EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS institution_id UUID', v_schema, 'notifications');
        EXECUTE format('UPDATE %I.%I SET institution_id = $1 WHERE institution_id IS NULL', v_schema, 'notifications')
            USING v_institution_id;
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN institution_id SET NOT NULL', v_schema, 'notifications');
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS notifications_institution_id_fkey', v_schema, 'notifications');
        EXECUTE format(
            'ALTER TABLE %I.%I ADD CONSTRAINT notifications_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE',
            v_schema,
            'notifications'
        );
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_notifications_institution_id ON %I.%I (institution_id)', v_schema, 'notifications');
    END IF;

    -- notification_templates
    IF to_regclass(format('%I.%I', v_schema, 'notification_templates')) IS NOT NULL THEN
        EXECUTE format('ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS institution_id UUID', v_schema, 'notification_templates');
        EXECUTE format('UPDATE %I.%I SET institution_id = $1 WHERE institution_id IS NULL', v_schema, 'notification_templates')
            USING v_institution_id;
        EXECUTE format('ALTER TABLE %I.%I ALTER COLUMN institution_id SET NOT NULL', v_schema, 'notification_templates');
        EXECUTE format(
            'ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS notification_templates_institution_id_fkey',
            v_schema,
            'notification_templates'
        );
        EXECUTE format(
            'ALTER TABLE %I.%I ADD CONSTRAINT notification_templates_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE',
            v_schema,
            'notification_templates'
        );
        EXECUTE format(
            'CREATE INDEX IF NOT EXISTS idx_notification_templates_institution_id ON %I.%I (institution_id)',
            v_schema,
            'notification_templates'
        );
    END IF;
END $$;
