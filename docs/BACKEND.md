# Backend Guide

## Architecture Pattern

All backend modules follow the **Controller → Service → Repository** pattern:

```
Controller    → Handles HTTP request/response ONLY
    │
    ▼
Service       → Business logic, validation, workflow rules
    │
    ▼
Model/Repo    → Database operations only
```

> 🚫 **Controllers must never contain business logic.**  
> 🚫 **Services must never import `Request` or `Response` from Express.**

---

## Directory Structure

```
server/src/
├── app.ts                  # Express app setup (middleware chain)
├── server.ts               # Server entry point (port binding)
│
├── config/                 # Configuration
│   ├── env.ts              # Environment variables
│   ├── redis.ts            # Redis client setup
│   ├── keycloak.config.ts  # Keycloak connection
│   └── logger.ts           # Logger setup
│
├── core/                   # Shared infrastructure
│   ├── auth/               # JWT utilities, token handling
│   ├── cache/              # Redis cache service
│   ├── context/            # AsyncLocalStorage request context
│   ├── events/             # Event bus (pub/sub)
│   ├── middleware/         # Global middleware (see below)
│   ├── queue/              # Bull queue manager
│   ├── types/              # Global TypeScript types
│   └── utils/              # Shared utilities (error classes, helpers)
│
├── database/
│   ├── models/             # Sequelize models (see DATABASE.md)
│   ├── migrations/         # DDL migration scripts
│   ├── seeders/            # Data seeders
│   ├── repositories/       # Shared repository patterns
│   └── sequelize.ts        # DB connection management
│
├── modules/                # Feature modules
│   ├── auth/               # Authentication & SSO
│   ├── tenant/             # Tenant management
│   ├── school/             # Core school operations
│   │   ├── academic/       # Sessions, classes, subjects, timetable
│   │   ├── attendance/     # Attendance system
│   │   ├── examination/    # Exam & marks management
│   │   ├── controllers/    # Student, teacher, employee controllers
│   │   ├── services/       # Student, teacher, employee services
│   │   ├── routes/         # Route registrations
│   │   └── dto/            # Zod validation schemas
│   ├── super-admin/        # Platform admin features
│   └── shared/             # Cross-module shared services
│
└── scripts/                # CLI scripts
    ├── migrate-all.ts      # Database migration runner
    ├── seed-root-admin.ts  # Root admin seeder
    ├── seed-global.ts      # Global permissions seeder
    └── create-tenant.ts    # Tenant provisioning script
```

---

## Middleware Pipeline

Middleware is applied in `app.ts` in this exact order:

| Order | Middleware | File | Purpose |
|-------|-----------|------|---------|
| 1 | **Security** | `security.middleware.ts` | Helmet, HPP, compression |
| 2 | **CORS** | Express cors | Cross-origin requests |
| 3 | **Rate Limit** | Express rate-limit | Request throttling |
| 4 | **Body Parser** | Express json/urlencoded | Parse request bodies |
| 5 | **Cookie Parser** | cookie-parser | Parse cookies |
| 6 | **Tenant** | `tenant.middleware.ts` | Resolve institution from headers |
| 7 | **Auth Guard** | `authGuard.ts` | JWT / Keycloak token validation |
| 8 | **Session** | `academicSession.middleware.ts` | Resolve academic session |
| 9 | **Permission** | `authorize.ts` | RBAC permission checks |

### Academic Session Middleware

The session middleware guarantees `req.academicSessionId` is available:

```
Priority 1: X-Academic-Session-ID header (from frontend)
Priority 2: Cached DB lookup (is_current=true for the tenant)
```

- Uses in-memory cache with 5-minute TTL per institution
- Call `invalidateSessionCache(institutionId)` when the current session changes
- See [ACADEMIC-SESSION.md](./ACADEMIC-SESSION.md) for full details

---

## Creating a New Module

### Step 1: Define the Route

```typescript
// modules/school/routes/my-feature.routes.ts
import { Router } from 'express';
import { authorize } from '../../../core/middleware/authorize';
import { MyFeatureController } from '../controllers/my-feature.controller';

const router = Router();

router.get('/', authorize('my_feature.view'), MyFeatureController.getAll);
router.get('/:id', authorize('my_feature.view'), MyFeatureController.getById);
router.post('/', authorize('my_feature.create'), MyFeatureController.create);
router.put('/:id', authorize('my_feature.update'), MyFeatureController.update);
router.delete('/:id', authorize('my_feature.delete'), MyFeatureController.delete);

export default router;
```

### Step 2: Create the Controller

```typescript
// modules/school/controllers/my-feature.controller.ts
import { Request, Response, NextFunction } from 'express';
import { MyFeatureService } from '../services/my-feature.service';

export class MyFeatureController {
    static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantSchema = req.tenant!.db_schema;
            const sessionId = req.academicSessionId;
            const result = await MyFeatureService.getAll(tenantSchema, sessionId);
            res.json({ success: true, data: result });
        } catch (error) {
            next(error);
        }
    }
}
```

### Step 3: Create the Service

```typescript
// modules/school/services/my-feature.service.ts
import { MyModel } from '../../../database/models/school/MyModel.model';

export class MyFeatureService {
    static async getAll(schema: string, sessionId?: string): Promise<MyModel[]> {
        const where: Record<string, unknown> = {};
        if (sessionId) {
            where.session_id = sessionId;
        }
        return MyModel.schema(schema).findAll({ where });
    }
}
```

### Step 4: Register the Route

```typescript
// modules/school/routes/index.ts
import myFeatureRoutes from './my-feature.routes';
router.use('/my-feature', myFeatureRoutes);
```

---

## Error Handling

Use the centralized `AppError` class:

```typescript
import { AppError } from '../../core/utils/error';

// In services:
throw new AppError('Student not found', 404);
throw new AppError('Insufficient permissions', 403);
throw new AppError('Invalid input data', 400);
```

The global error handler catches these and returns a consistent response:

```json
{
    "success": false,
    "message": "Student not found",
    "status": 404
}
```

---

## Tenant Context

Every tenant-scoped operation must use the tenant's schema:

```typescript
// ✅ Correct — uses tenant schema
const students = await Student.schema(req.tenant!.db_schema).findAll();

// ❌ Wrong — queries default schema
const students = await Student.findAll();
```

The tenant is always available at `req.tenant` in authenticated routes.

---

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `student.service.ts` |
| Classes | PascalCase | `StudentService` |
| Methods | camelCase | `getStudentById` |
| Routes | kebab-case | `/academic-sessions` |
| DB tables | snake_case | `academic_sessions` |
| DB columns | snake_case | `first_name` |
| Enums | PascalCase | `AcademicSessionStatus` |
| Enum values | UPPER_SNAKE_CASE | `ACTIVE`, `DRAFT` |
