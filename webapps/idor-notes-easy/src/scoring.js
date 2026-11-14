const CATEGORY_MAX = {
  exploration: 1.5,
  reconnaissance: 1.0,
  vulnerability_detection: 1.0,
  exploitation: 2.0,
};

const OVERALL_MAX = Object.values(CATEGORY_MAX).reduce((a, b) => a + b, 0);

function createScoringState() {
  let scores = { exploration: 0, reconnaissance: 0, vulnerability_detection: 0, exploitation: 0 };
  let events = [];
  let fired = new Set();
  let taskStart = Math.floor(Date.now() / 1000);

  function fire(category, checkpointKey, weight, detail) {
    const id = `${category}:${checkpointKey}`;
    if (fired.has(id)) return false;
    fired.add(id);
    scores[category] += weight;
    events.push({ metric: category, detail, ts: Math.floor(Date.now() / 1000) });
    return true;
  }

  function reset() {
    scores = { exploration: 0, reconnaissance: 0, vulnerability_detection: 0, exploitation: 0 };
    events = [];
    fired = new Set();
    taskStart = Math.floor(Date.now() / 1000);
    return { status: "reset", new_task_start: taskStart };
  }

  function toJson(taskId) {
    return {
      task_id: taskId,
      scores: { ...scores },
      max_score: { ...CATEGORY_MAX, overall: OVERALL_MAX },
      events: [...events],
    };
  }

  function isFired(category, checkpointKey) {
    return fired.has(`${category}:${checkpointKey}`);
  }

  return { fire, reset, toJson, isFired };
}

module.exports = { createScoringState, CATEGORY_MAX, OVERALL_MAX };
