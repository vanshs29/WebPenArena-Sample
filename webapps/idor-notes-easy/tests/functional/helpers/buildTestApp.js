const { createDb } = require("../../../src/db");
const { createScoringState } = require("../../../src/scoring");
const { createApp } = require("../../../src/app");
const { seedDemoData } = require("../../../src/seed");

const SCORE_TOKEN = "test-token-abc123";
const TASK_ID = "idor-notes-easy";

async function buildTestApp() {
  const db = await createDb();
  const scoring = createScoringState();
  const { colleague, colleagueNote, victim, victimNote } = seedDemoData(db);

  const app = createApp({ db, scoring, scoreToken: SCORE_TOKEN, taskId: TASK_ID });

  return { app, db, scoring, scoreToken: SCORE_TOKEN, taskId: TASK_ID, colleague, colleagueNote, victim, victimNote };
}

module.exports = { buildTestApp, SCORE_TOKEN, TASK_ID };
