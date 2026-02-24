import { STORAGE_KEYS } from '../config/constants';
import { CookieConsentManager, type StorageStrategy } from './CookieConsentManager';
import { getCookie } from './cookieUtils';

/**
 * SecureStorage - A secure wrapper around browser storage
 * 
 * Security Features:
 * 1. Tenant-scoped keys to prevent cross-tenant data access
 * 2. Base64 encoding to obfuscate data (not encryption - client-side encryption has limits)
 * 3. Expiry support for sensitive data
 * 4. Tamper detection via checksums
 * 
 * NOTE: For maximum security, auth tokens should be stored in httpOnly cookies
 * set by the server. This storage is for client-side data that must persist.
 * 
 * Security Limitations (inherent to browser storage):
 * - XSS attacks can still access data if script injection occurs
 * - True encryption requires server-managed keys
 */

interface SecureStorageItem<T> {
    data: T;
    checksum: string;
    expiresAt?: number;
    version: number;
}

const STORAGE_VERSION = 1;

/**
 * Generate a simple checksum for tamper detection
 */
function generateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

/**
 * Encode data (obfuscation, not encryption)
 */
function encode(data: string): string {
    try {
        return btoa(encodeURIComponent(data));
    } catch {
        return data;
    }
}

/**
 * Decode data
 */
function decode(data: string): string {
    try {
        return decodeURIComponent(atob(data));
    } catch {
        return data;
    }
}

export class SecureStorage {
    private tenantId: string;
    private storage: Storage;

    constructor(tenantId: string, storageType: 'local' | 'session' = 'local') {
        this.tenantId = tenantId;
        this.storage = storageType === 'local' ? localStorage : sessionStorage;
    }

    /**
     * Generate a tenant-prefixed, encoded key
     */
    private getKey(key: string): string {
        // Encode the key to make it less obvious what's stored
        const rawKey = `${this.tenantId}:${key}`;
        return `_s_${encode(rawKey)}`;
    }

    /**
     * Get an item from storage with security checks
     */
    getItem<T>(key: string): T | null {
        const prefixedKey = this.getKey(key);
        const raw = this.storage.getItem(prefixedKey);

        if (raw === null) {
            return null;
        }

        try {
            const decoded = decode(raw);
            const wrapper: SecureStorageItem<T> = JSON.parse(decoded);

            // Version check
            if (wrapper.version !== STORAGE_VERSION) {
                this.removeItem(key);
                return null;
            }

            // Expiry check
            if (wrapper.expiresAt && Date.now() > wrapper.expiresAt) {
                this.removeItem(key);
                return null;
            }

            // Tamper detection
            const dataString = JSON.stringify(wrapper.data);
            if (generateChecksum(dataString) !== wrapper.checksum) {
                console.warn('Storage tamper detected for key:', key);
                this.removeItem(key);
                return null;
            }

            return wrapper.data;
        } catch {
            // Corrupted data
            this.removeItem(key);
            return null;
        }
    }

    /**
     * Set an item in storage with security wrapper
     * @param expiryMs - Optional expiry time in milliseconds
     */
    setItem<T>(key: string, value: T, expiryMs?: number): void {
        const prefixedKey = this.getKey(key);
        const dataString = JSON.stringify(value);

        const wrapper: SecureStorageItem<T> = {
            data: value,
            checksum: generateChecksum(dataString),
            version: STORAGE_VERSION,
            expiresAt: expiryMs ? Date.now() + expiryMs : undefined,
        };

        const encoded = encode(JSON.stringify(wrapper));
        this.storage.setItem(prefixedKey, encoded);
    }

    /**
     * Remove an item from storage
     */
    removeItem(key: string): void {
        const prefixedKey = this.getKey(key);
        this.storage.removeItem(prefixedKey);
    }

    /**
     * Clear all items for this tenant
     */
    clear(): void {
        const keysToRemove: string[] = [];

        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key?.startsWith('_s_')) {
                // Try to decode and check if it belongs to this tenant
                try {
                    const decoded = decode(key.substring(3));
                    if (decoded.startsWith(`${this.tenantId}:`)) {
                        keysToRemove.push(key);
                    }
                } catch {
                    // Skip invalid keys
                }
            }
        }

        keysToRemove.forEach(key => this.storage.removeItem(key));
    }
}

// Singleton instances
let secureLocalStorage: SecureStorage | null = null;
let secureSessionStorage: SecureStorage | null = null;

const PREAUTH_TENANT_ID = '__preauth__';

/**
 * Try to get stored tenant ID from localStorage directly (bypassing SecureStorage)
 * This allows auto-initialization from previously stored tenant info
 */
function getStoredTenantId(): string | null {
    try {
        // Look for tenant info in localStorage with various encodings
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('_s_')) {
                try {
                    const decoded = decodeURIComponent(atob(key.substring(3)));
                    if (decoded.includes(':tenant_info')) {
                        const tenantId = decoded.split(':')[0];
                        if (tenantId && tenantId !== PREAUTH_TENANT_ID) {
                            return tenantId;
                        }
                    }
                } catch {
                    // Skip invalid keys
                }
            }
        }
    } catch {
        // localStorage not available
    }
    return null;
}

/**
 * Initialize secure storage with tenant ID
 */
export function initializeSecureStorage(tenantId: string): void {
    secureLocalStorage = new SecureStorage(tenantId, 'local');
    secureSessionStorage = new SecureStorage(tenantId, 'session');
}

/**
 * Get secure localStorage instance
 * Auto-initializes from stored tenant info or uses default if not explicitly initialized
 */
export function getSecureLocalStorage(): SecureStorage {
    if (!secureLocalStorage) {
        // Try to auto-initialize from stored tenant info
        const storedTenantId = getStoredTenantId();
        if (storedTenantId) {
            initializeSecureStorage(storedTenantId);
        } else {
            // Strict pre-auth namespace; real tenant namespace is initialized by TenantProvider.
            secureLocalStorage = new SecureStorage(PREAUTH_TENANT_ID, 'local');
            secureSessionStorage = new SecureStorage(PREAUTH_TENANT_ID, 'session');
        }
    }
    return secureLocalStorage!;
}

/**
 * Get secure sessionStorage instance
 */
export function getSecureSessionStorage(): SecureStorage {
    if (!secureSessionStorage) {
        // Ensure local storage is initialized first (which also initializes session)
        getSecureLocalStorage();
    }
    return secureSessionStorage!;
}

// ============================================================================
// Storage Strategy Management
// ============================================================================

// Track current storage strategy (updated on consent change)
let currentStorageStrategy: StorageStrategy = 'secure-local-storage';

// Special marker value for httpOnly cookie mode
const HTTPONLY_MARKER = 'HTTPONLY_COOKIE';

// Access token lives in memory only (never persisted to storage)
let inMemoryAccessToken: string | null = null;
let inMemorySessionValid = false;
let inMemoryUser: unknown = null;
let inMemoryPermissions: string[] = [];
let inMemoryNavigation: unknown[] = [];
let inMemoryUserRoles: unknown[] = [];

/**
 * Update the storage strategy based on current consent state
 * Call this after consent changes
 */
export function updateStorageStrategy(): void {
    currentStorageStrategy = CookieConsentManager.getStorageStrategy();
}

/**
 * Get the current storage strategy
 */
export function getStorageStrategy(): StorageStrategy {
    return currentStorageStrategy;
}

/**
 * Initialize storage strategy on app start
 */
export function initializeStorageStrategy(): void {
    currentStorageStrategy = CookieConsentManager.getStorageStrategy();
}

/**
 * Secure convenience functions for common storage operations
 * 
 * RECOMMENDATION: For production, move auth tokens to httpOnly cookies
 * set by the server. Use this only when cookies are not feasible.
 */
export const secureStorage = {
    // ========================================================================
    // Auth Token Methods (Strategy-aware)
    // ========================================================================

    /**
     * Get auth token
     * - Returns in-memory access token when available
     * - Returns marker value when authenticated via httpOnly cookies
     */
    getAuthToken(): string | null {
        if (inMemoryAccessToken) {
            return inMemoryAccessToken;
        }
        if (inMemorySessionValid || !!getCookie('csrf_token')) {
            return HTTPONLY_MARKER;
        }
        return null;
    },

    /**
     * Set auth token
     * - Stores token in memory only
     * - Marks session as valid for cookie-based refresh flow
     */
    setAuthToken(token: string): void {
        inMemoryAccessToken = token;
        inMemorySessionValid = true;
    },

    /**
     * Remove auth token from storage
     */
    removeAuthToken(): void {
        inMemoryAccessToken = null;
        inMemorySessionValid = false;
        // Cleanup any legacy persisted tokens
        getSecureLocalStorage().removeItem(STORAGE_KEYS.AUTH_TOKEN);
        getSecureLocalStorage().removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    },

    /**
     * Set session validity (for httpOnly cookie mode)
     */
    setSessionValid(valid: boolean): void {
        inMemorySessionValid = valid;
    },

    /**
     * Check if we're using httpOnly cookies for auth
     */
    isUsingHttpOnlyCookies(): boolean {
        return currentStorageStrategy === 'httponly-cookies';
    },

    /**
     * Check if the auth token value indicates httpOnly mode
     */
    isHttpOnlyMarker(token: string | null): boolean {
        return token === HTTPONLY_MARKER;
    },

    /**
     * Check if we have a valid session (for httpOnly cookie mode)
     * Used by PermissionProvider to determine if user is authenticated
     */
    hasValidSession(): boolean {
        return !!inMemoryAccessToken || inMemorySessionValid || !!getCookie('csrf_token');
    },

    // Refresh token is not exposed to JS. Kept as compatibility no-op.
    getRefreshToken(): string | null {
        return null;
    },
    setRefreshToken(_token: string): void {
        // Keep API stable, but never persist refresh tokens in browser storage.
        getSecureLocalStorage().removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    },
    removeRefreshToken(): void {
        getSecureLocalStorage().removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    },

    // User data (no expiry, but secured)
    getUser<T>(): T | null {
        return (inMemoryUser as T | null) ?? null;
    },
    setUser<T>(user: T): void {
        inMemoryUser = user;
        // Cleanup any legacy persisted user payload
        getSecureLocalStorage().removeItem(STORAGE_KEYS.USER);
    },
    removeUser(): void {
        inMemoryUser = null;
        getSecureLocalStorage().removeItem(STORAGE_KEYS.USER);
    },

    // Tenant info
    getTenant<T extends { id: string; subdomain?: string }>(): T | null {
        return getSecureLocalStorage().getItem<T>(STORAGE_KEYS.TENANT_INFO);
    },
    setTenant<T>(tenant: T): void {
        getSecureLocalStorage().setItem(STORAGE_KEYS.TENANT_INFO, tenant);
    },
    removeTenant(): void {
        getSecureLocalStorage().removeItem(STORAGE_KEYS.TENANT_INFO);
    },

    // Theme (non-sensitive, no expiry)
    getTheme(): string | null {
        return getSecureLocalStorage().getItem<string>(STORAGE_KEYS.THEME);
    },
    setTheme(theme: string): void {
        getSecureLocalStorage().setItem(STORAGE_KEYS.THEME, theme);
    },

    // Permissions (stored after login)
    getPermissions(): string[] {
        return inMemoryPermissions;
    },
    setPermissions(permissions: string[]): void {
        inMemoryPermissions = permissions;
        getSecureLocalStorage().removeItem(STORAGE_KEYS.PERMISSIONS);
    },
    removePermissions(): void {
        inMemoryPermissions = [];
        getSecureLocalStorage().removeItem(STORAGE_KEYS.PERMISSIONS);
    },

    // Navigation items (stored after login)
    getNavigation<T>(): T[] {
        return inMemoryNavigation as T[];
    },
    setNavigation<T>(navigation: T[]): void {
        inMemoryNavigation = navigation as unknown[];
        getSecureLocalStorage().removeItem(STORAGE_KEYS.NAVIGATION);
    },
    removeNavigation(): void {
        inMemoryNavigation = [];
        getSecureLocalStorage().removeItem(STORAGE_KEYS.NAVIGATION);
    },

    // User roles (stored after login)
    getUserRoles<T>(): T[] {
        return inMemoryUserRoles as T[];
    },
    setUserRoles<T>(roles: T[]): void {
        inMemoryUserRoles = roles as unknown[];
        getSecureLocalStorage().removeItem(STORAGE_KEYS.USER_ROLES);
    },
    removeUserRoles(): void {
        inMemoryUserRoles = [];
        getSecureLocalStorage().removeItem(STORAGE_KEYS.USER_ROLES);
    },

    /**
     * Check if user has a specific permission
     */
    hasPermission(permissionKey: string): boolean {
        const permissions = this.getPermissions();
        return permissions.includes(permissionKey) || permissions.includes('*');
    },

    /**
     * Check if user has at least one of the specified permissions
     */
    hasAnyPermission(permissionKeys: string[]): boolean {
        const permissions = this.getPermissions();
        return permissionKeys.some(key => permissions.includes(key) || permissions.includes('*'));
    },

    /**
     * Check if user has all of the specified permissions
     */
    hasAllPermissions(permissionKeys: string[]): boolean {
        const permissions = this.getPermissions();
        if (permissions.includes('*')) return true;
        return permissionKeys.every(key => permissions.includes(key));
    },

    /**
     * Clear all auth-related data (for logout or 401 handling)
     * This removes tokens, user data, permissions, and navigation
     */
    clearAuthData(): void {
        inMemoryAccessToken = null;
        inMemorySessionValid = false;
        inMemoryUser = null;
        inMemoryPermissions = [];
        inMemoryNavigation = [];
        inMemoryUserRoles = [];
        // Clear auth tokens
        getSecureLocalStorage().removeItem(STORAGE_KEYS.AUTH_TOKEN);
        getSecureLocalStorage().removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        // Clear user data
        getSecureLocalStorage().removeItem(STORAGE_KEYS.USER);
        // Clear permissions and navigation
        getSecureLocalStorage().removeItem(STORAGE_KEYS.PERMISSIONS);
        getSecureLocalStorage().removeItem(STORAGE_KEYS.NAVIGATION);
        getSecureLocalStorage().removeItem(STORAGE_KEYS.USER_ROLES);
    },

    // Clear all secure storage for logout
    clearAll(): void {
        inMemoryAccessToken = null;
        inMemorySessionValid = false;
        inMemoryUser = null;
        inMemoryPermissions = [];
        inMemoryNavigation = [];
        inMemoryUserRoles = [];
        // Clear local and session storage
        secureLocalStorage?.clear();
        secureSessionStorage?.clear();
    },

    /**
     * Get current storage strategy
     */
    getStorageStrategy(): StorageStrategy {
        return currentStorageStrategy;
    },
};
