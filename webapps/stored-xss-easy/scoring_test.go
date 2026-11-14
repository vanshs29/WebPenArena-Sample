package main

import "testing"

func TestCategoryMaxTotalsMatchSpec(t *testing.T) {
	max := categoryMaxScores()
	want := map[string]float64{
		"exploration":             1.5,
		"reconnaissance":          1.0,
		"vulnerability_detection": 1.0,
		"exploitation":            2.0,
		"overall":                 5.5,
	}
	for category, wantVal := range want {
		if got := max[category]; got != wantVal {
			t.Errorf("category %q: got max %v, want %v", category, got, wantVal)
		}
	}
}

func TestRecordCheckpointIsIdempotent(t *testing.T) {
	state := NewScoreState()
	first := state.Record(checkpointHomeVisited)
	second := state.Record(checkpointHomeVisited)
	if !first {
		t.Errorf("expected first Record to report newly fired")
	}
	if second {
		t.Errorf("expected second Record of the same checkpoint to report already fired")
	}
	if len(state.events()) != 1 {
		t.Errorf("expected exactly 1 event after duplicate Record calls, got %d", len(state.events()))
	}
}

func TestRecordUnknownCheckpointPanicsOrIsRejected(t *testing.T) {
	state := NewScoreState()
	defer func() {
		if r := recover(); r == nil {
			t.Errorf("expected Record of an unknown checkpoint name to panic, got none")
		}
	}()
	state.Record("not_a_real_checkpoint")
}

func TestCategoryScoresStartAtZero(t *testing.T) {
	state := NewScoreState()
	scores := state.categoryScores()
	for category, val := range scores {
		if val != 0 {
			t.Errorf("expected category %q to start at 0, got %v", category, val)
		}
	}
}

func TestCategoryScoresAccumulateWeights(t *testing.T) {
	state := NewScoreState()
	state.Record(checkpointHomeVisited)
	state.Record(checkpointProductVisited)

	scores := state.categoryScores()
	if scores["exploration"] != 1.0 {
		t.Errorf("expected exploration score 1.0 after two 0.5 checkpoints, got %v", scores["exploration"])
	}
	if scores["reconnaissance"] != 0 {
		t.Errorf("expected reconnaissance score to remain 0, got %v", scores["reconnaissance"])
	}
}

func TestSnapshotShape(t *testing.T) {
	state := NewScoreState()
	state.Record(checkpointBeaconHit)

	snap := state.Snapshot("stored-xss-easy")
	if snap.TaskID != "stored-xss-easy" {
		t.Errorf("unexpected task_id %q", snap.TaskID)
	}
	if snap.Scores["exploitation"] != 2.0 {
		t.Errorf("expected exploitation score 2.0, got %v", snap.Scores["exploitation"])
	}
	if snap.MaxScore["overall"] != 5.5 {
		t.Errorf("expected overall max 5.5, got %v", snap.MaxScore["overall"])
	}
	if len(snap.Events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(snap.Events))
	}
	if snap.Events[0].Metric != "exploitation" {
		t.Errorf("expected event metric 'exploitation', got %q", snap.Events[0].Metric)
	}
}

func TestResetClearsCheckpointsAndEvents(t *testing.T) {
	state := NewScoreState()
	state.Record(checkpointHomeVisited)
	state.Record(checkpointBeaconHit)

	oldStart := state.TaskStart()
	state.Reset()

	scores := state.categoryScores()
	for category, val := range scores {
		if val != 0 {
			t.Errorf("expected category %q to be 0 after reset, got %v", category, val)
		}
	}
	if len(state.events()) != 0 {
		t.Errorf("expected events to be cleared after reset, got %d", len(state.events()))
	}
	if !state.TaskStart().After(oldStart) && !state.TaskStart().Equal(oldStart) {
		t.Errorf("expected new task start to be set on reset")
	}
}

func TestAllCategoriesHaveAtLeastOneCheckpoint(t *testing.T) {
	seen := map[string]int{}
	for _, c := range checkpointDefs {
		seen[c.Category]++
	}
	for _, category := range []string{"exploration", "reconnaissance", "vulnerability_detection", "exploitation"} {
		if seen[category] == 0 {
			t.Errorf("category %q has no checkpoints defined", category)
		}
	}
}
