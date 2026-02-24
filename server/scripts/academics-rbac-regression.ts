#!/usr/bin/env ts-node
/**
 * Academics RBAC Regression Test Suite
 * 
 * Automated validation of Academics RBAC authorization matrix.
 * Run this after any changes to ensure RBAC integrity is maintained.
 * 
 * Usage: npx ts-node src/scripts/academics-rbac-regression.ts
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:3000';
const TENANT = 'test-school';
const TENANT_SCHEMA = 'test_tenant_schema';

// Test tokens (generated from seeded database users)
const TOKENS = {
  admin: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyZjViMTY1Ni1hYzFiLTRhNmUtOWIwOC04YWUyOWI1ZDgxNzkiLCJ0ZW5hbnRJZCI6InRlc3RfdGVuYW50X3NjaGVtYSIsImluc3RpdHV0aW9uSWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJzZXNzaW9uSWQiOiJ0ZXN0LXNlc3Npb24tMTc3MTMxMzA5NTgwNCIsInJvbGVzIjpbIkFkbWluIl0sInR5cGUiOiJ0ZW5hbnQiLCJlbWFpbCI6ImFkbWluQHRlc3QuY29tIiwiaWF0IjoxNzcxMzEzMDk1LCJleHAiOjE3NzEzOTk0OTV9.QwGS4AXzNTo2avdIw06gNpnP7s9TpQO4SAvp-OJnwRM',
  teacher: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlYmRiZDJiNy0yZmEyLTRjYjgtODFkNi05NWE5Y2Y2NjAyZGEiLCJ0ZW5hbnRJZCI6InRlc3RfdGVuYW50X3NjaGVtYSIsImluc3RpdHV0aW9uSWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJzZXNzaW9uSWQiOiJ0ZXN0LXNlc3Npb24tMTc3MTMxMzA5NTgwNyIsInJvbGVzIjpbIlRlYWNoZXIiXSwidHlwZSI6InRlbmFudCIsImVtYWlsIjoidGVhY2hlckB0ZXN0LmNvbSIsImlhdCI6MTc3MTMxMzA5NSwiZXhwIjoxNzcxMzk5NDk1fQ.kimzVxpbPsIDlGBW0ANhCyO5WpigvMYMo9PszH81ZyM',
  student: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhMTlmZTM1OS02YWNjLTQ4MGMtODRlYi02ZjNmNTgxMjQ4YjkiLCJ0ZW5hbnRJZCI6InRlc3RfdGVuYW50X3NjaGVtYSIsImluc3RpdHV0aW9uSWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJzZXNzaW9uSWQiOiJ0ZXN0LXNlc3Npb24tMTc3MTMxMzA5NTgwOCIsInJvbGVzIjpbIlN0dWRlbnQiXSwidHlwZSI6InRlbmFudCIsImVtYWlsIjoic3R1ZGVudEB0ZXN0LmNvbSIsImlhdCI6MTc3MTMxMzA5NSwiZXhwIjoxNzcxMzk5NDk1fQ.kH9SQ4nNGHy59ZYUqmTAsM6aQELO1lcAAGe1hPRAAS0'
};

interface TestResult {
  name: string;
  role: string;
  endpoint: string;
  method: string;
  expectedStatus: number;
  actualStatus: number;
  duration: number;
  passed: boolean;
  error?: string;
}

const TESTS = [
  // Admin - Full Access
  { name: 'Admin view classes', role: 'admin', endpoint: '/academics/classes', method: 'GET', expectedStatus: 200 },
  { name: 'Admin create class', role: 'admin', endpoint: '/academics/classes', method: 'POST', expectedStatus: 201 },
  { name: 'Admin view subjects', role: 'admin', endpoint: '/academics/subjects', method: 'GET', expectedStatus: 200 },
  { name: 'Admin create subject', role: 'admin', endpoint: '/academics/subjects', method: 'POST', expectedStatus: 201 },
  
  // Teacher - View + Limited Manage
  { name: 'Teacher view classes', role: 'teacher', endpoint: '/academics/classes', method: 'GET', expectedStatus: 200 },
  { name: 'Teacher create class (denied)', role: 'teacher', endpoint: '/academics/classes', method: 'POST', expectedStatus: 403 },
  { name: 'Teacher view subjects', role: 'teacher', endpoint: '/academics/subjects', method: 'GET', expectedStatus: 200 },
  { name: 'Teacher create subject (denied)', role: 'teacher', endpoint: '/academics/subjects', method: 'POST', expectedStatus: 403 },
  { name: 'Teacher view curriculum', role: 'teacher', endpoint: '/academics/chapters', method: 'GET', expectedStatus: 200 },
  
  // Student - View Only
  { name: 'Student view classes', role: 'student', endpoint: '/academics/classes', method: 'GET', expectedStatus: 200 },
  { name: 'Student create class (denied)', role: 'student', endpoint: '/academics/classes', method: 'POST', expectedStatus: 403 },
  { name: 'Student view timetable', role: 'student', endpoint: '/academics/timetable/templates', method: 'GET', expectedStatus: 200 },
  { name: 'Student create lesson plan (denied)', role: 'student', endpoint: '/academics/lesson-plans', method: 'POST', expectedStatus: 403 },
];

async function runTest(test: any): Promise<TestResult> {
  const start = performance.now();
  const token = TOKENS[test.role as keyof typeof TOKENS];
  
  try {
    const response = await axios({
      method: test.method,
      url: `${BASE_URL}/api/v1/tenant/${TENANT}/school${test.endpoint}`,
      headers: {
        'Host': `${TENANT}.localhost:3000`,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: test.method !== 'GET' ? { name: 'Test', code: 'TEST001', numeric_grade: 1 } : undefined,
      timeout: 10000,
      validateStatus: () => true
    });
    
    const duration = performance.now() - start;
    const passed = response.status === test.expectedStatus;
    
    return {
      name: test.name,
      role: test.role,
      endpoint: test.endpoint,
      method: test.method,
      expectedStatus: test.expectedStatus,
      actualStatus: response.status,
      duration,
      passed
    };
  } catch (error: any) {
    const duration = performance.now() - start;
    return {
      name: test.name,
      role: test.role,
      endpoint: test.endpoint,
      method: test.method,
      expectedStatus: test.expectedStatus,
      actualStatus: 0,
      duration,
      passed: false,
      error: error.message
    };
  }
}

async function runRegressionSuite() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  ACADEMICS RBAC REGRESSION TEST SUITE               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`Target: ${BASE_URL}`);
  console.log(`Tenant: ${TENANT} (${TENANT_SCHEMA})`);
  console.log(`Tests: ${TESTS.length}`);
  console.log('');
  
  const results: TestResult[] = [];
  
  for (const test of TESTS) {
    process.stdout.write(`Testing: ${test.name}... `);
    const result = await runTest(test);
    results.push(result);
    
    if (result.passed) {
      console.log(`✅ ${result.actualStatus} (${result.duration.toFixed(0)}ms)`);
    } else {
      console.log(`❌ Expected ${result.expectedStatus}, got ${result.actualStatus} (${result.duration.toFixed(0)}ms)`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  }
  
  // Summary
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  
  console.log('\n' + '='.repeat(60));
  console.log('REGRESSION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Avg Response Time: ${avgDuration.toFixed(1)}ms`);
  console.log('');
  
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED - ACADEMICS RBAC REGRESSION CERTIFIED');
    console.log('');
    console.log('Status: LOCKED - Ready for Exams rollout');
    return 0;
  } else {
    console.log('⚠️  REGRESSION DETECTED');
    console.log('');
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}: expected ${r.expectedStatus}, got ${r.actualStatus}`);
    });
    return 1;
  }
}

// Run if called directly
if (require.main === module) {
  runRegressionSuite().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { runRegressionSuite, TESTS };
