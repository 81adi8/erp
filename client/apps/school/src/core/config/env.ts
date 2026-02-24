// Environment configuration with type safety

interface EnvConfig {
    // Tenant data API (school/students, school/attendance, etc.)
    API_BASE_URL: string;
    // Auth API (auth/login, auth/refresh, auth/mfa, etc.)
    AUTH_API_BASE_URL: string;

    // Tenant
    MAIN_DOMAIN: string;
    PUBLIC_SITE_URL: string;
    ALLOWED_TENANT_TYPES: string[];

    // Keycloak
    KEYCLOAK: {
        URL: string;
        REALM: string;
        CLIENT_ID: string;
    };

    // Development
    IS_DEV: boolean;
}

type ViteEnvMap = Record<string, string | boolean | undefined>;

function getRawEnv(key: string): string | boolean | undefined {
    const envMap = import.meta.env as ViteEnvMap;
    return envMap[key];
}

function getEnv(key: string, defaultValue: string = ''): string {
    const value = getRawEnv(key);
    return typeof value === 'string' ? value : defaultValue;
}

export const env: EnvConfig = {
    // Tenant data API — all /school/* routes go here
    API_BASE_URL: getEnv('VITE_API_BASE_URL', 'http://localhost:3000/api/v1/tenant'),
    // Auth API — /auth/login, /auth/refresh, /auth/mfa/* go here
    AUTH_API_BASE_URL: getEnv('VITE_AUTH_API_BASE_URL', 'http://localhost:3000/api/v2/school'),

    MAIN_DOMAIN: getEnv('VITE_MAIN_DOMAIN', 'localhost'),
    PUBLIC_SITE_URL: getEnv('VITE_PUBLIC_SITE_URL', 'http://localhost:5174'),
    ALLOWED_TENANT_TYPES: ['school', 'university', 'coaching', 'institute'],

    KEYCLOAK: {
        URL: getEnv('VITE_KEYCLOAK_URL', 'http://localhost:8080'),
        REALM: getEnv('VITE_KEYCLOAK_REALM', 'school-erp'),
        CLIENT_ID: getEnv('VITE_KEYCLOAK_CLIENT_ID', 'school-app'),
    },

    IS_DEV: Boolean(getRawEnv('DEV')),
};
