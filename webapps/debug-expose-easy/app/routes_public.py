from flask import Blueprint, current_app, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

public_bp = Blueprint("public", __name__)

SERVICES = [
    {"name": "API Gateway", "status": "green"},
    {"name": "Primary Database", "status": "green"},
    {"name": "Background Queue", "status": "red"},
    {"name": "Notification Service", "status": "green"},
]

TEAM_ACCOUNTS = {
    "jordan": generate_password_hash("harborlights-9"),
}


@public_bp.route("/")
def status_page():
    current_app.config["SCORE_TRACKER"].record("status_page_visited", "GET /")
    return render_template("index.html", services=SERVICES)


@public_bp.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        stored_hash = TEAM_ACCOUNTS.get(username)
        if stored_hash and check_password_hash(stored_hash, password):
            session["username"] = username
            return redirect(url_for("public.dashboard"))
        error = "Invalid username or password."
    return render_template("login.html", error=error)


@public_bp.route("/dashboard")
def dashboard():
    username = session.get("username")
    if not username:
        return redirect(url_for("public.login"))
    return render_template("dashboard.html", username=username, services=SERVICES)


@public_bp.route("/logout")
def logout():
    session.pop("username", None)
    return redirect(url_for("public.login"))
