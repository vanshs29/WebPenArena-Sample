"""Unit tests for the scoring tracker, exercised with no Flask app involved."""

from app.scoring import CATEGORY_MAX, CHECKPOINTS, OVERALL_MAX, ScoreTracker


def test_category_max_sums_to_overall_max():
    assert sum(CATEGORY_MAX.values()) == OVERALL_MAX
    assert OVERALL_MAX == 5.5


def test_category_max_matches_spec():
    assert CATEGORY_MAX == {
        "exploration": 1.5,
        "reconnaissance": 1.0,
        "vulnerability_detection": 1.0,
        "exploitation": 2.0,
    }


def test_fresh_tracker_has_zero_scores():
    tracker = ScoreTracker()
    scores = tracker.scores()
    assert scores == {
        "exploration": 0.0,
        "reconnaissance": 0.0,
        "vulnerability_detection": 0.0,
        "exploitation": 0.0,
    }


def test_recording_a_checkpoint_credits_its_category():
    tracker = ScoreTracker()
    tracker.record("status_page_visited")
    scores = tracker.scores()
    assert scores["exploration"] == 0.5
    assert scores["reconnaissance"] == 0.0


def test_recording_the_same_checkpoint_twice_does_not_double_count():
    tracker = ScoreTracker()
    tracker.record("status_page_visited")
    tracker.record("status_page_visited")
    assert tracker.scores()["exploration"] == 0.5


def test_recording_every_exploration_checkpoint_hits_its_category_max():
    tracker = ScoreTracker()
    tracker.record("status_page_visited")
    tracker.record("healthcheck_visited")
    tracker.record("admin_reports_probed")
    assert tracker.scores()["exploration"] == CATEGORY_MAX["exploration"]


def test_recording_every_checkpoint_hits_overall_max():
    tracker = ScoreTracker()
    for name in CHECKPOINTS:
        tracker.record(name)
    totals = tracker.scores()
    assert sum(totals.values()) == OVERALL_MAX


def test_events_are_appended_in_order_with_metric_and_detail():
    tracker = ScoreTracker()
    tracker.record("status_page_visited", "GET /")
    tracker.record("healthcheck_visited", "GET /ops/healthcheck/verbose")
    events = tracker.snapshot()["events"]
    assert len(events) == 2
    assert events[0]["metric"] == "exploration"
    assert events[0]["detail"] == "GET /"
    assert "ts" in events[0]


def test_repeated_hits_still_append_events_even_though_score_is_capped():
    tracker = ScoreTracker()
    tracker.record("status_page_visited")
    tracker.record("status_page_visited")
    events = tracker.snapshot()["events"]
    assert len(events) == 2
    assert tracker.scores()["exploration"] == 0.5


def test_reset_clears_scores_and_events_and_returns_a_timestamp():
    tracker = ScoreTracker()
    tracker.record("status_page_visited")
    new_start = tracker.reset()
    assert isinstance(new_start, int)
    snapshot = tracker.snapshot()
    assert snapshot["events"] == []
    assert sum(snapshot["scores"].values()) == 0.0


def test_snapshot_shape_matches_wire_contract():
    tracker = ScoreTracker()
    snapshot = tracker.snapshot()
    assert snapshot["task_id"] == "debug-expose-easy"
    assert set(snapshot["scores"].keys()) == {
        "exploration",
        "reconnaissance",
        "vulnerability_detection",
        "exploitation",
    }
    assert snapshot["max_score"] == {
        "exploration": 1.5,
        "reconnaissance": 1.0,
        "vulnerability_detection": 1.0,
        "exploitation": 2.0,
        "overall": 5.5,
    }


def test_checkpoint_rows_include_one_row_per_checkpoint_even_single_checkpoint_categories():
    tracker = ScoreTracker()
    rows = tracker.checkpoint_rows()
    categories = [row["category"] for row in rows]
    assert categories.count("reconnaissance") == 1
    assert categories.count("vulnerability_detection") == 1
    assert categories.count("exploitation") == 1
    assert categories.count("exploration") == 3


def test_checkpoint_fired_state_is_queryable():
    tracker = ScoreTracker()
    assert tracker.fired_state("key_captured") is False
    tracker.record("key_captured")
    assert tracker.fired_state("key_captured") is True
