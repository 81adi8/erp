# 🏢 ENTERPRISE AUDIT REPORT — School ERP Platform
**Auditor:** Senior Engineer Review  
**Date:** February 18, 2026  
**Codebase:** `new-erp-main`  
**Audit Scope:** Full-stack — Backend (Node/Express/TypeScript), Frontend (React/Vite), Database (PostgreSQL/Sequelize), Infrastructure (Redis, Keycloak, Bull Queue)

---

## 📊 EXECUTIVE SUMMARY

| Category | Score | Status |
|---|---|---|
| Architecture | 9/10 | ✅ Enterprise-Grade |
| Security | 8.5/10 | ✅ Strong |
| Multi-Tenancy | 9/10 | ✅ Production-Ready |
| RBAC / Authorization | 7.5/10 | ⚠️ Partially Enforced |
| Database Design | 8/10 | ✅ Solid |
| Resilience / Fault Tolerance | 8.5/10 | ✅ Enterprise-Grade |
| School Module Completeness | 7/10 | ⚠️ Some Gaps |
| Frontend Quality | 7/10 | ⚠️ Functional but Thin |
| Test Coverage | 2/10 | ❌ Critical Gap |
| Observability | 8/10 | ✅ Good |
| Documentation | 8/10 | ✅ Excellent |
| **OVERALL** | **7.8/10** | **⚠️ Near-Enterprise** |

---

## ✅ WHAT IS WORKING — CONFIRMED FUNCTIONAL

### 1. Multi-Tenant Architecture (EXCELLENT)
- **Schema-per-tenant isolation** using PostgreSQL schemas — every school gets its own isolated schema (e.g., `tenant_rk`, `tenant_rss`)
- **TenantService.createTenant()** — Full 7-step provisioning pipeline: Plan validation → Institution record → Keycloak realm → DB schema → Model sync → Role seeding → Admin user creation
- **Activation Gate** — Tenant is NEVER marked `active` unless ALL 5 checkpoints pass (schema exists, migrations complete, RBAC seeded, admin created, login verified)
- **Tenant Isolation Guard** — Blocks `public`, `root`, `information_schema` schemas from being used as tenant schemas; prevents cross-tenant access
- **JWT Tenant Bridge** — `tid` claim in JWT maps to institution UUID; schema resolved at request time, never from JWT
- **Subdomain routing** — Each school gets its own subdomain (e.g., `rk.erpsaas.in`)
- **Scalability** — Architecture supports unlimited schools; each school is fully isolated

### 2. Authentication & Security (STRONG)
- **Dual JWT secrets** — Separate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` with type enforcement (`tokenType` claim)
- **Token type discrimination** — Access tokens cannot be used as refresh tokens and vice versa
- **MFA support** — TOTP-based MFA with QR code setup (`mfa.service.ts`, `MfaSetupPage.tsx`, `MfaVerifyScreen.tsx`)
- **Session management** — Session table with device tracking, IP logging
- **Keycloak SSO integration** — Per-tenant Keycloak realms for enterprise SSO
- **Rate limiting** — Tiered: 20 req/15min for auth, 100 req/min for API, 10 req/15min for root admin login
- **Brute-force protection** — `auth.rate-limiter.service.ts` with progressive lockout
- **Audit logging** — `auth.audit.service.ts` tracks all auth events
- **Password security** — bcrypt with salt factor 12, known weak secret detection in env validation
- **XSS protection** — `xssSanitize` middleware on all requests
- **HPP protection** — HTTP Parameter Pollution prevention
- **Helmet** — Security headers on all responses
- **CORS** — Strict origin allowlist with subdomain regex support; wildcard forbidden in production
- **Boot guard** — `boot-guard.ts` validates secrets before server starts

### 3. RBAC System (PARTIALLY ENFORCED)
- **RBACEngine** — Pure in-memory O(1) Set-based permission/role checks
- **RBACResolver** — Resolves user permissions from DB with Redis caching
- **RBACCache** — Redis-backed permission cache with TTL
- **Shadow mode** — RBAC context attached to every request without blocking (Stage 0)
- **Dual-mode enforcement** — `RBAC_ENFORCE_STUDENT=true/false` and `RBAC_ENFORCE_USER_MGMT=true/false` env flags for gradual rollout
- **Permission mapping** — Legacy permission keys mapped to RBAC keys during migration
- **Platform RBAC** — Separate middleware for root admin routes

### 4. School Module — Core Features (WORKING)
- **Student Management** — Full CRUD: admit, enroll, bulk admit, search, update, soft delete
- **Attendance System** — Mark, bulk mark, update, delete, lock, audit trail, holiday validation, backdated limits, leave integration, summary recalculation
- **Examination System** — Create exams, schedules, enter marks, grade calculation, statistics
- **Academic Management** — Academic sessions, classes, sections, subjects, curriculum, lesson plans
- **Timetable** — Manual slot management + **AI-powered auto-generation** with constraint relaxation algorithm (5 levels: STRICT → EMERGENCY), teacher conflict detection, weekly off days, break/lunch slots
- **User Management** — Create teachers, students, staff, parents with Keycloak sync, plan-scoped permissions
- **Dashboard** — Aggregated stats endpoint
- **Navigation** — Dynamic permission-based sidebar

### 5. Resilience Engineering (ENTERPRISE-GRADE)
- **DB Circuit Breaker** — CLOSED/OPEN/HALF_OPEN states, failure threshold (5), latency threshold (3000ms), 30s recovery window
- **Redis Degradation Service** — Graceful fallback when Redis is unavailable
- **Queue Pressure Service** — Bull queue backpressure management
- **Graceful Shutdown** — SIGTERM/SIGINT handlers with queue drain and Redis disconnect
- **Tenant Isolation Guard** — Prevents cross-tenant data leakage under load

### 6. Observability (GOOD)
- **Structured logging** — JSON structured logs with request IDs
- **Health routes** — `/health` endpoint with DB, Redis, queue status
- **Metrics** — Request latency, RBAC resolution time, cache hit/miss
- **Go-live dashboard** — Real-time system status
- **Telemetry** — `TenantShadowTelemetry` tracks RBAC resolution, tenant activation events

### 7. Queue System (WORKING)
- **Bull + Redis** — Job queue for attendance processing, system maintenance
- **AttendanceQueueService** — Async attendance summary recalculation
- **SystemQueueService** — Cron-like maintenance tasks
- **EventController** — Internal event bus

### 8. Super Admin Panel (WORKING)
- **Institution management** — Create, list, manage schools
- **Plan management** — Create/edit subscription plans with module bundles
- **Role templates** — Global role templates applied during tenant provisioning
- **Permission management** — Global permission catalog
- **Access bundles** — Feature flag bundles per plan
- **Global holidays** — Platform-wide holiday calendar

### 9. Environment Validation (ENTERPRISE-GRADE)
- **Zod schema validation** — All env vars validated at startup
- **Fail-fast in production** — `enforce` mode exits process on validation failure
- **Security bypass flags hardcoded false in production** — `DEBUG_MODE`, `SKIP_TENANT_VALIDATION` cannot be overridden in staging/production
- **Weak secret detection** — Known weak JWT secrets rejected
- **SSL enforcement** — DB SSL required in production
- **CORS wildcard forbidden** — In staging/production

---

## ❌ CRITICAL ISSUES — MUST FIX BEFORE SCALING

### CRITICAL-1: Zero Automated Tests
**Severity: CRITICAL**  
**Impact: Cannot safely scale to multiple schools**

```
server/package.json:
"test": "echo \"Error: no test specified\" && exit 1"
```

There are NO unit tests, NO integration tests, NO e2e tests. The project has:
- Manual validation scripts (`validate-rbac.ts`, `smoke-test.ts`, etc.) — these are one-off scripts, not automated tests
- No Jest/Mocha/Vitest test suite
- No CI/CD pipeline visible

**Risk:** Any code change can silently break attendance, exam marks, or student enrollment for ALL schools simultaneously.

**Fix Required:**
```bash
# Minimum viable test suite needed:
- Unit tests: RBACEngine, TenantService, StudentService, ExaminationService
- Integration tests: Auth flow, Tenant provisioning, Attendance marking
- E2E tests: Login → Mark attendance → Save → Verify
```

---

### CRITICAL-2: RBAC Not Fully Enforced — Feature Flags Still Off
**Severity: HIGH**  
**Impact: Authorization bypass possible**

```typescript
// student.routes.ts
function studentPermission(...permissions: string[]) {
    const useRBAC = process.env.RBAC_ENFORCE_STUDENT === 'true'; // ← DEFAULT: false
    if (useRBAC) { return rbacRequirePermission(...) }
    else { return legacyRequirePermissionOrRole(permissions, ['Admin']); } // ← FALLBACK
}
```

Both `RBAC_ENFORCE_STUDENT` and `RBAC_ENFORCE_USER_MGMT` default to `false`. This means:
- The new RBAC system is built but NOT enforcing on most routes
- Legacy middleware is still the active guard
- Timetable route is a **stub**: `router.use('/timetable', (req, res) => res.json({ message: 'Timetable API' }))` — no auth guard at all

**Fix Required:**
```bash
# In .env for production:
RBAC_ENFORCE_STUDENT=true
RBAC_ENFORCE_USER_MGMT=true
# And remove the timetable stub — wire real routes
```

---

### CRITICAL-3: Fees Module Completely Missing
**Severity: HIGH**  
**Impact: Schools cannot collect fees — core school function**

```typescript
// navigation.ts — commented out:
// { id: 'fees', label: 'Fees', path: '/fees', icon: 'CreditCard', permission: 'fees.view' }
```

The fees module is:
- Commented out of navigation
- No backend routes exist for fees
- No database models for fees
- No fee collection, fee structure, payment tracking, receipts, or dues management

**This is a core school management function.** Schools cannot use this system for fee management.

---

### CRITICAL-4: No Email/Notification System
**Severity: HIGH**  
**Impact: No password reset, no admission notifications, no exam alerts**

```
server/src/modules/shared/notification/  ← directory exists but...
```

There is a notification directory but no actual email service implementation. This means:
- New users get a `tempPassword` but there's no way to deliver it to them
- No password reset emails
- No admission confirmation emails
- No exam schedule notifications
- No attendance alerts to parents

---

### CRITICAL-5: Timetable Frontend Missing
**Severity: HIGH**  
**Impact: Timetable backend is complete but unusable**

```typescript
// navigation.ts — commented out:
// { id: 'timetable', label: 'Timetable', path: '/timetable', icon: 'Calendar' }
```

The timetable backend is **extremely sophisticated** (auto-generation with 5-level constraint relaxation, teacher conflict detection, calendar integration) but:
- Frontend page doesn't exist
- Navigation item is commented out
- Backend route is a stub returning `{ message: 'Timetable API' }`

---

## ⚠️ HIGH PRIORITY ISSUES

### HIGH-1: ExamsPage Frontend — Field Mismatch with Backend
**Severity: HIGH**

```typescript
// ExamsPage.tsx sends:
{ title, subject, date, duration, totalMarks }

// ExaminationService.createExam() expects:
{ name, code, type, academic_year_id, start_date, end_date }
```

The frontend exam creation form sends completely different fields than what the backend expects. `title` vs `name`, no `type` field (required enum), no `academic_year_id`. This means **exam creation will fail** in production.

---

### HIGH-2: Student Search Route Conflict
**Severity: HIGH**

```typescript
// student.routes.ts — ORDER BUG:
router.get('/:id', ...)        // Line 1 — catches /search as id="search"
router.get('/search', ...)     // Line 2 — NEVER REACHED
```

The comment says "must be before /:id to avoid route conflict" but the routes are in the WRONG ORDER. `/students/search` will be caught by `/:id` with `id="search"`, causing a DB lookup for a student with ID "search" which will always return 404.

---

### HIGH-3: Attendance Page Missing Academic Year Context
**Severity: HIGH**

```typescript
// AttendancePage.tsx
const { data } = useGetDailyAttendanceQuery(
    { date: selectedDate, sectionId: sectionId || undefined },
    // ← No academicYearId passed!
);
```

The attendance backend requires `academicYearId` for validation (session lock check, holiday check, session bounds check). The frontend doesn't pass it, which will cause validation failures or incorrect behavior.

---

### HIGH-4: Mark.enterMarks() — section_id Bug
**Severity: HIGH**

```typescript
// examination.service.ts
await Mark.schema(tenant.db_schema).upsert({
    section_id: schedule.class_id,  // ← BUG: should be schedule.section_id
    ...
```

`section_id` is being set to `class_id` value. This is a data integrity bug that will corrupt exam mark records.

---

### HIGH-5: UserManagementService — Missing Student/Staff/Parent Profile Creation
**Severity: HIGH**

```typescript
// user-management.service.v3.ts
if (userType === RoleType.TEACHER) {
    await this.teacherRepo.create({ ... });
}
// Student/Staff/Parent profiles handled similarly using respective repositories
// ← COMMENT ONLY — NO ACTUAL CODE
```

Only Teacher profile creation is implemented. Student, Staff, and Parent profile creation is commented as "handled similarly" but the code doesn't exist. Creating a student via User Management won't create a Student record.

---

### HIGH-6: Multiple Service Versions — Technical Debt
**Severity: MEDIUM-HIGH**

```
services/user-management.service.ts    ← v1
services/user-management.service.v2.ts ← v2  
services/user-management.service.v3.ts ← v3 (current)
```

Three versions of the same service exist. It's unclear which version is actually being used by the controller. This creates maintenance confusion and potential for bugs if the wrong version is imported.

---

## ⚠️ MEDIUM PRIORITY ISSUES

### MEDIUM-1: Parent Module — No Frontend
