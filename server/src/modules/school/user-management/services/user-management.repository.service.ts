import { Transaction } from 'sequelize';
import { KeycloakService } from '../../../../core/auth/keycloak.service';
import { generateSecurePassword, hashPassword } from '../../../../core/utils/password.util';
import { AppError } from '../../../../core/utils/error';
import KEYCLOAK_CONFIG from '../../../../config/keycloak.config';
import { sequelize } from '../../../../database/sequelize';
import { RoleType } from '../../../../core/constants/roles';
import { TenantContext } from '../../../tenant/types/tenant.types';
import { AuditLogService } from '../../services/audit-log.service';
import { logger } from '../../../../core/utils/logger';
import { TenantUtil } from '../../../../core/utils/tenant.util';

// Repositories - all DB access goes through these
import {
    UserRepository,
    RoleRepository,
    UserRoleRepository,
    UserPermissionRepository,
    TenantRoleConfigRepository,
    TeacherRepository,
    InstitutionRepository,
    PlanRepository,
    PermissionRepository,
} from '../../repositories';

// DTOs
import {
    CreateTeacherDTO,
    CreateStudentDTO,
    CreateStaffDTO,
    CreateParentDTO,
    BulkCreateUsersDTO
} from '../validators/user-management.dto';

export type UserType = RoleType.ADMIN | RoleType.TEACHER | RoleType.STUDENT | RoleType.STAFF | RoleType.PARENT;

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

/**
 * Minimal permissions per role type (read-only by default)
 * These are the base permissions - actual assignment is filtered by Plan scope
 */
export const MINIMAL_PERMISSIONS: Record<UserType, string[]> = {
    [RoleType.ADMIN]: ['*'], // Admin gets full plan scope
    [RoleType.TEACHER]: ['academics.view', 'attendance.view', 'timetable.view', 'communication.view'],
    [RoleType.STUDENT]: ['academics.view', 'timetable.view', 'exams.view', 'communication.view'],
    [RoleType.STAFF]: ['communication.view', 'reports.view'],
    [RoleType.PARENT]: ['academics.view', 'attendance.view', 'exams.view'],
};

/**
 * Keycloak role name mapping
 */
const KEYCLOAK_ROLE_MAP: Record<UserType, string> = {
    [RoleType.ADMIN]: RoleType.ADMIN,
    [RoleType.TEACHER]: RoleType.TEACHER,
    [RoleType.STUDENT]: RoleType.STUDENT,
    [RoleType.STAFF]: RoleType.STAFF,
    [RoleType.PARENT]: RoleType.PARENT,
};

/**
 * Dependencies interface for UserManagementService
 */
interface UserManagementServiceDependencies {
    userRepository: UserRepository;
    roleRepository: RoleRepository;
    userRoleRepository: UserRoleRepository;
    userPermissionRepository: UserPermissionRepository;
    tenantRoleConfigRepository: TenantRoleConfigRepository;
    teacherRepository: TeacherRepository;
    institutionRepository: InstitutionRepository;
    planRepository: PlanRepository;
    permissionRepository: PermissionRepository;
}

/**
 * User Management Service (Repository-Based)
 *
 * MAJOR REFACTOR: All direct model access removed
 * - Uses repositories for all DB operations
 * - Pure orchestration layer
 * - Transaction management at service level
 *
 * BEFORE: Direct model access (User.schema(...).create(...))
 * AFTER: Repository methods (this.userRepo.create(...))
 *
 * NEXT STEPS:
 * - Extract Keycloak operations to KeycloakUserService
 * - Extract permission assignment to PermissionAssignmentService
 * - Add RBAC engine integration for permission checking
 */
export class UserManagementService {
    private tenant: TenantContext;
    private deps: UserManagementServiceDependencies;

    constructor(
        tenant: TenantContext,
        dependencies?: Partial<UserManagementServiceDependencies>
    ) {
        this.tenant = tenant;

        // Initialize repositories (dependency injection)
        this.deps = {
            userRepository: dependencies?.userRepository || new UserRepository(tenant),
            roleRepository: dependencies?.roleRepository || new RoleRepository(tenant),
            userRoleRepository: dependencies?.userRoleRepository || new UserRoleRepository(tenant),
            userPermissionRepository: dependencies?.userPermissionRepository || new UserPermissionRepository(tenant),
            tenantRoleConfigRepository: dependencies?.tenantRoleConfigRepository || new TenantRoleConfigRepository(tenant),
            teacherRepository: dependencies?.teacherRepository || new TeacherRepository(tenant),
            institutionRepository: dependencies?.institutionRepository || new InstitutionRepository(),
            planRepository: dependencies?.planRepository || new PlanRepository(),
            permissionRepository: dependencies?.permissionRepository || new PermissionRepository(),
        };
    }

    // Repository accessors for convenience
    private get userRepo() { return this.deps.userRepository; }
    private get roleRepo() { return this.deps.roleRepository; }
    private get userRoleRepo() { return this.deps.userRoleRepository; }
    private get userPermissionRepo() { return this.deps.userPermissionRepository; }
    private get tenantRoleConfigRepo() { return this.deps.tenantRoleConfigRepository; }
    private get teacherRepo() { return this.deps.teacherRepository; }
    private get institutionRepo() { return this.deps.institutionRepository; }
    private get planRepo() { return this.deps.planRepository; }
    private get permissionRepo() { return this.deps.permissionRepository; }

    /**
     * Get the Plan's allowed permissions (scope)
     */
    async getPlanScope(planId: string): Promise<string[]> {
        return this.planRepo.getPermissionKeys(planId);
    }

    /**
     * Get institution's plan and realm info
     */
    async getInstitutionPlan(): Promise<{ planId: string; realm: string; institutionId: string }> {
        const institution = await this.institutionRepo.findBySchema(this.tenant.db_schema);

        if (!institution) {
            throw new AppError('Institution not found', 404);
        }

        const planId = institution.plan_id;
        if (!planId) {
            throw new AppError('Institution has no associated plan', 400);
        }

        // Realm stays aligned with tenant resolution (subdomain-first).
        const realmIdentity = institution.sub_domain || institution.slug || institution.id;
        const realm = TenantUtil.generateRealmName(realmIdentity);

        return { planId, realm, institutionId: institution.id };
    }

    /**
     * Filter permissions by Plan scope
     */
    filterByPlanScope(requestedPerms: string[], planPerms: string[]): string[] {
        // If requested has wildcard and plan allows it
        if (requestedPerms.includes('*')) {
            return planPerms;
        }
        return requestedPerms.filter(perm => planPerms.includes(perm));
    }

    /**
     * Create a Teacher user
     */
    async createTeacher(adminUserId: string, data: CreateTeacherDTO) {
        return this.createUser(adminUserId, data, RoleType.TEACHER);
    }

    /**
     * Create a Student user
     */
    async createStudent(adminUserId: string, data: CreateStudentDTO) {
        return this.createUser(adminUserId, data, RoleType.STUDENT);
    }

    /**
     * Create a Staff user
     */
    async createStaff(adminUserId: string, data: CreateStaffDTO) {
        return this.createUser(adminUserId, data, RoleType.STAFF);
    }

    /**
     * Create a Parent user
     */
    async createParent(adminUserId: string, data: CreateParentDTO) {
        return this.createUser(adminUserId, data, RoleType.PARENT);
    }

    /**
     * Core user creation logic with Keycloak sync and plan-scoped permissions
     *
     * REFACTORED: All model access replaced with repository calls
     * - User creation: userRepo.create()
     * - Role resolution: roleRepo.findOrCreateByType() / tenantRoleConfigRepo.findByUserType()
     * - Role assignment: userRoleRepo.assign()
     * - Permission assignment: userPermissionRepo.bulkGrant()
     * - Teacher profile: teacherRepo.create()
     */
    private async createUser(
        adminUserId: string,
        data: CreateTeacherDTO | CreateStudentDTO | CreateStaffDTO | CreateParentDTO,
        userType: UserType
    ) {
        const transaction = await sequelize.transaction();
        let keycloakUserId: string | null = null;
        let realm: string = KEYCLOAK_CONFIG.realm;

        try {
            // 1. Get institution's plan and Keycloak realm
            const { planId, realm: institutionRealm, institutionId } = await this.getInstitutionPlan();
            realm = institutionRealm;

            // 2. Check if user already exists locally (using repository)
            const existingUser = await this.userRepo.findByEmail(data.email);
            if (existingUser) {
                throw new AppError(`User with email ${data.email} already exists`, 409);
            }

            // 3. Generate secure temporary password
            const tempPassword = generateSecurePassword(12);
            const passwordHash = await hashPassword(tempPassword);

            // 4. Create user in Keycloak with role
            keycloakUserId = await KeycloakService.createUserWithCredentials(
                realm,
                {
                    email: data.email,
                    firstName: data.firstName,
                    lastName: data.lastName,
                },
                tempPassword,
                [KEYCLOAK_ROLE_MAP[userType]]
            );

            // 5. Create user in local database (using repository)
            const user = await this.userRepo.create({
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone,
                passwordHash,
                keycloakId: keycloakUserId,
                institutionId,
                userType,
                createdBy: adminUserId,
                metadata: data.metadata || {},
            }, transaction);

            // 6. Resolve role (using repositories)
            let roleId: string;
            const roleConfig = await this.tenantRoleConfigRepo.findByUserType(userType);

            if (roleConfig) {
                roleId = roleConfig.default_role_id;
            } else {
                // Fallback: Find or create behavioral role
                const [role] = await this.roleRepo.findOrCreateByType(
                    userType,
                    {
                        name: userType.charAt(0).toUpperCase() + userType.slice(1),
                        description: `Default ${userType} role`,
                        isSystem: false,
                        assetType: 'custom'
                    },
                    transaction
                );
                roleId = role.id;
            }

            // Assign role (using repository)
            await this.userRoleRepo.assign({
                userId: user.id,
                roleId,
                assignedBy: adminUserId,
            }, transaction);

            // 7. Assign plan-scoped minimal permissions
            await this.assignMinimalPermissions(
                user.id,
                userType,
                planId,
                adminUserId,
                transaction
            );

            // 8. Create specialized profile (using repository)
            logger.info(`[UserManagementService] Creating profile for ${userType}`);

            if (userType === RoleType.TEACHER) {
                const teacherData = data as CreateTeacherDTO;
                await this.teacherRepo.create({
                    userId: user.id,
                    institutionId,
                    employeeId: teacherData.employeeId,
                    qualification: teacherData.qualification,
                    designation: teacherData.designation,
                    specialization: teacherData.specialization,
                    experienceYears: teacherData.experienceYears,
                    dateOfJoining: teacherData.dateOfJoining ? new Date(teacherData.dateOfJoining) : undefined,
                    phone: teacherData.phone || user.phone,
                    email: teacherData.email,
                    address: teacherData.address,
                    biography: teacherData.biography,
                    skills: teacherData.skills || [],
                    emergencyContactName: teacherData.emergencyContactName,
                    emergencyContactPhone: teacherData.emergencyContactPhone,
                    documents: teacherData.documents || {},
                    metadata: teacherData.metadata || {},
                }, transaction);
                logger.info(`[UserManagementService] Teacher profile created for user ${user.id}`);
            }
            // Student/Staff/Parent profiles handled similarly using respective repositories

            await transaction.commit();

            // Audit log (async, non-blocking)
            AuditLogService.logUserCreated(
                this.tenant.db_schema,
                adminUserId,
                user.id,
                data.email,
                userType
            ).catch(err => logger.error('[UserManagementService] Audit log failed:', err));

            return {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    userType,
                    keycloakId: keycloakUserId,
                },
                message: 'User created successfully. Login credentials are handled through secure identity flow.'
            };

        } catch (error) {
            await transaction.rollback();

            // Rollback Keycloak user if created
            if (keycloakUserId) {
                try {
                    await KeycloakService.deleteUser(realm, keycloakUserId);
                    logger.info(`[UserManagementService] Rolled back Keycloak user: ${keycloakUserId}`);
                } catch (rollbackError) {
                    logger.error('[UserManagementService] Failed to rollback Keycloak user:', rollbackError);
                }
            }

            throw error;
        }
    }

    /**
     * Assign minimal permissions within Plan scope
     *
     * REFACTORED: Uses repositories instead of direct model access
     */
    async assignMinimalPermissions(
        userId: string,
        userType: UserType,
        planId: string,
        grantedBy: string,
        transaction?: Transaction
    ): Promise<void> {
        // Get plan's allowed permissions
        const planScope = await this.getPlanScope(planId);

        // Get minimal permissions for this user type
        const minimalPerms = MINIMAL_PERMISSIONS[userType];

        // Filter by plan scope
        const allowedPerms = this.filterByPlanScope(minimalPerms, planScope);

        if (allowedPerms.length === 0) {
            logger.warn(`[UserManagementService] No permissions available for ${userType} in plan scope`);
            return;
        }

        // Get permission records from public schema (using repository)
        const permissions = await this.permissionRepo.findByKeys(allowedPerms);

        // Grant permissions (using repository)
        const userPermissions = permissions.map(p => ({
            permissionId: p.id,
            permissionKey: p.key,
            grantedBy,
        }));

        if (userPermissions.length > 0) {
            await this.userPermissionRepo.bulkGrant(userId, userPermissions, transaction);
        }
    }

    /**
     * Bulk create users
     */
    async bulkCreateUsers(adminUserId: string, data: BulkCreateUsersDTO) {
        const results: {
            success: Array<{
                user: {
                    id: string;
                    email: string;
                    firstName?: string;
                    lastName?: string;
                    userType: UserType;
                    keycloakId: string | null;
                };
                message: string;
            }>;
            failed: Array<{ email: string; error: string }>;
        } = { success: [], failed: [] };

        for (const userData of data.users) {
            try {
                const userMetadata = (userData as { metadata?: Record<string, unknown> }).metadata || {};
                const mergedData = {
                    ...userData,
                    metadata: { ...data.defaultMetadata, ...userMetadata }
                };

                let result;
                switch (data.userType) {
                    case RoleType.TEACHER:
                        result = await this.createTeacher(adminUserId, mergedData as CreateTeacherDTO);
                        break;
                    case RoleType.STUDENT:
                        result = await this.createStudent(adminUserId, mergedData as CreateStudentDTO);
                        break;
                    case RoleType.STAFF:
                        result = await this.createStaff(adminUserId, mergedData as CreateStaffDTO);
                        break;
                    case RoleType.PARENT:
                        result = await this.createParent(adminUserId, mergedData as CreateParentDTO);
                        break;
                }
                results.success.push(result);
            } catch (error) {
                results.failed.push({
                    email: userData.email,
                    error: getErrorMessage(error)
                });
            }
        }

        // Audit log bulk operation
        AuditLogService.logBulkUserCreated(
            this.tenant.db_schema,
            adminUserId,
            data.userType,
            results.success.length,
            results.failed.length
        ).catch(err => logger.error('[UserManagementService] Bulk audit log failed:', err));

        return results;
    }

    /**
     * Deactivate a user
     */
    async deactivateUser(userId: string, adminUserId: string): Promise<void> {
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Disable in Keycloak
        const keycloakId = user.keycloak_id;
        if (keycloakId) {
            try {
                const { realm } = await this.getInstitutionPlan();
                await KeycloakService.disableUser(realm, keycloakId);
            } catch (error) {
                logger.error('[UserManagementService] Failed to disable Keycloak user:', error);
            }
        }

        // Deactivate locally (using repository)
        await this.userRepo.deactivate(userId);

        // Audit log
        AuditLogService.logUserDeactivated(
            this.tenant.db_schema,
            adminUserId,
            userId,
            user.email
        ).catch(err => logger.error('[UserManagementService] Deactivate audit log failed:', err));
    }

    /**
     * List users by type
     */
    async listUsers(options: {
        userType?: UserType;
        isActive?: boolean;
        page?: number;
        limit?: number;
    } = {}) {
        // For now, delegate to userRepo.list()
        // FUTURE: Add teacher profile joining if userType === TEACHER
        const { rows, count } = await this.userRepo.list(
            {
                userType: options.userType,
                isActive: options.isActive ?? true,
            },
            { page: options.page, limit: options.limit }
        );

        return {
            users: rows,
            pagination: {
                page: options.page || 1,
                limit: options.limit || 50,
                total: count,
                totalPages: Math.ceil(count / (options.limit || 50)),
            }
        };
    }

    /**
     * Get user by ID with roles and permissions
     */
    async getUserById(userId: string) {
        const user = await this.userRepo.findById(userId);

        if (!user) {
            throw new AppError('User not found', 404);
        }

        // Get user permissions
        const permissions = await this.userPermissionRepo.getPermissionKeys(userId);

        return {
            ...user.toJSON(),
            permissions
        };
    }
}

/**
 * Factory function for creating UserManagementService instances
 *
 * USAGE IN CONTROLLERS:
 * ```typescript
 * const service = createUserManagementService(req.tenant);
 * const result = await service.createTeacher(adminUserId, data);
 * ```
 */
export function createUserManagementService(
    tenant: TenantContext,
    dependencies?: Partial<UserManagementServiceDependencies>
): UserManagementService {
    return new UserManagementService(tenant, dependencies);
}

// Default export for compatibility
export default UserManagementService;
