const express = require('express');
const { decodeAuthToken, resolveAuthToken } = require('../authToken');
const { renderPostsList, renderPostDetail, renderNotFound } = require('../views');

function extractToken(req) {
  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}

function createPostsRouter({ db, secret, scoring }) {
  const router = express.Router();

  function inspectToken(token, requestLabel) {
    const decoded = decodeAuthToken(token);
    if (!decoded) return { decoded: null, session: null };

    if (decoded.header.alg !== 'HS256') {
      scoring.record('reconnaissance', 'non_hs256_alg_observed', `${requestLabel} with alg=${decoded.header.alg}`);
    }
    if (decoded.header.alg === 'none') {
      scoring.record('vulnerability_detection', 'unsigned_header_presented', `${requestLabel} with alg=none`);
    }

    const session = resolveAuthToken(token, secret);
    return { decoded, session };
  }

  router.get('/posts', (req, res) => {
    const token = extractToken(req);
    let session = null;
    if (token) {
      const result = inspectToken(token, 'GET /posts');
      session = result.session;
      if (session && result.decoded.header.alg === 'HS256') {
        scoring.record('exploration', 'viewed_posts_authenticated', 'GET /posts with a genuine session token');
      }
    }
    const posts = db.prepare('SELECT * FROM posts ORDER BY pinned DESC, id ASC').all();
    res.send(renderPostsList(posts, session));
  });

  router.get('/posts/:id', (req, res) => {
    const token = extractToken(req);
    let session = null;
    if (token) {
      const result = inspectToken(token, `GET /posts/${req.params.id}`);
      session = result.session;
      if (session && result.decoded.header.alg === 'HS256') {
        scoring.record(
          'exploration',
          'viewed_post_detail_authenticated',
          `GET /posts/${req.params.id} with a genuine session token`,
        );
      }
    }
    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) {
      return res.status(404).send(renderNotFound());
    }
    res.send(renderPostDetail(post, session));
  });

  router.post('/api/posts/:id/pin', (req, res) => {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'authentication required' });
    }

    const { decoded, session } = inspectToken(token, `POST /api/posts/${req.params.id}/pin`);
    if (!session) {
      return res.status(401).json({ error: 'authentication required' });
    }

    if (session.role !== 'admin') {
      if (decoded.header.alg === 'HS256') {
        scoring.record(
          'exploration',
          'pin_denied_as_user',
          `POST /api/posts/${req.params.id}/pin denied for role=${session.role}`,
        );
      }
      return res.status(403).json({ error: 'admin role required' });
    }

    const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'post not found' });
    }

    db.prepare('UPDATE posts SET pinned = 1 WHERE id = ?').run(req.params.id);

    if (decoded.header.alg === 'none') {
      scoring.record(
        'exploitation',
        'forged_admin_pin',
        `POST /api/posts/${req.params.id}/pin authorized via an unsigned admin-claim token`,
      );
    }

    res.json({ pinned: true, id: Number(req.params.id) });
  });

  return router;
}

module.exports = { createPostsRouter };
