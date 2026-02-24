import { useMemo, useCallback } from 'react';
import { secureStorage } from '../storage/SecureStorage';
import { useGetNavigationQuery, type NavItem, type UserRole } from '../api/endpoints/navigationApi';

// ============================================================================
// Permission Hook Types
// ============================================================================

interface PermissionState {
    permissions: string[];
    navigation: NavItem[];
    roles: UserRole[];
    isAdmin: boolean;
    isLoading: boolean;
}

interface PermissionActions {
    hasPermission: (permissionKey: string) => boolean;
    hasAnyPermission: (permissionKeys: string[]) => boolean;
    hasAllPermissions: (permissionKeys: string[]) => boolean;
    hasRole: (roleName: string) => boolean;
    hasAnyRole: (roleNames: string[]) => boolean;
    refetchNavigation: () => void;
}

// ============================================================================
// usePermissions Hook
// ============================================================================

/**
 * usePermissions - Hook for checking user permissions and accessing navigation
 * 
 * @example
 * ```tsx
 * const { hasPermission, navigation, isAdmin } = usePermissions();
 * 
 * if (hasPermission('academics.students.view')) {
 *   // Show students section
 * }
 * 
 * if (isAdmin) {
 *   // Show admin controls
 * }
 * ```
 */
export function usePermissions(): PermissionState & PermissionActions {
    // Fetch navigation data (will use cached data if available)
    const { data, isLoading, refetch } = useGetNavigationQuery(undefined, {
        // Only refetch if cache is stale (5 minutes)
        refetchOnMountOrArgChange: 300,
    });

    // Get data from API response or fallback to secure storage
    const permissions = useMemo(() => {
        if (data?.success && data.data?.permissions) {
            return data.data.permissions;
        }
        return secureStorage.getPermissions();
    }, [data]);

    const navigation = useMemo(() => {
        if (data?.success && data.data?.navigation) {
            return data.data.navigation;
        }
        return secureStorage.getNavigation<NavItem>();
    }, [data]);

    const roles = useMemo(() => {
        if (data?.success && data.data?.roles) {
            return data.data.roles;
        }
        return secureStorage.getUserRoles<UserRole>();
    }, [data]);

    const isAdmin = useMemo(() => {
        if (data?.success && data.data) {
            return data.data.isAdmin;
        }
        // Check from roles if API data not available
        return roles.some(r => r.name.toLowerCase() === 'admin');
    }, [data, roles]);

    // Permission check functions
    const hasPermission = useCallback((permissionKey: string): boolean => {
        return permissions.includes(permissionKey) || permissions.includes('*');
    }, [permissions]);

    const hasAnyPermission = useCallback((permissionKeys: string[]): boolean => {
        if (permissions.includes('*')) return true;
        return permissionKeys.some(key => permissions.includes(key));
    }, [permissions]);

    const hasAllPermissions = useCallback((permissionKeys: string[]): boolean => {
        if (permissions.includes('*')) return true;
        return permissionKeys.every(key => permissions.includes(key));
    }, [permissions]);

    const hasRole = useCallback((roleName: string): boolean => {
        return roles.some(r => r.name.toLowerCase() === roleName.toLowerCase());
    }, [roles]);

    const hasAnyRole = useCallback((roleNames: string[]): boolean => {
        return roleNames.some(name =>
            roles.some(r => r.name.toLowerCase() === name.toLowerCase())
        );
    }, [roles]);

    const refetchNavigation = useCallback(() => {
        refetch();
    }, [refetch]);

    return {
        permissions,
        navigation,
        roles,
        isAdmin,
        isLoading,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
        hasAnyRole,
        refetchNavigation,
    };
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * useNavigation - Returns only navigation items
 */
export function useNavigation(): NavItem[] {
    const { navigation } = usePermissions();
    return navigation;
}

/**
 * useUserRoles - Returns only user roles
 */
export function useUserRoles(): UserRole[] {
    const { roles } = usePermissions();
    return roles;
}

/**
 * useIsAdmin - Returns whether user is an admin
 */
export function useIsAdmin(): boolean {
    const { isAdmin } = usePermissions();
    return isAdmin;
}

/**
 * useHasPermission - Check a single permission
 */
export function useHasPermission(permissionKey: string): boolean {
    const { hasPermission } = usePermissions();
    return hasPermission(permissionKey);
}

/**
 * useHasRole - Check a single role
 */
export function useHasRole(roleName: string): boolean {
    const { hasRole } = usePermissions();
    return hasRole(roleName);
}

export default usePermissions;
