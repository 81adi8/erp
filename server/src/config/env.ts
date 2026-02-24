import { validateEnvOrExit } from './env.validation';

/**
 * Single source of truth for runtime environment configuration.
 *
 * IMPORTANT:
 * - No insecure fallback secrets/defaults in this file.
 * - Validation policy and fail-fast behavior are enforced in env.validation.ts.
 */
export const env = Object.freeze(validateEnvOrExit());
