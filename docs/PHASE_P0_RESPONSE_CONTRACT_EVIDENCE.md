# P0 Response Contract Normalization Evidence (2026-02-22)

## Scope
Normalized core response and error contract shape in shared middleware/helpers, and converged fee-module route responses to a single enterprise envelope pattern.

## Files Changed
- `server/src/core/http/ApiResponse.ts`
- `server/src/core/http/ErrorHandler.ts`
- `server/src/core/middleware/validate.middleware.ts`
- `server/src/modules/school/academic/controllers/utils.ts`
- `server/src/modules/school/academic/controllers/class.controller.ts`
- `server/src/modules/school/academic/controllers/section.controller.ts`
- `server/src/modules/school/academic/controllers/subject.controller.ts`
- `server/src/modules/school/academic/controllers/curriculum.controller.ts`
- `server/src/modules/school/academic/controllers/lesson-plan.controller.ts`
- `server/src/modules/school/academic/controllers/academic-session.controller.ts`
- `server/src/modules/school/academic/controllers/timetable.controller.ts`
- `server/src/modules/school/attendance/controllers/response.utils.ts`
- `server/src/modules/school/attendance/controllers/attendance.controller.ts`
- `server/src/modules/school/attendance/controllers/enhanced-attendance.controller.ts`
- `server/src/modules/school/attendance/controllers/dashboard.controller.ts`
- `server/src/modules/school/fees/routes/fees.routes.ts`
- `server/src/modules/school/user-management/controllers/user-management.controller.ts`
- `server/src/modules/school/controllers/role.controller.ts`
- `server/src/modules/school/controllers/role-config.controller.ts`
- `server/src/modules/school/controllers/permission.controller.ts`
- `server/src/modules/school/controllers/navigation.controller.ts`
- `server/src/modules/school/student/controllers/student.controller.ts`
- `server/src/modules/school/communication/controllers/response.utils.ts`
- `server/src/modules/school/communication/controllers/notices.controller.ts`
- `server/src/modules/school/communication/controllers/parent-portal.controller.ts`
- `server/src/modules/school/communication/routes/notices.routes.ts`
- `server/src/modules/school/communication/routes/parent-portal.routes.ts`
- `server/src/modules/school/dashboard/controllers/dashboard.controller.ts`
- `server/src/modules/school/dashboard/routes/dashboard.routes.ts`
- `server/src/modules/school/reports/controllers/reports.controller.ts`
- `server/src/modules/school/auth/auth.routes.ts`
- `server/src/modules/school/middlewares/permission.middleware.ts`
- `server/src/modules/school/routes/index.ts`

## What Was Implemented
- `ApiResponse` now uses enterprise-aligned fields:
  - `success`, `message`, `data`, optional `errors`, optional `meta`, `statusCode`
- Global error handler now returns a consistent error envelope:
  - `success: false`, `message`, `data: null`, optional `errors`, optional `meta`
- Validation middleware (`validate`, `validateQuery`, `validateParams`) now returns the same error shape with field-level metadata.
- Shared school controller helpers now include:
  - `successResponse`: always sends `message`, `data`, and empty `errors` array on success
  - `errorResponse`: always sends `success: false`, `message`, `data: null`, and `errors`
  - `paginatedResponse`: sends `data` + `meta` (`total`, `page`, `limit`, `totalPages`) and retains legacy top-level pagination fields for compatibility.
- Academic controllers now use helper-based responses for delete/mutation validation branches, removing ad-hoc inline response payloads.
- Attendance controllers now use a shared response helper utility (`response.utils.ts`) for success, error, and paginated payloads.
- Fee routes now use centralized `sendSuccess(...)` helper:
  - Ensures `success/message/data/errors` shape across categories, structures, assignments, payments, dues/summary, and discounts responses.
- User-management controller now emits consistent envelopes for create/list/read/update/deactivate/permissions flows.
- Role and role-config controllers now use shared success/error response helpers with `message/data/errors`.
- Permission and navigation controllers now use helper-based success/error envelopes.
- Student controller endpoints now consistently return `message`, `data`, optional `meta`, and `errors: []`.
- Communication notice and parent-portal responses are normalized via dedicated controllers + shared helper envelopes.
- Dashboard stats endpoint now returns consistent success/error contract through `dashboard.controller.ts`.
- Reports route handlers were moved into `reports.controller.ts`; JSON endpoints keep consistent envelope and binary download remains explicit file response.
- School auth migration routes now return unified envelope shape for success and deprecation responses.
- Legacy permission middleware error responses now follow the same enterprise envelope while keeping backward-compatible `error` field.
- School route index timetable placeholder now emits enterprise envelope shape.

## Verification Commands and Results
1. `pnpm --dir server check`
- Result: `PASS` (`tsc --noEmit`)

2. Envelope scan
- Command: `rg -n "buildErrorResponse|data:\\s*null|errors:\\s*\\[|meta:" server/src/core/http/ErrorHandler.ts server/src/core/middleware/validate.middleware.ts`
- Result: shape fields present in both global error and validation middleware.

3. Pagination helper scan
- Command: `rg -n "paginatedResponse|meta:\\s*\\{|errors:\\s*\\[\\]" server/src/modules/school/academic/controllers/utils.ts server/src/modules/school/attendance/controllers/attendance.controller.ts`
- Result: meta-enabled paginated response helpers and normalized success helpers confirmed.

4. Fee module response send-point scan
- Command: `rg -n "res\\.json|res\\.status" server/src/modules/school/fees -g "*.ts" -S`
- Result: `1` hit (centralized helper send point in `fees.routes.ts`).

5. Examination module response send-point scan
- Command: `rg -n "res\\.json|res\\.status" server/src/modules/school/examination -g "*.ts" -S`
- Result: `0` direct send hits in examination module.

6. School module send-point reduction snapshot
- Command: `rg -n "res\\.json\\(|res\\.status\\(" server/src/modules/school -g "*.ts" -S`
- Before (baseline): `241` hits
- Prior checkpoint: `37` hits
- After current batch: `30` hits
- Net reduction from baseline: `211` fewer raw send points.

7. Academic controller convergence snapshot
- Command: `rg -n "res\\.json\\(|res\\.status\\(" server/src/modules/school/academic/controllers -g "*.ts" -S`
- Result: `3` hits (all centralized helper send points in `academic/controllers/utils.ts`).

8. Attendance controller convergence snapshot
- Command: `rg -n "res\\.json\\(|res\\.status\\(" server/src/modules/school/attendance/controllers -g "*.ts" -S`
- Result: `3` hits (all centralized helper send points in `attendance/controllers/response.utils.ts`).

## Gate Impact
- `G4 Response contract consistency`: **Passed** (`DONE: 2026-02-22`) after convergence to helper-based envelopes across active school modules and helper-only residual send points.

## Remaining Work
- Add explicit envelope contract tests to lock success/error/pagination shape across modules.
- Keep binary download endpoints (`reports.routes.ts`) intentionally outside JSON envelope scope while maintaining error-shape consistency.
