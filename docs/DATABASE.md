# Database Guide

## Multi-Tenant Schema Architecture

Each tenant gets its own PostgreSQL schema. All shared/global data lives in the `public` schema.

```
PostgreSQL Database: school_erp
│
├── public                          # Global shared data
│   ├── institutions                # Tenant registry
│   ├── users                       # All user accounts (cross-tenant)
│   ├── roles                       # Role definitions
│   ├── permissions                 # Permission catalog
│   ├── user_roles                  # User-to-role assignments
│   ├── role_permissions            # Role-to-permission mappings
│   ├── tenant_role_configs         # Tenant-specific role settings
│   └── navigation_items            # Dynamic sidebar menu config
│
├── tenant_<slug>                   # Per-tenant schemas
│   ├── students                    # Student profiles
│   ├── teachers                    # Teacher profiles
│   ├── employees                   # Staff/employee records
│   ├── academic_sessions           # Session definitions (2024-25 etc.)
│   ├── academic_terms              # Terms within sessions
│   ├── session_holidays            # Holidays per session
│   ├── classes                     # Grade/class definitions
│   ├── sections                    # Sections within classes
│   ├── subjects                    # Subject master
│   ├── class_subjects              # Class-subject mappings
│   ├── chapters                    # Subject chapters
│   ├── topics                      # Chapter topics
│   ├── lesson_plans                # Teacher lesson plans
│   ├── enrollments                 # Student-class enrollments
│   ├── student_attendance          # Daily attendance records
│   ├── attendance_settings         # Attendance configuration
│   ├── attendance_audit_logs       # Attendance change logs
│   ├── timetable_templates         # Timetable structures
│   ├── timetable_slots             # Period-wise schedules
│   ├── exams                       # Exam definitions
│   ├── exam_schedules              # Exam date/time schedules
│   └── marks                       # Exam marks
```

---

## Schema Resolution

Every tenant-scoped query must specify the schema:

```typescript
// ✅ Correct — dynamically uses the tenant's schema
const students = await Student.schema(tenantSchema).findAll();

// ❌ Wrong — defaults to public schema
const students = await Student.findAll();
```

The tenant schema name is available at `req.tenant.db_schema` in controllers.

---

## Model Directory Structure

```
database/models/
├── public/                         # Public schema models
│   ├── Institution.model.ts        # Tenant/institution record
│   ├── Permission.model.ts         # Permission definitions
│   └── NavigationItem.model.ts     # Sidebar menu items
│
├── shared/                         # Shared across schemas
│   └── core/
│       ├── User.model.ts           # User accounts
│       ├── Role.model.ts           # Roles
│       └── UserRole.model.ts       # User-role junction
│
└── school/                         # School-specific models
    ├── student/
    │   ├── Student.model.ts
    │   └── Enrollment.model.ts
    ├── teacher/
    │   └── Teacher.model.ts
    ├── employee/
    │   └── Employee.model.ts
    ├── academics/
    │   ├── session/
    │   │   ├── AcademicSession.model.ts
    │   │   ├── AcademicTerm.model.ts
    │   │   └── SessionHoliday.model.ts
    │   ├── class/
    │   │   ├── Class.model.ts
    │   │   └── Section.model.ts
    │   ├── subject/
    │   │   ├── Subject.model.ts
    │   │   └── ClassSubject.model.ts
    │   ├── curriculum/
    │   │   ├── Chapter.model.ts
    │   │   └── Topic.model.ts
    │   ├── timetable/
    │   │   ├── TimetableTemplate.model.ts
    │   │   └── TimetableSlot.model.ts
    │   └── lesson-plan/
    │       └── LessonPlan.model.ts
    ├── attendance/
    │   ├── StudentAttendance.model.ts
    │   ├── AttendanceSettings.model.ts
    │   └── AttendanceAuditLog.model.ts
    └── examination/
        ├── Exam.model.ts
        ├── ExamSchedule.model.ts
        └── Marks.model.ts
```

---

## Model Conventions

### Base Structure

```typescript
import { Table, Column, Model, DataType, Default } from 'sequelize-typescript';

@Table({ tableName: 'my_table', timestamps: true, underscored: true })
export class MyModel extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true })
    id!: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    name!: string;

    // Sequelize auto-manages: created_at, updated_at
}
```

### Key Conventions

| Convention | Rule |
|-----------|------|
| **Primary keys** | UUIDv4 (auto-generated) |
| **Timestamps** | `timestamps: true` + `underscored: true` → `created_at`, `updated_at` |
| **Table names** | snake_case, plural (`academic_sessions`) |
| **Column names** | snake_case (`first_name`, `created_by`) |
| **Foreign keys** | `<entity>_id` format (`institution_id`, `class_id`) |
| **Boolean columns** | `is_` prefix (`is_active`, `is_current`, `is_locked`) |
| **JSON columns** | `DataType.JSONB` for flexible config |
| **Enums** | Defined as TypeScript enums, stored as Sequelize ENUM |
| **Soft deletes** | Use `status` column, not `paranoid` |

---

## Relationships

```typescript
// One-to-Many
@HasMany(() => Section)
sections!: Section[];

@BelongsTo(() => Class)
class!: Class;

// Many-to-Many (through junction table)
@BelongsToMany(() => Subject, () => ClassSubject)
subjects!: Subject[];
```

---

## Migrations

Migration scripts live in `database/migrations/`:

```bash
# Run migrations (alter mode — safe for development)
pnpm migrate

# Run migrations (force — drops and recreates — DANGEROUS)
pnpm migrate:force
```

The migration system uses Sequelize's `sync({ alter: true })` and runs against all registered tenant schemas.

---

## Seeders

| Seeder | Script | Purpose |
|--------|--------|---------|
| Global Permissions | `pnpm seed:global` | Seeds all permissions in `global-permissions.seeder.ts` |
| Root Admin | `pnpm seed:admin` | Creates the platform super admin user |

---

## Academic Session Model

The `AcademicSession` is central to the platform — most data is scoped to a session:

```
AcademicSession
├── id                    UUID (PK)
├── institution_id        FK → Institution
├── name                  "Academic Year 2025-26"
├── code                  "AS2526"
├── start_date            2025-04-01
├── end_date              2026-03-31
├── status                DRAFT | ACTIVE | COMPLETED | ARCHIVED
├── is_current            boolean (only ONE per institution)
├── previous_session_id   FK → AcademicSession (chain)
├── next_session_id       FK → AcademicSession (chain)
│
├── Configuration
│   ├── weekly_off_days           [0]  (Sunday)
│   ├── attendance_backdate_days  0
│   └── marks_lock_days           7
│
├── Locking
│   ├── is_locked                 Master lock
│   ├── is_attendance_locked      Granular lock
│   ├── is_marks_locked           Granular lock
│   ├── is_fees_locked            Granular lock
│   ├── is_enrollment_locked      Granular lock
│   └── auto_lock_days            30 (days after end_date)
│
├── Relations
│   ├── terms[]                   AcademicTerm (Term 1, Term 2, etc.)
│   └── holidays[]               SessionHoliday
```

---

## Adding a New Model

1. **Create the model file** in the appropriate directory under `database/models/school/`
2. **Register it** in `database/model-loader.ts` so Sequelize discovers it
3. **Run migration** (`pnpm migrate`) to create the table
4. **Use `.schema()`** in services:
   ```typescript
   MyModel.schema(tenantSchema).findAll({ ... });
   ```
