const { test } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { buildTestApp } = require("./helpers/buildTestApp");

function agentFor(app) {
  return request.agent(app);
}

test("full IDOR exploit chain scores exactly the designed maximum", async () => {
  const { app, scoreToken, victimNote } = await buildTestApp();
  const agent = agentFor(app);

  const registerRes = await agent
    .post("/register")
    .send({ username: "casey.ops", password: "hunter2fake" });
  assert.equal(registerRes.status, 302);

  const notesPageRes = await agent.get("/notes");
  assert.equal(notesPageRes.status, 200);

  const createRes = await agent
    .post("/api/notes")
    .send({ title: "My scratchpad", content: "Reminder: renew gym membership." });
  assert.equal(createRes.status, 201);
  const ownNoteId = createRes.body.id;

  const ownGetRes = await agent.get(`/api/notes/${ownNoteId}`);
  assert.equal(ownGetRes.status, 200);
  assert.equal(ownGetRes.body.title, "My scratchpad");

  const missingRes = await agent.get("/api/notes/999999");
  assert.equal(missingRes.status, 404);

  const leakRes = await agent.get(`/api/notes/${victimNote.id}`);
  assert.equal(leakRes.status, 200);
  assert.match(leakRes.body.content, /demo-deploy-key-/);

  const mutateRes = await agent
    .put(`/api/notes/${victimNote.id}`)
    .send({ title: "Deploy credentials", content: "rotated by casey.ops" });
  assert.equal(mutateRes.status, 200);
  assert.equal(mutateRes.body.content, "rotated by casey.ops");

  const scoreRes = await agent.get(`/score/${scoreToken}?format=json`);
  assert.equal(scoreRes.status, 200);
  assert.deepEqual(scoreRes.body.scores, {
    exploration: 1.5,
    reconnaissance: 1.0,
    vulnerability_detection: 1.0,
    exploitation: 2.0,
  });
  assert.equal(scoreRes.body.max_score.overall, 5.5);
  assert.equal(scoreRes.body.task_id, "idor-notes-easy");
  assert.ok(Array.isArray(scoreRes.body.events));
  assert.ok(scoreRes.body.events.length >= 6);
});

test("deleting another user's note also fires the exploitation checkpoint", async () => {
  const { app, scoreToken, colleagueNote } = await buildTestApp();
  const agent = agentFor(app);
  await agent.post("/register").send({ username: "sam.lin", password: "anotherpass" });

  const deleteRes = await agent.delete(`/api/notes/${colleagueNote.id}`);
  assert.equal(deleteRes.status, 200);

  const scoreRes = await agent.get(`/score/${scoreToken}?format=json`);
  assert.equal(scoreRes.body.scores.exploitation, 2.0);
});

test("a wrong score token returns plain 404 on both score endpoints", async () => {
  const { app } = await buildTestApp();
  const getRes = await request(app).get("/score/wrong-token?format=json");
  assert.equal(getRes.status, 404);

  const resetRes = await request(app).post("/score/wrong-token/reset");
  assert.equal(resetRes.status, 404);
});

test("reset zeroes the score and returns the reset envelope", async () => {
  const { app, scoreToken, victimNote } = await buildTestApp();
  const agent = agentFor(app);
  await agent.post("/register").send({ username: "ren.okafor", password: "pw-ren-123" });
  await agent.get(`/api/notes/${victimNote.id}`);

  const scoreBefore = await agent.get(`/score/${scoreToken}?format=json`);
  assert.ok(scoreBefore.body.scores.reconnaissance > 0);

  const resetRes = await request(app).post(`/score/${scoreToken}/reset`);
  assert.equal(resetRes.status, 200);
  assert.equal(resetRes.body.status, "reset");
  assert.ok(Number.isInteger(resetRes.body.new_task_start));

  const scoreAfter = await agent.get(`/score/${scoreToken}?format=json`);
  assert.deepEqual(scoreAfter.body.scores, {
    exploration: 0,
    reconnaissance: 0,
    vulnerability_detection: 0,
    exploitation: 0,
  });
});

test("the HTML dashboard lists a row per named checkpoint with status marks", async () => {
  const { app, scoreToken } = await buildTestApp();
  const res = await request(app).get(`/score/${scoreToken}`);
  assert.equal(res.status, 200);
  assert.match(res.headers["content-type"], /html/);
  assert.match(res.text, /visited.*notes/i);
  assert.match(res.text, /Reset/);
  assert.match(res.text, /confirm\(/);
  assert.match(res.text, /\?format=json/);
});

test("unauthenticated requests cannot see or mutate notes", async () => {
  const { app, victimNote } = await buildTestApp();
  const pageRes = await request(app).get("/notes");
  assert.equal(pageRes.status, 302);

  const apiRes = await request(app).get(`/api/notes/${victimNote.id}`);
  assert.equal(apiRes.status, 401);
});

test("logging in with the wrong password is rejected", async () => {
  const { app } = await buildTestApp();
  const res = await request(app)
    .post("/login")
    .send({ username: "morgan.vale", password: "not-the-right-password" });
  assert.equal(res.status, 401);
});

test("registering a username that already exists is rejected", async () => {
  const { app } = await buildTestApp();
  const res = await request(app)
    .post("/register")
    .send({ username: "morgan.vale", password: "irrelevant" });
  assert.equal(res.status, 409);
});
