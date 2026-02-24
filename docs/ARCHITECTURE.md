# System Architecture

## Overview

School ERP is a **multi-tenant SaaS platform** for educational institutions. Each tenant (school, college, institute) operates in complete data isolation with its own PostgreSQL schema and Keycloak realm.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (React + Vite)                    │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ Landing  │  │  School   │  │  Super   │                  │
│  │   App    │  │   App    │  │  Admin   │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                      │                                       │
│              ┌───────┴───────┐                              │
│              │ @erp/common   │  Shared UI package            │
│              └───────────────┘                              │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP (REST API)
                      │ Headers: Authorization, X-Institution-ID,
                      │          X-Academic-Session-ID
┌─────────────────────┴───────────────────────────────────────┐
│                   SERVER (Express + TypeScript)               │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │              MIDDLEWARE PIPELINE                   │       │
│  │  Security → Tenant → Auth → Session → Routes     │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │              MODULE LAYER                         │       │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │       │
│  │  │ Auth │ │School│ │Attend│ │Tenant│ │Super │  │       │
│  │  │      │ │      │ │ ance │ │      │ │Admin │  │       │
│  │  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘  │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
│  ┌──────────────────────────────────────────────────┐       │
│  │              DATA LAYER                           │       │
│  │  Sequelize ORM + PostgreSQL (multi-schema)        │       │
│  │  Redis (cache + queues) + Keycloak (auth)         │       │
│  └──────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

---

## Multi-Tenancy Model

```
PostgreSQL Database: school_erp
│
├── public schema
│   ├── institutions          # Tenant registry
│   ├── users                 # Shared user accounts
│   ├── roles                 # Global role definitions
│   └── permissions           # Global permission catalog
│
├── tenant_school_abc schema  # Tenant A's data
│   ├── students
│   ├── academic_sessions
│   ├── enrollments
│   ├── attendance_records
│   └── ... (all tenant-specific tables)
│
├── tenant_school_xyz schema  # Tenant B's data
│   ├── students
│   ├── academic_sessions
│   └── ...
```

**Key Principle**: All tenant-specific models use `.schema(schemaName)` to dynamically target the correct schema at runtime.

---

## Request Flow

```
Client Request
    │
    ▼
┌─────────────────────┐
│ Security Middleware   │  helmet, cors, rate-limit, hpp
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Tenant Middleware     │  Resolves institution from X-Institution-ID / X-Tenant-ID
│                       │  Attaches: req.tenant = { id, db_schema, ... }
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Auth Guard            │  Validates JWT / Keycloak token
│                       │  Attaches: req.user = { userId, roles, ... }
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Session Middleware    │  Resolves academic session from header or DB
│                       │  Attaches: req.academicSessionId
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Permission Middleware │  Checks user permissions for the route
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│ Controller            │  Handles request/response only
│    ▼                  │
│ Service               │  Business logic + validation
│    ▼                  │
│ Repository / Model    │  Database operations
└─────────────────────┘
```

---

## Module Architecture

Each domain module follows this structure:

```
modules/<module>/
├── controllers/        # HTTP handlers (req/res only)
├── services/           # Business logic
├── dto/                # Validation schemas (Zod)
├── routes/             # Express route definitions
├── middlewares/         # Module-specific middleware
└── index.ts            # Barrel export
```

### Active Modules

| Module | Description |
|--------|-------------|
| `auth` | JWT authentication, Keycloak SSO, token refresh |
| `tenant` | Tenant (institution) management, onboarding |
| `school` | Core school operations (students, teachers, academics) |
| `school/academic` | Sessions, classes, sections, subjects, curriculum, timetable |
| `school/attendance` | Student/teacher/staff attendance with queue processing |
| `school/examination` | Exams, marks, report cards |
| `super-admin` | Platform-level administration (Users, Tenants, Global Holidays) |

---

## Detailed Documentation

For deep dives into specific systems, refer to:

- [ACADEMIC-SESSION.md](./ACADEMIC-SESSION.md) — Session context & global selection
- [GLOBAL-HOLIDAY.md](./GLOBAL-HOLIDAY.md) — Platform-wide holiday management
- [TIMETABLE.md](./TIMETABLE.md) — Scheduling & conflict resolution
- [ATTENDANCE.md](./ATTENDANCE.md) — QR/Manual attendance & queue processing
- [AUTH-RBAC.md](./AUTH-RBAC.md) — Keycloak integration & permissions
- [DATABASE.md](./DATABASE.md) — Schema design & multi-tenancy rules
- [API-CONVENTIONS.md](./API-CONVENTIONS.md) — Backend/Frontend communication standards

---

## Frontend Architecture

### Portal System

The frontend uses a **portal-based architecture** where each user role has its own portal with distinct layout, navigation, and permissions:

```
school app
├── portals/
│   ├── admin/          # Full system access
│   │   ├── layout/     # AdminLayout.tsx
│   │   ├── modules/    # Feature pages (students, attendance, etc.)
│   │   └── routes.tsx  # Admin-specific routing
│   ├── teacher/        # Teacher portal
│   ├── student/        # Student portal
│   └── staff/          # Staff portal
├── shared/             # Shared across portals
│   ├── components/     # PortalLayout, PortalHeader, SessionSelector
│   └── routing/        # ProtectedRoute, permission guards
└── pages/              # Shared page templates
```

### State Management

```
RTK Query (baseApi)       →  Server state (cached, tag-based invalidation)
Redux Slices              →  Client state
  ├── appearanceSlice     →  Theme, font, layout preferences
  └── sessionSlice        →  Selected academic session (persisted to localStorage)
```

### Shared UI Package (`@erp/common`)

All reusable components live in `client/packages/common/`:

```
@erp/common
├── components/
│   ├── ui/             # Button, Card, Input, Badge, Modal, Tabs, Select, etc.
│   ├── layout/         # PageHeader, Sidebar components
│   ├── data-display/   # StatsCard, DataTable, ProgressRing
│   └── feedback/       # Toast, Alert, LoadingSpinner, Skeleton
├── hooks/              # useFullscreen, useMediaQuery, etc.
├── themes/             # Theme definitions + ThemeSwitcher
├── types/              # Shared TypeScript types
└── utils/              # cn(), formatters, validators
```

---

## Security Model

| Layer | Mechanism |
|-------|-----------|
| **Transport** | HTTPS in production |
| **Headers** | Helmet (CSP, HSTS, X-Frame-Options) |
| **CORS** | Whitelist-based origin control |
| **Rate Limiting** | Per-IP request throttling |
| **Auth** | Keycloak JWT + httpOnly cookies / Bearer tokens |
| **CSRF** | Token-based protection for cookie mode |
| **RBAC** | Permission-based route guards |
| **Tenant Isolation** | Schema-level data separation |
| **Input Validation** | Zod schemas on all inputs |

---

## Caching & Performance

| Concern | Strategy |
|---------|----------|
| API response caching | RTK Query automatic cache + tag invalidation |
| Academic session | In-memory cache with 5-min TTL (server-side) |
| Session persistence | localStorage (client-side) |
| Queue processing | Bull + Redis for async operations (attendance) |
| DB queries | Sequelize eager loading + pagination |
