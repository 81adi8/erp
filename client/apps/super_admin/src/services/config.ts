/**
 * API Configuration
 * Central configuration for API settings
 */

export const API_CONFIG = {
    // Base URL from environment or default
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/v1',

    // API version prefix
    prefix: '/root/admin', // Prefix will be handled by baseUrl or explicitly

    // Request timeout in ms
    timeout: 30000,

    // Credentials mode
    credentials: 'include' as RequestCredentials,
} as const;

/**
 * Get full API URL for an endpoint
 */
export const getApiUrl = (endpoint: string): string => {
    return `${API_CONFIG.baseUrl}${API_CONFIG.prefix}${endpoint}`;
};
