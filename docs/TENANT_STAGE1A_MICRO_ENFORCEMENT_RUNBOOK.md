# Tenant Stage 1a — Micro-Enforcement Runbook

**Stage:** 1a (Controlled enforcement)  
**Scope:** Canary auth routes only (`/api/v1/tenant/auth/*`, `/api/v2/api/school/auth/*`)  
**Enforcement:** tenant cache collision only  
**Rollback switch:** `TENANT_COLLISION_ENFORCEMENT=shadow|enforce`

---

## Enforcement Contract

When a tenant cache collision is detected from legacy headers vs canonical tenant context:

- `shadow` mode → emit telemetry + structured security event only
- `enforce` mode → return **HTTP 409** on canary auth routes

### Explicitly Out of Scope in Stage 1a

- ❌ JWT strict mode
- ❌ legacy header removal
- ❌ repo tenant lock enforcement
- ❌ host mismatch rejection

---

## Runtime Toggle

```env
TENANT_COLLISION_ENFORCEMENT=shadow
```

Valid values:

- `shadow` (default / rollback-safe)
- `enforce` (returns 409 on collision in canary auth routes)

Rollback is immediate by switching back to:

```env
TENANT_COLLISION_ENFORCEMENT=shadow
```

---

## Telemetry & Events

Stage 1a emits:

- Metric: `tenant_cache_key_collisions`
- Metric: `tenant_collision_enforcement_decisions`
- Structured security event log tag: `[tenant-security-event]`
  - event: `tenant_cache_collision_detected`
  - action: `shadow_only | blocked_409`
  - enforcement_mode: `shadow | enforce`
  - route_scope: `canary_auth | shadow_read_expand`

---

## 24h Observation Window

Track the following for at least 24 hours after switching to `enforce`:

1. **collision rate**
2. **auth failure delta**
3. **tenant mismatch drift**

---

## Stage 1a Success Criteria

### Green

- collision rate drops or stays extremely low
- no auth spike
- no false positives
- no new drift clusters

### Amber

- collisions clustered in specific clients
- internal tools still using legacy patterns

### Red

- auth failures spike
- unexpected 409s in normal user flow

---

## Next Step (Only if Green)

Proceed to **Stage 1b** in small increments:

1. host mismatch reject (auth routes only)
2. JWT strict on issuer path only
3. repo write guard (single module)

No big-bang rollout.
