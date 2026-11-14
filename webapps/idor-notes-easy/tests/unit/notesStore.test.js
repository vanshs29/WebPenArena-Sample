const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDb } = require("../../src/db");
const {
  createUser,
  findUserByUsername,
  createNote,
  getNoteById,
  updateNote,
  deleteNote,
  getNotesByOwner,
} = require("../../src/notesStore");

async function freshDb() {
  return createDb(":memory:");
}

test("createUser and findUserByUsername round-trip a user", async () => {
  const db = await freshDb();
  const user = createUser(db, "casey", "salt123", "hash456");
  assert.ok(user.id);
  const found = findUserByUsername(db, "casey");
  assert.equal(found.id, user.id);
  assert.equal(found.password_hash, "hash456");
});

test("findUserByUsername returns undefined for an unknown username", async () => {
  const db = await freshDb();
  assert.equal(findUserByUsername(db, "nobody"), undefined);
});

test("createNote assigns sequential numeric ids", async () => {
  const db = await freshDb();
  const user = createUser(db, "casey", "s", "h");
  const note1 = createNote(db, user.id, "First", "content one");
  const note2 = createNote(db, user.id, "Second", "content two");
  assert.equal(typeof note1.id, "number");
  assert.equal(note2.id, note1.id + 1);
});

test("getNoteById returns a note regardless of which user owns it (existence check only)", async () => {
  const db = await freshDb();
  const owner = createUser(db, "owner", "s", "h");
  const note = createNote(db, owner.id, "Secret", "sensitive content");
  const fetched = getNoteById(db, note.id);
  assert.equal(fetched.title, "Secret");
  assert.equal(fetched.owner_id, owner.id);
});

test("getNoteById returns undefined for a nonexistent id", async () => {
  const db = await freshDb();
  assert.equal(getNoteById(db, 9999), undefined);
});

test("updateNote changes title and content by id alone", async () => {
  const db = await freshDb();
  const owner = createUser(db, "owner", "s", "h");
  const note = createNote(db, owner.id, "Before", "before content");
  const updated = updateNote(db, note.id, "After", "after content");
  assert.equal(updated.title, "After");
  assert.equal(getNoteById(db, note.id).content, "after content");
});

test("deleteNote removes a note by id alone", async () => {
  const db = await freshDb();
  const owner = createUser(db, "owner", "s", "h");
  const note = createNote(db, owner.id, "Gone soon", "bye");
  const result = deleteNote(db, note.id);
  assert.equal(result, true);
  assert.equal(getNoteById(db, note.id), undefined);
});

test("getNotesByOwner only returns that owner's notes", async () => {
  const db = await freshDb();
  const alice = createUser(db, "alice", "s", "h");
  const bob = createUser(db, "bob", "s", "h");
  createNote(db, alice.id, "Alice note", "a");
  createNote(db, bob.id, "Bob note", "b");
  const aliceNotes = getNotesByOwner(db, alice.id);
  assert.equal(aliceNotes.length, 1);
  assert.equal(aliceNotes[0].title, "Alice note");
});
