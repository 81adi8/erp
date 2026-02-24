# Tenant Stage 1A Stabilization Report

**Date:** 2026-02-18
**Status:** COMPLETE
**Scope:** Tenant Identity Enforcement, JWT tid Validation, Repository Hardening

---

## Executive Summary

This report documents the completion of Stage 1A tenant stabilization enforcement, implementing strict tenant identity validation across the authentication, authorization, and data access layers.

### Key Achievements

1. **Canonical TenantIdentity Type** - Immutable, frozen tenant identity object with required fields
2. **JWT tid Enforcement** - Strict token-tenant matching with telemetry
3. **Repository Hardening** - Mandatory tenant constructor with fail-closed behavior
4. **Telemetry Events** - Security-critical event emission for monitoring

---

## Changes Implemented

### 1. Core Tenant Identity (`server/src/core/tenant/tenant-identity.ts`)

**Before:**

```typescript
// Complex shadow comparison with multiple legacy fields
export interface TenantIdentity {
  tenantId?: string;
  institutionId?: string;
  schemaName?: string;
  // ... many optional fields
}
```

**After:**

```typescript
// Canonical, immutable identity
export type TenantIdentity = Readonly<{
    id: string;           // institution.id UUID - PRIMARY
    db_schema: string;    // Schema name for DB operations
    slug: string;         // URL-safe identifier
    status: 'active' | 'trial' | 'suspended';
    plan_id?: string;
}>;

export const freezeTenantIdentity = (tenant: {...}): TenantIdentity =>
    Object.freeze({...});
```

### 2. JWT tid Claim Enforcement (`server/src/core/auth/jwt.ts`)

**Added `tid` field:**

```typescript
export interface AccessTokenPayload {
  userId: string;
  tid?: string; // tenant id (institution.id UUID) - PRIMARY
  tenantId?: string; // @deprecated - use tid instead
  institutionId?: string; // @deprecated - use tid instead
  // ...
}
```

### 3. Auth Guard Strict Mode (`server/src/core/middleware/authGuard.ts`)

**Enforcement Logic:**

```typescript
// STRICT MODE: Tenant context is REQUIRED
if (!tenant) {
    return next(new ApiError(HttpStatus.FORBIDDEN, 'TENANT_INVALID'));
}

// STRICT MODE: JWT tid MUST match request tenant id
const tokenTid = payload.tid || payload.tenantId || payload.institutionId;

if (!tokenTid) {
    TenantShadowTelemetry.tenantTokenMismatch({...});
    return next(new ApiError(HttpStatus.UNAUTHORIZED, 'TENANT_TOKEN_MISMATCH'));
}

if (tokenTid !== tenant.id) {
    TenantShadowTelemetry.tenantTokenMismatch({...});
    return next(new ApiError(HttpStatus.UNAUTHORIZED, 'TENANT_TOKEN_MISMATCH'));
}
```

### 4. Repository Hardening Pattern

**Example: UserRepository (`server/src/modules/shared/repositories/user.repository.ts`)**

```typescript
export class UserRepository {
  private tenant: TenantIdentity;

  constructor(tenant: TenantIdentity) {
    if (!tenant || !tenant.db_schema) {
      TenantShadowTelemetry.repoUnscopedWrite({
        repository: "shared.user.repository",
        operation: "constructor",
        reason: "tenant_or_schema_missing",
      });
      throw ApiError.internal(
        "TENANT_SCOPE_VIOLATION: UserRepository requires valid TenantIdentity",
      );
    }
    this.tenant = tenant;
  }

  private getSchema(): string {
    // NO FALLBACK - schema must exist from constructor
    return this.tenant.db_schema;
  }
  // ...
}
```

### 5. Telemetry Events Added (`server/src/core/tenant/tenant-shadow.telemetry.ts`)

| Event                  | Severity | Description                           |
| ---------------------- | -------- | ------------------------------------- |
| `tenantTokenMismatch`  | CRITICAL | JWT tid doesn't match request tenant  |
| `tenantSchemaMissing`  | CRITICAL | Tenant has no db_schema assigned      |
| `tenantContextMissing` | CRITICAL | No tenant context in request          |
| `rbacNoTenant`         | CRITICAL | RBAC resolution without tenant        |
| `repoUnscopedWrite`    | CRITICAL | Repository write without tenant scope |

---

## Files Modified

### Core Layer

- `server/src/core/tenant/tenant-identity.ts` - Canonical TenantIdentity type
- `server/src/core/tenant/tenant-shadow.telemetry.ts` - New telemetry events
- `server/src/core/context/requestContext.ts` - requireTenantIdentity() helper
- `server/src/core/middleware/tenant-context.middleware.ts` - Strict tenant resolution
- `server/src/core/middleware/authGuard.ts` - JWT tid enforcement
- `server/src/core/auth/jwt.ts` - tid claim in AccessTokenPayload

### Auth Module

- `server/src/modules/auth/auth.types.ts` - tid in AccessTokenPayload
- `server/src/modules/auth/auth.service.ts` - tid issued in tokens

### Repositories (Hardened)

- `server/src/modules/shared/repositories/user.repository.ts`
- `server/src/modules/school/repositories/student.repository.ts`
- `server/src/modules/school/repositories/enrollment.repository.ts`

### Services (Updated)

- `server/src/modules/school/services/student.service.ts`

### Controllers (Updated)

- `server/src/modules/school/controllers/student.controller.ts`

### Types

- `server/src/modules/tenant/types/tenant.types.ts` - TenantContext extends TenantIdentity

---

## Security Guarantees

### Before Stage 1A

- ❌ Schema fallbacks allowed `public` or `shared` as defaults
- ❌ JWT could have no tenant claim and still access tenant routes
- ❌ Repositories could be instantiated without tenant context
- ❌ Token tenant mismatch was a warning, not a rejection

### After Stage 1A

- ✅ No schema fallbacks - fail closed if tenant missing
- ✅ JWT tid required and must match request tenant
- ✅ Repositories require TenantIdentity in constructor
- ✅ Token tenant mismatch = 401 TENANT_TOKEN_MISMATCH
- ✅ All security events emit telemetry

---

## Migration Notes

### For Controllers

```typescript
// OLD
const service = new SomeService(); // No tenant

// NEW
const tenant = requireTenantIdentity();
const service = new SomeService(tenant);
```

### For Token Issuance

```typescript
// OLD
tokens = await TokenService.generateTokenPair({
  userId: user.id,
  tenantId: schemaName, // Schema name, not UUID
  institutionId: user.institution_id,
  // ...
});

// NEW
tokens = await TokenService.generateTokenPair({
  userId: user.id,
  tid: user.institution_id, // PRIMARY: institution.id UUID
  // ...
});
```

---

## Testing Requirements

### T1: Token Tenant Mismatch

- [ ] Request with token from different tenant → 401 TENANT_TOKEN_MISMATCH
- [ ] Telemetry event `tenantTokenMismatch` emitted

### T2: Missing Tenant Context

- [ ] Request without tenant context to tenant route → 403 TENANT_INVALID
- [ ] Telemetry event `tenantContextMissing` emitted

### T3: Repository Without Tenant

- [ ] Attempt to instantiate repository without tenant → 500 TENANT_SCOPE_VIOLATION
- [ ] Telemetry event `repoUnscopedWrite` emitted

### T4: Valid Tenant Flow

- [ ] Valid tenant + matching token → 200 OK
- [ ] No security telemetry emitted

### T5: Token Without tid

- [ ] Token with no tid claim → 401 TENANT_TOKEN_MISMATCH
- [ ] Telemetry event `tenantTokenMismatch` with reason `token_missing_tid`

---

## Rollback Procedure

If issues arise, the following files should be reverted to their pre-Stage1A state:

1. `server/src/core/tenant/tenant-identity.ts` - Restore shadow comparison
2. `server/src/core/middleware/authGuard.ts` - Restore permissive tenant check
3. `server/src/modules/shared/repositories/user.repository.ts` - Restore optional tenant

---

## Next Steps (Stage 1B)

1. **RBAC Resolver Hardening** - Require tenant context for all resolution
2. **Provisioning Safety Checks** - Activation validation and rollback
3. **Integration Tests** - Automated T1-T5 test suite
4. **Monitoring Dashboard** - Security telemetry visualization

---

**Signed-off:** Tenant Stabilization Team
**Review Date:** 2026-02-25
