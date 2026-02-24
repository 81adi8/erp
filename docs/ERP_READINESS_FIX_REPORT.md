# ERP Readiness Fix Report

**Date:** 2026-02-18  
**Baseline Score:** 39/100  
**Status:** All Critical and High blockers addressed

---

## Summary of Fixes Applied

This report documents every change made to resolve the blockers identified in the ERP Readiness Audit.

---

## CRITICAL Fixes

### FIX-C1: Root Admin Auth Chain — `authGuard` replaced with `rootAuthGuard`

**Problem:**  
Root-admin protected APIs (`/v1/root/admin/config`, `/admins`, `/plans`, etc.) were wired through `authGuard`, which hard-fails with `403 TENANT_INVALID` when `req.tenant` is missing. The root-admin route chain (`/v1/root/admin/*`) has **no tenant middleware**, so `req.tenant` is always `undefined` there. Every protected root-admin operation failed post-login.

**Root Cause:**  
`authGuard` (line 99) checks `if (!tenant) return next(new ApiError(403, 'TENANT_INVALID'))`. Root routes have no tenant context by design.

**Fix:**  
Created `server/src/core/middleware/rootAuthGuard.ts` — a JWT guard identical to `authGuard` but **without the tenant context check**. Root identity is verified by `rootAuthMiddleware` (DB lookup of Admin model + session validity). `rootAuthGuard` is the JWT gate; `rootAuthMiddleware` is the DB gate.

**Files Changed:**

- `server/src/core/middleware/rootAuthGuard.ts` ← **NEW**
- `server/src/modules/super-admin/routes/root-admin/index.ts` — replaced all `authGuard` with `rootAuthGuard`
- `server/src/modules/super-admin/routes/root-admin/auth.routes.ts` — replaced `authGuard` with `rootAuthGuard`

---

### FIX-C2: `is_main` Token Claim Minted by Root Auth Controller

**Problem:**  
`auth.controller.ts` (root login) included `is_main: admin.is_main` in the JWT payload. `authGuard` (TASK-E1.1 hardening) rejects **any** token carrying `is_main` with `401 INVALID_TOKEN`. This invalidated root admin sessions immediately on any guarded endpoint.

**Fix:**  
Removed `is_main`, `role`, and `permissions` from the token payload in `RootAuthController.login`. These are now DB-resolved at request time via `rootAuthMiddleware` (which already does an `Admin.findOne` DB lookup). The token now only carries `{ userId, sessionId, type: 'admin' }`.

**Files Changed:**

- `server/src/modules/super-admin/controllers/root/auth.controller.ts`

---

### FIX-C3: Attendance Frontend Broken Imports & Path Mismatches

**Problem (Imports):**  
`AttendancePage.tsx` imported `useGetSectionsQuery`, `useGetDailyAttendanceQuery`, `useBulkMarkStudentAttendanceMutation` from `attendanceApi.ts`. These hooks were exported correctly, so the import issue was actually the **path mismatch** causing runtime 404s that looked like broken wiring.

**Problem (Paths):**  
Frontend called:

- `GET /school/attendance/daily` → **404** (backend: `/school/attendance/students/daily`)
- `POST /school/attendance/bulk` → **404** (backend: `/school/attendance/students/bulk-mark`)
- `GET /school/attendance/summary` → **404** (backend: `/school/attendance/students/:studentId/summary`)

**Fix:**  
Rewrote `attendanceApi.ts` with correct backend paths:

- `GET /school/attendance/students/daily`
- `POST /school/attendance/students/bulk-mark`
- `GET /school/attendance/students/:studentId/summary`
- Added `GET /school/attendance/dashboard/stats` endpoint

**Files Changed:**

- `client/apps/school/src/tenant-modules/school/api/attendanceApi.ts`

---

## HIGH Priority Fixes

### FIX-H1: Exam Path Double-Prefix

**Problem:**  
Backend mounts examination routes at `router.use('/exams', examinationRoutes)` in `school/routes/index.ts`. The examination router itself had routes prefixed with `/exams` (e.g., `router.get('/exams', ...)`), creating double-prefix paths: `/school/exams/exams`, `/school/exams/exams/:id`, etc. Frontend called `/school/exams/*` which resolved to 404.

**Fix:**  
Removed the `/exams` prefix from all routes inside `examination.routes.ts`. Routes now use `/`, `/:id`, `/:id/status`, etc. — the mount point provides the `/exams` prefix.

**Files Changed:**

- `server/src/modules/school/examination/routes/examination.routes.ts`

---

### FIX-H2: Student/Teacher API Contract Mismatches

**Problem:**

- Frontend `teachersApi.ts` calls `POST /school/teachers` to create a teacher → backend only had `POST /school/users/teachers` → **404**
- Frontend `teachersApi.ts` calls `PATCH /school/teachers/:id` to update → backend only had `PUT /school/teachers/:id` → **405 Method Not Allowed**
- Frontend `studentsApi.ts` calls `PUT /school/students/:id` → backend had `PUT /school/students/:id` ✓ (already correct)

**Fix:**  
Added to `user-management.routes.ts`:

- `POST /teachers` — alias for `POST /users/teachers` (frontend contract)
- `PATCH /teachers/:id` — alias for `PUT /teachers/:id` (frontend uses PATCH)

**Files Changed:**

- `server/src/modules/school/routes/user-management.routes.ts`

---

### FIX-H3: Dashboard Stats Table Naming/Casing

**Problem:**  
Raw SQL queries in `dashboard.routes.ts` used PascalCase table names (`"Students"`, `"Users"`, `"UserRoles"`, `"Attendances"`, `"Sections"`). PostgreSQL is case-sensitive for quoted identifiers. Sequelize creates tables with lowercase snake_case names. All queries failed at runtime with "relation does not exist".

**Correct table names (from model definitions):**
| Wrong (PascalCase) | Correct (snake_case) |
|---|---|
| `"Students"` | `"students"` |
| `"Users"` | `"users"` |
| `"UserRoles"` | `"user_roles"` |
| `"Attendances"` | `"student_attendances"` |
| `"Sections"` | `"sections"` |

**Files Changed:**

- `server/src/modules/school/routes/dashboard.routes.ts`

---

### FIX-H4: Super-Admin Missing Endpoints

**Problem:**  
Frontend institution API called:

- `PATCH /institutions/:id` → **404** (missing)
- `DELETE /institutions/:id` → **404** (missing)
- `PATCH /institutions/:id/status` → **404** (missing)

Frontend dashboard API called:

- `GET /dashboard/stats` → **404** (missing)
- `GET /dashboard/health` → **404** (missing)

All missing endpoints caused mock fallbacks in the UI, hiding real backend failures.

**Fix:**

**Institution routes** — added PATCH, PUT, DELETE, and status endpoints:

- `server/src/modules/super-admin/routes/institutions/index.ts`

**Institution controller** — added `update`, `updateStatus`, `delete` methods:

- `server/src/modules/super-admin/controllers/institution/institution.controller.ts`

**Institution service** — added `updateStatus`, `delete`, `getDashboardStats` methods:

- `server/src/modules/super-admin/services/institution.service.ts`

**Dashboard routes** — new file with `/stats` and `/health` endpoints:

- `server/src/modules/super-admin/routes/dashboard/index.ts` ← **NEW**

**Super-admin router** — wired dashboard router:

- `server/src/modules/super-admin/routes/index.ts`

---

### FIX-H5: Tenant Auth Routes Missing forgot-password/reset-password/mfa

**Problem:**  
Frontend `authApi.ts` calls:

- `POST /auth/forgot-password` → **404**
- `POST /auth/reset-password` → **404**
- `POST /auth/mfa/verify` → **404**
- `POST /auth/mfa/setup` → **404**

The tenant auth router (`/v1/tenant/auth/*`) only exposed: register, login, refresh, me, logout, logout-all, sessions, revoke-session, change-password.

**Fix:**  
Added all four missing endpoints to `auth.routes.ts`. If the controller doesn't implement them yet, they return `501 Not Implemented` (a real HTTP response) instead of `404 Not Found`. This eliminates silent failures and allows the frontend to show proper error messages.

**Files Changed:**

- `server/src/modules/tenant/routes/auth.routes.ts`

---

## Files Changed Summary

| File                                                                               | Change Type | Fix                                                      |
| ---------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------- |
| `server/src/core/middleware/rootAuthGuard.ts`                                      | **NEW**     | FIX-C1: Root auth guard without tenant dependency        |
| `server/src/modules/super-admin/routes/root-admin/index.ts`                        | Modified    | FIX-C1: authGuard → rootAuthGuard                        |
| `server/src/modules/super-admin/routes/root-admin/auth.routes.ts`                  | Modified    | FIX-C1: authGuard → rootAuthGuard                        |
| `server/src/modules/super-admin/controllers/root/auth.controller.ts`               | Modified    | FIX-C2: Remove is_main from token payload                |
| `client/apps/school/src/tenant-modules/school/api/attendanceApi.ts`                | Modified    | FIX-C3: Fix attendance API paths                         |
| `server/src/modules/school/examination/routes/examination.routes.ts`               | Modified    | FIX-H1: Remove /exams double-prefix                      |
| `server/src/modules/school/routes/user-management.routes.ts`                       | Modified    | FIX-H2: Add POST /teachers + PATCH /teachers/:id aliases |
| `server/src/modules/school/routes/dashboard.routes.ts`                             | Modified    | FIX-H3: Fix table name casing in raw SQL                 |
| `server/src/modules/super-admin/routes/institutions/index.ts`                      | Modified    | FIX-H4: Add PATCH/DELETE/status routes                   |
| `server/src/modules/super-admin/controllers/institution/institution.controller.ts` | Modified    | FIX-H4: Add update/updateStatus/delete methods           |
| `server/src/modules/super-admin/services/institution.service.ts`                   | Modified    | FIX-H4: Add updateStatus/delete/getDashboardStats        |
| `server/src/modules/super-admin/routes/dashboard/index.ts`                         | **NEW**     | FIX-H4: Super-admin dashboard stats/health routes        |
| `server/src/modules/super-admin/routes/index.ts`                                   | Modified    | FIX-H4: Wire dashboard router                            |
| `server/src/modules/tenant/routes/auth.routes.ts`                                  | Modified    | FIX-H5: Add forgot-password/reset-password/mfa routes    |

---

## Pass 2 — Full Remaining Items Fix

### FIX-P2-1: examinationApi.ts Path Namespace Fixed

All 16 endpoints in `client/apps/school/src/core/api/endpoints/examinationApi.ts` were calling `/school/examination/*`. Backend mounts at `/school/exams/*`. Every exam API call was 404. All paths corrected to `/school/exams/*`.

### FIX-P2-2: Student PATCH Route Added

`student.routes.ts` only had `PUT /:id`. Frontend `studentsApi.ts` calls `PATCH /school/students/:id`. Added `PATCH /:id` alias pointing to same `StudentController.updateStudent`.

### FIX-P2-3: CSRF Protection in authGuard

`authGuard` had no CSRF validation for cookie-based tokens. Added double-submit cookie pattern: when token comes from `access_token` or `auth_token` cookie, validates `X-CSRF-Token` header matches `csrf_token` cookie. Bearer token paths exempt.

### FIX-P2-4: Legacy Admin Bypass Removed

`requireRole()` in `permission.middleware.ts` had `if (!hasRole && userRoleNames.includes('admin')) return next()` — granting all Admin users access to any role-guarded route. Removed. Admin access now requires explicit inclusion in `requiredRoles`.

### FIX-P2-5: Forgot-Password / Reset-Password / MFA Controller Logic

Added real controller implementations for `forgotPassword`, `resetPassword`, `verifyMfa`, `setupMfa` in `tenant/controllers/auth.controller.ts`. Each delegates to `AuthService` if the method exists, otherwise returns `501 Not Implemented` (not 404). Forgot-password always returns 200 regardless of email existence (security).

### FIX-P2-6: Fee Management Module

**New files:**

- `server/src/modules/school/routes/fees.routes.ts` — full CRUD for categories, structures, payments, summary stats
- `server/src/database/migrations/20260219_missing_modules_fees_notices_institution_id.sql` — creates `fee_categories`, `fee_structures`, `fee_payments`, `fee_receipts` tables

Mounted at `/school/fees` in school router.

### FIX-P2-7: Notices / Announcements Module

**New file:** `server/src/modules/school/routes/notices.routes.ts` — GET (published), GET /all (admin), POST, PATCH, DELETE with soft-delete. Mounted at `/school/notices`.

### FIX-P2-8: Parent Portal Routes

**New file:** `server/src/modules/school/routes/parent-portal.routes.ts` — mounted at `/school/parent-portal`. Provides:

- `GET /children` — list linked children
- `GET /students/:id/attendance` — child's attendance (last 90 days)
- `GET /students/:id/fees` — child's fee records (permission-gated)
- `GET /students/:id/marks` — child's exam marks (permission-gated)
- `GET /notices` — notices for parents
- `POST /link` — admin: link parent to student

All endpoints verify parent-student access via `parent_portal_access` table.

### FIX-P2-9: Accountant Role + Permissions

**New file:** `server/src/database/seeders/accountant-role.seeder.ts` — creates `Accountant` role with 11 permissions covering fee management, student view, notices view, dashboard view. Idempotent (upsert pattern).

### FIX-P2-10: institution_id Missing in School Models (DB Migration)

Added `ALTER TABLE IF EXISTS ... ADD COLUMN IF NOT EXISTS institution_id` for: `chapters`, `topics`, `session_holidays`, `schools`, `student_parents`. In same migration file as fee tables.

### FIX-P2-11: Tenant Claim Canonical UUID Standardization

`authGuard` now detects whether `tokenTid` is a valid UUID (regex check). If it's a schema name (legacy token), logs telemetry warning but allows through during migration period. If it's a UUID but mismatches `tenant.id`, hard-fails with `TENANT_TOKEN_MISMATCH`. Prevents lockout during token migration.

### FIX-P2-12: New Routes Wired into School Router

`server/src/modules/school/routes/index.ts` updated to mount:

- `/fees` → `fees.routes.ts`
- `/notices` → `notices.routes.ts`
- `/parent-portal` → `parent-portal.routes.ts`

---

## Remaining Work (Not Fixed — Requires Larger Scope)

The following items from the audit require significant new development and were **not** addressed in either fix pass:

| Item                                      | Reason Not Fixed                                                   |
| ----------------------------------------- | ------------------------------------------------------------------ |
| ID card generation                        | Requires PDF generation library + template system + storage        |
| Admit card module                         | Requires exam schedule integration + PDF generation                |
| Mock fallbacks in admission bulk import   | Requires real file parser + server-side pipeline                   |
| Mock fallbacks in super-admin UI          | Requires disabling mock data in production build config            |
| AuthService.forgotPassword implementation | Email service integration needed (SMTP/SendGrid)                   |
| AuthService.verifyMfa / setupMfa          | TOTP library integration needed (speakeasy/otplib)                 |
| Parent role RBAC permissions              | Needs explicit permission matrix (currently access-table based)    |
| Tenant claim full UUID migration          | All existing tokens need re-issue; requires coordinated deployment |

---

## Verification Checklist

After deploying these fixes, verify:

- [ ] Root admin login → protected routes (config, admins, plans) return 200, not 403
- [ ] Root admin token does NOT contain `is_main` field
- [ ] `GET /school/attendance/students/daily` returns 200 (not 404)
- [ ] `POST /school/attendance/students/bulk-mark` returns 200 (not 404)
- [ ] `GET /school/exams` returns exam list (not 404 from double-prefix)
- [ ] `POST /school/teachers` creates teacher (not 404)
- [ ] `PATCH /school/teachers/:id` updates teacher (not 405)
- [ ] `GET /school/dashboard/stats` returns real data (not SQL error)
- [ ] `PATCH /v1/root/admin/institutions/:id` updates institution (not 404)
- [ ] `DELETE /v1/root/admin/institutions/:id` deletes institution (not 404)
- [ ] `PATCH /v1/root/admin/institutions/:id/status` toggles status (not 404)
- [ ] `GET /v1/root/admin/dashboard/stats` returns real stats (not mock)
- [ ] `POST /v1/tenant/auth/forgot-password` returns 501 (not 404)
- [ ] `POST /v1/tenant/auth/mfa/verify` returns 501 (not 404)
