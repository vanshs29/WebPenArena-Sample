const http = require('http');
const { createApp } = require('../../src/app');
const { createDb, seed } = require('../../src/db');
const { createScoringStore } = require('../../src/scoring');

const SECRET = 'functional-test-secret';
const SCORE_TOKEN = 'test-score-token';
const TASK_ID = 'jwt-none-easy';

function startTestServer() {
  const db = createDb(':memory:');
  seed(db);
  const scoring = createScoringStore();
  const app = createApp({
    db,
    secret: SECRET,
    scoreToken: SCORE_TOKEN,
    taskId: TASK_ID,
    scoring,
  });

  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        db,
        scoring,
        secret: SECRET,
        scoreToken: SCORE_TOKEN,
        taskId: TASK_ID,
        close: () => new Promise((res) => server.close(res)),
      });
    });
  });
}

module.exports = { startTestServer, SECRET, SCORE_TOKEN, TASK_ID };
