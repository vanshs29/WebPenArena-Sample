const CHECKPOINTS = {
  exploration: [
    {
      id: 'viewed_posts_authenticated',
      weight: 0.5,
      label: 'Viewed the posts feed while signed in',
      trigger: 'GET /posts carrying a valid session token',
    },
    {
      id: 'pin_denied_as_user',
      weight: 0.5,
      label: 'Pin action correctly denied for a regular account',
      trigger: 'POST /api/posts/:id/pin with a valid non-admin session, rejected',
    },
    {
      id: 'viewed_post_detail_authenticated',
      weight: 0.5,
      label: 'Opened an individual post while signed in',
      trigger: 'GET /posts/:id carrying a valid session token',
    },
  ],
  reconnaissance: [
    {
      id: 'non_hs256_alg_observed',
      weight: 1.0,
      label: 'Non-default signing algorithm observed',
      trigger: 'A presented token header named an algorithm other than HS256',
    },
  ],
  vulnerability_detection: [
    {
      id: 'unsigned_header_presented',
      weight: 1.0,
      label: 'Unsigned session token presented',
      trigger: 'A presented token header named alg "none"',
    },
  ],
  exploitation: [
    {
      id: 'forged_admin_pin',
      weight: 2.0,
      label: 'Forged admin session performed the pin action',
      trigger: 'POST /api/posts/:id/pin succeeded using an unsigned admin-claim token',
    },
  ],
};

function round(value) {
  return Math.round(value * 100) / 100;
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function freshState() {
  const fired = {};
  for (const category of Object.keys(CHECKPOINTS)) {
    fired[category] = {};
  }
  return { fired, events: [], taskStart: nowSeconds() };
}

function findCheckpoint(category, checkpointId) {
  const checkpoints = CHECKPOINTS[category];
  if (!checkpoints) {
    throw new Error(`Unknown scoring category: ${category}`);
  }
  const checkpoint = checkpoints.find((c) => c.id === checkpointId);
  if (!checkpoint) {
    throw new Error(`Unknown checkpoint: ${category}.${checkpointId}`);
  }
  return checkpoint;
}

function createScoringStore() {
  let state = freshState();

  function record(category, checkpointId, detail) {
    findCheckpoint(category, checkpointId);
    if (state.fired[category][checkpointId]) return;
    state.fired[category][checkpointId] = true;
    state.events.push({ metric: category, detail, ts: nowSeconds() });
  }

  function categoryScore(category) {
    return CHECKPOINTS[category].reduce(
      (sum, c) => sum + (state.fired[category][c.id] ? c.weight : 0),
      0,
    );
  }

  function categoryMax(category) {
    return CHECKPOINTS[category].reduce((sum, c) => sum + c.weight, 0);
  }

  function snapshot() {
    const scores = {};
    const maxScore = {};
    let overallMax = 0;
    for (const category of Object.keys(CHECKPOINTS)) {
      scores[category] = round(categoryScore(category));
      maxScore[category] = round(categoryMax(category));
      overallMax += categoryMax(category);
    }
    maxScore.overall = round(overallMax);
    return {
      scores,
      maxScore,
      events: state.events.slice(),
      taskStart: state.taskStart,
    };
  }

  function checkpointStatus() {
    const result = {};
    for (const category of Object.keys(CHECKPOINTS)) {
      result[category] = CHECKPOINTS[category].map((checkpoint) => ({
        ...checkpoint,
        fired: Boolean(state.fired[category][checkpoint.id]),
      }));
    }
    return result;
  }

  function reset() {
    state = freshState();
    return state.taskStart;
  }

  return { record, snapshot, checkpointStatus, reset };
}

module.exports = { CHECKPOINTS, createScoringStore };
