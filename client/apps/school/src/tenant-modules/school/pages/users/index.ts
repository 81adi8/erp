/**
 * Shared User Management Components
 * These components are reusable across different portals (admin, teacher, sub-admin)
 * Access pattern: /{rolePrefix}/users/{userType}
 */

// Main centralized component
export { UserManagementPage } from './UserManagementPage';

// User type pages - can be imported and used in any portal
export { TeachersPage } from './TeachersPage';
export { StudentsPage } from './StudentsPage';
export { StaffPage } from './StaffPage';
export { ParentsPage } from './ParentsPage';
