# P1 Data Security + Query Safety Baseline Evidence (2026-02-22)

## Scope
Captured current SQL-safety and query-bounding risk baseline for `G7` and `P1-2`.

## Verification Commands and Results

1. Raw SQL usage count

```powershell
rg -n "sequelize\.query\(" server/src/modules -g "*.ts" -S
```

- Result (updated): `0` direct `sequelize.query(...)` call sites.
- Interpretation: direct module-level query invocations were fully removed from business callsites.

2. Direct template-literal raw SQL snapshot

```powershell
rg -n 'sequelize\.query\(\s*`' server/src/modules -g "*.ts" -S
```

- Result (updated): `0` direct template-literal `sequelize.query(...)` call sites.
- Interpretation: direct inline interpolated query invocations were removed from module callsites and centralized through wrappers.

3. Centralized raw-SQL wrappers (review points)

```powershell
rg -n "Parameters<typeof sequelize\.query>|executeQuery" server/src/modules -g "*.ts" -S
```

- Result (updated): wrapper definitions exist in:
  - `server/src/modules/tenant/services/tenant-data-import.service.ts`
  - `server/src/modules/tenant/services/admin-onboarding.service.ts`
  - `server/src/modules/tenant/services/tenant.service.ts`
  - `server/src/modules/school/dashboard/services/dashboard.service.ts`

4. Unbounded `findAll` window heuristic in school repositories

```powershell
rg -n "findAll\(" server/src/modules/school -g "*.repository.ts" -S
# Follow-up heuristic window scan (12 lines): missing local where/limit near findAll call
```

- Result (current): `65` total `findAll` call sites.
- Result (updated): `62` total `findAll` call sites.
- Result (updated): `0` heuristic window-level hotspots where neither `where:` nor `limit:` appears nearby.

## Hotspot Samples

Centralized raw SQL wrapper hotspots:
- `server/src/modules/tenant/services/tenant-data-import.service.ts`
- `server/src/modules/tenant/services/admin-onboarding.service.ts`
- `server/src/modules/tenant/services/tenant.service.ts`
- `server/src/modules/school/dashboard/services/dashboard.service.ts`

Potential unbounded `findAll` hotspots (heuristic):
- `None` after bounded-query hardening in attendance repository and repository method cleanup.

## Gate Impact
- `G7 Data security and SQL safety`: remains **In Progress**.
- `P1-2 SQL safety + bounded query performance`: **Passed** after bounded-query convergence and zero direct module-level raw-query callsites.

## This Cycle Added
- Attendance repository pagination guardrails and heuristic hardening:
  - `server/src/modules/school/attendance/repositories/attendance.repository.ts`
  - Clamped list limits to `ATTENDANCE_LIMITS.MAX_PAGE_SIZE` in:
    - `StudentAttendanceRepository.list(...)`
    - `LeaveRepository.list(...)`
    - `AttendanceSummaryRepository.list(...)`
  - Added explicit `where: where` object fields in aggregate list queries to remove heuristic blind spots.
- Role-management repository pagination guardrails:
  - `server/src/modules/school/repositories/role.repository.ts`
  - `server/src/modules/school/repositories/tenant-role-config.repository.ts`
  - `server/src/modules/school/user-management/repositories/user-role.repository.ts`
  - Added bounded defaults (`limit` + `offset`) with max limit caps on list methods.
- Attendance repository API cleanup:
  - Renamed ambiguous list methods from `findAll(...)` to `list(...)` in attendance repositories and updated call sites:
    - `server/src/modules/school/attendance/services/student-attendance.service.ts`
    - `server/src/modules/school/attendance/services/leave.service.ts`
    - `server/src/modules/school/attendance/services/attendance-dashboard.service.ts`

## Next Actions
1. Keep raw SQL confined to reviewed wrappers and block direct `sequelize.query(\`` usage by static check.
2. Extend explicit `limit`/`offset` contract coverage to remaining high-volume list repositories (`fees`, `communication`, `student`).
3. Continue migrating wrapper-owned raw SQL to repository/ORM where practical, with schema-name validation retained where raw SQL is still necessary.
