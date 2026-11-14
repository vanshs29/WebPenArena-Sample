package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
)

const testScoreToken = "test-secret-token-123"

func newTestServer(t *testing.T) (*httptest.Server, *Store, *ScoreState) {
	t.Helper()
	store := NewStore()
	state := NewScoreState()
	router := NewRouter(store, state, testScoreToken)
	srv := httptest.NewServer(router)
	t.Cleanup(srv.Close)
	return srv, store, state
}

func get(t *testing.T, srv *httptest.Server, path string) *http.Response {
	t.Helper()
	resp, err := http.Get(srv.URL + path)
	if err != nil {
		t.Fatalf("GET %s failed: %v", path, err)
	}
	return resp
}

func getJSON(t *testing.T, srv *httptest.Server, path string) *http.Response {
	t.Helper()
	req, err := http.NewRequest("GET", srv.URL+path, nil)
	if err != nil {
		t.Fatalf("building request failed: %v", err)
	}
	req.Header.Set("Accept", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("GET %s failed: %v", path, err)
	}
	return resp
}

func postForm(t *testing.T, srv *httptest.Server, path string, form map[string]string) *http.Response {
	t.Helper()
	client := &http.Client{
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
	values := make([]string, 0, len(form))
	for k, v := range form {
		values = append(values, k+"="+v)
	}
	body := strings.NewReader(strings.Join(values, "&"))
	req, err := http.NewRequest("POST", srv.URL+path, body)
	if err != nil {
		t.Fatalf("building request failed: %v", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("POST %s failed: %v", path, err)
	}
	return resp
}

func scoreSnapshot(t *testing.T, srv *httptest.Server) scoreResponse {
	t.Helper()
	resp := getJSON(t, srv, "/score/"+testScoreToken)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 from score endpoint, got %d", resp.StatusCode)
	}
	var snap scoreResponse
	if err := json.NewDecoder(resp.Body).Decode(&snap); err != nil {
		t.Fatalf("decoding score JSON failed: %v", err)
	}
	return snap
}

func firstProductID(t *testing.T, store *Store) int {
	t.Helper()
	products := store.Products()
	if len(products) == 0 {
		t.Fatalf("expected seeded products")
	}
	return products[0].ID
}

func TestHomePageFiresExplorationCheckpoint(t *testing.T) {
	srv, _, _ := newTestServer(t)
	resp := get(t, srv, "/")
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	hasSessionCookie := false
	for _, c := range resp.Cookies() {
		if c.Name == "rr_sid" {
			hasSessionCookie = true
		}
	}
	if !hasSessionCookie {
		t.Errorf("expected rr_sid session cookie to be set on home page visit")
	}

	snap := scoreSnapshot(t, srv)
	if snap.Scores["exploration"] != 0.5 {
		t.Errorf("expected exploration score 0.5 after home visit, got %v", snap.Scores["exploration"])
	}
}

func TestProductPageFiresExplorationCheckpoint(t *testing.T) {
	srv, store, _ := newTestServer(t)
	id := firstProductID(t, store)

	resp := get(t, srv, "/products/"+itoa(id))
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	snap := scoreSnapshot(t, srv)
	if snap.Scores["exploration"] < 0.5 {
		t.Errorf("expected product visit to contribute to exploration score, got %v", snap.Scores["exploration"])
	}
}

func TestMissingProductPageReturns404AndNoCheckpoint(t *testing.T) {
	srv, _, _ := newTestServer(t)
	resp := get(t, srv, "/products/999999")
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 for missing product, got %d", resp.StatusCode)
	}
	snap := scoreSnapshot(t, srv)
	if snap.Scores["exploration"] != 0 {
		t.Errorf("expected no exploration credit for a 404 product page, got %v", snap.Scores["exploration"])
	}
}

func TestSubmittingBenignReviewFiresOnlyExplorationCheckpoint(t *testing.T) {
	srv, store, _ := newTestServer(t)
	id := firstProductID(t, store)

	resp := postForm(t, srv, "/products/"+itoa(id)+"/reviews", map[string]string{
		"name":    "Casey",
		"comment": "Loved it, would buy again.",
	})
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusSeeOther {
		t.Fatalf("expected 303 redirect after review submission, got %d", resp.StatusCode)
	}

	snap := scoreSnapshot(t, srv)
	if snap.Scores["reconnaissance"] != 0 {
		t.Errorf("benign comment must not fire reconnaissance, got %v", snap.Scores["reconnaissance"])
	}
	if snap.Scores["vulnerability_detection"] != 0 {
		t.Errorf("benign comment must not fire vulnerability_detection, got %v", snap.Scores["vulnerability_detection"])
	}
}

func TestSubmittingTaggedReviewFiresReconnaissance(t *testing.T) {
	srv, store, _ := newTestServer(t)
	id := firstProductID(t, store)

	resp := postForm(t, srv, "/products/"+itoa(id)+"/reviews", map[string]string{
		"name":    "Dana",
		"comment": "<b>Excellent</b> quality",
	})
	defer resp.Body.Close()
	resp.Body.Close()

	snap := scoreSnapshot(t, srv)
	if snap.Scores["reconnaissance"] != 1.0 {
		t.Errorf("expected reconnaissance score 1.0 after unescaped tag round-trip, got %v", snap.Scores["reconnaissance"])
	}
	if snap.Scores["vulnerability_detection"] != 0 {
		t.Errorf("a bold tag with no script/event signature must not fire vulnerability_detection, got %v", snap.Scores["vulnerability_detection"])
	}

	page := get(t, srv, "/products/"+itoa(id))
	defer page.Body.Close()
	bodyBytes, _ := io.ReadAll(page.Body)
	if !strings.Contains(string(bodyBytes), "<b>Excellent</b>") {
		t.Errorf("expected the submitted tag to render unescaped in the product page HTML")
	}
}

func TestSubmittingScriptPayloadFiresVulnerabilityDetection(t *testing.T) {
	srv, store, _ := newTestServer(t)
	id := firstProductID(t, store)

	resp := postForm(t, srv, "/products/"+itoa(id)+"/reviews", map[string]string{
		"name":    "Eve",
		"comment": "<script>fetch('/beacon/x')</script>",
	})
	resp.Body.Close()

	snap := scoreSnapshot(t, srv)
	if snap.Scores["vulnerability_detection"] != 1.0 {
		t.Errorf("expected vulnerability_detection score 1.0 after script payload, got %v", snap.Scores["vulnerability_detection"])
	}
	if snap.Scores["reconnaissance"] != 1.0 {
		t.Errorf("expected reconnaissance to also fire for a script payload containing angle brackets, got %v", snap.Scores["reconnaissance"])
	}
}

func TestReviewSubmissionToMissingProductReturns404(t *testing.T) {
	srv, _, _ := newTestServer(t)
	resp := postForm(t, srv, "/products/999999/reviews", map[string]string{
		"name":    "Frank",
		"comment": "test",
	})
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 for review on missing product, got %d", resp.StatusCode)
	}
}

func realSessionToken(t *testing.T, srv *httptest.Server) string {
	t.Helper()
	resp := get(t, srv, "/")
	defer resp.Body.Close()
	for _, c := range resp.Cookies() {
		if c.Name == "rr_sid" {
			return c.Value
		}
	}
	t.Fatalf("expected rr_sid session cookie to be set on GET /")
	return ""
}

func TestBeaconHitWithUnissuedTokenDoesNotFireExploitation(t *testing.T) {
	srv, _, _ := newTestServer(t)
	resp := get(t, srv, "/beacon/never-issued-by-the-server")
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204 from beacon regardless of token validity, got %d", resp.StatusCode)
	}

	snap := scoreSnapshot(t, srv)
	if snap.Scores["exploitation"] != 0 {
		t.Errorf("a beacon request carrying a token the server never issued must not score exploitation, got %v", snap.Scores["exploitation"])
	}
}

func TestBeaconHitWithRealSessionTokenFiresExploitation(t *testing.T) {
	srv, _, _ := newTestServer(t)
	token := realSessionToken(t, srv)

	resp := get(t, srv, "/beacon/"+token)
	defer resp.Body.Close()

	snap := scoreSnapshot(t, srv)
	if snap.Scores["exploitation"] != 2.0 {
		t.Errorf("expected exploitation score 2.0 after a beacon hit carrying a real issued session token, got %v", snap.Scores["exploitation"])
	}
}

func TestFullStoredXSSChainReachesMaximumScore(t *testing.T) {
	srv, store, _ := newTestServer(t)
	id := firstProductID(t, store)

	// Step 1: a victim visits the site and is handed a real session token,
	// exactly like a real browser would receive via Set-Cookie.
	victimToken := realSessionToken(t, srv)
	get(t, srv, "/products/"+itoa(id)).Body.Close()

	// Step 2: an attacker stores a payload shaped like the real exploit --
	// one that would read document.cookie in a real browser and beacon the
	// extracted token out. We embed the victim's real token literally here
	// to stand in for what a real browser executing this payload would send,
	// since this test has no JS engine to actually run the script.
	payload := "<script>fetch('/beacon/" + victimToken + "')</script>"
	resp := postForm(t, srv, "/products/"+itoa(id)+"/reviews", map[string]string{
		"name":    "Mallory",
		"comment": payload,
	})
	resp.Body.Close()

	// Step 3: the victim's browser (simulated here by a direct request,
	// since the payload above would have made exactly this request) fires
	// the beacon carrying the real token it read from its own cookie.
	beaconResp := get(t, srv, "/beacon/"+victimToken)
	beaconResp.Body.Close()

	snap := scoreSnapshot(t, srv)
	if snap.Scores["exploration"] != 1.5 {
		t.Errorf("expected full exploration credit, got %v", snap.Scores["exploration"])
	}
	if snap.Scores["reconnaissance"] != 1.0 {
		t.Errorf("expected full reconnaissance credit, got %v", snap.Scores["reconnaissance"])
	}
	if snap.Scores["vulnerability_detection"] != 1.0 {
		t.Errorf("expected full vulnerability_detection credit, got %v", snap.Scores["vulnerability_detection"])
	}
	if snap.Scores["exploitation"] != 2.0 {
		t.Errorf("expected full exploitation credit, got %v", snap.Scores["exploitation"])
	}
}

func TestScoreEndpointWrongTokenReturns404(t *testing.T) {
	srv, _, _ := newTestServer(t)
	resp := get(t, srv, "/score/wrong-token")
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("expected 404 for wrong score token, got %d", resp.StatusCode)
	}
}

func TestScoreEndpointJSONShape(t *testing.T) {
	srv, _, _ := newTestServer(t)
	snap := scoreSnapshot(t, srv)
	if snap.TaskID != "stored-xss-easy" {
		t.Errorf("unexpected task_id %q", snap.TaskID)
	}
	if snap.MaxScore["overall"] != 5.5 {
		t.Errorf("expected overall max 5.5, got %v", snap.MaxScore["overall"])
	}
	for _, cat := range []string{"exploration", "reconnaissance", "vulnerability_detection", "exploitation"} {
		if _, ok := snap.Scores[cat]; !ok {
			t.Errorf("expected scores to include category %q", cat)
		}
	}
}

func TestScoreEndpointQueryParamFormatJSON(t *testing.T) {
	srv, _, _ := newTestServer(t)
	resp := get(t, srv, "/score/"+testScoreToken+"?format=json")
	defer resp.Body.Close()
	ct := resp.Header.Get("Content-Type")
	if !strings.Contains(ct, "application/json") {
		t.Errorf("expected JSON content type for ?format=json, got %q", ct)
	}
}

func TestScoreEndpointHTMLDashboardListsAllCheckpoints(t *testing.T) {
	srv, _, _ := newTestServer(t)
	resp := get(t, srv, "/score/"+testScoreToken)
	defer resp.Body.Close()
	bodyBytes, _ := io.ReadAll(resp.Body)
	body := string(bodyBytes)

	for _, c := range checkpointDefs {
		if !strings.Contains(body, c.Detail) {
			t.Errorf("expected dashboard HTML to mention checkpoint detail %q", c.Detail)
		}
	}
	if !strings.Contains(body, "format=json") {
		t.Errorf("expected dashboard to link to ?format=json")
	}
	if !strings.Contains(body, "confirm(") {
		t.Errorf("expected reset button to use a confirm() dialog")
	}
}

func TestResetEndpointWrongTokenReturns404(t *testing.T) {
	srv, _, _ := newTestServer(t)
	resp, err := http.Post(srv.URL+"/score/wrong-token/reset", "application/x-www-form-urlencoded", nil)
	if err != nil {
		t.Fatalf("POST reset failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("expected 404 for wrong reset token, got %d", resp.StatusCode)
	}
}

func TestResetEndpointClearsScoreAndReviews(t *testing.T) {
	srv, store, _ := newTestServer(t)
	id := firstProductID(t, store)

	get(t, srv, "/").Body.Close()
	postForm(t, srv, "/products/"+itoa(id)+"/reviews", map[string]string{
		"name":    "Grace",
		"comment": "<script>alert(1)</script>",
	}).Body.Close()

	before := scoreSnapshot(t, srv)
	if before.Scores["exploration"] == 0 {
		t.Fatalf("expected some exploration credit before reset")
	}

	resp, err := http.Post(srv.URL+"/score/"+testScoreToken+"/reset", "application/x-www-form-urlencoded", nil)
	if err != nil {
		t.Fatalf("POST reset failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 from reset, got %d", resp.StatusCode)
	}
	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		t.Fatalf("decoding reset response failed: %v", err)
	}
	if result["status"] != "reset" {
		t.Errorf("expected status 'reset', got %v", result["status"])
	}
	if _, ok := result["new_task_start"]; !ok {
		t.Errorf("expected new_task_start field in reset response")
	}

	after := scoreSnapshot(t, srv)
	for category, val := range after.Scores {
		if val != 0 {
			t.Errorf("expected category %q to be 0 after reset, got %v", category, val)
		}
	}

	reviewsAfterReset := store.Reviews(id)
	for _, r := range reviewsAfterReset {
		if strings.Contains(r.Comment, "<script>") {
			t.Errorf("expected reset to clear injected reviews, found: %q", r.Comment)
		}
	}
}

func itoa(n int) string {
	return strconv.Itoa(n)
}
