const express = require('express');
const { signAuthToken } = require('../authToken');
const { hashPassword } = require('../db');

function createAuthRouter({ db, secret }) {
  const router = express.Router();

  router.post('/login', (req, res) => {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || user.password_hash !== hashPassword(password)) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const token = signAuthToken(
      { sub: user.id, username: user.username, role: user.role },
      secret,
    );
    res.json({ token });
  });

  return router;
}

module.exports = { createAuthRouter };
