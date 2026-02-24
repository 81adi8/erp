# Attendance Module

## Overview

The Attendance module handles daily attendance for Students, Teachers, and Staff. It is designed for high performance using an asynchronous queue system to handle bulk operations (e.g., marking attendance for 500 students at once).

---

## Technical Architecture

```
Frontend (Mark Attendance)
    │
    ▼
Backend Controller (Request)
    │
    ▼
Attendance Queue Service (Producer)
    │
    ▼
┌──────────────────────────┐
│   BULL QUEUE (Redis)      │
└───────────┬──────────────┘
            ▼
Attendance Worker (Consumer)
    │
    ▼
Database (PostgreSQL)
```

---

## Key Components

### 1. Queue System
- **File**: `server/src/core/queue/QueueManager.ts`
- **Queue Name**: `attendance-queue`
- **Purpose**: Decouples the HTTP response from the heavy database write operations.

### 2. Attendance Marking
When attendance is marked:
1. Validates the request (session, date, student IDs).
2. Pushes a "job" to the Redis queue.
3. Returns a `jobId` to the frontend immediately.

### 3. Real-time Feedback
The frontend can listen for the job completion status via:
- **Polling**: `GET /api/v1/school/attendance/jobs/:jobId`
- **Events**: (Planned) WebSocket updates for real-time progress bars.

---

## Configuration

Attendance behavior is controlled by per-tenant settings:

| Setting | Description |
|---------|-------------|
| `attendance_mode` | `DAILY` (once per day) or `PERIOD` (per subject/slot). |
| `backdate_days` | Number of days in the past the user can mark attendance. |
| `allow_future_date` | Whether attendance can be marked for tomorrow (usually false). |
| `notification_on_absent` | Whether to trigger auto-SMS/Email to parents for absentees. |

---

## Database Models

- **`AttendanceSettings`**: Configuration for the institution.
- **`StudentAttendance`**: The actual record (Present, Absent, Late, Excused).
- **`AttendanceAuditLog`**: Tracks who changed attendance and why (for compliance).

---

## Code Example: Marking Attendance

### Frontend Request
```typescript
const [markAttendance] = useMarkAttendanceMutation();

const handleSave = async (data) => {
    await markAttendance({
        date: '2026-02-11',
        section_id: 'section-uuid',
        records: [
            { student_id: 's1', status: 'PRESENT' },
            { student_id: 's2', status: 'ABSENT', remarks: 'Sick' }
        ]
    }).unwrap();
    
    toast.success('Attendance submitted to queue');
};
```

### Backend Service (Producer)
```typescript
// server/src/modules/school/attendance/services/AttendanceQueue.service.ts
static async queueBulkAttendance(data: AttendancePayload) {
    const job = await attendanceQueue.add('mark-bulk-attendance', data, {
        attempts: 3,
        backoff: 5000
    });
    return job.id;
}
```
