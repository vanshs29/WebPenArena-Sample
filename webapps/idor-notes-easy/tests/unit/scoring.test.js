const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createScoringState, CATEGORY_MAX, OVERALL_MAX } = require("../../src/scoring");

test("category maxes and overall max match the design spec", () => {
  assert.deepEqual(CATEGORY_MAX, {
    exploration: 1.5,
    reconnaissance: 1.0,
    vulnerability_detection: 1.0,
    exploitation: 2.0,
  });
  assert.equal(OVERALL_MAX, 5.5);
});

test("a fresh scoring state starts at zero in every category", () => {
  const state = createScoringState();
  const snapshot = state.toJson("idor-notes-easy");
  assert.deepEqual(snapshot.scores, {
    exploration: 0,
    reconnaissance: 0,
    vulnerability_detection: 0,
    exploitation: 0,
  });
  assert.deepEqual(snapshot.events, []);
});

test("firing a checkpoint adds its weight to the right category exactly once", () => {
  const state = createScoringState();
  state.fire("exploration", "visited_notes_page", 0.5, "GET /notes");
  state.fire("exploration", "visited_notes_page", 0.5, "GET /notes again");
  const snapshot = state.toJson("idor-notes-easy");
  assert.equal(snapshot.scores.exploration, 0.5);
  assert.equal(snapshot.events.length, 1);
  assert.equal(snapshot.events[0].metric, "exploration");
  assert.equal(snapshot.events[0].detail, "GET /notes");
  assert.ok(Number.isInteger(snapshot.events[0].ts));
});

test("different checkpoints in the same category both contribute their weight", () => {
  const state = createScoringState();
  state.fire("exploration", "visited_notes_page", 0.5, "a");
  state.fire("exploration", "viewed_own_note", 0.5, "b");
  state.fire("exploration", "requested_out_of_range", 0.5, "c");
  assert.equal(state.toJson("x").scores.exploration, 1.5);
});

test("reset zeroes every category and clears the event log", () => {
  const state = createScoringState();
  state.fire("exploitation", "mutated_other_note", 2.0, "PUT /api/notes/2");
  assert.equal(state.toJson("x").scores.exploitation, 2.0);
  const resetInfo = state.reset();
  const snapshot = state.toJson("x");
  assert.deepEqual(snapshot.scores, {
    exploration: 0,
    reconnaissance: 0,
    vulnerability_detection: 0,
    exploitation: 0,
  });
  assert.deepEqual(snapshot.events, []);
  assert.equal(resetInfo.status, "reset");
  assert.ok(Number.isInteger(resetInfo.new_task_start));
});

test("a checkpoint can fire again after a reset", () => {
  const state = createScoringState();
  state.fire("reconnaissance", "unauthorized_read", 1.0, "first");
  state.reset();
  state.fire("reconnaissance", "unauthorized_read", 1.0, "second");
  assert.equal(state.toJson("x").scores.reconnaissance, 1.0);
  assert.equal(state.toJson("x").events.length, 1);
});

test("isFired reflects whether a specific checkpoint has fired", () => {
  const state = createScoringState();
  assert.equal(state.isFired("exploitation", "mutated_other_note"), false);
  state.fire("exploitation", "mutated_other_note", 2.0, "PUT /api/notes/2");
  assert.equal(state.isFired("exploitation", "mutated_other_note"), true);
  assert.equal(state.isFired("exploitation", "some_other_key"), false);
});

test("toJson reports the full max_score shape including overall", () => {
  const state = createScoringState();
  const snapshot = state.toJson("idor-notes-easy");
  assert.equal(snapshot.task_id, "idor-notes-easy");
  assert.deepEqual(snapshot.max_score, {
    exploration: 1.5,
    reconnaissance: 1.0,
    vulnerability_detection: 1.0,
    exploitation: 2.0,
    overall: 5.5,
  });
});
