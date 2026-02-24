# P0 Strict Validation Baseline Evidence (2026-02-22)

## Scope
Established a measurable baseline for strict schema enforcement before full G3 closure.

## Verification Commands and Results

1. Strict usage snapshot

```powershell
rg -n "\.strict\(" server/src/modules/school -g "*.ts" -S
```

- Result (updated): `93` `.strict()` hits in school module.

2. Approximate non-strict `z.object(...)` scan

```powershell
# heuristic scan: finds z.object( and checks for .strict() within nearby text window
# Z_OBJECT_TOTAL=190
# Z_OBJECT_NON_STRICT_APPROX=138
```

- Result: `190` total `z.object(...)` constructs scanned.
- Result (updated): `138` approximate non-strict constructs remain.

## Hotspot Samples (from scan)
- `server/src/modules/school/schemas/student.schemas.ts`
- `server/src/modules/school/auth/auth.validators.ts`
- `server/src/modules/school/examination/validators/examination.validators.ts`

## Fixes Included In This Baseline Refresh
- Added strict enforcement to user-management DTO schemas in `server/src/modules/school/user-management/validators/user-management.dto.ts`.
- Re-verified strict write schema coverage in:
  - `server/src/modules/school/fees/validators/fee.validators.ts`
  - `server/src/modules/school/student/dto/student.dto.ts`

## Gate Impact
- `G3 Strict schema validation`: moved to **In Progress**.
- `G3` is not passable yet; strictness needs to be enforced on all write-path DTO/validator objects (with explicit exception list if any).

## Next Actions
1. Convert all mutating-route write schemas to strict object schemas first.
2. Keep read/query schemas permissive only where backward compatibility is required and documented.
3. Add a guard script/report that fails when new non-strict write schemas are introduced.
