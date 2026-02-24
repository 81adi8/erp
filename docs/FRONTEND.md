# Frontend Guide

## Architecture Overview

The frontend is a **pnpm monorepo** with multiple apps sharing a common UI library:

```
client/
├── apps/
│   ├── school/           # Main tenant app
│   ├── super_admin/      # Platform admin dashboard
│   └── landing/          # Public marketing site
└── packages/
    └── common/           # @erp/common — shared UI library
```

---

## School App Structure

```
apps/school/src/
├── App.tsx                         # Root component + routing
├── main.tsx                        # Entry point
│
├── core/                           # Application infrastructure
│   ├── api/
│   │   ├── baseApi.ts              # RTK Query base (auth headers, tenant, session)
│   │   └── endpoints/              # Module-specific API slices
│   │       ├── academicsApi.ts     # Sessions, classes, subjects, timetable
│   │       ├── studentsApi.ts      # Student CRUD
│   │       ├── attendanceApi.ts    # Attendance
│   │       └── ...
│   ├── config/
│   │   ├── constants.ts            # Tags, routes, roles
│   │   └── env.ts                  # Client env config
│   ├── hooks/
│   │   ├── useAuth.ts              # Auth state hook
│   │   ├── useAcademicSession.ts   # Session context hook
│   │   └── usePermissions.ts       # Permission checking hook
│   ├── rbac/                       # Permission utilities
│   ├── storage/                    # SecureStorage, cookies
│   └── tenant/                     # Tenant resolution utilities
│
├── store/                          # Redux store
│   ├── store.ts                    # Store configuration
│   └── slices/
│       ├── appearanceSlice.ts      # Theme, font, layout
│       └── sessionSlice.ts         # Selected academic session
│
├── tenant-modules/
│   └── school/
│       ├── portals/                # Role-based portals
│       │   ├── admin/
│       │   │   ├── layout/         # AdminLayout
│       │   │   ├── modules/        # Feature pages
│       │   │   │   ├── students/
│       │   │   │   ├── attendance/
│       │   │   │   ├── academics/
│       │   │   │   └── ...
│       │   │   └── routes.tsx      # Admin portal routes
│       │   ├── teacher/
│       │   ├── student/
│       │   └── staff/
│       ├── shared/                 # Shared across portals
│       │   └── components/
│       │       ├── PortalLayout.tsx     # Generic portal shell
│       │       ├── PortalHeader.tsx     # Header (search, session, theme)
│       │       ├── SessionSelector.tsx  # Academic session dropdown
│       │       └── DynamicNavigation.tsx
│       └── pages/                  # Shared page templates
└── styles/                         # Global CSS
```

---

## Shared UI Package (`@erp/common`)

Import shared components throughout any app:

```tsx
import { Button, Card, Badge, Modal, Tabs, ThemeSwitcher } from '@erp/common';
```

### Available Components

| Category | Components |
|----------|-----------|
| **UI** | `Button`, `Input`, `Badge`, `Card`, `Modal`, `Tabs`, `Select`, `SearchableSelect`, `ClassSelect`, `SectionSelect`, `Tooltip` |
| **Layout** | `PageHeader`, `Sidebar` |
| **Data Display** | `StatsCard`, `DataTable`, `ProgressRing` |
| **Feedback** | `Toast`, `Alert`, `Skeleton`, `LoadingSpinner` |
| **Theme** | `ThemeSwitcher`, theme definitions |

### Adding a New Shared Component

1. Create the component in `packages/common/src/components/<category>/`
2. Export from the appropriate index file (e.g., `components/ui/index.ts`)
3. Re-export from `packages/common/src/index.ts`

---

## State Management

### RTK Query (Server State)

All API calls use RTK Query via `baseApi`:

```typescript
// core/api/endpoints/studentsApi.ts
import { baseApi } from '../baseApi';

export const studentsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getStudents: builder.query({
            query: (params) => ({ url: '/school/students', params }),
            providesTags: ['Students'],
        }),
    }),
});

export const { useGetStudentsQuery } = studentsApi;
```

**Cache invalidation** uses RTK Query tags (`providesTags` / `invalidatesTags`). Available tags are defined in `core/config/constants.ts` → `API_TAGS`.

### Redux Slices (Client State)

| Slice | Purpose | Persisted? |
|-------|---------|-----------|
| `appearanceSlice` | Theme mode, font, layout density, etc. | ✅ localStorage |
| `sessionSlice` | Selected academic session ID + info | ✅ localStorage |

### Using the Store

```tsx
import { useAppDispatch, useAppSelector } from '../store/store';
import { selectSelectedSessionId } from '../store/slices/sessionSlice';

function MyComponent() {
    const sessionId = useAppSelector(selectSelectedSessionId);
    // ...
}
```

---

## Academic Session Context

The session selector in the header provides global session context:

```tsx
import { useAcademicSession } from '../../core/hooks/useAcademicSession';

function MyPage() {
    const { sessionId, sessionInfo, sessions, switchSession } = useAcademicSession();
    // sessionId is automatically sent to backend via X-Academic-Session-ID header
}
```

See [ACADEMIC-SESSION.md](./ACADEMIC-SESSION.md) for full details.

---

## Component Design Rules

### ✅ Do

- **Functional components only** — no class components
- **One responsibility per component** — break large components into smaller ones
- **Use `@erp/common` components** — don't create duplicate UI primitives
- **Use `React.memo`** for expensive render components
- **Use `useMemo` / `useCallback`** for computed values and event handlers
- **Handle all states** — loading, error, empty, success
- **Use `framer-motion`** for animations

### ❌ Don't

- **No inline API calls** — always use RTK Query hooks
- **No `any` types** — use proper TypeScript types
- **No hardcoded permissions** — use `usePermission` hook
- **No state in URL** when it should be in Redux (and vice versa)
- **No god components** (500+ lines) — break them up

---

## Creating a New Feature Page

### Step 1: Create the Page Component

```
portals/admin/modules/<feature>/
├── FeaturePage.tsx         # Main page component
├── components/             # Feature-specific sub-components
│   ├── FeatureList.tsx
│   └── FeatureForm.tsx
└── index.ts                # Barrel export
```

### Step 2: Add RTK Query Endpoints

```typescript
// core/api/endpoints/featureApi.ts
export const featureApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getFeatures: builder.query({
            query: (params) => ({ url: '/school/features', params }),
            providesTags: ['Features'],
        }),
        createFeature: builder.mutation({
            query: (data) => ({ url: '/school/features', method: 'POST', body: data }),
            invalidatesTags: ['Features'],
        }),
    }),
});
```

### Step 3: Register the Route

```tsx
// portals/admin/routes.tsx
const FeaturePage = lazy(() => import('./modules/feature/FeaturePage'));

// In the route config:
{ path: 'features', element: <FeaturePage /> }
```

---

## Routing & Navigation

Routes are defined per portal in `portals/<portal>/routes.tsx`. The navigation sidebar is dynamically built from the backend based on user permissions.

```tsx
// Lazy-loaded routes for code splitting
const StudentsPage = lazy(() => import('./modules/students/StudentsPage'));
const AttendancePage = lazy(() => import('./modules/attendance/AttendancePage'));
```

---

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Component files | PascalCase | `StudentsPage.tsx` |
| Utility files | kebab-case | `use-permissions.ts` |
| Components | PascalCase | `<StudentCard />` |
| Hooks | camelCase (use prefix) | `useAcademicSession` |
| Props interfaces | PascalCase + Props suffix | `StudentCardProps` |
| Constants | UPPER_SNAKE_CASE | `API_TAGS` |
| Redux actions | camelCase | `setSelectedSession` |
| API hooks | use + Verb + Query/Mutation | `useGetStudentsQuery` |
