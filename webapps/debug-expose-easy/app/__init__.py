import os
import secrets

from flask import Flask

from .routes_ops import ops_bp
from .routes_public import public_bp
from .routes_score import score_bp
from .scoring import ScoreTracker


def _default_internal_report():
    return {
        "report_title": "Q4 Infrastructure Review",
        "classification": "internal-confidential",
        "summary": (
            "Queue backlog cleared after the Tuesday redeploy; two regions "
            "are still running on certificates due for renewal."
        ),
        "action_items": [
            "Rotate TLS certificates in the secondary region",
            "Increase worker pool size for the background queue",
        ],
    }


def create_app():
    app = Flask(__name__)
    app.secret_key = os.environ.get("APP_SECRET_KEY") or secrets.token_hex(16)

    app.config["SCORE_TOKEN"] = os.environ.get("SCORE_TOKEN") or secrets.token_urlsafe(12)
    app.config["REPORTING_API_KEY"] = os.environ.get("REPORTING_API_KEY") or secrets.token_urlsafe(24)
    app.config["BUILD_VERSION"] = os.environ.get("BUILD_VERSION", "2026.11.3")
    app.config["ENVIRONMENT_NAME"] = os.environ.get("ENVIRONMENT_NAME", "production")
    app.config["INTERNAL_REPORT_PAYLOAD"] = _default_internal_report()
    app.config["SCORE_TRACKER"] = ScoreTracker()

    app.register_blueprint(public_bp)
    app.register_blueprint(ops_bp)
    app.register_blueprint(score_bp)

    print(f"[pulseboard] score token: {app.config['SCORE_TOKEN']}", flush=True)
    return app
