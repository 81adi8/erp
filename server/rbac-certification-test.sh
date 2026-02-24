#!/bin/bash
# RBAC Final Certification Test

cd server
timeout 120 npm run dev 2>&1 > /tmp/rbac_final_cert.log &
sleep 15

ADMIN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyZjViMTY1Ni1hYzFiLTRhNmUtOWIwOC04YWUyOWI1ZDgxNzkiLCJ0ZW5hbnRJZCI6InRlc3RfdGVuYW50X3NjaGVtYSIsImluc3RpdHV0aW9uSWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJzZXNzaW9uSWQiOiJ0ZXN0LXNlc3Npb24tMTc3MTMxMzA5NTgwNCIsInJvbGVzIjpbIkFkbWluIl0sInR5cGUiOiJ0ZW5hbnQiLCJlbWFpbCI6ImFkbWluQHRlc3QuY29tIiwiaWF0IjoxNzcxMzEzMDk1LCJleHAiOjE3NzEzOTk0OTV9.QwGS4AXzNTo2avdIw06gNpnP7s9TpQO4SAvp-OJnwRM"
TEACHER="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlYmRiZDJiNy0yZmEyLTRjYjgtODFkNi05NWE5Y2Y2NjAyZGEiLCJ0ZW5hbnRJZCI6InRlc3RfdGVuYW50X3NjaGVtYSIsImluc3RpdHV0aW9uSWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJzZXNzaW9uSWQiOiJ0ZXN0LXNlc3Npb24tMTc3MTMxMzA5NTgwNyIsInJvbGVzIjpbIlRlYWNoZXIiXSwidHlwZSI6InRlbmFudCIsImVtYWlsIjoidGVhY2hlckB0ZXN0LmNvbSIsImlhdCI6MTc3MTMxMzA5NSwiZXhwIjoxNzcxMzk5NDk1fQ.kimzVxpbPsIDlGBW0ANhCyO5WpigvMYMo9PszH81ZyM"
STUDENT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhMTlmZTM1OS02YWNjLTQ4MGMtODRlYi02ZjNmNTgxMjQ4YjkiLCJ0ZW5hbnRJZCI6InRlc3RfdGVuYW50X3NjaGVtYSIsImluc3RpdHV0aW9uSWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJzZXNzaW9uSWQiOiJ0ZXN0LXNlc3Npb24tMTc3MTMxMzA5NTgwOCIsInJvbGVzIjpbIlN0dWRlbnQiXSwidHlwZSI6InRlbmFudCIsImVtYWlsIjoic3R1ZGVudEB0ZXN0LmNvbSIsImlhdCI6MTc3MTMxMzA5NSwiZXhwIjoxNzcxMzk5NDk1fQ.kH9SQ4nNGHy59ZYUqmTAsM6aQELO1lcAAGe1hPRAAS0"

echo "ACADEMICS RBAC FINAL CERTIFICATION"
echo "===================================="
echo ""

echo "Admin Tests:"
R1=$(curl -s -w "%{http_code}" -H "Host: test-school.localhost:3000" -H "Authorization: Bearer $ADMIN" "http://localhost:3000/api/v1/tenant/school/academics/classes")
echo "  GET /classes:  $R1"

R2=$(curl -s -w "%{http_code}" -H "Host: test-school.localhost:3000" -H "Authorization: Bearer $ADMIN" -H "Content-Type: application/json" -X POST "http://localhost:3000/api/v1/tenant/school/academics/classes" -d '{"name":"Test","code":"T001","numeric_grade":1}')
echo "  POST /classes: $R2"

echo ""
echo "Teacher Tests:"
R3=$(curl -s -w "%{http_code}" -H "Host: test-school.localhost:3000" -H "Authorization: Bearer $TEACHER" "http://localhost:3000/api/v1/tenant/school/academics/classes")
echo "  GET /classes:  $R3"

R4=$(curl -s -w "%{http_code}" -H "Host: test-school.localhost:3000" -H "Authorization: Bearer $TEACHER" -H "Content-Type: application/json" -X POST "http://localhost:3000/api/v1/tenant/school/academics/classes" -d '{"name":"Test","code":"T002","numeric_grade":1}')
echo "  POST /classes: $R4"

echo ""
echo "Student Tests:"
R5=$(curl -s -w "%{http_code}" -H "Host: test-school.localhost:3000" -H "Authorization: Bearer $STUDENT" "http://localhost:3000/api/v1/tenant/school/academics/classes")
echo "  GET /classes:  $R5"

R6=$(curl -s -w "%{http_code}" -H "Host: test-school.localhost:3000" -H "Authorization: Bearer $STUDENT" -H "Content-Type: application/json" -X POST "http://localhost:3000/api/v1/tenant/school/academics/classes" -d '{"name":"Test","code":"T003","numeric_grade":1}')
echo "  POST /classes: $R6"

echo ""
echo "SUMMARY:"
echo "--------"

check_result() {
  if [ "$2" = "$3" ]; then
    echo "✅ $1: PASS ($2)"
    return 0
  else
    echo "❌ $1: FAIL (expected $3, got $2)"
    return 1
  fi
}

PASS=0
FAIL=0

check_result "Admin GET" "$R1" "200" && PASS=$((PASS+1)) || FAIL=$((FAIL+1))
check_result "Admin POST" "$R2" "200" && PASS=$((PASS+1)) || FAIL=$((FAIL+1))
check_result "Teacher GET" "$R3" "200" && PASS=$((PASS+1)) || FAIL=$((FAIL+1))
check_result "Teacher POST" "$R4" "403" && PASS=$((PASS+1)) || FAIL=$((FAIL+1))
check_result "Student GET" "$R5" "200" && PASS=$((PASS+1)) || FAIL=$((FAIL+1))
check_result "Student POST" "$R6" "403" && PASS=$((PASS+1)) || FAIL=$((FAIL+1))

echo ""
echo "Total: $PASS passed, $FAIL failed"

if [ $FAIL -eq 0 ]; then
  echo ""
  echo "ACADEMICS RBAC FULLY CERTIFIED!"
  echo "Status: PRODUCTION READY"
else
  echo ""
  echo "Some tests failed"
fi

sleep 3
pkill -f "npm run dev" 2>/dev/null || true
