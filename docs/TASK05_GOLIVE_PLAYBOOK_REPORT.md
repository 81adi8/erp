# 🏁 TASK-05 — FIRST SCHOOL GO-LIVE PLAYBOOK REPORT

**Status:** ✅ COMPLETE  
**Date:** 2026-02-18  
**Scope:** 1–2 schools, 2k–4k users, zero chaos, zero data loss, recoverable if anything breaks

---

## EXECUTIVE SUMMARY

Task-05 transforms the system from **operationally deployable** (Task-04) to **first-school ready**. Every phase of the go-live playbook has been implemented: deterministic onboarding, data import with rollback, pilot mode guardrails, real-time monitoring, incident recovery procedures, usage simulation, and an automated go-live gate.

The system can now onboard a real school with confidence.

---

## DELIVERABLES COMPLETED

### PHASE A — School Onboarding Pipeline ✅

#### Step 1: Tenant Preflight Checklist

**File:** `server/src/scripts/tenant-preflight.ts`  
**Command:** `pnpm tenant:preflight <schoolSlug>`

Runs 8 deterministic checks before any tenant activation:

| Check                | What it verifies                      |
| -------------------- | ------------------------------------- |
| `schema_exists`      | PostgreSQL schema created             |
| `migrations_applied` | ≥30 tables present                    |
| `rbac_seeded`        | Admin/Teacher/Student roles exist     |
| `admin_exists`       | At least one admin user               |
| `admin_login_ready`  | Admin has password hash, is active    |
| `telemetry_flowing`  | Structured logger operational         |
| `redis_connected`    | Redis reachable (non-critical)        |
| `pilot_mode`         | PILOT_MODE env var set (non-critical) |

**Activation is BLOCKED if any critical check fails.** Exit code 0 = allowed, 1 = blocked.

#### Step 2: Data Import Service

**File:** `server/src/modules/tenant/tenant-data-import.service.ts`

Handles idempotent CSV imports for students, teachers, classes, and subjects:

- **Validation-first:** Full report generated before any DB write
- **Duplicate detection:** Within-CSV and against existing DB records
- **Transaction-wrapped:** Full rollback on any failure
- **Pilot mode guard:** Blocks imports > `PILOT_MAX_IMPORT_ROWS` (default: 500)
- **Upsert semantics:** Safe to re-run (insert new, update existing)

```typescript
const importer = new TenantDataImportService(schemaName, tenantId);
const result = await importer.importFromCSV("students", csvContent);
// result.rolledBack === false → committed
// result.validationReport.canProceed === true → no errors
```

#### Step 3: First Admin Onboarding

**File:** `server/src/modules/tenant/admin-onboarding.service.ts`

Complete 5-step admin onboarding flow:

1. **Create admin** — bcrypt-hashed temp password, `must_change_password=true`
2. **First login** — validates credentials, creates session, audit logged
3. **Force password change** — validates strength, revokes all other sessions
4. **2FA setup** — TOTP secret generated (optional in pilot)
5. **Session audit start** — all events written to structured audit log

Security guarantees:

- Temp password hashed immediately (never stored plain)
- `must_change_password` enforced until changed
- All events audit-logged with IP + user agent
- Login failures tracked in metrics

---

### PHASE B — Pilot Mode Guardrails ✅

**File:** `server/src/core/middleware/pilot-mode.middleware.ts`  
**Wired into:** `server/src/app.ts`

Environment flags:

```env
PILOT_MODE=true
MAX_SCHOOLS=2
QUEUE_RATE_LIMIT=pilot
RBAC_STRICT_LOG=true
PILOT_MAX_IMPORT_ROWS=500
```

Effects when `PILOT_MODE=true`:

| Guardrail             | Behavior                                      |
| --------------------- | --------------------------------------------- |
| `pilotModeHeaders`    | Injects `X-Pilot-Mode: true` on all responses |
| `blockBulkDeletion`   | Returns 403 on any bulk DELETE endpoint       |
| `enforceImportLimits` | Blocks imports > 500 rows (413 response)      |
| `rbacStrictLogger`    | Logs every RBAC decision (allow + deny)       |
| `schoolCountGuard`    | Blocks new tenant creation beyond MAX_SCHOOLS |

All guardrails are **no-ops** when `PILOT_MODE` is not set — zero production impact.

---

### PHASE C — Live Monitoring Command Center ✅

**File:** `server/src/core/observability/golive-dashboard.routes.ts`  
**Mounted at:** `/health/golive/*` (via `health.routes.ts`)

#### Endpoints

| Endpoint                            | Purpose                           |
| ----------------------------------- | --------------------------------- |
| `GET /health/golive`                | Full real-time dashboard snapshot |
| `GET /health/golive/alerts`         | Active red-flag alerts only       |
| `GET /health/golive/pilot`          | Pilot mode status + restrictions  |
| `GET /health/golive/tenant/:schema` | Per-tenant health snapshot        |

#### Dashboard tracks in real-time:

- Login success rate + failures/min
- RBAC deny rate + denies/min
- DB latency (live ping + p95 from metrics)
- Redis health + latency + disconnect count
- Queue lag + DLQ count
- API error rate + p95 latency

#### Red-flag triggers (immediate alert, 5-min TTL):

| Flag                  | Trigger              | Severity |
| --------------------- | -------------------- | -------- |
| `LOGIN_FAILURE_SPIKE` | >20 failures/min     | P0       |
| `DB_HIGH_LATENCY`     | DB latency >1000ms   | P0       |
| `DB_DOWN`             | DB connection failed | P0       |
| `REDIS_DISCONNECT`    | Redis unreachable    | P0       |
| `RBAC_DENY_SPIKE`     | >50 denies/min       | P1       |
| `DLQ_SPIKE`           | >10 failed jobs      | P1       |
| `QUEUE_LAG`           | Queue lag >30s       | P1       |
| `REDIS_HIGH_LATENCY`  | Redis >200ms         | P1       |

Overall health: `GREEN` / `YELLOW` / `RED` — HTTP 503 when RED.

---

### PHASE D — Rollback Playbook ✅

**File:** `docs/FIRST_SCHOOL_INCIDENT_RUNBOOK.md`

Four recovery levels with step-by-step bash commands:

| Level       | Trigger                    | Action                     | Downtime       |
| ----------- | -------------------------- | -------------------------- | -------------- |
| **Level 1** | Service crash, stale cache | Restart + cache flush      | 30–60s         |
| **Level 2** | One school causing issues  | Tenant isolation           | School offline |
| **Level 3** | Bad deployment             | Code rollback + DB restore | 5–15 min       |
| **Level 4** | Data integrity risk        | Maintenance mode           | Until fixed    |

Decision tree included for rapid triage.

---

### PHASE E — Support Operating Model ✅

**Included in:** `docs/FIRST_SCHOOL_INCIDENT_RUNBOOK.md`

| Severity | Example            | Response     | Resolution        |
| -------- | ------------------ | ------------ | ----------------- |
| P0       | Login broken       | **5 min**    | 30 min            |
| P1       | Attendance failing | **30 min**   | 2 hours           |
| P2       | Slow reports       | **Same day** | Next business day |
| P3       | Feature requests   | **3 days**   | Next sprint       |

Escalation ladder: Support Tier 1 → Engineering On-Call → Senior Engineer → CTO

Post-incident protocol with post-mortem template included.

---

### PHASE F — Realistic Usage Simulation ✅

**File:** `server/src/scripts/task05-usage-simulation.ts`  
**Command:** `pnpm simulate:usage`

Four real-school scenarios:

| Scenario                | Load                                            | p95 Target |
| ----------------------- | ----------------------------------------------- | ---------- |
| Monday attendance spike | 50 teachers × 30 students = 1550 requests       | 500ms      |
| Exam day load           | 500 student logins + 200 exam submissions       | 800ms      |
| Teacher bulk upload     | 100 teacher records + 200 concurrent reads      | 1000ms     |
| Admin report export     | 20 concurrent exports + 300 background requests | 2000ms     |

Also verifies:

- Memory stability (< 100MB growth across all scenarios)
- No queue overflow
- Error rate < 5% per scenario

Verdict: `PASS` / `WARN` / `FAIL` with `⛔ DO NOT ONBOARD` gate.

---

### PHASE G — Go-Live Checklist ✅

**File:** `server/src/scripts/task05-golive-checklist.ts`  
**Command:** `pnpm golive:check`  
**With tenant:** `BASE_URL=http://localhost:3000 SCHOOL_SLUG=greenwood-high pnpm golive:check`

Automated verification of 13 checks across 5 categories:

| Category          | Checks                                        |
| ----------------- | --------------------------------------------- |
| Infrastructure    | Server, DB, Redis, Queues, Monitoring, Alerts |
| Pilot Mode        | PILOT_MODE flag, env vars                     |
| Tenant Readiness  | Preflight via `/health/golive/tenant/:schema` |
| Load & Resilience | Quick burst p95 check                         |
| Operational       | Backup schedule, on-call, SLA                 |

**Exit code 0** = go-live approved  
**Exit code 1** = go-live blocked (critical failures)

---

## NEW SCRIPTS ADDED TO `package.json`

```json
"tenant:preflight": "ts-node src/scripts/tenant-preflight.ts",
"simulate:usage":   "ts-node src/scripts/task05-usage-simulation.ts",
"load:baseline":    "ts-node src/scripts/task04-load-baseline.ts",
"test:resilience":  "ts-node src/scripts/task04-failure-resilience.ts",
"golive:check":     "ts-node src/scripts/task05-golive-checklist.ts"
```

---

## NEW ENDPOINTS ADDED

| Endpoint                            | Description                          |
| ----------------------------------- | ------------------------------------ |
| `GET /health/golive`                | Go-live dashboard (GREEN/YELLOW/RED) |
| `GET /health/golive/alerts`         | Active red-flag alerts               |
| `GET /health/golive/pilot`          | Pilot mode status                    |
| `GET /health/golive/tenant/:schema` | Per-tenant health                    |

---

## FILES CREATED / MODIFIED

### New Files

| File                                                       | Purpose                             |
| ---------------------------------------------------------- | ----------------------------------- |
| `server/src/scripts/tenant-preflight.ts`                   | Phase A Step 1: Preflight checklist |
| `server/src/modules/tenant/tenant-data-import.service.ts`  | Phase A Step 2: CSV import          |
| `server/src/modules/tenant/admin-onboarding.service.ts`    | Phase A Step 3: Admin onboarding    |
| `server/src/core/middleware/pilot-mode.middleware.ts`      | Phase B: Pilot guardrails           |
| `server/src/core/observability/golive-dashboard.routes.ts` | Phase C: Go-live dashboard          |
| `server/src/scripts/task05-usage-simulation.ts`            | Phase F: Usage simulation           |
| `server/src/scripts/task05-golive-checklist.ts`            | Phase G: Go-live checklist          |
| `docs/FIRST_SCHOOL_INCIDENT_RUNBOOK.md`                    | Phase D+E: Runbook + SLA            |

### Modified Files

| File                                             | Change                                                |
| ------------------------------------------------ | ----------------------------------------------------- |
| `server/src/core/observability/health.routes.ts` | Mounted `/health/golive` routes                       |
| `server/src/app.ts`                              | Added pilot mode import + `applyPilotGuardrails(app)` |
| `server/package.json`                            | Added 5 new scripts                                   |

---

## GO-LIVE SEQUENCE (EXACT ORDER)

```bash
# 1. Set pilot mode env vars
echo "PILOT_MODE=true" >> server/.env
echo "MAX_SCHOOLS=2" >> server/.env
echo "RBAC_STRICT_LOG=true" >> server/.env

# 2. Start server
cd server && pnpm dev

# 3. Provision tenant
pnpm provision:tenant greenwood-high

# 4. Run preflight
pnpm tenant:preflight greenwood-high

# 5. Create admin (via API or super-admin panel)
# POST /api/v1/tenant/admin/create

# 6. Run usage simulation
pnpm simulate:usage

# 7. Run go-live checklist
BASE_URL=http://localhost:3000 SCHOOL_SLUG=greenwood-high pnpm golive:check

# 8. If all PASS → onboard school
# If any FAIL → fix and re-run checklist
```

---

## WHAT THIS ENABLES

| Capability        | Before Task-05      | After Task-05                                         |
| ----------------- | ------------------- | ----------------------------------------------------- |
| Tenant onboarding | Manual, error-prone | Deterministic, gated                                  |
| Data import       | No path             | Validated, idempotent, rollback-safe                  |
| Admin setup       | Manual SQL          | Automated with audit trail                            |
| Pilot protection  | None                | Full guardrails (bulk delete blocked, import limited) |
| Live monitoring   | Basic health        | Full go-live dashboard + red flags                    |
| Incident response | Ad-hoc              | 4-level runbook with bash commands                    |
| Support SLA       | Undefined           | P0=5min, P1=30min, P2=same day                        |
| Usage validation  | None                | 4 realistic school scenarios                          |
| Go-live gate      | None                | Automated 13-check checklist                          |

---

## NEXT: TASK-06 — GROWTH SCALE

When first school runs stable for 30 days:

- Onboarding automation (self-service)
- Billing integration
- Multi-school orchestration
- SaaSization (subdomain routing, plan management)

---

_Task-05 complete. System is first-school ready._  
_Pilot capacity: 1–2 schools, 2k–4k users._
