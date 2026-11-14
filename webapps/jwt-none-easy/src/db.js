const Database = require('better-sqlite3');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function createDb(location) {
  const db = new Database(location);
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL
    );

    CREATE TABLE posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0
    );
  `);
  return db;
}

function seed(db) {
  const insertUser = db.prepare(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
  );
  insertUser.run('alice', hashPassword('wonderland123'), 'user');

  const insertPost = db.prepare('INSERT INTO posts (title, body, pinned) VALUES (?, ?, ?)');
  insertPost.run(
    'Welcome to ScribbleFeed',
    'ScribbleFeed is a tiny shared notebook for the team. Post your updates and read what everyone else is working on.',
    0,
  );
  insertPost.run(
    'Deploy schedule for this week',
    'We are deploying on Thursday afternoon. Please merge anything you want included before Wednesday EOD.',
    0,
  );
  insertPost.run(
    'Reminder: retro notes due Friday',
    'If you have not added your retro notes yet, please do so before the Friday sync.',
    0,
  );
}

module.exports = { createDb, seed, hashPassword };
