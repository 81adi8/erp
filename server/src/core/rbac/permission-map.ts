import { logger } from '../utils/logger';
/**
 * Permission Mapping Layer
 * 
 * Bridges legacy permission keys to RBAC permission keys.
 * This allows gradual migration from legacy permission system to RBAC
 * without breaking existing routes.
 * 
 * Usage:
 * ```typescript
 * // In RBAC middleware, before checking permissions:
 * const rbacPermission = resolvePermission(legacyPermission);
 * const hasAccess = engine.hasPermission(context, rbacPermission);
 * ```
 * 
 * Migration Strategy:
 * 1. Legacy routes use old permission keys (e.g., 'students.view')
 * 2. This layer maps to RBAC keys (e.g., 'users.students.view')
 * 3. RBAC engine checks using mapped key
 * 4. Gradually update routes to use RBAC keys directly
 * 5. Eventually remove this mapping layer
 * 
 * @phase Migration Infrastructure
 * @status Active - Required for RBAC cutover
 */

/**
 * Legacy to RBAC permission mapping
 * 
 * Keys: Legacy permission strings used in routes
 * Values: RBAC permission strings from permission catalog
 * 
 * Coverage: Based on audit of 47 legacy permissions
 * - 18 permissions need mapping (38%)
 * - 29 permissions are 1:1 or already RBAC format
 */
export const PermissionMap: Record<string, string> = {
  // ============================================================================
  // STUDENT MODULE (Legacy → RBAC)
  // ============================================================================
  
  /** 
   * Legacy student permissions → RBAC users.students.* 
   * Reason: RBAC uses granular user-type based permissions
   */
  'students.view': 'users.students.view',
  'students.create': 'users.students.create',
  'students.manage': 'users.students.manage',
  
  // ============================================================================
  // EXAMINATION MODULE (Legacy → RBAC)
  // ============================================================================
  
  /**
   * Legacy exam permissions → RBAC exams.management.*
   * Reason: RBAC uses module-based granular permissions
   */
  'exams.view': 'exams.management.view',
  'exams.manage': 'exams.management.manage',
  
  /**
   * Legacy exam marks permission → RBAC composite
   * Note: Legacy used single permission, RBAC splits into enter + edit
   * Mapping to 'exams.marks.enter' as primary action
   */
  'exams.marks.manage': 'exams.marks.enter',
  
  // ============================================================================
  // USER MANAGEMENT MODULE (Legacy → RBAC)
  // ============================================================================
  
  /**
   * Legacy generic user permission → RBAC management view
   * Note: RBAC uses granular per-user-type permissions instead
   */
  'users.view': 'users.management.view',
  'users.manage': 'users.management.manage',
  
  // ============================================================================
  // ATTENDANCE MODULE (Legacy → RBAC)
  // ============================================================================
  
  /**
   * Legacy attendance.student_attendance.* → RBAC attendance.student.*
   * Reason: Naming convention change in RBAC catalog
   */
  'attendance.student_attendance.view': 'attendance.student.view',
  'attendance.student_attendance.mark': 'attendance.student.mark',
  'attendance.student_attendance.edit': 'attendance.student.edit',
  'attendance.student_attendance.delete': 'attendance.history.delete',
  
  // ============================================================================
  // SETTINGS/RBAC MODULE (Legacy → RBAC)
  // ============================================================================
  
  /**
   * Legacy settings.rbac.* → RBAC settings.permissions.*
   * Reason: RBAC uses 'permissions' instead of 'rbac' terminology
   */
  'settings.rbac.view': 'settings.permissions.view',
  'settings.rbac.manage': 'settings.permissions.manage',
  'settings.rbac.assign': 'settings.permissions.assign',
  
  /**
   * Legacy generic settings permissions → RBAC granular
   * Note: These map to dashboard/overview permissions as fallback
   */
  'settings.view': 'settings.general.view',
  'settings.manage': 'settings.general.edit',
};

/**
 * Missing in RBAC Catalog (Need to be added)
 * These legacy permissions have no RBAC equivalent yet:
 * 
 * - system.queues.manage
 * 
 * TODO: Add these to RBAC permission catalog before full migration
 */
export const MissingPermissions: string[] = [
  'system.queues.manage',
];

/**
 * Already RBAC-compatible (No mapping needed)
 * These permissions use same key in both systems:
 * 
 * - users.teachers.manage → users.teachers.manage
 * - users.students.manage → users.students.manage
 * - users.staff.manage → users.staff.manage
 * - users.parents.manage → users.parents.manage
 * - users.teachers.view → users.teachers.view
 * - users.students.view → users.students.view
 * - users.staff.view → users.staff.view
 * - users.parents.view → users.parents.view
 * - settings.roles.view → settings.roles.view
 * - settings.roles.manage → settings.roles.manage
 * - academics.sessions.view → academics.sessions.view
 * - academics.sessions.manage → academics.sessions.manage
 * - academics.classes.view → academics.classes.view
 * - academics.classes.manage → academics.classes.manage
 * - academics.subjects.view → academics.subjects.view
 * - academics.subjects.manage → academics.subjects.manage
 * - academics.curriculum.view → academics.curriculum.view
 * - academics.curriculum.manage → academics.curriculum.manage
 * - academics.lessonPlans.view → academics.lessonPlans.view
 * - academics.lessonPlans.manage → academics.lessonPlans.manage
 * - academics.timetable.view → academics.timetable.view
 * - academics.timetable.manage → academics.timetable.manage
 * - attendance.leaves.view → attendance.leaves.view
 * - attendance.leaves.apply → attendance.leaves.apply
 * - attendance.leaves.approve → attendance.leaves.approve
 * - attendance.leaves.reject → attendance.leaves.reject
 * - attendance.settings.view → attendance.settings.view
 * - attendance.settings.manage → attendance.settings.manage
 * - exams.marks.view → exams.marks.view
 * - system.queues.manage → system.queues.manage
 * 
 * NEW PERMISSIONS ADDED (RBAC Pilot):
 * - dashboard.view
 * - navigation.view
 * - parent.portal.view
 * - notices.view
 * - notices.manage
 * - reports.view
 * - reports.create
 * - root.access.manage
 * - root.admins.manage
 * - root.holidays.manage
 * - root.plans.manage
 * - root.roles.manage
 * - root.config.view
 * - root.auth.sessions.manage
 */

/**
 * Resolve legacy permission key to RBAC permission key
 * 
 * @param legacyKey - Permission key from legacy route middleware
 * @returns RBAC permission key (or original if no mapping exists)
 * 
 * @example
 * ```typescript
 * const rbacKey = resolvePermission('students.view');
 * // Returns: 'users.students.view'
 * 
 * const rbacKey = resolvePermission('users.teachers.manage');
 * // Returns: 'users.teachers.manage' (already RBAC format)
 * ```
 */
export function resolvePermission(legacyKey: string): string {
  // Check if key is in mapping table
  if (PermissionMap[legacyKey]) {
    return PermissionMap[legacyKey];
  }
  
  // Check if it's a missing permission (should warn)
  if (MissingPermissions.includes(legacyKey)) {
    logger.warn(`[PermissionMap] Missing RBAC equivalent for: ${legacyKey}`);
    // Return original - will fail RBAC check but preserves behavior
    return legacyKey;
  }
  
  // Assume already RBAC-compatible
  return legacyKey;
}

/**
 * Check if a permission needs mapping
 * 
 * @param key - Permission key to check
 * @returns true if mapping exists
 */
export function hasMapping(key: string): boolean {
  return key in PermissionMap;
}

/**
 * Get mapping statistics
 * Useful for migration tracking
 */
export function getMappingStats(): {
  totalMappings: number;
  missingPermissions: number;
  alreadyCompatible: number;
} {
  return {
    totalMappings: Object.keys(PermissionMap).length,
    missingPermissions: MissingPermissions.length,
    alreadyCompatible: 29, // From audit - permissions that don't need mapping
  };
}

/**
 * Migration helper: List all legacy permissions that need updating
 * 
 * @returns Array of legacy permission keys that should be updated in routes
 */
export function getLegacyPermissionsToUpdate(): string[] {
  return Object.keys(PermissionMap);
}

/**
 * Migration helper: Generate route update suggestions
 * 
 * @returns Map of old permission → new permission for documentation
 */
export function generateMigrationGuide(): Record<string, string> {
  return { ...PermissionMap };
}

// Default export for convenience
export default {
  PermissionMap,
  MissingPermissions,
  resolvePermission,
  hasMapping,
  getMappingStats,
  getLegacyPermissionsToUpdate,
  generateMigrationGuide,
};
