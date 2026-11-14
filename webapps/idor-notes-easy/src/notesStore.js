function createUser(db, username, salt, passwordHash) {
  const result = db.run(
    "INSERT INTO users (username, salt, password_hash) VALUES (?, ?, ?)",
    [username, salt, passwordHash]
  );
  return { id: result.lastInsertRowid, username };
}

function findUserByUsername(db, username) {
  return db.get("SELECT * FROM users WHERE username = ?", [username]);
}

function getUserById(db, id) {
  return db.get("SELECT * FROM users WHERE id = ?", [id]);
}

function createNote(db, ownerId, title, content) {
  const result = db.run(
    "INSERT INTO notes (owner_id, title, content) VALUES (?, ?, ?)",
    [ownerId, title, content]
  );
  return getNoteById(db, result.lastInsertRowid);
}

function getNoteById(db, id) {
  return db.get("SELECT * FROM notes WHERE id = ?", [id]);
}

function updateNote(db, id, title, content) {
  db.run("UPDATE notes SET title = ?, content = ? WHERE id = ?", [title, content, id]);
  return getNoteById(db, id);
}

function deleteNote(db, id) {
  const result = db.run("DELETE FROM notes WHERE id = ?", [id]);
  return result.changes > 0;
}

function getNotesByOwner(db, ownerId) {
  return db.all("SELECT * FROM notes WHERE owner_id = ? ORDER BY id", [ownerId]);
}

module.exports = {
  createUser,
  findUserByUsername,
  getUserById,
  createNote,
  getNoteById,
  updateNote,
  deleteNote,
  getNotesByOwner,
};
