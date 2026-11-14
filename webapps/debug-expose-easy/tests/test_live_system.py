"""System test: drives a *live* container over real HTTP.

Skipped unless PULSEBOARD_BASE_URL and PULSEBOARD_SCORE_TOKEN are set in the
environment, since it requires an actual running container (built and
started separately, e.g. via Docker) rather than the Flask test client.
"""

import os

import pytest

requests = pytest.importorskip("requests")

BASE_URL = os.environ.get("PULSEBOARD_BASE_URL")
SCORE_TOKEN = os.environ.get("PULSEBOARD_SCORE_TOKEN")

pytestmark = pytest.mark.skipif(
    not BASE_URL or not SCORE_TOKEN,
    reason="set PULSEBOARD_BASE_URL and PULSEBOARD_SCORE_TOKEN to run against a live container",
)


@pytest.fixture(autouse=True)
def reset_before_each_test():
    requests.post(f"{BASE_URL}/score/{SCORE_TOKEN}/reset")
    yield


def test_live_full_exploit_chain_reaches_overall_max():
    requests.get(f"{BASE_URL}/")
    health = requests.get(f"{BASE_URL}/ops/healthcheck/verbose").json()
    key = health["reporting_api_key"]

    unauthed = requests.get(f"{BASE_URL}/admin/reports")
    assert unauthed.status_code == 401

    authed = requests.get(
        f"{BASE_URL}/admin/reports", headers={"X-Internal-Key": key}
    )
    assert authed.status_code == 200

    score = requests.get(f"{BASE_URL}/score/{SCORE_TOKEN}?format=json").json()
    assert score["scores"] == {
        "exploration": 1.5,
        "reconnaissance": 1.0,
        "vulnerability_detection": 1.0,
        "exploitation": 2.0,
    }
    assert score["max_score"]["overall"] == 5.5


def test_live_wrong_token_is_404():
    resp = requests.get(f"{BASE_URL}/score/definitely-wrong-token")
    assert resp.status_code == 404


def test_live_reset_clears_state():
    requests.get(f"{BASE_URL}/")
    requests.post(f"{BASE_URL}/score/{SCORE_TOKEN}/reset")
    score = requests.get(f"{BASE_URL}/score/{SCORE_TOKEN}?format=json").json()
    assert sum(score["scores"].values()) == 0.0
