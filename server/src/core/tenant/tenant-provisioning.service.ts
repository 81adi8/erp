import { Sequelize } from 'sequelize-typescript';
import { sequelize } from '../../database/sequelize';
import { ModelLoader } from '../../database/model-loader';
import path from 'path';
import fs from 'fs';
import { validateSchemaName } from '../database/schema-name.util';
import { logger } from '../utils/logger';

interface MigrationQueryConnection {
    query: (sql: string) => Promise<unknown>;
}

interface SequelizeConnectionManager {
    getConnection: (options?: { type?: 'read' | 'write' }) => Promise<MigrationQueryConnection>;
    releaseConnection: (connection: MigrationQueryConnection) => Promise<void>;
}

/**
 * Tenant Provisioning Service
 * 
 * Automates the complete tenant onboarding pipeline:
 * 1. Create schema
 * 2. Run migrations
 * 3. Seed baseline data
 * 4. Verify completeness
 * 5. Mark as ready
 * 
 * This ensures every new tenant gets a complete, consistent database environment
 * without manual SQL or docker commands.
 * 
 * Architecture:
 * - Uses the existing Sequelize instance (models already loaded)
 * - Uses ModelLoader for dependency ordering
 * - Syncs models using model.schema().sync() (schema-bound sync)
 * 
 * Usage:
 * ```typescript
 * const provisioner = new TenantProvisioningService(sequelize);
 * await provisioner.provisionTenant('new_school_schema');
 * ```
 */
export class TenantProvisioningService {
    private sequelize: Sequelize;
    private modelsBaseDir: string;
    private migrationsDir: string;
    private seedersDir: string;

    constructor(sequelizeInstance: Sequelize) {
        this.sequelize = sequelizeInstance;
        this.modelsBaseDir = path.join(__dirname, '../../database/models');
        this.migrationsDir = path.join(__dirname, '../../database/migrations');
        this.seedersDir = path.join(__dirname, '../../database/seeders');
    }

    /**
     * Main provisioning pipeline
     * Idempotent - safe to run multiple times
     */
    async provisionTenant(schemaName: string): Promise<ProvisioningResult> {
        const safeSchemaName = validateSchemaName(schemaName);
        const startTime = Date.now();
        const logs: string[] = [];

        logger.info(`[TenantProvisioning] Starting provisioning for schema: ${safeSchemaName}`);
        logs.push(`Provisioning started: ${new Date().toISOString()}`);

        try {
            // Step 1: Create schema
            await this.createSchema(safeSchemaName);
            logs.push(`✅ Schema created: ${safeSchemaName}`);

            // Step 2: Sync models (create tables)
            const syncResult = await this.syncModelsForSchema(safeSchemaName);
            logs.push(`✅ Models synced: ${syncResult.tablesCreated} tables`);
            if (syncResult.errors.length > 0) {
                logs.push(`⚠️ Sync warnings: ${syncResult.errors.join(', ')}`);
            }

            // Step 3: Run SQL migrations
            await this.runMigrations(safeSchemaName);
            logs.push(`✅ Migrations executed: ${this.countMigrationFiles()} files`);

            // Step 4: Seed baseline data
            await this.seedBaselineData(safeSchemaName);
            logs.push(`✅ Baseline data seeded`);

            // Step 5: Verify completeness
            const verification = await this.verifySchema(safeSchemaName);
            logs.push(`✅ Verification complete: ${verification.tableCount} tables`);

            const duration = Date.now() - startTime;
            logger.info(`[TenantProvisioning] ✅ Provisioning complete in ${duration}ms`);

            return {
                success: true,
                schemaName: safeSchemaName,
                tableCount: verification.tableCount,
                modelsLoaded: syncResult.totalModels,
                tablesCreated: syncResult.tablesCreated,
                duration,
                logs,
                warnings: verification.warnings,
                tables: verification.tables
            };

        } catch (error: any) {
            logger.error(`[TenantProvisioning] ❌ Provisioning failed:`, error);
            logs.push(`❌ Error: ${error.message}`);
            
            return {
                success: false,
                schemaName: safeSchemaName,
                tableCount: 0,
                modelsLoaded: 0,
                tablesCreated: 0,
                duration: Date.now() - startTime,
                logs,
                error: error.message
            };
        }
    }

    /**
     * Step 1: Create tenant schema
     * Idempotent - safe to rerun
     */
    private async createSchema(schemaName: string): Promise<void> {
        const safeSchemaName = validateSchemaName(schemaName);
        logger.info(`[TenantProvisioning] Creating schema: ${safeSchemaName}`);
        
        // Create schema if not exists
        await this.sequelize.query(
            `CREATE SCHEMA IF NOT EXISTS "${safeSchemaName}"`,
            { type: 'RAW' }
        );

        logger.info(`[TenantProvisioning] ✅ Schema ready: ${safeSchemaName}`);
    }

    /**
     * Step 2: Sync all tenant models for the schema
     * 
     * CRITICAL: Uses the existing Sequelize instance (models already loaded)
     * Filters to tenant-only models, sorts by dependency, syncs to schema.
     */
    private async syncModelsForSchema(schemaName: string): Promise<SyncResult> {
        const safeSchemaName = validateSchemaName(schemaName);
        logger.info(`[TenantProvisioning] Syncing models for schema: ${safeSchemaName}`);

        // Get models from ModelLoader (for dependency sorting)
        const allModels = ModelLoader.getModelsFromDir(this.modelsBaseDir);
        logger.info(`[TenantProvisioning] Total models discovered: ${allModels.length}`);

        // Filter to tenant-only models (exclude public/root models)
        const publicModels = new Set([
            'Institution', 'Plan', 'PlanModule', 'Module', 'Feature', 
            'Permission', 'RoleTemplate', 'PlanDiscount', 'PlanPermission',
            'Admin', 'GlobalHoliday', 'TenantMetrics', 'AccessBundle',
            'AdminSession', 'AdminRefreshToken', 'FeatureFlag'
        ]);
        
        const tenantModels = allModels.filter((ModelClass: any) => {
            return !publicModels.has(ModelClass.name);
        });

        // Sort models by dependency order
        const sortedModels = ModelLoader.sortModels(tenantModels);
        logger.info(`[TenantProvisioning] Tenant models to sync: ${sortedModels.length}`);
        logger.info(`[TenantProvisioning] Model load order: ${sortedModels.map((m: any) => m.name).join(', ')}`);

        // Sync each model to the tenant schema
        const errors: string[] = [];
        let tablesCreated = 0;

        for (const ModelClass of sortedModels) {
            try {
                // Schema-bound sync: model.schema(schemaName).sync()
                // This creates the table in the specified schema with proper FK handling
                await ModelClass.schema(safeSchemaName).sync({ alter: false });
                tablesCreated++;
                logger.info(`[TenantProvisioning]   ✅ ${ModelClass.name}`);
            } catch (error: any) {
                if (error.message.includes('already exists')) {
                    logger.info(`[TenantProvisioning]   ⚠️ ${ModelClass.name} (already exists)`);
                } else {
                    logger.error(`[TenantProvisioning]   ❌ ${ModelClass.name}: ${error.message}`);
                    errors.push(`${ModelClass.name}: ${error.message}`);
                    // Continue with other models - don't fail entire provisioning
                }
            }
        }

        logger.info(`[TenantProvisioning] ✅ Sync complete: ${tablesCreated}/${sortedModels.length} tables`);
        
        return {
            totalModels: sortedModels.length,
            tablesCreated,
            errors
        };
    }

    /**
     * Step 3: Run SQL migrations
     * Executes all .sql files in migrations directory
     */
    private async runMigrations(schemaName: string): Promise<void> {
        const safeSchemaName = validateSchemaName(schemaName);
        logger.info(`[TenantProvisioning] Running migrations for schema: ${safeSchemaName}`);

        if (!fs.existsSync(this.migrationsDir)) {
            logger.info(`[TenantProvisioning] ⚠️ No migrations directory found`);
            return;
        }

        const migrationFiles = this.getOrderedMigrationFiles();

        logger.info(`[TenantProvisioning] Found ${migrationFiles.length} migration files`);

        const connection = await this.acquireMigrationConnection();

        try {
            for (const file of migrationFiles) {
                const filePath = path.join(this.migrationsDir, file);
                const sql = this.prepareMigrationSql(
                    fs.readFileSync(filePath, 'utf-8'),
                    safeSchemaName
                );

                try {
                    await this.executeMigrationFile(connection, file, sql, safeSchemaName);
                    logger.info(`[TenantProvisioning] ✅ Migration applied: ${file}`);
                } catch (error: unknown) {
                    const errorMessage = this.getErrorMessage(error);
                    if (this.isMigrationAlreadyAppliedError(errorMessage)) {
                        logger.info(
                            `[TenantProvisioning] ⚠️ Migration already applied/compatible: ${file} (${errorMessage})`
                        );
                    } else {
                        logger.error(`[TenantProvisioning] ❌ Migration failed ${file}: ${errorMessage}`);
                        // Continue with other migrations - don't fail entire provisioning
                    }
                }
            }
        } finally {
            await this.releaseMigrationConnection(connection);
        }
    }

    private acquireMigrationConnection(): Promise<MigrationQueryConnection> {
        const sequelizeWithConnectionManager = this.sequelize as unknown as {
            connectionManager: SequelizeConnectionManager;
        };

        return sequelizeWithConnectionManager.connectionManager.getConnection({ type: 'write' });
    }

    private getOrderedMigrationFiles(): string[] {
        const sqlFiles = fs.readdirSync(this.migrationsDir)
            .filter((fileName) => fileName.endsWith('.sql'));

        const dependencyOrder = [
            '20260219_fee_categories.sql',
            '20260219_fee_structures.sql',
            '20260219_fee_discounts.sql',
            '20260219_fee_payments.sql',
            '20260219_student_fee_assignments.sql'
        ];

        const dependencyRank = new Map<string, number>(
            dependencyOrder.map((fileName, index) => [fileName, index])
        );

        return sqlFiles.sort((left, right) => {
            const leftRank = dependencyRank.get(left);
            const rightRank = dependencyRank.get(right);

            if (leftRank != null && rightRank != null && leftRank !== rightRank) {
                return leftRank - rightRank;
            }

            if (leftRank != null) {
                return -1;
            }

            if (rightRank != null) {
                return 1;
            }

            return left.localeCompare(right);
        });
    }

    private async releaseMigrationConnection(connection: MigrationQueryConnection): Promise<void> {
        const sequelizeWithConnectionManager = this.sequelize as unknown as {
            connectionManager: SequelizeConnectionManager;
        };

        await sequelizeWithConnectionManager.connectionManager.releaseConnection(connection);
    }

    private async executeMigrationFile(
        connection: MigrationQueryConnection,
        fileName: string,
        sql: string,
        schemaName: string
    ): Promise<void> {
        await this.setMigrationSearchPath(connection, schemaName);

        if (!this.requiresStatementExecution(sql)) {
            await connection.query(sql);
            return;
        }

        const statements = this.splitSqlStatements(sql);
        logger.info(
            `[TenantProvisioning] Executing ${statements.length} statement(s) for migration ${fileName}`
        );

        for (const statement of statements) {
            await this.setMigrationSearchPath(connection, schemaName);
            await connection.query(statement);
        }
    }

    private prepareMigrationSql(sql: string, schemaName: string): string {
        return sql.replace(/\$\{SCHEMA_NAME\}/g, `"${schemaName}"`);
    }

    private async setMigrationSearchPath(
        connection: MigrationQueryConnection,
        schemaName: string
    ): Promise<void> {
        await connection.query(`SET search_path TO "${schemaName}", public, root`);
    }

    private requiresStatementExecution(sql: string): boolean {
        return /CREATE\s+INDEX\s+CONCURRENTLY/i.test(sql);
    }

    private splitSqlStatements(sql: string): string[] {
        const sqlWithoutLineComments = sql
            .split('\n')
            .map((line) => (line.trimStart().startsWith('--') ? '' : line))
            .join('\n');

        return sqlWithoutLineComments
            .split(';')
            .map((statement) => statement.trim())
            .filter((statement) => statement.length > 0)
            .map((statement) => `${statement};`);
    }

    private getErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        return String(error);
    }

    private isMigrationAlreadyAppliedError(errorMessage: string): boolean {
        const loweredMessage = errorMessage.toLowerCase();

        return (
            loweredMessage.includes('already exists') ||
            loweredMessage.includes('duplicate column') ||
            loweredMessage.includes('duplicate key value') ||
            loweredMessage.includes('enum label')
        );
    }

    /**
     * Count migration files (for reporting)
     */
    private countMigrationFiles(): number {
        if (!fs.existsSync(this.migrationsDir)) return 0;
        return fs.readdirSync(this.migrationsDir).filter(f => f.endsWith('.sql')).length;
    }

    /**
     * Step 4: Seed baseline data
     * Inserts required seed data for tenant operation
     */
    private async seedBaselineData(schemaName: string): Promise<void> {
        const safeSchemaName = validateSchemaName(schemaName);
        logger.info(`[TenantProvisioning] Seeding baseline data for schema: ${safeSchemaName}`);

        // Seed default roles
        await this.seedDefaultRoles(safeSchemaName);
        
        // Seed default attendance settings
        await this.seedAttendanceDefaults(safeSchemaName);
        
        // Seed academic defaults
        await this.seedAcademicDefaults(safeSchemaName);

        logger.info(`[TenantProvisioning] ✅ Baseline data seeded`);
    }

    /**
     * Seed default roles for new tenant
     * Note: Uses proper junction table (role_permissions) instead of JSON column
     */
    private async seedDefaultRoles(schemaName: string): Promise<void> {
        const safeSchemaName = validateSchemaName(schemaName);
        const defaultRoles = [
            {
                id: '550e8400-e29b-41d4-a716-446655440100',
                name: 'Admin',
                slug: 'admin',
                description: 'Full system access',
                role_type: 'admin',
                is_system: true,
                is_active: true,
                asset_type: 'system'
            },
            {
                id: '550e8400-e29b-41d4-a716-446655440101',
                name: 'Teacher',
                slug: 'teacher',
                description: 'Teaching staff',
                role_type: 'teacher',
                is_system: false,
                is_active: true,
                asset_type: 'public'
            },
            {
                id: '550e8400-e29b-41d4-a716-446655440102',
                name: 'Student',
                slug: 'student',
                description: 'Student user',
                role_type: 'student',
                is_system: false,
                is_active: true,
                asset_type: 'public'
            }
        ];

        for (const role of defaultRoles) {
            try {
                await this.sequelize.query(`
                    INSERT INTO "${safeSchemaName}".roles 
                    (id, name, slug, description, role_type, is_system, is_active, asset_type, created_at, updated_at)
                    VALUES (:id, :name, :slug, :description, :role_type, :is_system, :is_active, :asset_type, NOW(), NOW())
                    ON CONFLICT (id) DO NOTHING
                `, {
                    replacements: role,
                    type: 'RAW'
                });
                logger.info(`[TenantProvisioning] ✅ Role ${role.name} created`);
            } catch (error: any) {
                logger.info(`[TenantProvisioning] ⚠️ Role ${role.name}: ${error.message}`);
            }
        }
    }

    /**
     * Seed default attendance settings
     */
    private async seedAttendanceDefaults(schemaName: string): Promise<void> {
        const safeSchemaName = validateSchemaName(schemaName);
        try {
            await this.sequelize.query(`
                INSERT INTO "${safeSchemaName}".attendance_settings (
                    id, default_session_duration, late_threshold_minutes, 
                    auto_mark_absent_after, working_days, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(), 480, 15, 60, '["monday","tuesday","wednesday","thursday","friday"]',
                    NOW(), NOW()
                ) ON CONFLICT DO NOTHING
            `, { type: 'RAW' });
        } catch (error: any) {
            // Table may not exist yet
            logger.info(`[TenantProvisioning] ⚠️ Attendance settings table not ready`);
        }
    }

    /**
     * Seed academic defaults
     */
    private async seedAcademicDefaults(schemaName: string): Promise<void> {
        // This can be expanded based on requirements
        logger.info(`[TenantProvisioning] Academic defaults ready (optional)`);
    }

    /**
     * Step 5: Verify schema completeness
     * Ensures all required tables exist
     */
    private async verifySchema(schemaName: string): Promise<VerificationResult> {
        const safeSchemaName = validateSchemaName(schemaName);
        logger.info(`[TenantProvisioning] Verifying schema: ${safeSchemaName}`);

        const results = await this.sequelize.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = :schema
            ORDER BY table_name
        `, {
            replacements: { schema: safeSchemaName },
            type: 'SELECT'
        });

        const tables = results as any[];
        const tableNames = tables.map(t => t.table_name);
        const tableCount = tables.length;

        logger.info(`[TenantProvisioning] Found ${tableCount} tables in schema`);

        // Define critical tables that must exist
        const criticalTables = [
            'users', 'roles', 'user_roles', 'user_permissions', 'role_permissions',
            'students', 'student_attendance', 'attendance_settings',
            'classes', 'sections', 'subjects', 'teachers',
            'academic_sessions', 'exams', 'marks'
        ];

        const missingCritical = criticalTables.filter(ct => 
            !tableNames.some(tn => tn.toLowerCase() === ct.toLowerCase())
        );

        const warnings: string[] = [];
        if (missingCritical.length > 0) {
            warnings.push(`Missing critical tables: ${missingCritical.join(', ')}`);
        }

        if (tableCount < 50) {
            warnings.push(`Low table count: ${tableCount} (expected ~54)`);
        }

        return {
            tableCount,
            tables: tableNames,
            warnings,
            isComplete: tableCount >= 50 && missingCritical.length === 0
        };
    }

    /**
     * Check if a schema is fully provisioned
     */
    async isSchemaReady(schemaName: string): Promise<boolean> {
        const safeSchemaName = validateSchemaName(schemaName);
        try {
            const verification = await this.verifySchema(safeSchemaName);
            return verification.isComplete;
        } catch (error) {
            return false;
        }
    }

    /**
     * List all tables in a schema
     */
    async listTables(schemaName: string): Promise<string[]> {
        const safeSchemaName = validateSchemaName(schemaName);
        const results = await this.sequelize.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = :schema
            ORDER BY table_name
        `, {
            replacements: { schema: safeSchemaName },
            type: 'SELECT'
        });

        return (results as any[]).map(r => r.table_name);
    }
}

/**
 * Provisioning result interface
 */
export interface ProvisioningResult {
    success: boolean;
    schemaName: string;
    tableCount: number;
    modelsLoaded: number;
    tablesCreated: number;
    duration: number;
    logs: string[];
    warnings?: string[];
    tables?: string[];
    error?: string;
}

/**
 * Sync result interface
 */
interface SyncResult {
    totalModels: number;
    tablesCreated: number;
    errors: string[];
}

/**
 * Verification result interface
 */
interface VerificationResult {
    tableCount: number;
    tables: string[];
    warnings: string[];
    isComplete: boolean;
}

export default TenantProvisioningService;

