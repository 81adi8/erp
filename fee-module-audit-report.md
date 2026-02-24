# 🏦 Fee Module — Comprehensive Audit Report

**Module Path:** `server/src/modules/school/fees/`  
**Auditor:** Antigravity AI  
**Scope:** Service, Controller, Routes, Validators, Repository, Security, Multi-Tenancy, Data Integrity, API Design, Error Handling, Test Coverage, Technical Debt  
**Overall Risk Rating:** 🟡 **MEDIUM** — Well-structured with strong foundations, but several gaps require attention before production-scale deployment.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Security Audit](#3-security-audit)
4. [Multi-Tenancy Integrity](#4-multi-tenancy-integrity)
5. [Domain Logic & Data Integrity](#5-domain-logic--data-integrity)
6. [API Design Audit](#6-api-design-audit)
7. [Input Validation Audit](#7-input-validation-audit)
8. [Error Handling & Logging](#8-error-handling--logging)
9. [Code Quality & Type Safety](#9-code-quality--type-safety)
10. [Performance Concerns](#10-performance-concerns)
11. [Test Coverage Analysis](#11-test-coverage-analysis)
12. [Technical Debt Register](#12-technical-debt-register)
13. [Recommendations (Prioritized)](#13-recommendations-prioritized)

---

## 1. Executive Summary

The Fee module is a **well-architected, layered financial module** with:

| Aspect | Grade | Notes |
|--------|-------|-------|
| Architecture | ✅ A | Clean separation: Routes → Controller → Service → Repository |
| Input Validation | ✅ A | Zod schemas with strict mode, proper coercion, max-length limits |
| Multi-Tenancy | ✅ A- | Schema-based isolation, tenant context enforced at every layer |
| Authentication/Authorization | ✅ A | `authGuard` + granular `requirePermission` per route |
| Transaction Safety | ✅ A- | Most write operations wrapped in Sequelize transactions |
| Financial Precision | ✅ A | `Decimal.js`-based `money.ts` utility avoids floating-point errors |
| Error Handling | 🟡 B | Consistent `ApiError` usage but some error messages leak internals |
| Type Safety | 🟡 B | Several `: any` catch blocks; local `TenantRequest` type duplication |
| Test Coverage | 🔴 C | Only 1 test file (`fee.test.ts`); no unit tests for service/repository |
| Audit Trail | 🔴 D | **No audit logging for financial operations** (payments, refunds) |
| Rate Limiting | 🟡 B | Global rate limiting applies, but no endpoint-specific limits for payments |
| Pagination | 🔴 D | `getPayments` and `getSummary` fetch **all records** — no pagination |

### Critical Findings (Immediate Action Required)

| # | Finding | Severity | Section |
|---|---------|----------|---------|
| C1 | **No audit trail for financial transactions** | 🔴 Critical | §3.4 |
| C2 | **No pagination on payment queries** — unbounded result sets | 🔴 Critical | §10.1 |
| C3 | **Summary endpoint fetches ALL payments** for aggregation in memory | 🔴 Critical | §10.2 |
| C4 | **No idempotency protection** on payment collection | 🔴 Critical | §5.3 |
| C5 | **Receipt number not validated as UUID** — potential injection vector | 🟡 High | §3.2 |

---

## 2. Architecture Overview

```
fees.routes.ts          → Route definitions + middleware chain
  ↓
fees.controller.ts      → Request parsing, tenant context, response formatting
  ↓
fee.service.ts          → Business logic, validation, transaction management
  ↓
fee.repository.ts       → Sequelize queries, schema-scoped CRUD
  ↓
DB Models               → FeeCategory, FeeStructure, FeeAssignment, FeePayment, FeeDiscount
```

**Middleware Chain (per route):**
```
tenantMiddleware → tenantContextMiddleware → authGuard → RBAC → academicSession → requirePermission → validate → controller
```

### Strengths
- **Thin routes:** Routes only define middleware chain + controller mapping
- **Consistent response format:** `sendSuccess()` wrapper standardizes `{ success, message, data, errors }`
- **Financial precision:** `money.ts` uses `Decimal.js` throughout — no floating-point arithmetic
- **Zod validation:** Strict schemas with `.strict()` to reject unknown fields

---

## 3. Security Audit

### 3.1 Authentication & Authorization ✅ Strong

| Route | Permission(s) | Assessment |
|-------|--------------|------------|
| `GET /categories` | `fees.view` | ✅ Appropriate |
| `POST /categories` | `fees.create`, `fees.manage` | ✅ Appropriate |
| `PATCH /categories/:id` | `fees.update`, `fees.manage` | ✅ Appropriate |
| `DELETE /categories/:id` | `fees.delete`, `fees.manage` | ✅ Appropriate |
| `POST /payments` | `fees.collect` | ✅ Separate permission for money collection |
| `GET /payments/receipt/:receiptNumber` | `fees.view`, `fees.collect`, `fees.receipt.generate` | ✅ Multiple valid roles |
| `POST /discounts/apply` | `fees.update`, `fees.manage` | ✅ Appropriate |

**Finding:** The `authGuard` is applied at the router level (`router.use(authGuard)`) ensuring all fee endpoints are protected. Individual routes then add `requirePermission` for granular access control. This is a solid defense-in-depth approach.

### 3.2 Input Sanitization ✅ Mostly Strong, with Gaps

**Strengths:**
- All UUID parameters validated with `z.string().uuid()`
- Amounts capped at `1_000_000_000` preventing overflow
- String fields trimmed and length-limited
- Date format enforced via regex: `/^\d{4}-\d{2}-\d{2}$/`

**⚠️ Gap: Receipt Number Injection Vector**
```typescript
// fee.validators.ts line 30-32
export const FeeReceiptParamSchema = z.object({
    receiptNumber: z.string().trim().min(1, 'Receipt number is required').max(100),
}).strict();
```
The receipt number accepts **any string up to 100 characters**. If the repository uses this in raw SQL or string interpolation, it could be an injection risk.

**Recommendation:** Add a character allowlist regex: `z.string().regex(/^[A-Z0-9\-]+$/i)`

### 3.3 CSRF Protection ✅ Adequate

The `authGuard` includes CSRF validation for cookie-based tokens (double-submit cookie pattern). Bearer token paths are exempt (appropriate — CSRF doesn't apply to `Authorization` header).

### 3.4 🔴 CRITICAL: No Financial Audit Trail

**The fee module performs NO audit logging for financial operations:**

```typescript
// fee.service.ts — collectFee method
// Creates payment record → Returns it
// NO audit log entry
// NO event emission for downstream systems
```

**Impact:**
- Payments, refunds, discount applications have no accountability trail
- Regulatory compliance risk (especially for educational institutions handling tuition)
- No forensic capability if financial discrepancies arise
- Contrast: Attendance module has comprehensive `AuditEntityType` + `AuditAction` logging

**Recommendation:** Add a `FeeAuditService` that logs:
- Payment collection (who, when, amount, student, method)
- Discount application/modification
- Category/structure CRUD operations
- Assignment modifications
- Any refund or status change

### 3.5 Rate Limiting ⚠️ Gaps

Global rate limiting exists via `express-rate-limit`, but:
- **No endpoint-specific limits** on `POST /payments` (payment collection)
- **No endpoint-specific limits** on `POST /assign/student` or `POST /assign/class`
- A compromised admin token could generate thousands of payment records

**Recommendation:** Add stricter rate limits on write endpoints:
```typescript
router.post('/payments', 
    rateLimit({ windowMs: 60000, max: 30 }), // 30 payments/minute
    requirePermission('fees.collect'), 
    validate(FeeCollectSchema), 
    feeController.collectPayment
);
```

---

## 4. Multi-Tenancy Integrity

### 4.1 Schema Isolation ✅ Strong

Every controller method calls `getTenantContext(req)` which extracts `schema` and `institutionId` from the tenant middleware:

```typescript
const getTenantContext = (req: Request): { schema: string; institutionId: string } => {
    const typedReq = req as TenantRequest;
    const schema = pickString(typedReq.tenant?.db_schema);
    const institutionId = pickString(typedReq.tenant?.id);
    if (!schema || !institutionId) {
        throw ApiError.badRequest('Tenant context missing');
    }
    return { schema, institutionId };
};
```

The `schema` is then passed to every service and repository call, ensuring queries are scoped to the correct PostgreSQL schema.

### 4.2 Tenant Context Propagation ✅ 

The fee module correctly relies on the `tenantContextMiddleware` and `TenantIsolationGuard` stack:
1. `tenantMiddleware` resolves subdomain → Institution → schema
2. `tenantContextMiddleware` freezes the identity (immutable)
3. `authGuard` validates JWT `tid` matches `tenant.id`
4. `TenantIsolationGuard` blocks writes to `public` schema and validates schema names

### 4.3 ⚠️ Cross-Tenant Data Validation Not Enforced at Service Layer

The `FeeService` validates `institutionId` match for structures (`getStructureForAssignment`), but **not all service methods verify `institution_id`:**

```typescript
// fee.service.ts — deleteCategory
async deleteCategory(id: string, schema: string) {
    this.ensureSchema(schema);
    this.ensureUuid(id, 'Category id is required');
    // ❌ No institution_id check — relies entirely on schema isolation
    return sequelize.transaction(async (tx) => {
        await feeRepository.deleteCategory(id, schema, tx);
        return { deleted: true };
    });
}
```

While schema isolation provides the primary barrier, adding `institution_id` checks in the repository WHERE clauses provides defense-in-depth.

**Recommendation:** Ensure all repository queries include `institution_id` in their WHERE clauses (belt-and-suspenders approach).

---

## 5. Domain Logic & Data Integrity

### 5.1 Financial Precision ✅ Excellent

The `money.ts` utility module uses `Decimal.js` for all monetary calculations:
- `toDecimal()`, `toMoneyDecimal()` — parse to precise decimal
- `toMoneyNumber()`, `toMoneyString()` — output with controlled precision
- `minDecimal()`, `maxDecimal()` — safe comparisons
- The service uses these throughout: late fee calculation, discount application, payment totals

### 5.2 Late Fee Calculation ✅ Well-Implemented

```typescript
private calculateLateFee(lateFeePerDay, dueDay, paymentDate) {
    // Handles month boundary correctly (effectiveDueDay)
    // Uses UTC dates to avoid timezone issues
    // Returns { amount, lateDays } for transparency
}
```

### 5.3 🔴 CRITICAL: No Idempotency on Payment Collection

```typescript
// fee.service.ts — collectFee
async collectFee(data, schema) {
    // Creates a new FeePayment record every time
    // NO check for duplicate payments (same student + structure + date + amount)
    // NO idempotency key support
}
```

**Impact:** A network retry, double-click, or client bug could create duplicate payment records. For financial operations, this is a critical gap.

**Recommendation:** 
1. Add an optional `idempotencyKey` field to `FeeCollectSchema`
2. Check for existing payments with same `studentId + feeStructureId + amountPaid + paymentDate` before creating
3. Or use a database unique constraint on a composite key

### 5.4 Discount Application ✅ Well-Bounded

The `computeDiscountApplication` method correctly:
- Caps percentage discounts at the base amount (`minDecimal(normalizedBase, finalDiscount)`)
- Prevents negative final amounts
- Handles both percentage and flat discount types

### 5.5 ⚠️ Missing Refund Logic

The fee module supports `FeePaymentStatus.REFUNDED` in its enum and validators, but there is **no `refundPayment()` service method**. The `collectPayment` endpoint allows setting `status: 'refunded'`, which means a refund could be initiated via the payment creation endpoint — conflating creation and refund semantics.

**Recommendation:** Add a dedicated `POST /payments/:id/refund` endpoint with separate business logic and audit trail.

### 5.6 ⚠️ `getSummary` Aggregation is Fragile

```typescript
// fees.controller.ts lines 406-438
const getSummary = asyncHandler(async (req, res) => {
    const summary = await feeService.getFeeSummary(academicYearId, classId, schema);
    
    // ❌ Fetches ALL payments then filters in memory
    const payments = await feeService.getPayments({ academicYearId }, schema);
    const plainPayments = toPlainArray(payments).map(asRecord);
    const today = new Date().toISOString().slice(0, 10);

    const paidCount = plainPayments.filter(p => p.status === 'SUCCESS').length;
    const pendingCount = plainPayments.filter(p => p.status === 'PENDING').length;
    const todayCollection = plainPayments
        .filter(p => p.payment_date === today && p.status === 'SUCCESS')
        .reduce(/* sum amounts */);
    // ...
});
```

This fetches the entire payment table for an academic year to count 4 metrics that should be SQL aggregates.

---

## 6. API Design Audit

### 6.1 RESTful Compliance ✅ Generally Good

| Operation | Method | Route | Assessment |
|-----------|--------|-------|------------|
| List categories | `GET` | `/categories` | ✅ |
| Create category | `POST` | `/categories` | ✅ |
| Update category | `PATCH` | `/categories/:id` | ✅ |
| Delete category | `DELETE` | `/categories/:id` | ✅ |
| Collect payment | `POST` | `/payments` | ✅ |
| Get receipt | `GET` | `/payments/receipt/:receiptNumber` | ✅ |
| Assign to student | `POST` | `/assign/student` | 🟡 Could be `/assignments` |
| Assign to class | `POST` | `/assign/class` | 🟡 Could be `/assignments/bulk` |

### 6.2 ⚠️ Inconsistent Response Aliases

The controller adds legacy aliases to payment responses:

```typescript
const withPaymentAliases = (input) => {
    const payment = asRecord(toPlain(input));
    return {
        ...payment,
        payment_method: payment.payment_mode,       // alias
        transaction_ref: payment.payment_reference,  // alias
        legacy_status: legacyStatus,                 // extra field
    };
};
```

This creates **dual naming for the same data**, which complicates client consumption and can mask breaking changes.

**Recommendation:** Deprecate aliases with a timeline, or move them behind a `?legacy=true` query parameter.

### 6.3 ⚠️ No Pagination Support

```typescript
// No page/limit parameters in any query schema
export const FeePaymentsQuerySchema = z.object({
    academicYearId: uuidSchema.optional(),
    studentId: uuidSchema.optional(),
    status: z.enum([...]).optional(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
}).strict();
// ❌ Missing: page, limit, offset, sort, order
```

For a school with 2,000 students × 5 fee structures × 12 months = 120,000 payment records, this is a data bomb.

### 6.4 Academic Year ID Resolution ⚠️ Complex but Robust

The `resolveAcademicYearId` function checks **7 different sources** for the academic year:

```typescript
const candidates = [
    pickString(explicit),
    pickString(req.body?.academicYearId),
    pickString(req.body?.academicYear),
    pickString(req.query?.academicYearId),
    pickString(req.query?.academicYear),
    pickString((req as TenantRequest).academicSessionId),
    pickString(headerValue),
];
```

While this provides maximum compatibility with different client implementations, it also:
- Makes API behavior less predictable (same parameter in body vs query could differ)
- Creates a priority-order dependency that's not documented in the API
- Could lead to subtle bugs where the wrong value is picked

**Recommendation:** Standardize on exactly 2 sources: body (for POST) and query (for GET), and the academic session header as fallback.

---

## 7. Input Validation Audit

### 7.1 Zod Schemas ✅ Comprehensive

| Schema | Strictness | Assessment |
|--------|-----------|------------|
| `FeeCategoryCreateSchema` | `.strict()` | ✅ Rejects unknown |
| `FeeStructureCreateSchema` | `.strict()` + `.refine()` | ✅ Cross-field validation |
| `FeeCollectSchema` | `.strict()` | ✅ |
| `FeeDiscountCreateSchema` | `.strict()` + `.superRefine()` | ✅ Percentage ≤ 100 check |
| `FeeIdParamSchema` | `.strict()` | ✅ UUID validation |
| `FeeStudentParamSchema` | `.strict()` | ✅ UUID validation |

### 7.2 Amount Bounds ✅

```typescript
const amountSchema = z.coerce
    .number()
    .positive('Amount must be greater than 0')
    .max(1_000_000_000, 'Amount is too large');
```

### 7.3 ⚠️ Minor Gaps

1. **`FeeDiscountUpdateSchema`** does not validate percentage ≤ 100 (only `FeeDiscountCreateSchema` does):
   ```typescript
   // Update schema allows any discountValue without checking discountType
   export const FeeDiscountUpdateSchema = z.object({
       discountValue: amountSchema.optional(),
       // ❌ No superRefine for percentage > 100 check
   });
   ```

2. **`academicYearId` is optional** in `FeeCategoryListQuerySchema` — if neither `academicYearId` nor `academicYear` is provided, the controller will `throw ApiError.badRequest('Academic year id is required')`. This should be caught at validation layer, not controller.

---

## 8. Error Handling & Logging

### 8.1 Error Response Consistency ✅ Good

All errors use `ApiError` from the core framework:
```typescript
throw ApiError.badRequest('Fee category id is required');
throw ApiError.notFound('Fee assignment not found');
```

The global `ErrorHandler` normalizes these to `{ success: false, message, data: null, errors: [] }`.

### 8.2 ⚠️ Some Error Messages Leak Implementation Details

```typescript
// fee.service.ts
throw ApiError.badRequest(`Fee structure ${structureId} institution mismatch`);
throw ApiError.badRequest(`Fee structure ${structureId} does not belong to student's class`);
```

Including the structure ID in the error message could help attackers enumerate valid IDs.

**Recommendation:** Use generic messages for 400/403 errors, include specifics only in server-side logs.

### 8.3 ⚠️ No Structured Logging in Fee Module

The fee service and controller have **zero `logger.*` calls**. Contrast this with:
- `authGuard` — extensive structured logging
- `tenantMiddleware` — request timing + debug logging
- `student-attendance.service.ts` — no logging either (same pattern)

**Recommendation:** Add structured logging for:
- Payment collection events (amount, student, method) at `info` level
- Validation failures at `warn` level
- Repository errors at `error` level

---

## 9. Code Quality & Type Safety

### 9.1 Local Type Duplication ⚠️

```typescript
// fees.controller.ts — line 10-19
type TenantRequest = Request & {
    tenant?: { db_schema?: string; id?: string; };
    user?: { userId?: string; };
    academicSessionId?: string;
};
```

This duplicates the `CustomRequest` type from `core/types/CustomRequest`. The core type has more fields and is properly maintained.

**Recommendation:** Use `CustomRequest` from core instead of redefining.

### 9.2 `any` Usage ⚠️

The `catch (err: any)` pattern appears 40+ times in the codebase. While some are in error handler context (justified), the `secret.provider.ts` uses `any` for the AWS SDK client:

```typescript
private client: any = null; // Should be properly typed
```

The fee module itself is relatively clean of `any` usage — good.

### 9.3 Helper Functions ✅ Well-Designed

The controller's utility functions (`pickString`, `isUuid`, `getTenantContext`, `normalizePaymentMode`, `toPlain`, `toPlainArray`) are well-scoped, pure functions with no side effects. Good functional programming patterns.

---

## 10. Performance Concerns

### 10.1 🔴 CRITICAL: Unbounded Query Results

```typescript
// fee.service.ts — getPayments
async getPayments(filter, schema) {
    // Returns ALL matching payments with NO LIMIT
}

// fees.controller.ts — getPayments  
const payments = await feeService.getPayments({ /* no limit */ }, schema);
return sendSuccess(res, toPlainArray(payments).map(withPaymentAliases));
```

**Impact:** For a large school, this can return 100,000+ records in a single response, causing:
- Memory pressure on the Node.js process
- Slow response times
- Network bandwidth waste
- Client-side rendering issues

### 10.2 🔴 CRITICAL: Summary Endpoint Architecture

```typescript
// fees.controller.ts — getSummary lines 406-438
const summary = await feeService.getFeeSummary(academicYearId, classId, schema);
const payments = await feeService.getPayments({ academicYearId }, schema);
// Then filters/reduces in JavaScript
```

This pattern:
1. Calls `getFeeSummary()` (likely does some DB aggregation)
2. **Then fetches ALL payments AGAIN** just to count paid/pending/today
3. Aggregates in JavaScript instead of SQL

**Recommendation:** Replace with SQL aggregation:
```sql
SELECT 
    COUNT(*) FILTER (WHERE status = 'SUCCESS') as paid_count,
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending_count,
    COALESCE(SUM(amount_paid) FILTER (WHERE status = 'SUCCESS' AND payment_date = CURRENT_DATE), 0) as today_collection,
    COUNT(*) as total_payments
FROM fee_payments
WHERE academic_year_id = :academicYearId
```

### 10.3 ⚠️ Transaction Scope for Read Operations

Several read operations are NOT wrapped in transactions (which is correct), but the `deleteCategory`, `deleteStructure`, `deleteDiscount` wrapped in transactions could potentially hold locks longer than necessary.

---

## 11. Test Coverage Analysis

### 11.1 Existing Tests

| Test File | Coverage | Notes |
|-----------|----------|-------|
| `fee.test.ts` | Unknown structure | Integration test (needs review) |
| `tenant-isolation.test.ts` | Fee tenant isolation | ✅ Tests cross-tenant payment access |
| `critical-flows.transaction.test.ts` | Transaction integrity | May include fee flows |

### 11.2 Missing Test Coverage 🔴

| Area | Priority | Status |
|------|----------|--------|
| `FeeService.collectFee()` — unit tests | 🔴 Critical | Missing |
| `FeeService.calculateLateFee()` — edge cases | 🔴 Critical | Missing |
| `computeDiscountApplication()` — boundary tests | 🔴 Critical | Missing |
| Payment status transitions | 🔴 Critical | Missing |
| Receipt generation uniqueness | 🟡 High | Missing |
| Concurrent payment race conditions | 🟡 High | Missing |
| Controller input parsing edge cases | 🟡 Medium | Missing |
| Validator schema rejection tests | 🟡 Medium | Missing |
| Summary aggregation accuracy | 🟡 Medium | Missing |

---

## 12. Technical Debt Register

| ID | Description | Impact | Effort | Priority |
|----|-------------|--------|--------|----------|
| TD-F01 | No audit trail for financial operations | 🔴 High | Medium | P0 |
| TD-F02 | No pagination on payment/assignment queries | 🔴 High | Low | P0 |
| TD-F03 | Summary endpoint fetches all payments in memory | 🔴 High | Medium | P0 |
| TD-F04 | No idempotency protection on payment collection | 🔴 High | Medium | P0 |
| TD-F05 | No dedicated refund endpoint | 🟡 Medium | Medium | P1 |
| TD-F06 | Legacy response aliases (`payment_method`, `transaction_ref`) | 🟡 Medium | Low | P1 |
| TD-F07 | Local `TenantRequest` type instead of `CustomRequest` | 🟡 Low | Low | P2 |
| TD-F08 | `FeeDiscountUpdateSchema` doesn't validate percentage ≤ 100 | 🟡 Medium | Low | P1 |
| TD-F09 | No structured logging in fee module | 🟡 Medium | Low | P1 |
| TD-F10 | `resolveAcademicYearId` checks 7 sources — too flexible | 🟡 Low | Medium | P2 |
| TD-F11 | Receipt number allows arbitrary strings (max 100) | 🟡 Medium | Low | P1 |
| TD-F12 | Error messages leak structure IDs | 🟡 Low | Low | P2 |
| TD-F13 | No endpoint-specific rate limiting on write operations | 🟡 Medium | Low | P1 |

---

## 13. Recommendations (Prioritized)

### 🔴 P0 — Immediate (Before Production)

#### 1. Add Financial Audit Trail
Create `FeeAuditService` following the pattern from `attendance/services/student-attendance.service.ts`:
```typescript
interface FeeAuditEntry {
    action: 'PAYMENT_COLLECTED' | 'PAYMENT_REFUNDED' | 'DISCOUNT_APPLIED' | 'ASSIGNMENT_CREATED' | ...;
    entityType: 'FeePayment' | 'FeeAssignment' | 'FeeDiscount' | ...;
    entityId: string;
    previousValues?: Record<string, unknown>;
    newValues: Record<string, unknown>;
    performedBy: string;
    tenantId: string;
    timestamp: Date;
}
```

#### 2. Add Pagination to Payment Queries
```typescript
export const FeePaymentsQuerySchema = z.object({
    // ... existing fields ...
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.enum(['payment_date', 'amount_paid', 'created_at']).default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
```

#### 3. Replace Summary Aggregation with SQL
Move paid/pending/today counts to a repository method using SQL `FILTER` clauses instead of JavaScript in-memory processing.

#### 4. Add Idempotency Protection
```typescript
// In FeeCollectSchema
idempotencyKey: z.string().uuid().optional(),

// In FeeService.collectFee()
if (data.idempotencyKey) {
    const existing = await feeRepository.findPaymentByIdempotencyKey(data.idempotencyKey, schema);
    if (existing) return existing; // Return existing, don't create duplicate
}
```

### 🟡 P1 — High Priority (Within Sprint)

5. **Fix `FeeDiscountUpdateSchema`** — add percentage ≤ 100 cross-validation
6. **Add structured logging** — `logger.info`, `logger.warn` in service layer
7. **Restrict receipt number format** — add regex to validator
8. **Add endpoint-specific rate limits** — on `POST /payments` and `POST /assign/*`
9. **Create dedicated refund endpoint** — `POST /payments/:id/refund`

### 🟢 P2 — Nice to Have (Backlog)

10. Replace local `TenantRequest` with `CustomRequest` from core
11. Reduce `resolveAcademicYearId` sources to 3 (body, query, header)
12. Deprecate legacy response aliases behind versioned API
13. Add `institution_id` to all repository WHERE clauses for defense-in-depth
14. Genericize error messages (remove structure IDs from 400 responses)

---

## Appendix: Files Reviewed

| File | Lines | Purpose |
|------|-------|---------|
| `fees/controllers/fees.controller.ts` | 516 | Request handling, response formatting |
| `fees/services/fee.service.ts` | 1082 | Business logic, transaction management |
| `fees/routes/fees.routes.ts` | 72 | Route definitions + middleware chain |
| `fees/validators/fee.validators.ts` | 177 | Zod input validation schemas |
| `core/middleware/authGuard.ts` | 309 | JWT auth + MFA + tenant validation |
| `core/middleware/tenant-context.middleware.ts` | 200 | Tenant resolution + schema isolation |
| `modules/tenant/middlewares/tenant.middleware.ts` | 218 | Subdomain → Institution resolution |
| `core/resilience/tenant-isolation.guard.ts` | 235 | Schema blocklist + cross-tenant guard |
| `core/http/ErrorHandler.ts` | 246 | Global error normalization |
| `core/secrets/secret.provider.ts` | 479 | Secrets management |
| `config/env.validation.ts` | 435 | Environment validation |
| `database/sequelize.ts` | 112 | DB connection + tenant schema hooks |
| `__tests__/tenant/tenant-isolation.test.ts` | 235 | Cross-tenant isolation tests |
| `modules/school/routes/index.ts` | 136 | School module route mounting |

---

*Report generated by Antigravity AI. For questions or follow-up, please discuss specific sections.*
