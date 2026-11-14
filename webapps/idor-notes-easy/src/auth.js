const crypto = require("crypto");

const KEY_LENGTH = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, record) {
  const candidate = crypto.scryptSync(password, record.salt, KEY_LENGTH);
  const stored = Buffer.from(record.hash, "hex");
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}

module.exports = { hashPassword, verifyPassword };
