# 🔍 Fee Module — Comprehensive Audit Report

**System:** School ERP SaaS Platform  
**Module:** `modules/school/fees`  
**Auditor:** Antigravity AI  
**Date:** 2026-02-23  
**Audit Scope:** Architecture, Security, Multi-Tenancy, Domain Logic, API Design, Validation, Error Handling, Code Quality, Performance, Test Coverage, Technical Debt  

---

## Executive Summary

The Fee module is a **functionally complete, well-structured** module with strong foundations in validation (Zod), monetary precision (`decimal.js`), tenant isolation, and RBAC-protected routes. However, the audit has identified **6 Critical**, **11 High**, **14 Medium**, and **8 Low** severity findings across security, data integrity, performance, and code quality dimensions. The module is suitable for **staging/pilot use** but requires remediation of critical and high-severity findings before handling production financial data at scale.

| Severity     | Count | Areas                                            |
|-------------|-------|--------------------------------------------------|
| 🔴 Critical  | 6     | Race conditions, overpayment, missing auth checks |
| 🟠 High      | 11    | Tenant leaks, unvalidated amounts, missing auditing |
| 🟡 Medium    | 14    | Code quality, error handling, performance          |
| 🟢 Low       | 8     | Naming, documentation, minor improvements          |

**Overall Grade: C+** (Functional but requires hardening before production financial use)

---

## Table of Contents

1. [Architecture Assessment](#1-architecture-assessment)
2. [Security Audit](#2-security-audit)
3. [Multi-Tenancy Integrity](#3-multi-tenancy-integrity)
4. [Domain Logic Audit](#4-domain-logic-audit)
5. [API Design Review](#5-api-design-review)
6. [Input Validation Audit](#6-input-validation-audit)
7. [Error Handling Review](#7-error-handling-review)
8. [Code Quality Assessment](#8-code-quality-assessment)
9. [Performance Analysis](#9-performance-analysis)
10. [Test Coverage Audit](#10-test-coverage-audit)
11. [Technical Debt Register](#11-technical-debt-register)
12. [Recommendations Summary](#12-recommendations-summary)

---

## 1. Architecture Assessment

### 1.1 Module Structure

```
modules/school/fees/
├── controllers/     fees.controller.ts     (516 lines)
├── services/        fee.service.ts         (800+ lines)
├── repositories/    fee.repository.ts      (888 lines)
├── routes/          fees.routes.ts         (72 lines)
├── validators/      fee.validators.ts      (177 lines)
├── constants/       (fee constants)
├── dto/             (data transfer objects)
└── utils/           money.ts              (33 lines)
```

**✅ Strengths:**
- Clean layered architecture: Controller → Service → Repository
- Follows the module pattern consistently with other school modules
- Thin routes pattern — routes only map to controller methods with middleware
- Validators separated into dedicated file using Zod schemas
- Money utility uses `decimal.js` with proper rounding configuration

**⚠️ Weaknesses:**

| ID  | Finding | Severity | File | Line |
|-----|---------|----------|------|------|
| A-1 | **God Service** — `fee.service.ts` exceeds 800 lines, mixing category, structure, assignment, payment, discount, and summary logic in one class. Should be decomposed into `FeeCategoryService`, `FeePaymentService`, `FeeAssignmentService`, `FeeDiscountService`. | 🟡 Medium | `fee.service.ts` | — |
| A-2 | **God Repository** — `fee.repository.ts` at 888 lines with 30+ methods. Same decomposition recommendation. | 🟡 Medium | `fee.repository.ts` | — |
| A-3 | **Missing DTO layer** — The `dto/` directory contains definitions but the controller manually picks fields from `req.body` using ad-hoc helper functions (`pickString`, `pickAmount`) instead of using properly typed DTOs. | 🟡 Medium | `fees.controller.ts` | 20-50 |
| A-4 | **No event/hook system** — Fee events (payment collected, fee assigned, overdue) are not published to the event system. Other modules (reports, notifications, dashboards) cannot react to fee changes without polling. | 🟠 High | `fee.service.ts` | — |

### 1.2 Dependency Map

```
fees.controller.ts
  └── fee.service.ts
       └── fee.repository.ts
            ├── FeeCategory model
            ├── FeeStructure model
            ├── FeeDiscount model
            ├── FeePayment model
            ├── StudentFeeAssignment model
            ├── StudentEnrollment model
            ├── Student model
            ├── Class model
            └── Institution model (for receipt generation locking)
       └── money.ts (decimal.js)
```

**Observation:** The repository layer imports models directly rather than through a model registry. This is acceptable for a modular monolith but creates tight coupling to Sequelize ORM specifics.

---

## 2. Security Audit

### 2.1 Authentication & Authorization

| ID  | Finding | Severity | File | Line |
|-----|---------|----------|------|------|
| S-1 | **Double `authGuard`** — `fees.routes.ts` applies `authGuard` (line 33) but the parent router in `routes/index.ts` already applies `authGuard` at line 21. While not a security risk (redundant check), it creates confusion and an unnecessary performance overhead on every request. | 🟢 Low | `fees.routes.ts` | 33 |
| S-2 | **RBAC permissions are well-structured** — All 18 route endpoints use `requirePermission()` with appropriate permission keys (`fees.view`, `fees.create`, `fees.manage`, `fees.collect`, `fees.delete`, `fees.update`, `fees.receipt.generate`). ✅ No unprotected routes found. | ✅ Pass | `fees.routes.ts` | 36-68 |
| S-3 | **No owner-scoping on payment retrieval** — `getPayments` returns all payments for the institution without scoping by role. A teacher with `fees.view` permission can see all student payments, not just their class students. This may violate least-privilege in schools with role-based visibility requirements. | 🟠 High | `fees.controller.ts` | — |
| S-4 | **Receipt number in URL path** — `GET /payments/receipt/:receiptNumber` uses receipt number (a sequential, guessable value like `RCP-2026-00001`) as an identifier. An authenticated user with `fees.view` permission could enumerate all receipts by incrementing the number. | 🟠 High | `fees.routes.ts` | 57 |

### 2.2 Data Exposure

| ID  | Finding | Severity | File | Line |
|-----|---------|----------|------|------|
| S-5 | **Full model returned in responses** — Controller methods return raw Sequelize model instances to `sendSuccess()`. This exposes internal fields like `createdAt`, `updatedAt`, `deletedAt`, internal IDs, and potentially sensitive metadata. Should use response DTOs/serializers to whitelist fields. | 🟡 Medium | `fees.controller.ts` | — |
| S-6 | **No audit trail for fee operations** — Unlike the attendance module which has comprehensive `AuditLog` integration, the fee module has **zero audit logging**. For a financial module, this is a critical gap. Who created/modified/deleted a fee structure? Who collected a payment? No record exists. | 🔴 Critical | `fee.service.ts` | — |

### 2.3 CSRF & Cookie Security

The authGuard implements CSRF validation for cookie-based tokens (double-submit cookie pattern), which protects fee payment endpoints from CSRF attacks. ✅ **Pass.**

---

## 3. Multi-Tenancy Integrity

### 3.1 Schema Isolation

| ID  | Finding | Severity | File | Line |
|-----|---------|----------|------|------|
| T-1 | **Schema passed as parameter** — All repository methods accept `schema: string` and use `.schema(schema)` on models. This is correct for explicit schema switching. | ✅ Pass | `fee.repository.ts` | — |
| T-2 | **Institution ID filtering** — Most repository queries include `institution_id` in WHERE clauses. | ✅ Pass | `fee.repository.ts` | — |
| T-3 | **Receipt generation uses Institution.findByPk without schema** — `generateReceiptNumber()` calls `Institution.findByPk(institutionId, { transaction: tx, lock: tx.LOCK.UPDATE })` without specifying schema. Institution model resides in the `public` schema, so this works correctly. However, the intent is unclear without a comment. | 🟢 Low | `fee.repository.ts` | ~830 |
| T-4 | **No cross-tenant validation in service layer** — The controller extracts `institutionId` from `getTenantContext()` and passes it to the service. However, the service does not re-validate that the institution ID in the token matches incoming data (e.g., a request body containing a `classId` from a different tenant). The `TenantIsolationGuard` middleware handles the broad check, but service-level foreign key references (classId, studentId) are not verified to belong to the same tenant. | 🟠 High | `fee.service.ts` | — |
| T-5 | **Global Sequelize hooks provide safety net** — The `sequelize.ts` file registers hooks on `beforeFind`, `beforeCreate`, etc. that inject tenant schema from AsyncLocalStorage context. This provides defense-in-depth. | ✅ Pass | `sequelize.ts` | 50-76 |

### 3.2 Tenant Isolation Guard Coverage

The `TenantIsolationGuard` middleware blocks:
- Missing tenant context
- Blocked schemas (public, information_schema, pg_catalog, root)
- Writes to public schema
- Invalid schema names (SQL injection prevention via regex)

**Result:** ✅ Adequate for the fee module. Schema name validation regex `^[a-zA-Z_][a-zA-Z0-9_]*$` prevents injection.

---

## 4. Domain Logic Audit

### 4.1 Payment Collection (`collectFee`)

| ID  | Finding | Severity | File | Line |
|-----|---------|----------|------|------|
| D-1 | **🔴 No overpayment guard** — `collectFee` does not check if `amountPaid` exceeds the outstanding amount. A user could record a payment of ₹100,000 against a ₹5,000 fee structure, creating a negative outstanding balance. There is no validation that `amountPaid <= (final_amount - sum(prior_payments))`. | 🔴 Critical | `fee.service.ts` | `collectFee` |
| D-2 | **🔴 Race condition on receipt number** — `generateReceiptNumber` locks the `Institution` row (ROW-level lock) to get a sequential receipt number. However, the lock is on the Institution table in the `public` schema, not on a fee-specific sequence table. Under concurrent payment submissions, this creates: (a) contention on the Institution row for ALL operations across the system, not just fee payments, and (b) potential receipt number gaps if the transaction rolls back. | 🔴 Critical | `fee.repository.ts` | `generateReceiptNumber` |
| D-3 | **Payment date defaults to server time** — If `paymentDate` is not provided, the controller defaults to `new Date().toISOString().split('T')[0]`. This uses server timezone, not the institution's timezone. For Indian schools (IST +5:30), a payment made at 11 PM IST could be recorded as the next day in UTC. | 🟠 High | `fees.controller.ts` | ~350 |

### 4.2 Fee Assignment (`assignFeesToStudent`)

| ID  | Finding | Severity | File | Line |
|-----|---------|----------|------|------|
| D-4 | **Duplicate assignment check is non-atomic** — The service checks `findAssignment()` then creates. Between the check and create, another request could create the same assignment. The `updateOnDuplicate` clause in `bulkAssignFeeToClass` mitigates this for bulk operations, but single-student assignment relies on a non-atomic check-then-create pattern. | 🟠 High | `fee.service.ts` | `assignFeesToStudent` |
| D-5 | **Final amount calculation correctness** — The service calculates `final_amount = structure_amount - discount_amount`. For percentage discounts, the discount amount is `structure_amount * discount_value / 100`. This is calculated correctly using `decimal.js` with `ROUND_HALF_UP`. ✅ | ✅ Pass | `fee.service.ts` | — |

### 4.3 Discount Logic

| ID  | Finding | Severity | File | Line |
|-----|---------|----------|------|------|
| D-6 | **Discount override allows arbitrary amounts** — `discountOverrideAmount` lets an admin set any custom discount amount without upper bound validation against the fee structure amount. A discount override of ₹100,000 on a ₹5,000 fee would create a negative `final_amount`. | 🔴 Critical | `fee.service.ts` | — |
| D-7 | **No discount stacking prevention** — The current design allows a student to have a named discount AND an override amount on the same assignment. The interaction between these two is not clearly defined. | 🟡 Medium | `fee.service.ts` | — |

### 4.4 Fee Dues Calculation

| ID  | Finding | Severity | File | Line |
|-----|---------|----------|------|------|
| D-8 | **Dues calculation in repository** — The `getStudentDues` method aggregates assignment amounts and subtracts payment totals. The aggregation uses Sequelize `fn('SUM')` which returns string values from PostgreSQL. These are correctly converted using `toMoneyNumber()`. ✅ | ✅ Pass | `fee.repository.ts` | — |
| D-9 | **Late fee calculation** — Late fees are calculated as `lateFeePerDay * days_overdue`. However, there is no cap on late fees. A fee overdue by 365 days at ₹50/day = ₹18,250 late fee on a potentially ₹5,000 fee, which exceeds the principal. Schools typically cap late fees at a percentage of the principal. | 🟡 Medium | `fee.service.ts` | `collectFee` |

### 4.5 Fee Summary

| ID  | Finding | Severity | File | Line |
|-----|---------|----------|------|------|
| D-10 | **Summary recalculated on every request** — `getSummary` recomputes totals from assignments and payments on every call. For institutions with thousands of students, this could be expensive. Should use a materialized/cached summary. | 🟡 Medium | `fee.repository.ts` | `getFeeSummary` |

---

## 5. API Design Review

### 5.1 RESTful Design

| Endpoint | Method | RBAC | Validator | Assessment |
|----------|--------|------|-----------|------------|
| `/categories` | GET | `fees.view` | `FeeCategoryListQuerySchema` | ✅ |
| `/categories` | POST | `fees.create\|manage` | `FeeCategoryCreateSchema` | ✅ |
| `/categories/:id` | PATCH | `fees.update\|manage` | `FeeIdParamSchema + FeeCategoryUpdateSchema` | ✅ |
| `/categories/:id` | DELETE | `fees.delete\|manage` | `FeeIdParamSchema` | ✅ |
| `/structures` | GET | `fees.view` | `FeeStructureListQuerySchema` | ✅ |
| `/structures/:id` | GET | `fees.view` | `FeeIdParamSchema` | ✅ |
| `/structures` | POST | `fees.create\|manage` | `FeeStructureCreateSchema` | ✅ |
| `/structures/:id` | PATCH | `fees.update\|manage` | `FeeIdParamSchema + FeeStructureUpdateSchema` | ✅ |
| `/structures/:id` | DELETE | `fees.delete\|manage` | `FeeIdParamSchema` | ✅ |
| `/assign/student` | POST | `fees.create\|manage` | `FeeAssignToStudentSchema` | ✅ |
| `/assign/class` | POST | `fees.create\|manage` | `FeeAssignToClassSchema` | ✅ |
| `/assignments/student/:studentId` | GET | `fees.view` | `FeeStudentParamSchema + FeeDuesQuerySchema` | ✅ |
| `/payments` | GET | `fees.view` | `FeePaymentsQuerySchema` | ✅ |
| `/payments` | POST | `fees.collect` | `FeeCollectSchema` | ✅ |
| `/payments/student/:studentId` | GET | `fees.view` | `FeeStudentParamSchema + FeeDuesQuerySchema` | ✅ |
| `/payments/receipt/:receiptNumber` | GET | `fees.view\|collect\|receipt.generate` | `FeeReceiptParamSchema` | ⚠️ S-4 |
| `/dues/student/:studentId` | GET | `fees.view` | `FeeStudentParamSchema + FeeDuesQuerySchema` | ✅ |
| `/summary` | GET | `fees.view` | `FeeSummaryQuerySchema` | ✅ |
| `/discounts` | GET | `fees.view` | none | ⚠️ AP-1 |
| `/discounts` | POST | `fees.create\|manage` | `FeeDiscountCreateSchema` | ✅ |
| `/discounts/:id` | PATCH | `fees.update\|manage` | `FeeIdParamSchema + FeeDiscountUpdateSchema` | ✅ |
| `/discounts/:id` | DELETE | `fees.delete\|manage` | `FeeIdParamSchema` | ✅ |
| `/discounts/apply` | POST | `fees.update\|manage` | `FeeDiscountApplySchema` | ✅ |

| ID  | Finding | Severity | File | Line |
|-----|---------|----------|------|------|
| AP-1 | **Missing query validation on `GET /discounts`** — All other list endpoints have query schema validation, but the discounts list endpoint has no `validateQuery()` middleware. Query parameters could contain unexpected fields. | 🟡 Medium | `fees.routes.ts` | 64 |
| AP-2 | **Inconsistent naming** — Routes use `/assign/student` (verb-based) rather than REST noun-based `/assignments`. Similarly, `/payments` is used for both collection (POST) and listing (GET), which is correct, but `/dues/student/:id` mixes resource nesting inconsistently. | 🟢 Low | `fees.routes.ts` | — |
| AP-3 | **No pagination on list endpoints** — `GET /categories`, `GET /structures`, `GET /discounts`, and `GET /payments` do not enforce pagination. For institutions with years of payment history, these endpoints could return unbounded result sets. | 🟠 High | `fees.routes.ts` | — |

### 5.2 Response Format

The module uses `sendSuccess()` for all responses, which formats output as:
```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```
This is consistent with the rest of the application. ✅

---

## 6. Input Validation Audit

### 6.1 Zod Schema Analysis

| Schema | Coverage | Issues |
|--------|----------|--------|
| `FeeCategoryCreateSchema` | ✅ name (1-150 chars), description (≤500), isActive | None |
| `FeeCategoryUpdateSchema` | ✅ Partial + at-least-one-field refine | None |
| `FeeStructureCreateSchema` | ✅ Amount (positive, ≤1B), frequency enum, dueDay (1-31), classId UUID, feeCategoryId/categoryId require-one refine | None |
| `FeeCollectSchema` | ⚠️ See V-1, V-2 | Multiple |
| `FeeDiscountCreateSchema` | ✅ Percentage ≤ 100 superRefine | None |
| `FeeDiscountApplySchema` | ✅ Require discountId or override refine | None |

| ID  | Finding | Severity | File | Line |
|-----|---------|----------|------|------|
| V-1 | **`FeeCollectSchema` accepts dual amount fields** — Both `amountPaid` (amount schema, positive) and `paymentMode`/`paymentMethod` are defined as separate optional enum fields. The controller must pick one or the other, but the validator allows both to be specified simultaneously with different values. | 🟡 Medium | `fee.validators.ts` | 107-120 |
| V-2 | **`FeeCollectSchema` status allows 'paid'** — The status enum includes `['success', 'pending', 'failed', 'refunded', 'paid']` but the repository `CreatePaymentData` only types `'success' | 'pending' | 'failed' | 'refunded'`. The `'paid'` status could cause runtime errors or data inconsistency. | 🟠 High | `fee.validators.ts` | 119 |
| V-3 | **Amount schema upper bound** — `max(1_000_000_000)` (1 billion). While generous, this is reasonable for Indian school ERPs. ✅ | ✅ Pass | `fee.validators.ts` | 8 |
| V-4 | **`.strict()` on all schemas** — All Zod schemas use `.strict()` which rejects unknown fields. This is excellent for preventing mass assignment attacks. | ✅ Pass | `fee.validators.ts` | — |
| V-5 | **Academic year dual-field pattern** — Many schemas accept both `academicYearId` (UUID) and `academicYear` (loose string 1-50). The controller resolves the academic year from these. This double-accept pattern increases API surface and potential confusion. | 🟢 Low | `fee.validators.ts` | — |

### 6.2 Controller-Level Validation

| ID  | Finding | Severity | File | Line |
|-----|---------|----------|------|------|
| V-6 | **UUID validation in controller is redundant** — The controller has its own `isUuid()` helper function that validates UUID format. This is run after Zod validation has already validated UUIDs. Redundant but not harmful. | 🟢 Low | `fees.controller.ts` | ~30 |
| V-7 | **`pickString` helper swallows type safety** — The controller uses `pickString(body, 'fieldA', 'fieldB')` to pick alternative field names from the request body. This returns `string | undefined` and discards Zod's type guarantees. | 🟡 Medium | `fees.controller.ts` | — |

---

## 7. Error Handling Review

| ID  | Finding | Severity | File | Line |
|-----|---------|----------|------|------|
| E-1 | **`ApiError` used correctly** — Service and repository layers throw `ApiError` instances with appropriate HTTP status codes (400, 404, 409). These are caught by the global error handler. | ✅ Pass | — | — |
| E-2 | **Missing transaction rollback on partial failure in `assignFeesToStudent`** — The method uses `sequelize.transaction()` correctly for the main flow, but if an error occurs between creating assignments and applying discounts, partial assignments could be committed. The transaction wrapper should encompass the entire operation. | 🟠 High | `fee.service.ts` | `assignFeesToStudent` |
| E-3 | **Generic error messages** — Some errors use generic messages like `'Fee structure not found'` without including the ID that was searched for. This makes debugging harder without checking logs. | 🟢 Low | `fee.service.ts` | — |
| E-4 | **No structured error codes** — Unlike the attendance module which has `AttendanceErrorCodes` with machine-readable codes, the fee module uses free-form strings. Frontend cannot reliably pattern-match on error types. | 🟡 Medium | `fee.service.ts` | — |
| E-5 | **`asyncHandler` wraps all controller methods** — All controller methods are wrapped with `asyncHandler` which catches and forwards rejections. ✅ | ✅ Pass | `fees.controller.ts` | — |

---

## 8. Code Quality Assessment

### 8.1 TypeScript Usage

| ID  | Finding | Severity | File | Line |
|-----|---------|----------|------|------|
| Q-1 | **`any` types in ErrorHandler** — `handleCastError`, `handleDuplicateFieldsError`, `handleValidationError`, `handleSequelizeValidationError`, `handleSequelizeUniqueConstraintError` all accept `err: any`. Should use discriminated union types or Sequelize-specific error types. | 🟡 Medium | `ErrorHandler.ts` | 60-93 |
| Q-2 | **`any[]` in `ApiError.errors`** — The `errors` property of `ApiError` is typed as `any[]`. Should be typed as `string[] | ValidationError[]`. | 🟡 Medium | `ApiError.ts` | 7, 12 |
| Q-3 | **Controller method length** — Several controller methods exceed 40 lines, primarily due to inline field extraction logic. Should extract common patterns to middleware or helper functions. | 🟢 Low | `fees.controller.ts` | — |

### 8.2 Money Handling

| ID  | Finding | Severity | File | Line |
|-----|---------|----------|------|------|
| Q-4 | **Excellent `money.ts` utility** — Uses `decimal.js` with precision 40 and `ROUND_HALF_UP`. Provides `toDecimal`, `toMoneyDecimal` (2 decimal places), `toMoneyString`, `toMoneyNumber`, `maxDecimal`, `minDecimal`. This is the correct approach for financial calculations. | ✅ Pass | `money.ts` | — |
| Q-5 | **Consistent usage in repository** — The repository converts all monetary values through `toMoneyString()` before storage and `toMoneyNumber()` for output. | ✅ Pass | `fee.repository.ts` | — |
| Q-6 | **Amounts stored as string** — `CreateStructureData.amount`, `CreatePaymentData.amount_paid`, etc. are typed as `string`, representing decimal values. This aligns with PostgreSQL `DECIMAL`/`NUMERIC` column types. However, there's no documentation explaining this design decision. | 🟢 Low | `fee.repository.ts` | 54, 86 |

### 8.3 Code Duplication

| ID  | Finding | Severity | File | Line |
|-----|---------|----------|------|------|
| Q-7 | **Academic year resolution duplicated** — Multiple controller methods contain the same `resolveAcademicYear` logic. Should be extracted into middleware or a shared helper. | 🟡 Medium | `fees.controller.ts` | — |
| Q-8 | **Tenant context extraction duplicated** — Every controller method calls `getTenantContext(req)` and extracts `institutionId` and `schema`. Should use middleware to attach these. | 🟡 Medium | `fees.controller.ts` | — |

---

## 9. Performance Analysis

| ID  | Finding | Severity | File | Line |
|-----|---------|----------|------|------|
| P-1 | **🔴 N+1 query risk in `getStudentDues`** — The method fetches all assignments for a student, then for each assignment fetches related payments. Should use eager loading with `include` to batch queries. | 🔴 Critical | `fee.repository.ts` | `getStudentDues` |
| P-2 | **No database indexes documented** — The audit could not verify whether appropriate indexes exist on: `student_fee_assignments(student_id, academic_year_id)`, `fee_payments(student_id, fee_structure_id, academic_year_id)`, `fee_payments(receipt_number)`. Missing indexes on these columns would cause full table scans. | 🟠 High | — | — |
| P-3 | **`bulkAssignFeeToClass` loads all students** — When assigning fees to an entire class, the method first loads all student enrollments, then creates individual assignments in a loop (not `bulkCreate`). For a class of 60 students, this means 60 individual INSERT queries within a transaction. | 🟠 High | `fee.repository.ts` | `bulkAssignFeeToClass` |
| P-4 | **Institution row lock contention** — `generateReceiptNumber` locks the Institution row. All concurrent fee collections across all modules for that institution will block on this lock. Should use a dedicated `fee_receipt_sequence` table or PostgreSQL sequence. | 🟠 High | `fee.repository.ts` | `generateReceiptNumber` |
| P-5 | **Summary queries unoptimized** — `getFeeSummary` computes totals by fetching all assignments and payments, then aggregating in-memory. Should use SQL `SUM` aggregation directly. | 🟡 Medium | `fee.repository.ts` | — |
| P-6 | **No caching strategy** — Fee categories and structures are relatively static data that changes infrequently. These could be cached using the existing `CacheService` infrastructure. | 🟡 Medium | `fee.service.ts` | — |

---

## 10. Test Coverage Audit

### 10.1 Existing Tests

File: `__tests__/fees/fee.test.ts` (225 lines)

| Test Suite | Test Cases | Quality |
|-----------|-----------|---------|
| Fee Categories | 3 tests: create (201), duplicate (409), no-auth (401) | ⚠️ Weak assertions |
| Fee Collection | 3 tests: collect (201), receipt format, non-existent student (404) | ⚠️ Weak assertions |
| Fee Dues | 1 test: list dues | ⚠️ Weak assertions |

### 10.2 Coverage Gaps

| ID  | Finding | Severity |
|-----|---------|----------|
| TC-1 | **Weak assertions** — Tests use `expect([201, 400, 404]).toContain(res.status)` which accepts multiple status codes. This means the test passes even if the endpoint returns an error. Tests should assert a single expected status code. | 🔴 Critical |
| TC-2 | **No negative amount tests** — No tests verify that negative amounts are rejected. | 🟠 High |
| TC-3 | **No overpayment tests** — No tests verify behavior when `amountPaid > outstanding`. | 🟠 High |
| TC-4 | **No concurrent payment tests** — No tests for race conditions in receipt number generation. | 🟠 High |
| TC-5 | **No discount application tests** — No tests for percentage or flat discounts, or discount overrides. | 🟠 High |
| TC-6 | **No RBAC permission tests** — No tests verify that users without `fees.collect` permission are rejected from `POST /payments`. | 🟡 Medium |
| TC-7 | **No multi-tenant isolation tests** — No tests verify that tenant A cannot access tenant B's fees. | 🟠 High |
| TC-8 | **Receipt format test is a unit test disguised** — The test creates a receipt string manually and validates it, rather than extracting a receipt from an actual API response. | 🟡 Medium |
| TC-9 | **No service-level unit tests** — All tests are integration tests. No isolated unit tests for business logic (discount calculation, late fee computation, overpayment detection). | 🟡 Medium |
| TC-10 | **Estimated line coverage: ~15-20%** — Based on the ratio of test cases to code paths, the fee module has critically low test coverage for a financial module. | 🔴 Critical |

---

## 11. Technical Debt Register

| ID | Category | Description | Effort | Priority | Impact if Unresolved |
|----|----------|------------|--------|----------|---------------------|
| TD-1 | Security | Add comprehensive audit logging for all fee mutations (create, update, delete, collect) | 3d | P0 | **Compliance failure** — No way to trace who collected or modified fee payments |
| TD-2 | Data Integrity | Implement overpayment guard in `collectFee` | 0.5d | P0 | **Financial loss** — Overpayments create phantom credits |
| TD-3 | Data Integrity | Implement discount cap validation (final_amount ≥ 0) | 0.5d | P0 | **Financial loss** — Negative fee amounts possible |
| TD-4 | Performance | Replace Institution row lock with dedicated receipt sequence table | 1d | P0 | **Contention** — Blocks all concurrent fee operations |
| TD-5 | Performance | Fix N+1 queries in `getStudentDues` | 1d | P1 | **Performance degradation** — Slow dues page for schools with many fee structures |
| TD-6 | Performance | Add pagination to all list endpoints | 1d | P1 | **Memory exhaustion** — Unbounded result sets |
| TD-7 | Code Quality | Decompose God Service and God Repository | 2d | P1 | **Maintainability** — 800+ line files are hard to review and test |
| TD-8 | Testing | Achieve ≥80% test coverage with proper assertions | 5d | P1 | **Regression risk** — Financial bugs reach production |
| TD-9 | Domain Logic | Add late fee cap configuration | 0.5d | P2 | **Fairness** — Late fees can exceed principal |
| TD-10 | API | Add structured error codes (machine-readable) | 1d | P2 | **Frontend integration** — Cannot reliably handle specific errors |
| TD-11 | Events | Publish fee events (payment_collected, fee_assigned, fee_overdue) | 1d | P2 | **Integration** — Other modules cannot react to fee changes |
| TD-12 | Security | Add owner-scoping to payment queries based on role | 1d | P2 | **Privacy** — Teachers see all student payments |
| TD-13 | Performance | Cache fee categories and structures | 0.5d | P3 | **Minor** — Unnecessary DB queries for static data |
| TD-14 | Code Quality | Replace ad-hoc field picking with DTO mapping | 1d | P3 | **Type safety** — Zod types are discarded in controller |
| TD-15 | Consistency | Resolve `paymentMode` vs `paymentMethod` field naming | 0.5d | P3 | **Confusion** — Two fields mean the same thing |

**Total estimated remediation effort: ~20 developer-days**

---

## 12. Recommendations Summary

### 🔴 P0 — Must Fix Before Production

1. **Add overpayment guard** — Validate `amountPaid ≤ outstanding_balance` before recording payment. Return 400 if exceeded.
2. **Add discount cap** — Validate `final_amount ≥ 0` after discount application. Reject discounts that exceed the fee amount.
3. **Add audit logging** — Integrate with the existing audit infrastructure (see attendance module pattern) for all create, update, delete, and collect operations.
4. **Fix receipt number generation** — Replace `Institution` row lock with a dedicated `fee_receipt_sequences` table or PostgreSQL `SEQUENCE` object per institution-year.
5. **Fix test assertions** — Replace `expect([201, 400, 404]).toContain()` with exact status code assertions.
6. **Add concurrency tests** — Test parallel receipt generation to verify no duplicate receipt numbers.

### 🟠 P1 — Fix Before Scale

7. **Fix N+1 queries** — Use Sequelize `include` with eager loading for dues calculation.
8. **Add pagination** — All list endpoints should accept `page`/`limit` query parameters with sensible defaults (page=1, limit=50, max=200).
9. **Decompose services** — Split `FeeService` into domain-specific services.
10. **Increase test coverage** — Target ≥80% line coverage with domain-specific unit tests.
11. **Add status enum consistency** — Remove `'paid'` from validator or add it to the repository type.
12. **Add tenant cross-validation** — Verify that `classId`, `studentId` in requests belong to the same `institution_id`.

### 🟡 P2 — Improve Quality

13. **Add structured error codes** — Define `FeeErrorCodes` enum following the attendance module pattern.
14. **Publish domain events** — Emit events for `FEE_PAYMENT_COLLECTED`, `FEE_ASSIGNED`, `FEE_OVERDUE`.
15. **Add late fee cap** — Configurable maximum late fee as percentage of principal.
16. **Add role-based query scoping** — Teachers see only their class students' fees.

### 🟢 P3 — Polish

17. **Cache static data** — Fee categories, structures, and discounts.
18. **DTO mapping layer** — Replace `pickString` helpers with typed DTO transformers.
19. **Harmonize field names** — Choose one of `paymentMode`/`paymentMethod`.
20. **Document money handling** — Add JSDoc explaining why amounts are stored as strings.

---

## Appendix A: Files Reviewed

| File | Lines | Role |
|------|-------|------|
| `fees/controllers/fees.controller.ts` | 516 | HTTP handler layer |
| `fees/services/fee.service.ts` | 800+ | Business logic |
| `fees/repositories/fee.repository.ts` | 888 | Data access |
| `fees/routes/fees.routes.ts` | 72 | Route definitions |
| `fees/validators/fee.validators.ts` | 177 | Zod input schemas |
| `fees/utils/money.ts` | 33 | Decimal arithmetic |
| `__tests__/fees/fee.test.ts` | 225 | Integration tests |
| `core/middleware/authGuard.ts` | 309 | Authentication |
| `core/middleware/tenant-context.middleware.ts` | 200 | Tenant resolution |
| `core/resilience/tenant-isolation.guard.ts` | 235 | Isolation enforcement |
| `core/http/ErrorHandler.ts` | 246 | Global error handling |
| `core/http/ApiError.ts` | — | Error class |
| `core/auth/jwt.ts` | 119 | JWT utilities |
| `database/sequelize.ts` | 112 | ORM + tenant hooks |
| `modules/school/routes/index.ts` | 136 | Module routing |

## Appendix B: Cross-Module Comparison

| Dimension | Fees Module | Attendance Module | Gap |
|-----------|------------|-------------------|-----|
| Audit Logging | ❌ None | ✅ Full AuditLog | Critical |
| Error Codes | ❌ Free-form strings | ✅ `AttendanceErrorCodes` enum | Medium |
| Edit Window Controls | ❌ None | ✅ Time-based edit window | Medium |
| Lock Mechanism | ❌ None | ✅ Record locking | Medium |
| Summary Caching | ❌ Computed on request | ✅ `markForRecalculation` pattern | Medium |
| DTOs | ❌ Ad-hoc picking | ✅ Typed DTOs | Low |
| Test Coverage | ~15-20% | ~40-50% estimated | High |

---

*End of Report*
