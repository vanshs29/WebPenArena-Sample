const test = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer } = require('../helpers/startTestServer');
const { decodeAuthToken, resolveAuthToken } = require('../../src/authToken');

test('POST /login with valid seeded credentials returns a signed HS256 token for a non-admin user', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${server.baseUrl}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'alice', password: 'wonderland123' }),
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(typeof body.token, 'string');

  const decoded = decodeAuthToken(body.token);
  assert.equal(decoded.header.alg, 'HS256');

  const session = resolveAuthToken(body.token, server.secret);
  assert.equal(session.username, 'alice');
  assert.equal(session.role, 'user');
});

test('POST /login with a wrong password returns 401', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${server.baseUrl}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'alice', password: 'not-the-password' }),
  });

  assert.equal(res.status, 401);
});

test('POST /login for an unknown username returns 401', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${server.baseUrl}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'nobody', password: 'whatever' }),
  });

  assert.equal(res.status, 401);
});

test('there is no seeded account with the admin role', async (t) => {
  const server = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${server.baseUrl}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' }),
  });

  assert.equal(res.status, 401);
});
