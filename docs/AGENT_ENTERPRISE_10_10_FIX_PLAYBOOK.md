# Agent Enterprise 10/10 Fix Playbook

**Date:** 2026-02-22  
**Audience:** Coding agents and senior engineers fixing software-level readiness gaps  
**Scope:** Backend, frontend, database, security, contracts, tests, functional completeness  
**Out of Scope:** DevOps, infra, deployment, CI/CD, hosting

---

## 0) Live Progress Tracker (Mandatory)

After every completed fix, update:

- `docs/ENTERPRISE_FIX_PROGRESS.md`

Use this format in the tracker:

- Overall: `[#####---------------] 25%`
- Phase bars: P0, P1, P2 separately
- Gate bars: G1 to G11 with `Not Started / In Progress / Passed / Blocked`
- Evidence link for every `Passed` item (report file path)

Progress math:

- Overall `%` = `(Passed Gates / 11) * 100`
- Phase `%` = `(Passed Items in Phase / Total Items in Phase) * 100`

Mandatory gate HUD block in tracker (add/update each cycle):

- `G1 [########------------] In Progress`
- `G2 [####################] Passed`
- `G3 [######--------------] In Progress`
- `G4 [########------------] In Progress`
- `G5 [######--------------] In Progress`
- `G6 [####################] Passed`
- `G7 [#####---------------] In Progress`
- `G8 [#####---------------] In Progress`
- `G9 [####################] Passed`
- `G10 [####----------------] In Progress`
- `G11 [--------------------] Not Started`

Completion stamp rule:

- When a gate flips to `Passed`, append `DONE: YYYY-MM-DD` and at least one evidence file path.
- No `DONE` stamp and no evidence path means the gate is still open.

No progress update means task is not considered complete.

---

## 1) Baseline (Current State to Improve)

Use this as the starting point for remediation:

- Weighted readiness score: **5.04/10** (conditional)
- Critical observations from recent audit execution:
  - Direct DB/model calls in route files: **0** (good)
  - Direct DB/model calls in controllers: **11** (must be 0)
  - School mutating route validation coverage: **~68%** (must be 100%)
  - Strict schema enforcement (`.strict()`): **0 hits** (must be enforced)
  - RBAC coverage in school routes (line-level): **~32%** (must be near-complete)
  - Raw SQL usage: **37 hits**, with interpolation hotspots to remove
  - Console logs/errors in production code paths: **205** (target 0 direct console usage)
  - Models with `paranoid: true`: **12/83** (critical entities still inconsistent)
  - Backend test status: **4 failed suites, 1 passed** (must be all green)
  - Frontend/backend endpoint usage stats:
    - `used_method_mismatch`: **81**
    - `unused`: **513**

Do not use older reports that show higher scores as completion evidence.

### Latest Checkpoint (2026-02-22, post route-thin + query-hotspot closure batch)

- School mutating-route validation coverage: **115/115 (100%)**
- School `.strict()` schema hits: **93**
- Approximate non-strict `z.object` baseline: **138/190 remaining**
- TypeScript check: `pnpm --dir server check` **PASS**
- Evidence file: `docs/PHASE_P0_VALIDATION_HARDENING_EVIDENCE.md`
- Runtime direct console usage snapshot: **0** (down from 260), evidence: `docs/PHASE_P0_LOGGING_HARDENING_EVIDENCE.md`
- Response contract normalization batch evidence: `docs/PHASE_P0_RESPONSE_CONTRACT_EVIDENCE.md`
- School raw response send points reduced: **241 -> 30**
- Attendance controller send points reduced to helper-only: **3**
- Direct module-level `sequelize.query(...)` callsites reduced: **37 -> 0**
- Centralized raw-query wrappers retained in 4 reviewed service files.
- Direct template-literal `sequelize.query(...)` callsites: **0**
- Attendance repository list queries now enforce `MAX_PAGE_SIZE` clamps (`StudentAttendanceRepository`, `LeaveRepository`, `AttendanceSummaryRepository`).
- Heuristic repository `findAll` windows missing nearby `where/limit`: **0** (down from 16).
- School route files importing services directly: **1** (`fees.routes.ts` only; communication/dashboard/reports now controller-routed).
- Backend full test suite: `pnpm --dir server test --runInBand --verbose` **PASS** (`5/5 suites`, `39/39 tests`)
- Test stabilization evidence: `docs/PHASE_P1_TEST_STABILIZATION_EVIDENCE.md`
- Strict validation baseline evidence: `docs/PHASE_P0_STRICT_VALIDATION_BASELINE_EVIDENCE.md`
- Data security/query baseline evidence: `docs/PHASE_P1_DATA_SECURITY_QUERY_BASELINE_EVIDENCE.md`
- Remaining blockers: strict-write schema completion, fees route layering refactor, endpoint contract sync.

---

## 2) Definition of "10/10 Ready"

All gates below are mandatory. If one fails, score is not 10/10.

| Gate ID | Quality Gate | Target |
|---|---|---|
| G1 | Layered architecture compliance | Route -> Controller -> Service -> Repository -> Model enforced; 0 controller DB calls |
| G2 | Validation coverage | 100% POST/PUT/PATCH routes have request validation middleware |
| G3 | Validation strictness | Unknown fields rejected in all write DTO schemas |
| G4 | Response contract | Uniform success/error envelope across school modules |
| G5 | Auth and RBAC | No legacy auth drift; RBAC protection on all sensitive school routes |
| G6 | Tenant isolation | Cross-tenant access tests pass for students, fees, and parent surfaces |
| G7 | Data security | No password leakage, no hardcoded JWT secrets, no unsafe raw SQL interpolation |
| G8 | Transaction safety | Admission and fee payment flows are atomic and rollback-safe |
| G9 | Test quality | All existing suites pass; critical modules have happy/error/security coverage |
| G10 | Contract sync | Frontend payload/query/response expectations match backend validators/services |
| G11 | Enterprise feature completeness | No critical missing enterprise workflows in student/fees/exam/attendance/reporting |

---

## 3) Execution Order (Do Not Reorder)

1. P0: Security and contract blockers
2. P0: Architecture and validation correctness
3. P1: Data integrity and transaction guarantees
4. P1: Test stabilization and expansion
5. P2: Feature completion and maintainability polish
6. Re-run full audit checks and produce final evidence report

Reason: P0 defects can invalidate all later verification and produce false positives.

---

## 4) P0 Workstream (Must Finish First)

### P0-1: Remove sensitive data leakage and unsafe logging

**Fix objectives**
- Never return plaintext or temporary passwords in API responses.
- Replace direct `console.log/error` in runtime code with structured logger utilities.

**Primary locations**
- `server/src/modules/school/user-management/controllers/user-management.controller.ts`
- `server/src/modules/school/user-management/services/user-management.service.ts`
- `server/src/core/middleware/security.middleware.ts`
- `server/src/core/utils/logger.ts`

**Acceptance checks**
```powershell
rg -n "temporaryPassword|plain.*password|password.*response" server/src -S
rg -n "console\.log|console\.error" server/src -g "*.ts" -S
```
Target: no sensitive password data in responses; no direct console logging in runtime modules.

---

### P0-2: Eliminate auth migration drift (OIDC vs legacy login paths)

**Fix objectives**
- Frontend and backend must share one active school auth contract.
- If school login is OIDC-only, remove/disable conflicting frontend legacy login usage.
- Ensure 401 refresh/retry logic is consistent with Keycloak flow.

**Primary locations**
- `client/apps/school/src/core/api/baseApi.ts`
- `client/apps/school/src/core/api/endpoints/authApi.ts`
- `client/apps/school/src/core/auth/keycloak.service.ts`
- `client/apps/school/src/core/auth/KeycloakAuthContext.tsx`
- `server/src/modules/school/auth/auth.routes.ts`
- `server/src/core/middleware/keycloak.middleware.ts`

**Acceptance checks**
```powershell
rg -n "/auth/login|/auth/refresh" client/apps/school/src -g "*.ts" -g "*.tsx" -S
rg -n "410|Gone|deprecated" server/src/modules/school/auth -g "*.ts" -S
```
Target: no frontend calls to deprecated school auth endpoints unless explicitly tenant-auth scope and documented.

---

### P0-3: Enforce strict layered architecture

**Fix objectives**
- Controllers call services only.
- Controllers must not import or call models directly.
- Routes must not contain business logic.

**Primary locations**
- `server/src/modules/school/**/controllers/*.ts`
- `server/src/modules/school/**/routes/*.ts`

**Acceptance checks**
```powershell
rg -n "findAll|findOne|create|update|destroy|upsert" server/src/modules -g "*.controller.ts" -S
rg -n "findAll|findOne|create|update|destroy|upsert" server/src/modules -g "*.routes.ts" -S
```
Target: 0 direct DB/model operations in controllers and routes.

---

### P0-4: Raise validation coverage from ~68% to 100%

**Fix objectives**
- Every `POST`, `PUT`, `PATCH` route must include validation middleware.
- Enforce strict schemas that reject unknown keys.
- Required fields and types must align with service expectations.

**Primary locations**
- `server/src/modules/school/**/routes/*.ts`
- `server/src/modules/school/**/validators/*.ts`
- `server/src/core/middleware/validate.middleware.ts`
- `server/src/core/middleware/validation.middleware.ts`

**Acceptance checks**
```powershell
rg -n "router\.(post|put|patch)" server/src/modules/school -g "*.routes.ts" -S
rg -n "validateRequest|validate\(" server/src/modules/school -g "*.routes.ts" -S
rg -n "\.strict\(" server/src/modules/school -g "*.ts" -S
```
Target: 100% mutating routes validated; strict object schemas used on all write DTOs.

---

### P0-5: Standardize API response and error envelope

**Target envelope**
```json
{
  "success": true,
  "message": "string",
  "data": {},
  "errors": [],
  "meta": { "total": 0, "page": 1, "limit": 20 }
}
```

**Fix objectives**
- Use one response helper for success/list responses.
- Ensure error handler outputs a consistent shape.
- List endpoints always include pagination metadata.

**Primary locations**
- `server/src/core/http/ApiResponse.ts`
- `server/src/core/http/ErrorHandler.ts`
- `server/src/modules/school/**/controllers/*.ts`

**Acceptance checks**
```powershell
rg -n "res\.json\(|res\.status\(" server/src/modules/school -g "*.ts" -S
rg -n "success|message|data|errors|meta" server/src/core/http -g "*.ts" -S
```
Target: one consistent response contract in all school modules.

---

### P0-6: Increase RBAC coverage from ~32% to full sensitive-route protection

**Fix objectives**
- Protect all mutating routes and sensitive reads with permission middleware.
- Remove unguarded management endpoints.
- Keep tenant and RBAC checks both active.

**Primary locations**
- `server/src/modules/school/**/routes/*.ts`
- `server/src/core/rbac/rbac.middleware.ts`
- `server/src/modules/school/middlewares/permission.middleware.ts`

**Acceptance checks**
```powershell
rg -n "router\.(get|post|put|patch|delete)" server/src/modules/school -g "*.routes.ts" -S
rg -n "requirePermission|rbacRequirePermission" server/src/modules/school -g "*.routes.ts" -S
```
Target: all sensitive routes covered; zero high-risk unguarded endpoints.

---

## 5) P1 Workstream (Data Integrity and Runtime Safety)

### P1-1: Enforce transaction atomicity on critical flows

**Fix objectives**
- Fee collection and student admission must be wrapped in transactions.
- On any downstream failure (receipt/log/related write), rollback entire operation.

**Primary locations**
- `server/src/modules/school/fees/services/fee.service.ts`
- `server/src/modules/school/student/services/student.service.ts`
- `server/src/core/database/transaction.helper.ts`

**Acceptance checks**
```powershell
rg -n "transaction|sequelize\.transaction" server/src/modules -g "*.ts" -S
rg -n "collectFee|admitStudent" server/src/modules/school -g "*.ts" -S
```
Target: both critical flows explicitly transaction-safe with tested rollback behavior.

---

### P1-2: Harden SQL usage and query performance

**Fix objectives**
- Replace raw SQL interpolation with parameterized replacements.
- Ensure list queries enforce bounded pagination.
- Prevent unbounded `findAll()` on tenant-scale entities.

**Primary locations**
- `server/src/modules/school/**/repositories/*.ts`
- `server/src/modules/school/attendance/repositories/attendance.repository.ts`
- `server/src/modules/school/dashboard/services/dashboard.service.ts`

**Acceptance checks**
```powershell
rg -n "sequelize\.query" server/src/modules -g "*.ts" -S
rg -n "sequelize\.query.*`|sequelize\.query.*\+" server/src/modules -g "*.ts" -S
rg -n "findAll\(" server/src/modules/school -g "*.repository.ts" -S
```
Target: no unsafe interpolation; list queries bounded with pagination constraints.

---

### P1-3: Fix soft-delete consistency for critical models

**Fix objectives**
- Critical school entities must support recoverability via paranoid soft delete.
- Define where hard delete is acceptable and document exceptions.

**Primary locations**
- `server/src/database/models/Student.model.ts`
- `server/src/database/models/FeePayment.model.ts`
- `server/src/database/models/Exam.model.ts`
- `server/src/database/models/Mark.model.ts`

**Acceptance checks**
```powershell
rg -n "paranoid:\s*true" server/src/database/models -g "*.model.ts" -S
```
Target: critical entities use `paranoid: true` unless explicitly exempted with rationale.

---

### P1-4: Complete tenant isolation verification

**Fix objectives**
- Repositories consistently scope by tenant schema and institution context.
- Cross-tenant accesses return denial (`403` or safe `404`), never data.

**Primary locations**
- `server/src/modules/school/**/repositories/*.ts`
- `server/src/__tests__/tenant/tenant-isolation.test.ts`

**Acceptance checks**
```powershell
rg -n "institution_id" server/src/modules/school -g "*.repository.ts" -S
rg -n "\.schema\(" server/src/modules/school -g "*.repository.ts" -S
pnpm --dir server test --runInBand --verbose
```
Target: tenant isolation tests pass and no repository escapes tenant context.

---

## 6) P1 Workstream (Integration and Contracts)

### P1-5: Align the 5 key endpoint chains end-to-end

Endpoints to verify:
1. `POST /school/students/admit`
2. `POST /school/fees/payments`
3. `POST /school/exams/marks`
4. `GET /school/attendance/history`
5. `POST /auth/login` (tenant auth scope only)

For each endpoint, align:
- Frontend payload/query
- Backend validator schema
- Service input assumptions
- Response shape consumed by frontend

**Primary locations**
- `client/apps/school/src/core/api/endpoints/*.ts`
- `server/src/modules/school/**/routes/*.ts`
- `server/src/modules/school/**/validators/*.ts`
- `server/src/modules/school/**/services/*.ts`

**Acceptance checks**
```powershell
rg -n "students/admit|fees/payments|exams/marks|attendance/history|/auth/login" client/apps/school/src -S
rg -n "students/admit|fees/payments|exams/marks|attendance/history|/auth/login" server/src/modules -S
```
Target: all 5 chains marked in-sync with no payload/query/response mismatch.

---

### P1-6: Strengthen shared type contracts

**Fix objectives**
- Move API DTO and response contracts into shared package.
- Frontend endpoint typings must import shared contracts, not duplicate them.

**Primary locations**
- `client/packages/common/src/**`
- `client/apps/school/src/core/api/endpoints/*.ts`
- `server/src/modules/school/**/dto/*.ts`

**Acceptance checks**
```powershell
rg -n "type |interface " client/packages/common/src -g "*.ts" -S
rg -n "from '@erp/common'" client/apps/school/src -g "*.ts" -g "*.tsx" -S
```
Target: key endpoint request/response contracts come from shared package.

---

## 7) P1/P2 Workstream (Testing)

### P1-7: Make existing suites green

**Fix objectives**
- Resolve current failures first; no skipped tests as workaround.
- Ensure status code expectations match final auth + tenant policy.

**Acceptance checks**
```powershell
pnpm --dir server test --runInBand --verbose
```
Target: all existing suites pass.

---

### P2-1: Add missing module coverage

Must add tests for un/under-covered modules:
- academic
- attendance
- user-management
- dashboard
- reports
- notices
- RBAC permission enforcement

Coverage quality minimum per critical module:
- Happy path
- Validation failure path
- Authorization failure path
- Tenant-isolation path where applicable

**Acceptance checks**
```powershell
Get-ChildItem server/src/__tests__ -Recurse -File | Select-Object -ExpandProperty FullName
pnpm --dir server test:coverage
```
Target: critical modules covered; no material blind spots.

---

## 8) P2 Workstream (Feature Completeness for Enterprise Sale)

### P2-2: Close hard enterprise feature gaps

Prioritize features that block enterprise procurement:
1. Fee refunds and reversals with audit trail
2. Per-school configurable grade/pass-fail policy with locked result publishing
3. Attendance correction workflow with audit reason and approver tracking
4. Report generation status tracking and downloadable export lifecycle
5. Parent linkage and portal completeness for fees/attendance/notifications
6. Role template and per-user override auditability

**Acceptance checks**
- Add endpoint + service + validation + tests for each delivered feature.
- Update user-facing API docs under `docs/`.

---

## 9) Quality Gate Command Bundle (Run Before Any 10/10 Claim)

```powershell
# Type safety
pnpm --dir server check
pnpm --dir client/apps/school check

# Backend tests
pnpm --dir server test --runInBand --verbose

# Architecture and safety scans
rg -n "findAll|findOne|create|update|destroy|upsert" server/src/modules -g "*.controller.ts" -S
rg -n "findAll|findOne|create|update|destroy|upsert" server/src/modules -g "*.routes.ts" -S
rg -n "router\.(post|put|patch)" server/src/modules/school -g "*.routes.ts" -S
rg -n "validateRequest|validate\(" server/src/modules/school -g "*.routes.ts" -S
rg -n "requirePermission|rbacRequirePermission" server/src/modules/school -g "*.routes.ts" -S
rg -n "console\.log|console\.error" server/src -g "*.ts" -S
rg -n "sequelize\.query.*`|sequelize\.query.*\+" server/src/modules -g "*.ts" -S
rg -n "paranoid:\s*true" server/src/database/models -g "*.model.ts" -S
```

If any command output indicates a blocker, the score remains below 10/10.

---

## 10) Required Evidence Artifacts

For each phase, commit a short evidence report:

- `docs/PHASE_P0_SECURITY_AND_CONTRACT_REPORT.md`
- `docs/PHASE_P1_INTEGRITY_AND_TEST_REPORT.md`
- `docs/PHASE_P2_COMPLETENESS_REPORT.md`
- `docs/ENTERPRISE_10_10_FINAL_CERTIFICATION.md`

Each report must include:
1. What changed (file list)
2. Which gates passed
3. Remaining open items
4. Risk statement

No evidence report means no completion.

---

## 11) Mandatory Progress Update Cadence

Update `docs/ENTERPRISE_FIX_PROGRESS.md` at these checkpoints:

1. Before starting a new phase (set target tasks to `In Progress`)
2. Immediately after each gate or task moves to `Passed`
3. After running the quality gate command bundle
4. Before final sign-off report creation

Required fields to update each time:

1. `Last Updated`
2. `Current Owner`
3. Overall bar and %
4. Relevant phase bar and %
5. Gate status row with evidence file reference

---

## 12) Final Sign-Off Criteria

Declare enterprise 10/10 only when all conditions are true:

1. All P0/P1 blockers are closed.
2. Full quality gate bundle passes.
3. Key endpoint chains are in sync (frontend -> validator -> service -> response).
4. Tenant isolation and RBAC enforcement are verified by tests.
5. Feature matrix has no enterprise-blocking gaps.
6. Final certification report is published in `docs/`.
