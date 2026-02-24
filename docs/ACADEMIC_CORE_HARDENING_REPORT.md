# ACADEMIC CORE HARDENING STARTED

**Inspection Date:** 2026-02-19  
**Inspector:** Principal SaaS Backend Engineer  
**Scope:** Academic Session & Enrollment Engine  

---

## SECTION 1 — SESSION SAFETY

### 1.1 Single Active Session Per Tenant

**FILE:** `server/src/database/sql/academic_sessions_upgrade.sql`

**CODE:**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_only_one_current_session
ON academic_sessions (institution_id)
WHERE (is_current = TRUE);
```

**VERDICT:** ✅ PROTECTED
- Partial unique index ensures only ONE session can have `is_current = TRUE` per tenant
- Database-level enforcement prevents race conditions

### 1.2 Session Locking Enforcement

**FILE:** `server/src/modules/school/attendance/services/student-attendance.service.ts`

**CODE:**
```typescript
if (session.is_locked || session.is_attendance_locked) {
    throw createAttendanceError('SESSION_LOCKED', 'Attendance is locked for this academic session');
}
```

**VERDICT:** ✅ ENFORCED IN SERVICE
- Session lock checked before attendance writes
- Not just UI enforcement

### 1.3 Session Status Validation

**FILE:** `server/src/modules/school/academic/services/session/session-management.service.ts`

**CODE:**
```typescript
async isSessionLocked(schemaName: string, sessionId: string, module?: LockTarget): Promise<boolean> {
    const session = await AcademicSession.schema(schemaName).findByPk(sessionId);
    if (!session) return true; // Treat missing session as locked
    
    if (session.is_locked) return true;
    
    if (module) {
        switch (module) {
            case LockTarget.ATTENDANCE:
                return session.is_attendance_locked;
            // ...
        }
    }
    return false;
}
```

**VERDICT:** ✅ GRANULAR LOCKING
- Master lock + module-specific locks
- Missing session treated as locked (fail-closed)

---

## SECTION 2 — ENROLLMENT INTEGRITY

### ISSUE 1: No Unique Constraint on (student_id + academic_year_id)

**FILE:** `server/src/database/models/school/academics/student/StudentEnrollment.model.ts`

**PROBLEM:**
- No unique constraint on `(student_id, academic_year_id)`
- A student can have multiple active enrollments in the same session
- No database-level protection

**RISK:** CRITICAL
- Double enrollment possible
- Data integrity violation
- Attendance/marks could be duplicated

**FIX REQUIRED:**
```sql
-- Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollment_student_session_unique
ON student_enrollments (student_id, academic_year_id)
WHERE status = 'active';
```

---

### ISSUE 2: No Pre-Create Check in Enrollment Repository

**FILE:** `server/src/modules/school/repositories/enrollment.repository.ts`

**PROBLEM:**
```typescript
async create(dto: CreateEnrollmentDTO, tx?: Transaction): Promise<StudentEnrollment> {
    // NO CHECK for existing enrollment
    return StudentEnrollment.schema(this.getSchema()).create({...});
}
```

**RISK:** HIGH
- Race condition: two concurrent requests could create duplicate enrollments
- Even with unique constraint, would get DB error instead of clean handling

**FIX REQUIRED:**
```typescript
async create(dto: CreateEnrollmentDTO, tx?: Transaction): Promise<StudentEnrollment> {
    // Check for existing active enrollment
    const existing = await this.findByStudentAndSession(dto.studentId, dto.academicYearId);
    if (existing) {
        throw new Error('Student already has an active enrollment for this session');
    }
    
    return StudentEnrollment.schema(this.getSchema()).create({...}, { transaction: tx });
}
```

---

### ISSUE 3: No Retry on Enrollment Operations

**FILE:** `server/src/modules/school/repositories/enrollment.repository.ts`

**PROBLEM:**
- No retry wrapping on DB operations
- Transient failures cause unhandled errors

**RISK:** MEDIUM
- Enrollment creation could fail on DB blips
- User would need to retry manually

**FIX REQUIRED:** Wrap operations with `retryDbOperation()`

---

## SECTION 3 — PROMOTION FLOW

### 3.1 Transaction Safety

**FILE:** `server/src/modules/school/academic/services/session/session-management.service.ts`

**CODE:**
```typescript
async promoteStudents(...): Promise<SessionTransitionResult> {
    const transaction = await sequelize.transaction();
    
    try {
        for (const decision of promotionDecisions) {
            await this.processPromotion(..., transaction);
        }
        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
```

**VERDICT:** ✅ TRANSACTIONAL
- Promotion wrapped in transaction
- Rollback on failure

### ISSUE 4: No Check for Existing Enrollment in Target Session

**FILE:** `server/src/modules/school/academic/services/session/session-management.service.ts`

**PROBLEM:**
```typescript
// In processPromotion()
newEnrollment = await StudentEnrollment.schema(schemaName).create({
    student_id: currentEnrollment.student_id,
    academic_year_id: toSessionId,
    // ...
}, { transaction });
```

- No check if student already has enrollment in target session
- Double promotion possible

**RISK:** HIGH
- Same student promoted twice
- Duplicate active enrollments

**FIX REQUIRED:**
```typescript
// Check for existing enrollment in target session
const existingInTarget = await StudentEnrollment.schema(schemaName).findOne({
    where: {
        student_id: currentEnrollment.student_id,
        academic_year_id: toSessionId,
        status: StudentEnrollmentStatus.ACTIVE
    },
    transaction
});

if (existingInTarget) {
    throw new Error('Student already has an active enrollment in target session');
}
```

---

### ISSUE 5: No Idempotency Key for Promotion

**FILE:** `server/src/modules/school/academic/services/session/session-management.service.ts`

**PROBLEM:**
- No idempotency protection
- Concurrent promotion requests for same student could create duplicates

**RISK:** HIGH
- Double promotion on network retry
- Data corruption

**FIX REQUIRED:**
```typescript
// Add promotion_id for idempotency
interface PromotionRequest {
    promotionId: string; // Client-generated idempotency key
    // ...
}

// Check if promotion already processed
const existingPromotion = await PromotionHistory.schema(schemaName).findOne({
    where: { promotion_id: promotionId }
});
if (existingPromotion) {
    return existingPromotion; // Already processed
}
```

---

## SECTION 4 — SESSION SCOPING

### 4.1 Academic Session Middleware

**FILE:** `server/src/core/middleware/academicSession.middleware.ts`

**CODE:**
```typescript
// Non-blocking: log and continue without session context
console.error('[AcademicSessionMiddleware] Error resolving session:', error);
next();
```

**VERDICT:** ⚠️ NON-BLOCKING
- Middleware continues even if session resolution fails
- Routes may execute without session context

### ISSUE 6: Missing Session Filter in Some Queries

**FILE:** `server/src/modules/school/attendance/services/student-attendance.service.ts`

**CODE:**
```typescript
const academicYearId = (req as any).academicSessionId ||
    req.headers['x-academic-session-id'] as string ||
    req.headers['x-academic-year-id'] as string ||
    '';
```

**PROBLEM:**
- Falls back to empty string if session missing
- Empty string could match unintended records

**RISK:** MEDIUM
- Cross-session data leakage possible
- Wrong session data returned

**FIX REQUIRED:**
```typescript
const academicYearId = (req as any).academicSessionId;
if (!academicYearId) {
    throw new Error('Academic session is required. Please set X-Academic-Session-ID header.');
}
```

---

### 4.2 Attendance Session Scoping

**FILE:** `server/src/modules/school/attendance/services/student-attendance.service.ts`

**VERDICT:** ✅ SESSION SCOPED
- `academic_year_id` used in queries
- Session lock checked before writes

### 4.3 Exam Session Scoping

**FILE:** `server/src/modules/school/examination/services/examination.service.ts`

**VERDICT:** ✅ SESSION SCOPED
- `academic_year_id` filter applied
- Session validation present

---

## SECTION 5 — FAILURE SCENARIOS

### Scenario 1: Double Promotion

**Description:** Admin clicks "Promote" twice due to network delay

**Current Behavior:** Second promotion creates duplicate enrollment

**Fix:** Add idempotency key + check for existing enrollment

### Scenario 2: Concurrent Promotion Race

**Description:** Two admins promote same student simultaneously

**Current Behavior:** Both could succeed, creating duplicate enrollments

**Fix:** 
1. Database unique constraint on (student_id, academic_year_id)
2. Row-level lock during promotion

### Scenario 3: Enrollment Race Condition

**Description:** Two requests to enroll same student in same session

**Current Behavior:** Both could succeed

**Fix:** Pre-create check + unique constraint

### Scenario 4: Session Change During Active Writes

**Description:** Admin changes current session while attendance being marked

**Current Behavior:** Attendance could be written to wrong session

**Fix:** Session ID captured at request start, not re-resolved mid-operation

---

## SECTION 6 — HARDENING TASKS

### TASK 1: Add Unique Constraint (CRITICAL)

**FILE:** New migration file

```sql
-- Migration: 20260219_enrollment_unique_constraint.sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollment_student_session_active
ON student_enrollments (student_id, academic_year_id)
WHERE status = 'active';

-- Handle existing duplicates
-- (Manual cleanup required before deployment)
```

### TASK 2: Add Pre-Create Check (HIGH)

**FILE:** `server/src/modules/school/repositories/enrollment.repository.ts`

```typescript
async create(dto: CreateEnrollmentDTO, tx?: Transaction): Promise<StudentEnrollment> {
    // Check for existing active enrollment
    const existing = await StudentEnrollment.schema(this.getSchema()).findOne({
        where: {
            student_id: dto.studentId,
            academic_year_id: dto.academicYearId,
            status: StudentEnrollmentStatus.ACTIVE
        },
        transaction: tx
    });
    
    if (existing) {
        throw new ApiError(409, 'Student already has an active enrollment for this session');
    }
    
    return StudentEnrollment.schema(this.getSchema()).create({...}, { transaction: tx });
}
```

### TASK 3: Add Promotion Idempotency (HIGH)

**FILE:** `server/src/modules/school/academic/services/session/session-management.service.ts`

```typescript
// Add promotion_id column to promotion_history
// Check for existing promotion before processing
```

### TASK 4: Enforce Mandatory Session (MEDIUM)

**FILE:** `server/src/core/middleware/academicSession.middleware.ts`

```typescript
// For routes that require session context, throw if missing
if (!sessionId && requiresSession(req.path)) {
    return next(new ApiError(400, 'Academic session required'));
}
```

### TASK 5: Add Retry Wrapping (MEDIUM)

**FILE:** `server/src/modules/school/repositories/enrollment.repository.ts`

```typescript
import { retryDbOperation } from '../../../core/resilience/retry.helper';

async create(dto: CreateEnrollmentDTO, tx?: Transaction): Promise<StudentEnrollment> {
    return retryDbOperation(() => 
        StudentEnrollment.schema(this.getSchema()).create({...}, { transaction: tx })
    );
}
```

---

## ACADEMIC CORE RISK SCORE

| Area | Score | Justification |
|------|-------|---------------|
| Session Safety | 9/10 | Unique index, lock enforcement |
| Enrollment Integrity | 5/10 | No unique constraint, no pre-create check |
| Promotion Flow | 7/10 | Transactional but no idempotency |
| Session Scoping | 8/10 | Generally scoped, some fallback issues |
| Failure Handling | 6/10 | Missing race condition protection |

**Overall Score: 7.0/10**

---

## FINAL VERDICT

# ⚠️ PARTIALLY SAFE

### What's Good:
- ✅ Single active session per tenant (DB enforced)
- ✅ Session locking enforced in services
- ✅ Promotion is transactional
- ✅ Attendance/exam session scoping

### What Needs Fixing:
- ❌ No unique constraint on (student_id, academic_year_id)
- ❌ No pre-create check for duplicate enrollment
- ❌ No idempotency for promotion
- ❌ Session middleware non-blocking

### Priority Order:
1. **CRITICAL:** Add unique constraint on enrollments
2. **HIGH:** Add pre-create check in enrollment repository
3. **HIGH:** Add promotion idempotency
4. **MEDIUM:** Enforce mandatory session for scoped routes
5. **MEDIUM:** Add retry wrapping

---

*Academic Core Hardening Complete: 2026-02-19*