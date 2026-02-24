# RBAC Pilot Testing Guide

## Step 1: Start the Server with RBAC Pilot Enabled

### 1.1 Verify Environment
```bash
cd server
cat .env | grep RBAC_ENFORCE_STUDENT
# Should show: RBAC_ENFORCE_STUDENT=true
```

### 1.2 Start Server
```bash
npm run dev
```

### 1.3 Verify Pilot is Active
Watch for these log lines on startup:
```
✅ RBAC Infrastructure initialized (Stage 0: Shadow Mode)
[RBAC Pilot] Student module RBAC enforcement: ENABLED
```

---

## Step 2: Log Monitoring (Keep Terminal Open)

Watch server logs for these patterns:

### ✅ CORRECT Logs (What you WANT to see)
```
[RBAC Pilot] Using RBAC enforcement for: students.view
rbac_resolution {"rbac_resolve_ms": 12, "rbac_cache": "hit", "permission_count": 45}
```

### ❌ ERROR Logs (What you DON'T want to see)
```
[RBAC Pilot] Using RBAC enforcement for: students.view
Permission denied. Missing: users.students.view
RBAC context not attached
fallback triggered
```

### ⚠️ WARNING Logs (Investigate)
```
[PermissionMap] Missing RBAC equivalent for: XXXXX
```

---

## Step 3: Manual Testing Commands

### 3.1 Get Auth Tokens
First, login as different users to get tokens:

**Admin Login:**
```bash
curl -X POST http://localhost:3000/api/v1/tenant/school/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: your-tenant" \
  -d '{"email": "admin@school.com", "password": "password"}'
# Save the token from response
```

**Teacher Login:**
```bash
curl -X POST http://localhost:3000/api/v1/tenant/school/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: your-tenant" \
  -d '{"email": "teacher@school.com", "password": "password"}'
```

**Staff Login (No student permissions):**
```bash
curl -X POST http://localhost:3000/api/v1/tenant/school/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: your-tenant" \
  -d '{"email": "staff@school.com", "password": "password"}'
```

### 3.2 Test Admin Flows (Should ALL pass)

Replace `ADMIN_TOKEN` with actual token:

```bash
export ADMIN_TOKEN="eyJhbG..."
export BASE_URL="http://localhost:3000"
export TENANT="your-tenant-slug"

# Test 1: List students
curl -X GET "$BASE_URL/api/v1/tenant/school/students" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Tenant-ID: $TENANT"
# Expected: 200 OK with student list

# Test 2: Admit student
curl -X POST "$BASE_URL/api/v1/tenant/school/students/admit" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Tenant-ID: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Pilot",
    "lastName": "Test",
    "email": "pilot.test.123@school.com",
    "classId": "test-class-id"
  }'
# Expected: 201 Created

# Test 3: Get single student
curl -X GET "$BASE_URL/api/v1/tenant/school/students/STUDENT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Tenant-ID: $TENANT"
# Expected: 200 OK with student details
```

### 3.3 Test Teacher Flows (Should ALL pass)

```bash
export TEACHER_TOKEN="eyJhbG..."

# Test 4: Teacher lists students
curl -X GET "$BASE_URL/api/v1/tenant/school/students" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "X-Tenant-ID: $TENANT"
# Expected: 200 OK

# Test 5: Teacher gets student
curl -X GET "$BASE_URL/api/v1/tenant/school/students/STUDENT_ID" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "X-Tenant-ID: $TENANT"
# Expected: 200 OK

# Test 6: Teacher CANNOT admit (should FAIL with 403)
curl -X POST "$BASE_URL/api/v1/tenant/school/students/admit" \
  -H "Authorization: Bearer $TEACHER_TOKEN" \
  -H "X-Tenant-ID: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Should",
    "lastName": "Fail",
    "email": "should.fail@school.com"
  }'
# Expected: 403 Forbidden
```

### 3.4 Test Unauthorized Flows (Should FAIL)

```bash
export STAFF_TOKEN="eyJhbG..."

# Test 7: Staff tries to admit (should FAIL)
curl -X POST "$BASE_URL/api/v1/tenant/school/students/admit" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "X-Tenant-ID: $TENANT" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Unauth",
    "lastName": "Test",
    "email": "unauth@school.com"
  }'
# Expected: 403 Forbidden

# Test 8: Staff CAN view students (should PASS - has view permission)
curl -X GET "$BASE_URL/api/v1/tenant/school/students" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "X-Tenant-ID: $TENANT"
# Expected: 200 OK
```

### 3.5 Test No Token (Should FAIL)

```bash
# Test 9: No token provided
curl -X GET "$BASE_URL/api/v1/tenant/school/students" \
  -H "X-Tenant-ID: $TENANT"
# Expected: 401 Unauthorized
```

---

## Step 4: Automated Testing (Optional)

Run the test script:

```bash
# Make script executable
chmod +x server/scripts/test-rbac-pilot.sh

# Run with tokens
./server/scripts/test-rbac-pilot.sh \
  "http://localhost:3000" \
  "ADMIN_TOKEN_HERE" \
  "TEACHER_TOKEN_HERE" \
  "STAFF_TOKEN_HERE"
```

Expected output:
```
==============================================
RBAC PILOT TEST - Student Module
==============================================

==============================================
TEST SUITE 1: ADMIN FLOWS (Should PASS)
==============================================

Testing: Admin - List Students ... PASS (HTTP 200)
Testing: Admin - Admit Student ... PASS (HTTP 201)
Testing: Admin - Get Student ... PASS (HTTP 200)
Testing: Admin - Enroll Student ... PASS (HTTP 201)

==============================================
TEST SUITE 2: TEACHER FLOWS (Should PASS)
==============================================

Testing: Teacher - List Students ... PASS (HTTP 200)
Testing: Teacher - Get Student ... PASS (HTTP 200)

==============================================
TEST SUITE 3: UNAUTHORIZED FLOWS (Should FAIL with 403)
==============================================

Testing: Staff - Attempt Admit (should fail) ... PASS (HTTP 403)
Testing: Staff - Attempt Enroll (should fail) ... PASS (HTTP 403)
Testing: Staff - View Students (should pass) ... PASS (HTTP 200)

==============================================
TEST RESULTS SUMMARY
==============================================
Tests Passed: 10
Tests Failed: 0

✅ ALL TESTS PASSED - RBAC Pilot Successful
```

---

## Step 5: Validation Checklist

After running tests, confirm:

### ✅ Admin Validation
- [ ] Can list students (200 OK)
- [ ] Can admit student (201 Created)
- [ ] Can get student details (200 OK)
- [ ] Can enroll student (201 Created)

### ✅ Teacher Validation
- [ ] Can list students (200 OK)
- [ ] Can view student details (200 OK)
- [ ] CANNOT admit student (403 Forbidden)

### ✅ Unauthorized Validation
- [ ] Staff cannot admit (403 Forbidden)
- [ ] Staff cannot enroll (403 Forbidden)
- [ ] Staff CAN view (200 OK) - if they have view permission
- [ ] No token = 401 Unauthorized

### ✅ Log Validation
- [ ] See `[RBAC Pilot]` logs
- [ ] See `rbac_resolution` logs
- [ ] No `RBAC context not attached` errors
- [ ] No `fallback triggered` messages
- [ ] Cache hits > 0

---

## Step 6: Report Results

Reply with this exact format:

```
RBAC PILOT RESULTS
==================
Timestamp: [date/time]
Duration: [X hours]

ADMIN TESTS: pass/fail
- List students: [200/403/error]
- Admit student: [201/403/error]
- Get student: [200/403/error]

TEACHER TESTS: pass/fail
- List students: [200/403/error]
- Get student: [200/403/error]
- Attempt admit: [403/200/error]

UNAUTHORIZED TESTS: pass/fail
- Staff admit attempt: [403/200/error]
- Staff view: [200/403/error]
- No token: [401/200/error]

LOGS CLEAN: yes/no
UNEXPECTED 403: yes/no
CACHE WORKING: yes/no

VERDICT: [READY FOR EXPANSION / NEEDS FIX / ROLLBACK]
```

---

## Emergency Rollback

If anything breaks:

```bash
# Edit .env
RBAC_ENFORCE_STUDENT=false

# Restart server
npm run dev

# Verify fallback
# You should see NO [RBAC Pilot] logs
```

---

## Next Steps After Successful Pilot

1. ✅ Monitor for 24 hours with real traffic
2. ✅ Check for any unexpected 403 errors in logs
3. ✅ Verify performance (RBAC latency < 15ms cached)
4. ⏭️ Expand to Attendance module
5. ⏭️ Expand to Academics module
6. ⏭️ Global RBAC enable
7. ⏭️ Delete legacy middleware

---

**Run the tests now and report back!**
