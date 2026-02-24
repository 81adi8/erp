// ============================================================================
// Portal Configuration - Role-Based Sub-Tenant Portals
// ============================================================================

import { ROLE_LEVELS } from '../../../core/rbac/roleHierarchy';

// ============================================================================
// Types
// ============================================================================

export interface PortalConfig {
    id: string;
    name: string;
    description: string;
    basePath: string;
    minRoleLevel: number;
    allowedRoles?: string[];
    defaultRoute: string;
    icon: string;
    color: string;
}

// ============================================================================
// Portal Definitions
// ============================================================================

export const PORTAL_CONFIG: Record<string, PortalConfig> = {
    admin: {
        id: 'admin',
        name: 'Admin Portal',
        description: 'School administration and management',
        basePath: '/admin',
        minRoleLevel: ROLE_LEVELS.ADMIN,
        defaultRoute: '/admin/dashboard',
        icon: 'Shield',
        color: 'purple',
    },
    teacher: {
        id: 'teacher',
        name: 'Teacher Portal',
        description: 'Class management and student assessment',
        basePath: '/teacher',
        minRoleLevel: ROLE_LEVELS.STAFF,
        allowedRoles: ['teacher', 'head_teacher', 'senior_teacher', 'faculty', 'professor'],
        defaultRoute: '/teacher/dashboard',
        icon: 'GraduationCap',
        color: 'blue',
    },
    student: {
        id: 'student',
        name: 'Student Portal',
        description: 'Courses, assignments, and grades',
        basePath: '/student',
        minRoleLevel: ROLE_LEVELS.USER,
        allowedRoles: ['student'],
        defaultRoute: '/student/dashboard',
        icon: 'BookOpen',
        color: 'green',
    },
    staff: {
        id: 'staff',
        name: 'Staff Portal',
        description: 'Tasks and administrative duties',
        basePath: '/staff',
        minRoleLevel: ROLE_LEVELS.ASSISTANT,
        allowedRoles: ['librarian', 'accountant', 'staff', 'lab_assistant', 'coordinator'],
        defaultRoute: '/staff/dashboard',
        icon: 'Briefcase',
        color: 'orange',
    },
    parent: {
        id: 'parent',
        name: 'Parent Portal',
        description: 'View child attendance, marks, and fees',
        basePath: '/parent',
        minRoleLevel: ROLE_LEVELS.USER,
        allowedRoles: ['parent', 'guardian'],
        defaultRoute: '/parent/dashboard',
        icon: 'Users',
        color: 'teal',
    },
};

// ============================================================================
// Portal Access Utilities
// ============================================================================

/**
 * Get the default portal for a user based on their role level and roles
 */
export function getDefaultPortal(roleLevel: number, roles: string[]): string {
    const normalizedRoles = roles.map(r => r.toLowerCase());

    // Super admin / Admin → Admin portal
    if (roleLevel >= ROLE_LEVELS.ADMIN) {
        return PORTAL_CONFIG.admin.defaultRoute;
    }

    // Check specific roles for teacher portal
    const teacherRoles = PORTAL_CONFIG.teacher.allowedRoles || [];
    if (normalizedRoles.some(r => teacherRoles.includes(r))) {
        return PORTAL_CONFIG.teacher.defaultRoute;
    }

    // Check specific roles for staff portal
    const staffRoles = PORTAL_CONFIG.staff.allowedRoles || [];
    if (normalizedRoles.some(r => staffRoles.includes(r))) {
        return PORTAL_CONFIG.staff.defaultRoute;
    }

    // Check specific roles for student portal
    const studentRoles = PORTAL_CONFIG.student.allowedRoles || [];
    if (normalizedRoles.some(r => studentRoles.includes(r))) {
        return PORTAL_CONFIG.student.defaultRoute;
    }

    // Check specific roles for parent portal
    const parentRoles = PORTAL_CONFIG.parent.allowedRoles || [];
    if (normalizedRoles.some(r => parentRoles.includes(r))) {
        return PORTAL_CONFIG.parent.defaultRoute;
    }

    // Fallback based on role level
    if (roleLevel >= ROLE_LEVELS.STAFF) {
        return PORTAL_CONFIG.teacher.defaultRoute;
    }
    if (roleLevel >= ROLE_LEVELS.ASSISTANT) {
        return PORTAL_CONFIG.staff.defaultRoute;
    }

    // Default to student portal for regular users
    return PORTAL_CONFIG.student.defaultRoute;
}

/**
 * Check if a user can access a specific portal
 */
export function canAccessPortal(
    portalId: string,
    roleLevel: number,
    roles: string[]
): boolean {
    const portal = PORTAL_CONFIG[portalId];
    if (!portal) {
        console.log('[canAccessPortal] Portal not found:', portalId);
        return false;
    }

    console.log('[canAccessPortal] Checking:', {
        portalId,
        roleLevel,
        roles,
        minRoleLevel: portal.minRoleLevel,
        allowedRoles: portal.allowedRoles
    });

    // Check minimum role level
    if (roleLevel < portal.minRoleLevel) {
        console.log('[canAccessPortal] Role level too low:', roleLevel, '<', portal.minRoleLevel);
        return false;
    }

    // If specific roles are defined, check them
    if (portal.allowedRoles && portal.allowedRoles.length > 0) {
        const normalizedRoles = roles.map(r => r.toLowerCase());
        const hasRole = normalizedRoles.some(r => portal.allowedRoles!.includes(r));
        console.log('[canAccessPortal] Role check:', { normalizedRoles, allowedRoles: portal.allowedRoles, hasRole });
        return hasRole;
    }

    // Role level check passed and no specific roles required
    console.log('[canAccessPortal] Access granted (no specific roles required)');
    return true;
}

/**
 * Get all portals a user can access
 */
export function getAccessiblePortals(roleLevel: number, roles: string[]): PortalConfig[] {
    return Object.values(PORTAL_CONFIG).filter(portal =>
        canAccessPortal(portal.id, roleLevel, roles)
    );
}

/**
 * Get portal by path
 */
export function getPortalByPath(path: string): PortalConfig | undefined {
    return Object.values(PORTAL_CONFIG).find(portal =>
        path.startsWith(portal.basePath)
    );
}
