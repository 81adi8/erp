# API Conventions

## Base URL

```
Development: http://localhost:3000/api/v1
Production:  https://api.erpsaas.in/api/v1
```

All API endpoints are prefixed with `/api/v1`.

---

## Request Headers

Every API request from the frontend includes these headers automatically (configured in `baseApi.ts`):

| Header | Purpose | Source |
|--------|---------|--------|
| `Authorization` | Bearer JWT token | SecureStorage (localStorage mode) |
| `X-CSRF-Token` | CSRF protection token | Cookie (httpOnly cookie mode) |
| `X-Institution-ID` | Tenant UUID | Stored tenant context |
| `X-Tenant-ID` | Tenant slug (fallback) | URL subdomain |
| `X-Academic-Session-ID` | Selected session UUID | sessionSlice (localStorage) |
| `Content-Type` | `application/json` | Default |

---

## Response Format

### Success Response

```json
{
    "success": true,
    "data": { ... },
    "message": "Optional success message"
}
```

### Paginated Response

```json
{
    "success": true,
    "data": [ ... ],
    "meta": {
        "total": 150,
        "page": 1,
        "limit": 20,
        "totalPages": 8
    }
}
```

### Error Response

```json
{
    "success": false,
    "message": "Detailed error description",
    "status": 400,
    "errors": {
        "email": ["Email is required"],
        "name": ["Name must be at least 2 characters"]
    }
}
```

---

## Endpoint Naming Patterns

```
GET    /school/students              # List all (paginated)
GET    /school/students/:id          # Get single by ID
POST   /school/students              # Create new
PUT    /school/students/:id          # Update by ID
DELETE /school/students/:id          # Delete by ID
PATCH  /school/students/:id/status   # Partial update (status, etc.)
```

### Sub-resources

```
GET    /school/academics/classes/:classId/sections       # Sections of a class
POST   /school/academics/classes/:classId/subjects       # Assign subject to class
GET    /school/academics/academic-sessions/:id/terms     # Terms of a session
```

---

## Route Module Map

| URL Prefix | Module | Description |
|------------|--------|-------------|
| `/api/v1/auth/` | Auth | Login, register, refresh, logout |
| `/api/v1/tenant/school/` | School | Tenant-scoped school operations |
| `/api/v1/school/students/` | Students | Student CRUD |
| `/api/v1/school/academics/` | Academics | Sessions, classes, subjects, timetable |
| `/api/v1/school/attendance/` | Attendance | Attendance records & settings |
| `/api/v1/school/examination/` | Examination | Exams, marks, grades |
| `/api/v1/school/rbac/` | RBAC | Roles, permissions, assignments |
| `/api/v1/school/users/` | Users | User management |
| `/api/v1/school/navigation/` | Navigation | Dynamic sidebar menu |
| `/api/v1/admin/` | Super Admin | Platform-level management |

---

## Pagination

All list endpoints support pagination via query params:

```
GET /school/students?page=1&limit=20&sortBy=created_at&sortOrder=DESC
```

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `sortBy` | string | `created_at` | Column to sort by |
| `sortOrder` | `ASC` \| `DESC` | `DESC` | Sort direction |
| `search` | string | — | Full-text search term |

---

## RTK Query Integration

### Defining Endpoints (Frontend)

```typescript
// core/api/endpoints/myFeatureApi.ts
import { baseApi } from '../baseApi';
import type { ApiResponse, PaginatedResponse } from '../baseApi';

interface MyItem {
    id: string;
    name: string;
}

interface ListParams {
    page?: number;
    limit?: number;
    search?: string;
}

export const myFeatureApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getItems: builder.query<PaginatedResponse<MyItem>, ListParams>({
            query: (params) => ({
                url: '/school/my-feature',
                params,
            }),
            providesTags: ['MyFeature'],
        }),
        
        getItemById: builder.query<ApiResponse<MyItem>, string>({
            query: (id) => `/school/my-feature/${id}`,
            providesTags: (_result, _error, id) => [{ type: 'MyFeature', id }],
        }),
        
        createItem: builder.mutation<ApiResponse<MyItem>, Partial<MyItem>>({
            query: (data) => ({
                url: '/school/my-feature',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['MyFeature'],
        }),
    }),
});

export const {
    useGetItemsQuery,
    useGetItemByIdQuery,
    useCreateItemMutation,
} = myFeatureApi;
```

### Cache Tag Strategy

Tags are registered in `core/config/constants.ts` → `API_TAGS`:

```typescript
export const API_TAGS = {
    STUDENTS: 'Students',
    CLASSES: 'Classes',
    SESSIONS: 'Sessions',
    ATTENDANCE: 'Attendance',
    // ... add new tags here
};
```

**Rules:**
- `providesTags` — what cache entries this query provides
- `invalidatesTags` — what cache entries a mutation invalidates
- Use specific tags `{ type: 'Students', id }` for targeted invalidation
- Use generic tags `'Students'` for list-level invalidation

---

## Authentication Flow

```
1. Login → POST /auth/login → returns JWT + refresh token
2. Store tokens (localStorage or httpOnly cookies)
3. Every request includes Authorization header (auto via baseApi)
4. On 401 → auto-attempt token refresh (POST /auth/refresh)
5. If refresh fails → redirect to /login
```

---

## Academic Session Header

The `X-Academic-Session-ID` header is automatically included in every request:

- Set by the **SessionSelector** component (dropdown in header)
- Persisted in **localStorage** → survives page refreshes
- Read by `baseApi.ts` → `prepareHeaders()` function
- On session switch, `baseApi.util.resetApiState()` clears all caches
- Backend middleware resolves it from header or falls back to DB current session
