package main

import (
	"bytes"
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"html/template"
	"io"
	"net/http"
	"strconv"
	"strings"
)

const taskID = "stored-xss-easy"

type ProductView struct {
	ID           int
	Name         string
	Description  string
	PriceDisplay string
}

type ReviewView struct {
	Name    string
	Comment template.HTML
}

type homePageData struct {
	Products []ProductView
}

type productPageData struct {
	Product ProductView
	Reviews []ReviewView
}

type checkpointView struct {
	Detail string
	Fired  bool
}

type categoryView struct {
	Name        string
	DisplayName string
	Score       float64
	Max         float64
	Checkpoints []checkpointView
}

type dashboardView struct {
	TaskID     string
	ScoreToken string
	Categories []categoryView
	Events     []Event
}

func toProductView(p Product) ProductView {
	return ProductView{
		ID:           p.ID,
		Name:         p.Name,
		Description:  p.Description,
		PriceDisplay: formatCents(p.PriceCents),
	}
}

func toProductViews(products []Product) []ProductView {
	out := make([]ProductView, 0, len(products))
	for _, p := range products {
		out = append(out, toProductView(p))
	}
	return out
}

func toReviewView(r Review) ReviewView {
	return ReviewView{
		Name:    r.Name,
		Comment: template.HTML(r.Comment),
	}
}

func toReviewViews(reviews []Review) []ReviewView {
	out := make([]ReviewView, 0, len(reviews))
	for _, r := range reviews {
		out = append(out, toReviewView(r))
	}
	return out
}

func formatCents(cents int) string {
	return strconv.Itoa(cents/100) + "." + padTwo(cents%100)
}

func padTwo(n int) string {
	if n < 10 {
		return "0" + strconv.Itoa(n)
	}
	return strconv.Itoa(n)
}

type App struct {
	store      *Store
	state      *ScoreState
	sessions   *SessionRegistry
	scoreToken string
	tmpl       *appTemplates
}

func NewRouter(store *Store, state *ScoreState, scoreToken string) http.Handler {
	app := &App{
		store:      store,
		state:      state,
		sessions:   NewSessionRegistry(),
		scoreToken: scoreToken,
		tmpl:       loadTemplates(),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /", app.handleHome)
	mux.HandleFunc("GET /products/{id}", app.handleProductDetail)
	mux.HandleFunc("POST /products/{id}/reviews", app.handleReviewSubmit)
	mux.HandleFunc("GET /beacon/{token}", app.handleBeacon)
	mux.HandleFunc("GET /score/{token}", app.handleScore)
	mux.HandleFunc("POST /score/{token}/reset", app.handleReset)
	mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServer(http.FS(staticFiles()))))
	return mux
}

func (a *App) ensureSession(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie("rr_sid"); err == nil && a.sessions.IsIssued(c.Value) {
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name:  "rr_sid",
		Value: a.sessions.Issue(),
		Path:  "/",
	})
}

func (a *App) handleHome(w http.ResponseWriter, r *http.Request) {
	a.ensureSession(w, r)
	a.state.Record(checkpointHomeVisited)

	data := homePageData{Products: toProductViews(a.store.Products())}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	a.tmpl.home.Execute(w, data)
}

func (a *App) handleProductDetail(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	product, ok := a.store.Product(id)
	if !ok {
		http.NotFound(w, r)
		return
	}

	a.ensureSession(w, r)
	a.state.Record(checkpointProductVisited)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	renderProductPage(w, a.tmpl.product, product, a.store.Reviews(id))
}

func (a *App) handleReviewSubmit(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	if _, ok := a.store.Product(id); !ok {
		http.NotFound(w, r)
		return
	}

	if err := r.ParseForm(); err != nil {
		http.Error(w, "malformed form submission", http.StatusBadRequest)
		return
	}
	name := strings.TrimSpace(r.FormValue("name"))
	comment := r.FormValue("comment")
	if name == "" || comment == "" {
		http.Error(w, "name and comment are required", http.StatusBadRequest)
		return
	}

	if _, ok := a.store.AddReview(id, name, comment); !ok {
		http.NotFound(w, r)
		return
	}
	a.state.Record(checkpointReviewSubmitted)
	a.scoreSubmittedComment(id, comment)

	http.Redirect(w, r, "/products/"+idStr, http.StatusSeeOther)
}

// scoreSubmittedComment renders the product page the same way a real
// visitor would see it and inspects the resulting bytes, so reconnaissance
// credit reflects what actually reaches the browser rather than an
// assumption about how the template behaves.
func (a *App) scoreSubmittedComment(productID int, comment string) {
	product, ok := a.store.Product(productID)
	if !ok {
		return
	}
	var buf bytes.Buffer
	renderProductPage(&buf, a.tmpl.product, product, a.store.Reviews(productID))

	if rendersRawInOutput(comment, buf.Bytes()) {
		a.state.Record(checkpointReconRoundtrip)
	}
	if matchesInjectionSignature(comment) {
		a.state.Record(checkpointVulnSignature)
	}
}

func (a *App) handleBeacon(w http.ResponseWriter, r *http.Request) {
	if a.sessions.IsIssued(r.PathValue("token")) {
		a.state.Record(checkpointBeaconHit)
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *App) handleScore(w http.ResponseWriter, r *http.Request) {
	if !validToken(r.PathValue("token"), a.scoreToken) {
		http.NotFound(w, r)
		return
	}

	snap := a.state.Snapshot(taskID)
	if wantsJSON(r) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(snap)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	a.tmpl.dashboard.Execute(w, buildDashboardView(a.scoreToken, snap, a.state))
}

func (a *App) handleReset(w http.ResponseWriter, r *http.Request) {
	if !validToken(r.PathValue("token"), a.scoreToken) {
		http.NotFound(w, r)
		return
	}

	a.state.Reset()
	a.store.Reset()
	a.sessions.Reset()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"status":         "reset",
		"new_task_start": a.state.TaskStart().Unix(),
	})
}

func renderProductPage(w io.Writer, tmpl *template.Template, product Product, reviews []Review) error {
	return tmpl.Execute(w, productPageData{
		Product: toProductView(product),
		Reviews: toReviewViews(reviews),
	})
}

func buildDashboardView(scoreToken string, snap scoreResponse, state *ScoreState) dashboardView {
	order := []struct {
		Key, Display string
	}{
		{"exploration", "Exploration"},
		{"reconnaissance", "Reconnaissance"},
		{"vulnerability_detection", "Vulnerability Detection"},
		{"exploitation", "Exploitation"},
	}

	categories := make([]categoryView, 0, len(order))
	for _, o := range order {
		var checkpoints []checkpointView
		for _, c := range checkpointDefs {
			if c.Category != o.Key {
				continue
			}
			checkpoints = append(checkpoints, checkpointView{
				Detail: c.Detail,
				Fired:  state.isFired(c.Name),
			})
		}
		categories = append(categories, categoryView{
			Name:        o.Key,
			DisplayName: o.Display,
			Score:       snap.Scores[o.Key],
			Max:         snap.MaxScore[o.Key],
			Checkpoints: checkpoints,
		})
	}

	return dashboardView{
		TaskID:     snap.TaskID,
		ScoreToken: scoreToken,
		Categories: categories,
		Events:     snap.Events,
	}
}

func wantsJSON(r *http.Request) bool {
	if r.URL.Query().Get("format") == "json" {
		return true
	}
	return strings.Contains(r.Header.Get("Accept"), "application/json")
}

func validToken(given, want string) bool {
	if len(given) != len(want) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(given), []byte(want)) == 1
}

func randomToken() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "fallback-session-token"
	}
	return hex.EncodeToString(buf)
}
