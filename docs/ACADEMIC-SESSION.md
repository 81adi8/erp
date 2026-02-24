# Academic Session System

## Overview

The **Academic Session** is a core concept that drives data across the entire platform. Every module (students, attendance, exams, fees, timetable) is scoped to a specific academic session (e.g., "2025–26").

A **global session selector** in the portal header allows users to switch between sessions. When switched:
- All RTK Query caches are invalidated
- All pages re-fetch data for the new session
- The backend serves data scoped to that session

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│               PORTAL HEADER                               │
│  ┌────────────────────────────────────┐                  │
│  │  SessionSelector Component         │                  │
│  │  ┌──────────────────────────────┐  │                  │
│  │  │  📅 Session: 2025-26 ▼       │  │                  │
│  │  │  ┌──────────────────────┐    │  │                  │
│  │  │  │ ● 2025-26  ACTIVE  ✓│    │  │                  │
│  │  │  │ ● 2024-25  COMPLETED│    │  │                  │
│  │  │  │ ● 2023-24  ARCHIVED │    │  │                  │
│  │  │  └──────────────────────┘    │  │                  │
│  │  └──────────────────────────────┘  │                  │
│  └────────────────────────────────────┘                  │
└───────────────┬──────────────────────────────────────────┘
                │
    ┌───────────▼───────────┐
    │  Redux sessionSlice   │  ← Global state
    │  + localStorage       │  ← Persisted
    └───────────┬───────────┘
                │
    ┌───────────▼───────────┐
    │  baseApi prepareHeaders│  ← Reads from localStorage
    │  X-Academic-Session-ID │  ← Auto-added to every request
    └───────────┬───────────┘
                │ HTTP
    ┌───────────▼───────────┐
    │  Backend Middleware     │  academicSession.middleware.ts
    │  req.academicSessionId │
    └───────────┬───────────┘
                │
    ┌───────────▼───────────┐
    │  Resolution Logic      │
    │                        │
    │  1. Use header value   │  (if X-Academic-Session-ID exists)
    │  2. Cache lookup       │  (5-min TTL per institution)
    │  3. Database query     │  (is_current=true for tenant)
    └────────────────────────┘
```

---

## Frontend Components

### 1. Redux Slice (`store/slices/sessionSlice.ts`)

Stores the selected session ID and cached info:

```typescript
interface AcademicSessionState {
    selectedSessionId: string | null;
    selectedSessionInfo: SessionInfo | null;  // { id, name, status, dates }
}
```

**Actions:**
| Action | Purpose |
|--------|---------|
| `setSelectedSession(info)` | Set from manual SessionInfo |
| `setSelectedSessionFromApi(session)` | Set from API AcademicSession object |
| `clearSelectedSession()` | Clear selection |

**Selectors:**
| Selector | Returns |
|----------|---------|
| `selectSelectedSessionId` | `string \| null` |
| `selectSelectedSessionInfo` | `SessionInfo \| null` |

**Persistence:** Saved to `localStorage` under key `erp_selected_academic_session`.

---

### 2. Session Selector (`shared/components/SessionSelector.tsx`)

Dropdown component rendered in `PortalHeader`:

- Fetches all sessions via `useGetAcademicSessionsQuery`
- Auto-selects `is_current=true` session on first load
- Shows: session name, status badge (Active/Draft/Completed/Archived), date range, "Current" indicator
- On selection change:
  - Dispatches `setSelectedSessionFromApi()`
  - Calls `baseApi.util.resetApiState()` → forces all pages to re-fetch
- Handles loading, error, and empty states

---

### 3. Hook (`core/hooks/useAcademicSession.ts`)

Convenience hook for any component:

```typescript
import { useAcademicSession } from '../../core/hooks/useAcademicSession';

function MyPage() {
    const {
        sessionId,        // Currently selected session ID
        sessionInfo,      // { name, status, startDate, endDate, isCurrent }
        sessions,         // All available sessions
        isLoading,        // Whether sessions are loading
        switchSession,    // (session: AcademicSession) => void
        clearSession,     // () => void
    } = useAcademicSession();
}
```

---

### 4. Base API Header (`core/api/baseApi.ts`)

The `prepareHeaders` function reads from localStorage and adds the header:

```typescript
// In prepareHeaders():
const sessionData = localStorage.getItem('erp_selected_academic_session');
if (sessionData) {
    const parsed = JSON.parse(sessionData);
    if (parsed?.selectedSessionId) {
        headers.set('X-Academic-Session-ID', parsed.selectedSessionId);
    }
}
```

This ensures **every** API call includes the session context — no need to manually pass it per endpoint.

---

## Backend Middleware

### File: `core/middleware/academicSession.middleware.ts`

Registered in `modules/school/routes/index.ts` after `authGuard`:

```typescript
router.use(authGuard);
router.use(academicSessionMiddleware);
```

### Resolution Logic

```
1. Check X-Academic-Session-ID header
   └─ If valid UUID → req.academicSessionId = headerValue ✓
   
2. Check in-memory cache (Map<institutionId, sessionId>)
   └─ If cached & not expired → req.academicSessionId = cached ✓

3. Query AcademicSession model (is_current=true, institution_id)
   └─ If found → cache it (5-min TTL) → req.academicSessionId ✓

4. If nothing found → req.academicSessionId = undefined
   └─ Services should handle gracefully
```

### Cache Management

```typescript
import {
    invalidateSessionCache,
    clearSessionCache,
} from '../../core/middleware/academicSession.middleware';

// When admin marks a different session as current:
invalidateSessionCache(institutionId);

// During testing/deployment:
clearSessionCache();
```

---

## Using Session in Controllers & Services

### In a Controller

```typescript
async getStudents(req: Request, res: Response, next: NextFunction) {
    try {
        const schema = req.tenant!.db_schema;
        const sessionId = req.academicSessionId;  // ← Always available

        const students = await StudentService.getBySession(schema, sessionId);
        res.json({ success: true, data: students });
    } catch (error) {
        next(error);
    }
}
```

### In a Service

```typescript
static async getBySession(schema: string, sessionId?: string) {
    const where: Record<string, unknown> = {};
    if (sessionId) {
        where.session_id = sessionId;
    }
    return Enrollment.schema(schema).findAll({
        where,
        include: [{ model: Student.schema(schema), as: 'student' }],
    });
}
```

---

## Data Flow Summary

| Step | Component | Action |
|------|-----------|--------|
| 1 | `SessionSelector` | User selects "2025-26" from dropdown |
| 2 | `sessionSlice` | Dispatches `setSelectedSessionFromApi()` |
| 3 | `localStorage` | Persists `{ selectedSessionId: "abc-123", ... }` |
| 4 | `baseApi` | Resets API state → all queries re-run |
| 5 | `baseApi.prepareHeaders` | Adds `X-Academic-Session-ID: abc-123` |
| 6 | `academicSession.middleware` | Sets `req.academicSessionId = "abc-123"` |
| 7 | Controller → Service | Filters data by `session_id = "abc-123"` |
| 8 | Response | Returns only 2025-26 data to the frontend |

---

## Academic Calendar Integration

The Academic Calendar is deeply integrated with the selected session, providing a context-aware management experience.

### 📅 Smart Navigation
The calendar navigation bar allows jumping to any specific month or year within the session:
- **Year Selector**: Only displays years that fall within the `start_date` and `end_date` of the active session.
- **Month Selector**: Dynamically filters months based on the selected year. Months outside the session range are hidden or locked.
- **Auto-Snap**: Changing years automatically snaps the calendar to the closest valid month in the session range.

### 🛡️ Boundary Validation
Navigation is restricted to ensure data integrity:
- **Locked Arrows**: The Prev/Next month buttons are automatically disabled when you reach the first or last month of the academic session.
- **Visual Cues**: Disabled navigation elements use dimmed opacity and restricted cursors.

### 🚫 "Session Over" Protection
For months that partially overlap with the session start/end:
- **Status Overlay**: Dates outside the session range are displayed with a "Session Over" badge.
- **Interaction Guard**: These dates are non-clickable and locked for any data entry (holidays/events).
- **Dimmed Grid**: Uses a grayed-out background to visually distinguish active session days from inactive ones.

---

## Holiday Sync System
Academic sessions are automatically populated with standard holidays from the **Global Holiday System** upon first access. This is handled via a `Lazy Initialization` pattern in the `AcademicCalendarService`.
