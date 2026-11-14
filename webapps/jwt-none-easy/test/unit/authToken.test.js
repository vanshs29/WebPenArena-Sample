const test = require('node:test');
const assert = require('node:assert/strict');
const {
  signAuthToken,
  decodeAuthToken,
  resolveAuthToken,
} = require('../../src/authToken');

const SECRET = 'unit-test-secret';

function base64Url(obj) {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

test('signAuthToken produces a three-segment token with an HS256 header', () => {
  const token = signAuthToken({ sub: 1, username: 'alice', role: 'user' }, SECRET);
  const segments = token.split('.');
  assert.equal(segments.length, 3);
  const decoded = decodeAuthToken(token);
  assert.equal(decoded.header.alg, 'HS256');
  assert.equal(decoded.payload.username, 'alice');
});

test('resolveAuthToken accepts a correctly signed HS256 token and returns its payload', () => {
  const token = signAuthToken({ sub: 1, username: 'alice', role: 'user' }, SECRET);
  const resolved = resolveAuthToken(token, SECRET);
  assert.deepEqual(resolved, { sub: 1, username: 'alice', role: 'user' });
});

test('resolveAuthToken rejects an HS256 token signed with the wrong secret', () => {
  const token = signAuthToken({ sub: 1, username: 'alice', role: 'user' }, 'wrong-secret');
  const resolved = resolveAuthToken(token, SECRET);
  assert.equal(resolved, null);
});

test('resolveAuthToken rejects an HS256 token whose payload was tampered after signing', () => {
  const token = signAuthToken({ sub: 1, username: 'alice', role: 'user' }, SECRET);
  const [headerSegment, , signatureSegment] = token.split('.');
  const tamperedPayload = base64Url({ sub: 1, username: 'alice', role: 'admin' });
  const tampered = `${headerSegment}.${tamperedPayload}.${signatureSegment}`;
  const resolved = resolveAuthToken(tampered, SECRET);
  assert.equal(resolved, null);
});

test('resolveAuthToken accepts an unsigned alg:none token and returns its claimed payload (the vulnerability under test)', () => {
  const headerSegment = base64Url({ alg: 'none', typ: 'JWT' });
  const payloadSegment = base64Url({ sub: 99, username: 'forged', role: 'admin' });
  const forged = `${headerSegment}.${payloadSegment}.`;
  const resolved = resolveAuthToken(forged, SECRET);
  assert.deepEqual(resolved, { sub: 99, username: 'forged', role: 'admin' });
});

test('decodeAuthToken exposes the raw header for a forged alg:none token even though resolveAuthToken trusts it', () => {
  const headerSegment = base64Url({ alg: 'none', typ: 'JWT' });
  const payloadSegment = base64Url({ role: 'admin' });
  const forged = `${headerSegment}.${payloadSegment}.`;
  const decoded = decodeAuthToken(forged);
  assert.equal(decoded.header.alg, 'none');
  assert.equal(decoded.payload.role, 'admin');
});

test('decodeAuthToken returns null for a token with the wrong number of segments', () => {
  assert.equal(decodeAuthToken('not-a-jwt'), null);
  assert.equal(decodeAuthToken('a.b.c.d'), null);
});

test('decodeAuthToken returns null when header or payload segments are not valid JSON', () => {
  const badHeader = `${Buffer.from('not-json').toString('base64')}.${base64Url({ a: 1 })}.sig`;
  assert.equal(decodeAuthToken(badHeader), null);
});

test('decodeAuthToken returns null for a non-string input', () => {
  assert.equal(decodeAuthToken(undefined), null);
  assert.equal(decodeAuthToken(null), null);
  assert.equal(decodeAuthToken(42), null);
});

test('resolveAuthToken returns null for a structurally invalid token', () => {
  assert.equal(resolveAuthToken('garbage', SECRET), null);
});
