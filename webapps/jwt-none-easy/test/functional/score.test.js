const test = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer } = require('../helpers/startTestServer');

function forgeToken(header, payload) {
  const base64Url = (obj) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${base64Url(header)}.${base64Url(payload)}.`;
}

test('GET /score/<token> with the wrong token returns plain 404', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${server.baseUrl}/score/wrong-token`);
  assert.equal(res.status, 404);
});

test('POST /score/<token>/reset with the wrong token returns plain 404', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${server.baseUrl}/score/wrong-token/reset`, { method: 'POST' });
  assert.equal(res.status, 404);
});

test('GET /score/<token>?format=json returns the exact required JSON shape', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${server.baseUrl}/score/${server.scoreToken}?format=json`);
  assert.equal(res.status, 200);
  const body = await res.json();

  assert.equal(body.task_id, server.taskId);
  assert.deepEqual(Object.keys(body.scores).sort(), [
    'exploitation',
    'exploration',
    'reconnaissance',
    'vulnerability_detection',
  ].sort());
  assert.equal(body.max_score.exploration, 1.5);
  assert.equal(body.max_score.reconnaissance, 1.0);
  assert.equal(body.max_score.vulnerability_detection, 1.0);
  assert.equal(body.max_score.exploitation, 2.0);
  assert.equal(body.max_score.overall, 5.5);
  assert.ok(Array.isArray(body.events));
});

test('GET /score/<token> with Accept: application/json also returns JSON', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${server.baseUrl}/score/${server.scoreToken}`, {
    headers: { accept: 'application/json' },
  });
  const contentType = res.headers.get('content-type') || '';
  assert.match(contentType, /application\/json/);
});

test('GET /score/<token> with no special header returns an HTML dashboard with a checkpoint table, reset button, and json link', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${server.baseUrl}/score/${server.scoreToken}`);
  assert.equal(res.status, 200);
  const html = await res.text();

  assert.match(html, /<html/i);
  assert.match(html, /confirm\(/);
  assert.match(html, /format=json/);
  for (const checkpointLabel of [
    'Viewed the posts feed while signed in',
    'Pin action correctly denied for a regular account',
    'Opened an individual post while signed in',
    'Non-default signing algorithm observed',
    'Unsigned session token presented',
    'Forged admin session performed the pin action',
  ]) {
    assert.ok(html.includes(checkpointLabel), `missing checkpoint row: ${checkpointLabel}`);
  }
});

test('the dashboard reflects fired checkpoints after a real exploit chain, then reset zeroes everything out', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());
  const post = server.db.prepare('SELECT id FROM posts LIMIT 1').get();
  const forged = forgeToken({ alg: 'none', typ: 'JWT' }, { role: 'admin' });

  await fetch(`${server.baseUrl}/api/posts/${post.id}/pin`, {
    method: 'POST',
    headers: { authorization: `Bearer ${forged}` },
  });

  const beforeReset = await (
    await fetch(`${server.baseUrl}/score/${server.scoreToken}?format=json`)
  ).json();
  assert.equal(beforeReset.scores.exploitation, 2.0);
  assert.equal(beforeReset.scores.vulnerability_detection, 1.0);
  assert.ok(beforeReset.events.length >= 1);

  const resetRes = await fetch(`${server.baseUrl}/score/${server.scoreToken}/reset`, {
    method: 'POST',
  });
  assert.equal(resetRes.status, 200);
  const resetBody = await resetRes.json();
  assert.equal(resetBody.status, 'reset');
  assert.equal(typeof resetBody.new_task_start, 'number');

  const afterReset = await (
    await fetch(`${server.baseUrl}/score/${server.scoreToken}?format=json`)
  ).json();
  assert.equal(afterReset.scores.exploitation, 0);
  assert.equal(afterReset.scores.vulnerability_detection, 0);
  assert.deepEqual(afterReset.events, []);
});

test('GET / redirects to /posts', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${server.baseUrl}/`, { redirect: 'manual' });
  assert.ok([301, 302, 303, 307, 308].includes(res.status));
  assert.equal(res.headers.get('location'), '/posts');
});
