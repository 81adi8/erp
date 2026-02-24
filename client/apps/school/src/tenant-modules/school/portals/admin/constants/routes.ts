/**
 * Admin Portal Routes Constants
 * Re-exports from centralized routes file.
 */

export {
    ADMIN_ROUTES,
    ROUTES,
    COMMON_ROUTES,
    PERMISSION_ROUTE_MAP,
    getDefaultRoute,
    isPortalRoute,
    getPortalFromRoute,
} from '../../../constants/routes';

// Backward compatibility - ACADEMIC_ROUTES is now part of ADMIN_ROUTES
import { ADMIN_ROUTES } from '../../../constants/routes';
export const ACADEMIC_ROUTES = ADMIN_ROUTES.ACADEMICS;
export const ATTENDANCE_ROUTES = ADMIN_ROUTES.ATTENDANCE;
