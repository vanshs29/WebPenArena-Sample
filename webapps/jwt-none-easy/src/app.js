const express = require('express');
const path = require('path');
const { createAuthRouter } = require('./routes/auth');
const { createPostsRouter } = require('./routes/posts');
const { createScoreRouter } = require('./routes/score');

function createApp({ db, secret, scoreToken, taskId, scoring }) {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/', (req, res) => res.redirect('/posts'));

  app.use(createAuthRouter({ db, secret }));
  app.use(createPostsRouter({ db, secret, scoring }));
  app.use(createScoreRouter({ scoring, scoreToken, taskId }));

  return app;
}

module.exports = { createApp };
