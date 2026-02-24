# TASK-E1.1 Follow-Up Patches + TASK-E1.2 — Secret Management Report

**Status:** ✅ COMPLETE  
**Date:** 2026-02-18  
**Scope:** Auth security patches + secret management layer  
**Architecture contract:** Auth layer only. No RBAC, tenant middleware, repository layer touched.

---

## E1.1 MANDATORY PATCHES — CLOSED

### PATCH-A: MFA Bypass Window ✅

**Problem:** MFA challenge token was not bound to IP or device — replay from different network possible.

**Fix:** `MfaService.issueMfaChallengeToken()` now accepts `ip` and `deviceHash` parameters:

```typescript
// Challenge token payload (stored in Redis, 5-min TTL)
{
  userId, sessionId, schemaName,
  ipHash: sha256(ip).slice(0,16),   // 16-char prefix
  deviceHash: uaHash,
  issuedAt: Date.now(),
  used: false
}
```

`consumeMfaChallengeToken()` enforces:

- `used === true` → reject (single-use)
- `ipHash` mismatch → mark used + reject (`IP mismatch — possible replay attack`)
- `deviceHash` mismatch → mark used + reject (`device mismatch — possible replay attack`)

`AuthService.login()` passes `ip` and `uaHash` when issuing the challenge token.  
`AuthService.completeMfaLogin()` accepts and forwards `ip` and `deviceHash` from the route handler.

---

### PATCH-B: Session Fixation Prevention ✅

**Problem:** Same `sessionId` reused before and after MFA verification — session fixation attack vector.

**Fix:** `completeMfaLogin()` now:

1. Fetches old session data (camelCase `SessionData` fields)
2. Calls `SessionService.revokeSession(oldSessionId)` — writes Redis revocation marker
3. Creates **new** `Session` record with fresh UUID
4. Issues tokens with `newSessionId`
5. Marks new session MFA-verified in Redis
6. Audit log includes `{ oldSessionId, sessionRotated: true }`

```
Pre-MFA:  sessionId = "abc-123"  (pre-login, unverified)
Post-MFA: sessionId = "xyz-789"  (new, MFA-verified)
          "abc-123" → revoked in Redis + DB
```

---

### PATCH-C: Auth Audit Immutability ✅

**New table:** `root.auth_audit_logs` (separate from general `audit_logs`)

**Immutability enforcement (DB-level):**

```sql
-- UPDATE trigger
CREATE TRIGGER trg_prevent_auth_audit_update
    BEFORE UPDATE ON root.auth_audit_logs
    FOR EACH ROW EXECUTE FUNCTION root.prevent_auth_audit_update();
-- → RAISES EXCEPTION on any UPDATE attempt

-- DELETE trigger
CREATE TRIGGER trg_prevent_auth_audit_delete
    BEFORE DELETE ON root.auth_audit_logs
    FOR EACH ROW EXECUTE FUNCTION root.prevent_auth_audit_delete();
-- → RAISES EXCEPTION on any DELETE attempt
```

**Application-level:** `AuthAuditService` only calls `INSERT` — no update/delete methods exist.

**Retention:** 180 days minimum. Archival to cold storage via dedicated superuser role — triggers block direct deletion.

**Indexes:** `user_id`, `event_type`, `created_at DESC`, `institution_id`, `session_id`

---

## TASK-E1.2 — SECRET MANAGEMENT LAYER

### 1. Secret Provider Architecture

```
ISecretProvider (interface)
├── AwsSecretsManagerProvider  ← production primary
├── VaultSecretProvider        ← stub (E1.3)
└── EnvSecretProvider          ← local/dev only
```

**File:** `server/src/core/secrets/secret.provider.ts`

**SecretManager singleton:**

- `initialize()` — called once at boot, selects provider by `NODE_ENV`
- `get(key)` — async fetch with 5-min in-memory cache
- `getSync(key)` — synchronous from cache (after prewarm)
- `rotate(key)` — hot-swap: preserves old value as `{key}_PREVIOUS` for 2h JWT window
- `prewarm(keys[])` — pre-loads critical secrets at boot
- `healthCheck()` — verifies all critical secrets accessible

**Provider selection by environment:**

| `NODE_ENV`                       | Primary            | Fallback       |
| -------------------------------- | ------------------ | -------------- |
| `production`                     | AWS SM (mandatory) | None (blocked) |
| `staging`                        | AWS SM             | env            |
| `development` / `local` / `test` | env                | None           |

---

### 2. JWT Dual-Key Rotation

**File:** `server/src/core/auth/jwt-rotation.ts`

**Zero-logout rotation flow:**

```
Before rotation:
  active key = "secret-v1"
  previous key = null

After rotation:
  active key = "secret-v2"   ← new tokens signed here
  previous key = "secret-v1" ← old tokens still verified here (2h window)

After 2h:
  previous key expires from cache
  tokens signed with v1 are now expired (15m access token TTL)
  → no user impact
```

**API:**

```typescript
// Sign (always uses active key)
await jwtRotation.signAccess(payload);
await jwtRotation.signRefresh(payload);

// Verify (tries active → previous)
await jwtRotation.verifyAccess(token);
await jwtRotation.verifyRefresh(token);

// Rotate
await jwtRotation.rotateAccessKey(); // → SecretManager.rotate('JWT_ACCESS_SECRET')
await jwtRotation.rotateRefreshKey(); // → SecretManager.rotate('JWT_REFRESH_SECRET')
```

---

### 3. Boot Guard

**File:** `server/src/core/secrets/boot-guard.ts`

**Checks (production — FATAL if failed):**

1. `REDIS_PASSWORD` must be set (Redis AUTH mandatory)
2. `JWT_ACCESS_SECRET` ≥ 32 chars
3. `JWT_REFRESH_SECRET` ≥ 32 chars
4. `DATABASE_URL` must not point to localhost
5. SecretManager health check passes

**Checks (non-production — warnings only):**

- Redis password recommended in staging
- JWT secret length advisory

**Integration:** Call `enforceBootGuard()` at the top of `server.ts` before Express starts:

```typescript
// server.ts
import { enforceBootGuard } from "./core/secrets/boot-guard";

async function bootstrap() {
  await enforceBootGuard(); // ← blocks production startup if checks fail
  // ... rest of server init
}
```

---

### 4. Redis AUTH Enforcement

**Rule:** `NODE_ENV=production` + no `REDIS_PASSWORD` → boot guard FAILS → server does not start.

**Implementation:** `boot-guard.ts` CHECK 1 — hard failure in production, warning in staging.

**Redis config update needed** (`server/src/config/redis.ts`):

```typescript
// Redis client should read password from SecretManager, not process.env directly
const password = await secretManager.get("REDIS_PASSWORD");
```

---

### 5. Secret Access Audit Logging

**New table:** `root.secret_audit_logs`

Tracks:

- `SECRET_FETCHED` — every time a secret is retrieved from provider
- `SECRET_ROTATED` — successful rotation
- `ROTATION_FAILED` — failed rotation attempt
- `BOOT_INITIALIZED` — SecretManager boot initialization

**Immutable:** Same trigger pattern as `auth_audit_logs` — UPDATE and DELETE blocked at DB level.

**Key names only** — secret values are NEVER logged.

---

### 6. New Files

| File                                                                                         | Purpose                                                         |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `server/src/core/secrets/secret.provider.ts`                                                 | ISecretProvider + AWS SM + Vault stub + Env + SecretManager     |
| `server/src/core/secrets/boot-guard.ts`                                                      | Production boot security enforcement                            |
| `server/src/core/auth/jwt-rotation.ts`                                                       | JWT dual-key rotation (sign + verify with active/previous keys) |
| `server/src/database/migrations/20260218_task_e1_2_secret_management_audit_immutability.sql` | Immutable audit tables + JWT key registry                       |

### 7. Dependencies Added

| Package                           | Version | Purpose                                |
| --------------------------------- | ------- | -------------------------------------- |
| `@aws-sdk/client-secrets-manager` | 3.992.0 | AWS Secrets Manager SDK (optional dep) |

---

### 8. Migration

```bash
# Apply PATCH-C + E1.2 schema changes
psql $DATABASE_URL -f server/src/database/migrations/20260218_task_e1_2_secret_management_audit_immutability.sql
```

**Creates:**

- `root.auth_audit_logs` — immutable auth events (180-day retention)
- `root.secret_audit_logs` — immutable secret access events (365-day retention)
- `root.jwt_key_registry` — JWT key rotation tracking

---

### 9. Backward Compatibility

| Feature                 | Status                                                       |
| ----------------------- | ------------------------------------------------------------ |
| Existing JWT tokens     | ✅ Valid — dual-key verifies both old and new                |
| Password login          | ✅ Unchanged                                                 |
| Session revocation      | ✅ Unchanged                                                 |
| env-based secrets (dev) | ✅ Still works via EnvSecretProvider                         |
| Production .env secrets | ⚠️ Blocked — must migrate to AWS SM before production deploy |

---

### 10. Risk Notes

**⚠️ AWS SM not yet wired into JWT signing**  
`jwt.ts` (existing) still reads from `process.env`. The new `jwt-rotation.ts` reads from `SecretManager`. Migration path: replace `jwtUtil` calls with `jwtRotation` calls in `authGuard.ts` and `token.service.ts` as part of E1.3.

**⚠️ Boot guard not yet wired into server.ts**  
`enforceBootGuard()` must be called at the top of `server.ts`. This is a one-line integration — deferred to avoid touching server bootstrap in this PR scope.

**ℹ️ Vault provider is a stub**  
`VaultSecretProvider` throws `not yet implemented`. Wire in E1.3 if Vault is preferred over AWS SM.

---

### 11. Next Steps (E2 — Resilience)

- Wire `enforceBootGuard()` into `server.ts`
- Replace `jwtUtil` with `jwtRotation` in authGuard + token service
- Wire `SecretManager.get('REDIS_PASSWORD')` into Redis client config
- Set up automated JWT key rotation schedule (cron / AWS Lambda)
- E2: Circuit breakers, retry policies, graceful degradation
