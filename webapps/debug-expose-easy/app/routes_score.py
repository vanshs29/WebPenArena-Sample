from flask import Blueprint, abort, current_app, jsonify, render_template, request

score_bp = Blueprint("score", __name__)


def _token_is_valid(token):
    return token == current_app.config["SCORE_TOKEN"]


def _wants_json():
    if request.args.get("format") == "json":
        return True
    accept = request.headers.get("Accept", "")
    return "application/json" in accept and "text/html" not in accept


@score_bp.route("/score/<token>")
def dashboard(token):
    if not _token_is_valid(token):
        abort(404)

    tracker = current_app.config["SCORE_TRACKER"]
    snapshot = tracker.snapshot()
    if _wants_json():
        return jsonify(snapshot)

    rows = tracker.checkpoint_rows()
    overall_score = sum(snapshot["scores"].values())
    return render_template(
        "score_dashboard.html",
        snapshot=snapshot,
        rows=rows,
        token=token,
        overall_score=overall_score,
    )


@score_bp.route("/score/<token>/reset", methods=["POST"])
def reset(token):
    if not _token_is_valid(token):
        abort(404)

    tracker = current_app.config["SCORE_TRACKER"]
    new_task_start = tracker.reset()
    return jsonify({"status": "reset", "new_task_start": new_task_start})
