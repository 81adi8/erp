# FULL SYSTEM AUDIT REPORT — School ERP SaaS

**Audit Date:** 2026-02-23  
**Auditor:** Principal Engineer / Enterprise System Auditor  
**Codebase:** `new-erp-main`  
**Status:** IN PROGRESS — Phase 1 Complete

---

# PHASE 1 — SYSTEM MAP

---

## A) ARCHITECTURE TYPE

### Verdict: **Modular Monolith with SaaS Multi-Tenancy**

**Evidence:**

| Signal                              | Evidence                                                                                   | Location                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Single Express server               | `const app = express();`                                                                   | `server/src/app.ts:51`                                                          |
| Single `server.ts` entrypoint       | `startServer()` boots Redis → DB → Keycloak → Queues → PermissionCache → HTTP              | `server/src/server.ts:31-93`                                                    |
| Single PostgreSQL connection pool   | `new Sequelize(databaseUrl, { pool: { max: 20, min: 5 } })`                                | `server/src/database/sequelize.ts:22-44`                                        |
| Single Redis connection             | Shared Redis for cache, queues, sessions, RBAC                                             | `server/src/config/redis.ts`                                                    |
| Domain-segmented modules            | `server/src/modules/school/{academic,attendance,fees,examination,student,...}`             | Each has `controllers/`, `services/`, `repositories/`, `routes/`, `validators/` |
| Core infrastructure layer           | `server/src/core/{auth,rbac,cache,queue,events,middleware,resilience,...}` — 19 subsystems | Shared by all modules                                                           |
| Multi-tenant via PostgreSQL schemas | One DB, one schema per tenant (`tenant_xyz`)                                               | `server/src/database/sequelize.ts:50-76`                                        |
| Monorepo client                     | `client/apps/{school,super_admin,landing}` + `client/packages/*`                           | pnpm workspaces: `client/pnpm-workspace.yaml`                                   |

**Deployment Topology:**  
Single Node.js process → PostgreSQL (multi-schema) → Redis (cache + queues + sessions)

---

## B) MODULE REGISTRY

### B.1 — Core Infrastructure (`server/src/core/`)

| #   | Module            | Path                  | Responsibilities                                                                                                                                           | Dependencies                         |
| --- | ----------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1   | **Auth**          | `core/auth/`          | JWT sign/verify (access + refresh), Keycloak OIDC service, auth audit, rate limiting                                                                       | `jsonwebtoken`, `jose` (JWKS), Redis |
| 2   | **RBAC**          | `core/rbac/`          | Role-Based Access Control — resolver, cache, middleware, permission definitions, platform RBAC                                                             | Redis, DB (roles/permissions tables) |
| 3   | **Cache**         | `core/cache/`         | Generic cache service, cache keys registry, permission config cache, TTL management                                                                        | Redis                                |
| 4   | **Middleware**    | `core/middleware/`    | authGuard, Keycloak middleware, tenant context, academic session, rate limiters, pilot mode, health guard, security headers, XSS sanitize, HPP, validation | All core modules                     |
| 5   | **Queue**         | `core/queue/`         | Bull-based queue manager — 7 primary queues, 7 DLQs, idempotency, retry w/ backoff                                                                         | Redis, Bull                          |
| 6   | **Events**        | `core/events/`        | In-process EventEmitter + Redis pub/sub event controller                                                                                                   | Redis                                |
| 7   | **Resilience**    | `core/resilience/`    | Tenant isolation guard, retry helpers, circuit breakers                                                                                                    | Logger                               |
| 8   | **Context**       | `core/context/`       | `AsyncLocalStorage`-based request context (tenant, actor, requestId)                                                                                       | Node.js `async_hooks`                |
| 9   | **Tenant**        | `core/tenant/`        | Tenant identity freeze, shadow telemetry                                                                                                                   | —                                    |
| 10  | **Observability** | `core/observability/` | Structured logger, health/readiness/metrics routes, go-live dashboard                                                                                      | Redis, Sequelize, QueueManager       |
| 11  | **Secrets**       | `core/secrets/`       | Boot guard, secret provider                                                                                                                                | env                                  |
| 12  | **Database**      | `core/database/`      | Schema name validation utility                                                                                                                             | —                                    |
| 13  | **HTTP**          | `core/http/`          | ApiError, ErrorHandler, HttpStatus, response helpers                                                                                                       | —                                    |
| 14  | **Errors**        | `core/errors/`        | Custom error classes                                                                                                                                       | —                                    |
| 15  | **Constants**     | `core/constants/`     | Role enums, system constants                                                                                                                               | —                                    |
| 16  | **Types**         | `core/types/`         | CustomRequest, API types, shared interfaces                                                                                                                | —                                    |
| 17  | **Utils**         | `core/utils/`         | Logger (Winston/pino), device utils, general helpers                                                                                                       | —                                    |
| 18  | **Telemetry**     | `core/telemetry/`     | Telemetry instrumentation                                                                                                                                  | —                                    |
| 19  | **Audit**         | `core/audit/`         | Data-change audit hooks (Sequelize global hooks)                                                                                                           | Sequelize                            |

### B.2 — Business Modules (`server/src/modules/`)

| #   | Module                     | Path                                   | Responsibilities                                                                                                                                                                      | Dependencies                                                           |
| --- | -------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | **Auth (Tenant)**          | `modules/auth/`                        | Registration, login, MFA (TOTP), session management, password management, token refresh, brute-force protection                                                                       | `bcrypt`, `speakeasy`/`otplib`, `qrcode`, core/auth, core/cache, Redis |
| 2   | **Tenant**                 | `modules/tenant/`                      | Tenant resolution middleware, tenant verification, auth route mounting, school route mounting                                                                                         | DB (Institution model), core/cache                                     |
| 3   | **Super-Admin**            | `modules/super-admin/`                 | Root admin auth, institution CRUD, tenant provisioning, plan management, role templates, access bundles, global holidays, system config, dashboard stats                              | DB (root schema models), core/rbac                                     |
| 4   | **School → Academic**      | `modules/school/academic/`             | Academic sessions, years, terms, classes, sections, subjects, curriculum (chapters/topics/lesson plans), timetables, teacher assignments, student enrollment, holidays, calendar sync | Calendarific API, Queue (ACADEMIC)                                     |
| 5   | **School → Attendance**    | `modules/school/attendance/`           | Student/teacher attendance marking (individual + batch), attendance summaries, leave applications, audit logs, settings, queue-based async processing                                 | Queue (ATTENDANCE), Events                                             |
| 6   | **School → Examination**   | `modules/school/examination/`          | Exam CRUD, exam schedules, marks entry, grade definitions, results publishing                                                                                                         | Events (EXAM_RESULTS_PUBLISHED)                                        |
| 7   | **School → Fees**          | `modules/school/fees/`                 | Fee categories, fee structures, student fee assignments, payments, discounts, receipts                                                                                                | Queue (FEES)                                                           |
| 8   | **School → Student**       | `modules/school/student/`              | Student profiles, admission, enrollment management                                                                                                                                    | DB student models                                                      |
| 9   | **School → Communication** | `modules/school/communication/`        | Notices/announcements, notifications, notification templates, parent portal access                                                                                                    | DB communication models                                                |
| 10  | **School → Dashboard**     | `modules/school/dashboard/`            | Aggregated dashboard stats for school portal                                                                                                                                          | Multiple service dependencies                                          |
| 11  | **School → User Mgmt**     | `modules/school/user-management/`      | Teacher, student, staff, parent user CRUD within a tenant                                                                                                                             | core/rbac                                                              |
| 12  | **School → Reports**       | `modules/school/reports/`              | Async report generation (academic, attendance, financial, exam results, student list, fee collection), report status tracking, download, history                                      | Queue (REPORTS), report generators                                     |
| 13  | **School → RBAC**          | `modules/school/routes/rbac.routes.ts` | Role/permission management UI, delegation, role config, role cloning                                                                                                                  | core/rbac                                                              |
| 14  | **Shared**                 | `modules/shared/`                      | Shared utilities across modules                                                                                                                                                       | —                                                                      |
| 15  | **University**             | `modules/university/`                  | Stub only — routes exist but are NOT mounted (commented out at `modules/tenant/routes/index.ts:48-51`)                                                                                | —                                                                      |

### B.3 — Client Applications (`client/apps/`)

| #   | App               | Path                       | Purpose                                                                                                       |
| --- | ----------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | **School Portal** | `client/apps/school/`      | Main tenant-facing SPA (React/Vite) — 4 tenant-module groups: `school`, `coaching`, `institute`, `university` |
| 2   | **Super Admin**   | `client/apps/super_admin/` | Root admin dashboard for platform management                                                                  |
| 3   | **Landing**       | `client/apps/landing/`     | Public marketing/landing page                                                                                 |

---

## C) ALL ENTRY POINTS

### C.1 — REST API Route Groups

#### Root Level (no auth)

| Mount Path             | Handler                         | File                                                             |
| ---------------------- | ------------------------------- | ---------------------------------------------------------------- |
| `GET /`                | Health liveness                 | `app.ts:227-229`                                                 |
| `GET /health`          | Health/readiness/metrics/queues | `core/observability/health.routes.ts` (guarded by `healthGuard`) |
| `GET /health/ready`    | Readiness probe                 | `core/observability/health.routes.ts:39`                         |
| `GET /health/metrics`  | Metrics snapshot                | `core/observability/health.routes.ts:103`                        |
| `GET /health/queues`   | Queue stats                     | `core/observability/health.routes.ts:120`                        |
| `GET /health/golive/*` | Go-live dashboard               | `core/observability/golive-dashboard.routes.ts`                  |

#### V2 School Auth (tenant middleware, no auth guard)

| Mount Path(s)                             | Handler                                  | File                                     |
| ----------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| `POST /api/v2/school/auth/login`          | Deprecated (410) — redirects to Keycloak | `modules/school/auth/auth.routes.ts:57`  |
| `GET /api/v2/school/auth/keycloak/config` | Keycloak config for frontend             | `modules/school/auth/auth.routes.ts:78`  |
| `POST /api/v2/school/auth/logout`         | Keycloak logout URL                      | `modules/school/auth/auth.routes.ts:97`  |
| `POST /api/v2/school/auth/refresh`        | Deprecated (410)                         | `modules/school/auth/auth.routes.ts:115` |
| Legacy alias: `/api/v2/api/school/auth/*` | Same as above                            | `app.ts:77,258-260`                      |

#### V2 School API (tenant + Keycloak/authGuard + TenantIsolationGuard)

Middleware chain: `tenantMiddleware → tenantContextShadow → keycloakOidcMiddleware|authGuard → TenantIsolationGuard → schoolRoutes`

Inside `schoolRoutes` (`modules/school/routes/index.ts`), additional: `authGuard → lazyRBACMiddleware → academicSessionMiddleware`

| Mount Path                           | Sub-Route                 | Handler                                                           | File |
| ------------------------------------ | ------------------------- | ----------------------------------------------------------------- | ---- |
| `/api/v2/school/navigation/*`        | Navigation menu           | `modules/school/routes/navigation.routes.ts`                      |
| `/api/v2/school/roles/*`             | RBAC management           | `modules/school/routes/rbac.routes.ts`                            |
| `/api/v2/school/permissions/*`       | Permission management     | `modules/school/routes/rbac.routes.ts`                            |
| `/api/v2/school/users/*`             | User management           | `modules/school/user-management/routes/user-management.routes.ts` |
| `/api/v2/school/academics/*`         | Academic CRUD             | `modules/school/academic/routes/`                                 |
| `/api/v2/school/students/*`          | Student operations        | `modules/school/student/routes/student.routes.ts`                 |
| `/api/v2/school/attendance/*`        | Attendance                | `modules/school/attendance/routes/`                               |
| `/api/v2/school/timetable`           | Placeholder (static JSON) | `modules/school/routes/index.ts:80-85`                            |
| `/api/v2/school/exams/*`             | Examination               | `modules/school/examination/routes/examination.routes.ts`         |
| `/api/v2/school/examinations/*`      | Alias for exams           | `modules/school/routes/index.ts:92`                               |
| `/api/v2/school/dashboard/*`         | Dashboard stats           | `modules/school/dashboard/routes/dashboard.routes.ts`             |
| `/api/v2/school/fees/*`              | Fee management            | `modules/school/fees/routes/fees.routes.ts`                       |
| `/api/v2/school/notices/*`           | Notices/announcements     | `modules/school/communication/routes/notices.routes.ts`           |
| `/api/v2/school/parent-portal/*`     | Parent portal             | `modules/school/communication/routes/parent-portal.routes.ts`     |
| `/api/v2/school/reports/*`           | Async reports             | `modules/school/reports/routes/reports.routes.ts`                 |
| Legacy alias: `/api/v2/api/school/*` | Same as above             | `app.ts:268`                                                      |

#### V1 Tenant Routes (tenant middleware + auth per-route)

| Mount Path                            | Sub-Route                      | Handler                                           | File |
| ------------------------------------- | ------------------------------ | ------------------------------------------------- | ---- |
| `/api/v1/tenant/verify/:subdomain`    | Public tenant verify           | `modules/tenant/controllers/tenant.controller.ts` |
| `/api/v1/tenant/auth/register`        | Registration                   | `modules/tenant/routes/auth.routes.ts:25`         |
| `/api/v1/tenant/auth/login`           | Login (password-based)         | `modules/tenant/routes/auth.routes.ts:28`         |
| `/api/v1/tenant/auth/refresh`         | Token refresh                  | `modules/tenant/routes/auth.routes.ts:31`         |
| `/api/v1/tenant/auth/forgot-password` | Password reset request         | `modules/tenant/routes/auth.routes.ts:34`         |
| `/api/v1/tenant/auth/reset-password`  | Password reset                 | `modules/tenant/routes/auth.routes.ts:42`         |
| `/api/v1/tenant/auth/mfa/verify`      | MFA verify                     | `modules/tenant/routes/auth.routes.ts:54`         |
| `/api/v1/tenant/auth/mfa/complete`    | MFA complete login             | `modules/tenant/routes/auth.routes.ts:63`         |
| `/api/v1/tenant/auth/me`              | Current user (protected)       | `modules/tenant/routes/auth.routes.ts:77`         |
| `/api/v1/tenant/auth/logout`          | Logout (protected)             | `modules/tenant/routes/auth.routes.ts:80`         |
| `/api/v1/tenant/auth/sessions`        | Active sessions (protected)    | `modules/tenant/routes/auth.routes.ts:86`         |
| `/api/v1/tenant/auth/change-password` | Change password (protected)    | `modules/tenant/routes/auth.routes.ts:95`         |
| `/api/v1/tenant/auth/mfa/setup`       | MFA setup (protected)          | `modules/tenant/routes/auth.routes.ts:101`        |
| `/api/v1/tenant/school/*`             | All school routes (same as v2) | `modules/tenant/routes/index.ts:43`               |

#### Root Admin / Super-Admin

| Mount Path(s)                         | Sub-Route                           | Handler                                                                  | File |
| ------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------ | ---- |
| `/api/v1/root/admin/`                 | Root admin sub-routes               | `modules/super-admin/routes/root-admin/index.ts`                         |
| `/api/v1/root/admin/auth/*`           | Root admin auth (login)             | `modules/super-admin/routes/root-admin/auth.routes.ts`                   |
| `/api/v1/root/admin/admins/*`         | Admin CRUD                          | `modules/super-admin/routes/root-admin/admin-management.routes.ts`       |
| `/api/v1/root/admin/plans/*`          | SaaS plan management                | `modules/super-admin/routes/root-admin/plan.routes.ts`                   |
| `/api/v1/root/admin/access-bundles/*` | Access bundle management            | `modules/super-admin/routes/root-admin/access-bundle.routes.ts`          |
| `/api/v1/root/admin/role-templates/*` | Role template management            | `modules/super-admin/routes/root-admin/role-template.routes.ts`          |
| `/api/v1/root/admin/holidays/*`       | Global holidays + Calendarific sync | `modules/super-admin/routes/root-admin/global-holiday.routes.ts`         |
| `/api/v1/root/admin/system-config/*`  | System config                       | `modules/super-admin/routes/root-admin/system-config.routes.ts`          |
| `/api/v1/root/admin/access-control/*` | Feature flags, modules              | `modules/super-admin/routes/root-admin/access-control.routes.ts`         |
| `/api/v1/root/admin/institutions/*`   | Institution CRUD                    | `modules/super-admin/routes/institutions/`                               |
| `/api/v1/root/admin/tenants`          | Tenant provisioning (POST)          | `app.ts:286-288`, `modules/super-admin/controllers/tenant.controller.ts` |
| `/api/v1/root/admin/dashboard/*`      | Platform dashboard                  | `modules/super-admin/routes/dashboard/`                                  |
| Legacy alias: `/v1/root/admin/*`      | Same as above                       | `app.ts:242`                                                             |

### C.2 — Background Jobs / Cron Tasks

| Job Name                                | Queue      | Schedule                               | File                                                                 |
| --------------------------------------- | ---------- | -------------------------------------- | -------------------------------------------------------------------- |
| `sync-external-holidays` (current year) | `ACADEMIC` | `0 0 1 */3 *` (quarterly)              | `modules/school/academic/services/common/system-queue.service.ts:49` |
| `sync-external-holidays` (next year)    | `ACADEMIC` | `0 0 15 */6 *` (biannually)            | `modules/school/academic/services/common/system-queue.service.ts:61` |
| Session cleanup                         | —          | Mentioned as cron candidate, not wired | `modules/auth/session.service.ts:228` (comment only)                 |

### C.3 — Queue Consumers / Workers

| Queue        | Worker                   | Job Types Processed                                                      | File                                                                    |
| ------------ | ------------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `ATTENDANCE` | `AttendanceQueueService` | `mark-attendance`, `batch-mark-attendance`, `generate-attendance-report` | `modules/school/attendance/services/attendance-queue.service.ts:90-132` |
| `ACADEMIC`   | `SystemQueueService`     | `sync-external-holidays`                                                 | `modules/school/academic/services/common/system-queue.service.ts:18-25` |
| `REPORTS`    | `ReportsProcessor`       | Report generation (all types)                                            | `modules/school/reports/processors/reports.processor.ts`                |

### C.4 — Event Listeners

| Event(s)                                    | Subscriber                                                   | File                                                                     |
| ------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `STUDENT_ENROLLED`, `STUDENT_WITHDRAWN`     | `AttendanceQueueService.setupEventSubscriptions()`           | `modules/school/attendance/services/attendance-queue.service.ts:404-425` |
| All event types defined in `EventType` enum | Local EventEmitter + Redis pub/sub (`events:global` channel) | `core/events/event.controller.ts:142`                                    |

### C.5 — Webhook Receivers

| Webhook                          | Status                            | Evidence                                                                                                           |
| -------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| No webhook receivers implemented | ⚠️ Only rate-limit config defined | `core/middleware/rate-limiter.middleware.ts:237-240` — `webhookRateLimiter` exported but never mounted in `app.ts` |

---

## D) EXTERNAL INTEGRATIONS

| #   | Service                        | Integration Method                                         | File(s)                                                                                                | Status                                               |
| --- | ------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| 1   | **Keycloak** (OIDC IdP)        | REST/JWKS — Token verification via JWKS endpoint per realm | `core/auth/keycloak.service.ts`, `core/middleware/keycloak.middleware.ts`, `config/keycloak.config.ts` | ✅ Active (conditionally via `KEYCLOAK_ENABLED` env) |
| 2   | **Calendarific** (Holiday API) | REST API — `https://calendarific.com/api/v2`               | `modules/school/academic/services/calendar/calendarific.service.ts:24`                                 | ✅ Active (optional — degrades if API key missing)   |
| 3   | **Redis**                      | SDK — `ioredis`                                            | `config/redis.ts`                                                                                      | ✅ Required — cache, queues, sessions, RBAC, pub/sub |
| 4   | **PostgreSQL**                 | ORM — Sequelize-typescript                                 | `database/sequelize.ts`                                                                                | ✅ Required                                          |
| 5   | **Payment Gateway**            | ❌ NONE                                                    | No Razorpay/Stripe SDK found in server                                                                 | 🔴 NOT IMPLEMENTED — fee payments have no gateway    |
| 6   | **SMS**                        | ❌ NONE                                                    | No Twilio/MSG91/SNS SDK found                                                                          | 🔴 NOT IMPLEMENTED                                   |
| 7   | **Email**                      | ❌ NONE                                                    | No SendGrid/Nodemailer/SES found in server                                                             | 🔴 NOT IMPLEMENTED — forgot-password returns 501     |
| 8   | **File Storage**               | ❌ NONE                                                    | No S3/Cloudinary/Multer found in server                                                                | 🔴 NOT IMPLEMENTED — report downloads may not work   |
| 9   | **Vercel**                     | External hosting (client)                                  | `client/vercel.json`                                                                                   | Frontend deployment target                           |
| 10  | **Render**                     | External hosting (server)                                  | CORS allowlist includes `*.onrender.com` at `app.ts:160-163`                                           | Backend deployment target                            |

---

## E) DATABASE SCHEMA OVERVIEW

### E.1 — Schema Topology

| Schema                        | Purpose                                               | Models                                                                                                                                            |
| ----------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public`                      | Platform-level entities (shared across all tenants)   | Institution, Plan, PlanModule, PlanPermission, Module, Feature, FeatureFlag, Permission, AccessBundle, RoleTemplate, GlobalHoliday, TenantMetrics |
| `root`                        | Root/super-admin data                                 | Admin, AdminRefreshToken, AdminSession                                                                                                            |
| `shared.core` (tenant-scoped) | Per-tenant core runtime data (users, roles, sessions) | User, Role, UserRole, RolePermission, UserPermission, AdminPermission, Session, RefreshToken, AuditLog, FailedLogin, TenantRoleConfig             |
| `tenant_*` (per tenant)       | Tenant-specific school data                           | All `school/*` models below                                                                                                                       |

### E.2 — All Models / Entities

#### Public Schema (12 models)

| Model            | Table              | Primary Key | Key Fields                                                                                                                                                                                    | File                                    |
| ---------------- | ------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `Institution`    | `institutions`     | `id` (UUID) | `code`, `name`, `type`, `slug`, `sub_domain`, `db_schema`, `status`, `plan_id`, `max_users`, `max_students`, `storage_quota_mb`, `subscription_expires_at`, `billing_status`, `trial_ends_at` | `models/public/Institution.model.ts`    |
| `Plan`           | `plans`            | UUID        | SaaS plan definitions                                                                                                                                                                         | `models/public/Plan.model.ts`           |
| `PlanModule`     | `plan_modules`     | —           | Plan-to-module mapping                                                                                                                                                                        | `models/public/PlanModule.model.ts`     |
| `PlanPermission` | `plan_permissions` | —           | Plan-to-permission mapping                                                                                                                                                                    | `models/public/PlanPermission.model.ts` |
| `Module`         | `modules`          | UUID        | Feature modules                                                                                                                                                                               | `models/public/Module.model.ts`         |
| `Feature`        | `features`         | UUID        | Feature definitions                                                                                                                                                                           | `models/public/Feature.model.ts`        |
| `FeatureFlag`    | `feature_flags`    | UUID        | Feature toggles                                                                                                                                                                               | `models/public/FeatureFlag.model.ts`    |
| `Permission`     | `permissions`      | UUID        | Global permission catalog                                                                                                                                                                     | `models/public/Permission.model.ts`     |
| `AccessBundle`   | `access_bundles`   | UUID        | Permission bundles                                                                                                                                                                            | `models/public/AccessBundle.model.ts`   |
| `RoleTemplate`   | `role_templates`   | UUID        | Default role templates                                                                                                                                                                        | `models/public/RoleTemplate.model.ts`   |
| `GlobalHoliday`  | `global_holidays`  | UUID        | Calendarific-synced holidays                                                                                                                                                                  | `models/public/GlobalHoliday.model.ts`  |
| `TenantMetrics`  | `tenant_metrics`   | UUID        | Per-tenant usage metrics                                                                                                                                                                      | `models/public/TenantMetrics.model.ts`  |

#### Root Schema (3 models)

| Model               | Table                  | Key Fields                                    | File                                     |
| ------------------- | ---------------------- | --------------------------------------------- | ---------------------------------------- |
| `Admin`             | `admins`               | `email`, `password_hash`, `role`, `is_active` | `models/root/Admin.model.ts`             |
| `AdminRefreshToken` | `admin_refresh_tokens` | `admin_id`, `token`                           | `models/root/AdminRefreshToken.model.ts` |
| `AdminSession`      | `admin_sessions`       | `admin_id`                                    | `models/root/AdminSession.model.ts`      |

#### Shared/Core (per-tenant — 11 models)

| Model              | Table                 | Key Fields                                                                                                                    | Multi-Tenancy Column                                          | File                                           |
| ------------------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------- |
| `User`             | `users`               | `email`, `phone`, `password_hash`, `institution_id`, `keycloak_id`, `user_type`, `auth_provider`, `mfa_enabled`, `mfa_secret` | `institution_id` (FK to Institution) + schema-level isolation | `models/shared/core/User.model.ts`             |
| `Role`             | `roles`               | `name`, `slug`, `is_system`, `institution_id`                                                                                 | `institution_id` + schema                                     | `models/shared/core/Role.model.ts`             |
| `UserRole`         | `user_roles`          | `user_id`, `role_id`                                                                                                          | Schema-level                                                  | `models/shared/core/UserRole.model.ts`         |
| `RolePermission`   | `role_permissions`    | `role_id`, `permission_id`                                                                                                    | Schema-level                                                  | `models/shared/core/RolePermission.model.ts`   |
| `UserPermission`   | `user_permissions`    | `user_id`, `permission_id`                                                                                                    | Schema-level                                                  | `models/shared/core/UserPermission.model.ts`   |
| `AdminPermission`  | `admin_permissions`   | —                                                                                                                             | Schema-level                                                  | `models/shared/core/AdminPermission.model.ts`  |
| `Session`          | `sessions`            | `user_id`, `token`, `device_id`, `ip_address`, `is_active`                                                                    | Schema-level                                                  | `models/shared/core/Session.model.ts`          |
| `RefreshToken`     | `refresh_tokens`      | `session_id`, `token_hash`, `token_family`                                                                                    | Schema-level                                                  | `models/shared/core/RefreshToken.model.ts`     |
| `AuditLog`         | `audit_logs`          | `user_id`, `action`, `entity_type`, `entity_id`                                                                               | Schema-level                                                  | `models/shared/core/AuditLog.model.ts`         |
| `FailedLogin`      | `failed_logins`       | `email`, `ip`, `attempt_count`                                                                                                | Schema-level                                                  | `models/shared/core/FailedLogin.model.ts`      |
| `TenantRoleConfig` | `tenant_role_configs` | `institution_id`, `role_type`, `default_role_id`                                                                              | `institution_id` + schema                                     | `models/shared/core/TenantRoleConfig.model.ts` |

#### School Domain (per-tenant — ~60 models)

**Academic Session & Calendar (7 models):**

| Model             | File                                                       |
| ----------------- | ---------------------------------------------------------- |
| `AcademicSession` | `models/school/academics/session/AcademicSession.model.ts` |
| `AcademicTerm`    | `models/school/academics/session/AcademicTerm.model.ts`    |
| `AcademicYear`    | `models/school/academics/session/AcademicYear.model.ts`    |
| `MasterHoliday`   | `models/school/academics/session/MasterHoliday.model.ts`   |
| `SessionHoliday`  | `models/school/academics/session/SessionHoliday.model.ts`  |
| `SessionLockLog`  | `models/school/academics/session/SessionLockLog.model.ts`  |
| `School` (config) | `models/school/config/School.model.ts`                     |

**Class & Section (2 models):**

| Model     | File                                             |
| --------- | ------------------------------------------------ |
| `Class`   | `models/school/academics/class/Class.model.ts`   |
| `Section` | `models/school/academics/class/Section.model.ts` |

**Curriculum (5 models):**

| Model          | File                                                       |
| -------------- | ---------------------------------------------------------- |
| `Subject`      | `models/school/academics/curriculum/Subject.model.ts`      |
| `ClassSubject` | `models/school/academics/curriculum/ClassSubject.model.ts` |
| `Chapter`      | `models/school/academics/curriculum/Chapter.model.ts`      |
| `Topic`        | `models/school/academics/curriculum/Topic.model.ts`        |
| `LessonPlan`   | `models/school/academics/curriculum/LessonPlan.model.ts`   |

**Staff (2 models):**

| Model     | File                                             |
| --------- | ------------------------------------------------ |
| `Teacher` | `models/school/academics/staff/Teacher.model.ts` |

**Assignments (2 models):**

| Model                      | File                                                                    |
| -------------------------- | ----------------------------------------------------------------------- |
| `ClassTeacherAssignment`   | `models/school/academics/assignments/ClassTeacherAssignment.model.ts`   |
| `SubjectTeacherAssignment` | `models/school/academics/assignments/SubjectTeacherAssignment.model.ts` |

**Students (7 models):**

| Model               | File                                                         |
| ------------------- | ------------------------------------------------------------ |
| `Student`           | `models/school/academics/student/Student.model.ts`           |
| `StudentEnrollment` | `models/school/academics/student/StudentEnrollment.model.ts` |
| `StudentDocument`   | `models/school/academics/student/StudentDocument.model.ts`   |
| `ParentProfile`     | `models/school/academics/student/ParentProfile.model.ts`     |
| `StudentParent`     | `models/school/academics/student/StudentParent.model.ts`     |
| `PromotionHistory`  | `models/school/academics/student/PromotionHistory.model.ts`  |

**Timetable (5 models):**

| Model                   | File                                                           |
| ----------------------- | -------------------------------------------------------------- |
| `Timetable` (academics) | `models/school/academics/timetable/Timetable.model.ts`         |
| `TimetableSlot`         | `models/school/academics/timetable/TimetableSlot.model.ts`     |
| `TimetableTemplate`     | `models/school/academics/timetable/TimetableTemplate.model.ts` |
| `Timetable` (school)    | `models/school/timetable/Timetable.model.ts`                   |
| `Period`                | `models/school/timetable/Period.model.ts`                      |

**Attendance (7 models):**

| Model                | File                                                   |
| -------------------- | ------------------------------------------------------ |
| `StudentAttendance`  | `models/school/attendance/StudentAttendance.model.ts`  |
| `TeacherAttendance`  | `models/school/attendance/TeacherAttendance.model.ts`  |
| `AttendanceSummary`  | `models/school/attendance/AttendanceSummary.model.ts`  |
| `AttendanceSettings` | `models/school/attendance/AttendanceSettings.model.ts` |
| `AttendanceAuditLog` | `models/school/attendance/AttendanceAuditLog.model.ts` |
| `LeaveApplication`   | `models/school/attendance/LeaveApplication.model.ts`   |

**Examination (4 models):**

| Model          | File                                              |
| -------------- | ------------------------------------------------- |
| `Exam`         | `models/school/examination/Exam.model.ts`         |
| `ExamSchedule` | `models/school/examination/ExamSchedule.model.ts` |
| `Mark`         | `models/school/examination/Mark.model.ts`         |
| `Grade`        | `models/school/examination/Grade.model.ts`        |

**Fees (5 models):**

| Model                  | File                                               |
| ---------------------- | -------------------------------------------------- |
| `FeeCategory`          | `models/school/fees/FeeCategory.model.ts`          |
| `FeeStructure`         | `models/school/fees/FeeStructure.model.ts`         |
| `StudentFeeAssignment` | `models/school/fees/StudentFeeAssignment.model.ts` |
| `FeePayment`           | `models/school/fees/FeePayment.model.ts`           |
| `FeeDiscount`          | `models/school/fees/FeeDiscount.model.ts`          |

**Communication (5 models):**

| Model                  | File                                                        |
| ---------------------- | ----------------------------------------------------------- |
| `Notice`               | `models/school/communication/Notice.model.ts`               |
| `Notification`         | `models/school/communication/Notification.model.ts`         |
| `NotificationTemplate` | `models/school/communication/NotificationTemplate.model.ts` |
| `ParentPortalAccess`   | `models/school/communication/ParentPortalAccess.model.ts`   |

**Reports (1 model):**

| Model       | File                                       |
| ----------- | ------------------------------------------ |
| `ReportJob` | `models/school/reports/ReportJob.model.ts` |

**Parents (2 models):**

| Model                  | File                                           |
| ---------------------- | ---------------------------------------------- |
| `Parent`               | `models/school/parents/Parent.model.ts`        |
| `StudentParent` (join) | `models/school/parents/StudentParent.model.ts` |

#### University Models (7 models — NOT ACTIVE)

| Model        | File                                               |
| ------------ | -------------------------------------------------- |
| `Department` | `models/university/structure/Department.model.ts`  |
| `Program`    | `models/university/structure/Program.model.ts`     |
| `Course`     | `models/university/structure/Course.model.ts`      |
| `Faculty`    | `models/university/structure/Faculty.model.ts`     |
| `Semester`   | `models/university/structure/Semester.model.ts`    |
| `Enrollment` | `models/university/enrollment/Enrollment.model.ts` |
| `GradeSheet` | `models/university/enrollment/GradeSheet.model.ts` |

### E.3 — Multi-Tenancy Column

**Primary isolation mechanism: PostgreSQL Schema-per-Tenant** (not a column-based filter).

- Each tenant gets a schema like `tenant_xyz`
- The `institution_id` column exists on `User` and `Role` models as a secondary FK, but it is **NOT the primary isolation mechanism**
- Primary filtering happens via Sequelize global hooks that inject `options.schema = tenantSchema` (see Section G)

---

## F) AUTHENTICATION FLOW

### F.1 — Dual Authentication Strategy

The system supports **two** concurrent auth strategies:

| Strategy                        | Where            | Token Source                                             | Validation                                                       |
| ------------------------------- | ---------------- | -------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| **Keycloak OIDC** (Primary)     | V2 routes        | Bearer JWT from Keycloak                                 | `keycloakOidcMiddleware` → JWKS signature verification per-realm | File: `core/middleware/keycloak.middleware.ts:73-170` |
| **Legacy JWT** (Password-based) | V1 tenant routes | Bearer JWT / `access_token` cookie / `auth_token` cookie | `authGuard` → `jwtUtil.verifyAccess()`                           | File: `core/middleware/authGuard.ts:66-221`           |

**Switch logic** at `app.ts:265-267`:

```typescript
const schoolV2AuthMiddleware =
  process.env.KEYCLOAK_ENABLED === "false" ? authGuard : keycloakOidcMiddleware;
```

### F.2 — Token Specifications

| Aspect         | Access Token                                                                                               | Refresh Token                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Type           | JWT                                                                                                        | JWT                                                                 |
| Claims         | `userId`, `tid`, `sessionId`, `tokenType: 'access'`, `mfa`, deprecated: `roles`, `permissions`, `tenantId` | `sessionId`, `tokenFamily`, `rotationCount`, `tokenType: 'refresh'` |
| Signing Secret | `JWT_ACCESS_SECRET` (falls back to `JWT_SECRET`)                                                           | `JWT_REFRESH_SECRET` (falls back to `JWT_SECRET`)                   |
| Expiry         | `env.jwt.accessExpiry`                                                                                     | `env.jwt.refreshExpiry`                                             |
| File           | `core/auth/jwt.ts:79-83`                                                                                   | `core/auth/jwt.ts:99-103`                                           |

### F.3 — Token Validation Pipeline (authGuard)

```
1. Extract token: Bearer header → access_token cookie → auth_token cookie
2. CSRF check: If token from cookie, validate X-CSRF-Token == csrf_token cookie (double-submit)
3. JWT verify: jwtUtil.verifyAccess(token) — enforces tokenType === 'access'
4. Reject is_main claim: If token has is_main → 401 (trust flag removed)
5. Session revocation: Redis lookup session:revoked:{sessionId}
6. Tenant validation: Token tid must be UUID + must match req.tenant.id
7. MFA enforcement: Admin roles require MFA verified (JWT claim or Redis session state)
8. Attach req.user: { userId, sessionId, roles, permissions, scopes, tenantId, institutionId }
```

**File:** `core/middleware/authGuard.ts:66-221`

### F.4 — Refresh Strategy

**Token Rotation with Family Tracking:**

- Refresh via `POST /api/v1/tenant/auth/refresh`
- `AuthService.refreshToken()` validates token family and rotation count
- Issues new access + refresh token pair
- Old refresh token is invalidated

**File:** `modules/auth/auth.service.ts:536-602`

### F.5 — Session Invalidation

| Mechanism                     | How                                                                                                           | File                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Single logout                 | `POST /api/v1/tenant/auth/logout` → marks session inactive in DB, sets `session:revoked:{sessionId}` in Redis | `modules/auth/auth.service.ts:608-616`               |
| Logout all                    | `POST /api/v1/tenant/auth/logout-all` → revokes all sessions except current                                   | `modules/auth/auth.service.ts:618-634`               |
| Revoke specific               | `DELETE /api/v1/tenant/auth/sessions/:sessionId` → revokes specific session                                   | `modules/tenant/routes/auth.routes.ts:89-92`         |
| Redis-backed revocation check | `authGuard` checks `session:revoked:{sessionId}` on every request                                             | `core/middleware/authGuard.ts:36-46`                 |
| Session cleanup (cron)        | **NOT IMPLEMENTED** — described as "meant to be run as a cron job"                                            | `modules/auth/session.service.ts:228` (comment only) |

### F.6 — Root Admin Auth (Separate)

- Root admin has its own `Admin` model in `root` schema
- Separate `AdminRefreshToken` and `AdminSession` models
- Protected by `rootAuthMiddleware`
- File: `modules/super-admin/routes/root-admin/auth.routes.ts`

---

## G) MULTI-TENANCY STRATEGY

### G.1 — Strategy: Schema-per-Tenant with Global Sequelize Hooks

**Isolation Level:** PostgreSQL Schema Isolation  
**Approach:** Every tenant gets a dedicated schema (`tenant_<slug>`). A **global Sequelize hook** intercepts all database operations and injects the tenant schema.

### G.2 — Tenant Resolution Flow

```
Request → tenantMiddleware → extract subdomain from Host/Origin
                           → lookup Institution by sub_domain (cached)
                           → freeze TenantIdentity { id, db_schema, slug, status }
                           → attach to req.tenant, req.tenantSchema, req.tenantId
                           → wrap in AsyncLocalStorage context
```

**File:** `modules/tenant/middlewares/tenant.middleware.ts:108-209`

### G.3 — The Actual Schema Injection Code

**File:** `server/src/database/sequelize.ts:50-76`

```typescript
import { getTenant } from "../core/context/requestContext";

const hooks = [
  "beforeFind",
  "beforeCount",
  "beforeCreate",
  "beforeUpdate",
  "beforeDestroy",
  "beforeBulkCreate",
  "beforeBulkUpdate",
  "beforeBulkDestroy",
] as const;

hooks.forEach((hook) => {
  sequelize.addHook(hook, (options: any) => {
    const tenant = getTenant();
    if (tenant) {
      const tenantSchema = validateSchemaName(tenant.db_schema);
      const model = options.model;
      // Check if model has specific schema defined (e.g. public)
      if (model) {
        const tableName = model.getTableName();
        if (typeof tableName === "object" && tableName.schema) {
          return; // Respect explicit schema (e.g., 'public')
        }
      }
      // Otherwise, switch to tenant schema
      if (!options.schema) {
        options.schema = tenantSchema;
        options.searchPath = tenantSchema;
      }
    }
  });
});
```

**Key behavior:**

1. Uses `AsyncLocalStorage` (`getTenant()`) to get active tenant context
2. Validates schema name against allowlist regex: `^[A-Za-z0-9_]{1,63}$` → `core/database/schema-name.util.ts:6`
3. Skips models with explicit schema (e.g., `Institution` on `public`)
4. Skips if `options.schema` already set (manual override)
5. Applies to ALL Sequelize operations (find, count, create, update, destroy, bulk\*)

### G.4 — Tenant Isolation Guard (Defense-in-Depth)

An additional middleware layer enforces tenant context at the HTTP level:

**File:** `core/resilience/tenant-isolation.guard.ts:50-140`

```typescript
static middleware(options: { requireTenant?: boolean } = {}) {
    return (req, res, next) => {
        // 1. Reject if no tenant schema in context
        // 2. Reject blocked schemas (public, root, pg_catalog, etc.)
        // 3. Block writes to public schema
    };
}
```

**Mounted at:** `app.ts:275` — `TenantIsolationGuard.middleware({ requireTenant: true })`

### G.5 — Blocked Schema List

**File:** `core/resilience/tenant-isolation.guard.ts:38-44`

```typescript
const BLOCKED_SCHEMAS = new Set([
  "public",
  "information_schema",
  "pg_catalog",
  "pg_toast",
  "root",
]);
```

### G.6 — Tenant Identity Immutability

After resolution, tenant identity is frozen:

**File:** `core/tenant/tenant-identity.ts:9-21`

```typescript
export const freezeTenantIdentity = (tenant) =>
  Object.freeze({
    id: tenant.id,
    db_schema: tenant.db_schema,
    slug: tenant.slug,
    status: tenant.status,
    plan_id: tenant.plan_id,
  });
```

### G.7 — Token-Tenant Binding

The `authGuard` validates that the JWT's `tid` matches `req.tenant.id`:

**File:** `core/middleware/authGuard.ts:162-171`

```typescript
if (tokenTid !== tenant.id) {
  return next(new ApiError(HttpStatus.UNAUTHORIZED, "TENANT_TOKEN_MISMATCH"));
}
```

### G.8 — Multi-Tenancy Layered Enforcement Summary

| Layer         | Mechanism                                                           | File                                              |
| ------------- | ------------------------------------------------------------------- | ------------------------------------------------- |
| 1. HTTP       | `tenantMiddleware` resolves tenant from subdomain                   | `modules/tenant/middlewares/tenant.middleware.ts` |
| 2. HTTP       | `TenantIsolationGuard.middleware()` rejects missing/blocked schemas | `core/resilience/tenant-isolation.guard.ts`       |
| 3. Auth       | `authGuard` validates JWT `tid` == `req.tenant.id`                  | `core/middleware/authGuard.ts:162-171`            |
| 4. Context    | `AsyncLocalStorage` propagates tenant through call stack            | `core/context/requestContext.ts`                  |
| 5. ORM        | Sequelize global hooks inject tenant schema on every query          | `database/sequelize.ts:50-76`                     |
| 6. Validation | Schema name validated against allowlist regex                       | `core/database/schema-name.util.ts:8-17`          |

---

## SYSTEM MAP SUMMARY

| Dimension                  | Value                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Architecture**           | Modular Monolith                                                                                                          |
| **Language**               | TypeScript (server + client)                                                                                              |
| **Server Framework**       | Express.js                                                                                                                |
| **Client Framework**       | React + Vite                                                                                                              |
| **ORM**                    | Sequelize-TypeScript                                                                                                      |
| **Database**               | PostgreSQL (schema-per-tenant)                                                                                            |
| **Cache/Queue**            | Redis + Bull                                                                                                              |
| **Auth Strategy**          | Dual — Keycloak OIDC (primary) + Legacy JWT (v1)                                                                          |
| **Multi-Tenancy**          | 6-layer enforcement (subdomain → isolation guard → JWT binding → AsyncLocalStorage → Sequelize hooks → schema validation) |
| **Total API Route Groups** | ~25 (across v1/v2)                                                                                                        |
| **Total DB Models**        | ~95                                                                                                                       |
| **Total Queue Workers**    | 3 (attendance, academic, reports)                                                                                         |
| **Cron Jobs**              | 2 (holiday sync)                                                                                                          |
| **Webhooks**               | 0 (rate limiter defined but unused)                                                                                       |
| **Missing Integrations**   | Payment gateway, SMS, Email, File Storage                                                                                 |

---

**PHASE 1 COMPLETE** — System Map generated.

---

# PHASE 2 — SECURITY AUDIT

**Audit Date:** 2026-02-23  
**Methodology:** Manual source code review of every route, middleware, controller, service, and model.

---

## AUTH & AUTHORIZATION

### [1] Every API endpoint has authentication guard

**PASS** — with **1 finding**.

All V2 school routes pass through the layered middleware chain:
`tenantMiddleware → keycloakOidcMiddleware|authGuard → TenantIsolationGuard → schoolRoutes`
with an additional `authGuard` inside `schoolRoutes` (`school/routes/index.ts:27`).

All V1 tenant auth routes have explicit `authGuard` on protected endpoints.

Fee routes use `router.use(authGuard)` at the top. Notices and parent-portal do the same.

┌──────────────────────────────────────────┐
│ ID : SEC-01 │
│ Severity : High │
│ Location : core/observability/ │
│ golive-dashboard.routes.ts │
│ lines 408-462 │
├──────────────────────────────────────────┤
│ WHAT : The go-live dashboard │
│ /health/golive/tenant/:schema │
│ endpoint interpolates the │
│ user-supplied `:schema` param │
│ directly into a SQL query │
│ string (line 425, 431-435) │
│ AND exposes tenant table │
│ counts, active user counts, │
│ and admin counts to anyone │
│ who can reach /health/\*. │
│ Health routes are behind │
│ healthGuard but that only │
│ checks INTERNAL_API_KEY — if │
│ the key is absent in dev, │
│ these endpoints are OPEN. │
│ RISK : SQL injection via crafted │
│ schema param │
│ (e.g. `"; DROP TABLE --`). │
│ Information leak revealing │
│ tenant data in production if │
│ INTERNAL_API_KEY is not set. │
│ WHY SEV : Direct SQL injection = High. │
│ In prod, healthGuard requires │
│ API key, but the SQL │
│ injection is dangerous in ALL │
│ environments. │
│ FIX : │
│ 1. Use parameterized query: │
│ `WHERE table_schema = :schema` │
│ (use replacements, not string │
│ interpolation) │
│ 2. Validate schema name with │
│ `validateSchemaName()` BEFORE │
│ using it in queries │
│ 3. Ensure INTERNAL_API_KEY is required │
│ in production env validation │
│ EFFORT : Hours (2-3h) │
└──────────────────────────────────────────┘

---

### [2] Every API endpoint has role/permission check

**PASS** — All routes have permission checks.

Evidence:

- **Fees:** Every route has `requirePermission('fees.*')` — `fees.routes.ts:36-68`
- **Students:** Every route has `studentRequirePermission(...)` — `student.routes.ts:63-206`
- **Attendance:** Every route has `attendanceRequirePermission(...)` — `attendance.routes.ts:55-235`
- **Examination:** Every route has `examsRequirePermission(...)` — `examination.routes.ts:43-136`
- **Academics:** Every route has `academicsRequirePermission(...)` — `academic.routes.ts:101-664`
- **Dashboard:** Uses `requirePermission('dashboard.view')` — `dashboard.routes.ts:22`
- **Notices:** Uses `requirePermission('notices.*')` — `notices.routes.ts:21-59`
- **Parent Portal:** Uses `requirePermission('parent.portal.view')` — `parent-portal.routes.ts:18-62`
- **User Management:** Uses `userMgmtRequirePermission(...)` — `user-management.routes.ts:64-244`
- **Navigation:** Uses `requirePermission('navigation.view')` — `navigation.routes.ts:28-66`
- **Reports:** Uses `requirePermission('reports.*')` — `reports.routes.ts`
- **Super Admin:** Protected by `rootAuthMiddleware` — `super-admin/routes/index.ts:40-44`

---

### [3] Privilege escalation — can teacher-role reach admin endpoints

┌──────────────────────────────────────────┐
│ ID : SEC-02 │
│ Severity : High │
│ Location : modules/school/middlewares/ │
│ permission.middleware.ts │
│ line 198 │
├──────────────────────────────────────────┤
│ WHAT : The legacy `requirePermission │
│            OrRole()` middleware has an │
│ implicit Admin bypass: │
│ `const hasRole = roles.some(  │
│            ...) || userRoleNames          │
│            .includes('admin');` │
│ This means ANY user with the │
│ 'Admin' role bypasses ALL │
│ role checks. While this is │
│ intentional for Admin, the │
│ real issue is the legacy │
│ `requirePermissionOrRole` │
│ grants access if EITHER │
│ permission OR role matches. │
│ The Admin bypass is broad — │
│ even if an Admin's Plan │
│ doesn't include a permission, │
│ they get through via the role │
│ fallback. │
│ RISK : Plan-scoped permission │
│ restrictions are bypassed │
│ for Admin users in legacy │
│ middleware. A Tenant Admin │
│ with a "Basic" plan could │
│ access features only in │
│ "Premium" plans. │
│ WHY SEV : Plan-based access controls │
│ are the monetization layer. │
│ Bypassing them = revenue loss │
│ + unauthorized feature access │
│ FIX : Complete migration to RBAC │
│ middleware (already in │
│ progress). RBAC middleware │
│ enforces plan-scoped │
│ permissions without implicit │
│ Admin bypass. Set all │
│ `RBAC_ENFORCE_*=true` flags. │
│ EFFORT : Days (2-3 days to test all │
│ modules and flip flags) │
└──────────────────────────────────────────┘

Note: The `requireRole()` middleware (line 104-157) correctly does NOT have an implicit Admin bypass (comment at line 131-135 confirms it was explicitly removed).

---

### [4] IDOR — can user A access user B's resource by changing an ID

┌──────────────────────────────────────────┐
│ ID : SEC-03 │
│ Severity : Medium │
│ Location : Multiple controllers │
│ (student, attendance, exam, │
│ fees, parent-portal) │
├──────────────────────────────────────────┤
│ WHAT : Most endpoints take entity │
│ IDs from URL params (e.g. │
│ `req.params.id`, │
│ `req.params.studentId`). The │
│ tenant schema isolation │
│ prevents cross-TENANT access, │
│ but WITHIN the same tenant │
│ there is no ownership check │
│ on most resources. For │
│ example, a Teacher with │
│ `students.view` can view ALL │
│ students in the school, not │
│ just those in their classes. │
│ The `addStudentDocument` and │
│ `getStudentDocuments` │
│ controllers DO call │
│ `assertStudentBelongsTo       │
│            Tenant()` (line 48-71), │
│ but this only checks inst_id, │
│ not teacher-student mapping. │
│ RISK : Any authenticated user with │
│ appropriate permission can │
│ view/modify any resource │
│ within their tenant by │
│ enumerating UUIDs. │
│ WHY SEV : Medium because tenant │
│ isolation prevents cross- │
│ tenant IDOR. Within-tenant │
│ IDOR is a business logic │
│ concern (e.g. parents seeing │
│ other students' data). Parent │
│ portal routes DO properly │
│ scope by parent-child link. │
│ FIX : Add row-level ownership │
│ checks in controllers for │
│ Teacher/Student/Parent roles. │
│ Teachers should only access │
│ students in their assigned │
│ classes. Parents should only │
│ see linked children. │
│ EFFORT : Sprint (needs service-layer │
│ refactoring per module) │
└──────────────────────────────────────────┘

---

## INPUT & DATA

### [5] Input validation on every entry point

**PASS** — with **1 finding**.

Evidence of comprehensive validation:

- **Students:** All routes use `validate()`, `validateQuery()`, `validateParams()` with Zod schemas — `student.routes.ts`
- **Fees:** All routes validated with typed Zod schemas — `fees.routes.ts:11-30`
- **Attendance:** All write routes use `validateRequest()` — `attendance.routes.ts`
- **Examination:** All routes use `validateRequest()` — `examination.routes.ts`
- **Notices:** All routes use `validateRequest()` — `notices.routes.ts`
- **Parent Portal:** All routes use `validateRequest()` — `parent-portal.routes.ts`
- **Auth:** All routes use `validate()` with Zod schemas — `auth.routes.ts`
- **User Management:** All routes use `validate()`, `validateParams()`, `validateQuery()` — `user-management.routes.ts`

┌──────────────────────────────────────────┐
│ ID : SEC-04 │
│ Severity : Low │
│ Location : modules/school/student/ │
│ routes/student.routes.ts │
│ line 82 (GET /search) │
├──────────────────────────────────────────┤
│ WHAT : The `GET /students/search` │
│ route has no `validateQuery` │
│ middleware. The controller │
│ does manual validation │
│ (line 243: checking │
│ `query.trim().length < 1`) │
│ but the query param `q` is │
│ not sanitized or schema- │
│ validated. │
│ RISK : Search input is passed to │
│ Sequelize `Op.iLike` which │
│ parameterizes it (safe from │
│ SQL injection), but │
│ unbounded search string │
│ lengths could cause │
│ performance issues. │
│ WHY SEV : Low — not exploitable for │
│ injection since Sequelize │
│ parameterizes, but missing │
│ schema validation is │
│ inconsistent with codebase. │
│ FIX : Add a Zod schema for search │
│ query: `z.object({ q:         │
│            z.string().min(1).max(100)})` │
│ EFFORT : Hours (1h) │
└──────────────────────────────────────────┘

---

### [6] Mass assignment — DTOs strictly typed, no raw body passthrough

**PASS** — Controllers explicitly destructure `req.body` fields into typed DTOs.

Evidence:

- `student.controller.ts:76-106` — Each field is individually extracted from `req.body`
- `student.controller.ts:210-215` — `updateStudent` passes `req.body` to service BUT the route has `validate(UpdateStudentSchema)` which strips unknown fields via Zod
- All write routes go through Zod validation middleware which enforces strict schemas

---

### [7] File upload — type check, size limit, tenant-isolated path

**N/A** — No file upload implementation exists.

- No `multer`, `busboy`, or multipart middleware found in the codebase
- `StudentDocument` model stores `fileUrl` as a text field (presumably for future external storage)

---

### [8] SQL injection — raw queries or string-concatenated query builders

┌──────────────────────────────────────────┐
│ ID : SEC-05 │
│ Severity : Critical │
│ Location : core/observability/ │
│ golive-dashboard.routes.ts │
│ lines 424-437 │
├──────────────────────────────────────────┤
│ WHAT : User-supplied `:schema` param │
│ is directly interpolated into │
│ SQL queries via template │
│ literals: │
│ `FROM "${schema}".users ...` │
│ `FROM "${schema}".user_roles ...` │
│ No `validateSchemaName()` or │
│ parameterized query used. │
│ RISK : SQL injection — an attacker │
│ with access to the health │
│ endpoint (if API key is not │
│ set) can inject arbitrary SQL │
│ via the schema parameter. │
│ WHY SEV : Critical — SQL injection is │
│ always Critical severity. │
│ Even though healthGuard │
│ requires API key in prod, │
│ defense-in-depth demands │
│ parameterization. │
│ FIX : Validate schema name FIRST: │
│ `typescript                          │
│   const safe = validateSchemaName(       │
│     req.params.schema);                  │
│   // Then use safe in queries            │
│   ` │
│ EFFORT : Hours (1-2h) │
└──────────────────────────────────────────┘

**Other raw queries — PASS:**

- `tenant-provisioning.service.ts` — All schema names validated via `validateSchemaName()` (lines 60, 128, 147, 207, 385, 461, 491, 543, 556)
- `transaction.helper.ts:55` — Uses `validateSchemaName()` before interpolation
- `sequelize.ts:110` — Uses `safeSchemaName` (validated)
- `accountant-role.seeder.ts` — Uses parameterized `replacements`
- `core-module.telemetry.ts:250` — Parametrized query

---

### [9] XSS — server-side rendering with unescaped user data

**PASS** — The server is a pure JSON API (no server-side HTML rendering). All responses use `res.json()`. No template engines (EJS, Handlebars, Pug) are used.

---

## TOKENS & SESSIONS

### [10] JWT algorithm enforced (no alg:none attack)

**PASS** — The `jsonwebtoken` library used (`core/auth/jwt.ts`) defaults to HS256 for `jwt.sign()` and its `jwt.verify()` implementation rejects `alg:none` by default when a secret is provided. No explicit `algorithms` option is set, but this is safe because:

- `jwt.verify(token, secret)` with a non-empty secret rejects `none` algorithm by default
- The env validation enforces `JWT_ACCESS_SECRET` is at least 32 characters and not a known weak secret
- Separate access/refresh secrets are mandated (line 244-247)

---

### [11] JWT expiry validated

**PASS** — JWT expiry is enforced:

- Tokens are signed with `expiresIn` option: `jwt.ts:81` (access), `jwt.ts:101` (refresh)
- `jwt.verify()` automatically rejects expired tokens
- Error handler maps `TokenExpiredError` to 401: `ErrorHandler.ts:80-81, 183`

---

### [12] Session invalidated on logout

**PASS** — Evidence:

- `AuthService.logout()` calls `SessionService.revokeSession()` → marks DB as inactive + sets `session:revoked:{id}` in Redis
- `authGuard` checks `isSessionRevoked()` on EVERY request (line 118-122)
- Redis-backed revocation means immediate invalidation, no wait for JWT expiry

---

### [13] Session invalidated on password change

**PASS** — Evidence at `auth.service.ts:700-740`:

```typescript
if (currentSessionId) {
  await SessionService.revokeAllUserSessions(
    userId,
    schemaName,
    "Password changed - all other sessions revoked",
    currentSessionId, // except current session
  );
}
```

All sessions except the current one are revoked on password change.

---

## SECRETS & LEAKS

### [14] Hardcoded secrets, API keys, credentials anywhere in code

**PASS** — No hardcoded secrets found in source code.

- Environment variables loaded via `dotenv` and validated by `env.validation.ts`
- The `KNOWN_WEAK_SECRETS` list (`env.validation.ts:72-82`) is for DETECTION, not usage
- No `.env` files found in the server directory
- No AWS keys (AKIA\*), Stripe keys (sk_live), or other API keys found in code
- Seed data uses deterministic UUIDs (`550e8400-...`) which are safe (not secrets)

---

### [15] Sensitive data in logs

┌──────────────────────────────────────────┐
│ ID : SEC-06 │
│ Severity : Medium │
│ Location : core/auth/keycloak.service.ts │
│ line 367 │
├──────────────────────────────────────────┤
│ WHAT : Log statement includes email │
│ in a password-related context:│
│ `logger.info('[KeycloakService]        │
│    Permanent password set for user:      │
│    ${email}');` │
│ Additionally, the RBAC pilot │
│ wrappers in several route │
│ files log permission keys │
│ on every request when RBAC is │
│ enabled: │
│ `logger.info('[RBAC Pilot] Using RBAC  │
│    enforcement for: ${permissions}')` │
│ (student.routes.ts:52, │
│ attendance.routes.ts:36) │
│ This floods logs with │
│ permission data. │
│ RISK : Email in password-change logs │
│ could expose PII. Permission │
│ logging is noisy but not a │
│ direct security risk. │
│ WHY SEV : Medium — PII in logs │
│ violates data protection │
│ requirements (GDPR, etc.) │
│ FIX : 1. Hash or mask emails in │
│ security-related logs │
│ 2. Change RBAC pilot logs │
│ from `info` to `debug` │
│ EFFORT : Hours (2h) │
└──────────────────────────────────────────┘

No passwords or tokens were found to be logged directly. The logger infrastructure properly avoids logging `password_hash`, and the auth service doesn't log token values.

---

### [16] Error responses leaking stack traces or DB internals to client

**PASS** — The error handler properly distinguishes dev vs prod:

```typescript
// ErrorHandler.ts:103-111 (dev)
sendErrorDev → includes stack trace
// ErrorHandler.ts:116-129 (prod)
sendErrorProd → only message for operational errors;
                generic "Something went wrong" for unknown errors
```

- Stack traces only shown when `env.nodeEnv === 'development'` (line 108, 169, 172)
- Sequelize errors mapped to generic messages: "A record with this field already exists" (line 92), "Referenced record not found" (line 97)
- Logger error output includes stack but this goes to server logs, not to client

---

## PROTECTION

### [17] CSRF protection present and correctly scoped

**PASS** — with **1 finding**.

CSRF is implemented using the double-submit cookie pattern:

- `auth.controller.ts:105` generates CSRF token, sets as JS-readable cookie
- `authGuard.ts:92-104` validates `X-CSRF-Token` header matches `csrf_token` cookie for cookie-based auth
- Bearer token paths are correctly exempt (CSRF not applicable)
- `auth.middleware.ts:212-220` has a timing-safe CSRF validation function

┌──────────────────────────────────────────┐
│ ID : SEC-07 │
│ Severity : Medium │
│ Location : core/middleware/authGuard.ts │
│ line 101-102 │
├──────────────────────────────────────────┤
│ WHAT : CSRF is only enforced IF the │
│ `csrf_token` cookie is │
│ present ("opt-in"): │
│ `if (csrfCookie && (!csrfHeader ||     │
│      csrfHeader !== csrfCookie))` │
│ If the cookie is absent │
│ (e.g., old login session │
│ before CSRF was added, or │
│ cookie cleared by browser), │
│ CSRF check is SKIPPED. │
│ RISK : An attacker could force- │
│ delete the csrf_token cookie │
│ (via a sibling subdomain or │
│ cookie overflow) and then │
│ perform CSRF against the │
│ httpOnly access_token cookie. │
│ WHY SEV : Medium — requires a specific │
│ attack vector (subdomain │
│ cookie manipulation) but the │
│ auth_token cookie is httpOnly │
│ so this is the primary CSRF │
│ defense. │
│ FIX : Make CSRF mandatory for all │
│ cookie-based auth: │
│ `typescript                          │
│   if (tokenFromCookie) {                 │
│     if (!csrfHeader || !csrfCookie ||    │
│         csrfHeader !== csrfCookie) {     │
│       return next(new ApiError(403,      │
│         'CSRF_TOKEN_REQUIRED'));          │
│     }                                    │
│   }                                      │
│   ` │
│ EFFORT : Hours (2-3h — needs frontend │
│ coordination) │
└──────────────────────────────────────────┘

---

### [18] Rate limiting on auth endpoints

**PASS** — Comprehensive rate limiting implemented:

- **Auth endpoints:** 5 req/15min per IP+email — `rate-limiter.middleware.ts:43-49`
- **Password reset:** 3 req/hour — `rate-limiter.middleware.ts:60-64`
- **Tenant registration:** 3 req/hour — `rate-limiter.middleware.ts:65-69`
- **Brute-force protection:** Additional layer via `AuthRateLimiterService` with progressive lockout (pre-auth check BEFORE DB hit) — `auth.service.ts:147-165`
- **User enumeration timing mitigation:** Dummy `bcrypt.compare()` even for non-existent users — `auth.service.ts:177-181`
- **Redis-backed store** for distributed rate limiting — `rate-limiter.middleware.ts:105-117`
- **Bulk operations:** User management has a dedicated rate limiter: 10 req/min — `user-management.routes.ts:43-52`

---

### [19] Rate limiting on bulk operations

**PASS** — Evidence:

- User management bulk operations: Explicit `rateLimit({ windowMs: 60000, max: 10 })` — `user-management.routes.ts:43-52`
- Student bulk admit: Protected by general API rate limiter + permission check
- Attendance bulk mark: Protected by API rate limiter
- Pagination caps enforced server-side: `Math.min(limit, 100)` — `student.controller.ts:132`

---

### [20] Webhook inputs verified with signature validation

**N/A** — No webhook receivers are implemented. The `webhookRateLimiter` is defined but never mounted. No incoming webhooks to validate.

---

## ADDITIONAL FINDINGS (from code review)

┌──────────────────────────────────────────┐
│ ID : SEC-08 │
│ Severity : Low │
│ Location : core/middleware/authGuard.ts │
│ line 101 │
│ (CSRF string comparison) │
├──────────────────────────────────────────┤
│ WHAT : The CSRF token comparison │
│ in `authGuard.ts` uses `!==` │
│ (line 102) which is not │
│ timing-safe. However, the │
│ `auth.middleware.ts:215` has a │
│ timing-safe version using │
│ `crypto.timingSafeEqual()`. │
│ The timing-safe version is │
│ NOT the one called by the │
│ main authGuard. │
│ RISK : Theoretical timing attack to │
│ guess CSRF tokens byte-by- │
│ byte via response time. │
│ WHY SEV : Low — CSRF tokens are │
│ sufficiently random (crypto. │
│ randomBytes(32)) making │
│ timing attacks impractical │
│ over network. │
│ FIX : Use `crypto.timingSafeEqual` │
│ in authGuard's CSRF check. │
│ EFFORT : Hours (30min) │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ID : SEC-09 │
│ Severity : Low │
│ Location : golive-dashboard.routes.ts │
│ lines 358-363 │
├──────────────────────────────────────────┤
│ WHAT : The golive dashboard error │
│ handler returns `err.message` │
│ directly in the JSON response:│
│ `res.status(500).json({ message:       │
│     err.message })` │
│ Similarly at line 460. │
│ RISK : Database/Redis error messages │
│ may contain internal │
│ connection strings, schema │
│ names, or table structures │
│ that could help an attacker │
│ map the system. │
│ WHY SEV : Low — behind healthGuard │
│ (API key protected in prod) │
│ FIX : Return generic error message │
│ in production mode. │
│ EFFORT : Hours (30min) │
└──────────────────────────────────────────┘

---

## SUMMARY

### PASS Count

| Category             | Checks | PASS   | Findings                   |
| -------------------- | ------ | ------ | -------------------------- |
| Auth & Authorization | 4      | 2      | 3 (SEC-01, SEC-02, SEC-03) |
| Input & Data         | 5      | 4      | 2 (SEC-04, SEC-05)         |
| Tokens & Sessions    | 4      | 4      | 0                          |
| Secrets & Leaks      | 3      | 2      | 1 (SEC-06)                 |
| Protection           | 4      | 3      | 1 (SEC-07)                 |
| **Total**            | **20** | **15** | **7 + 2 additional = 9**   |

---

### Findings by Severity

#### 🔴 Critical (1)

| ID     | Title                             | Location                             | Effort |
| ------ | --------------------------------- | ------------------------------------ | ------ |
| SEC-05 | SQL Injection in golive dashboard | `golive-dashboard.routes.ts:424-437` | Hours  |

#### 🟠 High (2)

| ID     | Title                                        | Location                             | Effort |
| ------ | -------------------------------------------- | ------------------------------------ | ------ |
| SEC-01 | SQL injection + info leak in health endpoint | `golive-dashboard.routes.ts:408-462` | Hours  |
| SEC-02 | Legacy admin bypass in permission middleware | `permission.middleware.ts:198`       | Days   |

#### 🟡 Medium (3)

| ID     | Title                                   | Location                  | Effort |
| ------ | --------------------------------------- | ------------------------- | ------ |
| SEC-03 | Within-tenant IDOR (no ownership check) | Multiple controllers      | Sprint |
| SEC-06 | PII (email) in security-related logs    | `keycloak.service.ts:367` | Hours  |
| SEC-07 | CSRF check is opt-in (not mandatory)    | `authGuard.ts:101-102`    | Hours  |

#### 🟢 Low (3)

| ID     | Title                                         | Location                         | Effort |
| ------ | --------------------------------------------- | -------------------------------- | ------ |
| SEC-04 | Missing validation on student search query    | `student.routes.ts:82`           | Hours  |
| SEC-08 | Non-timing-safe CSRF comparison in authGuard  | `authGuard.ts:102`               | Hours  |
| SEC-09 | Error message leaking in golive error handler | `golive-dashboard.routes.ts:358` | Hours  |

---

### SEC Scorecard: **7/10**

**Justification:**

| Strength                                                                           | Score Impact |
| ---------------------------------------------------------------------------------- | ------------ |
| ✅ 6-layer tenant isolation (strongest finding)                                    | +2           |
| ✅ JWT: separate access/refresh secrets, weak secret detection, expiry enforcement | +1           |
| ✅ Session revocation on logout + password change                                  | +1           |
| ✅ Comprehensive rate limiting with Redis-backed stores                            | +1           |
| ✅ CSRF implementation (double-submit cookie pattern)                              | +0.5         |
| ✅ Input validation with Zod on nearly all endpoints                               | +1           |
| ✅ No hardcoded secrets, strong env validation                                     | +1           |
| ✅ Production error handler hides stack traces                                     | +0.5         |
| ✅ Brute-force protection with progressive lockout                                 | +1           |
| 🔴 -1 for Critical SQL injection in health dashboard                               | -1           |
| 🟠 -0.5 for legacy Admin bypass still active                                       | -0.5         |
| 🟡 -0.5 for opt-in CSRF and within-tenant IDOR                                     | -0.5         |
| **Total**                                                                          | **7/10**     |

**Bottom line:** The security posture is **above average for an ERP in this stage**. The token/session layer is enterprise-grade. The critical SQL injection is isolated to a diagnostic endpoint (behind API key in prod), but must be fixed before production. The primary risk is the legacy permission middleware's Admin bypass, which should be resolved by completing the RBAC migration.

---

**PHASE 2 COMPLETE** — Security Audit generated.

---

# PHASE 3 — MULTI-TENANCY INTEGRITY AUDIT

**Audit Date:** 2026-02-23  
**Methodology:** Exhaustive manual review of every repository, service, queue worker, cron job, cache key, raw SQL query, file storage path, and super-admin bypass code path.  
**Risk Threshold:** Any operation that can read or write tenant data without explicit tenant scoping is a **CRITICAL** finding.

---

## STEP A — CORE ISOLATION MECHANISM

### Architecture: Schema-Per-Tenant

The system implements a **PostgreSQL schema-per-tenant** isolation model. Each tenant (school/institution) has its own dedicated database schema (e.g., `school_abc_123`). All tenant-specific tables exist within these schemas, while shared/platform data lives in the `public` or `root` schema.

### Defense-in-Depth Layers

| Layer  | Component                        | File                                        | Mechanism                                                                                                                                   |
| ------ | -------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **L1** | **RequestContext**               | `core/context/requestContext.ts`            | Stores tenant info in `AsyncLocalStorage`; `getTenant()` throws if missing                                                                  |
| **L2** | **TenantIsolationGuard**         | `core/resilience/tenant-isolation.guard.ts` | Middleware rejects requests without tenant context; blocks `public`, `root`, `information_schema` schemas; prevents writes to public schema |
| **L3** | **TenantIdentity**               | `core/tenant/tenant-identity.ts`            | `freezeTenantIdentity()` makes tenant context immutable via `Object.freeze()`                                                               |
| **L4** | **Schema Validation**            | `core/database/schema-name.util.ts`         | `validateSchemaName()` enforces regex `/^[a-z][a-z0-9_]{0,62}$/` and max 63 chars                                                           |
| **L5** | **Repository Constructor Guard** | Various repositories                        | Fail-closed: throws `TENANT_SCOPE_VIOLATION` if `tenant.db_schema` is missing                                                               |
| **L6** | **TenantShadowTelemetry**        | `core/tenant/tenant-shadow.telemetry.ts`    | Logs critical events: `MISSING_TENANT_CONTEXT`, `SCHEMA_VIOLATION`, `REPO_UNSCOPED_WRITE`                                                   |

### ✅ VERDICT: Core isolation mechanism is **enterprise-grade** with 6 independent defense layers.

---

## STEP B — QUERY SCOPING VERIFICATION

Every repository, service, and raw SQL query was inspected for proper tenant schema scoping.

### B.1 — ORM-Based Repositories (Model.schema() Pattern)

| #   | Repository                   | File                                                                | Scoping Method                                                                                                                                  | Verdict     |
| --- | ---------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | `StudentRepository`          | `school/student/repositories/student.repository.ts`                 | Constructor requires `TenantIdentity`, throws `TENANT_SCOPE_VIOLATION` if missing. All queries use `Student.schema(this.getSchema())`           | ✅ **PASS** |
| 2   | `EnrollmentRepository`       | `school/student/repositories/enrollment.repository.ts`              | Constructor requires `TenantIdentity`, throws `TENANT_SCOPE_VIOLATION` if missing. All queries use `StudentEnrollment.schema(this.getSchema())` | ✅ **PASS** |
| 3   | `FeeRepository`              | `school/fees/repositories/fee.repository.ts`                        | Private `categoryModel(schema)` helper. All queries use `FeeCategory.schema(schema)`, `FeeStructure.schema(schema)`, etc.                       | ✅ **PASS** |
| 4   | `AttendanceRepository`       | `school/attendance/repositories/attendance.repository.ts`           | Constructor accepts `schemaName`. All queries use `StudentAttendance.schema(this.schemaName)`                                                   | ✅ **PASS** |
| 5   | `AcademicRepository`         | `school/academic/repositories/academic.repository.ts`               | All methods accept `schema` parameter. Queries use `AcademicYear.schema(schema)`, `Class.schema(schema)`, etc.                                  | ✅ **PASS** |
| 6   | `ExaminationRepository`      | `school/examination/repositories/examination.repository.ts`         | All methods accept `tenant` with `db_schema`. Queries use `Exam.schema(tenant.db_schema)`, `Mark.schema(tenant.db_schema)`, etc.                | ✅ **PASS** |
| 7   | `ReportRepository`           | `school/reports/repositories/report.repository.ts`                  | Top-level `reportModel(schema)` helper. All methods accept `schema` parameter.                                                                  | ✅ **PASS** |
| 8   | `UserRepository`             | `school/user-management/repositories/user.repository.ts`            | Constructor requires `TenantContext`. All queries use `User.schema(this.tenant.db_schema)`                                                      | ✅ **PASS** |
| 9   | `UserRoleRepository`         | `school/user-management/repositories/user-role.repository.ts`       | Constructor requires `TenantContext`. All queries use `UserRole.schema(this.tenant.db_schema)`                                                  | ✅ **PASS** |
| 10  | `UserPermissionRepository`   | `school/user-management/repositories/user-permission.repository.ts` | Constructor requires `TenantContext`. All queries use `UserPermission.schema(this.tenant.db_schema)`                                            | ✅ **PASS** |
| 11  | `RoleRepository`             | `school/repositories/role.repository.ts`                            | Constructor requires `TenantContext`. All queries use `Role.schema(this.tenant.db_schema)`                                                      | ✅ **PASS** |
| 12  | `TeacherRepository`          | `school/repositories/teacher.repository.ts`                         | Constructor requires `TenantContext`. All queries use `Teacher.schema(this.tenant.db_schema)`                                                   | ✅ **PASS** |
| 13  | `TenantRoleConfigRepository` | `school/repositories/tenant-role-config.repository.ts`              | Constructor requires `TenantContext`. All queries use `TenantRoleConfig.schema(this.tenant.db_schema)`                                          | ✅ **PASS** |
| 14  | `RolePermissionCache`        | `core/cache/role-permission.cache.ts`                               | `findRoleByName(schemaName)` uses `Role.schema(schemaName)`. `loadRolePermissionsFromDB(schemaName)` uses `RolePermission.schema(schemaName)`   | ✅ **PASS** |

### B.2 — Public Schema Repositories (Intentionally Unscoped)

These repositories operate on shared/platform data in the `public` schema. They are **correctly** unscoped.

| #   | Repository              | File                                            | Data Type                          | Verdict                             |
| --- | ----------------------- | ----------------------------------------------- | ---------------------------------- | ----------------------------------- |
| 1   | `InstitutionRepository` | `school/repositories/institution.repository.ts` | Platform-level institution records | ✅ **CORRECT** — Public schema data |
| 2   | `PermissionRepository`  | `school/repositories/permission.repository.ts`  | Global permission catalog          | ✅ **CORRECT** — Public schema data |
| 3   | `PlanRepository`        | `school/repositories/plan.repository.ts`        | Subscription plans                 | ✅ **CORRECT** — Public schema data |

### B.3 — Report Generators

All 7 report generators were verified to use `context.schema` for every model query:

| Generator                          | Models Scoped                                                                          | Verdict     |
| ---------------------------------- | -------------------------------------------------------------------------------------- | ----------- |
| `student-list.generator.ts`        | `StudentEnrollment`, `Student`, `User`, `Class`, `Section`                             | ✅ **PASS** |
| `attendance-register.generator.ts` | `StudentAttendance`, `Student`, `User`, `Class`, `Section`                             | ✅ **PASS** |
| `fee-collection.generator.ts`      | `FeePayment`, `Student`, `User`                                                        | ✅ **PASS** |
| `fee-dues.generator.ts`            | `StudentFeeAssignment`, `Student`, `User`, `FeeStructure`, `FeeCategory`, `FeePayment` | ✅ **PASS** |
| `exam-results.generator.ts`        | `Mark`, `Student`, `User`, `ExamSchedule`, `Exam`, `Subject`, `Class`, `Section`       | ✅ **PASS** |
| `exam-toppers.generator.ts`        | `Mark`, `Student`, `User`, `ExamSchedule`, `Exam`                                      | ✅ **PASS** |
| `student-strength.generator.ts`    | `StudentEnrollment`, `Student`, `Class`, `Section`                                     | ✅ **PASS** |

### B.4 — Raw SQL Queries (Dashboard Service)

| #   | Service                              | File                                          | Scoping Method                                                                                 | Verdict                        |
| --- | ------------------------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------ |
| 1   | `DashboardService.getStudentCount`   | `dashboard/services/dashboard.service.ts:149` | Uses `validateSchemaName(schema)` then interpolates into raw SQL: `"${safeSchema}"."students"` | ✅ **PASS** — Schema validated |
| 2   | `DashboardService.getTeacherCount`   | `dashboard/services/dashboard.service.ts:158` | Same pattern with `validateSchemaName(schema)`                                                 | ✅ **PASS** — Schema validated |
| 3   | `DashboardService.getClassCount`     | `dashboard/services/dashboard.service.ts:170` | Same pattern                                                                                   | ✅ **PASS**                    |
| 4   | `DashboardService.getAttendanceRate` | `dashboard/services/dashboard.service.ts:179` | Same pattern, with `replacements: { today }` for date parameter                                | ✅ **PASS**                    |
| 5   | `DashboardService.getRecentActivity` | `dashboard/services/dashboard.service.ts:198` | Same pattern                                                                                   | ✅ **PASS**                    |

### B.5 — Raw SQL Queries (GoLive Dashboard) — ⚠️ FINDING

| #   | Route                               | File                             | Scoping                                                                                                                      | Verdict                     |
| --- | ----------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 1   | `GET /health/golive/tenant/:schema` | `golive-dashboard.routes.ts:408` | **Schema from URL parameter**, NOT validated via `validateSchemaName()`. Directly interpolated into SQL: `"${schema}".users` | 🔴 **FAIL** — See **MT-01** |

---

## STEP C — BACKGROUND JOBS & CRON TASKS

### C.1 — Queue Workers

| #   | Service                                                 | Queue Type   | Tenant Scoping                                                                                                                                                                                                 | Verdict                     |
| --- | ------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 1   | `AttendanceQueueService` — `mark-attendance`            | `ATTENDANCE` | Job data contains `tenantId` and `institutionId`. **However:** `processMarkAttendance` does NOT use the tenantId to scope any database query — it simulates the operation.                                     | 🟠 **WARN** — See **MT-02** |
| 2   | `AttendanceQueueService` — `process-batch-attendance`   | `ATTENDANCE` | Job data contains `tenantId`. `processAttendanceChunk` calls `sequelize.transaction()` but does NOT scope the transaction to any tenant schema. **All DB operations are simulated.**                           | 🟠 **WARN** — See **MT-02** |
| 3   | `AttendanceQueueService` — `generate-attendance-report` | `ATTENDANCE` | Job data contains `tenantId`. Report generation is **simulated** — no real DB queries.                                                                                                                         | 🟠 **WARN** — See **MT-02** |
| 4   | `ReportsProcessor` — `generate-report`                  | `REPORTS`    | Calls `reportsService.processReportJob(job.data)` which receives `{ jobId, schema }`. `processReportJob` calls `validateSchemaName(payload.schema)` before any DB access. All generators use `context.schema`. | ✅ **PASS**                 |

### C.2 — Cron Jobs

| #   | Service                                         | Schedule                     | Tenant Scoping                                                                                                                               | Verdict                      |
| --- | ----------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1   | `SystemQueueService` — `sync-external-holidays` | `0 0 1 */3 *` (quarterly)    | Calls `calendarificService.syncToGlobal(country, year)`. This syncs holidays to a **global/public** table — intentionally not tenant-scoped. | ✅ **CORRECT** — Global data |
| 2   | `SystemQueueService` — next year sync           | `0 0 15 */6 *` (semi-annual) | Same as above — global holiday sync                                                                                                          | ✅ **CORRECT**               |

---

## STEP D — SUPPORTING SYSTEMS

### D.1 — Cache Key Isolation

**Cache key analysis from `core/cache/cache.keys.ts`:**

| Key Pattern                                      | Example                                             | Tenant-Scoped?                | Verdict                          |
| ------------------------------------------------ | --------------------------------------------------- | ----------------------------- | -------------------------------- |
| `tenant:{tenantId}:role:{roleName}:permissions`  | `tenant:school_abc:role:student:permissions`        | ✅ Yes                        | **PASS**                         |
| `plan:{planId}:role:{roleSlug}:permissions`      | `plan:basic:role:teacher:permissions`               | Shared by design (plan-level) | **CORRECT**                      |
| `tenant:{tenantId}:dashboard:{type}:date:{date}` | `tenant:school_abc:dashboard:stats:date:2026-02-23` | ✅ Yes                        | **PASS**                         |
| `tenant:{tenantId}:role-config:{userType}`       | `tenant:school_abc:role-config:student`             | ✅ Yes                        | **PASS**                         |
| `tenant:{tenantId}:user:{userId}:roles`          | `tenant:school_abc:user:uuid:roles`                 | ✅ Yes                        | **PASS**                         |
| `security:login:attempts:{ip}`                   | `security:login:attempts:1.2.3.4`                   | IP-scoped (not tenant)        | **CORRECT** — Security is per-IP |
| `security:lockout:{userId}`                      | `security:lockout:uuid`                             | User-scoped (not tenant)      | 🟡 **NOTE** — See **MT-03**      |

### D.2 — File Storage

**Report file storage (`reports/services/reports.service.ts`):**

| Aspect              | Implementation                                                | Verdict                                      |
| ------------------- | ------------------------------------------------------------- | -------------------------------------------- |
| File path           | `server/tmp/reports/{reportType}_{jobId}.xlsx`                | 🟡 **WARN** — See **MT-04**                  |
| Inline storage      | `inline://` or `inline+enc://` prefix in DB `file_url` column | ✅ **PASS** — Stored in tenant-scoped DB row |
| File encryption     | AES-256-GCM with `REPORT_ENCRYPTION_KEY` env var              | ✅ **PASS**                                  |
| File access control | `ensureOwnedJob()` checks `institution_id` AND `requested_by` | ✅ **PASS**                                  |

### D.3 — Super-Admin Bypass

| #   | Bypass Location  | File                                | Mechanism                                                                                                                            | Risk       | Verdict                     |
| --- | ---------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------- | --------------------------- |
| 1   | `tenantGuard`    | `core/middleware/tenantGuard.ts:14` | `SUPER_ADMIN` role or `is_main` flag → bypasses tenant check entirely. Allows setting `institutionId` via `x-institution-id` header. | **MEDIUM** | 🟠 **WARN** — See **MT-05** |
| 2   | `authorize()`    | `core/middleware/authorize.ts:45`   | `SUPER_ADMIN`, `is_main`, or `admin:full` scope → bypasses **all** permission checks                                                 | **MEDIUM** | 🟠 **WARN** — See **MT-06** |
| 3   | `authorizeAny()` | `core/middleware/authorize.ts:99`   | Same bypass conditions                                                                                                               | **MEDIUM** | Same as above               |
| 4   | `authorizeAll()` | `core/middleware/authorize.ts:151`  | Same bypass conditions                                                                                                               | **MEDIUM** | Same as above               |

### D.4 — Search Filters

No full-text search engine (Elasticsearch, MeiliSearch, etc.) is integrated. All search is done via ORM queries on tenant-scoped models. **No cross-tenant search risk.**

✅ **PASS**

---

## FINDINGS

---

### MT-01: SQL Injection via Unvalidated Schema in GoLive Dashboard (CRITICAL)

| Field        | Value                                                              |
| ------------ | ------------------------------------------------------------------ |
| **ID**       | MT-01                                                              |
| **Severity** | 🔴 CRITICAL                                                        |
| **File**     | `server/src/core/observability/golive-dashboard.routes.ts:408-437` |
| **Category** | Cross-Tenant Data Access / SQL Injection                           |

**Description:**  
The `/health/golive/tenant/:schema` endpoint takes a schema name from the URL parameter and directly interpolates it into raw SQL queries **without** calling `validateSchemaName()`:

```sql
SELECT COUNT(*) AS cnt FROM "${schema}".users WHERE is_active = true
```

An attacker who can access this endpoint could:

1. Read user counts from **any** tenant schema
2. Inject SQL via a crafted schema name (e.g., `"; DROP TABLE users; --`)

**Evidence:**

```typescript
// Line 424-427: No validateSchemaName() call
const [userRow] = (await sequelize.query(
  `SELECT COUNT(*) AS cnt FROM "${schema}".users WHERE is_active = true`,
  { type: "SELECT" },
)) as any[];
```

Compare with the Dashboard Service (correct approach):

```typescript
// dashboard.service.ts:149 — CORRECT
const safeSchema = validateSchemaName(schema);
const result = await this.runQuery<{ count: string }>(
    `SELECT COUNT(*) as count FROM "${safeSchema}"."students"...`
```

**Remediation:**

```typescript
import { validateSchemaName } from "../../core/database/schema-name.util";
const safeSchema = validateSchemaName(schema);
```

**Note:** This was also flagged in Phase 2 as SEC-05. The multi-tenancy impact makes this doubly critical — it allows cross-tenant data enumeration.

---

### MT-02: Attendance Queue Workers Use Simulated DB Operations (MEDIUM)

| Field        | Value                                                                               |
| ------------ | ----------------------------------------------------------------------------------- |
| **ID**       | MT-02                                                                               |
| **Severity** | 🟠 MEDIUM                                                                           |
| **File**     | `server/src/modules/school/attendance/services/attendance-queue.service.ts:219-258` |
| **Category** | Incomplete Implementation / Future Risk                                             |

**Description:**  
All three attendance queue workers (`mark-attendance`, `process-batch-attendance`, `generate-attendance-report`) contain `tenantId` in their job data but **never use it to scope database operations**. The current implementations are stubs with comments like:

```typescript
// Simulate database operation
// In a real implementation, you would import and use your Attendance model here
const attendanceId = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

The `processAttendanceChunk` method uses `sequelize.transaction()` without scoping to the tenant schema, meaning when real DB operations are added, they will execute against the **default schema** unless explicitly scoped.

**Risk:** When these stubs are replaced with real implementations, developers may forget to add schema scoping, leading to cross-tenant writes.

**Remediation:**

- Add `// TODO: TENANT_SCOPE_REQUIRED` annotations on every stub
- Create a base worker class that enforces schema scoping
- Add integration tests that verify tenant isolation in queue workers

---

### MT-03: Account Lockout Cache Key Not Tenant-Scoped (LOW)

| Field        | Value                                    |
| ------------ | ---------------------------------------- |
| **ID**       | MT-03                                    |
| **Severity** | 🟡 LOW                                   |
| **File**     | `server/src/core/cache/cache.keys.ts:66` |
| **Category** | Cache Isolation                          |

**Description:**  
The `ACCOUNT_LOCKOUT` cache key uses only `userId`:

```typescript
ACCOUNT_LOCKOUT: (userId: string) => `security:lockout:${userId}`,
```

If the same user exists in multiple tenant schemas with the same UUID (theoretically possible with UUIDv4 collision or if user IDs are shared across schemas), a lockout in one tenant would affect the same user in another tenant.

**Risk:** Extremely low in practice (UUIDs should be unique), but violates the principle of tenant isolation in cache keys.

**Remediation:**

```typescript
ACCOUNT_LOCKOUT: (tenantId: string, userId: string) => `security:lockout:${tenantId}:${userId}`,
```

---

### MT-04: Report File Storage Not Tenant-Partitioned (LOW)

| Field        | Value                                                                  |
| ------------ | ---------------------------------------------------------------------- |
| **ID**       | MT-04                                                                  |
| **Severity** | 🟡 LOW                                                                 |
| **File**     | `server/src/modules/school/reports/services/reports.service.ts:31,377` |
| **Category** | File Storage Isolation                                                 |

**Description:**  
When reports fall back to filesystem storage (exceeding inline size limit), all tenant reports are written to the same directory:

```typescript
const REPORT_TEMP_DIR = path.join(process.cwd(), "server", "tmp", "reports");
const filePath = path.join(REPORT_TEMP_DIR, fileName);
```

File names include `jobId` (UUID), so accidental collision is unlikely. However, this violates defense-in-depth by not partitioning files per tenant.

**Mitigating factor:** Access control is enforced at the service level via `ensureOwnedJob()` which checks both `institution_id` and `requested_by`. The file path is stored in the tenant-scoped database row and never exposed to the client.

**Remediation:**

```typescript
const REPORT_TEMP_DIR = path.join(
  process.cwd(),
  "server",
  "tmp",
  "reports",
  safeSchema,
);
```

---

### MT-05: Super-Admin Tenant Bypass via x-institution-id Header (MEDIUM)

| Field        | Value                                             |
| ------------ | ------------------------------------------------- |
| **ID**       | MT-05                                             |
| **Severity** | 🟠 MEDIUM                                         |
| **File**     | `server/src/core/middleware/tenantGuard.ts:14-20` |
| **Category** | Super-Admin Bypass / Cross-Tenant Access          |

**Description:**  
Super Admins (`SUPER_ADMIN` role or `is_main` flag) bypass the tenant guard entirely and can set their operating tenant via the `x-institution-id` HTTP header:

```typescript
if (user?.roles?.includes("SUPER_ADMIN") || user?.is_main) {
  const tenantHeader = req.headers["x-institution-id"] as string;
  if (tenantHeader) {
    req.institutionId = tenantHeader;
  }
  return next();
}
```

**Issues:**

1. The `x-institution-id` header value is **not validated** — no check that the institution exists or that the schema is valid
2. If no header is provided, `req.institutionId` remains `undefined`, and downstream repositories may fail in unpredictable ways
3. No audit trail of which tenant the super-admin is accessing
4. The `admin:full` scope in `authorize.ts` provides another bypass vector

**Remediation:**

- Validate `x-institution-id` against the institutions table
- Log all super-admin cross-tenant accesses via `TenantShadowTelemetry`
- Consider requiring an explicit "impersonation" workflow with audit logging

---

### MT-06: Triple Authorization Bypass in Legacy Middleware (MEDIUM)

| Field        | Value                                                          |
| ------------ | -------------------------------------------------------------- |
| **ID**       | MT-06                                                          |
| **Severity** | 🟠 MEDIUM                                                      |
| **File**     | `server/src/core/middleware/authorize.ts:44-47,98-101,150-153` |
| **Category** | Permission Bypass                                              |

**Description:**  
Three separate bypass conditions exist in the authorization middleware, any one of which grants full access:

```typescript
if (
  user.roles?.includes("SUPER_ADMIN") ||
  user.is_main ||
  user.scopes?.includes("admin:full")
) {
  return next(); // Bypasses ALL permission checks
}
```

This pattern repeats in `authorize()`, `authorizeAny()`, and `authorizeAll()`. The `admin:full` scope is particularly concerning — if a JWT token is minted with this scope (e.g., through a token theft or misconfigured OAuth client), it grants god-mode access across all tenants.

**Mitigating factor:** The file is marked `@deprecated` with guidance to use RBAC middleware instead. However, it is still actively imported and used.

**Remediation:**

- Remove `admin:full` scope bypass (replace with explicit per-resource permissions)
- Audit all code paths that mint tokens with `admin:full` scope
- Complete migration to RBAC middleware and remove this file

---

### MT-07: InstitutionRepository Has No Schema Scoping (By Design — Verify) (INFO)

| Field        | Value                                                              |
| ------------ | ------------------------------------------------------------------ |
| **ID**       | MT-07                                                              |
| **Severity** | ℹ️ INFO                                                            |
| **File**     | `server/src/modules/school/repositories/institution.repository.ts` |
| **Category** | Intentional Public Schema Access                                   |

**Description:**  
The `InstitutionRepository` performs all operations on the `Institution` model without any schema scoping. This is **by design** — institutions are platform-level entities stored in the `public` schema. However, the `list()` method returns **all** institutions without any access control:

```typescript
async list(options: { status?: string; type?: string } = {}) {
    return Institution.findAll({ where, order: [['created_at', 'DESC']] });
}
```

This is safe only if the routes that call `list()` are restricted to super-admin users. Verify that no tenant-level route exposes this method.

---

## SUMMARY MATRIX

### Query Scoping Coverage

| Category                       | Total Checked |  PASS  | FAIL  | Notes                          |
| ------------------------------ | :-----------: | :----: | :---: | ------------------------------ |
| **Tenant-Scoped Repositories** |      14       |   14   |   0   | 100% coverage                  |
| **Public Schema Repositories** |       3       |   3    |   0   | Correctly unscoped             |
| **Report Generators**          |       7       |   7    |   0   | All use `context.schema`       |
| **Raw SQL (Dashboard)**        |       5       |   5    |   0   | All use `validateSchemaName()` |
| **Raw SQL (GoLive)**           |       3       |   0    |   3   | ❌ No validation (MT-01)       |
| **Queue Workers**              |       4       |   1    |   0   | 3 are stubs (MT-02)            |
| **Cron Jobs**                  |       2       |   2    |   0   | Global data by design          |
| **TOTAL**                      |    **38**     | **32** | **3** | 3 failures, 3 stubs            |

### Findings by Severity

| Severity    | Count | IDs                 |
| ----------- | :---: | ------------------- |
| 🔴 CRITICAL |   1   | MT-01               |
| 🟠 MEDIUM   |   3   | MT-02, MT-05, MT-06 |
| 🟡 LOW      |   2   | MT-03, MT-04        |
| ℹ️ INFO     |   1   | MT-07               |
| **TOTAL**   | **7** |                     |

### Quick-Fix Priority

| Priority | ID    | Title                                          | Effort  |
| -------- | ----- | ---------------------------------------------- | ------- |
| 🔴 P0    | MT-01 | Add `validateSchemaName()` to golive dashboard | Minutes |
| 🟠 P1    | MT-05 | Validate `x-institution-id` header             | Hours   |
| 🟠 P1    | MT-06 | Remove `admin:full` scope bypass               | Hours   |
| 🟠 P2    | MT-02 | Add schema scoping to attendance queue workers | Days    |
| 🟡 P3    | MT-04 | Partition report storage by tenant             | Hours   |
| 🟡 P3    | MT-03 | Add tenant prefix to lockout cache key         | Minutes |

---

## MULTI-TENANCY SCORE: **8/10**

### Justification

| Factor                                                                | Assessment                      | Score Impact |
| --------------------------------------------------------------------- | ------------------------------- | :----------: |
| ✅ Schema-per-tenant architecture with 6 defense layers               | Industry-leading pattern        |      +3      |
| ✅ 14/14 tenant-scoped repositories use `Model.schema()` consistently | 100% ORM coverage               |      +2      |
| ✅ 7/7 report generators properly schema-scoped                       | Complete generator coverage     |      +1      |
| ✅ Dashboard raw SQL uses `validateSchemaName()` sanitization         | Parameterized + validated       |     +0.5     |
| ✅ Cache keys are tenant-prefixed for all tenant data                 | Proper isolation                |     +0.5     |
| ✅ Fail-closed constructors with telemetry alerts                     | Defense in depth                |      +1      |
| ✅ `TenantIsolationGuard` blocks dangerous schemas                    | Active protection               |     +0.5     |
| ✅ Report downloads enforce `institution_id + requested_by` ownership | Access control at service level |     +0.5     |
| 🔴 MT-01: GoLive dashboard SQL injection (cross-tenant read + SQLi)   | Critical vulnerability          |      -1      |
| 🟠 MT-05/06: Super-admin bypass lacks validation and audit logging    | Overprivileged access           |     -0.5     |
| 🟠 MT-02: Queue worker stubs lack schema scoping template             | Future risk                     |     -0.5     |
| **TOTAL**                                                             |                                 |   **8/10**   |

### Bottom Line

The multi-tenancy implementation is **strong and well-architected**. The schema-per-tenant model with 6 independent defense layers is a best-practice approach. Every active ORM repository (14/14) and every report generator (7/7) correctly scopes queries to the tenant schema. The fail-closed pattern in repository constructors and the `TenantShadowTelemetry` logging provide excellent defense-in-depth.

The primary risk is the **unvalidated raw SQL in the GoLive dashboard** (MT-01), which is a cross-cutting issue also identified in the security audit. The super-admin bypass paths (MT-05, MT-06) follow a common enterprise pattern but would benefit from validation, audit logging, and removal of the overprivileged `admin:full` scope. The attendance queue worker stubs (MT-02) represent a future risk that should be addressed before those features go live.

**Recommendation:** Fix MT-01 immediately (minutes of work). Plan MT-05/MT-06 for the next security sprint. Add tenant-scoping templates to MT-02 before implementing real queue operations.

---

**PHASE 3 COMPLETE** — Multi-Tenancy Integrity Audit generated.

---

# PHASE 4 — DOMAIN LOGIC AUDIT

**Audit Date:** 2026-02-23  
**Methodology:** Manual review of every service, repository, model, controller, validator, and route in each domain module. Evidence gathered from source code, DB model constraints, and middleware chains.  
**Finding Format:** `{DOMAIN_PREFIX}-{NN}` — e.g., `FEE-01`, `STU-01`

---

## FEE & FINANCE

### [FEE-1] Payment creation is idempotent

**Status:** 🟠 **PARTIAL**

**Evidence:**

- `collectFee()` in `fee.service.ts:580-656` wraps payment in `sequelize.transaction()` ✅
- Before creating a payment, it checks `findAssignment()` to verify the fee is assigned ✅
- It checks `getStudentDues()` to verify outstanding balance ✅
- `generateReceiptNumber()` uses `lock: tx.LOCK.UPDATE` (pessimistic locking) for receipt sequence ✅
- **However:** There is **no idempotency key** on the `CollectFeeInput` interface or `FeeCollectSchema` validator
- **No dedup check** — if two requests come in simultaneously with identical data, both could succeed within the same transaction window

**Finding:** **FEE-01** — No idempotency key on payment creation  
**Severity:** 🟠 MEDIUM  
**Remediation:** Add `idempotency_key` field to `FeePayment` model and check before creating.

---

### [FEE-2] Duplicate payment prevention

**Status:** 🟡 **WEAK**

**Evidence:**

- The `collectFee()` method checks `getStudentDues()` which calculates remaining balance, and rejects if `outstanding <= 0` ✅
- It also checks that `amountPaid <= outstanding + lateFee` ✅
- **But:** There is no unique constraint on `(student_id, fee_structure_id, academic_year_id, payment_date)` or similar composite key
- The existing unique index is only on `(institution_id, receipt_number)` — prevents duplicate receipts but not duplicate payment records
- Two concurrent requests could both pass the outstanding check and create two payments

**Finding:** **FEE-02** — Race condition in concurrent payment creation  
**Severity:** 🟠 MEDIUM  
**Remediation:** Add `SELECT ... FOR UPDATE` on the student's fee assignment row before payment, or add a unique partial index.

---

### [FEE-3] Fee transaction audit trail

**Status:** 🟡 **PARTIAL**

**Evidence:**

- `FeePayment.model.ts` has `collected_by` (UUID FK to User) ✅ and `timestamps: true` ✅
- `paranoid: true` is set on `FeePayment`, `FeeStructure`, `FeeDiscount`, `FeeCategory` ✅ (soft delete)
- `data-change-audit.hooks.ts` registers audit hooks on `FeePayment`, `FeeCategory`, `FeeStructure`, `FeeDiscount`, `StudentFeeAssignment` ✅
- **Missing:** No `modified_by` field on any fee model — only `collected_by` on payments
- **Missing:** No `voided_by` field on FeePayment — the `status` enum includes `REFUNDED` but no actor column records who performed the refund

**Finding:** **FEE-03** — Missing `modified_by` and `voided_by` audit columns on fee models  
**Severity:** 🟡 LOW  
**Note:** The Sequelize audit hooks partially compensate by logging changes to `AuditLog`, but the fee model itself doesn't carry the actor.

---

### [FEE-4] Refund flow atomicity

**Status:** ❌ **MISSING**

**Evidence:**

- `FeePaymentStatus` enum includes `REFUNDED` but there is **no refund method** in `FeeService` or `FeeRepository`
- No `refundPayment()`, `voidPayment()`, or equivalent exists
- The only way to mark a payment as refunded is via raw DB update or a future implementation

**Finding:** **FEE-04** — Refund flow not implemented  
**Severity:** 🟠 MEDIUM  
**Remediation:** Implement `refundPayment()` wrapped in a DB transaction with audit trail.

---

### [FEE-5] Concurrent fee creation race condition

**Status:** 🟡 **PARTIALLY PROTECTED**

**Evidence:**

- `createStructure()` checks for duplicate via `findStructureByComposite()` before creating ✅
- `assignFeesToStudent()` checks `findAssignment()` before assigning (skips if exists) ✅
- `bulkAssignFeeToClass()` uses `ignoreDuplicates: true` on `bulkCreate()` ✅
- `StudentFeeAssignment` has a composite unique index: `(student_id, fee_structure_id, academic_year_id)` ✅
- **However:** The check-then-create in `collectFee()` is not protected by a row lock on the assignment

**Finding:** **FEE-05** — Fee collection lacks row-level locking  
**Severity:** 🟡 LOW (unique index on assignments provides some protection)

---

### [FEE-6] Financial reports have enforced row limits

**Status:** ✅ **PASS**

**Evidence:**

- All report generators use `context.chunkSize` (set to `CHUNK_SIZE = 5000` in `reports.service.ts:33`) ✅
- They fetch data in paginated chunks via `limit: context.chunkSize, offset` ✅
- Reports are queued asynchronously and don't block the API thread ✅

---

### [FEE-7] Fee records cannot be hard-deleted

**Status:** 🟡 **MOSTLY PASS**

**Evidence:**

- `FeePayment`, `FeeStructure`, `FeeDiscount`, `FeeCategory` all have `paranoid: true` ✅ (soft delete via `deleted_at`)
- **However:** `StudentFeeAssignment` does **NOT** have `paranoid: true` — calling `destroy()` would hard-delete
- `FeeRepository.deleteCategory()` and `deleteStructure()` call `instance.destroy()` — which triggers soft-delete on paranoid models ✅

**Finding:** **FEE-06** — `StudentFeeAssignment` model lacks `paranoid: true` — hard-deletes possible  
**Severity:** 🟠 MEDIUM  
**Remediation:** Add `paranoid: true` to `StudentFeeAssignment` model.

---

## STUDENT MANAGEMENT

### [STU-1] Student PII not appearing in application logs

**Status:** ✅ **PASS**

**Evidence:**

- Searched all `logger.info`, `logger.debug`, `logger.warn` calls for student PII fields (`aadhar`, `phone`, `email`, `address`, `parent`, `guardian`, `blood`, `caste`, `religion`, `medical`)
- **Zero** matches found for PII leaking into logs
- Logger calls reference only UUIDs: `user ${user.id}`, `student ${attendanceData.studentId}`
- `data-change-audit.hooks.ts` redacts sensitive fields: `isSensitiveKey()` checks for `password`, `secret`, `token`, `hash`, `backup_code` ✅
- **Note:** PII fields like `aadhar_number` are **not** in the audit redaction list, so they will appear in data-change audit logs

**Finding:** **STU-01** — PII fields (`aadhar_number`, `phone`, `email`) not redacted in data-change audit logs  
**Severity:** 🟡 LOW  
**Remediation:** Add PII field names to `isSensitiveKey()` in `data-change-audit.hooks.ts`.

---

### [STU-2] Student records locked after archive/graduation

**Status:** ❌ **MISSING**

**Evidence:**

- `Student.model.ts` has `is_active` boolean and `paranoid: true` (soft delete) ✅
- `StudentEnrollment` has `status` enum (`ACTIVE`, `INACTIVE`, etc.)
- **However:** There is no `is_locked`, `is_archived`, or `is_graduated` flag on Student
- No guard prevents editing a deactivated or graduated student's personal data
- The `deleteExam()` method performs soft-delete (`is_active: false`), but student records have no equivalent immutability guard

**Finding:** **STU-02** — No record immutability after graduation/archival  
**Severity:** 🟠 MEDIUM  
**Remediation:** Add `is_locked` column to Student model and guard all update operations.

---

### [STU-3] Student search/filter — cross-tenant leak risk

**Status:** ✅ **PASS**

**Evidence:**

- All student queries go through `StudentRepository` which enforces `Student.schema(this.getSchema())` ✅
- Search is done via ORM queries on tenant-scoped models — no Elasticsearch or shared search index
- No cross-tenant search endpoint exists

---

### [STU-4] Guardian data handled with same protection as student data

**Status:** 🟡 **PARTIAL**

**Evidence:**

- `ParentProfile` model exists and is linked via `StudentParentLink`
- Parent data lives in the same tenant schema, scoped identically to student data ✅
- **However:** `ParentProfile` is **not** in the `modelsToAudit` array in `data-change-audit.hooks.ts`
- Parent data changes are not tracked in the audit log

**Finding:** **STU-03** — `ParentProfile` model not registered for data-change audit hooks  
**Severity:** 🟡 LOW

---

## ATTENDANCE

### [ATT-1] Bulk attendance uses batch insert

**Status:** ✅ **PASS**

**Evidence:**

- `bulkMarkAttendance()` in `student-attendance.service.ts:320-454` prepares all records in a `recordsToCreate` array, then calls:
  ```typescript
  await StudentAttendance.schema(this.schemaName).bulkCreate(recordsToCreate, {
      transaction,
      updateOnDuplicate: ['status', 'countValue', 'remark', ...]
  });
  ```
- Single `bulkCreate()` call with `updateOnDuplicate` — not N individual inserts ✅

---

### [ATT-2] Race condition — two staff submit attendance for same class

**Status:** ✅ **PASS**

**Evidence:**

- `bulkMarkAttendance()` uses `updateOnDuplicate` — if two submissions arrive concurrently, the second one **upserts** instead of creating duplicates ✅
- `markAttendance()` (single student) checks `findByStudentAndDate()` first and throws `ATTENDANCE_DUPLICATE` if found ✅
- The DB would also reject duplicates based on the attendance model constraints

---

### [ATT-3] Attendance records auditable

**Status:** ✅ **PASS**

**Evidence:**

- Every attendance operation logs to `AttendanceAuditLog` via `auditRepo.log()`:
  - `markAttendance()` → `AuditAction.CREATE` with `changedById: userId` ✅
  - `bulkMarkAttendance()` → `AuditAction.CREATE` with `markedCount` and `changedById` ✅
  - `updateAttendance()` → `AuditAction.UPDATE` with `previousValues` and `newValues` ✅
  - `deleteAttendance()` → `AuditAction.DELETE` with `previousValues` and `reason` ✅
  - `lockAttendance()` → `AuditAction.LOCK` ✅
- Fields tracked: `markedById`, `markedAt`, `lastModifiedById`, `lastModifiedAt` ✅
- `getAuditHistory()` method available for reviewing changes ✅

---

## EXAM & RESULTS

### [EXM-1] Result data versioned or has change history

**Status:** 🟡 **PARTIAL**

**Evidence:**

- `Mark` model has `paranoid: true` (soft delete) ✅
- `Mark` model is registered in `data-change-audit.hooks.ts` — changes are logged to `AuditLog` ✅
- `enterMarks()` uses `updateOnDuplicate: ['marks_obtained', 'grade', 'is_absent', 'remarks', 'updatedAt']` — overwriting previous values
- **However:** There is no dedicated versioning table for marks — updates overwrite in-place, and the audit log captures previous values indirectly

**Finding:** **EXM-01** — No dedicated marks version history table; relies on generic audit log  
**Severity:** 🟡 LOW  
**Note:** The generic `AuditLog` captures before/after values via Sequelize hooks, providing forensic capability.

---

### [EXM-2] Result publication is atomic

**Status:** 🟡 **PARTIAL**

**Evidence:**

- `enterMarks()` wraps all marks in a single `sequelize.transaction()` with manual `commit()`/`rollback()` ✅
- `updateExamStatus()` updates only the exam record — no multi-table atomicity concern
- **However:** There is no distinction between "entering marks" and "publishing results" — exams move from `DRAFT` → `COMPLETED` via `updateExamStatus()`, which is a simple status update with no check that all marks have been entered

**Finding:** **EXM-02** — No validation that all students have marks before exam status can be set to `COMPLETED`  
**Severity:** 🟡 LOW  
**Remediation:** Add pre-completion validation: all students in scheduled classes must have marks entered.

---

### [EXM-3] Teacher cannot edit another teacher's exam (horizontal auth check)

**Status:** ❌ **FAIL**

**Evidence:**

- `enterMarks()` validates that `student_id`s belong to `institution_id` ✅
- `enterMarks()` validates the `exam_schedule_id` exists ✅
- **However:** There is **no check** that the requesting teacher is assigned to the exam's subject or class
- Any user with `exams.marks.manage` permission can enter marks for **any** exam schedule in the tenant
- The routes use `examsRequirePermission(['exams.marks.manage'], ['Admin', 'Teacher'])` — all teachers can enter marks for all exams

**Finding:** **EXM-03** — No horizontal authorization check on marks entry — any teacher can enter marks for any subject/class  
**Severity:** 🔴 CRITICAL  
**Remediation:** Check that `userId` is the assigned teacher for the exam schedule's subject before allowing marks entry.

---

### [EXM-4] Marks validated — cannot be negative or exceed max marks

**Status:** 🟡 **PARTIAL**

**Evidence:**

- **Validator layer (`EnterMarksSchema`):**

  ```typescript
  marks_obtained: z.coerce.number().min(0).max(1000).optional();
  ```

  - Floor: 0 ✅ (no negative)
  - Ceiling: 1000 (generic hardcoded max, NOT per-schedule `max_marks`) 🟡

- **Service layer (`enterMarks()`):**
  - `calculateGrade()` uses `schedule.max_marks || 100` for percentage calculation, but does **not** validate that `marks_obtained <= max_marks`
  - A student could have `marks_obtained: 150` in a `max_marks: 100` exam — the grade calculation would produce >100% but no error is thrown
- **DB layer (`Mark.model.ts`):**

  ```typescript
  @Column(DataType.DECIMAL(5, 2))
  marks_obtained?: number;
  ```

  - `DECIMAL(5,2)` allows range -999.99 to 999.99
  - **No CHECK constraint** on the column

**Finding:** **EXM-04** — Marks not validated against per-exam `max_marks`; no DB CHECK constraint  
**Severity:** 🟠 MEDIUM  
**Remediation:** In `enterMarks()`, check `marks_obtained <= schedule.max_marks`. Add `CHECK (marks_obtained >= 0)` to DB.

---

## RBAC & USER MANAGEMENT

### [RBAC-1] RBAC enforced at API middleware layer

**Status:** ✅ **PASS**

**Evidence:**

- All route files use RBAC middleware at the router level:
  - `student.routes.ts`: `rbacRequirePermission()` ✅
  - `user-management.routes.ts`: `rbacRequirePermission()` ✅
  - `academic.routes.ts`: `rbacRequirePermission()` ✅
  - `examination.routes.ts`: `rbacRequirePermission()` (via pilot toggle, falls back to legacy) ✅
  - `attendance.routes.ts`: `rbacRequirePermission()` ✅
  - `rbac.routes.ts`: `rbacRequirePermission()` ✅
  - `super-admin/routes`: `rbacRequirePermission()` ✅
- Enforcement is server-side at the Express middleware layer, not frontend-only ✅

---

### [RBAC-2] Role changes logged

**Status:** ✅ **PASS**

**Evidence:**

- `AuditLogService.logRoleAssigned()` logs: `ROLE_ASSIGNED` with `adminUserId`, `targetUserId`, `roleId`, `roleName` ✅
- `AuditActions` includes: `ROLE_ASSIGNED`, `ROLE_REMOVED`, `PERMISSIONS_ASSIGNED`, `PERMISSIONS_REVOKED` ✅
- `RoleAssignmentService` logs role migrations and default role changes:
  ```
  logger.info(`[RoleAssignmentService] Default role for '${userType}' changed from ${previousRoleId} to ${roleId}`)
  ```
- IP address and user agent captured in audit log ✅

---

### [RBAC-3] Privilege escalation — teacher cannot reach admin routes

**Status:** ✅ **PASS**

**Evidence:**

- `requireRole()` middleware in `permission.middleware.ts:104-158`:
  - **FIXED (line 131-135):** Comment explicitly states the admin bypass was removed:
    ```
    // FIXED: Removed implicit admin superuser bypass.
    // Previously: if (!hasRole && userRoleNames.includes('admin')) return next()
    // This granted all Admin users access to any role-guarded route regardless...
    ```
  - Now requires explicit role match ✅
- `rbacRequirePermission()` from `core/rbac/rbac.middleware` checks actual permission keys against the user's resolved permissions ✅

---

### [RBAC-4] Super admin actions separately logged

**Status:** 🟡 **PARTIAL**

**Evidence:**

- `AuditLogService` logs all actions with `performedByUserId` — includes super admins ✅
- **However:** There is **no special flag or separate log** distinguishing super-admin actions from regular admin actions
- `TenantShadowTelemetry` logs tenant-level security events but does not specifically track super-admin operations
- The `tenantGuard` bypass (MT-05) has no audit logging

**Finding:** **RBAC-01** — Super-admin actions not separately distinguishable in audit logs  
**Severity:** 🟡 LOW  
**Remediation:** Add `is_super_admin: true` flag to audit log entries when the actor is a super admin.

---

### [RBAC-5] Legacy admin bypass in `requirePermissionOrRole`

**Status:** 🟠 **WARN**

**Evidence:**

- `requirePermissionOrRole()` in `permission.middleware.ts:198`:

  ```typescript
  const hasRole =
    roles.some((r) => userRoleNames.includes(r.toLowerCase())) ||
    userRoleNames.includes("admin");
  ```

  - The `|| userRoleNames.includes('admin')` grants **all** admins access regardless of required roles
  - This is different from `requireRole()` which had this bypass **removed** (line 131-135)
  - `requirePermissionOrRole()` is used in `examination.routes.ts` when `RBAC_ENFORCE_EXAMS !== 'true'`

**Finding:** **RBAC-02** — Legacy `requirePermissionOrRole` still has implicit admin bypass  
**Severity:** 🟠 MEDIUM  
**Remediation:** Remove `|| userRoleNames.includes('admin')` from `requirePermissionOrRole()`.

---

## NOTIFICATIONS

### [NOT-1] Bulk sends rate-limited

**Status:** ❌ **NOT IMPLEMENTED**

**Evidence:**

- `NotificationService` is a stub:
  ```typescript
  export class NotificationService {
    send() {}
  }
  ```
- No rate limiting, no bulk send logic, no queue integration

---

### [NOT-2] Failed notifications retry with exponential backoff

**Status:** ❌ **NOT IMPLEMENTED**

**Evidence:**

- Same empty stub — no retry logic exists
- `Notification.model.ts` has `error_message` field and `FAILED` status, suggesting retry was planned but not implemented

---

### [NOT-3] Notification cannot be routed to wrong tenant's users

**Status:** ✅ **PASS (by design)**

**Evidence:**

- `Notification.model.ts` has `institution_id: allowNull: false` ✅
- `defaultScope` enforces `institution_id: { [Op.not]: null }` ✅
- Notifications live in tenant schema, so cross-tenant routing is impossible at the DB layer

---

### [NOT-4] Template system — user input cannot inject malicious content

**Status:** 🟡 **CANNOT VERIFY**

**Evidence:**

- `NotificationTemplate.model.ts` supports `{{variable}}` placeholders in `title_template` and `message_template`
- **But:** No template rendering logic exists (stub service) — cannot verify if output is sanitized
- `idempotency_key` field exists on `Notification` model ✅ (designed for dedup)

**Finding:** **NOT-01** — Notification system is a complete stub — all 4 checks are N/A pending implementation  
**Severity:** ℹ️ INFO  
**Note:** Models are well-designed with `idempotency_key`, `institution_id` FK, status tracking, and template support. Implementation needed.

---

## REPORTS & EXPORTS

### [RPT-1] Heavy reports queued asynchronously

**Status:** ✅ **PASS**

**Evidence:**

- `requestReport()` in `reports.service.ts` creates a `ReportJob` record and then:
  ```typescript
  await queueManager.addJob(
    QueueType.REPORTS,
    "generate-report",
    { jobId, schema },
    { priority },
  );
  ```
- Reports are processed by `reportsProcessor` worker — fully async ✅
- API returns immediately with `{ job_id, status: 'queued' }` ✅

---

### [RPT-2] Report queries have timeout and row limit

**Status:** 🟡 **PARTIAL**

**Evidence:**

- All generators use `context.chunkSize` (5000 per batch) for paginated fetching ✅
- **However:** There is no overall `MAX_ROWS` cap — reports will fetch **all** matching records in unlimited chunks
- There is no `statement_timeout` set on report queries
- A school with 100,000 students could generate a massive report consuming significant memory

**Finding:** **RPT-01** — No overall row limit or query timeout on report generation  
**Severity:** 🟠 MEDIUM  
**Remediation:** Add `MAX_ROWS = 50000` check, and set `statement_timeout` on the Sequelize query options.

---

### [RPT-3] Exported files use expiring signed URLs

**Status:** 🟡 **PARTIAL**

**Evidence:**

- Filesystem reports have a TTL: `REPORT_TTL_MS = 24 hours` ✅
- File cleanup is triggered when `completed_at + TTL < now` ✅
- Download is served via `downloadReport()` which calls `ensureOwnedJob()` for access control ✅
- **However:** Files are served as raw `Buffer` responses, not signed URLs
- No pre-signed URL mechanism — file access is gated by auth + ownership check, which is acceptable for direct download
- Inline reports use `inline://` or `inline+enc://` URLs stored in DB — not publicly accessible ✅

**Finding:** **RPT-02** — No signed URL mechanism, but direct download with auth is acceptable  
**Severity:** ℹ️ INFO (acceptable pattern for non-CDN storage)

---

### [RPT-4] Export file paths are tenant-isolated in storage

**Status:** 🟡 **FAIL** (previously identified as MT-04)

**Evidence:**

- All reports stored in `server/tmp/reports/` without tenant partitioning
- File names include `jobId` (UUID) — collision unlikely but not defense-in-depth
- Access control enforced at service layer via `ensureOwnedJob()` ✅

**Cross-reference:** See **MT-04** in Phase 3.

---

## SUMMARY MATRIX

### Checklist Results

| Domain   | Check                              | Status                                                  |
| -------- | ---------------------------------- | ------------------------------------------------------- |
| **FEE**  | Payment idempotent                 | 🟠 Missing idempotency key (**FEE-01**)                 |
| **FEE**  | Duplicate payment prevention       | 🟠 Race condition (**FEE-02**)                          |
| **FEE**  | Audit trail on fee transactions    | 🟡 Missing `modified_by`/`voided_by` (**FEE-03**)       |
| **FEE**  | Refund flow atomic                 | ❌ Not implemented (**FEE-04**)                         |
| **FEE**  | Concurrent creation race condition | 🟡 Partially protected (**FEE-05**)                     |
| **FEE**  | Financial reports have row limits  | ✅ PASS                                                 |
| **FEE**  | Fee records cannot be hard-deleted | 🟠 `StudentFeeAssignment` lacks `paranoid` (**FEE-06**) |
| **STU**  | PII not in logs                    | ✅ PASS (🟡 audit redaction gap — **STU-01**)           |
| **STU**  | Records locked after graduation    | ❌ Missing (**STU-02**)                                 |
| **STU**  | Search cross-tenant leak risk      | ✅ PASS                                                 |
| **STU**  | Guardian data protection           | 🟡 Not in audit hooks (**STU-03**)                      |
| **ATT**  | Bulk batch insert                  | ✅ PASS                                                 |
| **ATT**  | Race condition handling            | ✅ PASS                                                 |
| **ATT**  | Audit trail                        | ✅ PASS                                                 |
| **EXM**  | Result data versioned              | 🟡 Generic audit only (**EXM-01**)                      |
| **EXM**  | Atomic publication                 | 🟡 No completion validation (**EXM-02**)                |
| **EXM**  | Teacher horizontal auth check      | ❌ FAIL (**EXM-03**)                                    |
| **EXM**  | Marks validation                   | 🟠 Not validated against `max_marks` (**EXM-04**)       |
| **RBAC** | Enforced at API middleware         | ✅ PASS                                                 |
| **RBAC** | Role changes logged                | ✅ PASS                                                 |
| **RBAC** | Privilege escalation tested        | ✅ PASS (admin bypass removed)                          |
| **RBAC** | Super admin actions logged         | 🟡 Not separately flagged (**RBAC-01**)                 |
| **NOT**  | All 4 checks                       | ❌ Stub — not implemented (**NOT-01**)                  |
| **RPT**  | Async queuing                      | ✅ PASS                                                 |
| **RPT**  | Timeout and row limit              | 🟠 No overall cap (**RPT-01**)                          |
| **RPT**  | Expiring signed URLs               | ℹ️ Direct download with auth (**RPT-02**)               |
| **RPT**  | Tenant-isolated file storage       | 🟡 FAIL (see **MT-04**)                                 |

### Findings by Severity

| Severity         | Count  | IDs                                                     |
| ---------------- | :----: | ------------------------------------------------------- |
| 🔴 CRITICAL      |   1    | EXM-03                                                  |
| 🟠 MEDIUM        |   6    | FEE-01, FEE-02, FEE-04, FEE-06, EXM-04, RPT-01          |
| 🟡 LOW           |   7    | FEE-03, FEE-05, STU-01, STU-03, EXM-01, EXM-02, RBAC-01 |
| 🟠 MEDIUM (RBAC) |   1    | RBAC-02                                                 |
| ❌ NOT IMPL      |   2    | STU-02, NOT-01                                          |
| ℹ️ INFO          |   1    | RPT-02                                                  |
| **TOTAL**        | **18** |                                                         |

### Quick-Fix Priority

| Priority | ID      | Title                                                             | Effort  |
| -------- | ------- | ----------------------------------------------------------------- | ------- |
| 🔴 P0    | EXM-03  | Add teacher→subject/class authorization check on marks entry      | Hours   |
| 🟠 P1    | FEE-01  | Add idempotency key to payment creation                           | Hours   |
| 🟠 P1    | FEE-02  | Add row-level lock on fee assignment before payment               | Hours   |
| 🟠 P1    | EXM-04  | Validate `marks_obtained <= max_marks` in service + DB constraint | Hours   |
| 🟠 P1    | FEE-06  | Add `paranoid: true` to `StudentFeeAssignment` model              | Minutes |
| 🟠 P1    | RBAC-02 | Remove admin bypass from `requirePermissionOrRole()`              | Minutes |
| 🟠 P2    | FEE-04  | Implement refund flow with transaction + audit                    | Days    |
| 🟠 P2    | STU-02  | Record immutability after graduation                              | Days    |
| 🟠 P2    | RPT-01  | Add max row limit and query timeout to report generators          | Hours   |
| 🟡 P3    | STU-01  | Add PII fields to audit hook redaction list                       | Minutes |
| 🟡 P3    | STU-03  | Register `ParentProfile` in data-change audit hooks               | Minutes |
| 🟡 P3    | RBAC-01 | Flag super-admin audit entries                                    | Hours   |

---

## DOMAIN LOGIC SCORE: **6/10**

### Justification

| Factor                                                                    | Assessment                | Score Impact |
| ------------------------------------------------------------------------- | ------------------------- | :----------: |
| ✅ Fee module: decimal arithmetic via `Decimal.js`, proper money handling | Production-grade          |      +1      |
| ✅ Attendance: full audit trail, bulk operations, duplicate handling      | Best-in-class             |     +1.5     |
| ✅ RBAC: API-level enforcement, admin bypass removed, role change logging | Strong                    |      +1      |
| ✅ Reports: async queuing, chunked fetching, ownership checks             | Well-architected          |     +0.5     |
| ✅ Data-change audit hooks on 9 critical models                           | Good forensic capability  |     +0.5     |
| ✅ Fee validators use Zod with `max(1_000_000_000)` ceiling               | Sensible limits           |     +0.5     |
| ✅ All financial operations wrapped in DB transactions                    | Atomicity enforced        |      +1      |
| 🔴 EXM-03: Any teacher can enter marks for any exam (horizontal auth)     | Critical domain logic gap |     -1.5     |
| 🟠 FEE-01/02: No payment idempotency or row-level locking                 | Financial integrity risk  |      -1      |
| 🟠 FEE-04: Refund flow completely missing                                 | Incomplete domain         |     -0.5     |
| ❌ NOT-01: Notification system is a stub                                  | Entire domain missing     |     -0.5     |
| 🟠 EXM-04: Marks can exceed max_marks                                     | Data integrity risk       |     -0.5     |
| 🟡 STU-02: No graduation/archive immutability                             | Missing safeguard         |     -0.5     |
| 🟠 RBAC-02: Legacy admin bypass still active                              | Permission inconsistency  |     -0.5     |
| **TOTAL**                                                                 |                           |   **6/10**   |

### Bottom Line

The domain logic is **mixed in maturity**. The **Attendance module** is the strongest domain — with full audit trails, duplicate handling, bulk batch operations, edit windows, and locking mechanisms. The **Fee module** has solid architecture (decimal arithmetic, transaction wrapping, Zod validation) but critically lacks payment idempotency and a refund workflow. The **Examination module** has a serious horizontal authorization gap (EXM-03) where any teacher can enter marks for any exam.

**Top 3 actions:**

1. **EXM-03** — Add teacher→subject authorization check before marks entry (Critical)
2. **FEE-01/02** — Add idempotency key + row lock on payment creation (Medium, financial risk)
3. **RBAC-02** — Remove the remaining admin bypass from legacy middleware (Medium, quick fix)

---

**PHASE 4 COMPLETE** — Domain Logic Audit generated.

---

# PHASE 6 — CODE QUALITY + ERROR HANDLING + LOGGING

**Audit Date:** 2026-02-23  
**Methodology:** Automated grep scans for patterns (`any`, silent catches, `console.log`, TODO/FIXME, sensitive data), plus manual review of error handler, logger, queue manager, and key service/controller files.

---

## CODE QUALITY (CQ-)

### [CQ-01] `any` Type Usages

**Total Count:** ~198 `any` usages across the server codebase

**Top 20 Highest-Risk `any` Usages:**

| #   | File                                                   | Line                                               | Context                                                      | Risk    |
| --- | ------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------ | ------- |
| 1   | `core/auth/keycloak.service.ts:295`                    | `userData: any`                                    | Function parameter for user creation — **security-critical** | 🔴 HIGH |
| 2   | `core/auth/keycloak.service.ts:413`                    | `const userPayload: any = {`                       | Keycloak user payload — bypasses type safety on auth data    | 🔴 HIGH |
| 3   | `core/auth/keycloak.service.ts:199`                    | `adminClient.authenticationManagement as any`      | Cast to access untyped Keycloak admin API                    | 🟠 MED  |
| 4   | `core/auth/jwt.ts:64`                                  | `(env.jwt as any).accessSecret`                    | Accessing potentially missing config key without type guard  | 🟠 MED  |
| 5   | `core/auth/jwt.ts:70`                                  | `(env.jwt as any).refreshSecret`                   | Same — accessing untyped secret config                       | 🟠 MED  |
| 6   | `core/middleware/keycloak.middleware.ts:130`           | `(payload as any).tenant_id`                       | JWT payload cast — security-critical tenant extraction       | 🔴 HIGH |
| 7   | `core/middleware/rate-limiter.middleware.ts:170`       | `handler: rateLimitHandler(config.message) as any` | Cast to satisfy Express type mismatch                        | 🟡 LOW  |
| 8   | `core/audit/data-change-audit.hooks.ts:51`             | `(instance as any).get?.({ plain: true })`         | Sequelize internal API access — no typed alternative         | 🟡 LOW  |
| 9   | `core/audit/data-change-audit.hooks.ts:205-208`        | `payload as any, {} as any`                        | Creating audit log with untyped payload                      | 🟠 MED  |
| 10  | `core/audit/data-change-audit.hooks.ts:226`            | `(instance as any)._previousDataValues`            | Accessing Sequelize internal — no typed alternative          | 🟡 LOW  |
| 11  | `core/audit/data-change-audit.hooks.ts:245-247`        | `(model as any).addHook(...)`                      | Registering hooks with untyped API                           | 🟡 LOW  |
| 12  | `core/http/ErrorHandler.ts:60-84`                      | `err: any` (×5 handlers)                           | Error type narrowing — acceptable for error handler          | 🟡 LOW  |
| 13  | `core/auth/mfa.service.ts:31`                          | `algorithm: 'sha1' as any`                         | Cast to satisfy OTP library types                            | 🟡 LOW  |
| 14  | `core/auth/jwt-rotation.ts:74,117,145,154`             | `catch (err: any)` (×4)                            | Error type in catch — TypeScript limitation                  | 🟡 LOW  |
| 15  | `core/auth/keycloak.service.ts:92,149,189,224,255,281` | `catch (error: any)` (×6)                          | Error type in catch blocks                                   | 🟡 LOW  |
| 16  | `database/sequelize.ts:53`                             | `(options: any)`                                   | Global Sequelize hook options                                | 🟠 MED  |
| 17  | `services/audit-log.service.ts:43`                     | `additionalInfo?: Record<string, any>`             | Audit metadata — loosely typed but acceptable                | 🟡 LOW  |
| 18  | `modules/school/auth/auth.controller.ts:81`            | `catch { }`                                        | Empty catch (URL parsing) — swallows errors                  | 🟠 MED  |
| 19  | `core/resilience/graceful-shutdown.ts:29-30`           | `redis?: any; queueManager?: any`                  | Dependency types not imported                                | 🟠 MED  |
| 20  | `observability/structured-logger.ts:180`               | `(req as any).requestId`                           | Request ID access — Express augmentation not applied         | 🟡 LOW  |

**Finding:** **CQ-01** — 198 `any` usages; 3 are in security-critical auth paths (Keycloak user creation, JWT payload decoding, JWT secret access)  
**Severity:** 🟠 MEDIUM  
**Remediation:** Priority-fix the 3 🔴 HIGH entries in auth/keycloak (typed `CreateUserPayload` interface) and middleware (typed JWT payload interface).

---

# PHASE 7 — API DESIGN + TEST COVERAGE

**Audit Date:** 2026-02-23
**Methodology:** Code structure scan, manual code review, and output parsing of `jest --coverage`.

---

## ── API DESIGN (API-) ──

### [API-01] Versioning

- **Status:** ✅ Pass
- **Details:** Consistent API versioning strategy exists. `app.ts` mounts endpoints using canonical paths like `/api/v2/school` and `/api/v1/tenant`, with backward compatibility fallback aliases (`/api/v2/api/school`).

### [API-02] Response Envelope Consistency

- **Status:** ⚠️ Partial / Varies
- **Details:** Most recent controllers use the `utils.ts` structured `successResponse` returning: `{ success: true, data: T, message: string }`. However, older controllers manually return `res.json({ accessToken, refreshToken })` without the full standard envelope, or nest data differently. Error payloads from `ErrorHandler.ts` consistently return `{ success: false, error: ... }`.

### [API-03] HTTP Status Codes

- **Status:** ✅ Pass
- **Details:** Semantic correctness is mostly respected.
  - `201 Created` is correctly used in controllers (`tenant.controller.ts`, `fee.test.ts`, etc.) for creation.
  - `400` vs `422`: `422` is properly returned for complex tenant provisioning validation failures. `400` handles standard Zod parsing errors.
  - `401` (Unauthenticated) vs `403` (Forbidden): RBAC middleware returns `403`, while Auth service correctly throws `401` for bad credentials.

### [API-04] Pagination & Max Page Size

- **Status:** ✅ Pass
- **Details:** Enforced server-side. For instance, `attendance.repository.ts` uses `Math.max(1, limit)` bounded entirely by `ATTENDANCE_LIMITS.MAX_PAGE_SIZE` (hardcapped at 200). Offset computation `(page - 1) * limit` is standardized across all list fetches.

### [API-05] No endpoint returning full objects when subset needed

- **Status:** ✅ Pass
- **Details:** Pagination is ubiquitously implemented across list endpoints, preventing full-table dumps.

### [API-06] Async Heavy Operations

- **Status:** ✅ Pass
- **Details:** The new `Reports` module uses `QueueManager` with BullMQ for offline generation (`QueueType.REPORTS`). The API returns a `job_id` instead of blocking, enabling clients to poll status (`/status/:jobId`) — an excellent design.

### [API-07] Webhook Signature Verification

- **Status:** ℹ️ N/A
- **Details:** No webhooks exist in the current system. (Grep for `webhook` and `signature` yielded 0 results).

### [API-08] OpenAPI / Swagger Documentation

- **Status:** 🔴 FAIL
- **Details:** None exists. `swagger / openapi` references are completely absent from the codebase.

### [API-09] Deprecated Endpoints Marking

- **Status:** 🟠 MEDIUM
- **Details:** JSDoc `@deprecated` tags exist (e.g., `DEPRECATED - Password login disabled. Use Keycloak.`), but NONE include a sunset date or sunset HTTP headers (`Sunset:` / `Deprecation:`).

---

## ── TEST COVERAGE (TST-) ──

### [TST-01] Overall Coverage Percentage

**Total Line Coverage is dangerously low at 21.68%.**

- Statements: 21.1% (2357/11168)
- Branches: 3.3% (182/5509)
- Functions: 6.17% (115/1861)
- Lines: 21.68% (2317/10687)

### [TST-02] Zero-Coverage Critical Flows

The following critical business flows have virtually `0%` test coverage:

- **Attendance Module** (Validation, locks, backdating)
- **Reports Module** (PDF/Excel generation, Queue polling)
- **Communication Module**
- **Academic Setup** (Classes, Sections, Subjects)

### [TST-03] Integration vs Mock Testing Behavior

- **Status:** ✅ Excellent
- **Details:** The majority of tests (`fee.test.ts`, `auth.test.ts`, `parent-portal.test.ts`) are **Integration Tests**. They use `supertest` sending full HTTP requests through the Express router, against a real Postgres SQL database using isolated Jest schemas. They test actual system behavior.

### [TST-04] Multi-tenant Isolation Tested

- **Status:** ✅ Pass
- **Details:** Specifically covered in `tenant-isolation.test.ts`. Hard proof exists that `tenant_a` tokens cannot fetch `tenant_b` students or view `tenant_b` fees, verifying that the `TenantIsolationGuard` + Schema bridging works.

### [TST-05] Financial Edge Cases Tested

- **Status:** 🟠 MEDIUM / Missing
- Duplicate fee category? Tested.
- **Missing:** Concurrent fee record creation race conditions, Duplicate payment interception checks, and Refund application logic (refunds are completely absent from codebase).

### [TST-06] Authorization Boundary Tests

- **Status:** 🟠 MEDIUM / Partial
- Tested: Parent portal hard boundary (parent cannot view another parent's child).
- **Missing:** No horizontal boundary tests enforcing that "Teacher hitting Admin endpoints returns 403".

### [TST-07] Flaky, Meaningless, or Mock-Only Tests

- **Status:** 🔴 FAIL
- **Details:** `critical-flows.transaction.test.ts` is entirely mock-based (`jest.spyOn`), testing Sequelize transaction rollbacks through heavy `mockResolvedValue` layers. While fast, it proves only that `sequelize.transaction` was called, not if database constraints actually trigger rollbacks under load.

---

## PHASE 7 SCORES

**API Design Score: 8/10** (Strong async architecture and pagination, but docked for zero Swagger docs and lack of webhook safety primitives).
**Test Coverage Score: 3/10** (Brilliant integration setups + tenant isolation tests, but severely degraded by 21% total coverage and entire missing domains like Attendance and Reports).

---

**PHASE 7 COMPLETE** — Awaiting instructions for Phase 8.

---

### [CQ-02] TODO / FIXME / HACK Comments

**Status:** 🟡 LOW RISK

**Found 7 TODO/FIXME items (all in non-critical paths):**

| #   | Location                                             | Comment                                                                   |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | `modules/tenant/routes/index.ts:7`                   | `TODO: University module deferred - not in active scope`                  |
| 2   | `modules/tenant/routes/index.ts:44`                  | `TODO: University module deferred - not in active scope`                  |
| 3   | `core/secrets/secret.provider.ts:126`                | `TODO (E1.3): Implement Vault KV v2 fetch`                                |
| 4   | `core/rbac/permission-map.ts:118`                    | `TODO: Add these to RBAC permission catalog before full migration`        |
| 5   | `core/auth/providers/sso.identity.provider.ts:39`    | `TODO (E1.2): Implement OIDC token exchange`                              |
| 6   | `core/auth/providers/sso.identity.provider.ts:52`    | `TODO (E1.2): Verify token against SSO provider's introspection endpoint` |
| 7   | `core/auth/providers/sso.identity.provider.ts:61,66` | `TODO (E1.2): Issue ERP-native tokens / Back-channel logout`              |

**Finding:** **CQ-02** — 7 TODOs, all in deferred/future features (SSO, Vault, University). None in active production paths.  
**Severity:** ℹ️ INFO

---

### [CQ-03] Business Logic in Wrong Layer

**Status:** 🟡 MOSTLY CORRECT

**Evidence — Controllers:**

- **Most controllers** delegate to services correctly: `examinationController`, `SchoolAuthControllerV2`, academic controllers all call `service.method()` ✅
- **Exception 1: `tenant.controller.ts`** — Contains `verifyTenant()` with inline DB query (`Institution.findOne()`), schema sync logic, and caching. This should be in `TenantService`.
- **Exception 2: `tenant.controller.ts:192-198`** — `syncTenantSchema()` function with inline model loading and `ModelClass.schema(schemaName).sync()`. This is repository/migration-level logic in a controller.
- **Controllers do NOT contain raw SQL** — all raw SQL is in the GoLive dashboard and sequelize.ts ✅

**Finding:** **CQ-03** — `tenant.controller.ts` has 200 lines of business logic (schema sync, caching) that belongs in a service layer  
**Severity:** 🟡 LOW (it works, but violates separation of concerns)

---

### [CQ-04] Copy-Pasted Code (DRY Violations)

**Status:** 🟡 LOW

**Evidence:**

- The `examsRequirePermission()` pattern (env-toggle wrapper) is duplicated across multiple route files:
  - `examination.routes.ts`: `examsRequirePermission()`
  - `student.routes.ts`: inline `rbacRequirePermission()`
  - `academic.routes.ts`: inline `rbacRequirePermission()`
  - Each uses slightly different toggle logic
- The `sendSuccess` / `sendError` helper pattern is repeated in `auth.controller.ts`, `ErrorHandler.ts`, and `permission.middleware.ts` with slight variations
- Two user management services exist side by side: `user-management.service.ts` and `user-management.repository.service.ts` with overlapping logic

**Finding:** **CQ-04** — Permission toggle wrapper duplicated across 3+ route files; dual user management services exist  
**Severity:** 🟡 LOW

---

### [CQ-05] Dead Code

**Status:** 🟡 SOME PRESENT

**Evidence:**

- `config/db.ts` is an empty stub (5 lines, no real config) — dead file ✅
- `core/auth/providers/sso.identity.provider.ts` — all methods are TODO stubs
- `core/secrets/secret.provider.ts:126` — Vault provider method is a stub
- `scripts/audit_cleanup.ts` — development-time script using `console.log` (not production code but lives in src/)

**Finding:** **CQ-05** — 3 stub files in production code paths + 1 dead config file  
**Severity:** ℹ️ INFO

---

### [CQ-06] Silent Catch Blocks

**Status:** 🟠 MEDIUM

**5 silent catch blocks found:**

| #   | Location                       | Context                                              | Risk                                                |
| --- | ------------------------------ | ---------------------------------------------------- | --------------------------------------------------- |
| 1   | `tenant.service.ts:150`        | `await transaction.rollback().catch(() => { })`      | ⚪ Acceptable — secondary error in rollback         |
| 2   | `tenant.service.ts:214`        | `citext extension creation .catch(() => { })`        | ⚪ Acceptable — optional extension                  |
| 3   | `tenant.service.ts:631`        | `await transaction.rollback().catch(() => { })`      | ⚪ Acceptable — secondary error in rollback         |
| 4   | `auth.controller.ts:81`        | `catch { }` on URL parsing `new URL(origin)`         | 🟡 Questionable — silently ignores malformed origin |
| 5   | `keycloak.service.ts:221`      | `.catch(() => { })` in auth flow deletion            | 🟠 Risky — swallows Keycloak API failures           |
| 6   | `tenant.controller.ts:196-197` | `catch (error) { /* Silent fail */ }` on schema sync | 🟠 Risky — swallows sync failures for every model   |

**Finding:** **CQ-06** — 2 risky silent catches: Keycloak API failure silenced, schema sync errors silenced  
**Severity:** 🟠 MEDIUM

---

### [CQ-07] Magic Numbers and Strings

**Status:** 🟡 SOME PRESENT

**Evidence:**

- `auth.controller.ts:88`: `maxAge: 7 * 24 * 60 * 60 * 1000` — refresh token TTL (7 days) as inline math
- `auth.controller.ts:98`: `maxAge: 15 * 60 * 1000` — access token TTL (15 min) as inline math
- `sequelize.ts:35-39`: Pool config `max: 20, min: 5, acquire: 60000, idle: 10000, evict: 1000` — hardcoded pool values
- `reports.service.ts:32`: `REPORT_TTL_MS = 1000 * 60 * 60 * 24` — ✅ extracted to constant
- `reports.service.ts:33`: `CHUNK_SIZE = 5000` — ✅ extracted to constant
- `QueueManager.ts`: Retry configs `maxRetries: 3, backoffDelay: 2000` — ✅ properly structured as config objects

**Finding:** **CQ-07** — Cookie TTLs and pool configs use inline magic numbers instead of named constants  
**Severity:** 🟡 LOW

---

### [CQ-08] `console.log` in Production Code

**Status:** 🟡 LOW

**Evidence:**

- `console.log` found in:
  - `scripts/audit_cleanup.ts` — development script, acceptable
  - `database/seeders/global-permissions.seeder.ts` — CLI seeder, acceptable (uses `verbose` flag)
- **Zero** `console.log` in service, controller, or middleware production code ✅
- All production logging uses `logger.*` from `core/utils/logger.ts` ✅

**Finding:** No issue — `console.log` confined to CLI scripts/seeders only.

---

### [CQ-09] Circular Dependencies

**Status:** ✅ **NO EVIDENCE OF CIRCULAR DEPENDENCIES**

**Evidence:**

- Logger constructor comment: `// Use process.env directly to avoid circular dependency with config/env` — shows awareness ✅
- Module structure follows clear dependency flow: `config → core → database → modules` ✅
- `requestContext.ts` uses `AsyncLocalStorage` to avoid circular service dependencies ✅

---

## ERROR HANDLING (ERR-)

### [ERR-01] Global Error Handler

**Status:** ✅ **PASS**

**Evidence:**

- `core/http/ErrorHandler.ts` exports `globalErrorHandler` as Express `ErrorRequestHandler` ✅
- Handles all known error types:
  - `CastError` → 400
  - `ValidationError` → 400
  - `JsonWebTokenError` → 401
  - `TokenExpiredError` → 401
  - `SequelizeValidationError` → 400
  - `SequelizeUniqueConstraintError` → 409
  - `SequelizeForeignKeyConstraintError` → 400
  - CORS errors → 403
  - Unknown errors → 500 (generic message in production)
- `catchAsync()` utility wraps all async route handlers with `.catch(next)` ✅
- `notFoundHandler` catches 404s ✅
- Checks `res.headersSent` before sending response ✅
- Production mode does NOT leak stack traces or internal details ✅

---

### [ERR-02] Unhandled Promise Rejections and Uncaught Exceptions

**Status:** ✅ **PASS**

**Evidence — Two layers of protection:**

**Layer 1: `core/http/ErrorHandler.ts:218-242`**

```typescript
process.on("unhandledRejection", (reason: Error) => {
  logger.error("Unhandled rejection. Shutting down...");
  server.close(() => process.exit(1));
});
process.on("uncaughtException", (err: Error) => {
  logger.error("Uncaught exception. Shutting down...");
  process.exit(1);
});
```

**Layer 2: `core/resilience/graceful-shutdown.ts:169-181`**

```typescript
process.on("unhandledRejection", (reason: any) => {
  logger.error("[GracefulShutdown] Unhandled Promise Rejection:", reason);
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test"
  ) {
    process.exit(1); // Crash to surface bugs
  }
  // In production, log and continue
});
process.on("uncaughtException", (err: Error) => {
  logger.error(
    "[GracefulShutdown] Uncaught Exception:",
    err.message,
    err.stack,
  );
  process.exit(1); // Always fatal
});
```

**Finding:** **ERR-01** — Dual registration of `unhandledRejection` handlers with conflicting behavior: ErrorHandler always exits, GracefulShutdown only exits in dev. Last-registered handler wins.  
**Severity:** 🟡 LOW  
**Remediation:** Consolidate into a single handler registration.

---

### [ERR-03] External Service Failure Handling (Keycloak)

**Status:** 🟡 **PARTIAL**

**Evidence:**

- Keycloak is the **only external service** (no payment gateway, SMS, or email integration yet)
- `keycloak.service.ts` has `catch` blocks on all API calls ✅
- However, **no timeout** is configured on the Keycloak Admin Client HTTP calls
- If Keycloak is slow/unresponsive, requests hang indefinitely
- `keycloak.service.ts:221`: Deletion failure silently caught — user creation could succeed with orphaned Keycloak state

**Finding:** **ERR-02** — No HTTP timeout configured on Keycloak Admin Client API calls  
**Severity:** 🟠 MEDIUM  
**Remediation:** Set `requestConfig.timeout = 10000` (10s) on the Keycloak Admin Client.

---

### [ERR-04] Queue/Job Failure Handling

**Status:** ✅ **PASS**

**Evidence:**

- `QueueManager.ts` defines comprehensive retry and DLQ configuration for every queue:

| Queue         | Max Retries | Backoff        | DLQ                 |
| ------------- | :---------: | -------------- | ------------------- |
| ATTENDANCE    |      3      | Exponential 2s | `dlq:attendance`    |
| NOTIFICATIONS |      3      | Exponential 5s | `dlq:notifications` |
| REPORTS       |      2      | Fixed 10s      | `dlq:reports`       |
| ACADEMIC      |      3      | Exponential 3s | `dlq:academic`      |
| EXAMINATIONS  |      3      | Exponential 4s | `dlq:examinations`  |
| FEES          |      3      | Exponential 3s | `dlq:fees`          |
| DEFAULT       |      3      | Exponential 3s | `dlq:default`       |

- `removeOnFail: 0` — failed jobs kept, not dropped ✅
- Per-domain DLQ prevents cross-domain failure pollution ✅
- BullMQ's built-in retry mechanism used ✅

---

### [ERR-05] DB Connection Failure Handling

**Status:** ✅ **PASS**

**Evidence:**

- `sequelize.ts:78-106`:
  ```typescript
  await sequelize.authenticate();
  // ... on failure:
  logger.error("Unable to connect to the database", error);
  process.exit(1);
  ```
- Pool config: `retry: { max: 3 }` — retries failed connections up to 3 times ✅
- Pool: `acquire: 60000` (60s timeout) — won't hang indefinitely ✅
- Health check route: `GET /health/ready` calls `sequelize.authenticate()` with try/catch ✅
- Graceful shutdown: `deps.sequelize.close()` in cleanup ✅

---

### [ERR-06] Silent Catch Blocks (Cross-ref with CQ-06)

**Status:** 🟠 **PARTIAL**

See **CQ-06** for details. Summary:

- **5 silent catches** identified
- **2 are risky:** Keycloak API failure and schema sync both silenced
- The rest are acceptable (rollback errors, optional extensions)

**Finding:** **ERR-03** — Schema sync errors in `tenant.controller.ts:196` silently swallowed — could mask broken tenant schemas  
**Severity:** 🟠 MEDIUM

---

## LOGGING (LOG-)

### [LOG-01] Logs are Structured JSON

**Status:** 🟡 **DUAL-SYSTEM — INCONSISTENT**

**Evidence — Two separate loggers exist:**

**Logger 1: `core/utils/logger.ts` (legacy)**

- Used by most of the codebase (`import { logger } from '../utils/logger'`)
- Format: `[timestamp] [LEVEL] [PID:N] message args`
- **NOT structured JSON** — plain text with template string
- No tenant_id, user_id, or request_id
- Output: `process.stdout.write` / `process.stderr.write`

**Logger 2: `core/observability/structured-logger.ts` (modern)**

- Used by ~10 files (observability, tenant services, pilot-mode middleware)
- Format: Production = `JSON.stringify(entry)` ✅ structured JSON
- Includes: `timestamp`, `level`, `requestId`, `tenantId`, `userId`, `route`, `method`, `latencyMs`, `statusCode`, `service`, `component`
- Has `scrubSensitive()` for PII redaction ✅
- Has `requestIdMiddleware()` and `httpLoggerMiddleware()` registered in `app.ts` ✅

**Finding:** **LOG-01** — Two competing loggers: legacy (plain text, used by ~90% of code) and structured (JSON, used by ~10%)  
**Severity:** 🟠 MEDIUM  
**Impact:** Most logs lack `tenant_id`, `user_id`, and `request_id` because the legacy logger doesn't support structured fields.

---

### [LOG-02] Log Context Fields

**Status:** ❌ **FAIL on legacy logger, PASS on structured logger**

| Field        |         Legacy Logger         | Structured Logger  |
| ------------ | :---------------------------: | :----------------: |
| `timestamp`  | ✅ `new Date().toISOString()` |         ✅         |
| `level`      |  ✅ `ERROR/WARN/INFO/DEBUG`   |         ✅         |
| `tenant_id`  |        ❌ Not included        | ✅ via `tenantId`  |
| `user_id`    |        ❌ Not included        |  ✅ via `userId`   |
| `request_id` |        ❌ Not included        | ✅ via `requestId` |
| `PID`        |       ✅ `process.pid`        |  ❌ Not included   |

**Finding:** **LOG-02** — Legacy logger (used by majority of code) lacks `tenant_id`, `user_id`, `request_id`  
**Severity:** 🟠 MEDIUM  
**Note:** The structured logger has a `requestIdMiddleware` registered in `app.ts`, and `httpLoggerMiddleware` logs every request with full context. But service/repository-level logs (the most numerous) use the legacy logger.

---

### [LOG-03] Critical Business Events Logged

| Event                   |      Logged?       | Logger Used                                    | Evidence                          |
| ----------------------- | :----------------: | ---------------------------------------------- | --------------------------------- |
| Fee paid                |         ✅         | Data-change audit hooks on `FeePayment` model  | `data-change-audit.hooks.ts`      |
| Fee refunded / voided   | 🟡 Not implemented | N/A (no refund flow)                           | See FEE-04                        |
| Student enrolled        |         ✅         | Data-change audit hooks on `Student` model     | `data-change-audit.hooks.ts`      |
| Student archived        |         ✅         | Paranoid soft-delete triggers audit hook       | `data-change-audit.hooks.ts`      |
| Result published        |     🟡 Partial     | `Mark` audit hook + exam status update         | Generic audit only                |
| User role changed       |         ✅         | `AuditLogService.logRoleAssigned()`            | `audit-log.service.ts:159`        |
| Admin privileged action |         ✅         | `AuditLogService` + `structuredLogger.alert()` | Dual logging                      |
| Attendance marked       |         ✅         | `AttendanceAuditLog`                           | `attendance-queue.service.ts:223` |

**Finding:** **LOG-03** — Critical business events are logged, but through multiple, inconsistent mechanisms (Sequelize hooks, AuditLogService, AttendanceAuditLog, structuredLogger)  
**Severity:** 🟡 LOW (events are captured, but not in a unified format)

---

### [LOG-04] No Sensitive Data in Logs

**Status:** ✅ **MOSTLY PASS**

**Evidence:**
| Check | Result |
|-------|--------|
| Passwords in logs | ✅ PASS — zero matches for `logger.*password` |
| Tokens in logs | ✅ PASS — zero matches for `logger.*(info\|debug).*token` (except key rotation references) |
| `req.body` logged | ✅ PASS — zero matches for `logger.*req.body` |
| PII (aadhar, phone, email) | ✅ PASS in application logs — zero matches |
| Sensitive scrubbing | ✅ `structured-logger.ts` has `SENSITIVE_KEYS` set including `password`, `token`, `secret`, `authorization`, `cookie`, `jwt`, `apiKey`, `creditCard`, `ssn`, `aadhar` |

**Exception:** One log line in `keycloak.service.ts:367`:

```typescript
logger.info(`[KeycloakService] Permanent password set for user: ${email}`);
```

Logs the **email** when setting a password (not the password itself, but reveals the operation target).

**Finding:** **LOG-04** — Email logged in Keycloak password-set operation. Minor PII exposure.  
**Severity:** 🟡 LOW

---

### [LOG-05] No Full Request Body Logged

**Status:** ✅ **PASS**

**Evidence:**

- Zero matches for `logger.*req.body` across entire codebase ✅
- `httpLoggerMiddleware` logs `req.method`, `req.path`, and `res.statusCode` — NOT the body ✅
- `globalErrorHandler` logs `message`, `statusCode`, `path`, `method`, `ip` — NOT the body ✅

---

### [LOG-06] Log Levels Correct (No Debug in Production)

**Status:** ✅ **PASS**

**Evidence:**

**Legacy logger (`core/utils/logger.ts`):**

```typescript
case 'production': return LogLevel.INFO;  // No DEBUG in production
case 'test':       return LogLevel.WARN;
case 'development': return LogLevel.DEBUG;
```

**Structured logger (`core/observability/structured-logger.ts`):**

```typescript
case 'production':  return LogLevel.INFO;  // No DEBUG in production
case 'staging':     return LogLevel.INFO;
case 'test':        return LogLevel.WARN;
case 'development': return LogLevel.DEBUG;
```

- Only **2 `logger.debug` calls** exist in modules (tenant middleware, attendance queue) — correctly suppressed in production ✅
- Error handler strips stack traces in production: `stack: env.nodeEnv === 'development' ? err.stack : undefined` ✅

---

## SUMMARY MATRIX

### Code Quality Findings

| ID    | Finding                                                       | Severity  |
| ----- | ------------------------------------------------------------- | --------- |
| CQ-01 | 198 `any` usages; 3 in security-critical auth paths           | 🟠 MEDIUM |
| CQ-02 | 7 TODOs in deferred features (SSO, Vault, University)         | ℹ️ INFO   |
| CQ-03 | `tenant.controller.ts` has 200 lines of service-layer logic   | 🟡 LOW    |
| CQ-04 | Permission toggle wrapper duplicated; dual user mgmt services | 🟡 LOW    |
| CQ-05 | 3 stub files + 1 dead config in production code               | ℹ️ INFO   |
| CQ-06 | 2 risky silent catch blocks (Keycloak, schema sync)           | 🟠 MEDIUM |
| CQ-07 | Cookie TTLs and pool configs use inline magic numbers         | 🟡 LOW    |

### Error Handling Findings

| ID     | Finding                                                      | Severity  |
| ------ | ------------------------------------------------------------ | --------- |
| ERR-01 | Dual `unhandledRejection` handlers with conflicting behavior | 🟡 LOW    |
| ERR-02 | No HTTP timeout on Keycloak Admin Client API calls           | 🟠 MEDIUM |
| ERR-03 | Schema sync errors silently swallowed in tenant controller   | 🟠 MEDIUM |

### Logging Findings

| ID     | Finding                                                           | Severity  |
| ------ | ----------------------------------------------------------------- | --------- |
| LOG-01 | Two competing loggers; legacy (90% usage) is plain-text, not JSON | 🟠 MEDIUM |
| LOG-02 | Legacy logger lacks `tenant_id`, `user_id`, `request_id` fields   | 🟠 MEDIUM |
| LOG-03 | Business events logged via 4+ inconsistent mechanisms             | 🟡 LOW    |
| LOG-04 | Email logged in Keycloak password-set operation                   | 🟡 LOW    |

### Quick-Fix Priority

| Priority | ID        | Title                                                            | Effort  |
| -------- | --------- | ---------------------------------------------------------------- | ------- |
| 🟠 P1    | CQ-01     | Type Keycloak `userData` and JWT `payload` (top 3 `any`)         | Hours   |
| 🟠 P1    | ERR-02    | Set `timeout: 10000` on Keycloak Admin Client                    | Minutes |
| 🟠 P1    | LOG-01/02 | Migrate all `import { logger }` to `import { structuredLogger }` | Days    |
| 🟠 P2    | CQ-06     | Add `logger.warn()` to silent catches in Keycloak + tenant sync  | Minutes |
| 🟠 P2    | ERR-03    | Log schema sync errors instead of silencing them                 | Minutes |
| 🟠 P2    | ERR-01    | Consolidate dual `unhandledRejection` handlers                   | Minutes |
| 🟡 P3    | CQ-03     | Extract `verifyTenant` and `syncTenantSchema` to TenantService   | Hours   |
| 🟡 P3    | CQ-04     | Create shared `createPermissionGate()` utility                   | Hours   |
| 🟡 P3    | CQ-07     | Extract cookie TTLs and pool configs to named constants          | Minutes |

---

## CODE QUALITY SCORE: **5/10**

### Justification

| Factor                                                     | Assessment                   | Score Impact |
| ---------------------------------------------------------- | ---------------------------- | :----------: |
| ✅ Zod validators on all API inputs                        | Strong validation layer      |     +1.5     |
| ✅ Clear service/repository/controller separation (mostly) | Good architecture            |      +1      |
| ✅ No circular dependencies                                | Clean module graph           |     +0.5     |
| ✅ No `console.log` in production code                     | Proper logging discipline    |     +0.5     |
| ✅ Async error wrapping (`catchAsync`, `asyncHandler`)     | Pattern consistency          |     +0.5     |
| ✅ 7 TODOs all in deferred features                        | No forgotten production gaps |     +0.5     |
| 🟠 CQ-01: 198 `any` usages, 3 in security-critical paths   | Type safety gap              |     -1.5     |
| 🟠 CQ-06: 2 risky silent catches                           | Error visibility gap         |      -1      |
| 🟡 CQ-03: Service-layer logic in tenant controller         | Architecture violation       |     -0.5     |
| 🟡 CQ-04: Duplicated permission wrapper pattern            | DRY violation                |     -0.5     |
| 🟡 CQ-05: Dead code (stubs, empty config)                  | Code hygiene                 |     -0.5     |
| 🟡 CQ-07: Magic numbers in auth cookies                    | Maintainability              |     -0.5     |
| **TOTAL**                                                  |                              |   **5/10**   |

---

## ERROR HANDLING SCORE: **7/10**

### Justification

| Factor                                                 | Assessment                          | Score Impact |
| ------------------------------------------------------ | ----------------------------------- | :----------: |
| ✅ Global error handler catches all Express errors     | Comprehensive                       |      +2      |
| ✅ `catchAsync` pattern on all async routes            | No unhandled rejections from routes |      +1      |
| ✅ `unhandledRejection` + `uncaughtException` handlers | Process-level safety                |      +1      |
| ✅ Queue retry policy with exponential backoff + DLQ   | Industry-grade                      |     +1.5     |
| ✅ DB connection retry + pool config + health check    | Production-ready                    |      +1      |
| ✅ Production errors don't leak stack traces           | Security-conscious                  |     +0.5     |
| ✅ Graceful shutdown with 7-step drain process         | Enterprise-grade                    |      +1      |
| 🟠 ERR-02: No timeout on Keycloak HTTP calls           | Hanging request risk                |      -1      |
| 🟠 ERR-03: Silent schema sync errors                   | Broken tenant risk                  |     -0.5     |
| 🟡 ERR-01: Dual unhandled rejection handlers           | Conflicting behavior                |     -0.5     |
| **TOTAL**                                              |                                     |   **7/10**   |

---

## LOGGING SCORE: **6/10**

### Justification

| Factor                                                             | Assessment                 | Score Impact |
| ------------------------------------------------------------------ | -------------------------- | :----------: |
| ✅ Structured logger exists with JSON output in production         | Modern design              |     +1.5     |
| ✅ `requestIdMiddleware` + `httpLoggerMiddleware` registered       | Request tracing foundation |      +1      |
| ✅ Sensitive field scrubbing (passwords, tokens, PII)              | Security-conscious         |      +1      |
| ✅ Log levels correctly set per environment                        | No debug in production     |     +0.5     |
| ✅ No `req.body` logged anywhere                                   | PII protection             |     +0.5     |
| ✅ Critical business events logged via audit hooks                 | Forensic capability        |      +1      |
| ✅ Metrics and alerts via `structuredLogger.metric()` / `.alert()` | Observability features     |     +0.5     |
| 🟠 LOG-01: Legacy logger (plain text) used by 90% of code          | Not machine-parseable      |     -1.5     |
| 🟠 LOG-02: Most logs lack tenant/user/request context              | Debugging hindrance        |     -1.5     |
| 🟡 LOG-03: 4+ logging mechanisms inconsistent                      | No unified audit trail     |     -0.5     |
| 🟡 LOG-04: Email logged in password-set operation                  | Minor PII exposure         |     -0.5     |
| **TOTAL**                                                          |                            |   **6/10**   |

---

### Bottom Line

**Error handling is the strongest area** — the combination of global Express error handler, `catchAsync` pattern, queue DLQs with exponential backoff, and graceful shutdown gives solid production reliability. The main gap is missing timeouts on external Keycloak calls.

**Logging has a split-personality problem** — a modern structured logger exists and is production-ready, but ~90% of the codebase still uses the legacy plain-text logger. The migration path is clear (swap imports), but the effort is non-trivial.

**Code quality is held back by `any` sprawl** — 198 usages total, with 3 in security-critical auth paths. The architecture is otherwise clean with proper separation of concerns, Zod validation, and no circular dependencies.

**Top 3 actions:**

1. **ERR-02** — Set timeout on Keycloak HTTP client (Minutes, prevents hanging)
2. **CQ-01** — Type the 3 security-critical `any` casts in auth/Keycloak (Hours)
3. **LOG-01/02** — Begin migration from legacy logger to structured logger (Days)

---

**PHASE 6 COMPLETE** — Code Quality, Error Handling, and Logging Audit generated.  
**Awaiting Phase 7** from auditor.
