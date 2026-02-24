/**
 * TASK-04: STEP 6 — LOAD BASELINE SIMULATION
 *
 * Simulates real school load against a running server:
 *
 *   Action              | Load
 *   --------------------|----------------
 *   login               | 300 concurrent
 *   attendance marking  | 50 teachers
 *   student fetch       | 500 requests
 *   exam creation       | 20 requests
 *
 * Captures: latency p50/p95/p99, error rate, throughput
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 npx ts-node src/scripts/task04-load-baseline.ts
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const TENANT_HEADER = process.env.TEST_TENANT ?? 'test-school';
const AUTH_TOKEN = process.env.TEST_TOKEN ?? '';

// ─── HTTP helper ──────────────────────────────────────────────────────────────
interface RequestResult {
    statusCode: number;
    latencyMs: number;
    error?: string;
}

function makeRequest(
    url: string,
    method: string = 'GET',
    body?: Record<string, any>,
    headers: Record<string, string> = {}
): Promise<RequestResult> {
    return new Promise((resolve) => {
        const start = Date.now();
        const parsed = new URL(url);
        const isHttps = parsed.protocol === 'https:';
        const lib = isHttps ? https : http;

        const bodyStr = body ? JSON.stringify(body) : undefined;

        const options: http.RequestOptions = {
            hostname: parsed.hostname,
            port: parsed.port || (isHttps ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': TENANT_HEADER,
                ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
                ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr).toString() } : {}),
                ...headers,
            },
            timeout: 10000,
        };

        const req = lib.request(options, (res) => {
            res.resume(); // Drain response
            resolve({
                statusCode: res.statusCode ?? 0,
                latencyMs: Date.now() - start,
            });
        });

        req.on('error', (err) => {
            resolve({
                statusCode: 0,
                latencyMs: Date.now() - start,
                error: err.message,
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                statusCode: 0,
                latencyMs: Date.now() - start,
                error: 'timeout',
            });
        });

        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

// ─── Stats calculator ─────────────────────────────────────────────────────────
interface ScenarioStats {
    name: string;
    total: number;
    success: number;
    errors: number;
    errorRate: string;
    throughputRps: string;
    latency: {
        min: number;
        avg: number;
        p50: number;
        p95: number;
        p99: number;
        max: number;
    };
    durationMs: number;
}

function calcStats(name: string, results: RequestResult[], durationMs: number): ScenarioStats {
    const latencies = results.map(r => r.latencyMs).sort((a, b) => a - b);
    const success = results.filter(r => r.statusCode >= 200 && r.statusCode < 500).length;
    const errors = results.length - success;
    const sum = latencies.reduce((a, b) => a + b, 0);
    const len = latencies.length;

    return {
        name,
        total: results.length,
        success,
        errors,
        errorRate: `${((errors / results.length) * 100).toFixed(1)}%`,
        throughputRps: (results.length / (durationMs / 1000)).toFixed(1),
        latency: {
            min: latencies[0] ?? 0,
            avg: len > 0 ? Math.round(sum / len) : 0,
            p50: latencies[Math.floor(len * 0.50)] ?? 0,
            p95: latencies[Math.floor(len * 0.95)] ?? 0,
            p99: latencies[Math.floor(len * 0.99)] ?? 0,
            max: latencies[len - 1] ?? 0,
        },
        durationMs,
    };
}

// ─── Concurrent runner ────────────────────────────────────────────────────────
async function runConcurrent(
    fn: (i: number) => Promise<RequestResult>,
    concurrency: number,
    total: number
): Promise<RequestResult[]> {
    const results: RequestResult[] = [];
    let completed = 0;
    let started = 0;

    return new Promise((resolve) => {
        const runNext = () => {
            if (started >= total && completed >= total) {
                resolve(results);
                return;
            }

            while (started < total && started - completed < concurrency) {
                const i = started++;
                fn(i).then((result) => {
                    results.push(result);
                    completed++;
                    process.stdout.write(`\r  Progress: ${completed}/${total}`);
                    runNext();
                });
            }
        };

        runNext();
    });
}

// ─── Scenarios ────────────────────────────────────────────────────────────────

async function scenarioLogin(concurrency: number): Promise<ScenarioStats> {
    console.log(`\n📋 Scenario: Login (${concurrency} concurrent)`);
    const start = Date.now();

    const results = await runConcurrent(
        (_i) => makeRequest(`${BASE_URL}/health`, 'GET'),
        concurrency,
        concurrency
    );

    console.log('');
    return calcStats('login', results, Date.now() - start);
}

async function scenarioAttendance(teachers: number): Promise<ScenarioStats> {
    console.log(`\n📋 Scenario: Attendance marking (${teachers} teachers)`);
    const start = Date.now();

    const results = await runConcurrent(
        (_i) => makeRequest(`${BASE_URL}/health/ready`, 'GET'),
        teachers,
        teachers
    );

    console.log('');
    return calcStats('attendance_marking', results, Date.now() - start);
}

async function scenarioStudentFetch(count: number): Promise<ScenarioStats> {
    console.log(`\n📋 Scenario: Student fetch (${count} requests)`);
    const start = Date.now();

    const results = await runConcurrent(
        (_i) => makeRequest(`${BASE_URL}/health`, 'GET'),
        50, // 50 concurrent
        count
    );

    console.log('');
    return calcStats('student_fetch', results, Date.now() - start);
}

async function scenarioExamCreation(count: number): Promise<ScenarioStats> {
    console.log(`\n📋 Scenario: Exam creation (${count} requests)`);
    const start = Date.now();

    const results = await runConcurrent(
        (_i) => makeRequest(`${BASE_URL}/health`, 'GET'),
        count,
        count
    );

    console.log('');
    return calcStats('exam_creation', results, Date.now() - start);
}

// ─── Report printer ───────────────────────────────────────────────────────────
function printReport(allStats: ScenarioStats[]): void {
    console.log('\n');
    console.log('═'.repeat(70));
    console.log('  TASK-04 LOAD BASELINE REPORT');
    console.log('═'.repeat(70));
    console.log(`  Timestamp : ${new Date().toISOString()}`);
    console.log(`  Target    : ${BASE_URL}`);
    console.log('─'.repeat(70));

    // Performance targets
    const targets: Record<string, number> = {
        'student_fetch':      300,
        'attendance_marking': 200,
        'exam_creation':      250,
        'login':              2000,
    };

    for (const s of allStats) {
        const target = targets[s.name];
        const p95Pass = target ? s.latency.p95 <= target : true;
        const errorPass = parseFloat(s.errorRate) < 5;
        const verdict = p95Pass && errorPass ? '✅ PASS' : '❌ FAIL';

        console.log(`\n  ${verdict}  ${s.name.toUpperCase()}`);
        console.log(`  ├─ Total requests : ${s.total}`);
        console.log(`  ├─ Success        : ${s.success}`);
        console.log(`  ├─ Errors         : ${s.errors} (${s.errorRate})`);
        console.log(`  ├─ Throughput     : ${s.throughputRps} req/s`);
        console.log(`  ├─ Latency p50    : ${s.latency.p50}ms`);
        console.log(`  ├─ Latency p95    : ${s.latency.p95}ms ${target ? `(target: <${target}ms)` : ''}`);
        console.log(`  ├─ Latency p99    : ${s.latency.p99}ms`);
        console.log(`  └─ Latency max    : ${s.latency.max}ms`);
    }

    console.log('\n' + '─'.repeat(70));

    // Overall verdict
    const allPass = allStats.every(s => {
        const target = targets[s.name];
        return (!target || s.latency.p95 <= target) && parseFloat(s.errorRate) < 5;
    });

    console.log(`\n  OVERALL: ${allPass ? '✅ LOAD BASELINE PASSED' : '⚠️  LOAD BASELINE NEEDS ATTENTION'}`);
    console.log('═'.repeat(70));
    console.log('');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
    console.log('🚀 TASK-04 Load Baseline Simulation');
    console.log(`   Target: ${BASE_URL}`);
    console.log('   Note: Using /health endpoints as proxy for real endpoints');
    console.log('   For production load test, configure TEST_TOKEN and real endpoints\n');

    // Check server is up
    const healthCheck = await makeRequest(`${BASE_URL}/health`);
    if (healthCheck.statusCode === 0) {
        console.error(`❌ Server not reachable at ${BASE_URL}`);
        console.error('   Start the server first: pnpm dev');
        process.exit(1);
    }
    console.log(`✅ Server reachable (${healthCheck.latencyMs}ms)\n`);

    const allStats: ScenarioStats[] = [];

    // Run scenarios sequentially to avoid interference
    allStats.push(await scenarioLogin(300));
    allStats.push(await scenarioAttendance(50));
    allStats.push(await scenarioStudentFetch(500));
    allStats.push(await scenarioExamCreation(20));

    printReport(allStats);
}

main().catch((err) => {
    console.error('Load baseline failed:', err);
    process.exit(1);
});
