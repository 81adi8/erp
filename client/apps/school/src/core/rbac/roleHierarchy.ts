// ============================================================================
// Role Hierarchy System - Scalable Multi-Tenant RBAC
// ============================================================================
// Uses numerical levels instead of hardcoded role names for tenant-agnostic
// access control. Works with school, college, coaching, or any tenant type.

/**
 * Role hierarchy levels (higher = more privileges)
 * These are tenant-agnostic - used for access control regardless of role names
 */
export const ROLE_LEVELS = {
    SUPER_ADMIN: 100,   // System-wide super admin
    ADMIN: 90,          // Tenant administrator
    MANAGER: 80,        // Department heads, principals, deans
    SENIOR_STAFF: 70,   // Senior teachers, senior faculty
    STAFF: 60,          // Teachers, faculty, regular staff
    ASSISTANT: 50,      // Teaching assistants, support staff
    USER: 40,           // Students, parents, registered users
    GUEST: 20,          // Limited access, read-only
    NONE: 0,            // No access
} as const;

export type RoleLevelKey = keyof typeof ROLE_LEVELS;
export type RoleLevelValue = typeof ROLE_LEVELS[RoleLevelKey];

/**
 * Tenant-specific role to level mappings
 * Add new tenant types here without changing any other code
 */
export const TENANT_ROLE_MAPPINGS: Record<string, Record<string, number>> = {
    // School tenant roles
    school: {
        super_admin: ROLE_LEVELS.SUPER_ADMIN,
        admin: ROLE_LEVELS.ADMIN,
        principal: ROLE_LEVELS.MANAGER,
        vice_principal: ROLE_LEVELS.MANAGER,
        head_teacher: ROLE_LEVELS.SENIOR_STAFF,
        teacher: ROLE_LEVELS.STAFF,
        staff: ROLE_LEVELS.STAFF,
        librarian: ROLE_LEVELS.ASSISTANT,
        accountant: ROLE_LEVELS.ASSISTANT,
        student: ROLE_LEVELS.USER,
        parent: ROLE_LEVELS.USER,
        user: ROLE_LEVELS.USER,
        guest: ROLE_LEVELS.GUEST,
    },

    // College/University tenant roles
    college: {
        super_admin: ROLE_LEVELS.SUPER_ADMIN,
        admin: ROLE_LEVELS.ADMIN,
        registrar: ROLE_LEVELS.ADMIN,
        dean: ROLE_LEVELS.MANAGER,
        hod: ROLE_LEVELS.MANAGER,
        professor: ROLE_LEVELS.SENIOR_STAFF,
        associate_professor: ROLE_LEVELS.SENIOR_STAFF,
        assistant_professor: ROLE_LEVELS.STAFF,
        faculty: ROLE_LEVELS.STAFF,
        lecturer: ROLE_LEVELS.STAFF,
        lab_assistant: ROLE_LEVELS.ASSISTANT,
        student: ROLE_LEVELS.USER,
        user: ROLE_LEVELS.USER,
        guest: ROLE_LEVELS.GUEST,
    },

    // Coaching/Institute tenant roles
    coaching: {
        super_admin: ROLE_LEVELS.SUPER_ADMIN,
        admin: ROLE_LEVELS.ADMIN,
        director: ROLE_LEVELS.MANAGER,
        center_head: ROLE_LEVELS.MANAGER,
        senior_faculty: ROLE_LEVELS.SENIOR_STAFF,
        faculty: ROLE_LEVELS.STAFF,
        instructor: ROLE_LEVELS.STAFF,
        coordinator: ROLE_LEVELS.ASSISTANT,
        student: ROLE_LEVELS.USER,
        user: ROLE_LEVELS.USER,
        guest: ROLE_LEVELS.GUEST,
    },

    // Default fallback for unknown tenant types
    default: {
        super_admin: ROLE_LEVELS.SUPER_ADMIN,
        admin: ROLE_LEVELS.ADMIN,
        manager: ROLE_LEVELS.MANAGER,
        staff: ROLE_LEVELS.STAFF,
        user: ROLE_LEVELS.USER,
        guest: ROLE_LEVELS.GUEST,
    },
};

/**
 * Get the role level for a given role name and tenant type
 * Returns NONE (0) if role is not found
 */
export function getRoleLevel(roleName: string, tenantType?: string): number {
    if (!roleName) return ROLE_LEVELS.NONE;

    const normalizedRole = roleName.toLowerCase().trim();

    // Try tenant-specific mapping first
    if (tenantType) {
        const tenantMappings = TENANT_ROLE_MAPPINGS[tenantType.toLowerCase()];
        if (tenantMappings && normalizedRole in tenantMappings) {
            return tenantMappings[normalizedRole];
        }
    }

    // Try default mapping
    const defaultMappings = TENANT_ROLE_MAPPINGS.default;
    if (normalizedRole in defaultMappings) {
        return defaultMappings[normalizedRole];
    }

    // Common role names that might not be in mappings
    if (normalizedRole.includes('admin')) return ROLE_LEVELS.ADMIN;
    if (normalizedRole.includes('manager') || normalizedRole.includes('head')) return ROLE_LEVELS.MANAGER;
    if (normalizedRole.includes('teacher') || normalizedRole.includes('faculty')) return ROLE_LEVELS.STAFF;
    if (normalizedRole.includes('student')) return ROLE_LEVELS.USER;

    // Unknown role - give basic user access
    return ROLE_LEVELS.USER;
}

/**
 * Get the highest role level from an array of roles
 */
export function getHighestRoleLevel(roles: string[], tenantType?: string): number {
    if (!roles || roles.length === 0) return ROLE_LEVELS.NONE;

    return Math.max(...roles.map(role => getRoleLevel(role, tenantType)));
}

/**
 * Check if a user with given roles has at least the minimum required level
 */
export function hasMinimumRoleLevel(
    roles: string[],
    minLevel: number,
    tenantType?: string
): boolean {
    return getHighestRoleLevel(roles, tenantType) >= minLevel;
}

/**
 * Check if a user has admin-level access (ADMIN or above)
 */
export function isAdminRole(roles: string[], tenantType?: string): boolean {
    return hasMinimumRoleLevel(roles, ROLE_LEVELS.ADMIN, tenantType);
}

/**
 * Check if a user has manager-level access (MANAGER or above)
 */
export function isManagerRole(roles: string[], tenantType?: string): boolean {
    return hasMinimumRoleLevel(roles, ROLE_LEVELS.MANAGER, tenantType);
}

/**
 * Check if a user has staff-level access (STAFF or above)
 */
export function isStaffRole(roles: string[], tenantType?: string): boolean {
    return hasMinimumRoleLevel(roles, ROLE_LEVELS.STAFF, tenantType);
}

/**
 * Get role level name for display
 */
export function getRoleLevelName(level: number): string {
    if (level >= ROLE_LEVELS.SUPER_ADMIN) return 'Super Admin';
    if (level >= ROLE_LEVELS.ADMIN) return 'Admin';
    if (level >= ROLE_LEVELS.MANAGER) return 'Manager';
    if (level >= ROLE_LEVELS.SENIOR_STAFF) return 'Senior Staff';
    if (level >= ROLE_LEVELS.STAFF) return 'Staff';
    if (level >= ROLE_LEVELS.ASSISTANT) return 'Assistant';
    if (level >= ROLE_LEVELS.USER) return 'User';
    if (level >= ROLE_LEVELS.GUEST) return 'Guest';
    return 'None';
}
