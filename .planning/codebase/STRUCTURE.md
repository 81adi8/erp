# Codebase Structure

**Analysis Date:** 2026-02-24

## Directory Layout

```
new-erp-main/
├── .planning/
│   └── codebase/          # GSD planning documents
├── .clinerules/           # AI agent rules
├── docs/                  # Project documentation
├── client/                # Frontend monorepo (pnpm workspace)
│   ├── apps/              # Frontend applications
│   │   ├── school/       # Tenant portal (admin/teacher/student/staff)
│   │   ├── super_admin/ # Platform admin dashboard
│   │   └── landing/      # Public marketing site
│   ├── packages/         # Shared packages
│   │   └── common/       # Shared UI library (@erp/common)
│   ├── dev-env/          # Development environment config
│   └── node_modules/
├── server/                # Backend application
│   ├── src/
│   ├── dist/              # Compiled JavaScript
│   ├── coverage/          # Test coverage reports
│   ├── database/          # Database-related files
│   ├── dev-env/          # Development environment config
│   ├── dev-scripts/      # Development helper scripts
│   ├── scripts/          # CLI scripts
│   └── node_modules/
├── .env.example           # Environment template
├── README.md
└── SECURITY_AUDIT_REPORT.md
```

## Directory Purposes

**Client Applications (`client/apps/`):**

- `school/`: Main tenant-facing application
  - Purpose: Admin, Teacher, Student, Staff portals
  - Contains: `src/components/`, `src/core/`, `src/hooks/`, `src/layouts/`, `src/store/`, `src/tenant-modules/`
  - Key files: `src/App.tsx`, `src/main.tsx`, `vite.config.ts`

- `super_admin/`: Platform administration
  - Purpose: Tenant management, platform settings
  - Contains: `src/components/`, `src/features/`, `src/pages/`, `src/services/`, `src/store/`
  - Key files: `src/App.tsx`, `src/main.tsx`

- `landing/`: Marketing site
  - Purpose: Public landing page

**Shared Packages (`client/packages/`):**

- `common/`: Shared UI library
  - Purpose: Reusable components, hooks, themes across apps
  - Contains: `src/components/`, `src/hooks/`, `src/api/`, `src/themes/`, `src/types/`, `src/utils/`
  - Key files: `src/index.ts`

**Server Modules (`server/src/modules/`):**

- `auth/`: Authentication module
  - Purpose: Login, session, token, MFA handling
  - Contains: `auth.service.ts`, `auth.middleware.ts`, `session.service.ts`, `token.service.ts`, `mfa.routes.ts`

- `school/`: Core school/tenant functionality
  - Purpose: Main tenant features - academics, attendance, fees, users, etc.
  - Contains sub-modules:
    - `academic/`: Academic years, classes, sections, subjects
    - `attendance/`: Attendance tracking with queue support
    - `auth/`: School-specific authentication
    - `communication/`: Notices, announcements, parent portal
    - `dashboard/`: Dashboard statistics
    - `examination/`: Exams and results
    - `fees/`: Fee categories, structures, payments
    - `reports/`: Async report generation
    - `repositories/`: Data access layer
    - `schemas/`: Database schemas
    - `services/`: Business logic
    - `student/`: Student management
    - `user-management/`: Teachers, staff, roles
    - `routes/`: API route definitions

- `tenant/`: Tenant management
  - Purpose: Tenant provisioning, onboarding, CRUD
  - Contains: `controllers/`, `services/`, `routes/`, `validators/`, `utils/`

- `super-admin/`: Platform admin functionality
  - Purpose: Root admin operations

- `university/`: University-level functionality
  - Purpose: Multi-school management within a university

- `shared/`: Cross-cutting features
  - Purpose: Notifications, common routes
  - Contains: `controllers/`, `notification/`, `repositories/`, `routes/`

**Server Core (`server/src/core/`):**

- `middleware/`: Express middleware
  - Purpose: Request processing, auth, tenant context
  - Key files: `keycloak.middleware.ts`, `resolveTenantContext.middleware.ts`, `academicSession.middleware.ts`, `security.middleware.ts`

- `auth/`: Core authentication utilities

- `rbac/`: Role-based access control
  - Purpose: Permission resolution, caching
  - Key files: `rbac.middleware.ts`, `rbac.cache.ts`, `rbac.resolver.ts`

- `tenant/`: Tenant isolation and context
  - Purpose: Tenant context management

- `queue/`: Queue management
  - Purpose: Bull queue setup, job processing

- `events/`: Event system
  - Purpose: Event-driven architecture

- `http/`: HTTP utilities
  - Purpose: Error handling, API error classes

- `resilience/`: Fault tolerance
  - Purpose: Tenant isolation guard, circuit breakers

- `cache/`: Caching utilities
  - Purpose: Permission config caching

- `observability/`: Logging and health
  - Purpose: Structured logging, health routes

- `database/`: Database utilities
  - Purpose: Connection management

- `utils/`: Utility functions

- `types/`: TypeScript type definitions
  - Key files: `express.d.ts` (Express type augmentations)

**Server Config (`server/src/config/`):**

- Purpose: Application configuration
- Contains: `env.ts`, `env.validation.ts`, `keycloak.config.ts`, `redis.ts`, `db.ts`

**Server Database (`server/src/database/`):**

- `models/`: Sequelize models
  - Contains: `public/`, `root/`, `school/`, `shared/`, `university/`

- `migrations/`: Database migrations

- `repositories/`: Data access repositories

- `seeders/`: Database seeders

- `connections/`: Tenant connection management

- `sql/`: Raw SQL scripts

- Key files: `sequelize.ts`, `model-loader.ts`, `index.ts`

**Server Scripts (`server/src/scripts/`):**

- Purpose: CLI utilities
- Contains: Migration, seeding, tenant creation scripts

## Key File Locations

**Entry Points:**
- `server/src/server.ts`: Backend server startup
- `server/src/app.ts`: Express application configuration
- `client/apps/school/src/main.tsx`: School app bootstrap
- `client/apps/super_admin/src/main.tsx`: Admin app bootstrap

**Configuration:**
- `server/src/config/env.ts`: Environment variables
- `server/src/config/env.validation.ts`: Env validation
- `server/src/config/keycloak.config.ts`: Keycloak config
- `server/src/config/redis.ts`: Redis configuration

**Core Infrastructure:**
- `server/src/core/middleware/keycloak.middleware.ts`: Keycloak authentication
- `server/src/core/middleware/resolveTenantContext.middleware.ts`: Tenant context
- `server/src/core/middleware/academicSession.middleware.ts`: Academic session
- `server/src/core/rbac/rbac.middleware.ts`: RBAC middleware
- `server/src/core/queue/QueueManager.ts`: Queue management
- `server/src/core/events/event.controller.ts`: Event system

**Error Handling:**
- `server/src/core/http/ApiError.ts`: Custom error class
- `server/src/core/http/ErrorHandler.ts`: Error handlers

## Naming Conventions

**Files:**
- Routes: `*.routes.ts` (e.g., `user-management.routes.ts`)
- Controllers: `*.controller.ts` (e.g., `student.controller.ts`)
- Services: `*.service.ts` (e.g., `auth.service.ts`)
- Repositories: `*.repository.ts` (e.g., `student.repository.ts`)
- Validators: `*.validator.ts` (e.g., `tenant.validator.ts`)
- Schemas: `*.schemas.ts` or `schemas/*.ts`
- Middleware: `*.middleware.ts`
- Types: `*.types.ts`

**Directories:**
- Modules: lowercase, hyphenated (e.g., `user-management/`)
- Subdirectories within modules: lowercase (e.g., `controllers/`, `services/`)

**TypeScript:**
- Interfaces: PascalCase (e.g., `ITenantContext`)
- Types: PascalCase (e.g., `UserRole`)
- Enums: PascalCase (e.g., `UserRoleEnum`)

## Where to Add New Code

**New Feature in School Module:**
- Primary code: `server/src/modules/school/{feature}/`
- Routes: `server/src/modules/school/{feature}/routes/`
- Services: `server/src/modules/school/{feature}/services/`
- Controllers: `server/src/modules/school/{feature}/controllers/`
- Repositories: `server/src/modules/school/{feature}/repositories/`
- Tests: `server/src/__tests__/`

**New Tenant Module:**
- Primary code: `server/src/modules/tenant/`
- Add routes to `server/src/app.ts`

**New Shared Backend Utility:**
- Location: `server/src/core/` (if cross-cutting)
- Or: `server/src/modules/shared/`

**New Frontend Feature:**
- Primary code: `client/apps/school/src/tenant-modules/{feature}/`
- Components: `client/apps/school/src/components/`
- Hooks: `client/apps/school/src/hooks/`
- Shared UI: `client/packages/common/src/components/`

**New API Endpoint:**
- Define route: `server/src/modules/{module}/routes/{feature}.routes.ts`
- Define controller: `server/src/modules/{module}/{feature}/controllers/`
- Add to app.ts mount

## Special Directories

**Database Migrations:**
- Purpose: Schema versioning
- Location: `server/src/database/migrations/`
- Generated: Yes (via Sequelize CLI)
- Committed: Yes

**Database Seeders:**
- Purpose: Initial data population
- Location: `server/src/database/seeders/`
- Generated: Yes
- Committed: Yes (non-sensitive data)

**Test Files:**
- Purpose: Unit and integration tests
- Location: `server/src/__tests__/`
- Pattern: `*.test.ts`

**Coverage Reports:**
- Purpose: Test coverage analysis
- Location: `server/coverage/`
- Generated: Yes (on test run)
- Committed: No (in .gitignore)

**Build Output:**
- Purpose: Compiled JavaScript
- Location: `server/dist/`, `client/apps/school/dist/`
- Generated: Yes (on build)
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-02-24*
