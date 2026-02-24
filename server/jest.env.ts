/**
 * Jest Environment Setup
 * 
 * This file runs BEFORE any modules are imported.
 * It sets environment variables directly to ensure they are available
 * when the env validation module loads.
 */

// Set test environment variables DIRECTLY before any modules are loaded
// This is critical because env.ts validates at module load time
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5433/school_erp';
process.env.DB_SCHEMA = process.env.DB_SCHEMA || 'test_schema_jest';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.REDIS_PASSWORD = process.env.REDIS_PASSWORD || 'test-password';
process.env.ALLOW_REDIS_MOCK = process.env.ALLOW_REDIS_MOCK || 'true';

// JWT secrets for testing
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || '8b2bc26f0a4098081b42be70728bb60b19b291c12f9a9a60f6812e7b4fbbd0045';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '22ac21927d12ec55840a32a516654106ba476b238d6a41fef689c133c4eda44a95';
process.env.JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
process.env.JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

// Security flags
process.env.SKIP_TENANT_VALIDATION = 'false';
process.env.DEBUG_MODE = 'false';

// Mock external providers for tests
process.env.SMS_PROVIDER = 'mock';
process.env.EMAIL_PROVIDER = 'mock';
process.env.KEYCLOAK_ENABLED = 'false';

// RBAC settings
process.env.RBAC_ENFORCE_STUDENT = 'true';
process.env.RBAC_ENFORCE_ATTENDANCE = 'true';
process.env.RBAC_ENFORCE_ACADEMICS = 'true';
process.env.RBAC_ENFORCE_EXAMS = 'true';
process.env.RBAC_ENFORCE_USER_MGMT = 'true';
process.env.RBAC_ENFORCE_RBAC = 'true';
process.env.TENANT_COLLISION_ENFORCEMENT = 'shadow';

// Health endpoint protection
process.env.INTERNAL_API_KEY = 'test-internal-key';
process.env.INTERNAL_IP_ALLOWLIST = '127.0.0.1,::1,localhost';

// Set validation mode to warn so tests don't exit on missing optional vars
process.env.ENV_VALIDATION_MODE = 'warn';

console.log('[Jest Env] Test environment variables set');
