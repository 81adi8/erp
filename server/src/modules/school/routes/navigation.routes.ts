/**
 * Navigation Routes
 * Provides permissions and navigation data for authenticated tenant users
 * 
 * RBAC: All routes require 'navigation.view' permission
 * (typically granted to all authenticated user types)
 */
import { Router } from 'express';
import { requirePermission } from '../../../core/rbac/rbac.middleware';
import { NavigationController } from '../controllers/navigation.controller';

const router = Router();

/**
 * GET /navigation/permissions
 * Returns all permission keys the authenticated user has access to
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     permissions: string[],   // Array of permission keys
 *     roles: { id, name }[],   // User's roles
 *     isAdmin: boolean         // Whether user has Admin role
 *   }
 * }
 */
router.get('/permissions',
    requirePermission('navigation.view'),
    NavigationController.getUserPermissions);

/**
 * GET /navigation/nav-items
 * Returns navigation structure based on user's permissions
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     navigation: NavItem[]    // Hierarchical navigation structure
 *   }
 * }
 */
router.get('/nav-items',
    requirePermission('navigation.view'),
    NavigationController.getNavItems);

/**
 * GET /navigation
 * Returns both permissions and navigation in a single optimized call
 * Best for initial app load
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     permissions: string[],
 *     navigation: NavItem[],
 *     roles: { id, name }[],
 *     isAdmin: boolean
 *   }
 * }
 */
router.get('/',
    requirePermission('navigation.view'),
    NavigationController.getPermissionsAndNavigation);

export default router;
