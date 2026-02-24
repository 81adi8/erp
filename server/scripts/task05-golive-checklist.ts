#!/usr/bin/env ts-node
/**
 * TASK-05 — PHASE G
 * Go-Live Checklist Script
 *
 * Automated verification of all go-live prerequisites.
 * Runs all checks and produces a final PASS/FAIL verdict.
 *
 * Usage:
 *   pnpm golive:check
 *   BASE_URL=http://localhost:3000 pnpm golive:check
 *   BASE_URL=http://localhost:3000 SCHOOL_SLUG=greenwood-high pnpm golive:check
 *
 * If any CRITICAL item fails → DO NOT ONBOARD
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';
import { sequelize, connectDB } from '../src/database/sequelize';

const BASE_URL    = process.env.BASE_URL    ?? 'http://localhost:3000';
const SCHOOL_SLUG = process.env.SCHOOL_SLUG ?? '';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CheckItem {
    category: string;
    name: string;
    status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
    detail: string;
    critical: boolean;
    command?: string;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────
function httpGet(url: string): Promise<{ statusCode: number; body: any; latencyMs: number }> {
    return new Promise((resolve) => {
        const start  = Date.now();
        const parsed = new URL(url);
        const lib    = parsed.protocol === 'https:' ? https : http;

        const req = lib.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                let body: any = data;
                try { body = JSON.parse(data); } catch { /* raw */ }
                resolve({ statusCode: res.statusCode ?? 0, body, latencyMs: Date.now() - start });
            });
        });

        req.on('error', () => resolve({ statusCode: 0, body: null, latencyMs: Date.now() - start }));
        req.setTimeout(8000, () => { req.destroy(); resolve({ statusCode: 0, body: null, latencyMs: 8000 }); });
    });
}

// ─── Check helpers ────────────────────────────────────────────────────────────
function pass(category: string, name: string, detail: string, critical = true, command?: string): CheckItem {
    return { category, name, status: 'PASS', detail, critical, command };
}
function fail(category: string, name: string, detail: string, critical = true, command?: string): CheckItem {
    return { category, name, status: 'FAIL', detail, critical, command };
}
function warn(category: string, name: string, detail: string, command?: string): CheckItem {
    return { category, name, status: 'WARN', detail, critical: false, command };
}
function skip(category: string, name: string, detail: string): CheckItem {
    return { category, name, status: 'SKIP', detail, critical: false };
}

// ─── Infrastructure checks ────────────────────────────────────────────────────

async function checkServerRunning(): Promise<CheckItem> {
    const result = await httpGet(`${BASE_URL}/health`);
    if (result.statusCode === 200) {
        return pass('Infrastructure', 'server_running',
            `Server OK (${result.latencyMs}ms)`, true, `curl ${BASE_URL}/health`);
    }
    return fail('Infrastructure', 'server_running',
        `Server not reachable at ${BASE_URL} (status: ${result.statusCode})`, true,
        `pnpm dev`);
}

async function checkDatabaseConnected(): Promise<CheckItem> {
    const result = await httpGet(`${BASE_URL}/health/ready`);
    if (result.statusCode === 0) {
        return fail('Infrastructure', 'database_connected',
            'Cannot reach /health/ready — server may be down', true);
    }
    const dbStatus = result.body?.checks?.database?.status;
    const dbLatency = result.body?.checks?.database?.latencyMs ?? 0;
    if (dbStatus === 'ok') {
        return pass('Infrastructure', 'database_connected',
            `DB connected (latency: ${dbLatency}ms)`, true, `curl ${BASE_URL}/health/ready`);
    }
    return fail('Infrastructure', 'database_connected',
        `DB status: ${dbStatus ?? 'unknown'} — check DATABASE_URL`, true);
}

async function checkRedisConnected(): Promise<CheckItem> {
    const result = await httpGet(`${BASE_URL}/health/ready`);
    const redisStatus = result.body?.checks?.redis?.status;
    const redisLatency = result.body?.checks?.redis?.latencyMs ?? 0;
    if (redisStatus === 'ok') {
        return pass('Infrastructure', 'redis_connected',
            `Redis connected (latency: ${redisLatency}ms)`, false, `curl ${BASE_URL}/health/ready`);
    }
    if (redisStatus === 'degraded') {
        return warn('Infrastructure', 'redis_connected',
            `Redis degraded — queues may be slow`, `curl ${BASE_URL}/health/ready`);
    }
    return warn('Infrastructure', 'redis_connected',
        `Redis status: ${redisStatus ?? 'unknown'} — queues unavailable`);
}

async function checkQueueSystem(): Promise<CheckItem> {
    const result = await httpGet(`${BASE_URL}/health/queues`);
    if (result.statusCode === 200) {
        return pass('Infrastructure', 'queue_system',
            'Queue system operational', false, `curl ${BASE_URL}/health/queues`);
    }
    if (result.statusCode === 503) {
        return warn('Infrastructure', 'queue_system',
            'Queue system unavailable — background jobs disabled');
    }
    return warn('Infrastructure', 'queue_system',
        `Queue check returned ${result.statusCode}`);
}

async function checkMonitoringActive(): Promise<CheckItem> {
    const result = await httpGet(`${BASE_URL}/health/golive`);
    if (result.statusCode === 200 || result.statusCode === 503) {
        const health = result.body?.overallHealth ?? 'UNKNOWN';
        if (health === 'GREEN') {
            return pass('Infrastructure', 'monitoring_active',
                `Go-live dashboard GREEN`, true, `curl ${BASE_URL}/health/golive`);
        }
        if (health === 'YELLOW') {
            return warn('Infrastructure', 'monitoring_active',
                `Go-live dashboard YELLOW — check alerts`, `curl ${BASE_URL}/health/golive/alerts`);
        }
        return fail('Infrastructure', 'monitoring_active',
            `Go-live dashboard RED — critical issues detected`, true, `curl ${BASE_URL}/health/golive/alerts`);
    }
    return fail('Infrastructure', 'monitoring_active',
        `Go-live dashboard not reachable (${result.statusCode})`, true);
}

async function checkNoActiveAlerts(): Promise<CheckItem> {
    const result = await httpGet(`${BASE_URL}/health/golive/alerts`);
    if (result.statusCode !== 200) {
        return warn('Infrastructure', 'no_active_alerts',
            `Cannot check alerts (${result.statusCode})`);
    }
    const critical = result.body?.critical ?? 0;
    const total    = result.body?.totalAlerts ?? 0;
    if (critical === 0 && total === 0) {
        return pass('Infrastructure', 'no_active_alerts',
            'No active alerts', false, `curl ${BASE_URL}/health/golive/alerts`);
    }
    if (critical > 0) {
        return fail('Infrastructure', 'no_active_alerts',
            `${critical} critical (P0) alerts active — resolve before onboarding`, true,
            `curl ${BASE_URL}/health/golive/alerts`);
    }
    return warn('Infrastructure', 'no_active_alerts',
        `${total} non-critical alerts active — monitor closely`);
}

// ─── Pilot mode checks ────────────────────────────────────────────────────────

async function checkPilotModeEnabled(): Promise<CheckItem> {
    const result = await httpGet(`${BASE_URL}/health/golive/pilot`);
    const enabled = result.body?.pilot?.enabled;
    if (enabled === true) {
        const maxSchools = result.body?.pilot?.maxSchools ?? '?';
        return pass('Pilot Mode', 'pilot_mode_enabled',
            `PILOT_MODE=true, MAX_SCHOOLS=${maxSchools}`, false);
    }
    return warn('Pilot Mode', 'pilot_mode_enabled',
        'PILOT_MODE not enabled — recommended for first go-live (set PILOT_MODE=true in .env)');
}

function checkEnvVars(): CheckItem {
    const pilotMode  = process.env.PILOT_MODE;
    const maxSchools = process.env.MAX_SCHOOLS;
    const rbacLog    = process.env.RBAC_STRICT_LOG;

    if (pilotMode === 'true' && maxSchools) {
        return pass('Pilot Mode', 'env_vars_set',
            `PILOT_MODE=true, MAX_SCHOOLS=${maxSchools}, RBAC_STRICT_LOG=${rbacLog ?? 'false'}`, false);
    }
    return warn('Pilot Mode', 'env_vars_set',
        `Pilot env vars not fully set. Recommended: PILOT_MODE=true MAX_SCHOOLS=2 RBAC_STRICT_LOG=true`);
}

// ─── Tenant readiness checks ──────────────────────────────────────────────────

async function checkTenantPreflight(): Promise<CheckItem> {
    if (!SCHOOL_SLUG) {
        return skip('Tenant', 'tenant_preflight',
            'SCHOOL_SLUG not set — run: SCHOOL_SLUG=<slug> pnpm golive:check');
    }

    const schemaName = SCHOOL_SLUG.replace(/-/g, '_');
    const result = await httpGet(`${BASE_URL}/health/golive/tenant/${schemaName}`);

    if (result.statusCode !== 200) {
        return fail('Tenant', 'tenant_preflight',
            `Cannot check tenant health (${result.statusCode})`, true,
            `pnpm tenant:preflight ${SCHOOL_SLUG}`);
    }

    const { provisioned, readyForLive, tableCount, adminCount } = result.body ?? {};

    if (readyForLive) {
        return pass('Tenant', 'tenant_preflight',
            `Tenant ready: ${tableCount} tables, ${adminCount} admin(s)`, true,
            `pnpm tenant:preflight ${SCHOOL_SLUG}`);
    }
    if (provisioned && adminCount === 0) {
        return fail('Tenant', 'tenant_preflight',
            `Tenant provisioned but no admin user — create admin first`, true,
            `pnpm tenant:preflight ${SCHOOL_SLUG}`);
    }
    return fail('Tenant', 'tenant_preflight',
        `Tenant not ready: ${tableCount} tables, ${adminCount} admin(s)`, true,
        `pnpm provision:tenant ${SCHOOL_SLUG} && pnpm tenant:preflight ${SCHOOL_SLUG}`);
}

// ─── Load & resilience checks ─────────────────────────────────────────────────

async function checkLoadBaseline(): Promise<CheckItem> {
    // We can't run the full load test here (it's a separate script)
    // Instead, check if the server responds fast enough for a quick burst
    const results: number[] = [];
    for (let i = 0; i < 10; i++) {
        const r = await httpGet(`${BASE_URL}/health`);
        results.push(r.latencyMs);
    }
    const p95 = results.sort((a, b) => a - b)[Math.floor(results.length * 0.95)] ?? 0;
    const avg = Math.round(results.reduce((a, b) => a + b, 0) / results.length);

    if (p95 < 500) {
        return pass('Load & Resilience', 'load_baseline',
            `Quick burst: p95=${p95}ms, avg=${avg}ms (10 requests)`, false,
            `pnpm load:baseline`);
    }
    if (p95 < 1000) {
        return warn('Load & Resilience', 'load_baseline',
            `Quick burst p95=${p95}ms — run full load test: pnpm load:baseline`,
            `pnpm load:baseline`);
    }
    return fail('Load & Resilience', 'load_baseline',
        `Quick burst p95=${p95}ms — server too slow, run: pnpm load:baseline`, true,
        `pnpm load:baseline`);
}

// ─── Operational readiness ────────────────────────────────────────────────────

function checkBackupSchedule(): CheckItem {
    // Can't verify cron from here — just remind
    return warn('Operational', 'backup_schedule',
        'Verify daily backup cron is active: 0 2 * * * pg_dump $DATABASE_URL > /backups/daily-$(date +%Y%m%d).sql');
}

function checkOnCallAssigned(): CheckItem {
    return warn('Operational', 'on_call_assigned',
        'Confirm on-call engineer is assigned and has runbook access: docs/FIRST_SCHOOL_INCIDENT_RUNBOOK.md');
}

function checkSLACommunicated(): CheckItem {
    return warn('Operational', 'sla_communicated',
        'Confirm school admin knows: P0=5min response, P1=30min, P2=same day');
}

// ─── Main checklist runner ────────────────────────────────────────────────────

async function runGoLiveChecklist(): Promise<void> {
    console.log('\n' + '═'.repeat(70));
    console.log('  TASK-05 GO-LIVE CHECKLIST');
    console.log('═'.repeat(70));
    console.log(`  Timestamp  : ${new Date().toISOString()}`);
    console.log(`  Server     : ${BASE_URL}`);
    console.log(`  School     : ${SCHOOL_SLUG || '(not specified)'}`);
    console.log('─'.repeat(70));

    const checks: CheckItem[] = [];

    // Run all checks
    console.log('\n  [Infrastructure]');
    checks.push(await checkServerRunning());
    checks.push(await checkDatabaseConnected());
    checks.push(await checkRedisConnected());
    checks.push(await checkQueueSystem());
    checks.push(await checkMonitoringActive());
    checks.push(await checkNoActiveAlerts());

    console.log('\n  [Pilot Mode]');
    checks.push(await checkPilotModeEnabled());
    checks.push(checkEnvVars());

    console.log('\n  [Tenant Readiness]');
    checks.push(await checkTenantPreflight());

    console.log('\n  [Load & Resilience]');
    checks.push(await checkLoadBaseline());

    console.log('\n  [Operational]');
    checks.push(checkBackupSchedule());
    checks.push(checkOnCallAssigned());
    checks.push(checkSLACommunicated());

    // Print results
    console.log('\n' + '─'.repeat(70));
    console.log('  RESULTS\n');

    let lastCategory = '';
    for (const check of checks) {
        if (check.category !== lastCategory) {
            console.log(`  ── ${check.category} ──`);
            lastCategory = check.category;
        }
        const icon = check.status === 'PASS' ? '✅'
                   : check.status === 'FAIL' ? '❌'
                   : check.status === 'WARN' ? '⚠️ '
                   : '⏭️ ';
        const crit = check.critical ? '' : ' [non-critical]';
        console.log(`  ${icon} ${check.name.padEnd(30)} ${check.detail}${crit}`);
        if (check.status === 'FAIL' && check.command) {
            console.log(`       Fix: ${check.command}`);
        }
    }

    // Summary
    const passed   = checks.filter(c => c.status === 'PASS').length;
    const failed   = checks.filter(c => c.status === 'FAIL').length;
    const warned   = checks.filter(c => c.status === 'WARN').length;
    const skipped  = checks.filter(c => c.status === 'SKIP').length;
    const critFail = checks.filter(c => c.status === 'FAIL' && c.critical).length;

    console.log('\n' + '─'.repeat(70));
    console.log(`  Checks: ${passed} passed, ${failed} failed, ${warned} warned, ${skipped} skipped`);
    console.log(`  Critical failures: ${critFail}`);
    console.log('');

    if (critFail === 0) {
        if (warned > 0) {
            console.log('  ⚠️  GO-LIVE CONDITIONAL — Resolve warnings before onboarding');
            console.log('     All critical checks passed. Warnings are non-blocking but recommended.');
        } else {
            console.log('  ✅ GO-LIVE APPROVED — All checks passed');
            console.log('     System is ready for first school onboarding.');
        }
    } else {
        console.log('  ❌ GO-LIVE BLOCKED — Critical failures detected');
        console.log('');
        console.log('  Blocking issues:');
        checks
            .filter(c => c.status === 'FAIL' && c.critical)
            .forEach(c => {
                console.log(`    → [${c.name}] ${c.detail}`);
                if (c.command) console.log(`       Fix: ${c.command}`);
            });
    }

    console.log('\n  Reference: docs/FIRST_SCHOOL_INCIDENT_RUNBOOK.md');
    console.log('═'.repeat(70) + '\n');

    process.exit(critFail === 0 ? 0 : 1);
}

// ─── Entry point ──────────────────────────────────────────────────────────────
async function main(): Promise<void> {
    try {
        // Connect DB only if SCHOOL_SLUG is set (for tenant checks)
        if (SCHOOL_SLUG) {
            await connectDB();
        }
        await runGoLiveChecklist();
    } catch (err: any) {
        console.error('❌ Go-live checklist crashed:', err.message);
        process.exit(1);
    } finally {
        try { await sequelize.close(); } catch { /* ignore */ }
    }
}

main();
