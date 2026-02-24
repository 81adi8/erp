# FRONTEND EXECUTION AUDIT — TASK-F1

**Audit Date:** 2026-02-18
**Auditor Role:** Lead Frontend Auditor
**Scope:** Functional + Integration audit — does frontend actually work with backend for real school operations?
**NOT:** UI design review, redesign suggestions, feature additions.

---

## PHASE 1 — BUILD & RUNTIME CHECK

### Build Configuration

**school app** (`client/apps/school`):

- Vite + React + TypeScript
- `VITE_API_BASE_URL` defaults to `http://localhost:3000/api/v1/tenant` — correct for tenant routes
- Code-splitting: ✅ Lazy-loaded portal routes (`AdminRoutes`, `TeacherRoutes`, `StudentRoutes`, `StaffRoutes`)
- Tenant module loading: ✅ Dynamic import via `loadTenantModule(tenant.type)`

**Risks:**

- `VITE_API_BASE_URL` hardcoded default points to `/api/v1/tenant` — but auth routes live at `/api/v1/auth` (different prefix). The `authApi.ts` calls `/auth/login` which resolves to `http://localhost:3000/api/v1/tenant/auth/login` — **WRONG**. Backend auth is at `/api/v1/auth/login`.
- `authApi.ts` line 120: raw `fetch()` call hardcodes `http://localhost:3000/api/v1/tenant` for navigation fetch — will break in production.
- `keycloakLogin` mutation references `authData.tokens` (line ~170) which does not exist on `AuthResponse` type — TypeScript error at runtime.

**Bundle Risk:** LOW — lazy loading is properly implemented. No blocking renders at root level.

**Build Health:** ⚠️ WILL BUILD but auth API base URL mismatch will cause login failures in any non-localhost environment.

---

## PHASE 2 — AUTH FLOW VALIDATION

### Login Flow Trace

```
User enters email/password
  → POST {VITE_API_BASE_URL}/auth/login
  ⚠️  RESOLVES TO: /api/v1/tenant/auth/login  (WRONG)
  ✅  SHOULD BE:   /api/v1/auth/login

  IF URL were correct:
    → Server returns { user, accessToken, refreshToken, expiresIn, storageMode }
    → authApi.onQueryStarted stores tokens via secureStorage
    → Fetches navigation: raw fetch() to hardcoded localhost URL ← BREAKS IN PROD
    → Stores permissions, navigation, roles in SecureStorage
    → Redirects to dashboard
```

### Token Storage

- **localStorage mode:** Token stored as base64-encoded JSON with checksum. Not encrypted — XSS accessible.
- **httpOnly cookie mode:** Marker `HTTPONLY_MARKER` stored in localStorage. Actual token in cookie.
- **Dual-mode support:** ✅ Properly implemented. `storageMode` from server response drives behavior.

### Refresh Flow

- `baseQueryWithReauth` intercepts 401 → attempts refresh
- ✅ Infinite loop prevention: skips refresh if URL contains `/auth/refresh`
- ✅ Redirects to `/login` on refresh failure
- ⚠️ `window.location.href = '/login'` — hard redirect loses React Router state. Should use `navigate('/login')`.

### Logout

- ✅ `secureStorage.clearAuthData()` called in `finally` block — always clears even if API fails
- ✅ Invalidates `AUTH` and `NAVIGATION` tags

### Session Expiry

- `PermissionProvider` polls `/auth/me` every 5 minutes
- ⚠️ No proactive token expiry check — relies on 401 response to trigger refresh
- ⚠️ `checkHasAuth()` runs every 500ms via `setInterval` — unnecessary CPU usage, should use storage event listener only

### MFA Flow

- ❌ **NO MFA UI EXISTS** in school frontend. Backend has `/auth/mfa/setup`, `/auth/mfa/verify` routes (E1.1). Frontend has no MFA screens, no MFA challenge handling. Admin login will fail silently if MFA is enforced server-side.

### Auth Breakpoints

| Breakpoint                                 | Status                |
| ------------------------------------------ | --------------------- |
| Login URL mismatch (tenant vs auth prefix) | ❌ BROKEN             |
| Navigation fetch hardcoded localhost       | ❌ BROKEN IN PROD     |
| MFA challenge handling                     | ❌ MISSING            |
| Refresh loop prevention                    | ✅ OK                 |
| Logout cleanup                             | ✅ OK                 |
| Token expiry redirect                      | ✅ OK (via 401)       |
| Cross-tab auth sync                        | ✅ OK (storage event) |

---

## PHASE 3 — API INTEGRATION MAPPING

### Base URL Analysis

| App         | VITE_API_BASE_URL default | Auth routes at      | Mismatch?          |
| ----------- | ------------------------- | ------------------- | ------------------ |
| school      | `/api/v1/tenant`          | `/api/v1/auth`      | ❌ YES             |
| super_admin | (separate config)         | `/api/v1/root/auth` | needs verification |

### School App — Frontend → Backend Route Map

| Frontend Action      | Frontend API Call                   | Backend Route                               | Exists?                         | Response Handled? |
| -------------------- | ----------------------------------- | ------------------------------------------- | ------------------------------- | ----------------- |
| Login                | POST `/auth/login`                  | POST `/api/v1/auth/login`                   | ✅                              | ✅                |
| Logout               | POST `/auth/logout`                 | POST `/api/v1/auth/logout`                  | ✅                              | ✅                |
| Refresh token        | POST `/auth/refresh`                | POST `/api/v1/auth/refresh`                 | ✅                              | ✅                |
| Get current user     | GET `/auth/me`                      | GET `/api/v1/auth/me`                       | ✅                              | ✅                |
| Get students         | GET `/school/students`              | GET `/api/v1/tenant/school/students`        | ✅                              | ✅                |
| Create student       | POST `/school/students`             | POST `/api/v1/tenant/school/students/admit` | ⚠️ URL MISMATCH                 |                   |
| Update student       | PUT `/school/students/:id`          | PUT `/api/v1/tenant/school/students/:id`    | ✅                              | ✅                |
| Delete student       | DELETE `/school/students/:id`       | DELETE `/api/v1/tenant/school/students/:id` | ✅                              | ✅                |
| Bulk delete students | POST `/school/students/bulk-delete` | ❌ NOT IN ROUTES                            | ❌ 404                          | ❌                |
| Search students      | GET `/school/students/search`       | GET `/school/students/search`               | ⚠️ Route order bug (after /:id) |                   |
| Get navigation       | GET `/school/navigation`            | needs verification                          | ❓                              |                   |
| Mark attendance      | (AttendancePage is stub)            | exists in backend                           | ❌ NOT WIRED                    |                   |
| Get exams            | (ExamsPage is stub)                 | exists in backend                           | ❌ NOT WIRED                    |                   |
| Get teachers         | GET `/school/teachers`              | needs verification                          | ❓                              |                   |
| Get classes          | GET `/school/classes`               | needs verification                          | ❓                              |                   |
| Fees                 | (directory exists, no content)      | no backend route found                      | ❌ FAKE                         |                   |
| Timetable            | (commented out in nav)              | backend exists                              | ❌ HIDDEN                       |                   |
| Analytics            | (commented out in nav)              | no backend                                  | ❌ FAKE                         |                   |
| Dashboard stats      | HARDCODED (1,234 students etc.)     | no API call                                 | ❌ FAKE DATA                    |                   |
| MFA setup            | ❌ no UI                            | POST `/auth/mfa/setup`                      | ❌ NOT WIRED                    |                   |
| MFA verify           | ❌ no UI                            | POST `/auth/mfa/verify`                     | ❌ NOT WIRED                    |                   |

### Critical Mismatches

1. **Student create:** Frontend calls `POST /school/students`, backend route is `POST /school/students/admit` — different URL, different payload schema.
2. **Bulk delete:** Frontend calls `POST /school/students/bulk-delete` — this route does NOT exist in `student.routes.ts`.
3. **Dashboard stats:** All numbers (1,234 students, 87 teachers, 94.5% attendance) are **hardcoded static strings** — no API call made.
4. **Attendance page:** Renders only `<h1>Attendance</h1>` — zero API integration.
5. **Exams page:** Renders only `<h1>Exams</h1>` — zero API integration.

---

## PHASE 4 — RBAC & ROUTE GUARD AUDIT

### Route Protection

```
AppRouter:
  TenantGuard (outer) → validates tenant subdomain
    GuestGuard → /login, /register, /admin (guest only)
    AuthGuard → /* (requires token)
      TenantModuleContent → loads school/university/coaching module
        SchoolRoutes:
          PortalGuard → admin/teacher/student/staff portals
```

### AuthGuard Analysis

- ✅ Checks `secureStorage.getAuthToken()` — works for both localStorage and httpOnly modes
- ⚠️ **Token presence ≠ token validity.** Guard only checks if token string exists, not if it's expired. An expired token passes the guard, then fails on first API call (401 → refresh).
- ⚠️ Logic bug: `if (!redirectTo && location.pathname.startsWith('/admin') && tenant?.type === 'school')` redirects to `/admin/dashboard` instead of `/admin` (login page). Authenticated users trying to access `/admin` get redirected to dashboard — correct. But the comment says "redirect to /admin (which is the admin login)" — contradicts the code.

### PermissionGuard / PortalGuard

- `PortalGuard` wraps each portal (admin, teacher, student, staff)
- Uses `usePermission()` from `PermissionProvider`
- ✅ `isAdmin` check grants all permissions — correct for admin portal
- ⚠️ `PermissionProvider` calls `useTenant()` inside a try/catch — React hook called conditionally. This violates Rules of Hooks and will cause React to throw in strict mode.

### Direct URL Navigation Bypass

- ⚠️ A user who knows `/admin/students` can navigate directly. `AuthGuard` checks token (passes if logged in as any role). `PortalGuard` checks portal permission. If `PortalGuard` is not implemented correctly, teacher could access admin portal.
- Feature flag UI hiding: navigation items are hidden via `permission` field in `schoolNavigation` — but this is UI-only. Backend RBAC enforces actual access. UI hiding is cosmetic, not security.

### Route Security Map

| Route           | Guard                   | Backend Enforced? | Risk           |
| --------------- | ----------------------- | ----------------- | -------------- |
| `/login`        | GuestGuard              | N/A               | ✅             |
| `/admin`        | GuestGuard              | N/A               | ✅             |
| `/admin/*`      | AuthGuard + PortalGuard | ✅ RBAC           | ✅             |
| `/teacher/*`    | AuthGuard + PortalGuard | ✅ RBAC           | ✅             |
| `/student/*`    | AuthGuard + PortalGuard | ✅ RBAC           | ✅             |
| `/staff/*`      | AuthGuard + PortalGuard | ✅ RBAC           | ✅             |
| Dashboard stats | AuthGuard               | N/A (hardcoded)   | ⚠️ Fake data   |
| Fees            | AuthGuard               | No backend        | ⚠️ Fake module |

---

## PHASE 5 — MODULE REALITY CHECK

| Module                 | UI Exists        | Backend Exists    | API Wired         | Fully Working |
| ---------------------- | ---------------- | ----------------- | ----------------- | ------------- |
| Login / Auth           | ✅ Full UI       | ✅                | ⚠️ URL mismatch   | ❌            |
| Dashboard              | ✅ UI            | ❌ No API         | ❌ Hardcoded data | ❌            |
| Students (list/view)   | ✅ UI            | ✅                | ✅                | ✅            |
| Students (create)      | ✅ UI            | ✅                | ⚠️ URL mismatch   | ❌            |
| Students (bulk delete) | ✅ UI            | ❌ Route missing  | ❌                | ❌            |
| Teachers               | ✅ UI            | ✅                | ❓ Unverified     | ❓            |
| Classes                | ✅ UI            | ✅                | ❓ Unverified     | ❓            |
| Attendance             | ✅ Nav item      | ✅ Backend        | ❌ Stub page only | ❌            |
| Exams                  | ✅ Nav item      | ✅ Backend        | ❌ Stub page only | ❌            |
| Marks / Results        | ❌ No UI         | ✅ Backend        | ❌                | ❌            |
| Fees                   | ✅ Directory     | ❌ No backend     | ❌ Empty dir      | ❌            |
| Timetable              | ❌ Hidden in nav | ✅ Backend        | ❌                | ❌            |
| Analytics              | ❌ Hidden in nav | ❌ No backend     | ❌                | ❌            |
| Reports                | ❌ No UI         | ❌ No backend     | ❌                | ❌            |
| Notifications          | ❌ No UI         | ❌ No backend     | ❌                | ❌            |
| User Management        | ✅ UI            | ✅                | ❓ Unverified     | ❓            |
| Settings               | ✅ Nav item      | ❓                | ❓                | ❓            |
| MFA                    | ❌ No UI         | ✅ Backend (E1.1) | ❌                | ❌            |
| Session Management     | ❌ No UI         | ✅ Backend (E1.1) | ❌                | ❌            |

---

## PHASE 6 — STATE MANAGEMENT SAFETY

### Redux Store

- `sessionSlice`: Academic session ID persisted to `localStorage` directly (not via SecureStorage). Key: `erp_selected_academic_session`. Plain JSON — no encoding.
- `appearanceSlice`: Theme preference — non-sensitive, acceptable.
- `authSlice` (super_admin): Separate store, separate auth state.

### Tenant Switch Leakage Risk

- `SecureStorage` is tenant-scoped by `tenantId` prefix. ✅ Cross-tenant data bleed prevented at storage level.
- BUT: `getStoredTenantId()` scans all localStorage keys to find tenant — O(n) scan on every storage access. Performance risk with many keys.
- `DEFAULT_TENANT_ID = '_default_'` used when tenant not yet verified. If tokens stored under `_default_` and then tenant is verified, old tokens remain under `_default_` key — stale data accumulation.

### Stale User Session UI

- `PermissionProvider` polls `/auth/me` every 5 minutes. If permissions change server-side, UI updates within 5 minutes. Acceptable for pilot.
- ⚠️ No forced re-fetch on route change. If admin revokes a role, user sees stale permissions until next poll.

### Cross-Tenant UI Data Bleed

- RTK Query cache is global (single `createApi` instance). If user switches tenant (different subdomain), cached data from previous tenant remains in RTK Query cache until tags are invalidated.
- ⚠️ No `resetApiState()` called on tenant switch. Teacher list from School A could briefly appear in School B's UI.

---

## PHASE 7 — PRODUCTION BREAKPOINTS

| Scenario                        | UI Behavior                                                                                         | Verdict                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------ |
| Token expiry                    | 401 → refresh attempted → success → retry original request                                          | ✅ Handled               |
| Refresh token expiry            | 401 on refresh → `clearAuthData()` → redirect `/login`                                              | ✅ Handled               |
| RBAC deny (403)                 | No global 403 handler in `baseQueryWithReauth` — component receives error, likely shows blank/crash | ❌ Unhandled             |
| 500 API error                   | RTK Query sets `isError=true` — component must handle. Most stub pages don't.                       | ⚠️ Partial               |
| Slow API (>30s)                 | `timeout: 30000` in baseQuery — request aborts, component gets error                                | ✅ Timeout set           |
| Network drop                    | RTK Query retries not configured — single failure = error state                                     | ⚠️ No retry              |
| Tenant suspended                | No specific handling — API returns 403/404, UI shows blank                                          | ❌ No suspended state UI |
| MFA required (403 MFA_REQUIRED) | No MFA UI — user stuck at blank screen after login                                                  | ❌ CRITICAL              |

---

## PHASE 8 — PERFORMANCE

| Metric                                           | Finding                                      | Risk           |
| ------------------------------------------------ | -------------------------------------------- | -------------- |
| Initial load                                     | Lazy-loaded portals — good                   | ✅ LOW         |
| Dashboard render                                 | Hardcoded data — instant                     | N/A (fake)     |
| Student list (500 records)                       | RTK Query with pagination (default limit=10) | ✅ LOW         |
| `checkHasAuth()` every 500ms                     | Runs on every tick, reads localStorage       | ⚠️ MEDIUM      |
| `getStoredTenantId()` O(n) scan                  | Called on every `getSecureLocalStorage()`    | ⚠️ MEDIUM      |
| `PermissionProvider` polls `/auth/me` every 5min | 1 extra request per user per 5min            | ✅ ACCEPTABLE  |
| RTK Query cache not reset on tenant switch       | Stale data shown briefly                     | ⚠️ MEDIUM      |
| No virtualization for large lists                | Not implemented yet                          | ⚠️ FUTURE RISK |

---

## PHASE 9 — SECURITY FRONTEND

| Check                                                          | Finding                                                                               | Risk                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Token in localStorage                                          | Access token stored in localStorage (XSS accessible)                                  | ⚠️ MEDIUM — mitigated by httpOnly cookie mode option |
| httpOnly cookie mode                                           | ✅ Supported — server can force this mode                                             | ✅                                                   |
| CSRF protection                                                | CSRF token read from cookie, sent as `X-CSRF-Token` header                            | ✅                                                   |
| Console logs leaking secrets                                   | `console.warn('[Auth] Failed to fetch navigation')` — no secrets logged               | ✅                                                   |
| `console.error('[Auth] Keycloak token exchange failed:', err)` | Error object logged — may contain token in some error shapes                          | ⚠️ LOW                                               |
| Unsafe HTML rendering                                          | No `dangerouslySetInnerHTML` found in audited files                                   | ✅                                                   |
| XSS via tenant name                                            | `tenant?.name` rendered in DashboardPage — not sanitized but React escapes by default | ✅                                                   |
| Token in URL                                                   | No evidence of token in URL params                                                    | ✅                                                   |
| CORS assumptions                                               | `credentials: 'include'` set — requires server CORS `allowCredentials: true`          | ✅ (server configured)                               |
| Checksum tamper detection                                      | Simple djb2 hash — not cryptographic, but deters casual tampering                     | ⚠️ LOW                                               |
| `keycloakLogin` references `authData.tokens`                   | Property doesn't exist on type — runtime undefined access                             | ❌ BUG                                               |

---

## PHASE 10 — FINAL SCORING

| Dimension              | Score | Notes                                                               |
| ---------------------- | ----- | ------------------------------------------------------------------- |
| Functionality          | 4/10  | Login broken (URL mismatch), dashboard fake, attendance/exams stubs |
| Integration            | 3/10  | Students partially wired, bulk-delete 404, create URL wrong         |
| Auth Reliability       | 5/10  | Refresh flow solid, but login URL wrong, MFA missing                |
| RBAC UI Safety         | 6/10  | Guards exist, PortalGuard works, but hook-in-try/catch violation    |
| Module Readiness       | 3/10  | Only students list/view is real. Everything else is stub or fake    |
| Production Breakpoints | 4/10  | 403 unhandled, MFA unhandled, tenant suspend unhandled              |
| Security               | 6/10  | httpOnly mode available, CSRF present, no obvious XSS               |

---

## A. WORKING FLOWS

1. **Student list + view** — `GET /school/students` → backend → paginated response → rendered
2. **Student update** — `PUT /school/students/:id` → backend → works
3. **Student delete** — `DELETE /school/students/:id` → backend → works
4. **Token refresh** — 401 → refresh → retry → transparent to user
5. **Logout** — clears all storage, invalidates cache
6. **Portal routing** — admin/teacher/student/staff portals load correctly based on role
7. **Tenant isolation** — SecureStorage scoped by tenantId

---

## B. BROKEN FLOWS

1. **Login** — `POST /api/v1/tenant/auth/login` → 404. Should be `/api/v1/auth/login`. Nothing works until this is fixed.
2. **Student create** — `POST /school/students` → backend expects `POST /school/students/admit` with different payload
3. **Bulk student delete** — `POST /school/students/bulk-delete` → 404 (route not in backend)
4. **Navigation fetch after login** — hardcoded `localhost:3000` URL breaks in any deployed environment
5. **`keycloakLogin`** — references `authData.tokens` which doesn't exist → runtime crash

---

## C. FAKE FLOWS

1. **Dashboard stats** — "1,234 students", "87 teachers", "94.5% attendance" are hardcoded strings. No API call.
2. **Recent Activity** — hardcoded array. No API call.
3. **Quick Actions** — buttons with no `onClick` handlers. Clicking does nothing.
4. **Fees module** — directory exists, no files, no backend route.
5. **Analytics** — commented out in navigation, no UI, no backend.
6. **Reports** — no UI, no backend.
7. **Notifications** — no UI, no backend.

---

## D. RISK FLOWS

1. **MFA enforcement** — Backend (E1.1) enforces MFA for admins. Frontend has no MFA UI. Admin login will return `403 MFA_REQUIRED` → frontend has no handler → user stuck at blank screen.
2. **RTK Query cache on tenant switch** — No `resetApiState()` on tenant change → stale data from previous tenant briefly visible.
3. **`checkHasAuth()` every 500ms** — localStorage reads on every tick. With 10+ concurrent users on same device (shared computer in school), this degrades performance.
4. **`PermissionProvider` hook violation** — `useTenant()` called inside try/catch. React strict mode will throw. Will break in React 19 upgrade.
5. **403 RBAC deny** — No global handler. Component receives `isError=true` with no user-facing message. Teacher trying to access admin route sees blank page, not "Access Denied".

---

## E. PILOT VERDICT

### **1 SCHOOL PILOT READY — WITH 3 MANDATORY FIXES**

The frontend architecture is sound. Guards, lazy loading, tenant scoping, token refresh — all correctly designed. The blocking issues are specific and fixable in 1-2 days.

**The 3 fixes that make frontend pilot-ready:**

### Fix 1 — Auth Base URL (CRITICAL, 30 min)

```typescript
// client/apps/school/src/core/config/env.ts
// Change:
API_BASE_URL: getEnvVar('VITE_API_BASE_URL', 'http://localhost:3000/api/v1/tenant'),
// To: separate auth base from tenant base, OR
// ensure VITE_API_BASE_URL points to /api/v1 and prefix routes correctly
```

Auth calls must go to `/api/v1/auth/*`, tenant calls to `/api/v1/tenant/*`. Either use two base URLs or strip the `/tenant` suffix from the default and add it per-endpoint.

### Fix 2 — MFA Challenge UI (CRITICAL, 1 day)

Add MFA verification screen triggered when login returns `403 MFA_REQUIRED`. Without this, admin login is permanently broken once E1.1 MFA enforcement is active.

### Fix 3 — Dashboard Real Data (HIGH, 1 day)

Replace hardcoded stats with real API calls. A school admin seeing "1,234 students" when they have 340 will immediately lose trust in the system.

---

## First Real School Failure Prediction

**Day 1, Hour 1:** Admin tries to log in → 404 (auth URL mismatch) → pilot fails before it starts.

**After Fix 1 — Day 1, Hour 2:** Admin logs in → MFA required (E1.1 active) → no MFA UI → stuck → pilot fails.

**After Fix 1+2 — Day 1, Hour 3:** Admin sees dashboard with "1,234 students" but school has 340 → trust broken → "system is wrong".

**After Fix 1+2+3 — Day 2:** Admin navigates to Attendance → sees blank page with just "Attendance" heading → "where is the attendance marking?" → escalation.

**Conclusion:** Fix the 3 blockers first. Then attendance and exams pages need real implementation before the school can do daily operations.
