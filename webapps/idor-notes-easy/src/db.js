// Pure-JS SQLite driver (sql.js, WASM-backed) is used instead of better-sqlite3:
// better-sqlite3's prebuilt native binding did not load in this sandbox
// (ABI mismatch against the installed Node version), so this falls back to the
// pure-JS driver as permitted by the build spec.
const initSqlJs = require("sql.js");

const SCHEMA = `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    salt TEXT NOT NULL,
    password_hash TEXT NOT NULL
  );
  CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL
  );
`;

function wrap(sqlJsDb) {
  return {
    run(sql, params = []) {
      const stmt = sqlJsDb.prepare(sql);
      stmt.bind(params);
      stmt.step();
      stmt.free();
      const [[lastId]] = sqlJsDb.exec("SELECT last_insert_rowid()")[0]
        ? sqlJsDb.exec("SELECT last_insert_rowid()").map((r) => r.values[0])
        : [[null]];
      return { lastInsertRowid: lastId, changes: sqlJsDb.getRowsModified() };
    },
    get(sql, params = []) {
      const stmt = sqlJsDb.prepare(sql);
      stmt.bind(params);
      const hasRow = stmt.step();
      const row = hasRow ? stmt.getAsObject() : undefined;
      stmt.free();
      return row;
    },
    all(sql, params = []) {
      const stmt = sqlJsDb.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    },
    reinit() {
      sqlJsDb.run("DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS notes;");
      sqlJsDb.run(SCHEMA);
    },
  };
}

async function createDb() {
  const SQL = await initSqlJs();
  const sqlJsDb = new SQL.Database();
  sqlJsDb.run(SCHEMA);
  return wrap(sqlJsDb);
}

module.exports = { createDb };
