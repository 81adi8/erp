import { ApiError } from '../http/ApiError';
import { HttpStatus } from '../http/HttpStatus';

// PostgreSQL identifier max length is 63 chars.
// Allowlist: letters, numbers, underscore only.
const SCHEMA_NAME_ALLOWLIST_REGEX = /^[A-Za-z0-9_]{1,63}$/;

export function validateSchemaName(name: string): string {
    if (typeof name !== 'string' || !SCHEMA_NAME_ALLOWLIST_REGEX.test(name)) {
        throw new ApiError(
            HttpStatus.BAD_REQUEST,
            'Invalid schema name. Use only letters, numbers, underscore (max 63 chars).'
        );
    }

    return name;
}

