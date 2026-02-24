/**
 * School Module Repositories
 * 
 * Barrel export for all school module repositories.
 * Follows repository pattern for data access abstraction.
 */

// User Management Repositories (Tenant Schema)
export { UserRepository } from '../user-management/repositories/user.repository';
export { RoleRepository } from './role.repository';
export { UserRoleRepository } from '../user-management/repositories/user-role.repository';
export { UserPermissionRepository } from '../user-management/repositories/user-permission.repository';
export { TenantRoleConfigRepository } from './tenant-role-config.repository';

// Profile Repositories (Tenant Schema)
export { TeacherRepository } from './teacher.repository';
export { StudentRepository } from '../student/repositories/student.repository';

// Enrollment Repository (Tenant Schema)
export { EnrollmentRepository } from '../student/repositories/enrollment.repository';

// Public Schema Repositories
export { InstitutionRepository } from './institution.repository';
export { PlanRepository } from './plan.repository';
export { PermissionRepository } from './permission.repository';
