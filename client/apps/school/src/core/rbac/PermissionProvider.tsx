// ============================================================================
// RBAC Permission Context and Provider - Scalable Multi-Tenant
// ============================================================================
import { createContext, useContext, useMemo, useCallback, useState, useEffect, type ReactNode } from 'react';
import { useGetCurrentUserQuery } from '../api/endpoints/authApi';
import { secureStorage } from '../storage/SecureStorage';
import { CookieConsentManager } from '../storage/CookieConsentManager';
import { getCookie } from '../storage/cookieUtils';
import {
    ROLE_LEVELS,
    getHighestRoleLevel,
    hasMinimumRoleLevel,
    type RoleLevelValue,
} from './roleHierarchy';

// Permission context type
interface PermissionContextType {
    permissions: string[];
    roles: string[];
    roleLevel: number;
    tenantType: string | undefined;
    isLoading: boolean;
    hasPermission: (permission: string) => boolean;
    hasAnyPermission: (permissions: string[]) => boolean;
    hasAllPermissions: (permissions: string[]) => boolean;
    hasRole: (role: string) => boolean;
    hasAnyRole: (roles: string[]) => boolean;
    hasMinRoleLevel: (minLevel: RoleLevelValue) => boolean;
    isAdmin: boolean;
    isManager: boolean;
    isStaff: boolean;
}

const PermissionContext = createContext<PermissionContextType>({
    permissions: [],
    roles: [],
    roleLevel: ROLE_LEVELS.NONE,
    tenantType: undefined,
    isLoading: true,
    hasPermission: () => false,
    hasAnyPermission: () => false,
    hasAllPermissions: () => false,
    hasRole: () => false,
    hasAnyRole: () => false,
    hasMinRoleLevel: () => false,
    isAdmin: false,
    isManager: false,
    isStaff: false,
});

interface PermissionProviderProps {
    children: ReactNode;
    // Optional: tenant type passed from parent to avoid hook-in-try/catch
    tenantType?: string;
}

/**
 * Check if user has an authenticated session.
 * Supports both httpOnly cookies and localStorage modes.
 */
function checkHasAuth(): boolean {
    try {
        const storageStrategy = CookieConsentManager.getStorageStrategy();
        const hasSession = secureStorage.hasValidSession?.() ?? false;
        if (hasSession) return true;

        if (storageStrategy === 'httponly-cookies') {
            return !!getCookie('csrf_token');
        }

        const token = secureStorage.getAuthToken();
        return !!token && !secureStorage.isHttpOnlyMarker(token);
    } catch {
        return false;
    }
}

export function PermissionProvider({ children, tenantType }: PermissionProviderProps) {
    const [isTokenChecked, setIsTokenChecked] = useState(false);
    const [hasAuth, setHasAuth] = useState(checkHasAuth);

    // FIX: Replace 500ms polling with storage event listener only.
    // Initial check + cross-tab sync via storage events — no interval needed.
    useEffect(() => {
        const checkAuth = () => {
            setHasAuth(checkHasAuth());
            setIsTokenChecked(true);
        };

        // Check immediately on mount
        checkAuth();

        // Cross-tab sync: listen for storage changes (login/logout in other tabs)
        const handleStorage = () => checkAuth();
        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    const { data: userData, isLoading: isQueryLoading, isFetching, refetch } = useGetCurrentUserQuery(undefined, {
        skip: !hasAuth,
        pollingInterval: hasAuth ? 5 * 60 * 1000 : 0, // Poll every 5 minutes if authenticated
    });

    useEffect(() => {
        if (hasAuth && isTokenChecked) {
            refetch();
        }
    }, [hasAuth, isTokenChecked, refetch]);

    const isLoading = !isTokenChecked || (hasAuth && (isQueryLoading || isFetching));

    const user = userData?.data?.user;
    const permissions = useMemo(() => user?.permissions || [], [user?.permissions]);
    const roles = useMemo(() => user?.roles || [], [user?.roles]);

    // FIX: tenantType now comes from props (passed by parent) instead of
    // calling useTenant() inside try/catch which violates Rules of Hooks.
    const roleLevel = useMemo(() => {
        return getHighestRoleLevel(roles, tenantType);
    }, [roles, tenantType]);

    const isAdminLevel = roleLevel >= ROLE_LEVELS.ADMIN;

    const hasPermission = useCallback((permission: string): boolean => {
        if (isAdminLevel) return true;
        return permissions.includes(permission);
    }, [permissions, isAdminLevel]);

    const hasAnyPermission = useCallback((perms: string[]): boolean => {
        if (isAdminLevel) return true;
        return perms.some(perm => permissions.includes(perm));
    }, [permissions, isAdminLevel]);

    const hasAllPermissions = useCallback((perms: string[]): boolean => {
        if (isAdminLevel) return true;
        return perms.every(perm => permissions.includes(perm));
    }, [permissions, isAdminLevel]);

    const hasRole = useCallback((role: string): boolean => {
        return roles.some(r => r.toLowerCase() === role.toLowerCase());
    }, [roles]);

    const hasAnyRole = useCallback((roleList: string[]): boolean => {
        return roleList.some(role =>
            roles.some(r => r.toLowerCase() === role.toLowerCase())
        );
    }, [roles]);

    const hasMinRoleLevel = useCallback((minLevel: RoleLevelValue): boolean => {
        return hasMinimumRoleLevel(roles, minLevel, tenantType);
    }, [roles, tenantType]);

    const isAdmin = roleLevel >= ROLE_LEVELS.ADMIN;
    const isManager = roleLevel >= ROLE_LEVELS.MANAGER;
    const isStaff = roleLevel >= ROLE_LEVELS.STAFF;

    const value = useMemo(() => ({
        permissions,
        roles,
        roleLevel,
        tenantType,
        isLoading,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
        hasAnyRole,
        hasMinRoleLevel,
        isAdmin,
        isManager,
        isStaff,
    }), [
        permissions, roles, roleLevel, tenantType, isLoading,
        hasPermission, hasAnyPermission, hasAllPermissions,
        hasRole, hasAnyRole, hasMinRoleLevel,
        isAdmin, isManager, isStaff,
    ]);

    return (
        <PermissionContext.Provider value={value}>
            {children}
        </PermissionContext.Provider>
    );
}

export function usePermission(): PermissionContextType {
    return useContext(PermissionContext);
}

export function useRoleLevel(): number {
    const { roleLevel } = usePermission();
    return roleLevel;
}

export function useIsAdmin(): boolean {
    const { isAdmin } = usePermission();
    return isAdmin;
}

export function useIsManager(): boolean {
    const { isManager } = usePermission();
    return isManager;
}

export function useIsStaff(): boolean {
    const { isStaff } = usePermission();
    return isStaff;
}

export { PermissionContext };
