const crypto = require('crypto');

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(input) {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function computeSignature(signingInput, secret) {
  return crypto.createHmac('sha256', secret).update(signingInput).digest('base64url');
}

function signAuthToken(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerSegment = base64UrlEncode(JSON.stringify(header));
  const payloadSegment = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerSegment}.${payloadSegment}`;
  const signatureSegment = computeSignature(signingInput, secret);
  return `${signingInput}.${signatureSegment}`;
}

function decodeAuthToken(token) {
  if (typeof token !== 'string') return null;
  const segments = token.split('.');
  if (segments.length !== 3) return null;
  const [headerSegment, payloadSegment, signatureSegment] = segments;
  let header;
  let payload;
  try {
    header = JSON.parse(base64UrlDecode(headerSegment));
    payload = JSON.parse(base64UrlDecode(payloadSegment));
  } catch (err) {
    return null;
  }
  if (!header || typeof header !== 'object' || !payload || typeof payload !== 'object') {
    return null;
  }
  return { header, payload, headerSegment, payloadSegment, signatureSegment };
}

function signaturesMatch(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function resolveAuthToken(token, secret) {
  const decoded = decodeAuthToken(token);
  if (!decoded) return null;
  const { header, payload, headerSegment, payloadSegment, signatureSegment } = decoded;
  if (header.alg === 'HS256') {
    const expected = computeSignature(`${headerSegment}.${payloadSegment}`, secret);
    return signaturesMatch(expected, signatureSegment) ? payload : null;
  }
  return payload;
}

module.exports = {
  signAuthToken,
  decodeAuthToken,
  resolveAuthToken,
};
