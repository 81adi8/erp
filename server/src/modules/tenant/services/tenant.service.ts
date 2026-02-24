import { sequelize, createSchema } from '../../../database/sequelize';
import { Institution } from '../../../database/models/public/Institution.model';
import { Plan } from '../../../database/models/public/Plan.model';
import { Module } from '../../../database/models/public/Module.model';
import { RoleTemplate } from '../../../database/models/public/RoleTemplate.model';
import { Role } from '../../../database/models/shared/core/Role.model';
import { User } from '../../../database/models/shared/core/User.model';
import { UserRole } from '../../../database/models/shared/core/UserRole.model';
import { RolePermission } from '../../../database/models/shared/core/RolePermission.model';
import { TenantRoleConfig } from '../../../database/models/shared/core/TenantRoleConfig.model';
import { KeycloakService } from '../../../core/auth/keycloak.service';
import { RoleType, INSTITUTION_ROLES } from '../../../core/constants/roles';
import { InstitutionType, MODEL_DIRECTORIES } from '../../../core/constants/tenant';
import { TenantUtil } from '../../../core/utils/tenant.util';
import { ModelLoader } from '../../../database/model-loader';
import { AppError } from '../../../core/utils/error';
import { TenantShadowTelemetry } from '../../../core/tenant/tenant-shadow.telemetry';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import { Op, Transaction, QueryTypes } from 'sequelize';
import KEYCLOAK_CONFIG from '../../../config/keycloak.config';
import { logger } from '../../../core/utils/logger';

const executeQuery = sequelize.query.bind(sequelize);

/**
 * Provisioning checkpoint status
 * Used to track activation requirements
 */
interface ProvisioningCheckpoint {
    schemaExists: boolean;
    migrationsComplete: boolean;
    rbacSeeded: boolean;
    adminCreated: boolean;
    loginVerified: boolean;
}

/**
 * Activation result with detailed status
 */
interface ActivationResult {
    success: boolean;
    status: 'active' | 'provisioning_failed' | 'provisioning';
    checkpoints: ProvisioningCheckpoint;
    failureReason?: string;
}

interface InstitutionInitInput {
    name: string;
    slug: string;
    subDomain: string;
    domainUrl: string;
    schemaName: string;
    institutionType: InstitutionType;
    planId: string;
}

interface TransactionWithState extends Transaction {
    finished?: string;
}

interface DefaultRoleSeed {
    name: string;
    description: string;
    role_type: RoleType;
}

interface SchemaTableRow {
    table_name: string;
}

/**
 * Service responsible for Tenant lifecycle management including
 * database provisioning, Keycloak setup, and initial data seeding.
 */
export class TenantService {
    private static runQuery(sql: string, options?: Parameters<typeof sequelize.query>[1]): Promise<any> {
        return executeQuery(sql, options as any);
    }

    /**
     * Create a new institution (tenant), schema, and seed initial data.
     * Orchestrates the entire provisioning process in a robust, step-by-step manner.
     */
    static async createTenant(
        name: string,
        slug: string,
        subDomain: string,
        adminEmail: string,
        adminPassword: string,
        planSlug: string = 'basic',
        institutionType: InstitutionType = InstitutionType.SCHOOL
    ) {
        const transaction = await sequelize.transaction();

        try {
            logger.info(`\n[TenantService] Ã°Å¸Å¡â‚¬ Starting provisioning for Tenant: "${name}" (${slug})`);

            // 1. Validate Input & Plan
            logger.info(`[TenantService] [1/7] Validating plan: ${planSlug}...`);
            const plan = await this.validatePlan(planSlug, transaction);
            if (!MODEL_DIRECTORIES[institutionType]) {
                throw new AppError(`Invalid institution type: ${institutionType}`, 400);
            }

            const schemaName = TenantUtil.generateSchemaName(slug);
            const realmName = TenantUtil.generateRealmName(subDomain);
            const domainUrl = TenantUtil.generateTenantUrl(subDomain);

            // 2. Create Institution Record (Public Schema)
            logger.info(`[TenantService] [2/7] Creating institution record in public schema...`);
            const tenant = await this.initializeInstitutionRecord(
                { name, slug, subDomain, domainUrl, schemaName, institutionType, planId: plan.id },
                transaction
            );

            // 3. Keycloak Isolation Setup
            logger.info(`[TenantService] [3/7] Setting up Keycloak realm and client...`);
            await this.setupKeycloakInfrastructure(realmName, name, domainUrl, institutionType);

            // 4. Database Schema Setup
            logger.info(`[TenantService] [4/7] Initializing database schema: ${schemaName}...`);
            await this.initializeDatabaseSchema(schemaName);

            // Commit public transaction before proceeding to tenant-specific sync
            // This ensures the Institution record is visible to subsequent processes
            await transaction.commit();

            // 5. Tenant-Specific Data Initialization
            logger.info(`[TenantService] [5/7] Syncing models and seeding roles for ${institutionType}...`);
            await this.syncTenantModels(schemaName, institutionType);
            const roles = await this.seedRolesAndPermissions(schemaName, institutionType, plan.id);

            logger.info(`[TenantService] Setting up initial admin user: ${adminEmail}...`);
            const adminUser = await this.setupAdminUser(schemaName, tenant.id, adminEmail, adminPassword);

            // 6. Sync Admin to Keycloak (Ensures admin can log in immediately)
            logger.info(`[TenantService] [6/7] Syncing administrator to Keycloak...`);
            await this.syncAdminToKeycloak(realmName, adminEmail, adminPassword);

            // 7. Final Configuration (Assign default role pointers)
            logger.info(`[TenantService] [7/7] Finalizing role configurations...`);
            await this.initializeRoleConfigs(schemaName, roles, plan.id);

            logger.info(`[TenantService] Ã¢Å“â€œ Tenant "${name}" successfully provisioned at ${domainUrl}`);
            return tenant;

        } catch (error) {
            if (transaction && !(transaction as TransactionWithState).finished) {
                await transaction.rollback().catch(() => { });
            }
            logger.error('[TenantService] Provisioning failed:', error);
            throw error;
        }
    }

    private static async validatePlan(planSlug: string, transaction: Transaction) {
        const plan = await Plan.findOne({
            where: { slug: planSlug },
            include: [{ model: Module }],
            transaction
        });
        if (!plan) throw new AppError(`Invalid plan: ${planSlug}`, 400);
        return plan;
    }

    /**
     * Creates or finds the Institution entry in the public shared schema.
     */
    private static async initializeInstitutionRecord(data: InstitutionInitInput, transaction: Transaction) {
        const [tenant] = await Institution.findOrCreate({
            where: { [Op.or]: [{ slug: data.slug }, { sub_domain: data.subDomain }] },
            defaults: {
                name: data.name,
                code: data.slug,
                slug: data.slug,
                sub_domain: data.subDomain,
                domainUrl: data.domainUrl,
                db_schema: data.schemaName,
                type: data.institutionType,
                is_active: true,
                status: 'active',
                plan_id: data.planId
            },
            transaction
        });
        return tenant;
    }

    /**
     * Sets up a dedicated Keycloak realm and client for tenant isolation.
     */
    private static async setupKeycloakInfrastructure(realm: string, name: string, url: string, type: InstitutionType) {
        try {
            logger.info(`[TenantService] Configuring Keycloak isolation: ${realm}`);
            await KeycloakService.createRealm(realm, name);

            const roles = this.getDefaultRoles(type).map(r => r.name.toLowerCase());
            await KeycloakService.setupDefaultRoles(realm, roles);

            await KeycloakService.createClient(realm, KEYCLOAK_CONFIG.clientId, url);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            logger.warn(`[TenantService] Keycloak infrastructure warning: ${errorMessage}`);
        }
    }

    /**
     * Creates the physical Postgres schema and required extensions.
     */
    private static async initializeDatabaseSchema(schemaName: string) {
        await createSchema(schemaName);
        // Ensure citext is available for case-insensitive searches (e.g. emails)
        await this.runQuery(`CREATE EXTENSION IF NOT EXISTS citext;`);
        await this.runQuery(`CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA "${schemaName}";`).catch(() => { });
    }

    /**
     * Discovers and synchronizes models relevant to the institution type into the tenant schema.
     */
    private static async syncTenantModels(schemaName: string, type: InstitutionType) {
        logger.info(`[TenantService] Syncing models for ${schemaName}...`);
        const modelsBaseDir = path.join(__dirname, '../../database/models');

        // 1. Load shared/core models
        const sharedModels = ModelLoader.getModelsFromDir(path.join(modelsBaseDir, 'shared', 'core'));

        // 2. Load type-specific models
        const typeSpecificModels: Array<{ schema: (schemaName: string) => { sync: () => Promise<unknown> } }> = [];
        const moduleDirs = MODEL_DIRECTORIES[type] || [];
        for (const dirName of moduleDirs) {
            const dirPath = path.join(modelsBaseDir, type, dirName);
            typeSpecificModels.push(...ModelLoader.getModelsFromDir(dirPath));
        }

        const allModels = [...sharedModels, ...typeSpecificModels];
        const sorted = ModelLoader.sortModels(allModels);

        for (const model of sorted) {
            await model.schema(schemaName).sync();
        }
    }

    /**
     * Seeds initial roles and permissions, prioritizing templates matched to the plan.
     */
    private static async seedRolesAndPermissions(schemaName: string, type: InstitutionType, planId: string) {
        const templates = await RoleTemplate.findAll({
            where: {
                is_active: true,
                tenant_type: { [Op.in]: [type, 'all'] },
                [Op.or]: [{ plan_id: planId }, { plan_id: null }]
            },
            order: [['sort_order', 'ASC']]
        });

        const roles: Record<string, Role> = {};

        if (templates.length > 0) {
            for (const t of templates) {
                const [role] = await Role.schema(schemaName).findOrCreate({
                    where: { name: t.name },
                    defaults: {
                        name: t.name,
                        description: t.description,
                        role_type: t.role_type,
                        asset_type: t.asset_type || 'public',
                        is_system: t.is_system || false,
                        plan_id: t.plan_id || planId
                    }
                });
                roles[t.name.toLowerCase()] = role;

                if (t.permission_ids?.length) {
                    const perms = t.permission_ids.map((pid: string) => ({ role_id: role.id, permission_id: pid }));
                    await RolePermission.schema(schemaName).bulkCreate(perms, { ignoreDuplicates: true });
                }
            }
        } else {
            const defaults = this.getDefaultRoles(type);
            for (const d of defaults) {
                const [role] = await Role.schema(schemaName).findOrCreate({
                    where: { name: d.name },
                    defaults: { ...d, asset_type: 'public', is_system: true, plan_id: planId }
                });
                roles[d.name.toLowerCase()] = role;
            }
        }
        return roles;
    }

    /**
     * Creates the initial school administrator in the local database.
     */
    private static async setupAdminUser(schemaName: string, tenantId: string, email: string, password: string) {
        const salt = await bcrypt.genSalt(12);
        const [user] = await User.schema(schemaName).findOrCreate({
            where: { email: email.toLowerCase() },
            defaults: {
                email: email.toLowerCase(),
                first_name: KEYCLOAK_CONFIG.userDefaults.firstName,
                last_name: KEYCLOAK_CONFIG.userDefaults.lastName,
                password_hash: await bcrypt.hash(password, salt),
                is_active: true,
                is_email_verified: true,
                institution_id: tenantId
            }
        });

        // Find admin role (prefer by type, fallback to name)
        let adminRole = await Role.schema(schemaName).findOne({ where: { role_type: RoleType.ADMIN } });
        if (!adminRole) {
            adminRole = await Role.schema(schemaName).findOne({ where: { name: 'admin' } });
            logger.warn(`[TenantService] Role with type ADMIN not found for ${schemaName}, fell back to name 'admin'`);
        }
        if (adminRole) {
            await UserRole.schema(schemaName).findOrCreate({
                where: { user_id: user.id, role_id: adminRole.id },
                defaults: {
                    user_id: user.id,
                    role_id: adminRole.id,
                    institution_id: tenantId,
                    assignment_type: 'system_default',
                    assigned_at: new Date()
                }
            });
        }
        return user;
    }

    private static async syncAdminToKeycloak(realm: string, email: string, password: string) {
        try {
            // This now handles both creation and thorough setup (clearing required actions)
            await KeycloakService.createUserWithCredentials(realm, { email, username: email, firstName: KEYCLOAK_CONFIG.userDefaults.firstName, lastName: KEYCLOAK_CONFIG.userDefaults.lastName }, password, ['admin']);
        } catch (err) {
            const error = err as any;
            if (error.statusCode === 409) {
                // If user exists, ensure setup is verified (clears temporary passwords/required actions)
                await KeycloakService.ensureUserIsFullySetUp(realm, email, password);
            } else {
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                logger.error(`[TenantService] Keycloak user sync failed: ${errorMessage}`);
                throw err;
            }
        }
    }

    /**
     * Configures default role routing (e.g. mapping "Student" user type to "student" role).
     */
    private static async initializeRoleConfigs(schemaName: string, roles: Record<string, Role>, planId: string) {
        const mapping: Record<string, string> = {
            'admin': 'admin', 'student': 'student', 'teacher': 'teacher',
            'staff': 'staff', 'parent': 'parent', 'faculty': 'faculty',
            'hod': 'hod', 'instructor': 'instructor'
        };

        for (const [userType, roleKey] of Object.entries(mapping)) {
            const role = roles[roleKey];
            if (role) {
                await TenantRoleConfig.schema(schemaName).findOrCreate({
                    where: { user_type: userType },
                    defaults: {
                        user_type: userType,
                        default_role_id: role.id,
                        is_system_role: true,
                        role_slug: role.name.toLowerCase().replace(/\s+/g, '-'),
                        plan_id: planId,
                        last_changed_at: new Date(),
                        metadata: { initialized_during: 'tenant_creation' }
                    }
                });
            }
        }
    }

    /**
     * Fallback default roles when no templates are found.
     * Uses centralized metadata from INSTITUTION_ROLES.
     */
    private static getDefaultRoles(type: InstitutionType): DefaultRoleSeed[] {
        const base = [
            { name: 'Admin', description: 'Administrator', role_type: RoleType.ADMIN },
        ];

        // Fetch type-specific roles from our centralized metadata
        const typeRoles = (INSTITUTION_ROLES[type] || []).map((r) => ({
            name: r.label.split(' / ')[0], // Use first part of label as name
            description: r.description,
            role_type: r.id
        }));

        // Filter out Admin if it's already in base to avoid duplicates if someone added it to INSTITUTION_ROLES
        const filteredTypeRoles = typeRoles
            .filter((r) => r.role_type !== RoleType.ADMIN && r.name !== undefined)
            .map((r) => ({
                name: r.name!,
                description: r.description,
                role_type: r.role_type
            }));

        return [...base, ...filteredTypeRoles];
    }

    static async getBySubdomain(subdomain: string) {
        return Institution.findOne({ where: { sub_domain: subdomain, is_active: true } });
    }

    static async getBySlug(slug: string) {
        return Institution.findOne({ where: { slug, is_active: true } });
    }

    // ============================================================
    // TASK-02: PROVISIONING ACTIVATION GATE
    // ============================================================

    /**
     * Verify all provisioning checkpoints before activation
     * Tenant can ONLY be marked active if ALL checkpoints pass
     */
    static async verifyProvisioningCheckpoints(schemaName: string, tenantId: string, adminEmail: string): Promise<ProvisioningCheckpoint> {
        const checkpoints: ProvisioningCheckpoint = {
            schemaExists: false,
            migrationsComplete: false,
            rbacSeeded: false,
            adminCreated: false,
            loginVerified: false
        };

        try {
            // Check 1: Schema exists
            const schemaResult = await this.runQuery(
                `SELECT schema_name FROM information_schema.schemata WHERE schema_name = :schemaName`,
                { replacements: { schemaName }, type: QueryTypes.SELECT }
            );
            checkpoints.schemaExists = Array.isArray(schemaResult) && schemaResult.length > 0;

            if (!checkpoints.schemaExists) {
                return checkpoints;
            }

            // Check 2: Migrations complete (check for core tables)
            const tablesResult = await this.runQuery(
                `SELECT table_name FROM information_schema.tables WHERE table_schema = :schemaName`,
                { replacements: { schemaName }, type: QueryTypes.SELECT }
            );
            const requiredTables = ['users', 'roles', 'user_roles', 'role_permissions'];
            const existingTables = Array.isArray(tablesResult)
                ? (tablesResult as SchemaTableRow[]).map((t) => t.table_name)
                : [];
            checkpoints.migrationsComplete = requiredTables.every(t => existingTables.includes(t));

            if (!checkpoints.migrationsComplete) {
                return checkpoints;
            }

            // Check 3: RBAC seeded (at least one role exists)
            const rolesCount = await Role.schema(schemaName).count();
            checkpoints.rbacSeeded = rolesCount > 0;

            if (!checkpoints.rbacSeeded) {
                return checkpoints;
            }

            // Check 4: Admin created
            const adminUser = await User.schema(schemaName).findOne({
                where: { email: adminEmail.toLowerCase() }
            });
            checkpoints.adminCreated = !!adminUser;

            if (!checkpoints.adminCreated) {
                return checkpoints;
            }

            // Check 5: Login verified (admin is active and has role)
            if (adminUser) {
                const adminRole = await Role.schema(schemaName).findOne({
                    where: { role_type: RoleType.ADMIN }
                });
                if (adminRole) {
                    const userRole = await UserRole.schema(schemaName).findOne({
                        where: { user_id: adminUser.id, role_id: adminRole.id }
                    });
                    checkpoints.loginVerified = adminUser.is_active && !!userRole;
                }
            }

            return checkpoints;
        } catch (error) {
            logger.error('[TenantService] Error verifying checkpoints:', error);
            return checkpoints;
        }
    }

    /**
     * Activate tenant with full checkpoint validation
     * NEVER marks tenant as active on partial success
     */
    static async activateTenant(tenantId: string): Promise<ActivationResult> {
        const tenant = await Institution.findByPk(tenantId);
        if (!tenant) {
            return {
                success: false,
                status: 'provisioning_failed',
                checkpoints: {
                    schemaExists: false,
                    migrationsComplete: false,
                    rbacSeeded: false,
                    adminCreated: false,
                    loginVerified: false
                },
                failureReason: 'Tenant not found'
            };
        }

        // Get admin email from tenant metadata or use default
        const adminEmail = tenant.metadata?.adminEmail || 'admin@example.com';
        
        const checkpoints = await this.verifyProvisioningCheckpoints(
            tenant.db_schema,
            tenantId,
            adminEmail
        );

        // ALL checkpoints must pass
        const allPassed = Object.values(checkpoints).every(v => v === true);

        if (!allPassed) {
            const failedChecks = Object.entries(checkpoints)
                .filter(([, passed]) => !passed)
                .map(([name]) => name);

            TenantShadowTelemetry.tenantActivationBlocked({
                tenant_id: tenantId,
                failed_checks: failedChecks,
                reason: 'provisioning_incomplete'
            });

            // Update status to provisioning_failed
            await tenant.update({ status: 'provisioning_failed' });

            return {
                success: false,
                status: 'provisioning_failed',
                checkpoints,
                failureReason: `Failed checkpoints: ${failedChecks.join(', ')}`
            };
        }

        // All checkpoints passed - safe to activate
        await tenant.update({ status: 'active', is_active: true });

        return {
            success: true,
            status: 'active',
            checkpoints
        };
    }

    /**
     * Create tenant with activation gate
     * This is the recommended method for tenant creation
     */
    static async createTenantWithActivationGate(
        name: string,
        slug: string,
        subDomain: string,
        adminEmail: string,
        adminPassword: string,
        planSlug: string = 'basic',
        institutionType: InstitutionType = InstitutionType.SCHOOL
    ): Promise<{ tenant: Institution; activation: ActivationResult }> {
        // Create tenant with 'provisioning' status initially
        const transaction = await sequelize.transaction();

        try {
            logger.info(`\n[TenantService] Ã°Å¸Å¡â‚¬ Starting gated provisioning for Tenant: "${name}" (${slug})`);

            // 1. Validate Input & Plan
            const plan = await this.validatePlan(planSlug, transaction);
            if (!MODEL_DIRECTORIES[institutionType]) {
                throw new AppError(`Invalid institution type: ${institutionType}`, 400);
            }

            const schemaName = TenantUtil.generateSchemaName(slug);
            const realmName = TenantUtil.generateRealmName(subDomain);
            const domainUrl = TenantUtil.generateTenantUrl(subDomain);

            // 2. Create Institution Record with 'provisioning' status
            const [tenant] = await Institution.findOrCreate({
                where: { [Op.or]: [{ slug }, { sub_domain: subDomain }] },
                defaults: {
                    name,
                    code: slug,
                    slug,
                    sub_domain: subDomain,
                    domainUrl,
                    db_schema: schemaName,
                    type: institutionType,
                    is_active: false, // NOT active until verified
                    status: 'provisioning',
                    plan_id: plan.id,
                    metadata: { adminEmail }
                },
                transaction
            });

            await transaction.commit();

            // 3. Keycloak Isolation Setup
            await this.setupKeycloakInfrastructure(realmName, name, domainUrl, institutionType);

            // 4. Database Schema Setup
            await this.initializeDatabaseSchema(schemaName);

            // 5. Tenant-Specific Data Initialization
            await this.syncTenantModels(schemaName, institutionType);
            const roles = await this.seedRolesAndPermissions(schemaName, institutionType, plan.id);

            const adminUser = await this.setupAdminUser(schemaName, tenant.id, adminEmail, adminPassword);

            // 6. Sync Admin to Keycloak
            await this.syncAdminToKeycloak(realmName, adminEmail, adminPassword);

            // 7. Final Configuration
            await this.initializeRoleConfigs(schemaName, roles, plan.id);

            // 8. ACTIVATION GATE - Verify all checkpoints before activation
            const activation = await this.activateTenant(tenant.id);

            if (!activation.success) {
                logger.error(`[TenantService] Ã¢Å¡Â Ã¯Â¸Â Tenant "${name}" provisioned but NOT activated: ${activation.failureReason}`);
            } else {
                logger.info(`[TenantService] Ã¢Å“â€œ Tenant "${name}" fully activated at ${domainUrl}`);
            }

            return { tenant, activation };
        } catch (error) {
            if (transaction && !(transaction as TransactionWithState).finished) {
                await transaction.rollback().catch(() => { });
            }
            logger.error('[TenantService] Provisioning failed:', error);
            throw error;
        }
    }
}
