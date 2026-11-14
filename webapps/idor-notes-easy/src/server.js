const { createDb } = require("./db");
const { createScoringState } = require("./scoring");
const { createApp } = require("./app");
const { seedDemoData } = require("./seed");

const PORT = 3000;
const TASK_ID = "idor-notes-easy";

async function main() {
  const scoreToken = process.env.SCORE_TOKEN;
  if (!scoreToken) {
    console.error("SCORE_TOKEN environment variable is required");
    process.exit(1);
  }

  const db = await createDb();
  seedDemoData(db);
  const scoring = createScoringState();
  const app = createApp({ db, scoring, scoreToken, taskId: TASK_ID });

  app.listen(PORT, () => {
    console.log(`LocketBox listening on port ${PORT}`);
  });
}

main();
