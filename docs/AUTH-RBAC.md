# Authentication & RBAC

## Overview

The platform uses a hybrid authentication system:
- **Primary Auth**: Keycloak (SSO) for enterprise-grade security.
- **Tokens**: JWT (JSON Web Tokens) for API authorization.
- **Persistence**: Supports both `httpOnly` cookies and `localStorage` (configurable).

---

## Authentication Flow

### 1. Token Acquisition
User logs in through the client app.
- **SSO Flow**: Redirects to Keycloak login page.
- **Direct Flow**: Client sends credentials to `/auth/login`.

### 2. Token Storage Strategy
The system supports two storage modes, controlled by `CookieConsentManager`:

| Mode | Storage | Transmission | Security |
|------|---------|--------------|-----------|
| **Secure Local** | `localStorage` | `Authorization: Bearer <token>` | High (XSS risk mitigated by small TTL) |
| **HttpOnly Cookie** | `httpOnly` Cookie | Automatic | Very High (XSS safe, CSRF protected) |

### 3. Token Refresh
When an Access Token expires (15m), the client automatically attempts a refresh using the Refresh Token (7d). This happens in `baseApi.ts` without user interruption.

---

## Role-Based Access Control (RBAC)

The system uses a **Permission-Based** model rather than just Role-Based. Roles are merely collections of permissions.

### 1. Permissions (The "What")
Permissions are fine-grained strings defined in `global-permissions.seeder.ts`:
- `student.view`, `student.create`, `student.delete`
- `attendance.mark`, `attendance.report`
- `academics.session.manage`

### 2. Roles (The "Who")
Roles group permissions together:
- `admin`: Has almost all permissions.
- `teacher`: Has permissions related to their classes/sections.
- `student`: Has read-only access to their own data.

### 3. Role Templates
To make tenant setup easy, the system uses **Role Templates**. When a new school is created, it inherits a set of default roles pre-configured with the correct permissions.

---

## Code Examples

### Checking Permissions (Frontend)

```tsx
import { usePermission } from '@core/rbac';

function MyComponent() {
    const canCreate = usePermission('student.create');

    return (
        <Button disabled={!canCreate}>
            Add Student
        </Button>
    );
}
```

### Protecting Routes (Frontend)

```tsx
// portals/admin/routes.tsx
{
    path: 'settings',
    element: (
        <ProtectedRoute permission="settings.view">
            <SettingsPage />
        </ProtectedRoute>
    )
}
```

### Protecting Routes (Backend)

```typescript
// modules/school/routes/student.routes.ts
import { authorize } from '../../../core/middleware/authorize';

router.post('/', 
    authorize('student.create'), 
    StudentController.create
);
```

---

## Global Permissions Seeding

All permissions must be registered in the global catalog before they can be assigned.

1. Add the permission to `server/src/database/seeders/global-permissions.seeder.ts`.
2. Run the seeder:
   ```bash
   cd server
   pnpm seed:global
   ```
3. Update specific role templates if needed.
