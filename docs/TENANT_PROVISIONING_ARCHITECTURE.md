# Tenant Provisioning Architecture

## Overview

The TenantProvisioningService has been stabilized and is now production-ready. It reliably creates all 51 tenant tables automatically with proper dependency ordering.

## Architecture

### Correct Flow (Implemented)

```
Boot Sequelize
↓
Load all models (66 total via ModelLoader)
↓
Register associations (automatic via sequelize-typescript)
↓
Filter to tenant models (51)
↓
Sort by dependency order
↓
For each model: model.schema(schemaName).sync()
↓
Run migrations
↓
Seed baseline data
↓
Verify completeness
```

### Key Principles

1. **Single Source of Truth**: Uses the same Sequelize instance as the app
2. **ModelLoader**: Centralized dependency sorting
3. **Schema-Bound Sync**: `model.schema(schema).sync()` ensures correct schema
4. **Idempotent**: Safe to re-run without errors
5. **Complete**: All 51 tenant tables created in dependency order

## Components

### 1. Model Discovery (ModelLoader)

```typescript
const allModels = ModelLoader.getModelsFromDir(modelsBaseDir);
// Returns: 66 models (public + tenant + root)
```

### 2. Model Filtering

```typescript
const publicModels = new Set(['Institution', 'Plan', 'Module', ...]);
const tenantModels = allModels.filter(m => !publicModels.has(m.name));
// Returns: 51 tenant models
```

### 3. Dependency Sorting

```typescript
const sortedModels = ModelLoader.sortModels(tenantModels);
// Order: Role → User → UserRole → AcademicSession → Student → ...
```

### 4. Schema-Bound Sync

```typescript
for (const ModelClass of sortedModels) {
    await ModelClass.schema(schemaName).sync({ alter: false });
}
```

## Table Inventory

All 51 tenant tables are created:

### Core (8 tables)
- roles
- users
- user_roles
- role_permissions
- sessions
- refresh_tokens
- audit_logs
- failed_logins

### Academics (16 tables)
- academic_sessions
- academic_terms
- session_holidays
- master_holidays
- classes
- sections
- subjects
- class_subjects
- chapters
- topics
- lesson_plans
- periods
- timetables
- timetable_slots
- timetable_templates
- schools

### Students (5 tables)
- students
- student_enrollments
- student_parents
- parents
- promotion_history

### Teachers (2 tables)
- teachers
- teacher_attendance

### Attendance (5 tables)
- student_attendance
- attendance_settings
- attendance_summaries
- attendance_audit_logs
- leave_applications

### Exams (4 tables)
- exams
- exam_schedules
- marks
- grades

### University (6 tables)
- departments
- faculty
- programs
- courses
- semesters
- enrollments

### Session Management (1 table)
- session_lock_logs

### RBAC Config (3 tables)
- admin_permissions
- user_permissions
- tenant_role_configs

### Grade Management (1 table)
- grade_sheets

## Usage

### Provision a New Tenant

```bash
cd server
npm run provision:tenant -- school_schema_123
```

### List Tenant Tables

```bash
npx ts-node src/scripts/list-tenant-tables.ts school_schema_123
```

### Run Provisioning Test

```bash
npx ts-node src/scripts/test-provisioning.ts
```

## Test Results

```
✅ Fresh provisioning: 51 tables in ~2s
✅ Idempotency: Re-run safe, no duplicates
✅ Critical tables: All 15 required tables present
✅ Table count: 51 (expected 50+)
✅ Schema readiness: PASS
```

## NPM Scripts

```json
{
  "provision:tenant": "ts-node src/scripts/provision-tenant.ts",
  "migrate": "ts-node src/scripts/migrate-all.ts --alter"
}
```

## What Was Fixed

### Before (Broken)
- Created temp Sequelize instances
- Manual model filtering with bugs
- Incorrect schema handling
- "Plan has not been defined" errors
- Association failures
- Only 7 tables created

### After (Fixed)
- Uses existing Sequelize instance
- Centralized ModelLoader
- Schema-bound sync
- Proper dependency ordering
- All 51 tables created
- Idempotent and reliable

## Success Criteria Met

| Criteria | Status |
|----------|--------|
| Schema created | ✅ |
| Tables: 51/51 | ✅ |
| Models loaded: 51 | ✅ |
| Dependency order correct | ✅ |
| Migrations applied | ✅ |
| Baseline data seeded | ✅ |
| Idempotent | ✅ |
| No manual SQL | ✅ |
| No temp instances | ✅ |

## Next Steps

With tenant provisioning stable:

1. ✅ **Academics module RBAC** - Unblocked
2. ✅ **Attendance module RBAC** - Already working
3. ✅ **Exams module RBAC** - Unblocked
4. ✅ **Production deployment** - Now possible
5. ✅ **New tenant onboarding** - Automatic

## Files Changed

- `server/src/core/tenant/tenant-provisioning.service.ts` - Complete refactor
- `server/src/scripts/provision-tenant.ts` - Entry point
- `server/src/scripts/list-tenant-tables.ts` - New utility
- `server/src/scripts/test-provisioning.ts` - Architecture test
- `server/package.json` - Added `provision:tenant` script

## Verification Command

```bash
cd server && npx ts-node src/scripts/test-provisioning.ts
```

Expected output:
```
╔════════════════════════════════════════════════════════════╗
║                   ✅ ALL TESTS PASSED                      ║
╚════════════════════════════════════════════════════════════╝
```
