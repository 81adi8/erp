# 🚨 FIRST SCHOOL INCIDENT RUNBOOK

**Version:** 1.0 — Task-05 Go-Live Edition  
**Applies to:** Pilot deployment (1–2 schools, 2k–4k users)  
**Last updated:** 2026-02-18  
**Owner:** Engineering On-Call

---

## 📋 TABLE OF CONTENTS

1. [Support Operating Model (Phase E)](#support-operating-model)
2. [Severity Classification](#severity-classification)
3. [Escalation Ladder](#escalation-ladder)
4. [Recovery Levels (Phase D)](#recovery-levels)
5. [Level 1 — Service Restart & Cache Flush](#level-1--service-restart--cache-flush)
6. [Level 2 — Tenant Isolation](#level-2--tenant-isolation)
7. [Level 3 — Deployment Rollback & DB Restore](#level-3--deployment-rollback--db-restore)
8. [Level 4 — Tenant Maintenance Mode](#level-4--tenant-maintenance-mode)
9. [Red-Flag Playbooks](#red-flag-playbooks)
10. [Post-Incident Protocol](#post-incident-protocol)
11. [Go-Live Checklist (Phase G)](#go-live-checklist)

---

## SUPPORT OPERATING MODEL

### Response SLA

| Severity | Example                         | Response Time  | Resolution Target |
| -------- | ------------------------------- | -------------- | ----------------- |
| **P0**   | Login broken, DB down           | **5 minutes**  | 30 minutes        |
| **P1**   | Attendance failing, RBAC errors | **30 minutes** | 2 hours           |
| **P2**   | Slow reports, UI glitches       | **Same day**   | Next business day |
| **P3**   | Feature requests, minor UX      | **3 days**     | Next sprint       |

### Issue Severity Classification

#### P0 — Critical (System Down)

- Login completely broken for any user
- Database connection failure
- Redis disconnect (queues/cache down)
- Data loss or corruption detected
- Tenant boundary breach (data leak between schools)
- Authentication token forgery detected

#### P1 — High (Core Feature Broken)

- Attendance marking failing for >10% of teachers
- Exam submission errors
- RBAC denying legitimate users
- Queue DLQ spike (>10 failed jobs)
- Report generation timing out
- Admin panel inaccessible

#### P2 — Medium (Degraded Experience)

- Slow page loads (>3s)
- Report exports taking >30s
- Non-critical features unavailable
- UI rendering issues
- Notification delays

#### P3 — Low (Minor / Enhancement)

- Cosmetic issues
- Feature requests
- Documentation gaps
- Non-blocking UX improvements

### Escalation Ladder

```
User reports issue
       ↓
  Support Tier 1 (5 min response)
  - Check /health/golive dashboard
  - Check /health/golive/alerts
  - Check server logs
       ↓ (if not resolved in 15 min)
  Engineering On-Call
  - Access server directly
  - Check DB / Redis
  - Execute Level 1 recovery
       ↓ (if not resolved in 30 min)
  Senior Engineer / Tech Lead
  - Execute Level 2 or 3 recovery
  - Coordinate with school admin
       ↓ (if data integrity risk)
  CTO / Founder
  - Authorize Level 4 (maintenance mode)
  - Communicate with school principal
```

---

## RECOVERY LEVELS

### Decision Tree

```
Issue detected
     │
     ├─ Is it a single service crash?
     │    └─ YES → Level 1 (restart + cache flush)
     │
     ├─ Is it affecting only one school?
     │    └─ YES → Level 2 (tenant isolation)
     │
     ├─ Is it a bad deployment?
     │    └─ YES → Level 3 (rollback + DB restore)
     │
     └─ Is data integrity at risk?
          └─ YES → Level 4 (maintenance mode)
```

---

## LEVEL 1 — SERVICE RESTART & CACHE FLUSH

**When to use:** Service crash, memory spike, stale cache, minor errors  
**Impact:** 30–60 second downtime  
**Authorization:** On-call engineer

### Step-by-step

```bash
# 1. Check current health
curl http://localhost:3000/health/golive
curl http://localhost:3000/health/ready

# 2. Check active alerts
curl http://localhost:3000/health/golive/alerts

# 3. Check server logs (last 100 lines)
pm2 logs --lines 100
# OR
docker logs school-erp-server --tail 100

# 4. Flush Redis cache (non-destructive)
redis-cli FLUSHDB
# OR (if Redis auth required)
redis-cli -a $REDIS_PASSWORD FLUSHDB

# 5. Restart the server
pm2 restart school-erp-server
# OR
docker restart school-erp-server
# OR (if running directly)
kill -SIGTERM <PID> && pnpm start

# 6. Verify recovery
sleep 10
curl http://localhost:3000/health/ready
curl http://localhost:3000/health/golive

# 7. Monitor for 5 minutes
watch -n 5 'curl -s http://localhost:3000/health/golive | jq .overallHealth'
```

### Verification checklist

- [ ] `/health` returns 200
- [ ] `/health/ready` shows all checks `ok`
- [ ] `/health/golive` shows `GREEN`
- [ ] Login works for test user
- [ ] No new alerts in `/health/golive/alerts`

---

## LEVEL 2 — TENANT ISOLATION

**When to use:** One school is causing issues, affecting other tenants  
**Impact:** Affected school goes offline; other schools unaffected  
**Authorization:** Senior engineer

### Step-by-step

```bash
# 1. Identify the problematic tenant
TENANT_SCHEMA="greenwood_high"  # Replace with actual schema

# 2. Check tenant health
curl http://localhost:3000/health/golive/tenant/$TENANT_SCHEMA

# 3. Disable queues for this tenant (set env flag)
# Add to .env:
DISABLED_TENANTS=greenwood_high

# 4. Revoke all active sessions for this tenant
# Run in psql:
psql $DATABASE_URL -c "
  UPDATE \"$TENANT_SCHEMA\".user_sessions
  SET is_active = false,
      revoked_at = NOW(),
      revoke_reason = 'Tenant isolated for maintenance'
  WHERE is_active = true;
"

# 5. Block tenant traffic at middleware level
# Set in Redis:
redis-cli SET "tenant:blocked:$TENANT_SCHEMA" "true" EX 3600

# 6. Investigate root cause
psql $DATABASE_URL -c "
  SELECT table_name, pg_size_pretty(pg_total_relation_size('\"$TENANT_SCHEMA\".\"' || table_name || '\"'))
  FROM information_schema.tables
  WHERE table_schema = '$TENANT_SCHEMA'
  ORDER BY pg_total_relation_size('\"$TENANT_SCHEMA\".\"' || table_name || '\"') DESC
  LIMIT 10;
"

# 7. Re-enable after fix
redis-cli DEL "tenant:blocked:$TENANT_SCHEMA"
# Remove DISABLED_TENANTS from .env
# Restart server
pm2 restart school-erp-server
```

### Communication template

```
Subject: Scheduled maintenance for [School Name]

Dear [School Admin],

We are performing emergency maintenance on your school's system.
Expected downtime: [X] minutes.
All your data is safe and secure.
We will notify you when service is restored.

— Engineering Team
```

---

## LEVEL 3 — DEPLOYMENT ROLLBACK & DB RESTORE

**When to use:** Bad deployment broke production, data migration failed  
**Impact:** Full system downtime during rollback (5–15 min)  
**Authorization:** Tech lead + CTO approval

### Step-by-step: Code Rollback

```bash
# 1. Identify last good deployment
git log --oneline -10

# 2. Rollback to previous version
git checkout <last-good-commit-hash>

# 3. Rebuild and restart
pnpm build
pm2 restart school-erp-server

# 4. Verify
curl http://localhost:3000/health/ready

# 5. If using Docker
docker pull school-erp:previous-tag
docker stop school-erp-server
docker run -d --name school-erp-server school-erp:previous-tag
```

### Step-by-step: Database Snapshot Restore

```bash
# ⚠️  WARNING: This will lose data since last snapshot
# Get explicit CTO approval before proceeding

# 1. Take emergency snapshot of current state
pg_dump $DATABASE_URL > /backups/emergency-$(date +%Y%m%d-%H%M%S).sql

# 2. Identify last good snapshot
ls -la /backups/ | sort -k6,7 | tail -10

# 3. Restore specific tenant schema only (safer than full restore)
TENANT_SCHEMA="greenwood_high"
SNAPSHOT_FILE="/backups/greenwood_high_20260218_120000.sql"

psql $DATABASE_URL -c "DROP SCHEMA IF EXISTS \"$TENANT_SCHEMA\" CASCADE;"
psql $DATABASE_URL -c "CREATE SCHEMA \"$TENANT_SCHEMA\";"
psql $DATABASE_URL < $SNAPSHOT_FILE

# 4. Verify restore
psql $DATABASE_URL -c "
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = '$TENANT_SCHEMA';
"

# 5. Run preflight to confirm
pnpm tenant:preflight $TENANT_SCHEMA
```

### Automated snapshot schedule (recommended)

```bash
# Add to crontab:
# Daily snapshot at 2 AM
0 2 * * * pg_dump $DATABASE_URL > /backups/daily-$(date +%Y%m%d).sql

# Keep last 7 days
find /backups -name "daily-*.sql" -mtime +7 -delete
```

---

## LEVEL 4 — TENANT MAINTENANCE MODE

**When to use:** Critical data integrity issue, security breach suspected  
**Impact:** School sees maintenance page; no data access  
**Authorization:** CTO mandatory

### Step-by-step

```bash
# 1. Enable maintenance mode for tenant
TENANT_SCHEMA="greenwood_high"

# Set maintenance flag in Redis (all requests return 503)
redis-cli SET "tenant:maintenance:$TENANT_SCHEMA" "true"
redis-cli SET "tenant:maintenance:message:$TENANT_SCHEMA" \
  "System maintenance in progress. Expected completion: 2 hours."

# 2. Revoke ALL sessions immediately
psql $DATABASE_URL -c "
  UPDATE \"$TENANT_SCHEMA\".user_sessions
  SET is_active = false,
      revoked_at = NOW(),
      revoke_reason = 'Emergency maintenance mode activated'
  WHERE is_active = true;
"

# 3. Take forensic snapshot (before any changes)
pg_dump $DATABASE_URL \
  --schema="$TENANT_SCHEMA" \
  > /backups/forensic-$TENANT_SCHEMA-$(date +%Y%m%d-%H%M%S).sql

# 4. Investigate and fix

# 5. Run full preflight before re-enabling
pnpm tenant:preflight $TENANT_SCHEMA

# 6. Disable maintenance mode
redis-cli DEL "tenant:maintenance:$TENANT_SCHEMA"
redis-cli DEL "tenant:maintenance:message:$TENANT_SCHEMA"

# 7. Notify school admin
echo "Maintenance complete. Service restored at $(date)"
```

---

## RED-FLAG PLAYBOOKS

### 🔴 LOGIN_FAILURE_SPIKE

**Trigger:** >20 login failures/minute  
**Likely cause:** Brute force attack, wrong credentials distributed, auth service issue

```bash
# 1. Check which users are failing
# (Check structured logs)
grep "ADMIN_LOGIN_FAILED\|login_failures" /var/log/school-erp.log | tail -50

# 2. Check if it's one IP (brute force)
grep "login_failures" /var/log/school-erp.log | \
  grep -oP '"ip":"[^"]*"' | sort | uniq -c | sort -rn | head -10

# 3. If brute force: block IP at nginx/firewall
# nginx: add to deny list
# iptables: iptables -A INPUT -s <IP> -j DROP

# 4. If credential issue: notify school admin to reset passwords
# 5. Monitor: watch -n 10 'curl -s http://localhost:3000/health/golive/alerts'
```

### 🔴 DB_HIGH_LATENCY / DB_DOWN

**Trigger:** DB latency >1000ms or connection failure

```bash
# 1. Check DB connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
psql $DATABASE_URL -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"

# 2. Kill long-running queries
psql $DATABASE_URL -c "
  SELECT pid, now() - pg_stat_activity.query_start AS duration, query
  FROM pg_stat_activity
  WHERE (now() - pg_stat_activity.query_start) > interval '30 seconds';
"
# Kill specific query: SELECT pg_terminate_backend(<pid>);

# 3. Check disk space
df -h

# 4. Restart connection pool
pm2 restart school-erp-server
```

### 🔴 REDIS_DISCONNECT

**Trigger:** Redis unreachable

```bash
# 1. Check Redis status
redis-cli ping
systemctl status redis

# 2. Restart Redis
systemctl restart redis
# OR
docker restart redis

# 3. Verify
redis-cli ping  # Should return PONG

# 4. Restart app (to re-establish connection pool)
pm2 restart school-erp-server
```

### 🔴 DLQ_SPIKE

**Trigger:** >10 failed jobs in Dead Letter Queue

```bash
# 1. Check queue stats
curl http://localhost:3000/health/queues

# 2. Inspect failed jobs (via Bull dashboard or Redis)
redis-cli LRANGE bull:notifications:failed 0 10

# 3. Retry failed jobs
# Via Bull API or admin panel

# 4. If jobs are poison (keep failing): drain DLQ
redis-cli DEL bull:notifications:failed
```

---

## POST-INCIDENT PROTOCOL

After every P0 or P1 incident:

### Within 1 hour

- [ ] Incident timeline documented
- [ ] Root cause identified
- [ ] Immediate fix applied and verified
- [ ] School admin notified of resolution

### Within 24 hours

- [ ] Post-mortem written (5 whys)
- [ ] Preventive measures identified
- [ ] Monitoring/alerting improved
- [ ] Runbook updated if needed

### Post-mortem template

```markdown
## Incident Post-Mortem

**Date:** YYYY-MM-DD
**Duration:** X minutes
**Severity:** P0/P1
**Affected:** [School name], [N] users

### Timeline

- HH:MM — Issue detected
- HH:MM — On-call notified
- HH:MM — Root cause identified
- HH:MM — Fix applied
- HH:MM — Service restored

### Root Cause

[What actually caused the issue]

### Impact

[What users experienced]

### Resolution

[What was done to fix it]

### Prevention

[What changes prevent recurrence]

### Action Items

- [ ] [Action] — Owner — Due date
```

---

## GO-LIVE CHECKLIST

> Run this checklist before adding the first real school.  
> **If any item is ❌ — DO NOT ONBOARD.**

### Infrastructure

| Item              | Command                                    | Status |
| ----------------- | ------------------------------------------ | ------ |
| Server running    | `curl http://localhost:3000/health`        | ☐      |
| DB connected      | `curl http://localhost:3000/health/ready`  | ☐      |
| Redis connected   | `curl http://localhost:3000/health/ready`  | ☐      |
| Queue system up   | `curl http://localhost:3000/health/queues` | ☐      |
| Monitoring active | `curl http://localhost:3000/health/golive` | ☐      |

### Tenant Readiness

| Item                        | Command                        | Status |
| --------------------------- | ------------------------------ | ------ |
| Tenant preflight passed     | `pnpm tenant:preflight <slug>` | ☐      |
| Admin user created          | Verify in preflight output     | ☐      |
| RBAC roles seeded           | Verify in preflight output     | ☐      |
| Admin first login tested    | Manual test                    | ☐      |
| Password change flow tested | Manual test                    | ☐      |

### Load & Resilience

| Item                      | Command                | Status |
| ------------------------- | ---------------------- | ------ |
| Load baseline passed      | `pnpm load:baseline`   | ☐      |
| Usage simulation passed   | `pnpm simulate:usage`  | ☐      |
| Failure resilience passed | `pnpm test:resilience` | ☐      |

### Operational Readiness

| Item                     | Check                                 | Status |
| ------------------------ | ------------------------------------- | ------ |
| Pilot mode configured    | `PILOT_MODE=true` in `.env`           | ☐      |
| MAX_SCHOOLS set          | `MAX_SCHOOLS=2` in `.env`             | ☐      |
| Alerts configured        | `/health/golive/alerts` returns empty | ☐      |
| Rollback tested          | Level 1 recovery verified             | ☐      |
| Backup schedule active   | Cron job running                      | ☐      |
| On-call assigned         | Engineer available                    | ☐      |
| School admin briefed     | Contact info collected                | ☐      |
| Support SLA communicated | School knows P0=5min                  | ☐      |

### Final Gate

```
ALL items above must be ✅ before proceeding.

Authorized by: _________________ Date: _________
```

---

## QUICK REFERENCE

```bash
# Health check
curl http://localhost:3000/health/golive

# Active alerts
curl http://localhost:3000/health/golive/alerts

# Tenant health
curl http://localhost:3000/health/golive/tenant/<schema>

# Pilot status
curl http://localhost:3000/health/golive/pilot

# Preflight
pnpm tenant:preflight <schoolSlug>

# Usage simulation
pnpm simulate:usage

# Load baseline
pnpm load:baseline

# Restart server
pm2 restart school-erp-server

# Flush cache
redis-cli FLUSHDB
```

---

_This runbook is a living document. Update after every incident._  
_Next review: 30 days after first school go-live._
