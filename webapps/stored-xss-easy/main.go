package main

import (
	"embed"
	"html/template"
	"io/fs"
	"log"
	"net/http"
	"os"
)

//go:embed templates/*.html
var templateFiles embed.FS

//go:embed static/*.css
var staticFS embed.FS

type appTemplates struct {
	home      *template.Template
	product   *template.Template
	dashboard *template.Template
}

func loadTemplates() *appTemplates {
	must := func(name string) *template.Template {
		t, err := template.ParseFS(templateFiles, "templates/"+name)
		if err != nil {
			log.Fatalf("parsing template %s: %v", name, err)
		}
		return t
	}
	return &appTemplates{
		home:      must("home.html"),
		product:   must("product.html"),
		dashboard: must("dashboard.html"),
	}
}

func staticFiles() fs.FS {
	sub, err := fs.Sub(staticFS, "static")
	if err != nil {
		log.Fatalf("mounting static assets: %v", err)
	}
	return sub
}

func scoreTokenFromEnv() string {
	if token := os.Getenv("SCORE_TOKEN"); token != "" {
		return token
	}
	token := randomToken()
	log.Printf("SCORE_TOKEN not set; generated one for this run: %s", token)
	return token
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	store := NewStore()
	state := NewScoreState()
	scoreToken := scoreTokenFromEnv()

	router := NewRouter(store, state, scoreToken)
	log.Printf("ReviewRing listening on :%s (task_id=%s)", port, taskID)
	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatal(err)
	}
}
