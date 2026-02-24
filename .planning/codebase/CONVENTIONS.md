# Coding Conventions

**Analysis Date:** 2026-02-24

## Naming Patterns

**Files:**
- TypeScript files: `kebab-case.ts` (e.g., `async-handler.ts`, `student.dto.ts`)
- Controllers: `*.controller.ts`
- Services: `*.service.ts`
- Repositories: `*.repository.ts`
- DTOs/Validators: `*.dto.ts`, `*.validator.ts`
- Schemas: `*.schemas.ts`
- Routes: `*.routes.ts`
- Tests: `*.test.ts` (co-located in `__tests__` directory)

**Functions:**
- camelCase: `getStudents`, `createCategory`, `asyncHandler`
- Controller methods: PascalCase (e.g., `getStudents`, `admitStudent`)
- Utility functions: camelCase

**Variables:**
- camelCase: `testUser`, `adminToken`, `hashedPassword`
- Constants: PascalCase for class names, UPPER_SNAKE_CASE for enum values

**Types:**
- PascalCase: `AdmitStudentDTO`, `UpdateStudentDTO`, `StudentPromotionSchema`
- Interfaces: PascalCase prefixed with `I` optional (not consistently used)
- ZCase (e.god schemas: Pascal., `AdmitStudentSchema`, `GetStudentsQuerySchema`)

## Code Style

**Formatting:**
- Tool: Not explicitly configured (no Prettier config found)
- Uses ESLint for code quality

**Linting:**
- Server: Uses TypeScript ESLint patterns
- Client: ESLint flat config in `eslint.config.js`
  - Extends: `js.configs.recommended`, `reactHooks.configs.flat.recommended`, `reactRefresh.configs.vite`
  - Custom rule: `'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }]`

**TypeScript Configuration:**
- Server (`server/tsconfig.json`):
  - Target: ES2020
  - Module: CommonJS
  - Strict mode: DISABLED (`strict: false`, `noImplicitAny: false`, `strictNullChecks: false`)
  - Decorators: ENABLED (`experimentalDecorators: true`, `emitDecoratorMetadata: true`)
  - Path aliases: `@/(.*)` maps to `<rootDir>/$1`

## Import Organization

**Order:**
1. Node built-ins: `import express from 'express'`
2. External packages: `import bcrypt from 'bcrypt'`, `import { z } from 'zod'`
3. Internal modules: `import { AuthService } from '../../auth'`
4. Relative paths: `import { getTenant } from '../../../core/context/requestContext'`

**Path Aliases:**
- Server: `@/` prefix for root source (e.g., `@/modules/school`)
- External mocks mapped in Jest config

**Example imports:**
```typescript
import express from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { AuthService } from '../../auth';
import { getTenant } from '../../../core/context/requestContext';
import { asyncHandler } from '../../../core/utils/asyncHandler';
import { logger } from '../../../core/utils/logger';
```

## Error Handling

**Pattern: asyncHandler wrapper**
```typescript
import { asyncHandler } from '../../../core/utils/asyncHandler';

export const login = asyncHandler(async (req, res, next) => {
    // async code here
    // errors automatically passed to Express error middleware
});
```

**Error types:**
- `ApiError` class from `src/core/http/ApiError`
- Custom error handling in `src/core/http/ErrorHandler.ts`
- Error response format:
```typescript
{
    success: false,
    message: string,
    data: null,
    errors?: string[],
    meta?: Record<string, unknown>
}
```

**Global error handler:**
- Location: `src/core/http/ErrorHandler.ts`
- Handles: CastError, DuplicateFieldsError, ValidationError, JWT errors, Sequelize errors
- Development: includes stack trace
- Production: hides internal errors

**Error codes by category:**
- 400: Validation errors
- 401: Authentication errors (invalid/expired token)
- 403: Forbidden
- 404: Not found
- 409: Duplicate conflict

## Logging

**Framework:** Winston-based logger in `src/core/utils/logger.ts`

**Patterns:**
```typescript
import { logger } from '../../../core/utils/logger';

// Info logging
logger.info('[App] Queue Manager initialized');

// Error logging
logger.error('[ErrorHandler] Request failed', {
    message: err.message,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    stack: env.nodeEnv === 'development' ? err.stack : undefined,
});
```

**Structured logging:**
- Request ID middleware for tracing
- HTTP logger middleware in `src/core/observability/structured-logger`

## Comments

**When to Comment:**
- JSDoc on exported functions/controllers: YES
- Complex business logic: YES
- FIXED/STABILIZATION markers: YES (e.g., `// FIXED: Was missing from tenant auth router`)
- TASK markers: YES (e.g., `// TASK-04: Observability`)

**JSDoc/TSDoc:**
- Used on controller methods
- Example:
```typescript
/**
 * POST /auth/register
 * Register a new user in the current tenant
 */
export const register = asyncHandler(async (req, res, next) => {
    // ...
});
```

**Not used consistently:**
- No enforced JSDoc requirements
- Some files have extensive comments, others have none

## Function Design

**Size:**
- No strict size limit
- Controllers typically delegate to services

**Parameters:**
- Typed with TypeScript interfaces
- Request validation via Zod schemas
- DTOs extracted from request body

**Return Values:**
- JSON responses with consistent shape
- Success format:
```typescript
{
    success: true,
    message?: string,
    data: T,
    meta?: Record<string, unknown>
}
```

## Module Design

**Exports:**
- Named exports preferred for controllers, services
- Re-export patterns in index.ts files

**Barrel Files:**
- Used extensively (e.g., `modules/school/routes/index.ts`)
- Index files for grouping related exports

**Directory Structure Pattern:**
```
modules/
├── school/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── dto/
│   ├── routes/
│   └── index.ts
```

---

*Convention analysis: 2026-02-24*
