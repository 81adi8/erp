import * as dotenv from 'dotenv';
import { z } from 'zod';
import { logger } from '../core/utils/logger';

type NodeEnvironment = 'development' | 'test' | 'staging' | 'production';
type ValidationMode = 'warn' | 'enforce';
type TenantCollisionEnforcementMode = 'shadow' | 'enforce';

interface ValidationIssue {
    code: string;
    message: string;
}

export interface ValidatedEnv {
    nodeEnv: NodeEnvironment;
    envValidationMode: ValidationMode;
    tenantCollisionEnforcement: TenantCollisionEnforcementMode;
    port: number;
    database: {
        url?: string;
        ssl: boolean;
    };
    redis: {
        host?: string;
        port?: number;
        password?: string;
        username?: string;
        tls: boolean;
        allowMock: boolean;
    };
    jwt: {
        secret?: string;          // @deprecated — use accessSecret/refreshSecret
        accessSecret?: string;    // JWT_ACCESS_SECRET (preferred)
        refreshSecret?: string;   // JWT_REFRESH_SECRET (preferred)
        accessExpiry: string;
        refreshExpiry: string;
    };
    cors: {
        origin?: string;
        allowedOrigins: string[];
    };
    domains: {
        rootDomain?: string;
        clientUrl?: string;
        serverUrl?: string;
    };
    keycloak: {
        url?: string;
        realm?: string;
        clientId?: string;
        adminClientId?: string;
        adminUsername?: string;
        adminPassword?: string;
        clientSecret?: string;
    };
    health: {
        internalApiKey?: string;
        internalIpAllowlist: string[];
    };
    calendarificApiKey?: string;
    // Security flags — read-only after boot, cannot be overridden in production
    skipTenantValidation: boolean;
    debugMode: boolean;
}

interface ValidationResult {
    config: ValidatedEnv;
    warnings: ValidationIssue[];
    errors: ValidationIssue[];
}

const KNOWN_WEAK_SECRETS = new Set([
    'super-secret-key',
    'validation-test-key',
    'your-secret-key',
    'secret',
    'changeme',
    'password',
    'admin',
    'jwt_secret',
    'jwt-secret',
]);

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    ENV_VALIDATION_MODE: z.enum(['warn', 'enforce']).optional(),
    TENANT_COLLISION_ENFORCEMENT: z.enum(['shadow', 'enforce']).optional().default('shadow'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),

    DATABASE_URL: z.string().trim().min(1).optional(),
    DB_SSL: z.enum(['true', 'false']).optional().default('false'),

    REDIS_HOST: z.string().trim().min(1).optional(),
    REDIS_PORT: z.coerce.number().int().min(1).max(65535).optional(),
    REDIS_USERNAME: z.string().trim().min(1).optional(),
    REDIS_PASSWORD: z.string().trim().min(1).optional(),
    REDIS_TLS: z.enum(['true', 'false']).optional().default('false'),
    ALLOW_REDIS_MOCK: z.enum(['true', 'false']).optional().default('false'),

    // Preferred: separate access/refresh secrets
    JWT_ACCESS_SECRET: z.string().trim().min(1).optional(),
    JWT_REFRESH_SECRET: z.string().trim().min(1).optional(),
    // Legacy fallback (deprecated)
    JWT_SECRET: z.string().trim().min(1).optional(),
    JWT_ACCESS_EXPIRY: z.string().trim().min(1).optional().default('15m'),
    JWT_REFRESH_EXPIRY: z.string().trim().min(1).optional().default('7d'),

    CORS_ORIGIN: z.string().trim().min(1).optional(),

    ROOT_DOMAIN: z.string().trim().min(1).optional(),
    CLIENT_URL: z.string().trim().min(1).optional(),
    SERVER_URL: z.string().trim().min(1).optional(),

    KEYCLOAK_URL: z.string().trim().min(1).optional(),
    KEYCLOAK_REALM: z.string().trim().min(1).optional(),
    KEYCLOAK_CLIENT_ID: z.string().trim().min(1).optional(),
    KEYCLOAK_ADMIN_CLIENT_ID: z.string().trim().min(1).optional(),
    KEYCLOAK_ADMIN_USERNAME: z.string().trim().min(1).optional(),
    KEYCLOAK_ADMIN_PASSWORD: z.string().trim().min(1).optional(),
    KEYCLOAK_CLIENT_SECRET: z.string().trim().min(1).optional(),

    CALENDARIFIC_API_KEY: z.string().trim().min(1).optional(),

    // Health endpoint protection
    INTERNAL_API_KEY: z.string().trim().min(1).optional(),
    INTERNAL_IP_ALLOWLIST: z.string().trim().optional(),

    // Security bypass flags — HARDCODED false in production (cannot be overridden)
    DEBUG_MODE: z.enum(['true', 'false']).optional().default('false'),
    SKIP_TENANT_VALIDATION: z.enum(['true', 'false']).optional().default('false'),
});

let dotenvLoaded = false;
let cachedValidatedEnv: ValidatedEnv | null = null;

const isProductionLike = (nodeEnv: NodeEnvironment): boolean =>
    nodeEnv === 'production' || nodeEnv === 'staging';

const resolveValidationMode = (
    nodeEnv: NodeEnvironment,
    configuredMode?: ValidationMode
): ValidationMode => {
    if (isProductionLike(nodeEnv)) return 'enforce';
    return configuredMode || 'warn';
};

const hasSecretEntropy = (value: string): boolean => {
    let classes = 0;
    if (/[a-z]/.test(value)) classes++;
    if (/[A-Z]/.test(value)) classes++;
    if (/\d/.test(value)) classes++;
    if (/[^A-Za-z0-9]/.test(value)) classes++;
    return classes >= 2; // hex strings are lower+digit — valid
};

const isLocalHost = (hostname: string): boolean => {
    const normalized = hostname.toLowerCase();
    return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
};

const safeParseUrl = (value: string): URL | null => {
    try { return new URL(value); } catch { return null; }
};

const addIssue = (
    target: ValidationIssue[],
    code: string,
    message: string,
    condition: boolean
): void => {
    if (condition) target.push({ code, message });
};

export const loadEnv = (): void => {
    if (dotenvLoaded) return;
    dotenv.config();
    dotenvLoaded = true;
};

export const validateEnv = (): ValidationResult => {
    const parsed = envSchema.safeParse(process.env);

    if (!parsed.success) {
        const zodErrors: ValidationIssue[] = parsed.error.issues.map((issue) => ({
            code: 'ENV_SCHEMA_INVALID',
            message: `${issue.path.join('.') || 'root'}: ${issue.message}`,
        }));

        return {
            config: {
                nodeEnv: 'development',
                envValidationMode: 'warn',
                tenantCollisionEnforcement: 'shadow',
                port: 3000,
                database: { ssl: false },
                redis: { tls: false, allowMock: false },
                jwt: { accessExpiry: '15m', refreshExpiry: '7d' },
                cors: { allowedOrigins: [] },
                domains: {},
                keycloak: {},
                health: { internalIpAllowlist: [] },
                skipTenantValidation: false,
                debugMode: false,
            },
            warnings: [],
            errors: zodErrors,
        };
    }

    const raw = parsed.data;
    const mode = resolveValidationMode(raw.NODE_ENV, raw.ENV_VALIDATION_MODE);
    const enforce = mode === 'enforce';

    const warnings: ValidationIssue[] = [];
    const errors: ValidationIssue[] = [];

    const targetFor = (critical: boolean): ValidationIssue[] =>
        critical && enforce ? errors : warnings;

    // ── JWT secret policy ─────────────────────────────────────────────────────
    // Prefer JWT_ACCESS_SECRET + JWT_REFRESH_SECRET; fall back to JWT_SECRET
    const accessSecret = raw.JWT_ACCESS_SECRET || raw.JWT_SECRET;
    const refreshSecret = raw.JWT_REFRESH_SECRET || raw.JWT_SECRET;

    addIssue(targetFor(true), 'JWT_SECRET_MISSING',
        'JWT_ACCESS_SECRET (or JWT_SECRET) is required', !accessSecret);
    addIssue(targetFor(true), 'JWT_SECRET_MISSING',
        'JWT_REFRESH_SECRET (or JWT_SECRET) is required', !refreshSecret);

    if (accessSecret) {
        addIssue(targetFor(true), 'JWT_SECRET_WEAK',
            'JWT_ACCESS_SECRET must be at least 32 characters', accessSecret.length < 32);
        addIssue(targetFor(true), 'JWT_SECRET_WEAK',
            'JWT_ACCESS_SECRET matches a known weak/default secret',
            KNOWN_WEAK_SECRETS.has(accessSecret.toLowerCase()));
    }
    if (refreshSecret && refreshSecret !== accessSecret) {
        addIssue(targetFor(true), 'JWT_SECRET_WEAK',
            'JWT_REFRESH_SECRET must be at least 32 characters', refreshSecret.length < 32);
        addIssue(targetFor(true), 'JWT_SECRET_WEAK',
            'JWT_REFRESH_SECRET matches a known weak/default secret',
            KNOWN_WEAK_SECRETS.has(refreshSecret.toLowerCase()));
    }
    addIssue(targetFor(true), 'JWT_SECRETS_IDENTICAL',
        'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different',
        !!(accessSecret && refreshSecret && accessSecret === refreshSecret &&
           raw.JWT_ACCESS_SECRET && raw.JWT_REFRESH_SECRET));

    // ── Critical variable presence ────────────────────────────────────────────
    const criticalVariables: Array<[keyof typeof raw, string]> = [
        ['DATABASE_URL', 'DATABASE_URL is required'],
        ['CORS_ORIGIN', 'CORS_ORIGIN is required'],
        ['ROOT_DOMAIN', 'ROOT_DOMAIN is required'],
        ['CLIENT_URL', 'CLIENT_URL is required'],
        ['SERVER_URL', 'SERVER_URL is required'],
        ['REDIS_HOST', 'REDIS_HOST is required'],
        ['REDIS_PORT', 'REDIS_PORT is required'],
        ['KEYCLOAK_URL', 'KEYCLOAK_URL is required'],
        ['KEYCLOAK_REALM', 'KEYCLOAK_REALM is required'],
        ['KEYCLOAK_CLIENT_ID', 'KEYCLOAK_CLIENT_ID is required'],
        ['KEYCLOAK_ADMIN_CLIENT_ID', 'KEYCLOAK_ADMIN_CLIENT_ID is required'],
        ['KEYCLOAK_ADMIN_USERNAME', 'KEYCLOAK_ADMIN_USERNAME is required'],
        ['KEYCLOAK_ADMIN_PASSWORD', 'KEYCLOAK_ADMIN_PASSWORD is required'],
        ['KEYCLOAK_CLIENT_SECRET', 'KEYCLOAK_CLIENT_SECRET is required'],
    ];

    for (const [envKey, message] of criticalVariables) {
        addIssue(targetFor(true), 'ENV_REQUIRED', message, !raw[envKey]);
    }

    // ── Health endpoint key required in production ────────────────────────────
    addIssue(targetFor(true), 'HEALTH_KEY_REQUIRED',
        'INTERNAL_API_KEY is required in staging/production',
        isProductionLike(raw.NODE_ENV) && !raw.INTERNAL_API_KEY);

    // ── Database policy ───────────────────────────────────────────────────────
    if (raw.DATABASE_URL) {
        const dbUrl = safeParseUrl(raw.DATABASE_URL);
        addIssue(targetFor(true), 'DB_URL_INVALID', 'DATABASE_URL must be a valid URL', !dbUrl);
        if (dbUrl) {
            addIssue(targetFor(true), 'DB_URL_LOCALHOST',
                'DATABASE_URL cannot target localhost in staging/production',
                isProductionLike(raw.NODE_ENV) && isLocalHost(dbUrl.hostname));
        }
    }
    addIssue(targetFor(true), 'DB_SSL_REQUIRED',
        'DB_SSL must be true in staging/production',
        isProductionLike(raw.NODE_ENV) && raw.DB_SSL !== 'true');

    // ── CORS policy ───────────────────────────────────────────────────────────
    const allowedOrigins = (raw.CORS_ORIGIN || '')
        .split(',').map((e) => e.trim()).filter(Boolean);

    addIssue(targetFor(true), 'CORS_WILDCARD_FORBIDDEN',
        'CORS_ORIGIN cannot contain wildcard (*) in staging/production',
        isProductionLike(raw.NODE_ENV) && allowedOrigins.includes('*'));

    for (const origin of allowedOrigins) {
        const url = safeParseUrl(origin);
        addIssue(targetFor(true), 'CORS_ORIGIN_INVALID', `CORS origin is invalid URL: ${origin}`, !url);
        addIssue(targetFor(true), 'CORS_ORIGIN_INSECURE',
            `CORS origin must use https in staging/production: ${origin}`,
            !!url && isProductionLike(raw.NODE_ENV) && url.protocol !== 'https:');
    }

    // ── Keycloak policy ───────────────────────────────────────────────────────
    if (raw.KEYCLOAK_URL) {
        const keycloakUrl = safeParseUrl(raw.KEYCLOAK_URL);
        addIssue(targetFor(true), 'KEYCLOAK_URL_INVALID', 'KEYCLOAK_URL must be a valid URL', !keycloakUrl);
        addIssue(targetFor(true), 'KEYCLOAK_URL_INSECURE',
            'KEYCLOAK_URL must use https in staging/production',
            !!keycloakUrl && isProductionLike(raw.NODE_ENV) && keycloakUrl.protocol !== 'https:');
    }

    addIssue(targetFor(true), 'KEYCLOAK_ADMIN_DEFAULT',
        'KEYCLOAK admin username/password cannot use admin/admin in staging/production',
        isProductionLike(raw.NODE_ENV) &&
            raw.KEYCLOAK_ADMIN_USERNAME?.toLowerCase() === 'admin' &&
            raw.KEYCLOAK_ADMIN_PASSWORD?.toLowerCase() === 'admin');

    addIssue(targetFor(true), 'KEYCLOAK_ADMIN_CLIENT_DEFAULT',
        'KEYCLOAK_ADMIN_CLIENT_ID cannot be admin-cli in staging/production',
        isProductionLike(raw.NODE_ENV) && raw.KEYCLOAK_ADMIN_CLIENT_ID?.toLowerCase() === 'admin-cli');

    // ── Redis policy ──────────────────────────────────────────────────────────
    addIssue(targetFor(true), 'REDIS_PASSWORD_REQUIRED',
        'REDIS_PASSWORD is required in staging/production',
        isProductionLike(raw.NODE_ENV) && !raw.REDIS_PASSWORD);
    addIssue(targetFor(true), 'REDIS_MOCK_FORBIDDEN',
        'ALLOW_REDIS_MOCK must be false in staging/production',
        isProductionLike(raw.NODE_ENV) && raw.ALLOW_REDIS_MOCK === 'true');

    // ── Security bypass flags — HARDCODED false in production ─────────────────
    // These are NEVER allowed to be true in production/staging regardless of env
    const effectiveSkipTenant = isProductionLike(raw.NODE_ENV) ? false
        : raw.SKIP_TENANT_VALIDATION === 'true';
    const effectiveDebugMode = isProductionLike(raw.NODE_ENV) ? false
        : raw.DEBUG_MODE === 'true';

    addIssue(targetFor(true), 'DEBUG_MODE_FORBIDDEN',
        'DEBUG_MODE=true is forbidden in staging/production',
        isProductionLike(raw.NODE_ENV) && raw.DEBUG_MODE === 'true');
    addIssue(targetFor(true), 'TENANT_VALIDATION_SKIP_FORBIDDEN',
        'SKIP_TENANT_VALIDATION=true is forbidden in staging/production',
        isProductionLike(raw.NODE_ENV) && raw.SKIP_TENANT_VALIDATION === 'true');

    // ── Parse IP allowlist ────────────────────────────────────────────────────
    const internalIpAllowlist = (raw.INTERNAL_IP_ALLOWLIST || '127.0.0.1,::1')
        .split(',').map((ip) => ip.trim()).filter(Boolean);

    const config: ValidatedEnv = {
        nodeEnv: raw.NODE_ENV,
        envValidationMode: mode,
        tenantCollisionEnforcement: raw.TENANT_COLLISION_ENFORCEMENT,
        port: raw.PORT,
        database: {
            url: raw.DATABASE_URL,
            ssl: raw.DB_SSL === 'true',
        },
        redis: {
            host: raw.REDIS_HOST,
            port: raw.REDIS_PORT,
            password: raw.REDIS_PASSWORD,
            username: raw.REDIS_USERNAME,
            tls: raw.REDIS_TLS === 'true',
            allowMock: raw.ALLOW_REDIS_MOCK === 'true',
        },
        jwt: {
            secret: raw.JWT_SECRET,                    // @deprecated
            accessSecret: raw.JWT_ACCESS_SECRET || raw.JWT_SECRET,
            refreshSecret: raw.JWT_REFRESH_SECRET || raw.JWT_SECRET,
            accessExpiry: raw.JWT_ACCESS_EXPIRY,
            refreshExpiry: raw.JWT_REFRESH_EXPIRY,
        },
        cors: {
            origin: raw.CORS_ORIGIN,
            allowedOrigins,
        },
        domains: {
            rootDomain: raw.ROOT_DOMAIN,
            clientUrl: raw.CLIENT_URL,
            serverUrl: raw.SERVER_URL,
        },
        keycloak: {
            url: raw.KEYCLOAK_URL,
            realm: raw.KEYCLOAK_REALM,
            clientId: raw.KEYCLOAK_CLIENT_ID,
            adminClientId: raw.KEYCLOAK_ADMIN_CLIENT_ID,
            adminUsername: raw.KEYCLOAK_ADMIN_USERNAME,
            adminPassword: raw.KEYCLOAK_ADMIN_PASSWORD,
            clientSecret: raw.KEYCLOAK_CLIENT_SECRET,
        },
        health: {
            internalApiKey: raw.INTERNAL_API_KEY,
            internalIpAllowlist,
        },
        calendarificApiKey: raw.CALENDARIFIC_API_KEY,
        // Security flags — production values are HARDCODED, not from env
        skipTenantValidation: effectiveSkipTenant,
        debugMode: effectiveDebugMode,
    };

    return { config, warnings, errors };
};

const printIssues = (label: string, issues: ValidationIssue[]): void => {
    if (issues.length === 0) return;
    console[label === 'error' ? 'error' : 'warn'](`[ENV] ${label.toUpperCase()} (${issues.length})`);
    for (const issue of issues) {
        console[label === 'error' ? 'error' : 'warn'](`  - [${issue.code}] ${issue.message}`);
    }
};

export const validateEnvOrExit = (): ValidatedEnv => {
    if (cachedValidatedEnv) return cachedValidatedEnv;

    loadEnv();
    const result = validateEnv();
    const shouldEnforce = result.config.envValidationMode === 'enforce';

    printIssues('warn', result.warnings);

    if (result.errors.length > 0) {
        printIssues('error', result.errors);
        if (shouldEnforce) {
            logger.error('[ENV] Validation failed in enforce mode. Startup aborted.');
            process.exit(1);
        }
        logger.warn('[ENV] Validation failed but startup continues in warn mode.');
    }

    cachedValidatedEnv = result.config;
    return result.config;
};
