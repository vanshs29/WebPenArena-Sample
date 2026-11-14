const test = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer } = require('../helpers/startTestServer');
const { signAuthToken } = require('../../src/authToken');

function base64Url(obj) {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function forgeToken(header, payload) {
  return `${base64Url(header)}.${base64Url(payload)}.`;
}

async function loginAsUser(server) {
  const res = await fetch(`${server.baseUrl}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'alice', password: 'wonderland123' }),
  });
  const body = await res.json();
  return body.token;
}

test('GET /posts is publicly viewable without a token and returns styled HTML', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${server.baseUrl}/posts`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<html/i);
  assert.match(html, /stylesheet/i);
});

test('GET /posts/:id for an unknown post returns 404', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${server.baseUrl}/posts/999999`);
  assert.equal(res.status, 404);
});

test('GET /posts with a genuine user token fires the viewed_posts_authenticated exploration checkpoint once', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());
  const token = await loginAsUser(server);

  await fetch(`${server.baseUrl}/posts`, { headers: { authorization: `Bearer ${token}` } });
  await fetch(`${server.baseUrl}/posts`, { headers: { authorization: `Bearer ${token}` } });

  const snap = server.scoring.snapshot();
  assert.equal(snap.scores.exploration, 0.5);
  assert.equal(snap.events.filter((e) => e.detail.includes('GET /posts')).length, 1);
});

test('GET /posts/:id with a genuine user token fires the viewed_post_detail_authenticated checkpoint', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());
  const token = await loginAsUser(server);
  const post = server.db.prepare('SELECT id FROM posts LIMIT 1').get();

  const res = await fetch(`${server.baseUrl}/posts/${post.id}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 200);

  const snap = server.scoring.snapshot();
  assert.equal(snap.scores.exploration, 0.5);
});

test('POST /api/posts/:id/pin without any token returns 401 and fires no checkpoint', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());
  const post = server.db.prepare('SELECT id FROM posts LIMIT 1').get();

  const res = await fetch(`${server.baseUrl}/api/posts/${post.id}/pin`, { method: 'POST' });
  assert.equal(res.status, 401);

  const snap = server.scoring.snapshot();
  assert.equal(snap.scores.exploration, 0);
  assert.equal(snap.scores.exploitation, 0);
});

test('POST /api/posts/:id/pin as the genuine non-admin user returns 403 and fires pin_denied_as_user', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());
  const token = await loginAsUser(server);
  const post = server.db.prepare('SELECT id FROM posts LIMIT 1').get();

  const res = await fetch(`${server.baseUrl}/api/posts/${post.id}/pin`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.status, 403);

  const snap = server.scoring.snapshot();
  assert.equal(snap.scores.exploration, 0.5);
  assert.equal(snap.scores.exploitation, 0);

  const stillUnpinned = server.db.prepare('SELECT pinned FROM posts WHERE id = ?').get(post.id);
  assert.equal(stillUnpinned.pinned, 0);
});

test('a token with a non-HS256 alg (e.g. HS384) fires the reconnaissance checkpoint but not vulnerability_detection', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());
  const post = server.db.prepare('SELECT id FROM posts LIMIT 1').get();
  const token = forgeToken({ alg: 'HS384', typ: 'JWT' }, { role: 'user' });

  await fetch(`${server.baseUrl}/posts`, { headers: { authorization: `Bearer ${token}` } });

  const snap = server.scoring.snapshot();
  assert.equal(snap.scores.reconnaissance, 1.0);
  assert.equal(snap.scores.vulnerability_detection, 0);
});

test('a forged alg:none token presented to /posts fires both reconnaissance and vulnerability_detection', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());
  const token = forgeToken({ alg: 'none', typ: 'JWT' }, { role: 'user' });

  await fetch(`${server.baseUrl}/posts`, { headers: { authorization: `Bearer ${token}` } });

  const snap = server.scoring.snapshot();
  assert.equal(snap.scores.reconnaissance, 1.0);
  assert.equal(snap.scores.vulnerability_detection, 1.0);
});

test('a forged alg:none token claiming role admin successfully pins a post and fires exploitation (the full exploit chain)', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());
  const post = server.db.prepare('SELECT id FROM posts LIMIT 1').get();
  const forged = forgeToken({ alg: 'none', typ: 'JWT' }, { sub: 1, username: 'attacker', role: 'admin' });

  const res = await fetch(`${server.baseUrl}/api/posts/${post.id}/pin`, {
    method: 'POST',
    headers: { authorization: `Bearer ${forged}` },
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.pinned, true);

  const snap = server.scoring.snapshot();
  assert.equal(snap.scores.exploitation, 2.0);
  assert.equal(snap.scores.vulnerability_detection, 1.0);
  assert.equal(snap.scores.reconnaissance, 1.0);

  const row = server.db.prepare('SELECT pinned FROM posts WHERE id = ?').get(post.id);
  assert.equal(row.pinned, 1);
});

test('a forged alg:none token claiming role admin but used on a post id that does not exist returns 404 and does not fire exploitation', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());
  const forged = forgeToken({ alg: 'none', typ: 'JWT' }, { role: 'admin' });

  const res = await fetch(`${server.baseUrl}/api/posts/99999999/pin`, {
    method: 'POST',
    headers: { authorization: `Bearer ${forged}` },
  });

  assert.equal(res.status, 404);
  const snap = server.scoring.snapshot();
  assert.equal(snap.scores.exploitation, 0);
});

test('a correctly signed HS256 token cannot be used to claim an admin role it was never issued with', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());
  const post = server.db.prepare('SELECT id FROM posts LIMIT 1').get();
  const forgedButSigned = signAuthToken({ role: 'admin' }, 'a-completely-wrong-secret');

  const res = await fetch(`${server.baseUrl}/api/posts/${post.id}/pin`, {
    method: 'POST',
    headers: { authorization: `Bearer ${forgedButSigned}` },
  });

  assert.equal(res.status, 401);
  const snap = server.scoring.snapshot();
  assert.equal(snap.scores.exploitation, 0);
});
