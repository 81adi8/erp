# Architecture

**Analysis Date:** 2026-02-24

## Pattern Overview

**Overall:** Multi-tenant SaaS with Controller-Service-Repository Pattern

**Key Characteristics:**
- Multi-schema PostgreSQL isolation (one schema per tenant)
- Express.js backend with TypeScript
- React + Vite frontend with monorepo structure (pnpm workspaces)
- Keycloak OIDC authentication with RBAC
- Redis-backed queue system with Bull
- Event-driven architecture for async operations

## Layers

**Configuration Layer:**
- Purpose: Environment validation, Redis, Keycloak configuration
- Location: `server/src/config/`
- Contains: `env.ts`, `env.validation.ts`, `keycloak.config.ts`, `redis.ts`
- Depends on: Environment variables
- Used by: All layers

**Core Infrastructure Layer:**
- Purpose: Shared infrastructure - middleware, auth, utilities
- Location: `server/src/core/`
- Contains: `middleware/`, `auth/`, `rbac/`, `tenant/`, `queue/`, `events/`, `utils/`
- Depends on: Configuration layer
- Used by: All modules

**Database Layer:**
- Purpose: ORM models, migrations, repositories, connection management
- Location: `server/src/database/`
- Contains: `models/`, `migrations/`, `repositories/`, `sequelize.ts`, `model-loader.ts`
- Depends on: Configuration layer
- Used by: Service layer

**Module Layer (Feature Modules):**
- Purpose: Business logic organized by domain
- Location: `server/src/modules/`
- Contains: `auth/`, `school/`, `tenant/`, `super-admin/`, `university/`, `shared/`
- Sub-modules in `school/`: `academic/`, `attendance/`, `fees/`, `examination/`, `student/`, `user-management/`, `dashboard/`, `communication/`, `reports/`
- Depends on: Core infrastructure, Database layer
- Used by: Routes layer

**Routes Layer:**
- Purpose: HTTP endpoint definitions and middleware composition
- Location: `server/src/modules/*/routes/`
- Contains: Route definitions, route handlers
- Depends on: Module layer
- Used by: Express app (app.ts)

**Express Application Layer:**
- Purpose: Middleware composition, route mounting, error handling
- Location: `server/src/app.ts`, `server/src/server.ts`
- Contains: Express app setup, middleware chain, initialization
- Depends on: All layers
- Used by: Server entry point

**Frontend Layer:**
- Purpose: User interfaces for different portals
- Location: `client/apps/`
- Contains: `school/`, `super_admin/`, `landing/`
- Shared: `client/packages/common/` (shared UI components)
- Depends on: Backend APIs
- Used by: End users

## Data Flow

**Tenant Request Flow:**

1. Request arrives at Express (`server/src/app.ts`)
2. Security middleware: helmet, cors, rate limiting, XSS sanitization
3. Tenant context resolution: `resolveTenantContextMiddleware` extracts tenant from subdomain/header
4. Authentication: `keycloakOidcMiddleware` validates Keycloak JWT token
5. Tenant isolation: `TenantIsolationGuard` ensures tenant can only access their schema
6. RBAC resolution: `lazyRBACMiddleware` loads permissions from Redis cache
7. Academic session: `academicSessionMiddleware` extracts academic session context
8. Route handler: Controller receives request, delegates to service
9. Repository: Service calls repository, which uses tenant-specific sequelize connection
10. Response flows back through error handler if needed

**Async Operation Flow (Queue):**

1. Controller enqueues job to `QueueManager`
2. Bull queue persists job in Redis
3. Worker processes job asynchronously
4. Events emitted on completion (`eventController`)
5. Callbacks/notifications triggered

## Key Abstractions

**Tenant Context:**
- Purpose: Represents the current tenant request context
- Examples: `server/src/core/tenant/tenant.context.ts`
- Pattern: Thread-local-like storage using AsyncLocalStorage

**RBAC System:**
- Purpose: Role-based permission resolution at runtime
- Examples: `server/src/core/rbac/rbac.cache.ts`, `server/src/core/rbac/rbac.resolver.ts`, `server/src/core/rbac/rbac.middleware.ts`
- Pattern: Lazy-initialized RBAC with Redis caching

**Queue Manager:**
- Purpose: Centralized queue management for async operations
- Examples: `server/src/core/queue/QueueManager.ts`
- Pattern: Singleton pattern with Bull queues

**Event Controller:**
- Purpose: Event bus for decoupling async operations
- Examples: `server/src/core/events/event.controller.ts`
- Pattern: Observer pattern for event-driven communication

**Academic Session:**
- Purpose: Global session context for multi-academic-year support
- Examples: `server/src/core/middleware/academicSession.middleware.ts`
- Pattern: Header-based context propagation

## Entry Points

**Backend Entry:**
- Location: `server/src/server.ts`
- Triggers: `node server/dist/server.js` or `pnpm dev`
- Responsibilities: Server startup sequence - Redis → Database → Keycloak → Queue/Events → Permission Cache → HTTP server

**Express Application:**
- Location: `server/src/app.ts`
- Triggers: Imported by server.ts
- Responsibilities: Middleware setup, route mounting, error handlers

**Frontend Entry (School App):**
- Location: `client/apps/school/src/main.tsx`
- Triggers: `pnpm dev:school`
- Responsibilities: React app bootstrap, Redux store setup, routing

**Frontend Entry (Super Admin):**
- Location: `client/apps/super_admin/src/main.tsx`
- Triggers: `pnpm dev:admin`
- Responsibilities: Admin panel bootstrap

## Error Handling

**Strategy:** Centralized Express error handling with custom error classes

**Patterns:**
- `ApiError` class: Base error with status code, message, and errors array
- `server/src/core/http/ApiError.ts`: Custom error definitions
- `server/src/core/http/ErrorHandler.ts`: Global error handler middleware, 404 handler, uncaught exception handlers
- Async route handlers use try-catch with forward to error handler
- Zod validation errors caught and transformed to 400 responses

## Cross-Cutting Concerns

**Logging:** 
- Winston-based structured logger in `server/src/core/observability/structured-logger.ts`
- Request ID middleware for request tracing
- HTTP logging middleware

**Validation:**
- Zod schemas for request validation
- Schema files in `server/src/modules/*/schemas/` or `auth.schemas.ts`
- Custom validators in `server/src/modules/*/validators/`

**Authentication:**
- Keycloak OIDC middleware (`server/src/core/middleware/keycloak.middleware.ts`)
- JWT token validation
- Session management via `server/src/modules/auth/`

**Tenant Isolation:**
- TenantIsolationGuard (`server/src/core/resilience/tenant-isolation.guard.ts`)
- Database connection per tenant schema
- Row-level security via tenant_id foreign keys

**RBAC:**
- RBAC middleware with lazy initialization
- Redis-cached permission resolution
- Role and permission management routes

---

*Architecture analysis: 2026-02-24*
