/**
 * Simplified Permission System for School Module
 * 
 * Flow:
 * 1. Institution created with a Plan
 * 2. Plan defines which modules are enabled
 * 3. Admin gets full access to enabled modules
 * 4. Admin can delegate permissions to teachers, students, staff
 */

// ============================================================================
// Module Definitions (Matches plan modules)
// ============================================================================

export const MODULES = {
    ACADEMICS: 'academics',
    ATTENDANCE: 'attendance',
    TIMETABLE: 'timetable',
    EXAMS: 'exams',
    PARENTS: 'parents',
    COMMUNICATION: 'communication',
    REPORTS: 'reports',
    SETTINGS: 'settings',
} as const;

export type ModuleKey = typeof MODULES[keyof typeof MODULES];

// ============================================================================
// Standard Actions per Module
// ============================================================================

export const ACTIONS = {
    VIEW: 'view',       // Read data
    CREATE: 'create',   // Add new items
    EDIT: 'edit',       // Update existing
    DELETE: 'delete',   // Remove items
    MANAGE: 'manage',   // Full access (includes all above)
} as const;

export type ActionKey = typeof ACTIONS[keyof typeof ACTIONS];

// ============================================================================
// Permission Key Format: module.action
// ============================================================================

export interface Permission {
    key: string;
    module: ModuleKey;
    action: ActionKey;
    description: string;
}

// ============================================================================
// All Available Permissions (By Module)
// ============================================================================

export const PERMISSIONS: Record<ModuleKey, Permission[]> = {
    academics: [
        { key: 'academics.view', module: 'academics', action: 'view', description: 'View classes, sections, subjects, students, teachers' },
        { key: 'academics.create', module: 'academics', action: 'create', description: 'Add students, teachers, classes' },
        { key: 'academics.edit', module: 'academics', action: 'edit', description: 'Edit academic records' },
        { key: 'academics.delete', module: 'academics', action: 'delete', description: 'Delete academic records' },
        { key: 'academics.manage', module: 'academics', action: 'manage', description: 'Full academic management' },
    ],
    attendance: [
        { key: 'attendance.view', module: 'attendance', action: 'view', description: 'View attendance records' },
        { key: 'attendance.create', module: 'attendance', action: 'create', description: 'Mark attendance' },
        { key: 'attendance.edit', module: 'attendance', action: 'edit', description: 'Edit attendance' },
        { key: 'attendance.manage', module: 'attendance', action: 'manage', description: 'Full attendance management' },
    ],
    timetable: [
        { key: 'timetable.view', module: 'timetable', action: 'view', description: 'View timetable' },
        { key: 'timetable.create', module: 'timetable', action: 'create', description: 'Create timetable entries' },
        { key: 'timetable.edit', module: 'timetable', action: 'edit', description: 'Edit timetable' },
        { key: 'timetable.manage', module: 'timetable', action: 'manage', description: 'Full timetable management' },
    ],
    exams: [
        { key: 'exams.view', module: 'exams', action: 'view', description: 'View exams and marks' },
        { key: 'exams.create', module: 'exams', action: 'create', description: 'Create exams, enter marks' },
        { key: 'exams.edit', module: 'exams', action: 'edit', description: 'Edit exams and marks' },
        { key: 'exams.manage', module: 'exams', action: 'manage', description: 'Full exam management' },
    ],
    parents: [
        { key: 'parents.view', module: 'parents', action: 'view', description: 'View parent information' },
        { key: 'parents.create', module: 'parents', action: 'create', description: 'Add parents' },
        { key: 'parents.edit', module: 'parents', action: 'edit', description: 'Edit parent info' },
        { key: 'parents.manage', module: 'parents', action: 'manage', description: 'Full parent management' },
    ],
    communication: [
        { key: 'communication.view', module: 'communication', action: 'view', description: 'View messages, announcements' },
        { key: 'communication.create', module: 'communication', action: 'create', description: 'Send messages, create announcements' },
        { key: 'communication.manage', module: 'communication', action: 'manage', description: 'Full communication access' },
    ],
    reports: [
        { key: 'reports.view', module: 'reports', action: 'view', description: 'View reports' },
        { key: 'reports.create', module: 'reports', action: 'create', description: 'Generate reports' },
        { key: 'reports.manage', module: 'reports', action: 'manage', description: 'Full report access' },
    ],
    settings: [
        { key: 'settings.view', module: 'settings', action: 'view', description: 'View settings' },
        { key: 'settings.edit', module: 'settings', action: 'edit', description: 'Edit settings' },
        { key: 'settings.manage', module: 'settings', action: 'manage', description: 'Full settings access (roles, permissions)' },
    ],
};

// ============================================================================
// Default Role Permissions (Simple)
// ============================================================================

export const ROLE_DEFAULTS: Record<string, { modules: ModuleKey[], actions: ActionKey[] }> = {
    Admin: {
        modules: Object.values(MODULES) as ModuleKey[],
        actions: ['manage'],
    },
    Teacher: {
        modules: ['academics', 'attendance', 'timetable', 'exams', 'communication'],
        actions: ['view', 'create', 'edit'],
    },
    Student: {
        modules: ['academics', 'timetable', 'exams', 'communication'],
        actions: ['view'],
    },
    Parent: {
        modules: ['academics', 'attendance', 'exams', 'communication'],
        actions: ['view'],
    },
    Staff: {
        modules: ['academics', 'attendance', 'communication', 'reports'],
        actions: ['view', 'create'],
    },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all permission keys for given modules
 */
export function getPermissionsForModules(modules: ModuleKey[]): Permission[] {
    const result: Permission[] = [];
    for (const mod of modules) {
        if (PERMISSIONS[mod]) {
            result.push(...PERMISSIONS[mod]);
        }
    }
    return result;
}

/**
 * Get permission keys for a role based on modules and actions
 */
export function getPermissionKeysForRole(
    roleName: string,
    enabledModules: ModuleKey[]
): string[] {
    const roleConfig = ROLE_DEFAULTS[roleName];
    if (!roleConfig) return [];

    const keys: string[] = [];

    // Only include modules that are both in role config AND enabled for institution
    const modules = roleConfig.modules.filter(m => enabledModules.includes(m));

    for (const mod of modules) {
        // If role has 'manage' action, give all permissions for that module
        if (roleConfig.actions.includes('manage')) {
            keys.push(`${mod}.manage`);
        } else {
            // Otherwise give specific actions
            for (const action of roleConfig.actions) {
                keys.push(`${mod}.${action}`);
            }
        }
    }

    return keys;
}

/**
 * Get all available permissions as flat list
 */
export function getAllPermissions(): Permission[] {
    const all: Permission[] = [];
    for (const perms of Object.values(PERMISSIONS)) {
        all.push(...perms);
    }
    return all;
}

/**
 * Check if action is covered by 'manage' permission
 */
export function hasPermission(userPermissions: string[], requiredKey: string): boolean {
    // Direct match
    if (userPermissions.includes(requiredKey)) return true;

    // Check if user has 'manage' for the module
    const [module] = requiredKey.split('.');
    if (userPermissions.includes(`${module}.manage`)) return true;

    // Check wildcard
    if (userPermissions.includes('*')) return true;

    return false;
}
