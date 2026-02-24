-- Audit Log Partitioning and Retention Policy
-- Creates monthly partitions with automated pruning

-- ============================================================================
-- 1. PARTITIONED AUDIT LOG TABLE
-- ============================================================================

-- Create parent table with partitioning
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    institution_id UUID,
    user_id UUID,
    session_id UUID,
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    
    -- Changes (for data mutations)
    old_values JSONB,
    new_values JSONB,
    
    -- Metadata
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    duration_ms INTEGER,
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- GDPR compliance
    is_anonymized BOOLEAN DEFAULT FALSE,
    anonymized_at TIMESTAMPTZ,
    
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- ============================================================================
-- 2. INDEXES FOR COMMON QUERIES
-- ============================================================================

-- Index on tenant_id for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs (tenant_id, created_at DESC);

-- Index on user_id for user activity queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id, created_at DESC);

-- Index on action for action-type queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action, created_at DESC);

-- Index on entity for entity-history queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id, created_at DESC);

-- Index on institution for institution-scoped queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_institution_id ON audit_logs (institution_id, created_at DESC);

-- Index for GDPR anonymization queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_anonymization ON audit_logs (is_anonymized, created_at);

-- ============================================================================
-- 3. CREATE INITIAL PARTITIONS (CURRENT MONTH + 12 MONTHS BACK)
-- ============================================================================

-- Function to create partition for a given month
CREATE OR REPLACE FUNCTION create_audit_log_partition(year INT, month INT)
RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := format('audit_logs_%s_%s', year, LPAD(month::TEXT, 2, '0'));
    start_date := make_date(year, month, 1);
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs 
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, start_date, end_date
    );
    
    RAISE NOTICE 'Created partition: %', partition_name;
END;
$$ LANGUAGE plpgsql;

-- Function to create partitions for the next N months
CREATE OR REPLACE FUNCTION create_future_partitions(months_ahead INT DEFAULT 3)
RETURNS VOID AS $$
DECLARE
    i INT;
    target_date DATE;
BEGIN
    FOR i IN 0..months_ahead LOOP
        target_date := CURRENT_DATE + (i || ' month')::INTERVAL;
        PERFORM create_audit_log_partition(
            EXTRACT(YEAR FROM target_date)::INT,
            EXTRACT(MONTH FROM target_date)::INT
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create partitions for past 12 months and next 3 months
DO $$
DECLARE
    i INT;
    target_date DATE;
BEGIN
    -- Past 12 months
    FOR i IN 0..11 LOOP
        target_date := CURRENT_DATE - (i || ' month')::INTERVAL;
        PERFORM create_audit_log_partition(
            EXTRACT(YEAR FROM target_date)::INT,
            EXTRACT(MONTH FROM target_date)::INT
        );
    END LOOP;
    
    -- Next 3 months
    PERFORM create_future_partitions(3);
END $$;

-- ============================================================================
-- 4. PARTITION PRUNING FUNCTION (RETENTION POLICY)
-- ============================================================================

-- Function to archive and drop old partitions
-- Keeps 12 months, archives to cold storage, then deletes
CREATE OR REPLACE FUNCTION prune_audit_logs(
    retention_months INT DEFAULT 12,
    archive_before_delete BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
    partition_name TEXT,
    action_taken TEXT,
    rows_affected BIGINT
) AS $$
DECLARE
    partition_record RECORD;
    cutoff_date DATE;
    archive_path TEXT;
    rows_count BIGINT;
BEGIN
    cutoff_date := CURRENT_DATE - (retention_months || ' month')::INTERVAL;
    
    FOR partition_record IN 
        SELECT 
            tablename as partition_name,
            pg_get_expr(c.relpartbound, c.oid) as partition_bound
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r'
        AND n.nspname = 'public'
        AND c.relname LIKE 'audit_logs_%'
        AND c.relname != 'audit_logs'
        ORDER BY c.relname
    LOOP
        -- Check if partition is older than retention period
        -- Extract date from partition name (audit_logs_YYYY_MM)
        DECLARE
            part_year INT;
            part_month INT;
            part_date DATE;
        BEGIN
            part_year := SUBSTRING(partition_record.partition_name FROM 12 FOR 4)::INT;
            part_month := SUBSTRING(partition_record.partition_name FROM 17 FOR 2)::INT;
            part_date := make_date(part_year, part_month, 1);
            
            IF part_date < cutoff_date THEN
                -- Get row count before action
                EXECUTE format('SELECT COUNT(*) FROM %I', partition_record.partition_name)
                INTO rows_count;
                
                IF archive_before_delete THEN
                    -- Archive to cold storage (implement based on your storage solution)
                    -- Example: Export to S3, Azure Blob, or file system
                    archive_path := format('/archive/audit_logs/%s.jsonl', partition_record.partition_name);
                    
                    -- Log archive action (you would implement actual export here)
                    RAISE NOTICE 'Archiving partition % to %', partition_record.partition_name, archive_path;
                    
                    -- For now, just log the action
                    -- In production, you would:
                    -- 1. Export data to S3/Azure Blob
                    -- 2. Verify export integrity
                    -- 3. Then drop the partition
                    
                    RETURN QUERY SELECT 
                        partition_record.partition_name::TEXT,
                        'archived'::TEXT,
                        rows_count;
                ELSE
                    -- Direct deletion without archive
                    EXECUTE format('DROP TABLE IF EXISTS %I', partition_record.partition_name);
                    
                    RETURN QUERY SELECT 
                        partition_record.partition_name::TEXT,
                        'deleted'::TEXT,
                        rows_count;
                END IF;
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Error processing partition %: %', 
                    partition_record.partition_name, SQLERRM;
        END;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. GDPR ANONYMIZATION FUNCTION
-- ============================================================================

-- Function to anonymize audit logs for a specific user (GDPR right to erasure)
CREATE OR REPLACE FUNCTION anonymize_user_audit_logs(
    target_user_id UUID,
    anonymize_after_days INT DEFAULT 30
)
RETURNS BIGINT AS $$
DECLARE
    cutoff_date TIMESTAMPTZ;
    rows_updated BIGINT;
BEGIN
    cutoff_date := NOW() - (anonymize_after_days || ' day')::INTERVAL;
    
    -- Anonymize user data in audit logs
    UPDATE audit_logs
    SET 
        user_id = NULL,
        ip_address = NULL,
        user_agent = NULL,
        old_values = CASE 
            WHEN old_values IS NOT NULL 
            THEN jsonb_build_object('_anonymized', true)
            ELSE NULL 
        END,
        new_values = CASE 
            WHEN new_values IS NOT NULL 
            THEN jsonb_build_object('_anonymized', true)
            ELSE NULL 
        END,
        is_anonymized = TRUE,
        anonymized_at = NOW()
    WHERE user_id = target_user_id
    AND created_at < cutoff_date
    AND is_anonymized = FALSE;
    
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    
    -- Log the anonymization action
    INSERT INTO audit_logs (
        id, tenant_id, user_id, action, entity_type, entity_id,
        created_at, status
    ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000'::UUID,
        target_user_id,
        'audit_log_anonymization',
        'user',
        target_user_id,
        NOW(),
        'success'
    );
    
    RETURN rows_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. PG_CRON JOBS FOR AUTOMATED MAINTENANCE
-- ============================================================================

-- Note: pg_cron extension must be installed and configured
-- Run these commands in PostgreSQL with pg_cron enabled:

/*
-- Create future partitions monthly (run on 1st of each month)
SELECT cron.schedule(
    'create-audit-partitions',
    '0 0 1 * *',
    $$SELECT create_future_partitions(3);$$
);

-- Prune old partitions monthly (run on 2nd of each month)
SELECT cron.schedule(
    'prune-audit-logs',
    '0 2 1 * *',
    $$SELECT * FROM prune_audit_logs(12, true);$$
);

-- Vacuum analyze audit logs weekly
SELECT cron.schedule(
    'vacuum-audit-logs',
    '0 3 * * 0',
    $$VACUUM ANALYZE audit_logs;$$
);
*/

-- ============================================================================
-- 7. HELPER VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for recent audit activity by tenant
CREATE OR REPLACE VIEW v_recent_audit_activity AS
SELECT 
    tenant_id,
    action,
    COUNT(*) as action_count,
    MAX(created_at) as last_occurrence,
    MIN(created_at) as first_occurrence
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY tenant_id, action
ORDER BY tenant_id, action_count DESC;

-- View for user activity summary
CREATE OR REPLACE VIEW v_user_activity_summary AS
SELECT 
    tenant_id,
    user_id,
    DATE(created_at) as activity_date,
    COUNT(*) as total_actions,
    COUNT(DISTINCT action) as unique_actions,
    COUNT(DISTINCT entity_type) as entities_touched
FROM audit_logs
WHERE created_at > NOW() - INTERVAL '30 days'
AND user_id IS NOT NULL
GROUP BY tenant_id, user_id, DATE(created_at);

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

-- Grant appropriate permissions to application role
-- GRANT SELECT, INSERT ON audit_logs TO app_role;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_role;

-- ============================================================================
-- 9. SAMPLE QUERIES FOR DOCUMENTATION
-- ============================================================================

/*
-- Query audit logs for a specific tenant in date range
SELECT * FROM audit_logs
WHERE tenant_id = 'xxx'
AND created_at BETWEEN '2024-01-01' AND '2024-02-01'
ORDER BY created_at DESC;

-- Query all actions for a specific user
SELECT * FROM audit_logs
WHERE user_id = 'xxx'
ORDER BY created_at DESC
LIMIT 100;

-- Query entity history
SELECT * FROM audit_logs
WHERE entity_type = 'student'
AND entity_id = 'xxx'
ORDER BY created_at DESC;

-- Get audit statistics for a tenant
SELECT 
    action,
    COUNT(*) as count,
    AVG(duration_ms) as avg_duration_ms
FROM audit_logs
WHERE tenant_id = 'xxx'
AND created_at > NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY count DESC;

-- Anonymize a user's audit logs (GDPR)
SELECT anonymize_user_audit_logs('user-uuid-here');
*/