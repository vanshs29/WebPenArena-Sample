const test = require('node:test');
const assert = require('node:assert/strict');
const { CHECKPOINTS, createScoringStore } = require('../../src/scoring');

test('category and overall maxes match the specified weight table', () => {
  const scoring = createScoringStore();
  const snap = scoring.snapshot();
  assert.equal(snap.maxScore.exploration, 1.5);
  assert.equal(snap.maxScore.reconnaissance, 1.0);
  assert.equal(snap.maxScore.vulnerability_detection, 1.0);
  assert.equal(snap.maxScore.exploitation, 2.0);
  assert.equal(snap.maxScore.overall, 5.5);
});

test('all scores start at zero with no events', () => {
  const scoring = createScoringStore();
  const snap = scoring.snapshot();
  assert.equal(snap.scores.exploration, 0);
  assert.equal(snap.scores.reconnaissance, 0);
  assert.equal(snap.scores.vulnerability_detection, 0);
  assert.equal(snap.scores.exploitation, 0);
  assert.deepEqual(snap.events, []);
});

test('recording a checkpoint adds its weight to the category score and appends one event', () => {
  const scoring = createScoringStore();
  scoring.record('reconnaissance', 'non_hs256_alg_observed', 'alg=none');
  const snap = scoring.snapshot();
  assert.equal(snap.scores.reconnaissance, 1.0);
  assert.equal(snap.events.length, 1);
  assert.equal(snap.events[0].metric, 'reconnaissance');
  assert.equal(snap.events[0].detail, 'alg=none');
  assert.equal(typeof snap.events[0].ts, 'number');
});

test('recording the same checkpoint twice fires only once (idempotent) and logs only one event', () => {
  const scoring = createScoringStore();
  scoring.record('vulnerability_detection', 'unsigned_header_presented', 'first');
  scoring.record('vulnerability_detection', 'unsigned_header_presented', 'second');
  const snap = scoring.snapshot();
  assert.equal(snap.scores.vulnerability_detection, 1.0);
  assert.equal(snap.events.length, 1);
});

test('recording an unknown category or checkpoint throws', () => {
  const scoring = createScoringStore();
  assert.throws(() => scoring.record('not_a_category', 'x', 'detail'));
  assert.throws(() => scoring.record('exploration', 'not_a_checkpoint', 'detail'));
});

test('a full run firing every checkpoint reaches the overall max', () => {
  const scoring = createScoringStore();
  for (const category of Object.keys(CHECKPOINTS)) {
    for (const checkpoint of CHECKPOINTS[category]) {
      scoring.record(category, checkpoint.id, 'test');
    }
  }
  const snap = scoring.snapshot();
  const total = Object.values(snap.scores).reduce((a, b) => a + b, 0);
  assert.equal(total, snap.maxScore.overall);
});

test('checkpointStatus reports fired true/false per checkpoint with label and trigger text', () => {
  const scoring = createScoringStore();
  scoring.record('exploration', 'viewed_posts_authenticated', 'test');
  const status = scoring.checkpointStatus();
  const checkpoint = status.exploration.find((c) => c.id === 'viewed_posts_authenticated');
  assert.equal(checkpoint.fired, true);
  assert.equal(typeof checkpoint.label, 'string');
  assert.equal(typeof checkpoint.trigger, 'string');
  const other = status.exploration.find((c) => c.id === 'pin_denied_as_user');
  assert.equal(other.fired, false);
});

test('reset clears all fired checkpoints and events and returns a fresh epoch-seconds start time', async () => {
  const scoring = createScoringStore();
  scoring.record('exploitation', 'forged_admin_pin', 'test');
  const before = scoring.snapshot();
  assert.equal(before.scores.exploitation, 2.0);

  await new Promise((resolve) => setTimeout(resolve, 10));
  const newStart = scoring.reset();

  const after = scoring.snapshot();
  assert.equal(after.scores.exploitation, 0);
  assert.deepEqual(after.events, []);
  assert.equal(typeof newStart, 'number');
  assert.ok(newStart >= before.taskStart);
});

test('every category has at least one checkpoint, even single-checkpoint categories', () => {
  for (const category of Object.keys(CHECKPOINTS)) {
    assert.ok(CHECKPOINTS[category].length >= 1);
  }
});
