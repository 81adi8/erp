import { STORAGE_KEYS } from '../config/constants';

/**
 * TenantStorage - A wrapper around localStorage and sessionStorage
 * that prefixes all keys with the tenant identifier for data isolation.
 */
export class TenantStorage {
    private tenantId: string;
    private storage: Storage;

    constructor(tenantId: string, storageType: 'local' | 'session' = 'local') {
        this.tenantId = tenantId;
        this.storage = storageType === 'local' ? localStorage : sessionStorage;
    }

    /**
     * Generate a tenant-prefixed key
     */
    private getKey(key: string): string {
        return `${this.tenantId}:${key}`;
    }

    /**
     * Get an item from storage
     */
    getItem<T = string>(key: string): T | null {
        const prefixedKey = this.getKey(key);
        const value = this.storage.getItem(prefixedKey);

        if (value === null) {
            return null;
        }

        try {
            return JSON.parse(value) as T;
        } catch {
            return value as unknown as T;
        }
    }

    /**
     * Set an item in storage
     */
    setItem<T>(key: string, value: T): void {
        const prefixedKey = this.getKey(key);
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        this.storage.setItem(prefixedKey, stringValue);
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
        const prefix = `${this.tenantId}:`;
        const keysToRemove: string[] = [];

        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key?.startsWith(prefix)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => this.storage.removeItem(key));
    }

    /**
     * Get all keys for this tenant
     */
    keys(): string[] {
        const prefix = `${this.tenantId}:`;
        const tenantKeys: string[] = [];

        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key?.startsWith(prefix)) {
                tenantKeys.push(key.replace(prefix, ''));
            }
        }

        return tenantKeys;
    }

    /**
     * Check if a key exists
     */
    hasItem(key: string): boolean {
        return this.getItem(key) !== null;
    }
}

// Singleton instances (will be initialized with tenant ID)
let localStorageInstance: TenantStorage | null = null;
let sessionStorageInstance: TenantStorage | null = null;
let tenantAccessTokenMemory: string | null = null;

/**
 * Initialize storage instances with tenant ID
 */
export function initializeTenantStorage(tenantId: string): void {
    localStorageInstance = new TenantStorage(tenantId, 'local');
    sessionStorageInstance = new TenantStorage(tenantId, 'session');
}

/**
 * Get tenant-scoped localStorage
 */
export function getTenantLocalStorage(): TenantStorage {
    if (!localStorageInstance) {
        throw new Error('TenantStorage not initialized. Call initializeTenantStorage first.');
    }
    return localStorageInstance;
}

/**
 * Get tenant-scoped sessionStorage
 */
export function getTenantSessionStorage(): TenantStorage {
    if (!sessionStorageInstance) {
        throw new Error('TenantStorage not initialized. Call initializeTenantStorage first.');
    }
    return sessionStorageInstance;
}

/**
 * Clear all tenant storage on logout
 */
export function clearTenantStorage(): void {
    localStorageInstance?.clear();
    sessionStorageInstance?.clear();
    tenantAccessTokenMemory = null;
}

// Convenience functions for common storage operations
export const tenantStorage = {
    // Auth token
    getAuthToken(): string | null {
        return tenantAccessTokenMemory;
    },
    setAuthToken(token: string): void {
        tenantAccessTokenMemory = token;
        // Cleanup legacy persisted token if present
        getTenantLocalStorage().removeItem(STORAGE_KEYS.AUTH_TOKEN);
    },
    removeAuthToken(): void {
        tenantAccessTokenMemory = null;
        getTenantLocalStorage().removeItem(STORAGE_KEYS.AUTH_TOKEN);
    },

    // Refresh token is never exposed to JS. Kept as compatibility no-op.
    getRefreshToken(): string | null {
        return null;
    },
    setRefreshToken(_token: string): void {
        // Cleanup legacy persisted refresh token if present
        getTenantLocalStorage().removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    },
    removeRefreshToken(): void {
        getTenantLocalStorage().removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    },

    // User data
    getUser<T>(): T | null {
        return getTenantLocalStorage().getItem<T>(STORAGE_KEYS.USER);
    },
    setUser<T>(user: T): void {
        getTenantLocalStorage().setItem(STORAGE_KEYS.USER, user);
    },
    removeUser(): void {
        getTenantLocalStorage().removeItem(STORAGE_KEYS.USER);
    },

    // Theme
    getTheme(): string | null {
        return getTenantLocalStorage().getItem(STORAGE_KEYS.THEME);
    },
    setTheme(theme: string): void {
        getTenantLocalStorage().setItem(STORAGE_KEYS.THEME, theme);
    },

    // Tenant info (for verified tenant context)
    getTenant<T extends { id: string; subdomain?: string }>(): T | null {
        return getTenantLocalStorage().getItem<T>(STORAGE_KEYS.TENANT_INFO);
    },
    setTenant<T>(tenant: T): void {
        getTenantLocalStorage().setItem(STORAGE_KEYS.TENANT_INFO, tenant);
    },
    removeTenant(): void {
        getTenantLocalStorage().removeItem(STORAGE_KEYS.TENANT_INFO);
    },
};
