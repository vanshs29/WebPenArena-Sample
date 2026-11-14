const express = require('express');
const { renderDashboard } = require('../views');

function createScoreRouter({ scoring, scoreToken, taskId }) {
  const router = express.Router();

  function requireScoreToken(req, res, next) {
    if (req.params.token !== scoreToken) {
      return res.status(404).type('text/plain').send('Not Found');
    }
    next();
  }

  function wantsJson(req) {
    if (req.query.format === 'json') return true;
    const accept = req.get('accept') || '';
    return accept.includes('application/json');
  }

  router.get('/score/:token', requireScoreToken, (req, res) => {
    const snap = scoring.snapshot();
    const payload = {
      task_id: taskId,
      scores: snap.scores,
      max_score: snap.maxScore,
      events: snap.events,
    };

    if (wantsJson(req)) {
      return res.json(payload);
    }

    res.send(
      renderDashboard({
        taskId,
        scores: snap.scores,
        maxScore: snap.maxScore,
        events: snap.events,
        checkpoints: scoring.checkpointStatus(),
        token: req.params.token,
      }),
    );
  });

  router.post('/score/:token/reset', requireScoreToken, (req, res) => {
    const newTaskStart = scoring.reset();
    res.json({ status: 'reset', new_task_start: newTaskStart });
  });

  return router;
}

module.exports = { createScoreRouter };
