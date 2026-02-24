import { getTenantCookieDomain } from '../tenant/tenantUtils';

interface CookieOptions {
    expires?: Date | number; // Date or days
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    httpOnly?: boolean;
}

const DEFAULT_OPTIONS: CookieOptions = {
    path: '/',
    sameSite: 'Lax',
    secure: window.location.protocol === 'https:',
};

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
    const cookies = document.cookie.split(';');

    for (const cookie of cookies) {
        const [cookieName, cookieValue] = cookie.trim().split('=');
        if (cookieName === name) {
            return decodeURIComponent(cookieValue);
        }
    }

    return null;
}

/**
 * Set a cookie with options
 */
export function setCookie(
    name: string,
    value: string,
    options: CookieOptions = {}
): void {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    let cookieString = `${name}=${encodeURIComponent(value)}`;

    if (mergedOptions.expires) {
        let expiresDate: Date;
        if (typeof mergedOptions.expires === 'number') {
            expiresDate = new Date();
            expiresDate.setDate(expiresDate.getDate() + mergedOptions.expires);
        } else {
            expiresDate = mergedOptions.expires;
        }
        cookieString += `; expires=${expiresDate.toUTCString()}`;
    }

    if (mergedOptions.path) {
        cookieString += `; path=${mergedOptions.path}`;
    }

    if (mergedOptions.domain) {
        cookieString += `; domain=${mergedOptions.domain}`;
    }

    if (mergedOptions.secure) {
        cookieString += '; secure';
    }

    if (mergedOptions.sameSite) {
        cookieString += `; samesite=${mergedOptions.sameSite}`;
    }

    document.cookie = cookieString;
}

/**
 * Delete a cookie
 */
export function deleteCookie(name: string, options: CookieOptions = {}): void {
    setCookie(name, '', { ...options, expires: -1 });
}

/**
 * Set a tenant-scoped cookie (automatically uses tenant domain)
 */
export function setTenantCookie(
    name: string,
    value: string,
    options: CookieOptions = {}
): void {
    const domain = getTenantCookieDomain();
    setCookie(name, value, { ...options, domain });
}

/**
 * Delete a tenant-scoped cookie
 */
export function deleteTenantCookie(name: string): void {
    const domain = getTenantCookieDomain();
    deleteCookie(name, { domain });
}

/**
 * Get all cookies as an object
 */
export function getAllCookies(): Record<string, string> {
    const cookies: Record<string, string> = {};

    document.cookie.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name) {
            cookies[name] = decodeURIComponent(value || '');
        }
    });

    return cookies;
}

/**
 * Clear all cookies for the current domain
 */
export function clearAllCookies(): void {
    const cookies = getAllCookies();
    Object.keys(cookies).forEach(name => deleteCookie(name));
}
