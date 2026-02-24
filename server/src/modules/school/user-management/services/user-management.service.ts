import { User } from '../../../../database/models/shared/core/User.model';
import { Role } from '../../../../database/models/shared/core/Role.model';
import { UserRole } from '../../../../database/models/shared/core/UserRole.model';
import { UserPermission } from '../../../../database/models/shared/core/UserPermission.model';
import { TenantRoleConfig } from '../../../../database/models/shared/core/TenantRoleConfig.model';
import { Permission as PublicPermission } from '../../../../database/models/public/Permission.model';
import { Plan } from '../../../../database/models/public/Plan.model';
import { Institution } from '../../../../database/models/public/Institution.model';
import { KeycloakService } from '../../../../core/auth/keycloak.service';
import { generateSecurePassword, hashPassword } from '../../../../core/utils/password.util';
import { AppError } from '../../../../core/utils/error';
import { env } from '../../../../config/env';
import KEYCLOAK_CONFIG from '../../../../config/keycloak.config';
import { sequelize } from '../../../../database/sequelize';
import { Op, Transaction, WhereOptions, Includeable, fn, col } from 'sequelize';
import { RoleType } from '../../../../core/constants/roles';
import { Teacher } from '../../../../database/models/school/academics/staff/Teacher.model';
import { AuditLogService } from '../../services/audit-log.service';
import { toError } from '../../../../core/utils/error.util';
import { logger } from '../../../../core/utils/logger';
import { TenantUtil } from '../../../../core/utils/tenant.util';
import {
    CreateTeacherDTO,
    CreateStudentDTO,
    CreateStaffDTO,
    CreateParentDTO,
    BulkCreateUsersDTO
} from '../validators/user-management.dto';

export type UserType = RoleType.ADMIN | RoleType.TEACHER | RoleType.STUDENT | RoleType.STAFF | RoleType.PARENT;

interface PlanPermission {
    key: string;
}

interface InstitutionData {
    plan_id: string;
    id: string;
    sub_domain?: string | null;
    slug?: string | null;
}

interface UserResult {
    user: {
        id: string;
        email: string;
        firstName: string | undefined;
        lastName: string | undefined;
        userType: UserType;
        keycloakId: string | null;
    };
    message: string;
}

interface BulkResult {
    success: UserResult[];
    failed: Array<{ email: string; error: string }>;
}

interface UserListResult {
    users: unknown[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

interface UserStatsResult {
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
}

/**
 * Minimal permissions per role type (read-only by default)
 * These are the base permissions - actual assignment is filtered by Plan scope
 */
export const MINIMAL_PERMISSIONS: Record<UserType, string[]> = {
    [RoleType.ADMIN]: ['*'],
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
 * User Management Service
 * Centralized service for creating and managing school users
 * with Keycloak integration and plan-scoped permissions
 */
export class UserManagementService {

    /**
     * Get the Plan's allowed permissions (scope)
     */
    static async getPlanScope(planId: string): Promise<string[]> {
        const plan = await Plan.findByPk(planId, {
            include: [PublicPermission]
        });

        if (!plan) {
            throw new AppError('Plan not found', 404);
        }

        return (plan.permissions || []).map((p: PlanPermission) => p.key);
    }

    /**
     * Get institution's plan from tenant schema
     */
    static async getInstitutionPlan(schemaName: string): Promise<{ planId: string; realm: string; institutionId: string }> {
        const institution = await Institution.findOne({
            where: { db_schema: schemaName }
        });

        if (!institution) {
            throw new AppError('Institution not found', 404);
        }

        const instData = institution.toJSON() as InstitutionData;
        const planId = instData.plan_id;
        if (!planId) {
            throw new AppError('Institution has no associated plan', 400);
        }

        const realmIdentity =
            instData.sub_domain
            || instData.slug
            || institution.sub_domain
            || institution.slug
            || instData.id;
        const realm = TenantUtil.generateRealmName(realmIdentity);

        return { planId, realm, institutionId: instData.id };
    }


    /**
     * Filter permissions by Plan scope
     */
    static filterByPlanScope(requestedPerms: string[], planPerms: string[]): string[] {
        if (requestedPerms.includes('*')) {
            return planPerms;
        }
        return requestedPerms.filter(perm => planPerms.includes(perm));
    }

    /**
     * Create a Teacher user
     */
    static async createTeacher(
        schemaName: string,
        adminUserId: string,
        data: CreateTeacherDTO
    ): Promise<UserResult> {
        return this.createUser(schemaName, adminUserId, data, RoleType.TEACHER);
    }

    /**
     * Create a Student user
     */
    static async createStudent(
        schemaName: string,
        adminUserId: string,
        data: CreateStudentDTO
    ): Promise<UserResult> {
        return this.createUser(schemaName, adminUserId, data, RoleType.STUDENT);
    }

    /**
     * Create a Staff user
     */
    static async createStaff(
        schemaName: string,
        adminUserId: string,
        data: CreateStaffDTO
    ): Promise<UserResult> {
        return this.createUser(schemaName, adminUserId, data, RoleType.STAFF);
    }

    /**
     * Create a Parent user
     */
    static async createParent(
        schemaName: string,
        adminUserId: string,
        data: CreateParentDTO
    ): Promise<UserResult> {
        return this.createUser(schemaName, adminUserId, data, RoleType.PARENT);
    }

    /**
     * Core user creation logic with Keycloak sync and plan-scoped permissions
     */
    private static async createUser(
        schemaName: string,
        adminUserId: string,
        data: CreateTeacherDTO | CreateStudentDTO | CreateStaffDTO | CreateParentDTO,
        userType: UserType
    ): Promise<UserResult> {
        const transaction = await sequelize.transaction();
        let keycloakUserId: string | null = null;
        let realm: string = KEYCLOAK_CONFIG.realm;

        try {
            const { planId, realm: institutionRealm, institutionId } = await this.getInstitutionPlan(schemaName);
            realm = institutionRealm;

            const existingUser = await User.schema(schemaName).findOne({
                where: { email: data.email.toLowerCase() }
            });
            if (existingUser) {
                throw new AppError(`User with email ${data.email} already exists`, 409);
            }

            const tempPassword = generateSecurePassword(12);
            const passwordHash = await hashPassword(tempPassword);

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

            const user = await User.schema(schemaName).create({
                email: data.email.toLowerCase(),
                first_name: data.firstName,
                last_name: data.lastName,
                phone: data.phone,
                password_hash: passwordHash,
                is_active: true,
                is_email_verified: true,
                keycloak_id: keycloakUserId,
                institution_id: institutionId,
                user_type: userType,
                created_by: adminUserId,
                metadata: data.metadata || {},
            }, { transaction });

            let roleId: string;
            const roleConfig = await TenantRoleConfig.schema(schemaName).findOne({
                where: { user_type: userType },
                transaction
            });

            if (roleConfig) {
                roleId = roleConfig.default_role_id;
            } else {
                const [role] = await Role.schema(schemaName).findOrCreate({
                    where: { role_type: userType },
                    defaults: {
                        role_type: userType,
                        name: userType.charAt(0).toUpperCase() + userType.slice(1),
                        description: `Default ${userType} role`,
                        is_system: false,
                        asset_type: 'custom'
                    },
                    transaction
                });
                roleId = role.id;
            }

            await UserRole.schema(schemaName).create({
                user_id: user.id,
                role_id: roleId,
                assigned_by: adminUserId,
            }, { transaction });

            await this.assignMinimalPermissions(
                schemaName,
                user.id,
                userType,
                planId,
                adminUserId,
                transaction
            );

            logger.info(`[UserManagementService] Creating profile for ${userType} in schema ${schemaName}`);

            if (userType === RoleType.TEACHER) {
                const teacherData = data as CreateTeacherDTO;
                await Teacher.schema(schemaName).create({
                    user_id: user.id,
                    institution_id: institutionId,
                    employee_id: teacherData.employeeId,
                    qualification: teacherData.qualification,
                    designation: teacherData.designation,
                    specialization: teacherData.specialization,
                    experience_years: teacherData.experienceYears,
                    date_of_joining: teacherData.dateOfJoining ? new Date(teacherData.dateOfJoining) : undefined,
                    phone: teacherData.phone || user.phone,
                    email: teacherData.email.toLowerCase(),
                    address: teacherData.address,
                    biography: teacherData.biography,
                    skills: teacherData.skills || [],
                    emergency_contact_name: teacherData.emergencyContactName,
                    emergency_contact_phone: teacherData.emergencyContactPhone,
                    documents: teacherData.documents || {},
                    metadata: teacherData.metadata || {},
                    is_active: true
                }, { transaction });
                logger.info(`[UserManagementService] Teacher profile created for user ${user.id}`);
            } else if (userType === RoleType.STUDENT) {
                const studentData = data as CreateStudentDTO;
                const { Student } = await import('../../../../database/models/school/academics/student/Student.model');
                await Student.schema(schemaName).create({
                    user_id: user.id,
                    institution_id: institutionId,
                    admission_number: studentData.admissionNumber,
                    date_of_birth: studentData.dateOfBirth ? new Date(studentData.dateOfBirth) : undefined,
                    gender: studentData.gender,
                    phone: studentData.phone || user.phone,
                    email: studentData.email.toLowerCase(),
                    is_active: true,
                    metadata: studentData.metadata || {}
                }, { transaction });
                logger.info(`[UserManagementService] Student profile created for user ${user.id}`);
            }

            await transaction.commit();

            const userId = user.id;
            AuditLogService.logUserCreated(
                schemaName,
                adminUserId,
                userId,
                data.email,
                userType
            ).catch(err => logger.error('[UserManagementService] Audit log failed:', err));

            return {
                user: {
                    id: userId,
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

            if (keycloakUserId) {
                try {
                    await KeycloakService.deleteUser(realm, keycloakUserId);
                    logger.info(`[UserManagementService] Rolled back Keycloak user: ${keycloakUserId}`);
                } catch (rollbackError) {
                    logger.error('[UserManagementService] Failed to rollback Keycloak user:', rollbackError);
                }
            }

            throw toError(error);
        }
    }

    /**
     * Assign minimal permissions within Plan scope
     */
    static async assignMinimalPermissions(
        schemaName: string,
        userId: string,
        userType: UserType,
        planId: string,
        grantedBy: string,
        transaction?: Transaction
    ): Promise<void> {
        const planScope = await this.getPlanScope(planId);

        const minimalPerms = MINIMAL_PERMISSIONS[userType];

        const allowedPerms = this.filterByPlanScope(minimalPerms, planScope);

        if (allowedPerms.length === 0) {
            logger.warn(`[UserManagementService] No permissions available for ${userType} in plan scope`);
            return;
        }

        const permissions = await PublicPermission.findAll({
            where: { key: { [Op.in]: allowedPerms } }
        });

        const userPermissions = permissions.map(p => ({
            user_id: userId,
            permission_id: p.id,
            permission_key: p.key,
            granted_by: grantedBy,
        }));

        if (userPermissions.length > 0) {
            await UserPermission.schema(schemaName).bulkCreate(userPermissions, { transaction });
        }
    }

    /**
     * Bulk create users with chunked parallel processing
     */
    static async bulkCreateUsers(
        schemaName: string,
        adminUserId: string,
        data: BulkCreateUsersDTO
    ): Promise<BulkResult> {
        const results: BulkResult = { success: [], failed: [] };
        const CHUNK_SIZE = 10;

        const processUser = async (userData: typeof data.users[number]): Promise<void> => {
            try {
                const userMetadata = (userData as { metadata?: Record<string, unknown> }).metadata || {};
                const mergedData = {
                    ...userData,
                    metadata: { ...data.defaultMetadata, ...userMetadata }
                };

                let result: UserResult;
                switch (data.userType) {
                    case RoleType.TEACHER:
                        result = await this.createTeacher(schemaName, adminUserId, mergedData as CreateTeacherDTO);
                        break;
                    case RoleType.STUDENT:
                        result = await this.createStudent(schemaName, adminUserId, mergedData as CreateStudentDTO);
                        break;
                    case RoleType.STAFF:
                        result = await this.createStaff(schemaName, adminUserId, mergedData as CreateStaffDTO);
                        break;
                    case RoleType.PARENT:
                        result = await this.createParent(schemaName, adminUserId, mergedData as CreateParentDTO);
                        break;
                }
                results.success.push(result!);
            } catch (error) {
                results.failed.push({
                    email: userData.email,
                    error: toError(error).message
                });
            }
        };

        // Process in chunks of 10 - parallel within chunk, sequential between chunks
        for (let i = 0; i < data.users.length; i += CHUNK_SIZE) {
            const chunk = data.users.slice(i, i + CHUNK_SIZE);
            await Promise.all(chunk.map(processUser));
        }

        AuditLogService.logBulkUserCreated(
            schemaName,
            adminUserId,
            data.userType,
            results.success.length,
            results.failed.length
        ).catch(err => logger.error('[UserManagementService] Bulk audit log failed:', err));

        return results;
    }

    /**
     * Deactivate a user (soft delete from both systems)
     */
    static async deactivateUser(schemaName: string, userId: string, adminUserId: string): Promise<void> {
        const user = await User.schema(schemaName).findByPk(userId);
        if (!user) {
            throw new AppError('User not found', 404);
        }

        if (user.keycloak_id) {
            try {
                const { realm } = await this.getInstitutionPlan(schemaName);
                await KeycloakService.disableUser(realm, user.keycloak_id);
            } catch (error) {
                logger.error('[UserManagementService] Failed to disable Keycloak user:', error);
            }
        }

        await User.schema(schemaName).update(
            { is_active: false },
            { where: { id: userId } }
        );

        AuditLogService.logUserDeactivated(
            schemaName,
            adminUserId,
            userId,
            user.email
        ).catch(err => logger.error('[UserManagementService] Deactivate audit log failed:', err));
    }

    /**
     * Update user profile fields
     * Keeps controller thin and prevents returning sensitive fields.
     */
    static async updateUserBasic(
        schemaName: string,
        userId: string,
        payload: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const allowedFields = ['first_name', 'last_name', 'phone', 'email', 'is_active', 'metadata'];
        const updateData: Record<string, unknown> = {};

        for (const field of allowedFields) {
            if (payload[field] !== undefined) {
                updateData[field] = payload[field];
            }
        }

        // Map camelCase inputs used by frontend
        if (payload.firstName !== undefined) updateData.first_name = payload.firstName;
        if (payload.lastName !== undefined) updateData.last_name = payload.lastName;
        if (payload.isActive !== undefined) updateData.is_active = payload.isActive;

        if (Object.keys(updateData).length === 0) {
            throw new AppError('No valid fields provided for update', 400);
        }

        const [updatedCount] = await User.schema(schemaName).update(updateData, {
            where: { id: userId },
        });

        if (updatedCount === 0) {
            throw new AppError('Teacher not found', 404);
        }

        const updatedUser = await User.schema(schemaName).findByPk(userId, {
            attributes: { exclude: ['password_hash'] },
        });

        if (!updatedUser) {
            throw new AppError('Teacher not found', 404);
        }

        return updatedUser.toJSON() as Record<string, unknown>;
    }

    /**
     * List users by type
     */
    static async listUsers(
        schemaName: string,
        options: {
            userType?: UserType;
            role?: string;
            isActive?: boolean;
            search?: string;
            page?: number;
            limit?: number;
        } = {}
    ): Promise<UserListResult> {
        const { userType, role, isActive, search, page = 1, limit = 50 } = options;

        const where: WhereOptions<User> = {};

        if (isActive !== undefined) {
            (where as Record<string, unknown>).is_active = isActive;
        }

        const normalizedRole = role?.trim().toLowerCase();
        const roleToUserTypeMap: Record<string, UserType> = {
            [RoleType.ADMIN]: RoleType.ADMIN,
            [RoleType.TEACHER]: RoleType.TEACHER,
            [RoleType.STUDENT]: RoleType.STUDENT,
            [RoleType.STAFF]: RoleType.STAFF,
            [RoleType.PARENT]: RoleType.PARENT,
            school_admin: RoleType.ADMIN,
        };

        const effectiveUserType = userType
            ?? (normalizedRole ? roleToUserTypeMap[normalizedRole] : undefined);

        if (effectiveUserType) {
            (where as Record<string, unknown>).user_type = effectiveUserType;
        }

        const normalizedSearch = search?.trim();
        if (normalizedSearch) {
            const likePattern = `%${normalizedSearch}%`;
            const searchableWhere = where as WhereOptions<User> & { [Op.or]?: WhereOptions<User>[] };
            searchableWhere[Op.or] = [
                { first_name: { [Op.iLike]: likePattern } },
                { last_name: { [Op.iLike]: likePattern } },
                { email: { [Op.iLike]: likePattern } },
                { phone: { [Op.iLike]: likePattern } },
            ];
        }

        const include: Includeable[] = [];
        if (effectiveUserType === RoleType.TEACHER) {
            include.push({
                model: Teacher.schema(schemaName),
                as: 'teacher',
                required: false
            });
        }

        const { rows, count } = await User.schema(schemaName).findAndCountAll({
            where,
            include,
            limit,
            offset: (page - 1) * limit,
            order: [['created_at', 'DESC']],
            attributes: ['id', 'email', 'first_name', 'last_name', 'phone', 'user_type', 'is_active', 'created_at', 'updated_at'],
        });

        let data: unknown[] = rows;
        if (effectiveUserType === RoleType.TEACHER) {
            data = rows.map(u => {
                const user = u.toJSON() as Record<string, unknown>;
                const teacher = (user.teacher as Record<string, unknown>) || {};
                return {
                    ...teacher,
                    id: teacher.id || user.id,
                    userId: user.id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                    email: user.email,
                    phone: user.phone,
                    user: {
                        first_name: user.first_name,
                        last_name: user.last_name,
                        email: user.email,
                        phone: user.phone
                    },
                    createdAt: user.created_at,
                    updatedAt: user.updated_at
                };
            });
        }

        return {
            users: data,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit),
            }
        };
    }

    /**
     * Get aggregated user stats for dashboard cards/filters
     */
    static async getUserStats(
        schemaName: string,
        options: {
            userType?: UserType;
            role?: string;
            search?: string;
        } = {}
    ): Promise<UserStatsResult> {
        const { userType, role, search } = options;

        const where: WhereOptions<User> = {};
        const normalizedRole = role?.trim().toLowerCase();
        const roleToUserTypeMap: Record<string, UserType> = {
            [RoleType.ADMIN]: RoleType.ADMIN,
            [RoleType.TEACHER]: RoleType.TEACHER,
            [RoleType.STUDENT]: RoleType.STUDENT,
            [RoleType.STAFF]: RoleType.STAFF,
            [RoleType.PARENT]: RoleType.PARENT,
            school_admin: RoleType.ADMIN,
        };

        const effectiveUserType = userType
            ?? (normalizedRole ? roleToUserTypeMap[normalizedRole] : undefined);

        if (effectiveUserType) {
            (where as Record<string, unknown>).user_type = effectiveUserType;
        }

        const normalizedSearch = search?.trim();
        if (normalizedSearch) {
            const likePattern = `%${normalizedSearch}%`;
            const searchableWhere = where as WhereOptions<User> & { [Op.or]?: WhereOptions<User>[] };
            searchableWhere[Op.or] = [
                { first_name: { [Op.iLike]: likePattern } },
                { last_name: { [Op.iLike]: likePattern } },
                { email: { [Op.iLike]: likePattern } },
                { phone: { [Op.iLike]: likePattern } },
            ];
        }

        const activeWhere = { ...where, is_active: true } as WhereOptions<User>;
        const inactiveWhere = { ...where, is_active: false } as WhereOptions<User>;

        const [total, active, inactive, byRoleRows] = await Promise.all([
            User.schema(schemaName).count({ where }),
            User.schema(schemaName).count({ where: activeWhere }),
            User.schema(schemaName).count({ where: inactiveWhere }),
            User.schema(schemaName).findAll({
                attributes: [
                    'user_type',
                    [fn('COUNT', col('id')), 'count'],
                ],
                where,
                group: ['user_type'],
                raw: true,
            }),
        ]);

        const byRole: Record<string, number> = {};
        for (const row of byRoleRows as Array<{ user_type?: string | null; count?: string | number }>) {
            if (!row.user_type) {
                continue;
            }
            byRole[row.user_type.toLowerCase()] = Number(row.count || 0);
        }

        return { total, active, inactive, byRole };
    }

    /**
     * Get user by ID with roles and permissions
     */
    static async getUserById(schemaName: string, userId: string): Promise<Record<string, unknown>> {
        const user = await User.schema(schemaName).findByPk(userId, {
            include: [
                { model: Role, as: 'roles' }
            ],
            attributes: { exclude: ['password_hash'] }
        });

        if (!user) {
            throw new AppError('User not found', 404);
        }

        const permissions = await UserPermission.schema(schemaName).findAll({
            where: { user_id: userId }
        });

        return {
            ...user.toJSON(),
            permissions: permissions.map(p => p.permission_key)
        };
    }
}

export default UserManagementService;
