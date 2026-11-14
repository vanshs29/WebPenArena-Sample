const { createApp } = require('./app');
const { createDb, seed } = require('./db');
const { createScoringStore } = require('./scoring');

const PORT = Number(process.env.PORT) || 5000;
const AUTH_SECRET = process.env.AUTH_SECRET || 'dev-secret-change-me';
const SCORE_TOKEN = process.env.SCORE_TOKEN || 'devtoken';
const TASK_ID = 'jwt-none-easy';

const db = createDb(':memory:');
seed(db);
const scoring = createScoringStore();

const app = createApp({
  db,
  secret: AUTH_SECRET,
  scoreToken: SCORE_TOKEN,
  taskId: TASK_ID,
  scoring,
});

app.listen(PORT, () => {
  console.log(`ScribbleFeed listening on port ${PORT}`);
});
