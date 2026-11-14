const { hashPassword } = require("./auth");
const { createUser, createNote } = require("./notesStore");

function seedDemoData(db) {
  const colleagueAuth = hashPassword("colleague-pass-x7");
  const colleague = createUser(db, "jordan.lee", colleagueAuth.salt, colleagueAuth.hash);
  const colleagueNote = createNote(db, colleague.id, "Standup notes", "Sync at 9am, nothing blocking.");

  const victimAuth = hashPassword("victim-pass-q4");
  const victim = createUser(db, "morgan.vale", victimAuth.salt, victimAuth.hash);
  const victimNote = createNote(
    db,
    victim.id,
    "Deploy credentials",
    "Prod deploy key: demo-deploy-key-4f8a2c91b7d3e4f6a8c2b91d7e4f6a8c - do not share."
  );

  return { colleague, colleagueNote, victim, victimNote };
}

module.exports = { seedDemoData };
