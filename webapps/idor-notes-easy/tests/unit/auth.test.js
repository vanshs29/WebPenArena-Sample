const { test } = require("node:test");
const assert = require("node:assert/strict");
const { hashPassword, verifyPassword } = require("../../src/auth");

test("hashPassword produces a salt and hash distinct from the raw password", () => {
  const record = hashPassword("correct-horse-battery-staple");
  assert.ok(record.salt);
  assert.ok(record.hash);
  assert.notEqual(record.hash, "correct-horse-battery-staple");
});

test("verifyPassword accepts the correct password", () => {
  const record = hashPassword("correct-horse-battery-staple");
  assert.equal(verifyPassword("correct-horse-battery-staple", record), true);
});

test("verifyPassword rejects an incorrect password", () => {
  const record = hashPassword("correct-horse-battery-staple");
  assert.equal(verifyPassword("wrong-password", record), false);
});

test("hashPassword salts independently so two equal passwords hash differently", () => {
  const a = hashPassword("same-password");
  const b = hashPassword("same-password");
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.hash, b.hash);
});
