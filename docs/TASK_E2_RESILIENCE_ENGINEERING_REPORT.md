# TASK-E2 — Resilience Engineering Layer Report

**Status:** ✅ COMPLETE  
**Date:** 2026-02-18  
**Scope:** System survivability under infra outages, dependency failures, traffic spikes  
**Architecture contract:** No RBAC, tenant middleware, repository layer, or auth logic touched.

---

## E1.2 Correctness Fixes (Applied Before E2)

### Fix #1 — Cache Cleared Immediately on Rotation ✅

**Problem:** Cache TTL = 5 min, rotation = immediate → signing/verifying drift for up to 5 min.

**Fix:** `SecretManager.rotate()` now calls `this.cache.delete(key)` immediately before fetching the new value. No TTL wait.

```typescript
// Before: cache expired naturally after 5 min
// After: cache.delete(key) → immediate invalidation on rotation
this.cache.delete(key);
await this.get(key); // Force fresh fetch from provider
```

---

### Fix #2 — Multi-Instance Rotation Propagation ✅

**Problem:** ALB with 2 EC2 instances → rotation on instance A not propagated to instance B → split key state.

**Fix:** Redis pub/sub channel `secret_rotation`:

```
Instance A rotates JWT_ACCESS_SECRET
  → publishes { key, rotatedAt, instanceId } to Redis channel 'secret_rotation'

Instance B (subscriber)
  → receives event
  → ignores if instanceId == own pid (already rotated locally)
  → calls cache.delete(key) → next get() fetches fresh from AWS SM
```

**New methods:**

- `SecretManager.publishRotationEvent(key)` — publishes after successful rotation
- `SecretManager.subscribeToRotationEvents()` — call once at boot after `initialize()`

**Fallback:** If Redis pub/sub unavailable, rotation is local-only. Other instances re-fetch on next cache miss (5-min max drift). Non-fatal.

---

### Fix #4 — AWS SM Throttling Fallback ✅

**Problem:** AWS SM temporarily fails → system crashes instead of using cached value.

**Fix:** `SecretManager.get()` now:

1. Tries provider fetch
2. If provider throws → checks stale cache
3. If stale cache exists → returns it + emits `secret_provider_degraded` event
4. If no cache → tries `process.env` as last resort
5. Only throws if all three fail

```typescript
// Provider failed — use stale cache
if (cached) {
  this.emit("secret_provider_degraded", { key, provider, error });
  return cached.value; // Better than crashing
}
```

---

### Fix #5 — Secret Audit Log Cardinality ✅

**Problem:** Logging every cache hit → log explosion (thousands of entries per minute).

**Fix:** `SecretManager.shouldLogFetch(key, fromCache)` returns `false` for cache hits.

**Rule:** Only log:

- Provider fetches (cache miss → AWS SM call)
- Rotation events
- Provider failures

Cache hits are **never** logged.

---

## TASK-E2 — Resilience Components

### 1. Redis Degradation Mode ✅

**File:** `server/src/core/resilience/redis-degradation.service.ts`

**Behavior when Redis is down:**

| Subsystem               | Normal                | Degraded                                       |
| ----------------------- | --------------------- | ---------------------------------------------- |
| RBAC cache              | Redis GET/SET         | In-process LRU (1000 entries, TTL-aware)       |
| Rate limiter            | Redis INCR/EXPIRE     | Local Map counter (per-process)                |
| Session revoke          | Redis marker + DB     | DB-only (authGuard falls back to DB check)     |
| MFA challenges          | Redis challenge token | Fail-closed (MFA blocked until Redis recovers) |
| Secret rotation pub/sub | Redis PUBLISH         | Local-only (warning logged)                    |

**Auto-recovery:** Probes Redis every 30s via `PING`. On recovery, emits `redis_recovered` event and restores full mode.

**API:**

```typescript
redisDegradation.startHealthProbe(); // Call at boot
redisDegradation.isRedisHealthy(); // Boolean
redisDegradation.rbacCacheGet(key); // Fallback RBAC cache
redisDegradation.localRateLimitRecord(id); // Fallback rate limit
redisDegradation.getStatus(); // { state, rbacCacheSize, rateLimitEntries }
```

---

### 2. DB Circuit Breaker ✅

**File:** `server/src/core/resilience/db-circuit-breaker.ts`

**States:**

```
CLOSED → OPEN (trip) → HALF_OPEN (probe) → CLOSED (recover)
                    ↑                    ↓
                    └──── probe fails ───┘
```

**Trip conditions:**

- Consecutive failures ≥ 5 (configurable)
- OR rolling avg latency > 3000ms (configurable, 20-query window)

**Recovery:**

- After 30s OPEN → enters HALF_OPEN
- Allows 1 probe query
- Probe success → CLOSED
- Probe failure → back to OPEN

**Usage:**

```typescript
// Wrap any DB operation
const result = await dbCircuitBreaker.execute(
  () => UserModel.findOne({ where: { id } }),
  "user_lookup",
);
// Throws { code: 'CIRCUIT_OPEN', retryAfterMs } if circuit is open
```

**Stats:**

```typescript
dbCircuitBreaker.getStats();
// { state, consecutiveFailures, avgLatencyMs, totalRequests, totalFailures, openedAt }
```

---

### 3. Queue Pressure Protection ✅

**File:** `server/src/core/resilience/queue-pressure.service.ts`

**Pressure levels:**

| Level    | Depth     | Action                                    |
| -------- | --------- | ----------------------------------------- |
| NORMAL   | < 500     | All jobs accepted                         |
| WARNING  | 500–999   | LOW priority shed, others throttled 250ms |
| CRITICAL | 1000–4999 | LOW + NORMAL shed, HIGH throttled 500ms   |
| SHED     | ≥ 5000    | Only CRITICAL jobs accepted               |

**Job priorities:**

| Priority | Use case                     | Shed at  |
| -------- | ---------------------------- | -------- |
| CRITICAL | Auth events, audit logs      | Never    |
| HIGH     | Email notifications, reports | SHED     |
| NORMAL   | Data sync, exports           | CRITICAL |
| LOW      | Analytics, cleanup           | WARNING  |

**Usage:**

```typescript
const gate = await queuePressure.checkProducerGate("NORMAL");
if (!gate.allowed) {
  return res.status(429).json({ error: "QUEUE_PRESSURE", reason: gate.reason });
}
await queuePressure.applyThrottle(gate.delayMs);
await queue.add(job);
```

**Monitoring:** Checks Redis LLEN every 10s. Emits `pressure_change` events on level transitions.

---

### 4. Tenant Isolation Under Load ✅

**File:** `server/src/core/resilience/tenant-isolation.guard.ts`

**Guarantees under degraded conditions:**

1. **No missing tenant context** — requests without `tenantSchema` are rejected 400
2. **No blocked schema access** — `public`, `root`, `information_schema`, `pg_catalog`, `pg_toast` are blocked 403
3. **No public schema writes** — POST/PUT/PATCH/DELETE to public schema → 403
4. **No cross-tenant access** — token `tid` must match request tenant ID

**Express middleware:**

```typescript
app.use(
  "/v1/school/",
  TenantIsolationGuard.middleware({ requireTenant: true }),
);
```

**Programmatic validation (before SQL):**

```typescript
TenantIsolationGuard.validateSchema(schemaName, { userId, path });
// Throws MISSING_TENANT_CONTEXT | SCHEMA_NOT_ALLOWED | INVALID_SCHEMA_NAME

TenantIsolationGuard.validateCrossTenantAccess(tokenTid, requestTid, {
  userId,
});
// Throws CROSS_TENANT_ACCESS
```

**Violation log:** Rolling 1000-entry log. `getViolations()` for forensics.

---

### 5. Graceful Shutdown ✅

**File:** `server/src/core/resilience/graceful-shutdown.ts`

**Shutdown sequence on SIGTERM/SIGINT:**

```
SIGTERM →
  1. server.close()          ← stop accepting new connections
     (drain window: 15s)     ← in-flight requests complete
  2. onBeforeShutdown()      ← custom hook (flush metrics, etc.)
  3. queueManager.shutdown() ← stop consumers, no new jobs
  4. redisDegradation.stopHealthProbe()
     queuePressure.stopMonitoring()
  5. sequelize.close()       ← close DB pool
  6. redis.quit()            ← close Redis connections
  7. process.exit(0)         ← clean exit
```

**Force exit:** If total shutdown > 30s → `process.exit(1)` (prevents zombie processes).

**Usage:**

```typescript
// server.ts
import { registerGracefulShutdown } from "./core/resilience/graceful-shutdown";

const httpServer = app.listen(PORT);
registerGracefulShutdown(httpServer, {
  sequelize,
  redis: getRedis(),
  queueManager,
  onBeforeShutdown: async () => {
    await flushMetrics();
  },
});
```

**Health check integration:**

```typescript
import { isServerShuttingDown } from "./core/resilience/graceful-shutdown";

// In health route:
if (isServerShuttingDown()) {
  return res.status(503).json({ status: "shutting_down" });
}
```

---

## New Files

| File                                                      | Purpose                                      |
| --------------------------------------------------------- | -------------------------------------------- |
| `server/src/core/resilience/redis-degradation.service.ts` | Redis degradation mode + LRU fallback cache  |
| `server/src/core/resilience/db-circuit-breaker.ts`        | DB circuit breaker (CLOSED/OPEN/HALF_OPEN)   |
| `server/src/core/resilience/queue-pressure.service.ts`    | Queue backlog monitoring + producer throttle |
| `server/src/core/resilience/tenant-isolation.guard.ts`    | Tenant isolation enforcement under load      |
| `server/src/core/resilience/graceful-shutdown.ts`         | SIGTERM drain + clean exit sequence          |

---

## Integration Checklist (Wire into server.ts)

```typescript
// server.ts — add these calls in order:

// 1. Boot guard (E1.2)
await enforceBootGuard();

// 2. Secret manager init + rotation subscription
await secretManager.initialize();
await secretManager.subscribeToRotationEvents();

// 3. Start resilience monitors
redisDegradation.startHealthProbe();
queuePressure.startMonitoring();

// 4. Register graceful shutdown
const httpServer = app.listen(PORT);
registerGracefulShutdown(httpServer, {
  sequelize,
  redis: getRedis(),
  queueManager,
});

// 5. Add tenant isolation middleware (tenant routes only)
app.use("/v1/school/", TenantIsolationGuard.middleware());
app.use("/v1/university/", TenantIsolationGuard.middleware());
```

---

## Failure Mode Matrix

| Failure                | System Behavior                                          | Data Safety                    |
| ---------------------- | -------------------------------------------------------- | ------------------------------ |
| Redis down             | RBAC → memory LRU, rate limit → local, session → DB-only | ✅ No data loss                |
| DB slow (>3s avg)      | Circuit breaker trips → 503 with retry-after             | ✅ No connection storm         |
| DB down (5 failures)   | Circuit OPEN → 503, HALF_OPEN probe after 30s            | ✅ No cascade                  |
| Queue backlog >1000    | NORMAL/LOW jobs shed → 429                               | ✅ CRITICAL jobs always pass   |
| Queue backlog >5000    | All non-CRITICAL shed                                    | ✅ Auth/audit never dropped    |
| Missing tenant context | 400 rejected at middleware                               | ✅ No schema fallback          |
| Cross-tenant token     | 403 rejected at guard                                    | ✅ No data bleed               |
| SIGTERM                | 15s drain → clean exit                                   | ✅ In-flight requests complete |
| AWS SM throttle        | Stale cache returned                                     | ✅ No crash                    |
| Uncaught exception     | process.exit(1)                                          | ✅ No zombie process           |

---

## Backward Compatibility

| Feature           | Status                                        |
| ----------------- | --------------------------------------------- |
| Existing routes   | ✅ Unchanged — resilience is additive         |
| Auth flow         | ✅ Unchanged                                  |
| RBAC resolution   | ✅ Unchanged — memory fallback is transparent |
| Queue jobs        | ✅ CRITICAL priority always passes            |
| Tenant middleware | ✅ Isolation guard is additive middleware     |

---

## Next Steps (E3 — Audit & Observability)

- Structured logging for all resilience events (circuit state changes, degradation, isolation violations)
- Prometheus metrics: circuit state, queue depth, Redis health, shutdown events
- Alerting: PagerDuty/Slack on circuit OPEN, Redis degraded, queue SHED
- Distributed tracing: trace IDs through circuit breaker + queue pressure
- Dashboard: real-time resilience status panel
